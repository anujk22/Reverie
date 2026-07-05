from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from app import clock
from app.config import settings
from app.db import db, new_id, row_to_engram
from app.llm import llm_client
from app.memory.decay import DecayInput, compute_strength
from app.memory.dedupe import find_duplicate_memory
from app.memory.observer import quote_sources, quote_supported
from app.memory.retrieval import cosine
from app.models import CandidateEngram


STAGES = ("replay", "distill", "deduplicate", "reconcile", "decay", "report")


async def emit_stage(stage: str, status: str, counts: dict[str, Any]) -> None:
    await db.broadcast(
        {
            "kind": "dream_stage",
            "stage": stage,
            "status": status,
            "counts": counts,
            "at": clock.iso_now(),
        }
    )


async def run_dream(session_id: str) -> dict[str, Any]:
    started = clock.iso_now()
    report_id = new_id("drm")
    stats: dict[str, Any] = {stage: {} for stage in STAGES}
    with db.connection() as conn:
        exists = conn.execute(
            "SELECT id FROM dream_reports WHERE session_id = ? ORDER BY started_at DESC LIMIT 1",
            (session_id,),
        ).fetchone()
        if exists:
            report_id = exists["id"]
        else:
            conn.execute(
                "INSERT INTO dream_reports(id, session_id, started_at) VALUES (?, ?, ?)",
                (report_id, session_id, started),
            )

    start_time = time.perf_counter()
    provisional = await replay(session_id, stats)
    await distill(session_id, provisional, stats)
    await deduplicate(session_id, stats)
    await reconcile(session_id, stats)
    await decay(session_id, stats)
    stats["duration_ms"] = int((time.perf_counter() - start_time) * 1000)
    await emit_stage("report", "running", stats)
    with db.connection() as conn:
        conn.execute(
            """
            UPDATE dream_reports
            SET finished_at = ?, stats_json = ?
            WHERE id = ?
            """,
            (clock.iso_now(conn), json.dumps(stats), report_id),
        )
        conn.execute("UPDATE sessions SET dream_completed = 1 WHERE id = ?", (session_id,))
    await emit_stage("report", "done", stats)
    return {"id": report_id, "session_id": session_id, "stats": stats}


async def replay(session_id: str, stats: dict[str, Any]) -> list[dict[str, Any]]:
    await emit_stage("replay", "running", {"loaded": 0})
    with db.connection() as conn:
        rows = conn.execute(
            """
            SELECT DISTINCT e.* FROM engrams e
            JOIN memory_events me ON me.engram_id = e.id
            WHERE me.session_id = ? AND e.provisional = 1 AND e.status = 'active'
            """,
            (session_id,),
        ).fetchall()
        provisional = [row_to_engram(row) for row in rows]
    stats["replay"] = {"loaded": len(provisional)}
    await emit_stage("replay", "done", stats["replay"])
    return provisional


async def distill(
    session_id: str, provisional: list[dict[str, Any]], stats: dict[str, Any]
) -> None:
    counts = {"confirmed": 0, "revised": 0, "rejected": 0}
    await emit_stage("distill", "running", counts)
    for item in provisional:
        confidence = float(item["confidence"])
        if confidence < 0.35:
            db.update_engram(item["id"], status="archived", provisional=0)
            counts["rejected"] += 1
            await db.append_event(
                "engram.archived",
                item["id"],
                {"reason": "dream rejected low-confidence provisional memory"},
                session_id=session_id,
            )
        else:
            db.update_engram(item["id"], provisional=0)
            counts["confirmed"] += 1
            await db.append_event(
                "engram.consolidated",
                item["id"],
                {"confidence": confidence},
                session_id=session_id,
            )
        await emit_stage("distill", "running", counts)
        await asyncio.sleep(0.02)

    session_level_confirmed = await add_session_level_engrams(session_id)
    counts["confirmed"] += session_level_confirmed
    stats["distill"] = counts
    await emit_stage("distill", "done", counts)


async def add_session_level_engrams(session_id: str) -> int:
    utterances = db.utterances_for_session(session_id)
    transcript = "\n".join(f"{utt['role']}: {utt['content']}" for utt in utterances)
    raw_candidates = await llm_client.extract_session_level_engrams(
        transcript,
        db.active_engrams(),
        session_id=session_id,
    )
    confirmed = 0
    for raw in raw_candidates:
        try:
            candidate = CandidateEngram(**raw)
        except Exception:
            continue
        if candidate.type not in {"affect", "strategy_outcome"}:
            continue
        if not all(quote_supported(quote, transcript) for quote in candidate.source_quotes):
            continue
        source_ids: list[str] = []
        for quote in candidate.source_quotes:
            source_ids.extend(quote_sources(quote, utterances))
        source_ids = list(dict.fromkeys(source_ids))
        if not source_ids:
            continue

        embedding = await llm_client.embed(candidate.content, session_id=session_id)
        duplicate = nearest_same_type_memory(
            candidate.model_dump(exclude={"source_quotes"}), embedding
        )
        if duplicate:
            db.reinforce(duplicate["id"])
            await db.append_event(
                "engram.reinforced",
                duplicate["id"],
                {"reason": "session-level consolidation found similar evidence"},
                session_id=session_id,
            )
            continue

        engram = db.insert_engram(
            candidate.model_dump(exclude={"source_quotes"}),
            source_ids,
            embedding,
            provisional=False,
        )
        confirmed += 1
        await db.append_event(
            "engram.consolidated",
            engram["id"],
            {
                "session_level": True,
                "source_quotes": candidate.source_quotes,
                "toast": "Dream found a session-level memory.",
            },
            session_id=session_id,
        )
    return confirmed


