from __future__ import annotations

from datetime import datetime, timezone, timedelta
import sqlite3

from .config import settings


def iso_now(conn: sqlite3.Connection | None = None) -> str:
    return now(conn).isoformat()


def now(conn: sqlite3.Connection | None = None) -> datetime:
    offset = settings.clock_offset_seconds
    if conn is not None:
        row = conn.execute(
            "SELECT value FROM app_state WHERE key = 'clock_offset_seconds'"
        ).fetchone()
        if row:
            offset = int(row["value"])
    return datetime.now(timezone.utc) + timedelta(seconds=offset)


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
