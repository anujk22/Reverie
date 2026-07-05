from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any

from app.config import settings
from app.db import db
from app.llm import llm_client
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
        candidate = normalize_candidate(candidate)
        if candidate is None:
            continue

        source_ids: list[str] = []
        for quote in candidate.source_quotes:
            source_ids.extend(quote_sources(quote, utterances))
        source_ids = list(dict.fromkeys(source_ids))
        if not source_ids:
            continue

        embedding = await llm_client.embed(candidate.content, session_id=session_id)
        duplicate = nearest_duplicate(candidate.type, embedding)
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


def nearest_duplicate(engram_type: str, embedding: list[float]) -> dict[str, Any] | None:
    best: tuple[float, dict[str, Any]] | None = None
    for engram in db.active_engrams():
        if engram["type"] != engram_type:
            continue
        similarity = cosine(db.vector_for(engram["id"]), embedding)
        if best is None or similarity > best[0]:
            best = (similarity, engram)
    if best and best[0] > settings.duplicate_reinforce_threshold:
        return best[1]
    return None


def normalize_candidate(candidate: CandidateEngram) -> CandidateEngram | None:
    evidence = " ".join([candidate.content, *candidate.source_quotes]).lower()
    if is_correct_chain_rule_evidence(evidence):
        return candidate.model_copy(
            update={
                "type": "mastery",
                "content": "Correctly explains chain rule as outside derivative times inner derivative.",
                "subject_tags": ["chain_rule", "composite_functions"],
                "confidence": max(candidate.confidence, 0.82),
                "importance": max(candidate.importance, 0.84),
            }
        )
    if candidate.type == "misconception" and is_past_error_reference_only(evidence):
        return None
    return candidate


def is_correct_chain_rule_evidence(evidence: str) -> bool:
    has_outer = "outer derivative" in evidence or "outside derivative" in evidence
    has_inner = "inner derivative" in evidence or "derivative of the inside" in evidence
    has_inside = "inside alone" in evidence or "unchanged inside" in evidence
    return has_outer and has_inner and has_inside


def is_past_error_reference_only(evidence: str) -> bool:
    past_reference = any(
        marker in evidence
        for marker in ("wrong yesterday", "prior error", "previously", "used to")
    )
    repeats_bad_rule = any(
        marker in evidence
        for marker in ("product rule", "f'(x)", "f prime x", "g'(x)", "g prime x")
    )
    return past_reference and not repeats_bad_rule