def nearest_same_type_memory(candidate: dict[str, Any], embedding: list[float]) -> dict[str, Any] | None:
    return find_duplicate_memory(
        candidate,
        embedding,
        db.active_engrams(),
        db.vector_for,
        settings.dream_dedupe_threshold,
    )


async def deduplicate(session_id: str, stats: dict[str, Any]) -> None:
    counts = {"merged": 0, "distinct": 0}
    await emit_stage("deduplicate", "running", counts)
    engrams = [item for item in db.active_engrams() if not item["provisional"]]
    seen: set[tuple[str, str]] = set()
    for left in engrams:
        for right in engrams:
            if left["id"] == right["id"] or left["type"] != right["type"]:
                continue
            pair = tuple(sorted((left["id"], right["id"])))
            if pair in seen:
                continue
            seen.add(pair)
            similarity = cosine(db.vector_for(left["id"]), db.vector_for(right["id"]))
            if similarity > settings.dream_dedupe_threshold:
                winner, loser = choose_winner(left, right)
                db.update_engram(
                    loser["id"],
                    status="superseded",
                    superseded_by=winner["id"],
                    provisional=0,
                )
                db.reinforce(winner["id"])
                counts["merged"] += 1
                await db.append_event(
                    "engram.merged",
                    winner["id"],
                    {"merged_from": loser["id"], "toast": "Merged duplicate memories."},
                    session_id=session_id,
                )
            else:
                counts["distinct"] += 1
            await emit_stage("deduplicate", "running", counts)
    stats["deduplicate"] = counts
    await emit_stage("deduplicate", "done", counts)


async def reconcile(session_id: str, stats: dict[str, Any]) -> None:
    counts = {"superseded": 0, "coexist": 0}
    await emit_stage("reconcile", "running", counts)
    engrams = [item for item in db.active_engrams() if not item["provisional"]]
    misconceptions = [item for item in engrams if item["type"] == "misconception"]
    masteries = [item for item in engrams if item["type"] == "mastery"]
    for misconception in misconceptions:
        for mastery in masteries:
            tag_overlap = set(misconception["subject_tags"]) & set(mastery["subject_tags"])
            similarity = cosine(db.vector_for(misconception["id"]), db.vector_for(mastery["id"]))
            if tag_overlap or similarity > 0.42:
                winner, loser = choose_contradiction_winner(mastery, misconception)
                if float(winner["confidence"]) >= 0.6:
                    db.update_engram(
                        loser["id"],
                        status="superseded",
                        superseded_by=winner["id"],
                        provisional=0,
                    )
                    counts["superseded"] += 1
                    await db.append_event(
                        "engram.superseded",
                        loser["id"],
                        {
                            "superseded_by": winner["id"],
                            "toast": "Updated Maya's chain-rule memory.",
                        },
                        session_id=session_id,
                    )
                else:
                    counts["coexist"] += 1
            await emit_stage("reconcile", "running", counts)
    stats["reconcile"] = counts
    await emit_stage("reconcile", "done", counts)


async def decay(session_id: str, stats: dict[str, Any]) -> None:
    counts = {"decayed": 0, "archived": 0}
    await emit_stage("decay", "running", counts)
    now = clock.now()
    for engram in db.active_engrams():
        last = clock.parse_iso(engram["last_accessed_at"])
        updated = compute_strength(
            DecayInput(
                importance=float(engram["importance"]),
                access_count=int(engram["access_count"]),
                last_accessed_at=last,
                now=now,
            ),
            settings.lambda_base,
        )
        old = float(engram["strength"])
        if old - updated >= 0.05:
            db.update_engram(engram["id"], strength=updated)
            counts["decayed"] += 1
            await db.append_event(
                "engram.decayed",
                engram["id"],
                {"from": old, "to": updated},
                session_id=session_id,
            )
        if updated < 0.05 and engram["type"] != "goal":
            db.update_engram(engram["id"], status="archived")
            counts["archived"] += 1
            await db.append_event(
                "engram.archived",
                engram["id"],
                {"strength": updated, "toast": "Forgot a stale memory."},
                session_id=session_id,
            )
        await emit_stage("decay", "running", counts)
    stats["decay"] = counts
    await emit_stage("decay", "done", counts)


def choose_winner(left: dict[str, Any], right: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    left_score = (left["confidence"], left["created_at"], len(left["content"]))
    right_score = (right["confidence"], right["created_at"], len(right["content"]))
    if right_score > left_score:
        return right, left
    return left, right


def choose_contradiction_winner(
    mastery: dict[str, Any], misconception: dict[str, Any]
) -> tuple[dict[str, Any], dict[str, Any]]:
    mastery_newer = mastery["created_at"] >= misconception["created_at"]
    misconception_newer = misconception["created_at"] > mastery["created_at"]
    if mastery_newer and float(mastery["confidence"]) >= 0.6:
        return mastery, misconception
    if misconception_newer and float(misconception["confidence"]) >= 0.6:
        return misconception, mastery
    if float(mastery["confidence"]) >= float(misconception["confidence"]):
        return mastery, misconception
    return misconception, mastery
