"use client";

import { Check, Circle, Play, Radio } from "lucide-react";
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
import { onDemoGraphRefresh } from "@/lib/demoBus";
import { modelId } from "@/lib/health";
import { useHealthStatus } from "@/lib/useHealthStatus";

type DreamStage = {
  stage: string;
  status: string;
  counts: Record<string, unknown>;
};

type StageView = {
  stage: string;
  item: DreamStage | null;
  state: "pending" | "running" | "done";
};

const emptyGraph: MemoryGraph = { nodes: [], links: [] };
const stageList = ["replay", "distill", "deduplicate", "reconcile", "decay", "report"];

const stageTiles = [
  { stage: "distill", key: "confirmed", label: "confirmed" },
  { stage: "deduplicate", key: "merged", label: "merged" },
  { stage: "reconcile", key: "superseded", label: "reconciled" },
  { stage: "decay", key: "decayed", label: "faded" }
];

function stageLabel(stage: string) {
  return stage.replace("_", " ");
}

function reportStats(report: DreamReport | null) {
  return (report?.stats ?? report?.stats_json ?? {}) as Record<string, unknown>;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function plural(value: number, singular: string, pluralForm = `${singular}s`) {
  return `${value.toLocaleString()} ${value === 1 ? singular : pluralForm}`;
}

function countPhrase(key: string, value: number) {
  const safeValue = value.toLocaleString();
  switch (key) {
    case "loaded":
      return `${plural(value, "memory", "memories")} replayed`;
    case "confirmed":
      return `${plural(value, "memory", "memories")} confirmed`;
    case "revised":
      return `${plural(value, "memory", "memories")} revised`;
    case "rejected":
      return `${plural(value, "memory", "memories")} released`;
    case "merged":
      return `${plural(value, "merge")} resolved`;
    case "distinct":
      return `${plural(value, "memory", "memories")} kept distinct`;
    case "superseded":
      return `${plural(value, "memory", "memories")} reconciled`;
    case "coexist":
      return `${plural(value, "memory", "memories")} kept separate`;
    case "decayed":
      return `${plural(value, "memory", "memories")} softened`;
    case "archived":
      return `${plural(value, "memory", "memories")} let go`;
    default:
      return `${safeValue} ${key.replace(/_/g, " ")}`;
  }
}

function countText(stage: string, counts: Record<string, unknown>) {
  if (stage === "report") return "cycle summary ready";

  const entries = Object.entries(counts).filter(
    ([key, value]) => key !== "duration_ms" && typeof value === "number" && value !== 0
  ) as Array<[string, number]>;

  if (entries.length) {
    return entries
      .slice(0, 2)
      .map(([key, value]) => countPhrase(key, value))
      .join(" · ");
  }

  const nested = Object.entries(counts).filter(
    ([, value]) => value && typeof value === "object" && !Array.isArray(value)
  );
  if (nested.length) return "cycle summary ready";

  return "no changes needed";
}

function pendingText(stage: string) {
  if (stage === "report") return "ready to summarize";
  return `ready to ${stageLabel(stage)}`;
}

function stageFromReport(report: DreamReport | null, stage: string): DreamStage | null {
  const stats = reportStats(report);
  if (stage === "report" && report) return { stage, status: "done", counts: stats };

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

function formatDuration(value: number | null) {
  if (value === null) return "finished";
  if (value >= 1000) {
    return `finished in ${(value / 1000).toLocaleString(undefined, {
      maximumFractionDigits: 1
    })}s`;
  }
  return `finished in ${value.toLocaleString()}ms`;
}

function statCount(report: DreamReport | null, stage: string, key: string) {
  const raw = reportStats(report)[stage];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return 0;
  return asNumber((raw as Record<string, unknown>)[key]) ?? 0;
}

function sumCounts(counts: Record<string, unknown> | undefined) {
  return Object.values(counts ?? {}).reduce<number>((sum, value) => {
    return typeof value === "number" ? sum + value : sum;
  }, 0);
}

function reportOutcome(report: DreamReport | null) {
  if (!report) return "";

  const confirmed = statCount(report, "distill", "confirmed");
  const merged = statCount(report, "deduplicate", "merged");
  const reconciled = statCount(report, "reconcile", "superseded");
  const faded = statCount(report, "decay", "decayed") + statCount(report, "decay", "archived");

  const pieces = [
    confirmed > 0 ? `${plural(confirmed, "memory", "memories")} confirmed` : null,
    merged > 0 ? `${plural(merged, "merge")} resolved` : null,
    reconciled > 0 ? `${plural(reconciled, "memory", "memories")} reconciled` : null,
    faded > 0 ? `${plural(faded, "memory", "memories")} faded` : null
  ].filter(Boolean);

  return pieces.length ? pieces.join(" · ") : "Memory graph was already aligned.";
}

function stageState(item: DreamStage | null): StageView["state"] {
  if (item?.status === "running") return "running";
  if (item?.status === "done") return "done";
  return "pending";
}

function strengthWidth(value: number) {
  return `${Math.max(4, Math.min(100, value * 100))}%`;
}

function humanError(error: unknown) {
  const raw = error instanceof Error ? error.message : "Dream run failed.";
  if (raw.toLowerCase().includes("failed to fetch")) {
    return "Can't reach the memory engine. Is the backend running?";
  }
  if (/^\d{3}\s/.test(raw)) return "The memory engine could not run the dream cycle.";
  return raw;
}

export function DreamClient() {
  const { status: healthStatus } = useHealthStatus();
  const [graph, setGraph] = useState<MemoryGraph>(emptyGraph);
  const [report, setReport] = useState<DreamReport | null>(null);
  const [stages, setStages] = useState<Record<string, DreamStage>>({});
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<Engram | null>(null);
  const [canvasEvent, setCanvasEvent] = useState<RuntimeEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [graphData, latest] = await Promise.all([fetchGraph(), fetchLatestDreamReport()]);
    setGraph(graphData);
    setSelected((current) => {
      if (!current) return current;
      return graphData.nodes.find((node) => node.id === current.id) ?? current;
    });
    setReport(latest.report);
    return graphData;
  }, []);

  useEffect(() => {
    load().catch((err: Error) => setError(humanError(err)));
  }, [load]);

  useEffect(() => {
    return onDemoGraphRefresh(async ({ resolve, reject }) => {
      try {
        await load();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }, [load]);

  useEffect(() => {
    const source = new EventSource(apiUrl("/api/events/stream"));
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as RuntimeEvent;
        if (event.kind === "dream_stage") {
          setRunning(event.status !== "done" || event.stage !== "report");
          setStages((current) => ({ ...current, [event.stage]: event }));
          if (event.stage === "report" && event.status === "done") {
            window.setTimeout(() => load().catch(() => undefined), 150);
          }
        }
        if (event.kind === "memory_event") {
          setCanvasEvent(event);
          window.setTimeout(() => fetchGraph().then(setGraph).catch(() => undefined), 350);
        }
      } catch {
        return;
      }
    };
    source.onerror = () => undefined;
    return () => source.close();
  }, [load]);

  const activeStages = useMemo(() => {
    return Object.fromEntries(
      stageList.map((stage) => [stage, stages[stage] ?? stageFromReport(report, stage)])
    ) as Record<string, DreamStage | null>;
  }, [report, stages]);

  const stageViews = useMemo<StageView[]>(() => {
    return stageList.map((stage) => {
      const item = activeStages[stage];
      return { stage, item, state: stageState(item) };
    });
  }, [activeStages]);

  async function startDream() {
    setError(null);
    setRunning(true);
    setStages({});
    try {
      const nextReport = await runLatestDream();
      setReport(nextReport);
      await load();
    } catch (err) {
      setError(humanError(err));
    } finally {
      setRunning(false);
    }
  }

  const duration = durationMs(report);
  const doneCount = stageViews.filter((stage) => stage.state === "done").length;
  const fillPercent =
    doneCount <= 1 ? 0 : Math.min(100, ((doneCount - 1) / (stageList.length - 1)) * 100);
  const dreamModel = modelId(healthStatus, "dream");

  return (
    <div className="cosmic-shell min-h-dvh px-4 py-6 md:min-h-[calc(100dvh-1.5rem)] md:px-8 lg:px-12">
      <div className="relative z-10 mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
              dream cycle
            </p>
            <h1 className="display-glow mt-3 max-w-3xl font-display text-[46px] font-medium leading-[1.02] text-starlight">
              Reverie dreams between sessions.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-dim">
              Between sessions, Reverie replays what it heard, keeps what mattered, and
              lets the rest fade.
            </p>
            {dreamModel ? (
              <p className="mt-3 inline-flex rounded-full border border-hairline bg-field-2 px-3 py-1 font-mono text-[11px] text-dim">
                dreaming on {dreamModel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={startDream}
            disabled={running}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-field/80 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ember transition hover:border-ember/50 hover:text-glow disabled:cursor-not-allowed disabled:text-faint"
          >
            <Play aria-hidden="true" size={17} strokeWidth={1.8} />
            <span>{running ? "dreaming" : "run dream cycle"}</span>
          </button>
        </header>

        {error ? (
          <p className="relative pl-4 text-sm leading-6 text-coral">
            <span className="transcript-rail absolute bottom-1 left-0 top-1 w-[3px] rounded-full" />
            {error}
          </p>
        ) : null}

        <section className="stellar-panel relative h-[55vh] min-h-[360px] overflow-hidden rounded-lg">
          <div className={`h-full transition-opacity duration-200 ${running ? "opacity-70" : ""}`}>
            <ConstellationCanvas
              graph={graph}
              selectedId={selected?.id ?? null}
              highlightedId={selected?.id ?? null}
              pulseId={running ? selected?.id ?? null : null}
              event={canvasEvent}
              onSelect={setSelected}
            />
          </div>
          {running ? (
            <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-4">
              <div className="dream-shimmer rounded-full border border-ember/30 bg-field/75 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-glow">
                dreaming...
              </div>
            </div>
          ) : null}
        </section>

        <section className="stellar-panel rounded-lg p-4 md:p-5">
            <div className="relative">
              <div className="absolute bottom-4 left-[15px] top-4 w-px bg-hairline md:left-0 md:right-0 md:top-[15px] md:h-px md:w-auto" />
              <div
                className="brand-gradient absolute left-[15px] top-4 w-px md:hidden"
                style={{ height: `${fillPercent}%`, width: "1px" }}
              />
            <div
              className="brand-gradient absolute left-0 top-[15px] hidden h-px md:block"
              style={{ width: `${fillPercent}%` }}
            />
            <div className="relative grid gap-4 md:grid-cols-6">
              {stageViews.map(({ stage, item, state }) => (
                <div key={stage} className="grid grid-cols-[32px_1fr] gap-3 md:block">
                  <div
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border ${
                      state === "done"
                        ? "border-sage/50 bg-field text-sage"
                        : state === "running"
                          ? "border-ember/70 bg-field text-ember ring-2 ring-ember/20"
                          : "border-hairline bg-field text-faint"
                    }`}
                  >
                    {state === "running" ? (
                      <Radio
                        aria-hidden="true"
                        className="animate-pulse"
                        size={15}
                        strokeWidth={1.8}
                      />
                    ) : state === "done" ? (
                      <Check aria-hidden="true" size={16} strokeWidth={1.8} />
                    ) : (
                      <Circle aria-hidden="true" size={12} strokeWidth={1.8} />
                    )}
                  </div>
                  <div className="md:mt-4">
                    <p
                      className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
                        state === "pending" ? "text-faint" : "text-dim"
                      }`}
                    >
                      {stageLabel(stage)}
                    </p>
                    <p
                      className={`mt-1 text-sm leading-5 ${
                        state === "pending" ? "text-faint" : "text-starlight"
                      }`}
                    >
                      {item ? countText(stage, item.counts) : pendingText(stage)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="stellar-panel rounded-lg p-5">
            <p className="text-[14px] font-medium text-starlight">
              latest report
            </p>
            {report ? (
              <div className="mt-4 space-y-5">
                <div>
                  <p className="font-display text-[32px] leading-tight text-starlight md:text-[38px]">
                    {reportOutcome(report)}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-dim">
                    {formatDuration(duration)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
                  {stageTiles.map((tile) => {
                    const item = stageFromReport(report, tile.stage);
                    const total = statCount(report, tile.stage, tile.key) || sumCounts(item?.counts);
                    return (
                      <div key={tile.label} className="min-w-0">
                        <p
                          className={`font-display text-[56px] font-medium leading-none md:text-[64px] ${
                            total > 0 ? "text-ember" : "text-faint"
                          }`}
                        >
                          {total.toLocaleString()}
                        </p>
                        <p className="mt-2 text-[13px] font-medium text-starlight">
                          {tile.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="max-w-2xl text-sm leading-6 text-starlight">
                  Reverie has not dreamed yet. End a session, then run the dream cycle
                  to watch memories consolidate.
                </p>
                <button
                  type="button"
                  onClick={startDream}
                  disabled={running}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ember/40 bg-field-2 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ember transition hover:border-ember hover:text-glow disabled:cursor-not-allowed disabled:text-faint"
                >
                  <Play aria-hidden="true" size={17} strokeWidth={1.8} />
                  <span>{running ? "dreaming" : "run dream cycle"}</span>
                </button>
              </div>
            )}
          </section>

          <section className="stellar-panel rounded-lg p-5">
            <p className="text-[14px] font-medium text-starlight">
              selected memory
            </p>
            {selected ? (
              <div className="mt-4">
                <p className="brand-gradient-text font-mono text-[10px] uppercase tracking-[0.08em]">
                  {selected.type.replace("_", " ")}
                </p>
                <p className="mt-2 text-sm leading-6 text-starlight">{selected.content}</p>
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-dim">
                    <span>strength</span>
                    <span>{selected.strength.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-void">
                    <div
                      className="brand-gradient h-full rounded-full"
                      style={{ width: strengthWidth(selected.strength) }}
                    />
                  </div>
                </div>
                <p className="mt-3 font-mono text-[11px] text-dim">
                  confidence {selected.confidence.toFixed(2)}
                </p>
              </div>
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-field-2 text-faint">
                  <Circle aria-hidden="true" size={22} strokeWidth={1.5} />
                </span>
                <p className="mt-4 max-w-56 text-sm leading-6 text-dim">
                  Select a star to inspect the memory that moved during the cycle.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
