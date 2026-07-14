from __future__ import annotations

from typing import Any


SCHEMAS: dict[str, dict[str, type | tuple[type, ...]]] = {
    "translate": {
        "emotional_tone": str,
        "hidden_intent": str,
        "urgency_level": int,
        "confidence_score": int,
        "likely_meaning": str,
        "reassurance": str,
        "suggestions": list,
    },
    "replies": {
        "suggested_replies": list,
    },
    "simulate": {
        "best_case_reaction": str,
        "worst_case_reaction": str,
        "safer_wording": str,
        "confidence_analysis": str,
    },
}


def validate_payload(task: str, payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    schema = SCHEMAS.get(task, {})
    for key, expected_type in schema.items():
        if key not in payload:
            errors.append(f"missing:{key}")
            continue
        if not isinstance(payload[key], expected_type):
            errors.append(f"type:{key}")

    if task == "translate":
        urgency = payload.get("urgency_level")
        confidence = payload.get("confidence_score")
        if isinstance(urgency, int) and not 1 <= urgency <= 10:
            errors.append("range:urgency_level")
        if isinstance(confidence, int) and not 1 <= confidence <= 100:
            errors.append("range:confidence_score")
        suggestions = payload.get("suggestions")
        if isinstance(suggestions, list) and not 2 <= len(suggestions) <= 4:
            errors.append("count:suggestions")

    if task == "replies":
        replies = payload.get("suggested_replies")
        if isinstance(replies, list) and len(replies) != 3:
            errors.append("count:suggested_replies")

    return errors
