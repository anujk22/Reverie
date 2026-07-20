from __future__ import annotations

import re
import time
from typing import Any

from app.config import settings
from app.db import db
from app.llm import llm_client
from app.memory.retrieval import (
    RetrievalCandidate,
    RetrievalEngram,
    score_candidates,
    select_under_budget,
)


# Greeting-only turns contain no task signal and should not spend retrieval/model budget.
def greeting_only(query: str) -> bool:
    words = re.findall(r"[a-z0-9']+", query.lower())
    return bool(words) and len(words) <= 3 and set(words) <= {
        "afternoon",
        "evening",
        "good",
        "hello",
        "hey",
        "hi",
        "morning",
        "there",
    }


async def assemble_memory_pack(
    query: str,
    session_id: str | None,
    phase: str = "mid_session",
    reinforce: bool = True,
) -> dict[str, Any]:
    started = time.perf_counter()
    if phase == "mid_session" and greeting_only(query):
        return {
            "budget": settings.context_budget_tokens,
            "used": 0,
            "winners": [],
            "excluded": [],
            "pipeline": {
                "searched": 0,
                "eligible": 0,
                "filtered": 0,
                "ranked": 0,
                "selected": 0,
                "retrieval_ms": 0,
            },
        }

    query_embedding = await llm_client.embed(query, session_id=session_id)
    active_engrams = db.active_engrams()
    engrams = []
    for item in active_engrams:
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
    scored = score_candidates(engrams, query_embedding, phase=phase)
    relevance_filtered = []
    candidates = scored
    if phase == "mid_session":
        candidates = []
        for item in scored:
            if item.semantic_similarity < settings.mid_session_relevance_threshold:
                relevance_filtered.append(
                    (
                        item,
                        "semantic match below "
                        f"{settings.mid_session_relevance_threshold:.2f} threshold",
                    )
                )
            else:
                candidates.append(item)
    winners, selection_excluded = select_under_budget(
        candidates, settings.context_budget_tokens
    )
    excluded = [*relevance_filtered, *selection_excluded]
    active_by_id = {item["id"]: item for item in active_engrams}
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
                "semantic_similarity": item.semantic_similarity,
                "selection_reason": selection_reason(item),
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
        "pipeline": {
            "searched": len(active_engrams),
            "eligible": len(engrams),
            "filtered": len(active_engrams) - len(candidates),
            "ranked": len(candidates),
            "selected": len(winners),
            "retrieval_ms": int((time.perf_counter() - started) * 1000),
        },
    }


def selection_reason(item: RetrievalCandidate) -> str:
    if item.semantic_similarity >= 0.55:
        return "Strong semantic match to the current message"
    if item.engram.type == "preference":
        return "Relevant durable response preference"
    if item.engram.type == "affect":
        return "Relevant current pressure and tone signal"
    if item.engram.type == "goal":
        return "Relevant active goal or timing constraint"
    if item.engram.type in {"mastery", "misconception", "strategy_outcome"}:
        return "Relevant prior knowledge or execution outcome"
    return "Relevant autobiographical context"
