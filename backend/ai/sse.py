from __future__ import annotations

import json
from typing import Any, Dict


def format_sse(event: str, data: Dict[str, Any]) -> str:
    """Format a single Server-Sent Event frame."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
