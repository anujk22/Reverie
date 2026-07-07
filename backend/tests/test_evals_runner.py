from __future__ import annotations

import asyncio

from app.db import Database
from app.evals import runner
from app.llm import mock_tutor_reply


def test_score_recall_probes_counts_expected_and_absent_tags() -> None:
    pack = {
        "winners": [
            {"subject_tags": ["webhook_retries", "step_by_step"]},
            {"subject_tags": ["frustration"]},
        ]
    }
    probes = [
        {
            "expected_tags": ["webhook_retries", "step_by_step"],
            "absent_tags": ["shipping_zones"],
        }
    ]

    assert runner.score_recall_probes(pack, probes) == 1.0


def test_forgetting_passed_fails_when_stale_shipping_zone_resurfaces() -> None:
    spec = {
        "absent_tags": ["shipping_zones"],
        "absent_phrases": ["shipping zone", "shipping-zone"],
    }
    clean_pack = {"winners": [{"content": "Exact step preference", "subject_tags": ["step_by_step"]}]}
    stale_pack = {"winners": [{"content": "Asked about a shipping-zone mapping", "subject_tags": ["shipping_zones"]}]}

    assert runner.forgetting_passed([clean_pack], spec)
    assert not runner.forgetting_passed([stale_pack], spec)


def test_eval_run_uses_isolated_condition_databases(tmp_path, monkeypatch) -> None:
    main_database = Database(str(tmp_path / "main.db"))
    main_database.migrate()
    main_database.reset_demo()
    monkeypatch.setattr(runner, "MAIN_DB", main_database)
    monkeypatch.setattr(runner, "RUNS_DIR", tmp_path / "eval_runs")
    monkeypatch.setattr(runner, "RESULTS_PATH", tmp_path / "latest.json")

    results = asyncio.run(runner.run_eval_suite())

    assert results["real_run"] is False
    assert results["forgetting_check"] == "pass"
    assert main_database.list_sessions() == []
    assert sorted(path.name for path in (tmp_path / "eval_runs").glob("run_*/*.db")) == [
        "full_history.db",
        "no_memory.db",
        "reverie.db",
    ]


def test_mock_returning_opening_uses_misconception_and_affect() -> None:
    memory_pack = [
        {
            "type": "misconception",
            "content": "Believes failed order-sync webhooks retry automatically, but the platform requires retry failed order sync to be enabled.",
        },
        {
            "type": "affect",
            "content": "Felt frustrated after a failed order sync; open next time with a low-pressure checklist.",
        },
    ]

    for _ in range(3):
        reply = mock_tutor_reply(
            "I have 20 minutes before going live. What is the smallest check first?", memory_pack, 120
        )
        assert "webhook retries" in reply.lower()
        assert "low-pressure" in reply.lower()
