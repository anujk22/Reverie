from __future__ import annotations

from typing import Any

from app.config import settings
from app.db import db
from app.llm import llm_client
from app.memory.retrieval import RetrievalEngram, score_candidates, select_under_budget


async def assemble_memory_pack(
    query: str,
    session_id: str | None,
    phase: str = "mid_session",
    reinforce: bool = True,
) -> dict[str, Any]:
    query_embedding = await llm_client.embed(query, session_id=session_id)
    engrams = []
    for item in db.active_engrams():
        if item["provisional"]:
            continue
        if item["type"] != "goal" and float(item["strength"]) < 0.05:
            continue
        engrams.append(
            RetrievalEngram(
                id=item["id"],
                type=item["type"],
                content=item["content"],
                subject_tags=item["subject_tags"],
                strength=item["strength"],
                importance=item["importance"],
                created_at=item["created_at"],
                embedding=db.vector_for(item["id"]),
            )
        )
    candidates = score_candidates(engrams, query_embedding, phase=phase)
    winners, excluded = select_under_budget(candidates, settings.context_budget_tokens)
    active_by_id = {item["id"]: item for item in db.active_engrams()}
    if reinforce:
        for winner in winners:
            db.reinforce(winner.engram.id)
            await db.append_event(
                "engram.reinforced",
                winner.engram.id,
                {"reason": "selected for working memory"},
                session_id=session_id,
            )
    return {
        "budget": settings.context_budget_tokens,
        "used": sum(item.tokens for item in winners),
        "winners": [
            {
                "engram_id": item.engram.id,
                "content": item.engram.content,
                "type": item.engram.type,
                "subject_tags": item.engram.subject_tags,
                "confidence": active_by_id[item.engram.id]["confidence"],
                "strength": item.engram.strength,
                "tokens": item.tokens,
                "score": item.score,
                "breakdown": item.breakdown,
            }
            for item in winners
        ],
        "excluded": [
            {
                "engram_id": item.engram.id,
                "content": item.engram.content,
                "reason": reason,
            }
            for item, reason in excluded[:6]
        ],
    }
