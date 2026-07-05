from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any

from app.config import settings
from app.db import db
from app.llm import llm_client
from app.memory.dedupe import find_duplicate_memory
from app.models import CandidateEngram


def transcript_window(utterances: list[dict[str, Any]]) -> str:
    return "\n".join(
        f"{item['role'].upper()}: {item['content']}" for item in utterances[-6:]
    )


def quote_supported(quote: str, transcript: str) -> bool:
    if quote in transcript:
        return True
    return SequenceMatcher(None, quote.lower(), transcript.lower()).ratio() >= 0.9


def quote_sources(quote: str, utterances: list[dict[str, Any]]) -> list[str]:
    exact = [item["id"] for item in utterances if quote in item["content"]]
    if exact:
        return exact
    best = sorted(
        utterances,
        key=lambda item: SequenceMatcher(None, quote.lower(), item["content"].lower()).ratio(),
        reverse=True,
    )
    if best:
        return [best[0]["id"]]
    return []


async def observe_exchange(session_id: str) -> None:
    utterances = db.utterances_for_session(session_id, limit=6)
    transcript = transcript_window(utterances)
    raw_candidates = await llm_client.extract_engrams(transcript, session_id=session_id)
    for raw in raw_candidates:
        try:
            candidate = CandidateEngram(**raw)
        except Exception:
            continue
        if not all(quote_supported(quote, transcript) for quote in candidate.source_quotes):
            continue

        source_ids: list[str] = []
        for quote in candidate.source_quotes:
            source_ids.extend(quote_sources(quote, utterances))
        source_ids = list(dict.fromkeys(source_ids))
        if not source_ids:
            continue

        embedding = await llm_client.embed(candidate.content, session_id=session_id)
        duplicate = nearest_duplicate(candidate.model_dump(exclude={"source_quotes"}), embedding)
        if duplicate:
            db.reinforce(duplicate["id"])
            await db.append_event(
                "engram.reinforced",
                duplicate["id"],
                {
                    "reason": "re-observed similar evidence",
                    "toast": f"Reinforced: {duplicate['content']}",
                },
                session_id=session_id,
            )
            continue

        engram = db.insert_engram(
            candidate.model_dump(exclude={"source_quotes"}),
            source_ids,
            embedding,
            provisional=True,
        )
        await db.append_event(
            "engram.observed",
            engram["id"],
            {
                "provisional": True,
                "source_quotes": candidate.source_quotes,
                "toast": f"Noticed: {engram['content']}",
            },
            session_id=session_id,
        )


def nearest_duplicate(candidate: dict[str, Any], embedding: list[float]) -> dict[str, Any] | None:
    return find_duplicate_memory(
        candidate,
        embedding,
        db.active_engrams(),
        db.vector_for,
        settings.duplicate_reinforce_threshold,
    )
