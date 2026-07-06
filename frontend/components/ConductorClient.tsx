"use client";

import {
  BarChart3,
  CalendarDays,
  Clock3,
  Moon,
  Play,
  RotateCcw,
  ScrollText
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HealthPanel } from "@/components/HealthPanel";
import {
  advanceClock,
  apiUrl,
  createSession,
  endSession,
  fetchConductorScript,
  resetDemo,
  runEvalSuite,
  runLatestDream,
  type SessionRecord
} from "@/lib/api";

type ActionStatus = {
  state: "idle" | "running" | "done" | "error";
  message: string;
};

type ActionCard = {
  title: string;
  description: string;
  icon: typeof Moon;
  run: () => Promise<string>;
};

function initialStatus(): ActionStatus {
  return { state: "idle", message: "idle" };
}

function statusTone(state: ActionStatus["state"]) {
  if (state === "done") return "border-sage/40 text-sage";
  if (state === "running") return "border-ember/50 text-ember";
  if (state === "error") return "border-coral/50 text-coral";
  return "border-hairline text-dim";
}

function friendlyError(error: unknown) {
  const raw = error instanceof Error ? error.message : "The action could not complete.";
  if (raw.toLowerCase().includes("failed to fetch")) return "The backend is not reachable yet.";
  if (raw.toLowerCase().includes("no session")) return "Create or play a session first.";
  return raw.replace(/^\d+\s*/, "") || "The backend could not complete this action.";
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function streamChat(sessionId: string, message: string) {
  const response = await fetch(apiUrl(`/api/sessions/${sessionId}/chat`), {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message })
  });
  if (!response.ok || !response.body) throw new Error(`${response.status} ${response.statusText}`);
  const reader = response.body.getReader();
  while (true) {
    const { done } = await reader.read();
    if (done) return;
  }
}

export function ConductorClient() {
  const [statuses, setStatuses] = useState<ActionStatus[]>(
    Array.from({ length: 7 }, initialStatus)
  );
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);

  function setStatus(index: number, status: ActionStatus) {
    setStatuses((current) => current.map((item, idx) => (idx === index ? status : item)));
  }

  async function playScript(name: string, title: string) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const script = await fetchConductorScript(name);
    const session = await createSession(title || script.title);
    setActiveSession(session);
    for (const turn of script.turns) {
      if (!reduceMotion) await wait(Math.min(1200, turn.student.length * 25));
      await streamChat(session.id, turn.student);
      await wait(reduceMotion ? 30 : 280);
    }
    return session;
  }

  const cards = useMemo<ActionCard[]>(
    () => [
      {
        title: "Reset demo",
        description: "Clear the local story state and start from a blank mind.",
        icon: RotateCcw,
        run: async () => {
          await resetDemo();
          setActiveSession(null);
          return "reset complete";
        }
      },
      {
        title: "Play session 1 script",
        description: "Replay Lena's first-session turns through the normal chat route.",
        icon: ScrollText,
        run: async () => {
          const session = await playScript("session1", "Session 1 - chain rule");
          return `played ${session.title}`;
        }
      },
      {
        title: "End session and dream",
        description: "Close the active session and run the consolidation cycle.",
        icon: Moon,
        run: async () => {
          if (activeSession) {
            await endSession(activeSession.id);
            setActiveSession(null);
          } else {
            await runLatestDream();
          }
          return "dream cycle complete";
        }
      },
      {
        title: "Advance clock +1 day",
        description: "Move the simulated app date forward for the dimming beat.",
        icon: Clock3,
        run: async () => {
          const result = await advanceClock(1);
          return `clock offset ${Math.round(result.clock_offset_seconds / 86400)} days`;
        }
      },
      {
        title: "Advance clock +3 days",
        description: "Stress the forgetting curve with a larger time skip.",
        icon: CalendarDays,
        run: async () => {
          const result = await advanceClock(3);
          return `clock offset ${Math.round(result.clock_offset_seconds / 86400)} days`;
        }
      },
      {
        title: "Play session 2 script",
        description: "Start the recall session and route every turn through live chat.",
        icon: ScrollText,
        run: async () => {
          const session = await playScript("session2", "Session 2 - chain rule recall");
          return `played ${session.title}`;
        }
      },
      {
        title: "Run evals",
        description: "Run the three-condition comparison and publish latest JSON.",
        icon: BarChart3,
        run: async () => {
          const results = await runEvalSuite();
          return results.real_run ? "eval comparison ready" : "mock eval complete";
        }
      }
    ],
    [activeSession]
  );

  const runAction = useCallback(async (index: number) => {
    const card = cards[index];
    setStatus(index, { state: "running", message: "running" });
    try {
      const message = await card.run();
      setStatus(index, { state: "done", message });
    } catch (error) {
      setStatus(index, { state: "error", message: friendlyError(error) });
    }
  }, [cards]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return;
      }
      const index = Number(event.key) - 1;
      if (index >= 0 && index < cards.length) {
        event.preventDefault();
        runAction(index);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cards, runAction]);

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
            Drive the recording from repeatable actions while the app stays on live backend paths.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <HealthPanel />
          {cards.map((card, index) => {
            const Icon = card.icon;
            const status = statuses[index];
            const running = status.state === "running";
            return (
              <section key={card.title} className="stellar-panel flex flex-col rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
                      {index + 1} · {card.title}
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
                    onClick={() => runAction(index)}
                    disabled={running}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-hairline bg-field/80 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ember transition hover:border-ember/50 hover:text-glow disabled:cursor-not-allowed disabled:text-faint"
                  >
                    <Play aria-hidden="true" size={17} strokeWidth={1.8} />
                    <span>{running ? "running" : "run action"}</span>
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
