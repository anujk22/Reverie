"use client";

import { Check, Circle, Moon, Play, Radio } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConstellationCanvas } from "@/components/ConstellationCanvas";
import {
  apiUrl,
  fetchGraph,
  fetchLatestDreamReport,
  runLatestDream,
  type DreamReport,
  type Engram,
  type MemoryGraph,
  type RuntimeEvent
} from "@/lib/api";

type DreamStage = {
  stage: string;
  status: string;
  counts: Record<string, unknown>;
};

const emptyGraph: MemoryGraph = { nodes: [], links: [] };
const stageList = ["replay", "distill", "deduplicate", "reconcile", "decay", "report"];

function stageLabel(stage: string) {
  return stage.replace("_", " ");
}

function reportStats(report: DreamReport | null) {
  return (report?.stats ?? report?.stats_json ?? {}) as Record<string, unknown>;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function countText(counts: Record<string, unknown>) {
  const entries = Object.entries(counts).filter(
    ([, value]) => typeof value === "number" && value !== 0
  ) as Array<[string, number]>;
  if (entries.length) {
    return entries.map(([key, value]) => `${value} ${key.replace("_", " ")}`).join(" · ");
  }
  const nested = Object.entries(counts).filter(
    ([, value]) => value && typeof value === "object" && !Array.isArray(value)
  );
  if (nested.length) {
    return `${nested.length} stage summaries`;
  }
  return "no changes";
}

function stageFromReport(report: DreamReport | null, stage: string): DreamStage | null {
  const stats = reportStats(report);
  const raw = stats[stage];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const counts = Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      ([, value]) => typeof value === "number"
    )
  ) as Record<string, number>;
  return { stage, status: "done", counts };
}

function durationMs(report: DreamReport | null) {
  return asNumber(report?.duration_ms) ?? asNumber(reportStats(report).duration_ms);
}

function sumCounts(counts: Record<string, unknown> | undefined) {
  return Object.values(counts ?? {}).reduce<number>((sum, value) => {
    return typeof value === "number" ? sum + value : sum;
  }, 0);
}

export function DreamClient() {
  const [graph, setGraph] = useState<MemoryGraph>(emptyGraph);
  const [report, setReport] = useState<DreamReport | null>(null);
  const [stages, setStages] = useState<Record<string, DreamStage>>({});
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<Engram | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [graphData, latest] = await Promise.all([fetchGraph(), fetchLatestDreamReport()]);
    setGraph(graphData);
    setReport(latest.report);
  }, []);

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [load]);

  useEffect(() => {
    const source = new EventSource(apiUrl("/api/events/stream"));
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as RuntimeEvent;
        if (event.kind === "dream_stage") {
          setRunning(event.status !== "done" || event.stage !== "report");
          setStages((current) => ({ ...current, [event.stage]: event }));
        }
        if (event.kind === "memory_event") {
          window.setTimeout(() => fetchGraph().then(setGraph).catch(() => undefined), 350);
        }
      } catch {
        return;
      }
    };
    source.onerror = () => undefined;
    return () => source.close();
  }, []);

  const activeStages = useMemo(() => {
    return Object.fromEntries(
      stageList.map((stage) => [stage, stages[stage] ?? stageFromReport(report, stage)])
    ) as Record<string, DreamStage | null>;
  }, [report, stages]);

  async function startDream() {
    setError(null);
    setRunning(true);
    setStages({});
    try {
      const nextReport = await runLatestDream();
      setReport(nextReport);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dream run failed.");
    } finally {
      setRunning(false);
    }
  }

  const duration = durationMs(report);

  return (
    <div className="min-h-dvh bg-void px-4 py-6 md:px-8 lg:px-12">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,720px)_minmax(300px,1fr)]">
        <section className="space-y-6">
          <header className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
              dream cycle
            </p>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="max-w-2xl font-display text-[44px] leading-[1.05] text-starlight">
                  Reverie is dreaming over memory evidence.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-dim">
                  Replay, distill, merge, reconcile, decay, and report are rendered from
                  backend events. The screen is a window into the memory engine, not a
                  scripted animation.
                </p>
              </div>
              <button
                type="button"
                onClick={startDream}
                disabled={running}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-field px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ember transition hover:border-ember/50 hover:text-glow disabled:cursor-not-allowed disabled:text-faint"
              >
                <Play aria-hidden="true" size={17} strokeWidth={1.8} />
                <span>{running ? "dreaming" : "run latest dream"}</span>
              </button>
            </div>
            {error ? (
              <p className="border-l-2 border-coral pl-3 text-sm leading-6 text-coral">
                {error}
              </p>
            ) : null}
          </header>

          <div className="h-64 overflow-hidden rounded-2xl border border-hairline bg-void">
            <ConstellationCanvas
              graph={graph}
              selectedId={selected?.id ?? null}
              highlightedId={selected?.id ?? null}
              pulseId={running ? selected?.id ?? null : null}
              onSelect={setSelected}
            />
          </div>

          <div className="grid gap-3">
            {stageList.map((stage) => {
              const item = activeStages[stage];
              const isRunning = item?.status === "running";
              const isDone = item?.status === "done";
              return (
                <div key={stage} className="rounded-xl border border-hairline bg-field p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
                        {stageLabel(stage)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-starlight">
                        {item ? countText(item.counts) : "waiting for event"}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-field-2">
                      {isRunning ? (
                        <Radio
                          aria-hidden="true"
                          className="animate-pulse text-ember"
                          size={16}
                          strokeWidth={1.8}
                        />
                      ) : isDone ? (
                        <Check aria-hidden="true" className="text-sage" size={17} strokeWidth={1.8} />
                      ) : (
                        <Circle aria-hidden="true" className="text-faint" size={14} strokeWidth={1.8} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-hairline bg-field p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
              latest report
            </p>
            {report ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="font-mono text-[11px] text-dim">duration</p>
                  <p className="mt-1 font-mono text-2xl text-glow">
                    {duration ? `${duration.toLocaleString()} ms` : "recorded"}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {stageList.slice(0, 4).map((stage) => {
                    const item = stageFromReport(report, stage);
                    const total = sumCounts(item?.counts);
                    return (
                      <div key={stage} className="rounded-lg border border-hairline bg-field-2 p-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-dim">
                          {stage}
                        </p>
                        <p className="mt-1 font-mono text-lg text-starlight">{total}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-dim">
                No dream report has been written yet. Run a real dream to create one.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-hairline bg-field p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
              selected memory
            </p>
            {selected ? (
              <div className="mt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ember">
                  {selected.type.replace("_", " ")}
                </p>
                <p className="mt-2 text-sm leading-6 text-starlight">{selected.content}</p>
                <p className="mt-3 font-mono text-[11px] text-dim">
                  confidence {selected.confidence.toFixed(2)} · strength{" "}
                  {selected.strength.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-dim">
                Click a star to inspect the memory that moved during the cycle.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-hairline bg-field p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
              contract
            </p>
            <p className="mt-3 text-sm leading-6 text-starlight">
              Dream stages advance from `/api/events/stream`. Saved reports come
              from `dream_reports`, and the mini-sky reads from `/api/memory/graph`.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
