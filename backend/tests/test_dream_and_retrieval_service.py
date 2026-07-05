from __future__ import annotations

import asyncio
import json
from pathlib import Path

from app.db import Database
import app.llm as llm_module
from app.memory.observer import observe_exchange
import app.memory.dream as dream_module
import app.memory.retrieval_service as retrieval_service


def build_temp_database(tmp_path, monkeypatch) -> Database:
    database = Database(str(tmp_path / "reverie.db"))
    database.migrate()
    database.reset_demo()
    monkeypatch.setattr(llm_module, "db", database)
    monkeypatch.setattr(dream_module, "db", database)
    monkeypatch.setattr(retrieval_service, "db", database)
    return database


def test_dream_merges_duplicate_and_supersedes_contradiction(tmp_path, monkeypatch):
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("dream acceptance")
    utterance = database.insert_utterance(
        session["id"],
        "student",
        "I used to treat composites like a product, but now I know outer derivative times inner derivative.",
    )

    async def run():
        duplicate_content = (
            "Learns chain rule best from a worked example before an abstract rule."
        )
        duplicate_embedding = await llm_module.llm_client.embed(
            duplicate_content, session["id"]
        )
        database.insert_engram(
            {
                "type": "preference",
                "content": duplicate_content,
                "subject_tags": ["worked_examples"],
                "confidence": 0.8,
                "importance": 0.75,
            },
            [utterance["id"]],
            duplicate_embedding,
            provisional=False,
        )
        database.insert_engram(
            {
                "type": "preference",
                "content": duplicate_content,
                "subject_tags": ["worked_examples"],
                "confidence": 0.82,
                "importance": 0.75,
            },
            [utterance["id"]],
            duplicate_embedding,
            provisional=False,
        )

        misconception = "Applies product rule reasoning to composite functions."
        database.insert_engram(
            {
                "type": "misconception",
                "content": misconception,
                "subject_tags": ["chain_rule", "composite_functions"],
                "confidence": 0.78,
                "importance": 0.95,
            },
            [utterance["id"]],
            await llm_module.llm_client.embed(misconception, session["id"]),
            provisional=False,
        )
        mastery = "Correctly explains chain rule as outside derivative times inner derivative."
        mastery_engram = database.insert_engram(
            {
                "type": "mastery",
                "content": mastery,
                "subject_tags": ["chain_rule", "composite_functions"],
                "confidence": 0.84,
                "importance": 0.84,
            },
            [utterance["id"]],
            await llm_module.llm_client.embed(mastery, session["id"]),
            provisional=True,
        )
        await database.append_event(
            "engram.observed",
            mastery_engram["id"],
            {"provisional": True},
            session_id=session["id"],
        )
        return await dream_module.run_dream(session["id"])

    report = asyncio.run(run())
    nodes = database.graph()["nodes"]

    assert report["stats"]["deduplicate"]["merged"] >= 1
    assert report["stats"]["reconcile"]["superseded"] >= 1
    assert any(
        node["type"] == "misconception" and node["status"] == "superseded"
        for node in nodes
    )
    assert any(node["type"] == "mastery" and node["status"] == "active" for node in nodes)


def test_session_open_retrieval_includes_goal_and_preference(tmp_path, monkeypatch):
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("retrieval acceptance")
    utterance = database.insert_utterance(
        session["id"],
        "student",
        "I have a midterm and need examples before rules.",
    )

    async def seed_and_retrieve():
        items = [
            {
                "type": "goal",
                "content": "Is preparing for a differentiation midterm covering chain rule.",
                "subject_tags": ["midterm", "differentiation"],
                "confidence": 0.8,
                "importance": 0.9,
            },
            {
                "type": "preference",
                "content": "Learns chain rule best from a worked example before an abstract rule.",
                "subject_tags": ["worked_examples"],
                "confidence": 0.88,
                "importance": 0.78,
            },
            {
                "type": "misconception",
                "content": "Differentiates f(g(x)) as f prime x times g prime x.",
                "subject_tags": ["chain_rule", "composite_functions"],
                "confidence": 0.78,
                "importance": 0.95,
            },
        ]
        for item in items:
            database.insert_engram(
                item,
                [utterance["id"]],
                await llm_module.llm_client.embed(item["content"], session["id"]),
                provisional=False,
            )
        return await retrieval_service.assemble_memory_pack(
            "Start the next chain rule session from Maya goals.",
            session["id"],
            phase="session_open",
        )

    pack = asyncio.run(seed_and_retrieve())
    winner_types = {item["type"] for item in pack["winners"]}

    assert "goal" in winner_types
    assert "preference" in winner_types
    assert any("confidence" in item and "strength" in item for item in pack["winners"])


