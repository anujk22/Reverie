from __future__ import annotations

from contextlib import contextmanager
from datetime import timedelta
import json
from pathlib import Path
import time
from typing import Any, Iterator

from app import clock
import app.db as db_module
import app.llm as llm_module
import app.memory.dream as dream_module
import app.memory.observer as observer_module
import app.memory.retrieval_service as retrieval_service
from app.config import settings
from app.db import Database
from app.llm import llm_client
from app.memory.observer import observe_exchange
from app.memory.decay import DecayInput, compute_strength
from app.memory.retrieval_service import assemble_memory_pack
from app.subject import SESSION_OPEN_RETRIEVAL_QUERY


BASE_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = BASE_DIR / "scripts"
RESULTS_PATH = BASE_DIR / "results" / "latest.json"
RUNS_DIR = Path(__file__).resolve().parents[2] / "data" / "evals"
REPO_ROOT = Path(__file__).resolve().parents[3]
CONDITIONS = ("no_memory", "full_history", "reverie")
MAIN_DB = db_module.db


def _observed_llm_tokens(database: Database | None = None) -> dict[str, int]:
    target = database or MAIN_DB
    with target.connection() as conn:
        return {
            row["purpose"]: row["tokens"] or 0
            for row in conn.execute(
                "SELECT purpose, SUM(prompt_tokens + completion_tokens) AS tokens "
                "FROM llm_calls GROUP BY purpose"
            )
        }


def _load_scripts() -> list[dict[str, Any]]:
    return [
        json.loads((SCRIPTS_DIR / f"session{index}.json").read_text())
        for index in (1, 2, 3)
    ]


def _truth_sheet() -> str:
    return (SCRIPTS_DIR / "truth.json").read_text()


@contextmanager
def bind_database(database: Database) -> Iterator[None]:
    modules = (llm_module, dream_module, retrieval_service, observer_module)
    previous = {module: module.db for module in modules}
    try:
        for module in modules:
            module.db = database
        yield
    finally:
        for module, value in previous.items():
            module.db = value


def create_eval_database(path: Path) -> Database:
    database = Database(str(path))
    database.migrate()
    database.reset_demo()
    return database


async def broadcast_progress(condition: str, session: int) -> None:
    await MAIN_DB.broadcast(
        {
            "kind": "eval_progress",
            "condition": condition,
            "session": session,
            "at": clock.iso_now(),
        }
    )


def session_tokens(database: Database, session_id: str) -> int:
    with database.connection() as conn:
        row = conn.execute(
            """
            SELECT COALESCE(SUM(prompt_tokens + completion_tokens), 0) AS tokens
            FROM llm_calls
            WHERE session_id = ?
            """,
            (session_id,),
        ).fetchone()
        return int(row["tokens"] or 0)


def transcript_for_session(database: Database, session_id: str) -> str:
    return "\n".join(
        f"{utterance['role']}: {utterance['content']}"
        for utterance in database.utterances_for_session(session_id)
    )


async def score_opening(opening: str, session_id: str) -> tuple[float, bool]:
    scores: list[int] = []
    real = True
    for _ in range(3):
        result = await llm_client.score_personalization(
            _truth_sheet(),
            opening,
            session_id=session_id,
        )
        real = real and bool(result.get("real_run"))
        scores.append(int(result.get("score", 0)))
    return (sum(scores) / len(scores), real)


def score_recall_probes(pack: dict[str, Any], probes: list[dict[str, Any]]) -> float:
    checks = 0
    satisfied = 0
    winner_tags = {
        tag
        for winner in pack.get("winners", [])
        for tag in winner.get("subject_tags", [])
    }
    for probe in probes:
        for tag in probe.get("expected_tags", []):
            checks += 1
            satisfied += int(tag in winner_tags)
        for tag in probe.get("absent_tags", []):
            checks += 1
            satisfied += int(tag not in winner_tags)
    return satisfied / checks if checks else 0.0


def forgetting_passed(packs: list[dict[str, Any]]) -> bool:
    return all(
        "limits" not in winner.get("subject_tags", [])
        and "limits" not in winner.get("content", "").lower()
        for pack in packs
        for winner in pack.get("winners", [])
    )


