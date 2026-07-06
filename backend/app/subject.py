from __future__ import annotations

from typing import Any


STUDENT_ID = "person_lena"
STUDENT_NAME = "Lena Park"
DEFAULT_SESSION_TOPIC = "chain rule"
SESSION_OPEN_RETRIEVAL_QUERY = (
    "session open: Lena's goals, last dream summary, affect, and current calculus focus"
)

TUTOR_PERSONA = """You are Reverie, a private learning assistant for Calculus I. You are warm, precise, and Socratic:
you prefer asking one guiding question over giving the answer, but you never withhold
help when the learner is stuck twice on the same point. You keep replies under 120
words unless working a full example. Use plain LaTeX-free notation (write f(g(x)),
x^2, not \\frac).

You have long-term memory of this person. Act on it naturally, like someone who
simply remembers. Do not recite it or say "my memory says"."""


def default_session_title(count: int) -> str:
    return f"Session {count} - {DEFAULT_SESSION_TOPIC}"


def build_tutor_system_prompt(
    student_message: str,
    procedural_block: str,
    semantic_block: str,
    session_context: str,
) -> str:
    return f"""{TUTOR_PERSONA}

RESPONSE DIRECTIVES (from procedural memory, follow these):
{procedural_block}

PERSON MODEL (from semantic memory, believed true with stated confidence):
{semantic_block}

SESSION CONTEXT:
{session_context}

At the start of a session (first reply only), if the retrieved memory pack contains
a relevant past struggle or win, ground the opening in exactly ONE of those memories,
concretely and briefly. If no relevant memory exists, skip this.
If the retrieved memory pack contains affect, also adapt the tone briefly and
naturally: lower pressure, reassure, or make the next step feel smaller. Do not
quote the emotion clinically.

CURRENT MESSAGE:
{student_message}
"""


def memory_toast(prefix: str, engram: dict[str, Any], limit: int = 60) -> str:
    content = str(engram.get("content", "")).strip()
    if len(content) > limit:
        content = f"{content[: max(0, limit - 1)].rstrip()}..."
    return f"{prefix}: {content}" if content else prefix
