from __future__ import annotations

import asyncio

from app.db import Database
from app.evals import runner
from app.llm import mock_tutor_reply


def test_score_recall_probes_counts_expected_and_absent_tags() -> None:
    pack = {
        "winners": [
            {"subject_tags": ["chain_rule", "worked_examples"]},
            {"subject_tags": ["exam_anxiety"]},
        ]
    }
    probes = [
        {
            "expected_tags": ["chain_rule", "worked_examples"],
            "absent_tags": ["limits"],
        }
    ]

    assert runner.score_recall_probes(pack, probes) == 1.0


def test_forgetting_passed_fails_when_stale_limits_resurfaces() -> None:
    clean_pack = {"winners": [{"content": "Example preference", "subject_tags": ["worked_examples"]}]}
    stale_pack = {"winners": [{"content": "Studying limits for a quiz", "subject_tags": ["limits"]}]}

    assert runner.forgetting_passed([clean_pack])
    assert not runner.forgetting_passed([stale_pack])


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
            "content": "Differentiates f(g(x)) as f'(x) times g'(x), applying the product rule pattern to compositions.",
        },
        {
            "type": "affect",
            "content": "Anxiety rises around exam language; respond by concretizing the next step.",
        },
    ]

    for _ in range(3):
        reply = mock_tutor_reply(
            "Okay, I have 20 minutes tonight. Where were we?", memory_pack, 120
        )
        assert "product" in reply.lower()
        assert "low-pressure" in reply.lower()
