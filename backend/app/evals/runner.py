from __future__ import annotations

import json
from pathlib import Path
import time
from typing import Any

from app.config import settings
from app.db import db
from app.llm import llm_client


RESULTS_PATH = Path(__file__).resolve().parent / "results" / "latest.json"


def _observed_llm_tokens() -> dict[str, int]:
    with db.connection() as conn:
        return {
            row["purpose"]: row["tokens"]
            for row in conn.execute(
                "SELECT purpose, SUM(prompt_tokens + completion_tokens) AS tokens FROM llm_calls GROUP BY purpose"
            )
        }


def run_eval_suite() -> dict[str, Any]:
    # Fable ruling 2026-07-04: fabricated eval numbers are prohibited.
    # Until live Qwen credentials exist, this endpoint returns an honest unavailable state.
    started = time.time()
    results = {
        "generated_at": int(started),
        "mode": "unavailable",
        "real_run": False,
        "message": "No live DashScope-backed eval run has completed. Synthetic eval numbers are prohibited.",
        "conditions": [],
        "personalization": [],
        "recall_precision": [],
        "tokens": [],
        "headline": "",
        "forgetting_check": "not_run",
    }
    results["observed_llm_tokens"] = _observed_llm_tokens()
    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_PATH.write_text(json.dumps(results, indent=2))
    return results


def latest_results() -> dict[str, Any]:
    if RESULTS_PATH.exists():
        results = json.loads(RESULTS_PATH.read_text())
        results.setdefault("observed_llm_tokens", _observed_llm_tokens())
        return results
    return run_eval_suite()


async def run_smoke_eval() -> dict[str, Any]:
    truth = json.loads(
        (Path(__file__).resolve().parent / "scripts" / "truth.json").read_text()
    )
    opening = (
        "Last time, f(g(x)) was tempting to treat like a product. "
        "Let's start with one worked example before the abstract rule."
    )
    result = await llm_client.score_personalization(
        json.dumps(truth, sort_keys=True),
        opening,
    )
    with db.connection() as conn:
        calls = [
            dict(row)
            for row in conn.execute(
                """
                SELECT purpose, model, prompt_tokens, completion_tokens, latency_ms, error
                FROM llm_calls
                WHERE purpose = 'eval_judge'
                ORDER BY created_at DESC
                LIMIT 1
                """
            )
        ]
    return {
        "mode": "live" if settings.live_llm_enabled else "mock",
        "real_run": bool(result.get("real_run")),
        "condition": "reverie_smoke",
        "sessions": 1,
        "score": result["score"],
        "reason": result["reason"],
        "llm_call": calls[0] if calls else None,
    }
