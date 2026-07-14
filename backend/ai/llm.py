from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Iterable, Iterator, Optional


@dataclass(frozen=True)
class LlmMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    api_key: str
    model: str
    base_url: str = ""


def _env(name: str, default: str = "") -> str:
    value = os.getenv(name, default)
    if not value or value.strip() == "" or "YOUR_" in value:
        return ""
    return value.strip()


class LlmClient:
    """
    Free-provider LLM client.

    Provider order is controlled by AI_PROVIDER_PRIORITY and defaults to:
    Gemini -> Groq -> OpenRouter. OpenAI is intentionally not used here.
    """

    def __init__(self) -> None:
        self.providers = self._load_providers()
        self.last_error: Optional[str] = None
        self.last_provider: Optional[str] = None
        self.last_model: Optional[str] = None

    def _load_providers(self) -> list[ProviderConfig]:
        priority = _env("AI_PROVIDER_PRIORITY", "gemini,groq,openrouter")
        providers: list[ProviderConfig] = []

        for raw_name in priority.split(","):
            name = raw_name.strip().lower()
            if name == "gemini":
                key = _env("GEMINI_API_KEY")
                if key:
                    providers.append(
                        ProviderConfig(
                            name="gemini",
                            api_key=key,
                            model=_env("GEMINI_MODEL", "gemini-2.5-flash-lite"),
                        )
                    )
            elif name == "groq":
                key = _env("GROQ_API_KEY")
                if key:
                    providers.append(
                        ProviderConfig(
                            name="groq",
                            api_key=key,
                            model=_env("GROQ_MODEL", "llama-3.1-8b-instant"),
                            base_url="https://api.groq.com/openai/v1/chat/completions",
                        )
                    )
            elif name == "openrouter":
                key = _env("OPENROUTER_API_KEY")
                if key:
                    providers.append(
                        ProviderConfig(
                            name="openrouter",
                            api_key=key,
                            model=_env("OPENROUTER_MODEL", "google/gemma-3-27b-it:free"),
                            base_url="https://openrouter.ai/api/v1/chat/completions",
                        )
                    )

        return providers

    @property
    def enabled(self) -> bool:
        return bool(self.providers)

    def check_provider_health(self, provider_name: str) -> bool:
        provider = next((p for p in self.providers if p.name == provider_name), None)
        if not provider:
            return False
        try:
            messages = [LlmMessage(role="user", content='Respond ONLY with a valid JSON: {"status": "ok"}')]
            if provider.name == "gemini":
                self._complete_gemini(provider, messages, temperature=0.1, top_p=0.9)
            else:
                self._complete_openai_compatible(provider, messages, temperature=0.1, top_p=0.9)
            return True
        except Exception as e:
            print(f"HEALTH CHECK FAILED for {provider_name}: {e}")
            return False

    def complete_json(
        self,
        *,
        model: str,
        messages: Iterable[LlmMessage],
        temperature: float,
        top_p: float,
    ) -> str:
        del model  # Provider-specific free model is selected by environment.
        prepared_messages = list(messages)
        errors: list[str] = []

        for provider in self.providers:
            try:
                if provider.name == "gemini":
                    text = self._complete_gemini(provider, prepared_messages, temperature, top_p)
                else:
                    text = self._complete_openai_compatible(provider, prepared_messages, temperature, top_p)
                self.last_provider = provider.name
                self.last_model = provider.model
                self.last_error = f"Fallback used after {', '.join(errors)} failed" if errors else None
                return text
            except Exception as exc:
                errors.append(provider.name)
                continue

        self.last_provider = "offline"
        self.last_model = "local-fallback"
        
        if not self.providers:
            self.last_error = "No AI provider configured"
            raise RuntimeError("No AI provider configured")
            
        if "gemini" in errors:
            self.last_error = "Gemini unavailable"
            raise RuntimeError("Gemini unavailable")
        elif "groq" in errors:
            self.last_error = "Groq unavailable"
            raise RuntimeError("Groq unavailable")
        else:
            self.last_error = "No AI provider configured"
            raise RuntimeError("No AI provider configured")

    def runtime_status(self) -> dict[str, Any]:
        primary_provider = self.providers[0] if self.providers else None
        return {
            "enabled": self.enabled,
            "providers": [{"name": p.name, "model": p.model} for p in self.providers],
            "primary_provider": primary_provider.name if primary_provider else "offline",
            "backup_provider": self.providers[1].name if len(self.providers) > 1 else None,
            "active_provider": primary_provider.name if primary_provider else "offline",
            "active_model": primary_provider.model if primary_provider else "local-fallback",
            "last_success_provider": self.last_provider,
            "last_success_model": self.last_model,
            "last_error": self.last_error,
        }

    def stream_text(
        self,
        *,
        model: str,
        messages: Iterable[LlmMessage],
        temperature: float,
        top_p: float,
    ) -> Iterator[str]:
        # Free providers have uneven streaming support and quotas. Return one
        # complete JSON chunk so the existing SSE pipeline still works.
        yield self.complete_json(
            model=model,
            messages=messages,
            temperature=temperature,
            top_p=top_p,
        )

    def _request_json(self, url: str, headers: dict[str, str], payload: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps(payload).encode("utf-8")
        request = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"HTTP {exc.code}: {detail[:500]}") from exc

    def _complete_gemini(
        self,
        provider: ProviderConfig,
        messages: list[LlmMessage],
        temperature: float,
        top_p: float,
    ) -> str:
        system_text = "\n\n".join(m.content for m in messages if m.role == "system").strip()
        contents = []
        for message in messages:
            if message.role == "system":
                continue
            role = "model" if message.role == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": message.content}]})

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{provider.model}:generateContent?key={provider.api_key}"
        )
        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "topP": top_p,
                "responseMimeType": "application/json",
            },
        }
        if system_text:
            payload["systemInstruction"] = {"parts": [{"text": system_text}]}

        data = self._request_json(url, {"Content-Type": "application/json"}, payload)
        candidates = data.get("candidates") or []
        parts = (((candidates[0] or {}).get("content") or {}).get("parts") or []) if candidates else []
        text = "".join(part.get("text", "") for part in parts).strip()
        if not text:
            raise RuntimeError(f"Gemini returned no text: {str(data)[:500]}")
        return text

    def _complete_openai_compatible(
        self,
        provider: ProviderConfig,
        messages: list[LlmMessage],
        temperature: float,
        top_p: float,
    ) -> str:
        headers = {
            "Authorization": f"Bearer {provider.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": _env("APP_USER_AGENT", "MindEaseAI/1.0 (+http://localhost)"),
        }
        if provider.name == "openrouter":
            headers["HTTP-Referer"] = _env("APP_PUBLIC_URL", "http://localhost:3000")
            headers["X-Title"] = _env("APP_NAME", "MindEase AI")

        payload = {
            "model": provider.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "top_p": top_p,
        }
        data = self._request_json(provider.base_url, headers, payload)
        choices = data.get("choices") or []
        content = ((choices[0] or {}).get("message") or {}).get("content", "") if choices else ""
        if not content:
            raise RuntimeError(f"{provider.name} returned no text: {str(data)[:500]}")
        return str(content).strip()
