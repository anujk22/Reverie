"use client";

import { BarChart3, Play, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, PageHeader } from "@/components/ReverieUI";
import {
  apiUrl,
  fetchEvalResults,
  runEvalSuite,
  runSmokeEval,
  type EvalResults,
  type RuntimeEvent,
  type SmokeEvalResult
} from "@/lib/api";
import { labelText } from "@/lib/text";

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
  { label: "No Memory", className: "bg-faint" },
  { label: "Full History", className: "bg-moth" },
  { label: "Reverie", className: "brand-gradient" }
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
  if (key.includes("no memory")) return "No Memory";
  if (key.includes("full history")) return "Full History";
  if (key.includes("reverie")) return "Reverie";
  return key ? labelText(key) : "Condition";
}

function rowLabel(row: Record<string, unknown>) {
  const session = row.session ? `Session ${row.session}` : "";
  return [conditionLabel(row), session].filter(Boolean).join(" · ");
}

function conditionClass(row: Record<string, unknown>) {
  const condition = conditionKey(row);
  return conditionTone[condition] ?? "bg-moth";
}

function formatScore(value: number | null) {
  if (value === null) return "Waiting on Run";
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatTokens(value: number | null) {
  if (value === null) return "Waiting on Run";
  return value.toLocaleString();
}

function formatLatency(value: number | null) {
  if (value === null) return "Waiting on Run";
  if (value < 0) return "Not Reported";
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

function conditionRows(
  rows: Array<Record<string, unknown>> | undefined,
  names: string[]
) {
  return (rows ?? []).filter((item) => {
    const condition = conditionKey(item);
    return names.some((name) => condition.includes(name));
  });
}

function meanCondition(
  rows: Array<Record<string, unknown>> | undefined,
  names: string[],
  keys: string[]
) {
  const values = conditionRows(rows, names)
    .map((row) => rowValue(row, keys))
    .filter((value): value is number => value !== null);
  return mean(values);
}

function sumCondition(
  rows: Array<Record<string, unknown>> | undefined,
  names: string[],
  keys: string[]
) {
  return conditionRows(rows, names).reduce((total, row) => {
    return total + (rowValue(row, keys) ?? 0);
  }, 0);
}

function mean(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function formatMean(value: number | null) {
  if (value === null) return "Waiting";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function formatDelta(reverie: number | null, baseline: number | null) {
  if (reverie === null || baseline === null) return "Waiting on Run";
  if (baseline === 0) {
    return `${(reverie - baseline).toLocaleString(undefined, {
      maximumFractionDigits: 2,
      signDisplay: "always"
    })} vs No Memory`;
  }
  const delta = ((reverie - baseline) / Math.abs(baseline)) * 100;
  return `${delta.toLocaleString(undefined, {
    maximumFractionDigits: 0,
    signDisplay: "always"
  })}% vs No Memory`;
}

function formatTokenSavings(reverie: number | null, fullHistory: number | null) {
  if (reverie === null || fullHistory === null) return "Waiting on Run";
  return `${Math.max(0, fullHistory - reverie).toLocaleString()} Tokens Saved`;
}

function smokeNumber(call: Record<string, unknown> | null, key: string) {
  return asNumber(call?.[key]);
}

function modeLabel(value: string) {
  return value === "mock" ? "Mock" : value === "live" ? "Live" : labelText(value);
}

function humanPurpose(value: string) {
  const labels: Record<string, string> = {
    chat: "Assistant replies",
    consolidate: "Dream consolidation",
    observer: "Memory observer",
    observe: "Memory observation",
    tutor: "Assistant replies",
    embed: "Embeddings",
    eval_judge: "Judge calls",
    extract_session_level: "Dream extraction"
  };
  return labels[value] ?? labelText(value);
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
        <h2 className="text-[14px] font-medium text-starlight">
          {labelText(title)}
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
                      isWinner ? "shadow-[0_8px_18px_-12px_rgba(93,64,35,0.28)]" : ""
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
        label: "Reverie Personalization",
        value: formatScore(reverieScore),
        note: "Score from the memory condition"
      },
      {
        label: "Lift over Baseline",
        value: formatDelta(reverieScore, noMemoryScore),
        note: "Compared with No Memory",
        accent: true
      },
      {
        label: "Context Efficiency",
        value: formatTokenSavings(reverieTokens, fullHistoryTokens),
        note: "Compared with Full History"
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

  const personalizationVerdict = useMemo(() => {
    if (!results?.real_run) return null;
    const keys = ["score", "value", "personalization"];
    return {
      reverie: meanCondition(results.personalization, ["reverie"], keys),
      noMemory: meanCondition(results.personalization, ["no memory"], keys)
    };
  }, [results]);

  const replyTokenTotals = useMemo(() => {
    if (!results?.real_run) return [];
    const keys = ["tokens", "value"];
    return [
      {
        label: "No Memory",
        tokens: sumCondition(results.tokens, ["no memory"], keys),
        className: "bg-faint"
      },
      {
        label: "Full History",
        tokens: sumCondition(results.tokens, ["full history"], keys),
        className: "bg-moth"
      },
      {
        label: "Reverie",
        tokens: sumCondition(results.tokens, ["reverie"], keys),
        className: "brand-gradient"
      }
    ];
  }, [results]);

  const maxReplyTokens = Math.max(1, ...replyTokenTotals.map((item) => item.tokens));

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
        <PageHeader
          eyebrow="Insights"
          title="Does memory make the response more personal?"
          description="Scores come from real runs only. Nothing is staged."
          actions={
          <>
            <button
              type="button"
              onClick={runFullEval}
              disabled={loading}
              className="premium-button premium-button-primary"
            >
              <Play aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>{loading ? "Running" : "Run Evals"}</span>
            </button>
            <button
              type="button"
              onClick={runSmoke}
              disabled={loading}
              className="premium-button"
            >
              <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>Run Smoke Judge</span>
            </button>
          </>
          }
        />

        {error ? (
          <p className="relative pl-4 text-sm leading-6 text-coral">
            <span className="transcript-rail absolute bottom-1 left-0 top-1 w-[3px] rounded-full" />
            {error}
          </p>
        ) : null}

        {loading && progress ? (
          <section className="stellar-panel rounded-lg p-4">
            <p className="text-[14px] font-medium text-starlight">
              Live Eval Progress
            </p>
            <p className="mt-2 text-sm leading-6 text-starlight">
              {labelText(progress.condition)} · Session {progress.session}
            </p>
          </section>
        ) : null}

        {results?.real_run ? (
          <div className="space-y-6">
            {personalizationVerdict ? (
              <section className="stellar-panel rounded-lg p-6">
                <p className="font-display text-[34px] leading-tight text-starlight md:text-[46px]">
                  Reverie{" "}
                  <span className="brand-gradient-text">
                    {formatMean(personalizationVerdict.reverie)}
                  </span>{" "}
                  vs{" "}
                  <span className="brand-gradient-text">
                    {formatMean(personalizationVerdict.noMemory)}
                  </span>{" "}
                  without memory.
                </p>
              </section>
            ) : null}

            {replyTokenTotals.length ? (
              <section className="stellar-panel rounded-lg p-6">
                <p className="text-[14px] font-medium text-starlight">
                  Reply-Token Comparison
                </p>
                <div className="mt-5 space-y-4">
                  {replyTokenTotals.map((item) => (
                    <div
                      key={item.label}
                      className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)_110px] md:items-center"
                    >
                      <p className="text-sm font-medium text-starlight">{item.label}</p>
                      <div className="h-3 overflow-hidden rounded-full bg-hairline/70">
                        <div
                          className={`h-full rounded-full ${item.className}`}
                          style={{ width: `${Math.max(3, (item.tokens / maxReplyTokens) * 100)}%` }}
                        />
                      </div>
                      <p className="font-mono text-[13px] text-dim md:text-right">
                        {item.tokens.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="grid gap-4 md:grid-cols-3">
              {headlineTiles.map((tile) => (
                <div key={tile.label} className="stellar-panel rounded-lg p-5">
                  <p className="text-[13px] font-medium text-starlight">
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
                <p className="text-[14px] font-medium text-starlight">
                  Takeaway
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
                <p className="text-[14px] font-medium text-starlight">
                  Forgetting Check
                </p>
                <p className="mt-2 text-sm leading-6 text-starlight">
                  Forgetting check:{" "}
                  {results.forgetting_check === "pass"
                    ? "Passed, the stale limits quiz memory never resurfaced."
                    : "Needs review, the stale limits quiz memory resurfaced."}
                </p>
              </section>
            ) : null}
          </div>
        ) : (
          <section className="stellar-panel rounded-lg p-6">
            <EmptyState title="Waiting for real comparisons">
              <p>
              No live eval run yet. Run the suite to compare Reverie against no-memory
              and full-history baselines.
              </p>
              <p>
              Scores come from real runs only, so this page stays quiet until the
              comparison is ready.
              </p>
            </EmptyState>
          </section>
        )}

        {smoke ? (
          <section className="stellar-panel rounded-lg p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium text-starlight">
                  Smoke Judge
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
                  { label: "Mode", value: modeLabel(smoke.mode) },
                  {
                    label: "Prompt Tokens",
                    value: formatTokens(smokeNumber(smoke.llm_call, "prompt_tokens"))
                  },
                  {
                    label: "Completion Tokens",
                    value: formatTokens(smokeNumber(smoke.llm_call, "completion_tokens"))
                  },
                  {
                    label: "Latency",
                    value: formatLatency(smokeNumber(smoke.llm_call, "latency_ms"))
                  }
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-hairline bg-field-2/80 p-3">
                    <p className="text-[13px] font-medium text-starlight">
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
            <p className="text-[14px] font-medium text-starlight">
              Observed Model Tokens
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
