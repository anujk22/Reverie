from __future__ import annotations

import asyncio
from contextlib import contextmanager
import json
from pathlib import Path
import sqlite3
import threading
import uuid
from typing import Any, Iterator

from . import clock
from .config import settings
from .subject import STUDENT_ID, STUDENT_NAME, default_session_title


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:20]}"


class Database:
    def __init__(self, path: str):
        self.path = path
        self._lock = threading.RLock()
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()

    def connect(self) -> sqlite3.Connection:
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self.path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        conn = self.connect()
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def migrate(self) -> None:
        migrations_dir = Path(__file__).resolve().parents[1] / "migrations"
        with self.connection() as conn:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations "
                "(version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
            )
            for migration in sorted(migrations_dir.glob("*.sql")):
                version = migration.name
                exists = conn.execute(
                    "SELECT 1 FROM schema_migrations WHERE version = ?", (version,)
                ).fetchone()
                if exists:
                    continue
                sql = migration.read_text().replace("{EMBED_DIM}", str(settings.embed_dim))
                conn.executescript(sql)
                conn.execute(
                    "INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)",
                    (version, clock.iso_now(conn)),
                )
            self.seed_demo(conn)

    def seed_demo(self, conn: sqlite3.Connection) -> None:
        conn.execute(
            "INSERT OR IGNORE INTO students(id, name, created_at) VALUES (?, ?, ?)",
            (STUDENT_ID, STUDENT_NAME, clock.iso_now(conn)),
        )
        conn.execute(
            "INSERT OR IGNORE INTO app_state(key, value) VALUES (?, ?)",
            ("clock_offset_seconds", str(settings.clock_offset_seconds)),
        )

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=200)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers.discard(queue)

    async def broadcast(self, message: dict[str, Any]) -> None:
        dead: list[asyncio.Queue[dict[str, Any]]] = []
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                dead.append(queue)
        for queue in dead:
            self.unsubscribe(queue)

    async def append_event(
        self,
        event_type: str,
        engram_id: str | None = None,
        payload: dict[str, Any] | None = None,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        payload = payload or {}
        event = {
            "id": new_id("evt"),
            "engram_id": engram_id,
            "event_type": event_type,
            "payload_json": payload,
            "session_id": session_id,
            "created_at": clock.iso_now(),
        }
        with self._lock, self.connection() as conn:
            conn.execute(
                """
                INSERT INTO memory_events
                  (id, engram_id, event_type, payload_json, session_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    event["id"],
                    engram_id,
                    event_type,
                    json.dumps(payload),
                    session_id,
                    event["created_at"],
                ),
            )
            engram = self.get_engram_row(conn, engram_id) if engram_id else None
        message = {
            "kind": "memory_event",
            "event_type": event_type,
            "event": event,
            "engram": engram,
            "toast": payload.get("toast"),
            "at": event["created_at"],
        }
        await self.broadcast(message)
        return event

    def get_engram_row(
        self, conn: sqlite3.Connection, engram_id: str | None
    ) -> dict[str, Any] | None:
        if not engram_id:
            return None
        row = conn.execute("SELECT * FROM engrams WHERE id = ?", (engram_id,)).fetchone()
        if not row:
            return None
        return row_to_engram(row)

    def create_session(self, title: str | None = None) -> dict[str, Any]:
        with self._lock, self.connection() as conn:
            count = conn.execute("SELECT COUNT(*) AS c FROM sessions").fetchone()["c"] + 1
            title = title or default_session_title(count)
            session_id = new_id("ses")
            conn.execute(
                """
                INSERT INTO sessions(id, student_id, started_at, title)
                VALUES (?, ?, ?, ?)
                """,
                (session_id, STUDENT_ID, clock.iso_now(conn), title),
            )
            return dict(conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone())

    def latest_session(self) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute(
                "SELECT * FROM sessions ORDER BY started_at DESC LIMIT 1"
            ).fetchone()
            return dict(row) if row else None

    def list_sessions(self) -> list[dict[str, Any]]:
        with self.connection() as conn:
            return [dict(row) for row in conn.execute("SELECT * FROM sessions ORDER BY started_at")]

    def end_session(self, session_id: str) -> None:
        with self._lock, self.connection() as conn:
            conn.execute(
                "UPDATE sessions SET ended_at = COALESCE(ended_at, ?) WHERE id = ?",
                (clock.iso_now(conn), session_id),
            )

    def insert_utterance(self, session_id: str, role: str, content: str) -> dict[str, Any]:
        with self._lock, self.connection() as conn:
            seq_row = conn.execute(
                "SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM utterances WHERE session_id = ?",
                (session_id,),
            ).fetchone()
            utterance_id = new_id("utt")
            conn.execute(
                """
                INSERT INTO utterances(id, session_id, role, content, created_at, seq)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (utterance_id, session_id, role, content, clock.iso_now(conn), seq_row["seq"]),
            )
            return dict(
                conn.execute("SELECT * FROM utterances WHERE id = ?", (utterance_id,)).fetchone()
            )

    def utterances_for_session(
        self, session_id: str, limit: int | None = None
    ) -> list[dict[str, Any]]:
        query = "SELECT * FROM utterances WHERE session_id = ? ORDER BY seq"
        params: tuple[Any, ...] = (session_id,)
        if limit:
            query = (
                "SELECT * FROM (SELECT * FROM utterances WHERE session_id = ? "
                "ORDER BY seq DESC LIMIT ?) ORDER BY seq"
            )
            params = (session_id, limit)
        with self.connection() as conn:
            return [dict(row) for row in conn.execute(query, params)]

    def active_engrams(self) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(
                "SELECT * FROM engrams WHERE status = 'active' ORDER BY created_at DESC"
            ).fetchall()
            return [row_to_engram(row) for row in rows]

    def all_engrams(self) -> list[dict[str, Any]]:
        with self.connection() as conn:
            return [row_to_engram(row) for row in conn.execute("SELECT * FROM engrams")]

    def vector_for(self, engram_id: str) -> list[float]:
        with self.connection() as conn:
            row = conn.execute(
                "SELECT embedding_json FROM engram_vectors WHERE engram_id = ?",
                (engram_id,),
            ).fetchone()
            return json.loads(row["embedding_json"]) if row else []

    def insert_engram(
        self,
        candidate: dict[str, Any],
        source_utterance_ids: list[str],
        embedding: list[float],
        provisional: bool,
    ) -> dict[str, Any]:
        with self._lock, self.connection() as conn:
            engram_id = new_id("eng")
            now = clock.iso_now(conn)
            conn.execute(
                """
                INSERT INTO engrams
                  (id, student_id, type, content, subject_tags, confidence, importance,
                   strength, status, provisional, created_at, last_accessed_at, access_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, 0)
                """,
                (
                    engram_id,
                    STUDENT_ID,
                    candidate["type"],
                    candidate["content"],
                    json.dumps(candidate.get("subject_tags", [])),
                    candidate["confidence"],
                    candidate["importance"],
                    candidate["importance"],
                    1 if provisional else 0,
                    now,
                    now,
                ),
            )
            for utterance_id in source_utterance_ids:
                conn.execute(
                    "INSERT OR IGNORE INTO engram_sources(engram_id, utterance_id) VALUES (?, ?)",
                    (engram_id, utterance_id),
                )
            conn.execute(
                "INSERT OR REPLACE INTO engram_vectors(engram_id, embedding_json) VALUES (?, ?)",
                (engram_id, json.dumps(embedding)),
            )
            return row_to_engram(
                conn.execute("SELECT * FROM engrams WHERE id = ?", (engram_id,)).fetchone()
            )

    def update_engram(self, engram_id: str, **fields: Any) -> dict[str, Any] | None:
        if not fields:
            return None
        names = ", ".join(f"{key} = ?" for key in fields)
        values = [json.dumps(value) if key == "subject_tags" else value for key, value in fields.items()]
        values.append(engram_id)
        with self._lock, self.connection() as conn:
            conn.execute(f"UPDATE engrams SET {names} WHERE id = ?", values)
            row = conn.execute("SELECT * FROM engrams WHERE id = ?", (engram_id,)).fetchone()
            return row_to_engram(row) if row else None

    def upsert_vector(self, engram_id: str, embedding: list[float]) -> None:
        with self._lock, self.connection() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO engram_vectors(engram_id, embedding_json) VALUES (?, ?)",
                (engram_id, json.dumps(embedding)),
            )

    def reinforce(self, engram_id: str) -> dict[str, Any] | None:
        with self._lock, self.connection() as conn:
            conn.execute(
                """
                UPDATE engrams
                SET access_count = access_count + 1, last_accessed_at = ?
                WHERE id = ?
                """,
                (clock.iso_now(conn), engram_id),
            )
            row = conn.execute("SELECT * FROM engrams WHERE id = ?", (engram_id,)).fetchone()
            return row_to_engram(row) if row else None

    def graph(self) -> dict[str, Any]:
        with self.connection() as conn:
            nodes = [row_to_engram(row) for row in conn.execute("SELECT * FROM engrams")]
            links = []
            for row in conn.execute(
                "SELECT id, superseded_by FROM engrams WHERE superseded_by IS NOT NULL"
            ):
                links.append(
                    {"source": row["id"], "target": row["superseded_by"], "type": "supersedes"}
                )
            return {"nodes": nodes, "links": links}

    def engram_detail(self, engram_id: str) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute("SELECT * FROM engrams WHERE id = ?", (engram_id,)).fetchone()
            if not row:
                return None
            sources = [
                dict(item)
                for item in conn.execute(
                    """
                    SELECT u.* FROM utterances u
                    JOIN engram_sources s ON s.utterance_id = u.id
                    WHERE s.engram_id = ?
                    ORDER BY u.seq
                    """,
                    (engram_id,),
                )
            ]
            events = [
                {
                    **dict(event),
                    "payload_json": json.loads(event["payload_json"] or "{}"),
                }
                for event in conn.execute(
                    "SELECT * FROM memory_events WHERE engram_id = ? ORDER BY created_at",
                    (engram_id,),
                )
            ]
            return {"engram": row_to_engram(row), "provenance": sources, "events": events}

    def events_after(self, after: str | None = None) -> list[dict[str, Any]]:
        with self.connection() as conn:
            if after:
                rows = conn.execute(
                    "SELECT * FROM memory_events WHERE created_at > ? ORDER BY created_at",
                    (after,),
                )
            else:
                rows = conn.execute("SELECT * FROM memory_events ORDER BY created_at")
            return [
                {**dict(row), "payload_json": json.loads(row["payload_json"] or "{}")}
                for row in rows
            ]

    def set_clock_offset(self, seconds: int) -> int:
        with self._lock, self.connection() as conn:
            current = int(
                conn.execute(
                    "SELECT value FROM app_state WHERE key = 'clock_offset_seconds'"
                ).fetchone()["value"]
            )
            updated = current + seconds
            conn.execute(
                """
                INSERT INTO app_state(key, value) VALUES ('clock_offset_seconds', ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (str(updated),),
            )
            return updated

    def reset_demo(self) -> None:
        with self._lock, self.connection() as conn:
            for table in (
                "engram_vectors",
                "engram_sources",
                "memory_events",
                "dream_reports",
                "llm_calls",
                "utterances",
                "sessions",
                "engrams",
            ):
                conn.execute(f"DELETE FROM {table}")
            conn.execute(
                "UPDATE app_state SET value = '0' WHERE key = 'clock_offset_seconds'"
            )
            self.seed_demo(conn)


def row_to_engram(row: sqlite3.Row) -> dict[str, Any]:
    item = dict(row)
    item["subject_tags"] = json.loads(item.get("subject_tags") or "[]")
    item["provisional"] = bool(item["provisional"])
    return item


db = Database(settings.db_path)
