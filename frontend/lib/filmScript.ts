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
    action: { type: "reset", createSessionTitle: "Session 1 · store migration" },
    autoAdvanceMs: 5000
  },
  {
    id: "first-friction",
    caption: "The hardest memory workload: one person across sessions.",
    page: "/",
    action: {
      type: "send_message",
      text:
        "The last order sync failed halfway through, and I thought webhook retries happened automatically. The sale date is close, and I am frustrated that this broke so late."
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
      contains: "automatic",
      holdMs: 6000
    },
    autoAdvanceMs: 500
  },
  {
    id: "exact-steps",
    caption: "It forms typed memories from exact evidence.",
    page: "/",
    action: {
      type: "send_message",
      text:
        "Please give exact steps with real values, not doc links. I need the toggle name, the value, and the next check."
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
    caption: "Three days pass. A stale shipping-zone question fades.",
    page: "/dream",
    action: { type: "advance_clock", days: 3, settleMs: 1500 },
    autoAdvanceMs: 6500
  },
  {
    id: "second-day",
    caption: "A new session begins with a memory budget.",
    page: "/",
    action: { type: "create_session", title: "Session 2 · going live", showMemoryPack: true },
    autoAdvanceMs: 5000
  },
  {
    id: "recall",
    caption: "It recalls only what fits the budget.",
    page: "/",
    action: {
      type: "send_message",
      text: "I have 20 minutes before going live. What is the smallest check first?"
    },
    autoAdvanceMs: 2000
  },
  {
    id: "remember",
    caption: "The reply changes shape: lower pressure, exact values.",
    page: "/",
    action: {
      type: "send_message",
      text: "Can you keep it exact, with values, not links?"
    },
    autoAdvanceMs: 2000
  },
  {
    id: "affect-receipt",
    caption: "Not a vibe — a typed affect memory, with a receipt, recalled under budget.",
    page: "/",
    action: {
      type: "show_engram_inspector",
      engramType: "affect",
      contains: "frustrat",
      holdMs: 6000
    },
    autoAdvanceMs: 500
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
