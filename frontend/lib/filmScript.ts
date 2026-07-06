export type DemoPage = "/" | "/dream" | "/evals" | "/architecture";

export type DemoAction =
  | { type: "reset"; createSessionTitle: string }
  | { type: "create_session"; title: string; showMemoryPack?: boolean }
  | { type: "send_message"; text: string; settleMs?: number }
  | { type: "end_session" }
  | { type: "run_dream"; endCurrentSession?: boolean }
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
    caption: "Reverie starts knowing nothing.",
    page: "/",
    action: { type: "reset", createSessionTitle: "Session 1" },
    autoAdvanceMs: 4000
  },
  {
    id: "first-friction",
    caption: "It listens, and keeps what matters.",
    page: "/",
    action: {
      type: "send_message",
      text:
        "I keep freezing when the midterm leans on chain rule. Nested functions make me panic and second-guess myself."
    },
    autoAdvanceMs: 7000
  },
  {
    id: "worked-example",
    caption: "It listens, and keeps what matters.",
    page: "/",
    action: {
      type: "send_message",
      text:
        "Could we start with actual numbers? Example first, then rules in the abstract, and the rule usually lands."
    },
    autoAdvanceMs: 7000
  },
  {
    id: "dream-cycle",
    caption: "Between sessions, it dreams, merging, resolving, forgetting.",
    page: "/dream",
    action: { type: "run_dream", endCurrentSession: true },
    autoAdvanceMs: 9000
  },
  {
    id: "second-day",
    caption: "A day passes. Unused memories fade.",
    page: "/",
    action: { type: "create_session", title: "Session 2", showMemoryPack: true },
    autoAdvanceMs: 9000
  },
  {
    id: "recall",
    caption: "It recalls only what fits the budget.",
    page: "/",
    action: {
      type: "send_message",
      text: "Okay, I have 20 minutes tonight. Where were we?"
    },
    autoAdvanceMs: 9000
  },
  {
    id: "remember",
    caption: "And it remembers her.",
    page: "/",
    action: {
      type: "send_message",
      text: "Can we do one small worked example before the rule?"
    },
    autoAdvanceMs: 9000
  },
  {
    id: "measured",
    caption: "Measured, not asserted.",
    page: "/evals",
    action: { type: "idle" },
    autoAdvanceMs: 7000
  },
  {
    id: "architecture",
    caption: "The engine is the product.",
    page: "/architecture",
    action: { type: "idle" }
  }
];
