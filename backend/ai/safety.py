from __future__ import annotations

from dataclasses import dataclass


CRISIS_TERMS = (
    "kill myself",
    "end my life",
    "suicide",
    "self harm",
    "self-harm",
    "hurt myself",
    "i want to die",
    "can't go on",
)


@dataclass(frozen=True)
class SafetyResult:
    blocked: bool
    category: str
    message: str


def check_safety(text: str) -> SafetyResult:
    lowered = (text or "").lower()
    if any(term in lowered for term in CRISIS_TERMS):
        return SafetyResult(
            blocked=True,
            category="crisis",
            message=(
                "I'm really sorry you're feeling this much pain. I can't help with anything that would "
                "hurt you, but you deserve immediate support right now. If you might act on this, call "
                "your local emergency number now. In the U.S. or Canada, call or text 988. If you're "
                "elsewhere, contact a trusted person near you or local emergency services and stay with someone."
            ),
        )
    return SafetyResult(blocked=False, category="ok", message="")
