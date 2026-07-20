import type { EngramType } from "@/lib/api";

export type DemoPage = "/" | "/dream" | "/evals" | "/architecture";

export type DemoAction =
  | { type: "reset"; createSessionTitle: string }
  | { type: "create_session"; title: string; showMemoryPack?: boolean }
  | { type: "send_message"; text: string; settleMs?: number }
  | { type: "end_session" }
  | { type: "run_dream"; endCurrentSession?: boolean }
  | { type: "advance_clock"; days: number; settleMs?: number }
  | {
      type: "show_engram_inspector";
      engramType?: EngramType;
      contains?: string;
      holdMs?: number;
    }
  | { type: "show_memory_pack" }
  | { type: "idle" };

export type DemoBeat = {
  id: string;
  caption: string;
  page: DemoPage;
  action: DemoAction;
  focus?: string;
  autoAdvanceMs?: number;
};

export const filmScript: DemoBeat[] = [
  {
    id: "cold-start",
    caption: "Reverie starts with no memory.",
    page: "/",
    action: { type: "reset", createSessionTitle: "Session 1 · interview preparation" },
    autoAdvanceMs: 5000
  },
  {
    id: "first-friction",
    caption: "One conversation becomes structured memory.",
    page: "/",
    action: {
      type: "send_message",
      text:
        "My final interview is Friday. I think I need to explain every technical detail to sound credible. I froze in the last one, and I am anxious."
    },
    autoAdvanceMs: 2000
  },
  {
    id: "provenance",
    caption: "Exact words. Verifiable source.",
    page: "/",
    action: {
      type: "show_engram_inspector",
      contains: "technical detail",
      holdMs: 6000
    },
    autoAdvanceMs: 500
  },
  {
    id: "exact-steps",
    caption: "Changed facts become new evidence.",
    page: "/",
    action: {
      type: "send_message",
      text:
        "Update: it moved to Monday. I need to lead with impact, not every detail. Give me one question at a time, direct feedback, and no pep talk."
    },
    autoAdvanceMs: 2000
  },
  {
    id: "dream-cycle",
    caption: "Dream: merge, revise, reconcile.",
    page: "/dream",
    action: { type: "run_dream", endCurrentSession: true },
    focus: "dream-stage-rail",
    autoAdvanceMs: 5000
  },
  {
    id: "forgetting",
    caption: "Outdated memory fades instead of competing.",
    page: "/dream",
    action: { type: "advance_clock", days: 3, settleMs: 1500 },
    focus: "dream-memory-map",
    autoAdvanceMs: 6500
  },
  {
    id: "second-day",
    caption: "New session. Fixed context budget.",
    page: "/",
    action: { type: "create_session", title: "Session 2 · final interview", showMemoryPack: true },
    autoAdvanceMs: 5000
  },
  {
    id: "recall",
    caption: "Only relevant memory enters context.",
    page: "/",
    action: {
      type: "send_message",
      text:
        "My final interview is Monday. I have 20 minutes for preparation. What should I practice first?"
    },
    autoAdvanceMs: 2000
  },
  {
    id: "remember",
    caption: "The answer adapts without replaying history.",
    page: "/",
    action: { type: "idle" },
    autoAdvanceMs: 5000
  },
  {
    id: "affect-receipt",
    caption: "Even emotional context has a receipt.",
    page: "/",
    action: {
      type: "show_engram_inspector",
      engramType: "affect",
      contains: "anxious",
      holdMs: 6000
    },
    autoAdvanceMs: 500
  },
  {
    id: "measured",
    caption: "Measured, not asserted.",
    page: "/evals",
    action: { type: "idle" },
    focus: "eval-results",
    autoAdvanceMs: 6000
  },
  {
    id: "architecture",
    caption: "The engine is the product.",
    page: "/architecture",
    action: { type: "idle" },
    focus: "architecture-engine"
  }
];
