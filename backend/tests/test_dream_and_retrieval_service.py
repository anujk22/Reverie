from __future__ import annotations

import asyncio
import json
from pathlib import Path

from app.db import Database
import app.llm as llm_module
import app.memory.observer as observer_module
from app.memory.observer import observe_exchange
import app.memory.dream as dream_module
import app.memory.retrieval_service as retrieval_service


def build_temp_database(tmp_path, monkeypatch) -> Database:
    database = Database(str(tmp_path / "reverie.db"))
    database.migrate()
    database.reset_demo()
    monkeypatch.setattr(llm_module, "db", database)
    monkeypatch.setattr(observer_module, "db", database)
    monkeypatch.setattr(dream_module, "db", database)
    monkeypatch.setattr(retrieval_service, "db", database)
    return database


def test_dream_merges_duplicate_and_supersedes_contradiction(tmp_path, monkeypatch):
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("dream acceptance")
    utterance = database.insert_utterance(
        session["id"],
        "student",
        "I used to think webhook retries were automatic, but now I know Retry failed order sync must be Enabled.",
    )

    async def run():
        duplicate_content = "Prefers exact step-by-step instructions with real values."
        duplicate_embedding = await llm_module.llm_client.embed(
            duplicate_content, session["id"]
        )
        database.insert_engram(
            {
                "type": "preference",
                "content": duplicate_content,
                "subject_tags": ["step_by_step", "real_values"],
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
                "subject_tags": ["step_by_step", "real_values"],
                "confidence": 0.82,
                "importance": 0.75,
            },
            [utterance["id"]],
            duplicate_embedding,
            provisional=False,
        )

        misconception = "Believes failed order-sync webhooks retry automatically."
        database.insert_engram(
            {
                "type": "misconception",
                "content": misconception,
                "subject_tags": ["webhook_retries", "order_sync"],
                "confidence": 0.78,
                "importance": 0.95,
            },
            [utterance["id"]],
            await llm_module.llm_client.embed(misconception, session["id"]),
            provisional=False,
        )
        mastery = "Correctly checks that webhook retries are enabled before launch."
        mastery_engram = database.insert_engram(
            {
                "type": "mastery",
                "content": mastery,
                "subject_tags": ["webhook_retries", "launch"],
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
        "I have a sale date and need exact values before documentation.",
    )

    async def seed_and_retrieve():
        items = [
            {
                "type": "goal",
                "content": "Is trying to finish her store migration before the sale date.",
                "subject_tags": ["launch", "sale_date", "store_migration"],
                "confidence": 0.8,
                "importance": 0.9,
            },
            {
                "type": "preference",
                "content": "Prefers exact step-by-step instructions with real values.",
                "subject_tags": ["step_by_step", "real_values"],
                "confidence": 0.88,
                "importance": 0.78,
            },
            {
                "type": "misconception",
                "content": "Believes failed order-sync webhooks retry automatically.",
                "subject_tags": ["webhook_retries", "order_sync"],
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
            "Start the next store migration support session from Lena's goals.",
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
        "Felt frustrated after a failed order sync; open next time with a low-pressure checklist."
    )
    assert "frustration" in affect[0]["subject_tags"]


def test_session_level_dream_does_not_duplicate_existing_affect(tmp_path, monkeypatch):
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("affect duplicate guard")
    utterance = database.insert_utterance(
        session["id"],
        "student",
        "The failed order sync made me frustrated before the sale date.",
    )

    async def run():
        content = "Felt frustrated after a failed order sync; open next time with a low-pressure checklist."
        database.insert_engram(
            {
                "type": "affect",
                "content": content,
                "subject_tags": ["failed_order_sync", "frustration"],
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
        "I now know Retry failed order sync must be Enabled.",
    )

    async def run():
        misconception = "Believes failed order-sync webhooks retry automatically."
        database.insert_engram(
            {
                "type": "misconception",
                "content": misconception,
                "subject_tags": ["webhook_retries", "order_sync"],
                "confidence": 0.99,
                "importance": 0.95,
            },
            [utterance["id"]],
            await llm_module.llm_client.embed(misconception, session["id"]),
            provisional=False,
        )
        mastery = "Correctly checks that webhook retries are enabled before launch."
        mastery_engram = database.insert_engram(
            {
                "type": "mastery",
                "content": mastery,
                "subject_tags": ["webhook_retries", "launch"],
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


def test_distill_revise_updates_provisional_memory(tmp_path, monkeypatch):
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("revise verdict")
    utterance = database.insert_utterance(
        session["id"],
        "student",
        "I like concrete examples before abstract grammar tables.",
    )

    async def fake_distill(engram, quotes, session_id=None):
        return {
            "verdict": "revise",
            "content": "Prefers concrete examples before abstract rules.",
            "confidence": 0.91,
            "reason": "The quote supports a tighter preference.",
        }

    monkeypatch.setattr(dream_module.llm_client, "distill_engram", fake_distill)

    async def run():
        memory = "Likes examples before rules."
        engram = database.insert_engram(
            {
                "type": "preference",
                "content": memory,
                "subject_tags": ["examples"],
                "confidence": 0.72,
                "importance": 0.75,
            },
            [utterance["id"]],
            await llm_module.llm_client.embed(memory, session["id"]),
            provisional=True,
        )
        await database.append_event(
            "engram.observed",
            engram["id"],
            {"provisional": True},
            session_id=session["id"],
        )
        return await dream_module.run_dream(session["id"])

    report = asyncio.run(run())
    nodes = database.graph()["nodes"]

    assert report["stats"]["distill"]["revised"] == 1
    assert any(
        node["content"] == "Prefers concrete examples before abstract rules."
        and not node["provisional"]
        and node["confidence"] == 0.91
        for node in nodes
    )


def test_deduplicate_distinct_verdict_does_not_merge(tmp_path, monkeypatch):
    database = build_temp_database(tmp_path, monkeypatch)
    session = database.create_session("distinct verdict")
    utterance = database.insert_utterance(
        session["id"],
        "student",
        "Examples help, and pacing matters too.",
    )

    async def fake_judge(left, right, session_id=None, relation="dedupe"):
        return {"verdict": "distinct", "reason": "The memories can coexist."}

    monkeypatch.setattr(dream_module.llm_client, "judge_pair", fake_judge)

    async def run():
        content = "Prefers examples before abstract rules."
        embedding = await llm_module.llm_client.embed(content, session["id"])
        for importance in (0.75, 0.8):
            database.insert_engram(
                {
                    "type": "preference",
                    "content": content,
                    "subject_tags": ["examples"],
                    "confidence": 0.8,
                    "importance": importance,
                },
                [utterance["id"]],
                embedding,
                provisional=False,
            )
        return await dream_module.run_dream(session["id"])

    report = asyncio.run(run())
    nodes = database.graph()["nodes"]

    assert report["stats"]["deduplicate"]["judged_distinct"] == 1
    assert report["stats"]["deduplicate"]["merged"] == 0
    assert len([node for node in nodes if node["status"] == "active"]) == 2
