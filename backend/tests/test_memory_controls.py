import asyncio

import app.routes.memory as memory_routes
from app.db import Database
from app.models import CorrectEngramRequest


def build_database(tmp_path) -> Database:
    database = Database(str(tmp_path / "memory-controls.db"))
    database.migrate()
    database.reset_demo()
    return database


def test_explicit_correction_supersedes_with_direct_provenance(tmp_path, monkeypatch) -> None:
    database = build_database(tmp_path)
    monkeypatch.setattr(memory_routes, "db", database)
    session = database.create_session("correction")
    source = database.insert_utterance(
        session["id"], "student", "Webhook retries happen automatically."
    )
    original = database.insert_engram(
        {
            "type": "misconception",
            "content": "Webhook retries happen automatically.",
            "subject_tags": ["webhook_retries"],
            "confidence": 0.8,
            "importance": 0.9,
        },
        [source["id"]],
        [1.0, 0.0],
        provisional=False,
    )

    async def embed(*_args, **_kwargs):
        return [0.9, 0.1]

    monkeypatch.setattr(memory_routes.llm_client, "embed", embed)
    corrected_content = "Webhook retries require Retry failed order sync to be Enabled."
    result = asyncio.run(
        memory_routes.correct_engram(
            original["id"],
            CorrectEngramRequest(session_id=session["id"], content=corrected_content),
        )
    )

    previous = database.engram_detail(original["id"])["engram"]
    successor = database.engram_detail(result["engram"]["id"])
    assert previous["status"] == "superseded"
    assert previous["superseded_by"] == successor["engram"]["id"]
    assert successor["engram"]["status"] == "active"
    assert successor["engram"]["provisional"] is False
    assert successor["provenance"][0]["content"] == corrected_content
    assert database.vector_for(successor["engram"]["id"]) == [0.9, 0.1]
    assert database.graph()["links"] == [
        {
            "source": original["id"],
            "target": successor["engram"]["id"],
            "type": "supersedes",
        }
    ]


def test_graph_derives_shared_context_links_from_real_tags(tmp_path) -> None:
    database = build_database(tmp_path)
    session = database.create_session("shared context")
    source = database.insert_utterance(session["id"], "student", "Shared source")
    left = database.insert_engram(
        {
            "type": "misconception",
            "content": "Webhook retries are not automatic.",
            "subject_tags": ["webhook_retries", "order_sync"],
            "confidence": 0.9,
            "importance": 0.9,
        },
        [source["id"]],
        [1.0, 0.0],
        provisional=False,
    )
    right = database.insert_engram(
        {
            "type": "strategy_outcome",
            "content": "Enabling webhook retries resolved the order sync.",
            "subject_tags": ["webhook_retries", "launch"],
            "confidence": 0.9,
            "importance": 0.8,
        },
        [source["id"]],
        [0.9, 0.1],
        provisional=False,
    )

    assert database.graph()["links"] == [
        {
            "source": left["id"],
            "target": right["id"],
            "type": "shared_context",
            "tags": ["webhook_retries"],
        }
    ]


def test_explicit_forget_removes_memory_vector_and_retrieval_eligibility(
    tmp_path, monkeypatch
) -> None:
    database = build_database(tmp_path)
    monkeypatch.setattr(memory_routes, "db", database)
    session = database.create_session("forget")
    source = database.insert_utterance(session["id"], "student", "Forget this memory.")
    memory = database.insert_engram(
        {
            "type": "fact",
            "content": "This memory should be removed on request.",
            "subject_tags": ["deletion"],
            "confidence": 0.9,
            "importance": 0.5,
        },
        [source["id"]],
        [1.0, 0.0],
        provisional=False,
    )
    asyncio.run(
        database.append_event(
            "engram.observed", memory["id"], session_id=session["id"]
        )
    )

    result = asyncio.run(memory_routes.delete_engram(memory["id"], session["id"]))

    assert result == {"ok": True, "deleted_engram_id": memory["id"]}
    assert database.engram_detail(memory["id"]) is None
    assert database.vector_for(memory["id"]) == []
    assert all(item["id"] != memory["id"] for item in database.active_engrams())
    events = database.events_after()
    assert len(events) == 1
    assert events[0]["event_type"] == "engram.deleted"
    assert events[0]["engram_id"] is None
    assert events[0]["payload_json"]["deleted_engram_id"] == memory["id"]


def test_forgetting_a_correction_removes_its_superseded_lineage(tmp_path, monkeypatch) -> None:
    database = build_database(tmp_path)
    monkeypatch.setattr(memory_routes, "db", database)
    session = database.create_session("forget corrected lineage")
    source = database.insert_utterance(session["id"], "student", "Old statement")
    original = database.insert_engram(
        {
            "type": "fact",
            "content": "The launch is scheduled for Monday morning.",
            "subject_tags": ["launch"],
            "confidence": 0.8,
            "importance": 0.7,
        },
        [source["id"]],
        [1.0, 0.0],
        provisional=False,
    )
    correction_source = database.insert_utterance(
        session["id"], "student", "The launch moved to Tuesday morning."
    )
    corrected = database.correct_engram(
        original["id"],
        "The launch moved to Tuesday morning.",
        correction_source["id"],
        [0.9, 0.1],
    )
    assert corrected is not None
    successor = corrected[1]

    database.delete_engram(successor["id"])

    assert database.engram_detail(successor["id"]) is None
    assert database.engram_detail(original["id"]) is None
    assert database.graph() == {"nodes": [], "links": []}
