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
      engramType: EngramType;
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
  autoAdvanceMs?: number;
};

export const filmScript: DemoBeat[] = [
  {
    id: "cold-start",
    caption: "A memory engine starts empty.",
    page: "/",
    action: { type: "reset", createSessionTitle: "Session 1" },
    autoAdvanceMs: 5000
  },
  {
    id: "first-friction",
    caption: "The hardest memory workload: one person over weeks.",
    page: "/",
    action: {
      type: "send_message",
      text:
        "I keep freezing when the midterm leans on chain rule. With f(g(x)), my hand wants to write f'(x) times g'(x), like product rule."
    },
    autoAdvanceMs: 2000
  },
  {
    id: "provenance",
    caption: "Every memory carries a receipt.",
    page: "/",
    action: {
      type: "show_engram_inspector",
      engramType: "misconception",
      contains: "product rule",
      holdMs: 6000
    },
    autoAdvanceMs: 500
  },
  {
    id: "worked-example",
    caption: "It forms typed memories from exact evidence.",
    page: "/",
    action: {
      type: "send_message",
      text:
        "Could we start with actual numbers? Example first, then rules in the abstract, and the rule usually lands."
    },
    autoAdvanceMs: 2000
  },
  {
    id: "dream-cycle",
    caption: "Between sessions, it dreams: merging, resolving, forgetting.",
    page: "/",
    action: { type: "run_dream", endCurrentSession: true },
    autoAdvanceMs: 5000
  },
  {
    id: "forgetting",
    caption: "Three days pass. Untouched memories fade.",
    page: "/dream",
    action: { type: "advance_clock", days: 3, settleMs: 1500 },
    autoAdvanceMs: 6500
  },
  {
    id: "second-day",
    caption: "A new session begins with a memory budget.",
    page: "/",
    action: { type: "create_session", title: "Session 2", showMemoryPack: true },
    autoAdvanceMs: 5000
  },
  {
    id: "recall",
    caption: "It recalls only what fits the budget.",
    page: "/",
    action: {
      type: "send_message",
      text: "Okay, I have 20 minutes tonight. Where were we?"
    },
    autoAdvanceMs: 2000
  },
  {
    id: "remember",
    caption: "It remembered pressure, and changed the response.",
    page: "/",
    action: {
      type: "send_message",
      text: "Can we do one small worked example before the rule?"
    },
    autoAdvanceMs: 2000
  },
  {
    id: "measured",
    caption: "Measured, not asserted.",
    page: "/evals",
    action: { type: "idle" },
    autoAdvanceMs: 6000
  },
  {
    id: "architecture",
    caption: "The engine is the product.",
    page: "/architecture",
    action: { type: "idle" }
  }
];
