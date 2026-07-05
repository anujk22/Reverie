from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from math import exp, log


@dataclass(frozen=True)
class DecayInput:
    importance: float
    access_count: int
    last_accessed_at: datetime
    now: datetime


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def compute_strength(item: DecayInput, lambda_base: float = 0.35) -> float:
    delta_days = max((item.now - item.last_accessed_at).total_seconds() / 86400.0, 0)
    lambda_eff = lambda_base / (1 + log(1 + max(item.access_count, 0)))
    return clamp(item.importance * exp(-lambda_eff * delta_days))
