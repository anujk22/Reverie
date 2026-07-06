"use client";

import { BarChart3, Moon, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { HealthPanel } from "@/components/HealthPanel";
import { resetDemo, runEvalSuite, runLatestDream, runSmokeEval } from "@/lib/api";

type ActionKey = "dream" | "evals" | "smoke" | "reset";

type ActionStatus = {
  state: "ready" | "running" | "done" | "waiting" | "error";
  message: string;
};

type ActionCard = {
  key: ActionKey;
  title: string;
  description: string;
  button: string;
  icon: typeof Moon;
  run: () => Promise<string>;
};

const initialStatuses: Record<ActionKey, ActionStatus> = {
  dream: {
    state: "ready",
    message: "Ready to consolidate the latest session."
  },
  evals: {
    state: "ready",
    message: "Ready to request a live comparison."
  },
  smoke: {
    state: "ready",
    message: "Ready to check one judge call."
  },
  reset: {
    state: "ready",
    message: "Ready to restore the demo seed state."
  }
};

function statusTone(state: ActionStatus["state"]) {
  if (state === "done") return "border-sage/40 text-sage";
  if (state === "running") return "border-ember/50 text-ember";
  if (state === "waiting") return "border-gold/40 text-gold";
  if (state === "error") return "border-coral/50 text-coral";
  return "border-hairline text-dim";
}

function friendlyError(error: unknown) {
  const raw = error instanceof Error ? error.message : "The action could not complete.";
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown };
    if (typeof parsed.detail === "string") {
      if (parsed.detail.toLowerCase().includes("no session")) {
        return "Finish or seed a session first.";
      }
      if (parsed.detail.toLowerCase().includes("disabled")) {
        return "This environment is not ready for that action.";
      }
      return parsed.detail;
    }
  } catch {
    // The backend often returns plain text, so keep the fallback gentle.
  }
  if (raw.toLowerCase().includes("failed to fetch")) return "The backend is not reachable yet.";
  return "The backend could not complete this action.";
}

export function ConductorClient() {
  const [statuses, setStatuses] = useState<Record<ActionKey, ActionStatus>>(initialStatuses);

  async function runAction(card: ActionCard) {
    setStatuses((current) => ({
      ...current,
      [card.key]: { state: "running", message: "Working..." }
    }));
    try {
      const message = await card.run();
      setStatuses((current) => ({
        ...current,
        [card.key]: {
          state: message.startsWith("Waiting") ? "waiting" : "done",
          message
        }
      }));
    } catch (error) {
      setStatuses((current) => ({
        ...current,
        [card.key]: { state: "error", message: friendlyError(error) }
      }));
    }
  }

  const cards: ActionCard[] = [
    {
      key: "dream",
      title: "Run dream cycle",
      description: "Consolidate the latest session into durable memories.",
      button: "Run dream cycle",
      icon: Moon,
      run: async () => {
        await runLatestDream();
        return "Dream complete. Review the latest report.";
      }
    },
    {
      key: "evals",
      title: "Run evals",
      description: "Compare Reverie against no-memory and full-history baselines.",
      button: "Run evals",
      icon: BarChart3,
      run: async () => {
        const results = await runEvalSuite();
        return results.real_run
          ? "Eval comparison ready."
          : "Waiting for a live eval run.";
      }
    },
    {
      key: "smoke",
      title: "Run smoke judge",
      description: "Check one personalization judgment and model-call cost.",
      button: "Run smoke judge",
      icon: ShieldCheck,
      run: async () => {
        const result = await runSmokeEval();
        return `${result.mode} judge returned ${result.score.toLocaleString(undefined, {
          maximumFractionDigits: 2
        })}.`;
      }
    },
    {
      key: "reset",
      title: "Reset demo",
      description: "Restore the seeded learner so the demo can start cleanly.",
      button: "Reset demo",
      icon: RotateCcw,
      run: async () => {
        await resetDemo();
        return "Demo reset. Return to Session to begin again.";
      }
    }
  ];

  return (
    <div className="cosmic-shell min-h-dvh px-4 py-6 md:min-h-[calc(100dvh-1.5rem)] md:px-8 lg:px-12">
      <div className="relative z-10 mx-auto max-w-6xl space-y-6">
        <header>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
            conductor
          </p>
          <h1 className="display-glow mt-3 max-w-3xl font-display text-[46px] font-medium leading-[1.02] text-starlight">
            Demo control room.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-dim">
            Check the live system, trigger consolidation, and reset the demo without
            leaving the product surface.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <HealthPanel />
          {cards.map((card) => {
            const Icon = card.icon;
            const status = statuses[card.key];
            const running = status.state === "running";
            return (
              <section key={card.key} className="stellar-panel flex flex-col rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
                      {card.title}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-starlight">{card.description}</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-field-2 text-ember">
                    <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                  </div>
                </div>
                <div className="mt-5 flex flex-1 flex-col justify-end gap-4">
                  <p
                    className={`rounded-lg border bg-field-2/70 px-3 py-2 font-mono text-[11px] ${statusTone(
                      status.state
                    )}`}
                    aria-live="polite"
                  >
                    {status.message}
                  </p>
                  <button
                    type="button"
                    onClick={() => runAction(card)}
                    disabled={running}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-hairline bg-field/80 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ember transition hover:border-ember/50 hover:text-glow disabled:cursor-not-allowed disabled:text-faint"
                  >
                    <Play aria-hidden="true" size={17} strokeWidth={1.8} />
                    <span>{running ? "running" : card.button}</span>
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