async def seed_stale_memory(database: Database) -> None:
    session = database.create_session("stale limits seed")
    utterance = database.insert_utterance(
        session["id"],
        "student",
        "I was studying limits for a quiz on July 1.",
    )
    content = "Studying limits for a quiz on July 1."
    engram = database.insert_engram(
        {
            "type": "fact",
            "content": content,
            "subject_tags": ["limits"],
            "confidence": 0.8,
            "importance": 0.35,
        },
        [utterance["id"]],
        await llm_client.embed(content, session_id=session["id"]),
        provisional=False,
    )
    stale_time = (clock.now() - timedelta(days=14)).isoformat()
    database.update_engram(
        engram["id"],
        last_accessed_at=stale_time,
        strength=compute_strength(
            DecayInput(
                importance=0.35,
                access_count=0,
                last_accessed_at=clock.parse_iso(stale_time),
                now=clock.now(),
            ),
            settings.lambda_base,
        ),
    )


def condition_message(condition: str, student: str, history: list[str]) -> str:
    if condition != "full_history" or not history:
        return student
    prior = "\n\n".join(history)
    return f"Prior session transcripts:\n{prior}\n\nCurrent student turn:\n{student}"


async def play_baseline_condition(
    database: Database,
    condition: str,
    scripts: list[dict[str, Any]],
) -> dict[str, Any]:
    personalization: list[dict[str, Any]] = []
    tokens: list[dict[str, Any]] = []
    history: list[str] = []
    real_personalization = True

    for index, script in enumerate(scripts, start=1):
        await broadcast_progress(condition, index)
        session = database.create_session(script["title"])
        opening_prompt = condition_message(
            condition,
            "Open this tutoring session with one concise first response.",
            history,
        )
        opening = await llm_client.complete_tutor(opening_prompt, [], session["id"])
        database.insert_utterance(session["id"], "tutor", opening)
        if index in (2, 3):
            score, real = await score_opening(opening, session["id"])
            real_personalization = real_personalization and real
            personalization.append(
                {"condition": condition, "session": index, "score": round(score, 3)}
            )

        for turn in script["turns"]:
            student = turn["student"]
            database.insert_utterance(session["id"], "student", student)
            reply = await llm_client.complete_tutor(
                condition_message(condition, student, history),
                [],
                session["id"],
            )
            database.insert_utterance(session["id"], "tutor", reply)

        history.append(transcript_for_session(database, session["id"]))
        tokens.append(
            {
                "condition": condition,
                "session": index,
                "tokens": session_tokens(database, session["id"]),
            }
        )

    return {
        "personalization": personalization,
        "tokens": tokens,
        "real_personalization": real_personalization,
    }


async def play_reverie_condition(
    database: Database,
    scripts: list[dict[str, Any]],
) -> dict[str, Any]:
    personalization: list[dict[str, Any]] = []
    recall_precision: list[dict[str, Any]] = []
    tokens: list[dict[str, Any]] = []
    packs: list[dict[str, Any]] = []
    real_personalization = True
    await seed_stale_memory(database)

    for index, script in enumerate(scripts, start=1):
        await broadcast_progress("reverie", index)
        session = database.create_session(script["title"])
        pack = await assemble_memory_pack(
            SESSION_OPEN_RETRIEVAL_QUERY,
            session_id=session["id"],
            phase="session_open",
        )
        packs.append(pack)
        if script.get("probes"):
            recall_precision.append(
                {
                    "condition": "reverie",
                    "session": index,
                    "precision": round(score_recall_probes(pack, script["probes"]), 3),
                }
            )

        opening = await llm_client.complete_tutor(
            "Open this tutoring session with one concise first response.",
            pack["winners"],
            session["id"],
        )
        database.insert_utterance(session["id"], "tutor", opening)
        if index in (2, 3):
            score, real = await score_opening(opening, session["id"])
            real_personalization = real_personalization and real
            personalization.append(
                {"condition": "reverie", "session": index, "score": round(score, 3)}
            )

        for turn in script["turns"]:
            student = turn["student"]
            database.insert_utterance(session["id"], "student", student)
            turn_pack = await assemble_memory_pack(
                student,
                session_id=session["id"],
                phase="mid_session",
            )
            reply = await llm_client.complete_tutor(
                student,
                turn_pack["winners"],
                session["id"],
            )
            database.insert_utterance(session["id"], "tutor", reply)
            await observe_exchange(session["id"])

        if index < len(scripts):
            database.end_session(session["id"])
            await dream_module.run_dream(session["id"])
        tokens.append(
            {
                "condition": "reverie",
                "session": index,
                "tokens": session_tokens(database, session["id"]),
            }
        )

    return {
        "personalization": personalization,
        "recall_precision": recall_precision,
        "tokens": tokens,
        "forgetting": forgetting_passed(packs),
        "real_personalization": real_personalization,
    }


