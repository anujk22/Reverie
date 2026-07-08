from __future__ import annotations

from difflib import SequenceMatcher
import re
from typing import Any

from app.config import settings
from app.db import db
from app.llm import llm_client
from app.memory.dedupe import find_duplicate_memory, lexical_similarity, structurally_duplicate
from app.memory.retrieval import cosine
from app.models import CandidateEngram


def transcript_window(utterances: list[dict[str, Any]]) -> str:
    return "\n".join(
        f"{item['role'].upper()}: {item['content']}" for item in utterances[-6:]
    )


def quote_supported(quote: str, transcript: str) -> bool:
    if quote in transcript:
        return True
    return SequenceMatcher(None, quote.lower(), transcript.lower()).ratio() >= 0.9


def quote_has_substance(quote: str) -> bool:
    return len(re.findall(r"[A-Za-z0-9']+", quote)) >= 4


def final_student_utterance(utterances: list[dict[str, Any]]) -> dict[str, Any] | None:
    for item in reversed(utterances):
        if item["role"] == "student":
            return item
    return None


def quote_anchors_final_student(quote: str, utterances: list[dict[str, Any]]) -> bool:
    student = final_student_utterance(utterances)
    return bool(student and quote_supported(quote, student["content"]))


def quote_anchors_student_utterance(quote: str, utterances: list[dict[str, Any]]) -> bool:
    return any(
        item["role"] == "student" and quote_supported(quote, item["content"])
        for item in utterances
    )


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
    processed_candidates: list[tuple[dict[str, Any], list[float]]] = []
    inserted_engram_ids: set[str] = set()
    reinforced_engram_ids: set[str] = set()
    for raw in raw_candidates:
        try:
            candidate = CandidateEngram(**raw)
        except Exception:
            continue
        if not all(quote_has_substance(quote) for quote in candidate.source_quotes):
            continue
        if not all(quote_supported(quote, transcript) for quote in candidate.source_quotes):
            continue
        if not any(quote_anchors_final_student(quote, utterances) for quote in candidate.source_quotes):
            continue

        source_ids: list[str] = []
        for quote in candidate.source_quotes:
            source_ids.extend(quote_sources(quote, utterances))
        source_ids = list(dict.fromkeys(source_ids))
        if not source_ids:
            continue

        candidate_data = candidate.model_dump(exclude={"source_quotes"})
        embedding = await llm_client.embed(candidate.content, session_id=session_id)
        if duplicate_candidate_seen(candidate_data, embedding, processed_candidates):
            continue
        processed_candidates.append((candidate_data, embedding))

        duplicate = nearest_duplicate(candidate_data, embedding)
        if duplicate:
            if duplicate["id"] in inserted_engram_ids or duplicate["id"] in reinforced_engram_ids:
                continue
            db.reinforce(duplicate["id"])
            reinforced_engram_ids.add(duplicate["id"])
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
            candidate_data,
            source_ids,
            embedding,
            provisional=True,
        )
        inserted_engram_ids.add(engram["id"])
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


def duplicate_candidate_seen(
    candidate: dict[str, Any],
    embedding: list[float],
    processed_candidates: list[tuple[dict[str, Any], list[float]]],
) -> bool:
    for processed, processed_embedding in processed_candidates:
        if processed["type"] != candidate["type"]:
            continue
        embedding_similarity = cosine(processed_embedding, embedding) if processed_embedding else 0.0
        lexical = lexical_similarity(candidate["content"], processed["content"])
        structural_bonus = 1.0 if structurally_duplicate(candidate, processed) else 0.0
        score = max(embedding_similarity, lexical + structural_bonus)
        if score >= 1.0 or score > settings.duplicate_reinforce_threshold:
            return True
    return False


def nearest_duplicate(candidate: dict[str, Any], embedding: list[float]) -> dict[str, Any] | None:
    return find_duplicate_memory(
        candidate,
        embedding,
        db.active_engrams(),
        db.vector_for,
        settings.duplicate_reinforce_threshold,
    )
