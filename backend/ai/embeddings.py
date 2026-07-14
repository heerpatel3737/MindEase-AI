from __future__ import annotations

import hashlib
import json
import math
import os
import urllib.error
import urllib.request
from typing import List, Optional

EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIM = 768


def _env(name: str, default: str = "") -> str:
    value = os.getenv(name, default)
    if not value or value.strip() == "" or "YOUR_" in value:
        return ""
    return value.strip()


class EmbeddingService:
    def __init__(self) -> None:
        self.api_key = _env("GEMINI_API_KEY")
        self.model = _env("GEMINI_EMBEDDING_MODEL", EMBEDDING_MODEL)

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    def embed(self, text: str) -> Optional[List[float]]:
        if not text.strip():
            return None
        if not self.enabled:
            return self._local_hash_embedding(text)

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:embedContent?key={self.api_key}"
        )
        payload = {"content": {"parts": [{"text": text[:8000]}]}}
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
            values = ((data.get("embedding") or {}).get("values") or [])
            return [float(v) for v in values] if values else None
        except (urllib.error.HTTPError, OSError, ValueError) as e:
            print(f"Embedding failed, using local hash embedding: {e}")
            return self._local_hash_embedding(text)

    @staticmethod
    def _local_hash_embedding(text: str) -> List[float]:
        # Deterministic zero-cost fallback. It is not semantic, but it lets
        # memory ranking keep working when no embedding API key is configured.
        buckets = [0.0] * 128
        for token in text.lower().split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            idx = int.from_bytes(digest[:2], "big") % len(buckets)
            sign = 1.0 if digest[2] % 2 == 0 else -1.0
            buckets[idx] += sign
        norm = math.sqrt(sum(x * x for x in buckets)) or 1.0
        return [x / norm for x in buckets]

    @staticmethod
    def to_json(vec: List[float]) -> str:
        return json.dumps(vec)

    @staticmethod
    def from_json(raw: Optional[str]) -> Optional[List[float]]:
        if not raw:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    @staticmethod
    def cosine_similarity(a: List[float], b: List[float]) -> float:
        if len(a) != len(b) or not a:
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        na = math.sqrt(sum(x * x for x in a))
        nb = math.sqrt(sum(y * y for y in b))
        if na == 0 or nb == 0:
            return 0.0
        return dot / (na * nb)

    @staticmethod
    def text_hash(text: str) -> str:
        return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()[:32]
