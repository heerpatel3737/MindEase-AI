from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

import models
from .embeddings import EmbeddingService


def memory_content_from_conversation(c: models.Conversation) -> str:
    return f"{c.prompt}\n{c.response}"


def memory_content_from_journal(j: models.Journal) -> str:
    parts = [j.entry_text]
    if j.ai_summary:
        parts.append(j.ai_summary)
    if j.worry_triggers:
        parts.append(f"Triggers: {j.worry_triggers}")
    return "\n".join(parts)


def upsert_memory(
    db: Session,
    *,
    user_id: int,
    source_type: str,
    source_id: int,
    content: str,
    summary: Optional[str] = None,
    tags: Optional[str] = None,
    embedder: Optional[EmbeddingService] = None,
) -> None:
    embedder = embedder or EmbeddingService()
    existing = (
        db.query(models.UserMemory)
        .filter(
            models.UserMemory.user_id == user_id,
            models.UserMemory.source_type == source_type,
            models.UserMemory.source_id == source_id,
        )
        .first()
    )
    embedding_json = None
    vec = embedder.embed(content)
    if vec:
        embedding_json = embedder.to_json(vec)

    if existing:
        existing.content = content
        existing.summary = summary or existing.summary
        existing.tags = tags or existing.tags
        existing.embedding_json = embedding_json or existing.embedding_json
        existing.created_at = datetime.utcnow()
    else:
        db.add(
            models.UserMemory(
                user_id=user_id,
                source_type=source_type,
                source_id=source_id,
                content=content,
                summary=summary,
                tags=tags,
                embedding_json=embedding_json,
            )
        )
    db.commit()


def retrieve_relevant_memories(
    db: Session,
    *,
    user_id: int,
    query: str,
    limit: int = 6,
    embedder: Optional[EmbeddingService] = None,
) -> List[Dict[str, Any]]:
    embedder = embedder or EmbeddingService()
    rows = (
        db.query(models.UserMemory)
        .filter(models.UserMemory.user_id == user_id)
        .order_by(models.UserMemory.created_at.desc())
        .limit(80)
        .all()
    )
    if not rows:
        return []

    query_vec = embedder.embed(query)
    scored: List[tuple[float, models.UserMemory]] = []

    if query_vec:
        for row in rows:
            vec = embedder.from_json(row.embedding_json)
            if not vec:
                continue
            score = embedder.cosine_similarity(query_vec, vec)
            scored.append((score, row))
        scored.sort(key=lambda x: x[0], reverse=True)
        top = [r for _, r in scored[:limit]]
    else:
        # Recency fallback when embeddings unavailable
        top = rows[:limit]

    return [
        {
            "source_type": m.source_type,
            "summary": (m.summary or m.content[:200]),
            "tags": m.tags,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in top
    ]


def pack_memories_for_prompt(memories: List[Dict[str, Any]]) -> str:
    if not memories:
        return ""
    lines = ["Relevant past context:"]
    for m in memories:
        tag = f" ({m['tags']})" if m.get("tags") else ""
        lines.append(f"- [{m.get('source_type', 'memory')}]{tag} {m.get('summary', '')}")
    return "\n".join(lines)
