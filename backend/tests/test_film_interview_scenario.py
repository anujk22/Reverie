import asyncio

from app.db import Database
from app.llm import mock_extract, mock_tutor_reply
import app.llm as llm_module
import app.memory.dream as dream_module
import app.memory.observer as observer_module
import app.memory.retrieval_service as retrieval_service
from app.memory.dream import choose_newer_version
from app.memory.dedupe import find_duplicate_memory, structurally_duplicate
from app.memory.observer import observe_exchange
from app.subject import FILM_SESSION_SCRIPTS, subject_reference_for


def test_film_turns_extract_typed_interview_memories_with_exact_quotes() -> None:
    first = FILM_SESSION_SCRIPTS["film1"]["turns"][0]["student"]
    second = FILM_SESSION_SCRIPTS["film1"]["turns"][1]["student"]

    first_memories = mock_extract(f"STUDENT: {first}")
    second_memories = mock_extract(f"STUDENT: {second}")

    assert {item["type"] for item in first_memories} == {
        "misconception",
        "goal",
        "affect",
    }
    assert {item["type"] for item in second_memories} == {
        "goal",
        "mastery",
        "preference",
    }
    for memory in [*first_memories, *second_memories]:
        assert all(quote in first or quote in second for quote in memory["source_quotes"])


def test_film_recall_uses_interview_memory_without_commerce_copy() -> None:
    prompt = FILM_SESSION_SCRIPTS["film2"]["turns"][0]["student"]
    memory_pack = [
        {
            "type": "preference",
            "content": "For final interview preparation, prefers one question at a time and direct feedback.",
        },
        {
            "type": "misconception",
            "content": "Believes explaining every technical detail is necessary to sound credible in an interview.",
        },
    ]

    reply = mock_tutor_reply(prompt, memory_pack, 120)

    assert "one impact story" in reply
    assert "technical walkthrough" in reply
    assert "order" not in reply.lower()
    assert "webhook" not in reply.lower()


def test_interview_reference_is_scoped_and_does_not_invent_a_role() -> None:
    reference = subject_reference_for("I have 20 minutes before the interview.")

    assert "impact-first answers" in reference
    assert "Never invent a\ncompany, role, or interview detail" in reference
    assert "Retry failed order sync" not in reference


def test_goal_reconciliation_prefers_the_newer_timing() -> None:
    friday = {"created_at": "2026-07-18T10:00:00+00:00"}
    monday = {"created_at": "2026-07-18T10:01:00+00:00"}

    winner, loser = choose_newer_version(friday, monday)

    assert winner is monday
    assert loser is friday


def test_changed_goal_timing_is_not_reinforced_as_a_duplicate() -> None:
    friday = {
        "id": "friday",
        "type": "goal",
        "content": "Is preparing for a final interview on Friday.",
        "subject_tags": ["interview_preparation", "interview_timing"],
    }
    monday = {
        "type": "goal",
        "content": "Is preparing for a final interview on Monday.",
        "subject_tags": ["interview_preparation", "interview_timing"],
    }

    assert not structurally_duplicate(monday, friday)
    assert find_duplicate_memory(monday, [1.0, 0.0], [friday], lambda _: [0.8, 0.6], 0.92) is None


def test_visible_film_scripts_contain_no_commerce_scenario() -> None:
    text = str(FILM_SESSION_SCRIPTS).lower()

    assert "order sync" not in text
    assert "webhook" not in text
    assert "store migration" not in text


def test_film_dream_supersedes_old_strategy_and_friday_goal(tmp_path, monkeypatch) -> None:
    database = Database(str(tmp_path / "reverie.db"))
    database.migrate()
    database.reset_demo()
    monkeypatch.setattr(llm_module, "db", database)
    monkeypatch.setattr(observer_module, "db", database)
    monkeypatch.setattr(dream_module, "db", database)
    monkeypatch.setattr(retrieval_service, "db", database)
    session = database.create_session("Session 1 · interview preparation")

    async def run() -> tuple[dict, dict, str]:
        for turn in FILM_SESSION_SCRIPTS["film1"]["turns"]:
            database.insert_utterance(session["id"], "student", turn["student"])
            database.insert_utterance(session["id"], "tutor", "One question at a time.")
            await observe_exchange(session["id"])
        report = await dream_module.run_dream(session["id"])
        second_session = database.create_session("Session 2 · final interview")
        query = FILM_SESSION_SCRIPTS["film2"]["turns"][0]["student"]
        pack = await retrieval_service.assemble_memory_pack(query, second_session["id"])
        reply = mock_tutor_reply(query, pack["winners"], 120)
        return report, pack, reply

    report, pack, reply = asyncio.run(run())
    nodes = database.graph()["nodes"]

    assert report["stats"]["reconcile"]["superseded"] >= 2
    assert any(
        node["type"] == "misconception" and node["status"] == "superseded"
        for node in nodes
    )
    assert any(
        node["type"] == "goal"
        and "Friday" in node["content"]
        and node["status"] == "superseded"
        for node in nodes
    )
    assert any(
        node["type"] == "goal"
        and "Monday" in node["content"]
        and node["status"] == "active"
        for node in nodes
    )
    assert {item["type"] for item in pack["winners"]} == {
        "goal",
        "mastery",
        "preference",
        "affect",
    }
    assert "one impact story" in reply
