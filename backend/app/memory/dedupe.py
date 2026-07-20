from __future__ import annotations

from collections.abc import Callable
import re
from typing import Any

from app.memory.retrieval import cosine


STOPWORDS = {
    "a",
    "about",
    "an",
    "and",
    "are",
    "as",
    "at",
    "before",
    "by",
    "for",
    "from",
    "has",
    "in",
    "into",
    "is",
    "it",
    "of",
    "on",
    "or",
    "rather",
    "student",
    "that",
    "the",
    "their",
    "through",
    "to",
    "when",
    "with",
}

LOW_VARIANCE_TYPES = {"affect", "preference", "strategy_outcome"}
TEMPORAL_VALUES = {
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "today",
    "tomorrow",
    "yesterday",
}


def content_tokens(content: str) -> set[str]:
    tokens = set()
    for raw in re.findall(r"[a-z0-9']+", content.lower()):
        token = raw.strip("'")
        if len(token) < 3 or token in STOPWORDS:
            continue
        tokens.add(stem(token))
    return tokens


def stem(token: str) -> str:
    if token.startswith("anxi"):
        return "anxi"
    if token.endswith("zzes") and len(token) > 6:
        return token[:-3]
    if token.endswith("zes") and len(token) > 6:
        return token[:-2]
    if token.endswith("ically") and len(token) > 8:
        return token[:-5]
    if token.endswith("ally") and len(token) > 7:
        return token[:-4]
    if token.endswith("ing") and len(token) > 6:
        return token[:-3]
    if token.endswith("ed") and len(token) > 5:
        return token[:-2]
    if token.endswith("ies") and len(token) > 5:
        return token[:-3] + "y"
    if token.endswith("s") and len(token) > 4:
        return token[:-1]
    return token


def lexical_similarity(left: str, right: str) -> float:
    left_tokens = content_tokens(left)
    right_tokens = content_tokens(right)
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / len(left_tokens | right_tokens)


def structurally_duplicate(candidate: dict[str, Any], existing: dict[str, Any]) -> bool:
    if candidate["type"] != existing["type"]:
        return False
    if candidate["type"] == "goal" and conflicting_temporal_values(
        candidate["content"], existing["content"]
    ):
        return False

    similarity = lexical_similarity(candidate["content"], existing["content"])
    candidate_tags = set(candidate.get("subject_tags") or [])
    existing_tags = set(existing.get("subject_tags") or [])
    tag_overlap = bool(candidate_tags & existing_tags)

    if similarity >= 0.5:
        return True
    if tag_overlap and similarity >= 0.28:
        return True
    if candidate["type"] in LOW_VARIANCE_TYPES and tag_overlap and similarity >= 0.2:
        return True
    return False


def conflicting_temporal_values(left: str, right: str) -> bool:
    left_values = content_tokens(left) & TEMPORAL_VALUES
    right_values = content_tokens(right) & TEMPORAL_VALUES
    return bool(left_values and right_values and left_values.isdisjoint(right_values))


def find_duplicate_memory(
    candidate: dict[str, Any],
    embedding: list[float],
    existing_engrams: list[dict[str, Any]],
    vector_for: Callable[[str], list[float]],
    embedding_threshold: float,
) -> dict[str, Any] | None:
    best: tuple[float, dict[str, Any]] | None = None
    for engram in existing_engrams:
        if engram["type"] != candidate["type"]:
            continue
        if candidate["type"] == "goal" and conflicting_temporal_values(
            candidate["content"], engram["content"]
        ):
            continue
        vector = vector_for(engram["id"])
        embedding_similarity = cosine(vector, embedding) if vector else 0.0
        lexical = lexical_similarity(candidate["content"], engram["content"])
        structural_bonus = 1.0 if structurally_duplicate(candidate, engram) else 0.0
        score = max(embedding_similarity, lexical + structural_bonus)
        if best is None or score > best[0]:
            best = (score, engram)

    if not best:
        return None
    if best[0] >= 1.0 or best[0] > embedding_threshold:
        return best[1]
    return None
