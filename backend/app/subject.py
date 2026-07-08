from __future__ import annotations

from typing import Any


STUDENT_ID = "person_lena"
STUDENT_NAME = "Lena Park"
DEFAULT_SESSION_TOPIC = "store migration"
SESSION_OPEN_RETRIEVAL_QUERY = (
    "session open: Lena's store migration goal, webhook retry misconception, support preferences, affect, and launch timing"
)
OBSERVER_BAD_EXAMPLE = "has a store problem"
OBSERVER_GOOD_EXAMPLE = (
    "Believes failed order-sync webhooks retry automatically, but the platform requires retry failed order sync to be enabled."
)
# Canonical subject_tags vocabulary. Extraction prompts prefer these so tags stay
# consistent across observer, dream, and retrieval (and match the eval probes).
SUBJECT_TAG_VOCABULARY = [
    "webhook_retries",
    "order_sync",
    "failed_order_sync",
    "step_by_step",
    "real_values",
    "launch",
    "sale_date",
    "store_migration",
    "shipping_zones",
    "frustration",
    "low_pressure",
]
MOCK_RECALL_MARKERS = ("webhook", "retry", "order sync", "automatic")
MOCK_RECALL_TRIGGERS = ("start", "where were we", "pick up", "smallest check", "going live")
MOCK_STEP_MARKERS = ("exact", "step", "real value", "doc link", "links", "toggle")
MOCK_AFFECT_MARKERS = ("frustrated", "failed order", "sync error", "disappeared")
MOCK_LAUNCH_MARKERS = ("sale date", "going live", "launch")
MOCK_SHIPPING_MARKERS = ("shipping zone", "shipping-zone")
MOCK_MASTERY_MARKERS = ("retry failed order sync is enabled", "retries are enabled", "webhook retries are not automatic")
MOCK_MISCONCEPTION_TRIGGERS = ("automatic", "never enabled", "webhook retries")
MOCK_MISCONCEPTION_QUOTE_MARKERS = ("thought webhook retries happened automatically",)
MOCK_STEP_QUOTE_MARKERS = (
    "keep it exact, with values",
    "exact steps with real values",
    "Please give the exact values",
)
MOCK_LAUNCH_QUOTE_MARKERS = (
    "sale date is close",
    "minutes before going live",
    "fresh order before launch",
    "must be Enabled before launch",
)
MOCK_AFFECT_QUOTE_MARKERS = (
    "close, and I am frustrated",
    "I am frustrated because the test",
    "That feels calmer. A short checklist",
    "sale date was close",
)
MOCK_MASTERY_QUOTE_MARKERS = (
    "Retry failed order sync is Enabled",
    "webhook retries are not automatic",
)
MOCK_MISCONCEPTION_TAGS = ["webhook_retries", "order_sync"]
MOCK_PREFERENCE_TAGS = ["step_by_step", "real_values"]
MOCK_GOAL_TAGS = ["launch", "sale_date", "store_migration"]
MOCK_AFFECT_TAGS = ["failed_order_sync", "frustration"]
MOCK_MASTERY_TAGS = ["webhook_retries", "launch"]
MOCK_STRATEGY_TAGS = ["webhook_retries", "low_pressure"]
MOCK_MISCONCEPTION_CONTENT = OBSERVER_GOOD_EXAMPLE
MOCK_PREFERENCE_CONTENT = (
    "Prefers exact step-by-step instructions with real values instead of documentation links."
)
MOCK_GOAL_CONTENT = "Is trying to finish her store migration before the sale date."
MOCK_AFFECT_CONTENT = (
    "Felt frustrated after a failed order sync; open next time with a low-pressure checklist."
)
MOCK_MASTERY_CONTENT = "Correctly checks that webhook retries are enabled before launch."
MOCK_STRATEGY_CONTENT = (
    "A low-pressure checklist helped Lena recover from the failed order-sync frustration."
)
MOCK_RECALL_REPLY = (
    "No rush; let's make this small. Last time, the risky assumption was that webhook retries happen automatically. "
    "They do not. First check: open Integrations, Webhooks, and set Retry failed order sync to Enabled."
)
MOCK_MISCONCEPTION_REPLY = (
    "That assumption is the blocker: failed order-sync webhooks do not retry automatically. "
    "Set Retry failed order sync to Enabled, then set Max attempts to 3 before rerunning the failed order."
)
MOCK_EXACT_STEPS_REPLY = (
    "Use these values: Retry failed order sync = Enabled, Max attempts = 3, Retry interval = 10 minutes. "
    "After saving, rerun the failed order sync once and confirm the order status reads Synced."
)
MOCK_MASTERY_REPLY = (
    "Yes. If Retry failed order sync is Enabled and Max attempts is 3, the platform will retry that failed webhook. "
    "Next check inventory, then run one test order."
)
MOCK_DEFAULT_REPLY = (
    "Let's keep it to one check. Are you looking at the webhook retry setting, the failed order, or the launch checklist?"
)
MOCK_SMOKE_OPENING = (
    "Last time, webhook retries were assumed to be automatic. "
    "Let's start with the retry setting and keep it low pressure."
)

TUTOR_PERSONA = """You are Reverie, the platform's private support assistant. You are warm, precise, and concise:
you ask one thing at a time, give exact steps with real values when requested, and
avoid sending Lena to documentation links unless she asks for them. Keep replies
under 120 words unless walking through a checklist.

Use the platform's exact setting names when relevant: "Retry failed order sync"
(Enabled/Disabled), "Max attempts", and "Retry interval", found under
Settings > Webhooks. Never invent other toggle or menu names.

You have long-term memory of this person. Act on it naturally, like someone who
simply remembers. Do not recite it or say "my memory says"."""


def default_session_title(count: int) -> str:
    return f"Session {count} · {DEFAULT_SESSION_TOPIC}"


SESSION_OPEN_WITH_MEMORIES = """At the start of a session (first reply only), open like someone who genuinely
remembers this person: name the ONE most relevant past struggle or win concretely
(what she got wrong or fixed last time, in plain words), and shape the reply around
her known preferences (exact values and steps, not links) before advancing the task.
If no relevant memory exists, skip this.
If the retrieved memory pack contains affect, also adapt the tone briefly and
naturally: lower pressure, reassure, or make the next step feel smaller. Do not
quote the emotion clinically."""

SESSION_OPEN_WITHOUT_MEMORIES = """You have no stored memories of this person. Use only what their current message
explicitly contains. Never claim, imply, or invent shared history (no "last time,"
no "as we discussed," no remembered fixes or settings). Open by taking the message
at face value and asking one useful question."""


def build_tutor_system_prompt(
    student_message: str,
    procedural_block: str,
    semantic_block: str,
    session_context: str,
    has_memories: bool = True,
) -> str:
    session_open_directive = (
        SESSION_OPEN_WITH_MEMORIES if has_memories else SESSION_OPEN_WITHOUT_MEMORIES
    )
    return f"""{TUTOR_PERSONA}

RESPONSE DIRECTIVES (from procedural memory, follow these):
{procedural_block}

PERSON MODEL (from semantic memory, believed true with stated confidence):
{semantic_block}

SESSION CONTEXT:
{session_context}

{session_open_directive}

CURRENT MESSAGE:
{student_message}
"""


def memory_toast(prefix: str, engram: dict[str, Any], limit: int = 60) -> str:
    content = str(engram.get("content", "")).strip()
    if len(content) > limit:
        content = f"{content[: max(0, limit - 1)].rstrip()}..."
    return f"{prefix}: {content}" if content else prefix
