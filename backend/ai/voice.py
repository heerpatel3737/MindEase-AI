from __future__ import annotations

import json
import os
import uuid
import urllib.error
import urllib.request


def _env(name: str, default: str = "") -> str:
    value = os.getenv(name, default)
    if not value or value.strip() == "" or "YOUR_" in value:
        return ""
    return value.strip()


class VoiceService:
    def __init__(self) -> None:
        self.api_key = _env("GROQ_API_KEY")
        self.model = _env("GROQ_VOICE_MODEL", "whisper-large-v3-turbo")

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def transcribe(self, audio_bytes: bytes, filename: str = "audio.webm") -> dict:
        if not self.enabled:
            raise RuntimeError("Groq API key required for free voice transcription")

        boundary = f"----mindease-{uuid.uuid4().hex}"
        body = self._multipart_body(
            boundary=boundary,
            fields={
                "model": self.model,
                "response_format": "json",
                "temperature": "0",
            },
            files={"file": (filename, audio_bytes, "audio/webm")},
        )
        request = urllib.request.Request(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            data=body,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Accept": "application/json",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
                "User-Agent": _env("APP_USER_AGENT", "MindEaseAI/1.0 (+http://localhost)"),
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                data = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Groq transcription failed: HTTP {exc.code}: {detail[:500]}") from exc

        return {"transcript": (data.get("text") or "").strip(), "language": data.get("language")}

    @staticmethod
    def _multipart_body(
        *,
        boundary: str,
        fields: dict[str, str],
        files: dict[str, tuple[str, bytes, str]],
    ) -> bytes:
        chunks: list[bytes] = []
        for name, value in fields.items():
            chunks.extend(
                [
                    f"--{boundary}\r\n".encode(),
                    f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                    value.encode(),
                    b"\r\n",
                ]
            )
        for name, (filename, content, content_type) in files.items():
            chunks.extend(
                [
                    f"--{boundary}\r\n".encode(),
                    (
                        f'Content-Disposition: form-data; name="{name}"; '
                        f'filename="{filename}"\r\n'
                    ).encode(),
                    f"Content-Type: {content_type}\r\n\r\n".encode(),
                    content,
                    b"\r\n",
                ]
            )
        chunks.append(f"--{boundary}--\r\n".encode())
        return b"".join(chunks)
