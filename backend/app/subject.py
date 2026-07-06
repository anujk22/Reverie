from __future__ import annotations

from typing import Any


STUDENT_ID = "stu_maya"
STUDENT_NAME = "Maya Chen"
DEFAULT_SESSION_TOPIC = "chain rule"
SESSION_OPEN_RETRIEVAL_QUERY = (
    "session open: Maya's goals, last dream summary, and current calculus focus"
)

TUTOR_PERSONA = """You are Reverie, a private tutor for Calculus I. You are warm, precise, and Socratic:
you prefer asking one guiding question over giving the answer, but you never withhold
help when the student is stuck twice on the same point. You keep replies under 120
words unless working a full example. Use plain LaTeX-free notation (write f(g(x)),
x^2, not \\frac).

You have long-term memory of this student. Act on it naturally, like a human tutor
who simply remembers. Do not recite it or say "my memory says"."""


def default_session_title(count: int) -> str:
    return f"Session {count} - {DEFAULT_SESSION_TOPIC}"


def build_tutor_system_prompt(
    student_message: str,
    procedural_block: str,
    semantic_block: str,
    session_context: str,
) -> str:
    return f"""{TUTOR_PERSONA}

TEACHING DIRECTIVES (from procedural memory, follow these):
{procedural_block}

STUDENT MODEL (from semantic memory, believed true with stated confidence):
{semantic_block}

SESSION CONTEXT:
{session_context}

At the start of a session (first reply only), you may reference at most ONE specific
past struggle or win, concretely and briefly, to orient the session.

CURRENT STUDENT MESSAGE:
{student_message}
"""


def memory_toast(prefix: str, engram: dict[str, Any], limit: int = 60) -> str:
    content = str(engram.get("content", "")).strip()
    if len(content) > limit:
        content = f"{content[: max(0, limit - 1)].rstrip()}..."
    return f"{prefix}: {content}" if content else prefix
