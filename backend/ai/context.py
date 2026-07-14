from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class UserContext:
    history: list[dict]
    recent_moods: list[str]
    recent_triggers: list[str]
    recent_burnout_score: int


def to_user_context(raw: Optional[Dict[str, Any]]) -> UserContext:
    raw = raw or {}
    return UserContext(
        history=list(raw.get("history") or []),
        recent_moods=list(raw.get("recent_moods") or []),
        recent_triggers=list(raw.get("recent_triggers") or []),
        recent_burnout_score=int(raw.get("recent_burnout_score") or 25),
    )


def pack_context_for_prompt(
    ctx: UserContext,
    *,
    memory_snippet: str = "",
    emotion_snippet: str = "",
) -> str:
    # Compact, non-robotic, relevance-friendly format. No “matrix/protocol” headers.
    mood = ", ".join(ctx.recent_moods[-3:]) if ctx.recent_moods else "none noted"
    triggers = ", ".join(ctx.recent_triggers[:5]) if ctx.recent_triggers else "none noted"
    burnout = ctx.recent_burnout_score

    lines: list[str] = []
    if emotion_snippet:
        lines.append(emotion_snippet)
    lines.append(f"User state: moods recently ({mood}); stress themes ({triggers}); burnout score ({burnout}/100).")
    if memory_snippet:
        lines.append(memory_snippet)

    # Use short history, but avoid the repetitive “Tone/Intent/Reassurance” summary style.
    if ctx.history:
        lines.append("Recent context (high level):")
        for h in ctx.history[-4:]:
            up = (h.get("prompt") or "").strip()
            ar = (h.get("response") or "").strip()
            if not up and not ar:
                continue
            # truncate to keep token budget stable
            up = (up[:180] + "…") if len(up) > 180 else up
            ar = (ar[:180] + "…") if len(ar) > 180 else ar
            if up:
                lines.append(f"- user: {up}")
            if ar:
                lines.append(f"  you: {ar}")

    return "\n".join(lines).strip()

