"use client";

import { BarChart3, Play, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  apiUrl,
  fetchEvalResults,
  runEvalSuite,
  runSmokeEval,
  type EvalResults,
  type RuntimeEvent,
  type SmokeEvalResult
} from "@/lib/api";

type MetricSpec = {
  title: string;
  rows: Array<Record<string, unknown>>;
  valueKeys: string[];
  kind: "score" | "tokens";
  lowerIsBetter?: boolean;
};

type HeadlineTile = {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
};

const conditionTone: Record<string, string> = {
  "no memory": "bg-faint",
  no_memory: "bg-faint",
  "full history": "bg-moth",
  full_history: "bg-moth",
  reverie: "brand-gradient"
};

const legend = [
  { label: "no memory", className: "bg-faint" },
  { label: "full history", className: "bg-moth" },
  { label: "reverie", className: "brand-gradient" }
];

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rowValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function normalizeCondition(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/_/g, " ")
    .trim();
}

function conditionKey(row: Record<string, unknown>) {
  return normalizeCondition(row.condition ?? row.name ?? row.label);
}

function conditionLabel(row: Record<string, unknown>) {
  const key = conditionKey(row);
  if (key.includes("no memory")) return "no memory";
  if (key.includes("full history")) return "full history";
  if (key.includes("reverie")) return "reverie";
  return key || "condition";
}

function rowLabel(row: Record<string, unknown>) {
  const session = row.session ? `session ${row.session}` : "";
  return [conditionLabel(row), session].filter(Boolean).join(" · ");
}

function conditionClass(row: Record<string, unknown>) {
  const condition = conditionKey(row);
  return conditionTone[condition] ?? "bg-moth";
}

