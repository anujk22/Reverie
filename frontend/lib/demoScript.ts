export type DemoPage = "/" | "/dream" | "/evals";

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

export const demoScript: DemoBeat[] = [
  {
    id: "cold-start",
    caption: "Reverie starts knowing nothing.",
    page: "/",
    action: { type: "reset", createSessionTitle: "Session 1" },
    autoAdvanceMs: 4000
  },
  {
    id: "first-friction",
    caption: "It listens - and extracts what's worth keeping.",
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
    caption: "Each memory is an event: observed, typed, sourced to her words.",
    page: "/",
    action: {
      type: "send_message",
      text:
        "Could we start with actual numbers? Example first, then rules in the abstract, and the rule usually lands."
    },
    autoAdvanceMs: 7000
  },
  {
    id: "late-work",
    caption: "Watch the mind light up as memories form.",
    page: "/",
    action: {
      type: "send_message",
      text: "I study late after work, so short practice sets stick better.",
      settleMs: 3000
    },
    autoAdvanceMs: 9000
  },
  {
    id: "dream-cycle",
    caption:
      "Between sessions, Reverie dreams: it replays, merges duplicates, and lets stale memories fade.",
    page: "/dream",
    action: { type: "run_dream", endCurrentSession: true },
    autoAdvanceMs: 9000
  },
  {
    id: "second-day",
    caption:
      "A new day. It recalls only what fits a fixed token budget - and shows what it left out.",
    page: "/",
    action: { type: "create_session", title: "Session 2", showMemoryPack: true },
    autoAdvanceMs: 9000
  },
  {
    id: "recall",
    caption:
      "It remembers Maya - her mistake, her preference, her schedule - without replaying the transcript.",
    page: "/",
    action: {
      type: "send_message",
      text: "Okay, I have 20 minutes tonight. Where were we?"
    },
    autoAdvanceMs: 9000
  },
  {
    id: "measured",
    caption:
      "Measured: more personal than no-memory, a fraction of full-history's tokens.",
    page: "/evals",
    action: { type: "idle" },
    autoAdvanceMs: 9000
  },
  {
    id: "general",
    caption: "And the engine never knew calculus. Swap one prompt, keep the mind.",
    page: "/",
    action: { type: "idle" }
  }
];
