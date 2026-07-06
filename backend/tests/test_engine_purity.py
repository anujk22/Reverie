from __future__ import annotations

from pathlib import Path


FORBIDDEN = ("lena", "calculus", "chain rule", "product rule", "midterm")


def test_memory_engine_sources_contain_no_demo_subject_knowledge() -> None:
    """Subject surfaces live in app/subject.py; llm.py mock helpers are exempt by design."""

    app_dir = Path(__file__).resolve().parents[1] / "app"
    scanned = [
        *sorted((app_dir / "memory").glob("*.py")),
        *sorted((app_dir / "routes").glob("*.py")),
        app_dir / "db.py",
        app_dir / "tutor.py",
    ]

    violations: list[str] = []
    for path in scanned:
        text = path.read_text().lower()
        for forbidden in FORBIDDEN:
            if forbidden in text:
                violations.append(f"{path.relative_to(app_dir)} contains {forbidden!r}")

    assert violations == []