def compose_headline(results: dict[str, Any]) -> str:
    personal = results["personalization"]
    tokens = results["tokens"]
    reverie_score = mean(
        row["score"] for row in personal if row["condition"] == "reverie"
    )
    no_memory_score = mean(
        row["score"] for row in personal if row["condition"] == "no_memory"
    )
    reverie_tokens = sum(row["tokens"] for row in tokens if row["condition"] == "reverie")
    full_history_tokens = sum(
        row["tokens"] for row in tokens if row["condition"] == "full_history"
    )
    if full_history_tokens:
        token_ratio = reverie_tokens / full_history_tokens
        return (
            f"{reverie_score - no_memory_score:+.1f} personalization vs no memory "
            f"at {token_ratio:.1f}x full-history tokens"
        )
    return f"{reverie_score - no_memory_score:+.1f} personalization vs no memory"


def mean(values: Any) -> float:
    items = list(values)
    return sum(items) / len(items) if items else 0.0


def write_evals_md(results: dict[str, Any]) -> None:
    lines = [
        "# Reverie Evals",
        "",
        f"Run date: {time.strftime('%Y-%m-%d %H:%M:%S %Z')}",
        "",
        f"Headline: {results['headline']}",
        "",
        "## Personalization",
        "",
        "| Condition | Session | Score |",
        "| --- | ---: | ---: |",
    ]
    for row in results["personalization"]:
        lines.append(f"| {row['condition']} | {row['session']} | {row['score']} |")
    lines.extend(["", "## Recall Precision", "", "| Session | Precision |", "| ---: | ---: |"])
    for row in results["recall_precision"]:
        lines.append(f"| {row['session']} | {row['precision']} |")
    lines.extend(["", "## Tokens", "", "| Condition | Session | Tokens |", "| --- | ---: | ---: |"])
    for row in results["tokens"]:
        lines.append(f"| {row['condition']} | {row['session']} | {row['tokens']} |")
    lines.extend(["", f"Forgetting check: {results['forgetting_check']}.", ""])
    (REPO_ROOT / "EVALS.md").write_text("\n".join(lines))


async def run_eval_suite() -> dict[str, Any]:
    started = int(time.time())
    scripts = _load_scripts()
    run_dir = RUNS_DIR / f"run_{started}"
    all_personalization: list[dict[str, Any]] = []
    all_recall: list[dict[str, Any]] = []
    all_tokens: list[dict[str, Any]] = []
    all_real = settings.live_llm_enabled
    forgetting = False
    observed_tokens: dict[str, int] = {}

    for condition in CONDITIONS:
        database = create_eval_database(run_dir / f"{condition}.db")
        with bind_database(database):
            if condition == "reverie":
                condition_results = await play_reverie_condition(database, scripts)
                all_recall.extend(condition_results["recall_precision"])
                forgetting = bool(condition_results["forgetting"])
            else:
                condition_results = await play_baseline_condition(database, condition, scripts)
            all_personalization.extend(condition_results["personalization"])
            all_tokens.extend(condition_results["tokens"])
            all_real = all_real and bool(condition_results["real_personalization"])
            for purpose, count in _observed_llm_tokens(database).items():
                observed_tokens[purpose] = observed_tokens.get(purpose, 0) + count

    results = {
        "generated_at": started,
        "mode": "live" if settings.live_llm_enabled else "mock",
        "real_run": bool(all_real),
        "conditions": list(CONDITIONS),
        "personalization": all_personalization,
        "recall_precision": all_recall,
        "tokens": all_tokens,
        "headline": "",
        "forgetting_check": "pass" if forgetting else "fail",
        "observed_llm_tokens": observed_tokens,
    }
    if results["real_run"]:
        results["headline"] = compose_headline(results)
        write_evals_md(results)
    else:
        results["message"] = "Mock eval run completed. Real eval numbers require live DashScope."

    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_PATH.write_text(json.dumps(results, indent=2))
    return results


def latest_results() -> dict[str, Any]:
    if RESULTS_PATH.exists():
        results = json.loads(RESULTS_PATH.read_text())
        results.setdefault("observed_llm_tokens", _observed_llm_tokens())
        return results
    return {
        "generated_at": int(time.time()),
        "mode": "mock" if not settings.live_llm_enabled else "live",
        "real_run": False,
        "message": "No live eval run has completed. Run the suite to compare conditions.",
        "conditions": [],
        "personalization": [],
        "recall_precision": [],
        "tokens": [],
        "headline": "",
        "forgetting_check": "not_run",
        "observed_llm_tokens": _observed_llm_tokens(),
    }


async def run_smoke_eval() -> dict[str, Any]:
    opening = (
        "Last time, f(g(x)) was tempting to treat like a product. "
        "Let's start with one worked example before the abstract rule."
    )
    result = await llm_client.score_personalization(
        _truth_sheet(),
        opening,
    )
    with MAIN_DB.connection() as conn:
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
