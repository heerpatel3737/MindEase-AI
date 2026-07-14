from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class PostProcessResult:
    text: str
    removed_phrases: list[str]


DEFAULT_BANNED_PHRASES: tuple[str, ...] = (
    # Words/phrases that make the AI sound like a “system”
    "protocol",
    "matrix",
    "output stream",
    "clinical reassurance",
    "premium",
    "synthesizing",
    "cognitive operating system",
    "diagnostic",
    "resource warning",
    "transmission",
    "ready for transmission",
    "synchronizing",
)


def _strip_weird_markers(text: str) -> str:
    # Remove accidental markdown fences or stray “json” wrappers.
    text = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text, flags=re.IGNORECASE)
    return text.strip()


def _soften_shouty_caps(text: str) -> str:
    # If there are many all-caps tokens, reduce the “robotic UI voice” effect.
    # Keep acronyms (JWT, API).
    def fix_token(tok: str) -> str:
        if len(tok) <= 3:
            return tok
        if tok.isupper():
            return tok.capitalize()
        return tok

    tokens = re.split(r"(\s+)", text)
    caps = sum(1 for t in tokens if t.isalpha() and len(t) > 3 and t.isupper())
    if caps < 6:
        return text
    return "".join(fix_token(t) if re.match(r"^[A-Za-z]+$", t or "") else t for t in tokens)


def clean_text(text: str, banned_phrases: Iterable[str] = DEFAULT_BANNED_PHRASES) -> PostProcessResult:
    removed: list[str] = []
    out = _strip_weird_markers(text)

    # Normalize whitespace
    out = re.sub(r"[ \t]+\n", "\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out).strip()

    # Banlist remove (case-insensitive, whole phrase)
    for phrase in banned_phrases:
        pattern = re.compile(re.escape(phrase), flags=re.IGNORECASE)
        if pattern.search(out):
            removed.append(phrase)
            out = pattern.sub("", out)

    out = re.sub(r"\s{2,}", " ", out)
    out = re.sub(r"\n\s+\n", "\n\n", out).strip()
    out = _soften_shouty_caps(out)
    return PostProcessResult(text=out, removed_phrases=removed)

