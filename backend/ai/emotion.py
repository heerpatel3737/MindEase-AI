from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .context import UserContext, to_user_context


@dataclass(frozen=True)
class EmotionalState:
    anxiety_level: int  # 0-100
    overwhelm_level: int
    burnout_risk: int
    social_sensitivity: int
    confidence_level: int  # inverse of anxiety for UX
    summary: str


def compute_emotional_state(user_context: Optional[Dict[str, Any]]) -> EmotionalState:
    ctx = to_user_context(user_context)
    burnout = ctx.recent_burnout_score

    anxiety = 25
    overwhelm = 20
    social = 30

    mood_anxiety = {"Anxiety", "Overloaded", "Burnout", "Sad"}
    if ctx.recent_moods:
        anxious_count = sum(1 for m in ctx.recent_moods if m in mood_anxiety)
        anxiety += anxious_count * 12
        overwhelm += anxious_count * 10

    if ctx.recent_triggers:
        anxiety += min(20, len(ctx.recent_triggers) * 4)
        social += min(15, len(ctx.recent_triggers) * 3)

    burnout_risk = burnout
    anxiety = min(100, max(0, int((anxiety * 0.5) + (burnout * 0.5))))
    overwhelm = min(100, max(0, overwhelm + max(0, burnout - 50) // 2))
    social = min(100, max(0, social))
    confidence = max(0, 100 - anxiety)

    summary_parts: List[str] = []
    if anxiety >= 70:
        summary_parts.append("elevated anxiety")
    elif anxiety >= 45:
        summary_parts.append("some tension")
    if burnout_risk >= 60:
        summary_parts.append("fatigue risk")
    if not summary_parts:
        summary_parts.append("relatively steady")

    return EmotionalState(
        anxiety_level=anxiety,
        overwhelm_level=overwhelm,
        burnout_risk=burnout_risk,
        social_sensitivity=social,
        confidence_level=confidence,
        summary=", ".join(summary_parts),
    )


def pack_emotion_for_prompt(state: EmotionalState) -> str:
    return (
        f"Emotional snapshot: {state.summary}. "
        f"Anxiety ~{state.anxiety_level}/100, overwhelm ~{state.overwhelm_level}/100, "
        f"burnout risk ~{state.burnout_risk}/100."
    )
