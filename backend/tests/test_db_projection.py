from __future__ import annotations

import asyncio

from app.db import Database


def test_event_projection_preserves_payload_and_provenance(tmp_path) -> None:
    database = Database(str(tmp_path / "reverie.db"))
    database.migrate()
    session = database.create_session("projection sanity")
    utterance = database.insert_utterance(
        session["id"],
        "student",
        "I need an example first.",
    )
    engram = database.insert_engram(
        {
            "type": "preference",
            "content": "Learns chain rule best from a worked example first.",
            "subject_tags": ["chain rule", "worked_examples"],
            "confidence": 0.88,
            "importance": 0.78,
        },
        [utterance["id"]],
        [0.1, 0.2, 0.3],
        provisional=True,
    )

    event = asyncio.run(
        database.append_event(
            "engram.observed",
            engram["id"],
            {"source_quotes": ["example first"], "toast": "Noticed a preference."},
            session_id=session["id"],
        )
    )

    events = database.events_after()
    detail = database.engram_detail(engram["id"])

    assert events == [
        {
            "id": event["id"],
            "engram_id": engram["id"],
            "event_type": "engram.observed",
            "payload_json": {
                "source_quotes": ["example first"],
                "toast": "Noticed a preference.",
            },
            "session_id": session["id"],
            "created_at": event["created_at"],
        }
    ]
    assert detail is not None
    assert detail["engram"]["subject_tags"] == ["chain rule", "worked_examples"]
    assert detail["engram"]["provisional"] is True
    assert [item["id"] for item in detail["provenance"]] == [utterance["id"]]
    assert detail["events"][0]["payload_json"]["source_quotes"] == ["example first"]
