from __future__ import annotations

import asyncio

from app.db import Database
import app.llm as llm_module
import app.memory.observer as observer_module
from app.memory.observer import observe_exchange, quote_sources, quote_supported, transcript_window


def build_temp_database(tmp_path, monkeypatch) -> Database:
    database = Database(str(tmp_path / "reverie.db"))
    database.migrate()
    database.reset_demo()
    monkeypatch.setattr(observer_module, "db", database)
    return database


def install_observer_fakes(monkeypatch, candidates: list[dict[str, object]]) -> None:
    async def fake_extract(transcript: str, session_id: str | None = None):
        return candidates

    async def fake_embed(text: str, session_id: str | None = None):
        return llm_module.mock_embedding(text, observer_module.settings.embed_dim)

    monkeypatch.setattr(observer_module.llm_client, "extract_engrams", fake_extract)
    monkeypatch.setattr(observer_module.llm_client, "embed", fake_embed)


def candidate(
    *,
    content: str = "Prefers concrete examples before abstract rules.",
    quote: str,
    kind: str = "preference",
) -> dict[str, object]:
    return {
        "type": kind,
        "content": content,
        "subject_tags": ["examples"],
        "confidence": 0.82,
        "importance": 0.76,
        "source_quotes": [quote],
    }


def test_transcript_window_uses_last_six_utterances() -> None:
    utterances = [
        {"id": f"utt_{index}", "role": "student", "content": f"message {index}"}
        for index in range(7)
    ]

    transcript = transcript_window(utterances)

    assert "message 0" not in transcript
    assert transcript.splitlines()[0] == "STUDENT: message 1"
    assert transcript.splitlines()[-1] == "STUDENT: message 6"


def test_quote_supported_accepts_exact_or_close_quote_only() -> None:
    assert quote_supported(
        "I need an example first.",
        "STUDENT: I need an example first.",
    )
    assert quote_supported(
        "I need an example frst.",
        "I need an example first.",
    )
    assert not quote_supported(
        "I am confident about tax settings now.",
        "STUDENT: I still think webhook retries are automatic.",
    )


def test_quote_sources_prefers_exact_match_then_best_fuzzy_source() -> None:
    utterances = [
        {
            "id": "utt_example",
            "role": "student",
            "content": "Could we do an example first?",
        },
        {
            "id": "utt_retry",
            "role": "student",
            "content": "Set Retry failed order sync to Enabled.",
        },
    ]

    assert quote_sources("example first", utterances) == ["utt_example"]
    assert quote_sources(
        "Set Retry failed order sync to Enabled.",
        utterances,
    ) == ["utt_retry"]
    assert quote_sources("anything", []) == []


def test_observer_rejects_trivial_hello_quote(tmp_path, monkeypatch) -> None:
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("hello")
    database.insert_utterance(session["id"], "student", "Hello.")
    database.insert_utterance(session["id"], "tutor", "Hello! How can I help you today?")
    install_observer_fakes(
        monkeypatch,
        [
            candidate(
                content="Prefers receiving exact settings one at a time.",
                quote="Hello.",
            )
        ],
    )

    asyncio.run(observe_exchange(session["id"]))

    assert database.all_engrams() == []
    assert database.events_after() == []


def test_observer_rejects_quotes_only_anchored_in_older_window(tmp_path, monkeypatch) -> None:
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("stale anchor")
    database.insert_utterance(
        session["id"],
        "student",
        "I need concrete examples before abstract rules.",
    )
    database.insert_utterance(session["id"], "tutor", "We can use examples first.")
    database.insert_utterance(session["id"], "student", "Hello again with enough context words.")
    database.insert_utterance(session["id"], "tutor", "Hello. What should we work on now?")
    install_observer_fakes(
        monkeypatch,
        [candidate(quote="concrete examples before abstract rules")],
    )

    asyncio.run(observe_exchange(session["id"]))

    assert database.all_engrams() == []
    assert database.events_after() == []


def test_observer_dedupes_near_identical_candidates_in_one_pass(tmp_path, monkeypatch) -> None:
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("candidate dedupe")
    database.insert_utterance(
        session["id"],
        "student",
        "I need concrete examples before abstract rules today.",
    )
    database.insert_utterance(session["id"], "tutor", "We can do concrete examples first.")
    install_observer_fakes(
        monkeypatch,
        [
            candidate(quote="concrete examples before abstract rules"),
            candidate(
                content="Likes concrete examples before abstract rules.",
                quote="concrete examples before abstract rules",
            ),
        ],
    )

    asyncio.run(observe_exchange(session["id"]))

    events = database.events_after()
    assert len(database.all_engrams()) == 1
    assert [event["event_type"] for event in events] == ["engram.observed"]


def test_observer_reinforces_same_existing_engram_once_per_pass(tmp_path, monkeypatch) -> None:
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("reinforce once")
    seed = database.insert_utterance(
        session["id"],
        "student",
        "I need concrete examples before abstract rules.",
    )
    existing = database.insert_engram(
        {
            "type": "preference",
            "content": "Prefers concrete support with exact values and no links.",
            "subject_tags": ["examples"],
            "confidence": 0.8,
            "importance": 0.76,
        },
        [seed["id"]],
        llm_module.mock_embedding("existing preference", observer_module.settings.embed_dim),
        provisional=False,
    )
    database.insert_utterance(
        session["id"],
        "student",
        "I need concrete examples before abstract rules and a short checklist with exact values.",
    )
    database.insert_utterance(session["id"], "tutor", "We can do both in order.")
    install_observer_fakes(
        monkeypatch,
        [
            candidate(quote="concrete examples before abstract rules"),
            candidate(
                content="Prefers a short checklist with exact values.",
                quote="short checklist with exact values",
            ),
        ],
    )

    def fake_nearest(candidate_data, embedding):
        return existing

    monkeypatch.setattr(observer_module, "nearest_duplicate", fake_nearest)

    asyncio.run(observe_exchange(session["id"]))

    events = database.events_after()
    assert [event["event_type"] for event in events] == ["engram.reinforced"]
    assert database.all_engrams()[0]["access_count"] == 1


def test_observer_creates_legitimate_current_substantive_candidate(
    tmp_path, monkeypatch
) -> None:
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("happy path")
    utterance = database.insert_utterance(
        session["id"],
        "student",
        "I need concrete examples before abstract rules today.",
    )
    database.insert_utterance(session["id"], "tutor", "We can start with an example.")
    install_observer_fakes(
        monkeypatch,
        [candidate(quote="concrete examples before abstract rules")],
    )

    asyncio.run(observe_exchange(session["id"]))

    events = database.events_after()
    engrams = database.all_engrams()
    assert [event["event_type"] for event in events] == ["engram.observed"]
    assert len(engrams) == 1
    assert [item["id"] for item in database.engram_detail(engrams[0]["id"])["provenance"]] == [
        utterance["id"]
    ]
