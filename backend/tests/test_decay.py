from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.memory.decay import DecayInput, compute_strength


BASE_TIME = datetime(2026, 1, 1, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    ("days_elapsed", "importance", "access_count", "expected"),
    [
        (0, 1.0, 0, 1.0),
        (1, 1.0, 0, 0.704688089719),
        (7, 1.0, 0, 0.086293586499),
        (7, 0.8, 3, 0.286550634820),
        (30, 0.95, 9, 0.039532944635),
    ],
)
def test_compute_strength_curve_pinned_values(
    days_elapsed: int,
    importance: float,
    access_count: int,
    expected: float,
) -> None:
    item = DecayInput(
        importance=importance,
        access_count=access_count,
        last_accessed_at=BASE_TIME,
        now=BASE_TIME + timedelta(days=days_elapsed),
    )

    assert compute_strength(item, lambda_base=0.35) == pytest.approx(expected)


def test_compute_strength_clamps_future_access_and_high_importance() -> None:
    item = DecayInput(
        importance=1.4,
        access_count=-3,
        last_accessed_at=BASE_TIME + timedelta(days=1),
        now=BASE_TIME,
    )

    assert compute_strength(item, lambda_base=0.35) == 1.0