def test_session_level_dream_recovers_affect_from_session1_script(tmp_path, monkeypatch):
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("session1 affect recovery")
    script_path = (
        Path(__file__).resolve().parents[1]
        / "app"
        / "evals"
        / "scripts"
        / "session1.json"
    )
    script = json.loads(script_path.read_text())

    async def run():
        for turn in script["turns"]:
            database.insert_utterance(session["id"], "student", turn["student"])
            database.insert_utterance(session["id"], "tutor", "Let's make it concrete.")
        await observe_exchange(session["id"])
        assert not [node for node in database.graph()["nodes"] if node["type"] == "affect"]
        return await dream_module.run_dream(session["id"])

    report = asyncio.run(run())
    nodes = database.graph()["nodes"]
    affect = [node for node in nodes if node["type"] == "affect"]

    assert report["stats"]["distill"]["confirmed"] >= 1
    assert affect
    assert affect[0]["content"] == (
        "Anxiety rises around exam language; respond by concretizing the next step."
    )
    assert "exam_anxiety" in affect[0]["subject_tags"]


def test_session_level_dream_does_not_duplicate_existing_affect(tmp_path, monkeypatch):
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("affect duplicate guard")
    utterance = database.insert_utterance(
        session["id"],
        "student",
        "My differentiation midterm makes me anxious about chain rule.",
    )

    async def run():
        content = "Anxiety rises around exam language; respond by concretizing the next step."
        database.insert_engram(
            {
                "type": "affect",
                "content": content,
                "subject_tags": ["exam_anxiety"],
                "confidence": 0.9,
                "importance": 0.7,
            },
            [utterance["id"]],
            await llm_module.llm_client.embed(content, session["id"]),
            provisional=False,
        )
        return await dream_module.run_dream(session["id"])

    report = asyncio.run(run())
    affect = [node for node in database.graph()["nodes"] if node["type"] == "affect"]

    assert len(affect) == 1
    assert report["stats"]["distill"]["confirmed"] == 0


def test_newer_mastery_supersedes_older_misconception(tmp_path, monkeypatch):
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("contradiction winner")
    utterance = database.insert_utterance(
        session["id"],
        "student",
        "I now know outer derivative times inner derivative.",
    )

    async def run():
        misconception = "Applies product rule reasoning to composite functions."
        database.insert_engram(
            {
                "type": "misconception",
                "content": misconception,
                "subject_tags": ["chain_rule", "composite_functions"],
                "confidence": 0.99,
                "importance": 0.95,
            },
            [utterance["id"]],
            await llm_module.llm_client.embed(misconception, session["id"]),
            provisional=False,
        )
        mastery = "Correctly explains chain rule as outside derivative times inner derivative."
        mastery_engram = database.insert_engram(
            {
                "type": "mastery",
                "content": mastery,
                "subject_tags": ["chain_rule", "composite_functions"],
                "confidence": 0.7,
                "importance": 0.84,
            },
            [utterance["id"]],
            await llm_module.llm_client.embed(mastery, session["id"]),
            provisional=True,
        )
        await database.append_event(
            "engram.observed",
            mastery_engram["id"],
            {"provisional": True},
            session_id=session["id"],
        )
        return await dream_module.run_dream(session["id"])

    report = asyncio.run(run())
    nodes = database.graph()["nodes"]

    assert report["stats"]["reconcile"]["superseded"] == 1
    assert any(
        node["type"] == "misconception" and node["status"] == "superseded"
        for node in nodes
    )
    assert any(node["type"] == "mastery" and node["status"] == "active" for node in nodes)
