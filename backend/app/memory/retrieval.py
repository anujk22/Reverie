from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Iterable

from app.config import MID_SESSION_PRIOR, SESSION_OPEN_PRIOR


@dataclass(frozen=True)
class RetrievalEngram:
    id: str
    type: str
    content: str
    subject_tags: list[str]
    strength: float
    importance: float
    created_at: str
    embedding: list[float]


@dataclass(frozen=True)
class RetrievalCandidate:
    engram: RetrievalEngram
    tokens: int
    score: float
    breakdown: dict[str, float]


def cosine(a: Iterable[float], b: Iterable[float]) -> float:
    av = list(a)
    bv = list(b)
    if not av or not bv:
        return 0.0
    total = sum(x * y for x, y in zip(av, bv))
    norm_a = sqrt(sum(x * x for x in av))
    norm_b = sqrt(sum(y * y for y in bv))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return total / (norm_a * norm_b)


def estimate_tokens(text: str) -> int:
    return max(8, int(len(text.split()) * 1.35) + 6)


def recency_norm(index: int, total: int) -> float:
    if total <= 1:
        return 1.0
    return 1.0 - (index / (total - 1)) * 0.45


def score_candidates(
    engrams: list[RetrievalEngram],
    query_embedding: list[float],
    phase: str = "mid_session",
) -> list[RetrievalCandidate]:
    priors = SESSION_OPEN_PRIOR if phase == "session_open" else MID_SESSION_PRIOR
    scored: list[RetrievalCandidate] = []
    total = len(engrams)
    for index, engram in enumerate(engrams):
        sim = max(cosine(engram.embedding, query_embedding), 0.0)
        strength = max(min(engram.strength, 1.0), 0.0)
        recency = recency_norm(index, total)
        prior = priors.get(engram.type, 0.3)
        score = 0.40 * sim + 0.30 * strength + 0.15 * recency + 0.15 * prior
        scored.append(
            RetrievalCandidate(
                engram=engram,
                tokens=estimate_tokens(engram.content),
                score=round(score, 4),
                breakdown={
                    "sim": round(0.40 * sim, 4),
                    "strength": round(0.30 * strength, 4),
                    "recency": round(0.15 * recency, 4),
                    "prior": round(0.15 * prior, 4),
                },
            )
        )
    return sorted(scored, key=lambda item: item.score, reverse=True)


def select_under_budget(
    candidates: list[RetrievalCandidate], budget: int
) -> tuple[list[RetrievalCandidate], list[tuple[RetrievalCandidate, str]]]:
    winners: list[RetrievalCandidate] = []
    excluded: list[tuple[RetrievalCandidate, str]] = []
    used = 0

    def take(candidate: RetrievalCandidate) -> bool:
        nonlocal used
        if candidate in winners:
            return True
        if used + candidate.tokens > budget:
            excluded.append(
                (
                    candidate,
                    f"budget exhausted (needed {candidate.tokens}, {budget - used} left)",
                )
            )
            return False
        winners.append(candidate)
        used += candidate.tokens
        return True

    for required_type in ("preference", "goal"):
        quota_candidate = next(
            (item for item in candidates if item.engram.type == required_type), None
        )
        if quota_candidate:
            take(quota_candidate)

    for candidate in candidates:
        if candidate in winners:
            continue
        take(candidate)

    winner_ids = {item.engram.id for item in winners}
    for candidate in candidates:
        if candidate.engram.id not in winner_ids and all(
            candidate.engram.id != existing[0].engram.id for existing in excluded
        ):
            excluded.append((candidate, "lower score than selected memories"))

    return winners, excluded
