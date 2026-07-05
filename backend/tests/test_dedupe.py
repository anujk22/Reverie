from __future__ import annotations

from app.memory.dedupe import find_duplicate_memory, structurally_duplicate


def test_structural_duplicate_is_subject_agnostic() -> None:
    existing = {
        "id": "eng_existing",
        "type": "preference",
        "content": (
            "Learns Spanish conjugation best from concrete example sentences "
            "before abstract grammar tables."
        ),
        "subject_tags": ["spanish_conjugation", "worked_examples"],
    }
    candidate = {
        "type": "preference",
        "content": (
            "Prefers learning conjugations through concrete examples before "
            "abstract grammar rules."
        ),
        "subject_tags": ["spanish_conjugation", "examples"],
    }

    assert structurally_duplicate(candidate, existing)


def test_structural_duplicate_keeps_distinct_same_subject_memory() -> None:
    existing = {
        "id": "eng_existing",
        "type": "misconception",
        "content": "Confuses preterite endings with imperfect endings in past-tense narration.",
        "subject_tags": ["spanish_conjugation", "past_tense"],
    }
    candidate = {
        "type": "misconception",
        "content": "Treats irregular present-tense verb forms as if they follow regular endings.",
        "subject_tags": ["spanish_conjugation", "present_tense"],
    }

    assert not structurally_duplicate(candidate, existing)


def test_find_duplicate_memory_accepts_structural_match_without_embedding_match() -> None:
    existing = {
        "id": "eng_existing",
        "type": "affect",
        "content": (
            "Experiences anxiety-induced freezing when anticipating oral vocabulary quizzes."
        ),
        "subject_tags": ["quiz_anxiety"],
    }
    candidate = {
        "type": "affect",
        "content": "Freezes anxiously when expecting vocabulary quiz questions.",
        "subject_tags": ["quiz_anxiety"],
    }

    duplicate = find_duplicate_memory(
        candidate,
        [1.0, 0.0],
        [existing],
        lambda _engram_id: [0.0, 1.0],
        embedding_threshold=0.92,
    )

    assert duplicate == existing
