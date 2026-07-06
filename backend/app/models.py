from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from .config import ENGRAM_TYPES


EngramType = Literal[
    "misconception",
    "mastery",
    "preference",
    "affect",
    "goal",
    "fact",
    "strategy_outcome",
]


class CandidateEngram(BaseModel):
    type: EngramType
    content: str = Field(min_length=8, max_length=500)
    subject_tags: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    importance: float = Field(ge=0, le=1)
    source_quotes: list[str] = Field(min_length=1, max_length=4)

    @field_validator("subject_tags")
    @classmethod
    def normalize_tags(cls, value: list[str]) -> list[str]:
        return [tag.strip().lower().replace(" ", "_") for tag in value if tag.strip()]


class ObserverResult(BaseModel):
    engrams: list[CandidateEngram] = Field(default_factory=list, max_length=3)


class SessionLevelEngramResult(BaseModel):
    engrams: list[CandidateEngram] = Field(default_factory=list, max_length=2)


class DistillVerdict(BaseModel):
    verdict: Literal["confirm", "revise", "reject"]
    content: str = Field(default="", max_length=500)
    confidence: float = Field(ge=0, le=1)
    reason: str = Field(default="", max_length=240)


class PairJudgeVerdict(BaseModel):
    verdict: Literal["duplicate", "refinement", "contradiction", "distinct"]
    reason: str = Field(default="", max_length=240)


class EvalJudgeVerdict(BaseModel):
    score: int = Field(ge=1, le=5)
    reason: str = Field(default="", max_length=240)


class Engram(BaseModel):
    id: str
    student_id: str
    type: EngramType
    content: str
    subject_tags: list[str]
    confidence: float
    importance: float
    strength: float
    status: Literal["active", "superseded", "archived"]
    provisional: bool
    superseded_by: str | None = None
    created_at: str
    last_accessed_at: str
    access_count: int


class MemoryEvent(BaseModel):
    id: str
    engram_id: str | None = None
    event_type: str
    payload_json: dict[str, Any] = Field(default_factory=dict)
    session_id: str | None = None
    created_at: str


class MemoryPackItem(BaseModel):
    engram_id: str
    content: str
    type: str
    tokens: int
    score: float
    breakdown: dict[str, float]


class ExcludedMemory(BaseModel):
    engram_id: str
    content: str
    reason: str


class MemoryPack(BaseModel):
    budget: int
    used: int
    winners: list[MemoryPackItem]
    excluded: list[ExcludedMemory]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class CreateSessionRequest(BaseModel):
    title: str | None = None


class ConductorClockRequest(BaseModel):
    days: int = Field(ge=-30, le=30)


def validate_engram_type(value: str) -> str:
    if value not in ENGRAM_TYPES:
        raise ValueError(f"Unknown engram type: {value}")
    return value
