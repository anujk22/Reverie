from __future__ import annotations

from app.memory.retrieval import (
    RetrievalCandidate,
    RetrievalEngram,
    select_under_budget,
)


def make_candidate(
    engram_id: str,
    engram_type: str,
    tokens: int,
    score: float,
) -> RetrievalCandidate:
    return RetrievalCandidate(
        engram=RetrievalEngram(
            id=engram_id,
            type=engram_type,
            content=f"{engram_type} content",
            subject_tags=[],
            strength=0.5,
            importance=0.5,
            created_at="2026-01-01T00:00:00+00:00",
            embedding=[1.0, 0.0],
        ),
        tokens=tokens,
        score=score,
        breakdown={},
    )


def test_select_under_budget_prioritizes_preference_and_goal_quotas() -> None:
    candidates = [
        make_candidate("fact_high_score", "fact", tokens=10, score=0.99),
        make_candidate("preference_quota", "preference", tokens=10, score=0.2),
        make_candidate("goal_quota", "goal", tokens=10, score=0.1),
    ]

    winners, excluded = select_under_budget(candidates, budget=20)

    assert [item.engram.id for item in winners] == [
        "preference_quota",
        "goal_quota",
    ]
    assert [item.engram.id for item, _reason in excluded] == ["fact_high_score"]
    assert excluded[0][1] == "budget exhausted (needed 10, 0 left)"


def test_select_under_budget_continues_after_oversized_candidate() -> None:
    candidates = [
        make_candidate("preference_quota", "preference", tokens=10, score=0.92),
        make_candidate("goal_quota", "goal", tokens=10, score=0.9),
        make_candidate("mastery_too_large", "mastery", tokens=20, score=0.89),
        make_candidate("fact_fits_remainder", "fact", tokens=15, score=0.5),
    ]

    winners, excluded = select_under_budget(candidates, budget=35)

    assert [item.engram.id for item in winners] == [
        "preference_quota",
        "goal_quota",
        "fact_fits_remainder",
    ]
    assert [(item.engram.id, reason) for item, reason in excluded] == [
        ("mastery_too_large", "budget exhausted (needed 20, 15 left)")
    ]
