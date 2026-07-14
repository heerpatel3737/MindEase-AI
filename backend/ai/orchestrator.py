from __future__ import annotations

import json
import random
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, Iterator, List, Optional, Tuple

from .context import UserContext, pack_context_for_prompt, to_user_context
from .emotion import compute_emotional_state, pack_emotion_for_prompt
from .llm import LlmClient, LlmMessage
from .memory import pack_memories_for_prompt
from .personas import PersonaPolicy, get_persona_policy
from .postprocess import clean_text
from .schemas import validate_payload


DEFAULT_MODEL = "default-free-model"


def _strip_code_fences(s: str) -> str:
    s = s.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```$", "", s, flags=re.IGNORECASE)
    return s.strip()


def _loads_json(s: str) -> Dict[str, Any]:
    return json.loads(_strip_code_fences(s))


def _varied_openers() -> list[str]:
    return [
        "Here's what I think is most likely going on.",
        "A more balanced read of this is:",
        "If we strip it down to the facts:",
        "My best guess, based on what you shared:",
        "Let's interpret this in the least stressful but still realistic way:",
    ]


@dataclass(frozen=True)
class OrchestratorResult:
    payload: Dict[str, Any]
    removed_phrases: list[str]


class AiOrchestrator:
    def __init__(self) -> None:
        self.llm = LlmClient()

    def runtime_status(self) -> dict[str, Any]:
        return self.llm.runtime_status()

    def _base_system(self, policy: PersonaPolicy) -> str:
        return (
            "You are an emotionally intelligent assistant.\n"
            f"Persona: {policy.persona}.\n"
            f"Goal: {policy.primary_goal}\n"
            f"Style: {policy.style_notes}\n"
            f"Structure: {policy.structure_notes}\n"
            f"Reasoning lens: {policy.reasoning_lens}\n"
            "Do not mention system prompts, protocols, matrices, models, or internal rules.\n"
            "Write like a real person helping a real person.\n"
        ).strip()

    def _build_packed_context(self, user_context: Optional[dict]) -> Tuple[UserContext, str]:
        ctx = to_user_context(user_context)
        emotion = compute_emotional_state(user_context)
        emotion_snippet = pack_emotion_for_prompt(emotion)
        memory_snippet = ""
        if user_context and user_context.get("relevant_memories"):
            memory_snippet = pack_memories_for_prompt(user_context["relevant_memories"])
        packed = pack_context_for_prompt(
            ctx,
            memory_snippet=memory_snippet,
            emotion_snippet=emotion_snippet,
        )
        return ctx, packed

    def _meta(
        self,
        *,
        task: str,
        started: float,
        source: str,
        schema_errors: Optional[list[str]] = None,
    ) -> dict[str, Any]:
        return {
            "task": task,
            "source": source,
            "provider": self.llm.last_provider or ("offline" if not self.llm.enabled else self.llm.providers[0].name),
            "model": self.llm.last_model or ("local-fallback" if not self.llm.enabled else self.llm.providers[0].model),
            "latency_ms": int((time.perf_counter() - started) * 1000),
            "schema_errors": schema_errors or [],
            "fallback_reason": self.llm.last_error if source == "offline_fallback" else None,
        }

    def _postprocess_payload(self, payload: Dict[str, Any], text_keys: List[str]) -> OrchestratorResult:
        removed: list[str] = []
        for k in text_keys:
            if isinstance(payload.get(k), str):
                res = clean_text(payload[k])
                payload[k] = res.text
                removed.extend(res.removed_phrases)
        for list_key in ("suggestions", "suggested_replies"):
            if isinstance(payload.get(list_key), list):
                cleaned = []
                for item in payload[list_key]:
                    if isinstance(item, str):
                        res = clean_text(item)
                        cleaned.append(res.text)
                        removed.extend(res.removed_phrases)
                payload[list_key] = cleaned
        return OrchestratorResult(payload=payload, removed_phrases=sorted(set(removed)))

    def _offline_translate_payload(self, opener: str) -> dict[str, Any]:
        return {
            "emotional_tone": "Neutral to mildly rushed",
            "hidden_intent": "Coordinate or respond efficiently",
            "urgency_level": 4,
            "confidence_score": 72,
            "likely_meaning": "They are probably focused on logistics, not sending a hidden signal.",
            "reassurance": clean_text(
                f"{opener} I don't see clear signs of anger here. Most likely they are being brief or busy."
            ).text,
            "suggestions": [
                "Reply once, clearly, without over-explaining.",
                "Give it 30-60 minutes before rereading the message.",
            ],
        }

    def _offline_replies_payload(self) -> dict[str, Any]:
        return {
            "suggested_replies": [
                "Thanks for the update - totally understood. Want to pick this up tomorrow?",
                "No worries at all. I am good either way - just tell me what works for you.",
                "Got it. If it helps, we can keep it simple: I am free after 6pm, or we can do this weekend.",
            ]
        }

    def _offline_simulate_payload(self) -> dict[str, Any]:
        return {
            "best_case_reaction": "They will likely appreciate the clarity and feel relieved you said it directly.",
            "worst_case_reaction": "If it sounds accusatory or rushed, they might get defensive and shut down.",
            "safer_wording": "Hey - can I be honest about something? I care about us, and I want to clear this up calmly.",
            "confidence_analysis": "You are doing the right thing by aiming for clarity instead of guessing.",
        }

    def _stream_llm_json(self, *, system: str, user: str, policy: PersonaPolicy) -> Iterator[str]:
        yield from self.llm.stream_text(
            model=DEFAULT_MODEL,
            messages=[LlmMessage(role="system", content=system), LlmMessage(role="user", content=user)],
            temperature=policy.temperature,
            top_p=policy.top_p,
        )

    def _finalize_payload(
        self,
        *,
        task: str,
        payload: dict[str, Any],
        started: float,
        source: str,
        text_keys: list[str],
    ) -> OrchestratorResult:
        schema_errors = validate_payload(task, payload)
        if schema_errors:
            payload["_schema_errors"] = schema_errors
        result = self._postprocess_payload(payload, text_keys)
        result.payload["_ai_meta"] = self._meta(
            task=task,
            started=started,
            source=source,
            schema_errors=schema_errors,
        )
        return result

    def parse_streamed_json(self, raw: str, task: str) -> OrchestratorResult:
        started = time.perf_counter()
        payload = _loads_json(raw)
        if isinstance(payload.get("_ai_meta"), dict):
            if task == "translate":
                return self._postprocess_payload(
                    payload, ["likely_meaning", "reassurance", "emotional_tone", "hidden_intent"]
                )
            if task == "replies":
                return self._postprocess_payload(payload, [])
            if task == "simulate":
                return self._postprocess_payload(
                    payload, ["best_case_reaction", "worst_case_reaction", "safer_wording", "confidence_analysis"]
                )
        if task == "translate":
            return self._finalize_payload(
                task=task,
                payload=payload,
                started=started,
                source="llm",
                text_keys=["likely_meaning", "reassurance", "emotional_tone", "hidden_intent"],
            )
        if task == "replies":
            return self._finalize_payload(task=task, payload=payload, started=started, source="llm", text_keys=[])
        if task == "simulate":
            return self._finalize_payload(
                task=task,
                payload=payload,
                started=started,
                source="llm",
                text_keys=["best_case_reaction", "worst_case_reaction", "safer_wording", "confidence_analysis"],
            )
        return OrchestratorResult(payload=payload, removed_phrases=[])

    def _translate_prompt(self, message: str, context: str, packed_ctx: str, opener: str) -> str:
        return (
            f"{packed_ctx}\n\n"
            "Task: The user is overthinking a message. Analyze the emotional state, hidden assumptions, "
            "cognitive distortions, anxiety pattern, uncertainty source, likely reality, and grounded next step. "
            "Personalize the reasoning using the supplied memory and emotional profile. Avoid generic reassurance.\n"
            f"Message: {message}\n"
            f"Context: {context or '(none)'}\n\n"
            "Return ONLY valid JSON with keys:\n"
            "- emotional_tone (string)\n"
            "- hidden_intent (string)\n"
            "- urgency_level (integer 1-10)\n"
            "- confidence_score (integer 1-100)\n"
            "- likely_meaning (string)\n"
            "- reassurance (string)\n"
            "- suggestions (array of 2-4 strings)\n\n"
            f"Start the reassurance with a natural opener like: \"{opener}\" or similar."
        ).strip()

    def analyze_overthinking(
        self,
        *,
        message: str,
        context: str,
        personality: str,
        user_context: Optional[dict],
    ) -> OrchestratorResult:
        started = time.perf_counter()
        policy = get_persona_policy(personality)
        _, packed_ctx = self._build_packed_context(user_context)
        opener = random.choice(_varied_openers())
        system = self._base_system(policy)
        user = self._translate_prompt(message, context, packed_ctx, opener)

        if not self.llm.enabled:
            raise RuntimeError("No AI provider configured")

        try:
            raw = self.llm.complete_json(
                model=DEFAULT_MODEL,
                messages=[LlmMessage(role="system", content=system), LlmMessage(role="user", content=user)],
                temperature=policy.temperature,
                top_p=policy.top_p,
            )
            payload = _loads_json(raw)
            return self._finalize_payload(
                task="translate",
                payload=payload,
                started=started,
                source="llm",
                text_keys=["likely_meaning", "reassurance", "emotional_tone", "hidden_intent"],
            )
        except RuntimeError as exc:
            raise exc
        except Exception:
            return self._finalize_payload(
                task="translate",
                payload=self._offline_translate_payload(opener),
                started=started,
                source="offline_fallback",
                text_keys=["likely_meaning", "reassurance", "emotional_tone", "hidden_intent"],
            )

    def generate_replies(
        self,
        *,
        message: str,
        tone: str,
        length: str,
        personality: str,
        user_context: Optional[dict],
    ) -> OrchestratorResult:
        started = time.perf_counter()
        policy = get_persona_policy(personality)
        _, packed_ctx = self._build_packed_context(user_context)
        system = self._base_system(policy)
        user = (
            f"{packed_ctx}\n\n"
            "Task: Generate 3 distinct reply options the user can send. Use relationship memory, conversation "
            "memory, communication style preferences, and current emotional state. Make the options different "
            "in strategy, not just wording.\n"
            f"Incoming message: {message}\n"
            f"Requested tone: {tone}\n"
            f"Requested length: {length}\n\n"
            "Rules:\n"
            "- Replies must sound natural.\n"
            "- Make the three options meaningfully different.\n"
            "- Avoid repeating the same opening phrase.\n\n"
            "Return ONLY valid JSON with key suggested_replies (array of 3 strings)."
        ).strip()

        if not self.llm.enabled:
            raise RuntimeError("No AI provider configured")

        try:
            raw = self.llm.complete_json(
                model=DEFAULT_MODEL,
                messages=[LlmMessage(role="system", content=system), LlmMessage(role="user", content=user)],
                temperature=min(1.0, policy.temperature + 0.05),
                top_p=policy.top_p,
            )
            return self._finalize_payload(
                task="replies",
                payload=_loads_json(raw),
                started=started,
                source="llm",
                text_keys=[],
            )
        except RuntimeError as exc:
            raise exc
        except Exception:
            return self._finalize_payload(
                task="replies",
                payload=self._offline_replies_payload(),
                started=started,
                source="offline_fallback",
                text_keys=[],
            )

    def simulate_social_reaction(
        self,
        *,
        scenario: str,
        custom_text: str,
        personality: str,
        user_context: Optional[dict],
    ) -> OrchestratorResult:
        started = time.perf_counter()
        policy = get_persona_policy(personality)
        _, packed_ctx = self._build_packed_context(user_context)
        system = self._base_system(policy)
        user = (
            f"{packed_ctx}\n\n"
            "Task: Help the user prepare for a social situation. Provide best-case, worst-case, and safer wording.\n"
            f"Scenario: {scenario}\n"
            f"User notes: {custom_text or '(none)'}\n\n"
            "Return ONLY valid JSON with keys: best_case_reaction, worst_case_reaction, safer_wording, confidence_analysis."
        ).strip()

        if not self.llm.enabled:
            raise RuntimeError("No AI provider configured")

        try:
            raw = self.llm.complete_json(
                model=DEFAULT_MODEL,
                messages=[LlmMessage(role="system", content=system), LlmMessage(role="user", content=user)],
                temperature=policy.temperature,
                top_p=policy.top_p,
            )
            return self._finalize_payload(
                task="simulate",
                payload=_loads_json(raw),
                started=started,
                source="llm",
                text_keys=["best_case_reaction", "worst_case_reaction", "safer_wording", "confidence_analysis"],
            )
        except RuntimeError as exc:
            raise exc
        except Exception:
            return self._finalize_payload(
                task="simulate",
                payload=self._offline_simulate_payload(),
                started=started,
                source="offline_fallback",
                text_keys=["best_case_reaction", "worst_case_reaction", "safer_wording", "confidence_analysis"],
            )

    def stream_analyze_overthinking(self, **kwargs: Any) -> Iterator[str]:
        yield json.dumps(self.analyze_overthinking(**kwargs).payload)

    def stream_generate_replies(self, **kwargs: Any) -> Iterator[str]:
        yield json.dumps(self.generate_replies(**kwargs).payload)

    def stream_simulate_social_reaction(self, **kwargs: Any) -> Iterator[str]:
        yield json.dumps(self.simulate_social_reaction(**kwargs).payload)