function formatScore(value: number | null) {
  if (value === null) return "waiting on run";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatTokens(value: number | null) {
  if (value === null) return "waiting on run";
  return value.toLocaleString();
}

function formatLatency(value: number | null) {
  if (value === null) return "waiting on run";
  if (value < 0) return "not reported";
  return `${value.toLocaleString()}ms`;
}

function formatMetricValue(value: number, kind: MetricSpec["kind"]) {
  if (kind === "tokens") return value.toLocaleString();
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function findConditionValue(
  rows: Array<Record<string, unknown>> | undefined,
  names: string[],
  keys: string[]
) {
  const row = rows?.find((item) => {
    const condition = conditionKey(item);
    return names.some((name) => condition.includes(name));
  });
  return row ? rowValue(row, keys) : null;
}

function formatDelta(reverie: number | null, baseline: number | null) {
  if (reverie === null || baseline === null) return "waiting on run";
  if (baseline === 0) {
    return `${(reverie - baseline).toLocaleString(undefined, {
      maximumFractionDigits: 2,
      signDisplay: "always"
    })} vs no memory`;
  }
  const delta = ((reverie - baseline) / Math.abs(baseline)) * 100;
  return `${delta.toLocaleString(undefined, {
    maximumFractionDigits: 0,
    signDisplay: "always"
  })}% vs no memory`;
}

function formatTokenSavings(reverie: number | null, fullHistory: number | null) {
  if (reverie === null || fullHistory === null) return "waiting on run";
  return `${Math.max(0, fullHistory - reverie).toLocaleString()} tokens saved`;
}

function smokeNumber(call: Record<string, unknown> | null, key: string) {
  return asNumber(call?.[key]);
}

function modeLabel(value: string) {
  return value === "mock" ? "mock" : value === "live" ? "live" : value;
}

function humanPurpose(value: string) {
  const labels: Record<string, string> = {
    chat: "Tutor replies",
    consolidate: "Dream consolidation",
    observer: "Memory observer",
    observe: "Memory observation",
    tutor: "Tutor replies",
    embed: "Embeddings",
    eval_judge: "Judge calls",
    extract_session_level: "Dream extraction"
  };
  return labels[value] ?? value.replace(/_/g, " ");
}

function humanError(error: unknown) {
  const raw = error instanceof Error ? error.message : "Eval run failed.";
  if (raw.toLowerCase().includes("failed to fetch")) {
    return "Can't reach the memory engine. Is the backend running?";
  }
  if (/^\d{3}\s/.test(raw)) return "The eval run could not complete.";
  return raw;
}

function ChartBlock({ title, rows, valueKeys, kind, lowerIsBetter = false }: MetricSpec) {
  const values = rows
    .map((row) => rowValue(row, valueKeys))
    .filter((value): value is number => value !== null);
  const max = Math.max(1, ...values);
  const winner = values.length
    ? values.reduce((best, value) => {
        if (lowerIsBetter) return value < best ? value : best;
        return value > best ? value : best;
      }, values[0])
    : null;

  return (
    <section className="stellar-panel rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
          {title}
        </h2>
        <BarChart3 aria-hidden="true" className="text-dim" size={17} strokeWidth={1.8} />
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        {legend.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-dim"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${item.className}`} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {rows.length ? (
          rows.map((row, index) => {
            const value = rowValue(row, valueKeys) ?? 0;
            const width = `${Math.max(4, (value / max) * 100)}%`;
            const isWinner = winner !== null && Math.abs(value - winner) < 0.0001;
            return (
              <div key={`${title}-${index}`} className={isWinner ? "" : "opacity-60"}>
                <div className="mb-1 flex items-center justify-between gap-3 font-mono text-[11px] text-dim">
                  <span>{rowLabel(row)}</span>
                  <span className="min-w-[4.5rem] text-right text-starlight">
                    {formatMetricValue(value, kind)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-void">
                  <div
                    className={`h-full rounded-full ${conditionClass(row)} ${
                      isWinner ? "shadow-[0_0_18px_rgba(245,71,107,0.28)]" : ""
                    }`}
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm leading-6 text-dim">Waiting on a real run.</p>
        )}
      </div>
    </section>
  );
}

export function EvalsClient() {
  const [results, setResults] = useState<EvalResults | null>(null);
  const [smoke, setSmoke] = useState<SmokeEvalResult | null>(null);
  const [progress, setProgress] = useState<{ condition: string; session: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setResults(await fetchEvalResults());
    } catch (err) {
      setError(humanError(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const source = new EventSource(apiUrl("/api/events/stream"));
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as RuntimeEvent;
        if (event.kind === "eval_progress") {
          setProgress({ condition: event.condition, session: event.session });
        }
      } catch {
        return;
      }
    };
    source.onerror = () => undefined;
    return () => source.close();
  }, []);

  const headlineTiles = useMemo<HeadlineTile[]>(() => {
    const personalizationKeys = ["score", "value", "personalization"];
    const tokenKeys = ["tokens", "value"];
    const reverieScore = findConditionValue(results?.personalization, ["reverie"], personalizationKeys);
    const noMemoryScore = findConditionValue(
      results?.personalization,
      ["no memory"],
      personalizationKeys
    );
    const reverieTokens = findConditionValue(results?.tokens, ["reverie"], tokenKeys);
    const fullHistoryTokens = findConditionValue(results?.tokens, ["full history"], tokenKeys);

    return [
      {
        label: "Reverie personalization",
        value: formatScore(reverieScore),
        note: "score from the memory condition"
      },
      {
        label: "Lift over baseline",
        value: formatDelta(reverieScore, noMemoryScore),
        note: "compared with no memory",
        accent: true
      },
      {
        label: "Context efficiency",
        value: formatTokenSavings(reverieTokens, fullHistoryTokens),
        note: "compared with full history"
      }
    ];
  }, [results]);

  const chartSpecs = useMemo<MetricSpec[]>(() => {
    if (!results?.real_run) return [];
    return [
      {
        title: "personalization score",
        rows: results.personalization ?? [],
        valueKeys: ["score", "value", "personalization"],
        kind: "score"
      },
      {
        title: "recall precision",
        rows: results.recall_precision ?? [],
        valueKeys: ["precision", "value", "recall_precision"],
        kind: "score"
      },
      {
        title: "tokens per session",
        rows: results.tokens ?? [],
        valueKeys: ["tokens", "value"],
        kind: "tokens",
        lowerIsBetter: true
      }
    ];
  }, [results]);

  async function runFullEval() {
    setLoading(true);
    setError(null);
    try {
      setResults(await runEvalSuite());
      setProgress(null);
    } catch (err) {
      setError(humanError(err));
    } finally {
      setLoading(false);
    }
  }

  async function runSmoke() {
    setLoading(true);
    setError(null);
    try {
      setSmoke(await runSmokeEval());
    } catch (err) {
      setError(humanError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cosmic-shell min-h-dvh px-4 py-6 md:min-h-[calc(100dvh-1.5rem)] md:px-8 lg:px-12">
      <div className="relative z-10 mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
              eval honesty
            </p>
            <h1 className="display-glow mt-3 max-w-3xl font-display text-[46px] font-medium leading-[1.02] text-starlight">
              Does memory make the response more personal?
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-dim">
              Scores come from real runs only. Nothing is staged.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runFullEval}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-field/80 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ember transition hover:border-ember/50 hover:text-glow disabled:cursor-not-allowed disabled:text-faint"
            >
              <Play aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>{loading ? "running" : "run evals"}</span>
            </button>
            <button
              type="button"
              onClick={runSmoke}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-field-2/80 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-dim transition hover:text-starlight disabled:cursor-not-allowed disabled:text-faint"
            >
              <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>run smoke judge</span>
            </button>
          </div>
        </header>

        {error ? (
          <p className="relative pl-4 text-sm leading-6 text-coral">
            <span className="transcript-rail absolute bottom-1 left-0 top-1 w-[3px] rounded-full" />
            {error}
          </p>
        ) : null}

        {loading && progress ? (
          <section className="stellar-panel rounded-lg p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
              live eval progress
            </p>
            <p className="mt-2 text-sm leading-6 text-starlight">
              {progress.condition.replace(/_/g, " ")} · session {progress.session}
            </p>
          </section>
        ) : null}

        {results?.real_run ? (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              {headlineTiles.map((tile) => (
                <div key={tile.label} className="stellar-panel rounded-lg p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-dim">
                    {tile.label}
                  </p>
                  <p
                    className={`mt-3 font-display text-[34px] leading-tight ${
                      tile.accent ? "brand-gradient-text" : "text-starlight"
                    }`}
                  >
                    {tile.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-dim">{tile.note}</p>
                </div>
              ))}
            </section>

            {results.headline ? (
              <section className="stellar-panel rounded-lg p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
                  takeaway
                </p>
                <p className="mt-3 font-display text-[38px] leading-[1.05] text-starlight">
                  {results.headline}
                </p>
              </section>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              {chartSpecs.map((spec) => (
                <ChartBlock key={spec.title} {...spec} />
              ))}
            </div>

            {results.forgetting_check ? (
              <section className="stellar-panel rounded-lg p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
                  forgetting check
                </p>
                <p className="mt-2 text-sm leading-6 text-starlight">
                  Forgetting check:{" "}
                  {results.forgetting_check === "pass"
                    ? "passed, the stale limits quiz memory never resurfaced."
                    : "needs review, the stale limits quiz memory resurfaced."}
                </p>
              </section>
            ) : null}
          </div>
        ) : (
          <section className="stellar-panel rounded-lg p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
              waiting for real comparisons
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-starlight">
              No live eval run yet. Run the suite to compare Reverie against no-memory
              and full-history baselines.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-dim">
              Scores come from real runs only, so this page stays quiet until the
              comparison is ready.
            </p>
          </section>
        )}

        {smoke ? (
          <section className="stellar-panel rounded-lg p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
                  smoke judge
                </p>
                <p className="mt-2 text-sm leading-6 text-starlight">{smoke.reason}</p>
              </div>
              <p className="font-mono text-3xl text-ember">
                {formatScore(asNumber(smoke.score))}
              </p>
            </div>
            {smoke.llm_call ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  { label: "mode", value: modeLabel(smoke.mode) },
                  {
                    label: "prompt tokens",
                    value: formatTokens(smokeNumber(smoke.llm_call, "prompt_tokens"))
                  },
                  {
                    label: "completion tokens",
                    value: formatTokens(smokeNumber(smoke.llm_call, "completion_tokens"))
                  },
                  {
                    label: "latency",
                    value: formatLatency(smokeNumber(smoke.llm_call, "latency_ms"))
                  }
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-hairline bg-field-2/80 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-dim">
                      {item.label}
                    </p>
                    <p className="mt-1 font-mono text-lg text-starlight">{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {results?.observed_llm_tokens ? (
          <section className="stellar-panel rounded-lg p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
              observed model tokens
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(results.observed_llm_tokens).map(([purpose, tokens]) => (
                <span
                  key={purpose}
                  className="rounded-full border border-hairline bg-field-2 px-3 py-1 font-mono text-[11px] text-dim"
                >
                  {humanPurpose(purpose)} · {tokens.toLocaleString()}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
