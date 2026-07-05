"use client";

import { BarChart3, Play, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  fetchEvalResults,
  runEvalSuite,
  runSmokeEval,
  type EvalResults,
  type SmokeEvalResult
} from "@/lib/api";

type MetricSpec = {
  title: string;
  rows: Array<Record<string, unknown>>;
  valueKeys: string[];
  suffix?: string;
};

const conditionTone: Record<string, string> = {
  "no memory": "bg-faint",
  no_memory: "bg-faint",
  "full history": "bg-moth",
  full_history: "bg-moth",
  reverie: "brand-gradient"
};

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

function rowLabel(row: Record<string, unknown>) {
  const condition = String(row.condition ?? row.name ?? "condition");
  const session = row.session ? `session ${row.session}` : String(row.label ?? "");
  return [condition, session].filter(Boolean).join(" · ");
}

function conditionClass(row: Record<string, unknown>) {
  const condition = String(row.condition ?? "").toLowerCase();
  return conditionTone[condition] ?? "bg-moth";
}

function ChartBlock({ title, rows, valueKeys, suffix = "" }: MetricSpec) {
  const values = rows.map((row) => rowValue(row, valueKeys)).filter((value) => value !== null);
  const max = Math.max(...values, 1);

  return (
    <section className="rounded-xl border border-hairline bg-field p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
          {title}
        </h2>
        <BarChart3 aria-hidden="true" className="text-dim" size={17} strokeWidth={1.8} />
      </div>
      <div className="mt-5 space-y-3">
        {rows.map((row, index) => {
          const value = rowValue(row, valueKeys) ?? 0;
          const width = `${Math.max(4, (value / max) * 100)}%`;
          return (
            <div key={`${title}-${index}`}>
              <div className="mb-1 flex items-center justify-between gap-3 font-mono text-[11px] text-dim">
                <span>{rowLabel(row)}</span>
                <span className="text-starlight">
                  {value}
                  {suffix}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-void">
                <div className={`h-full rounded-full ${conditionClass(row)}`} style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function EvalsClient() {
  const [results, setResults] = useState<EvalResults | null>(null);
  const [smoke, setSmoke] = useState<SmokeEvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setResults(await fetchEvalResults());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load eval state.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const chartSpecs = useMemo<MetricSpec[]>(() => {
    if (!results?.real_run) return [];
    return [
      {
        title: "personalization score",
        rows: results.personalization ?? [],
        valueKeys: ["score", "value", "personalization"]
      },
      {
        title: "recall precision",
        rows: results.recall_precision ?? [],
        valueKeys: ["precision", "value", "recall_precision"]
      },
      {
        title: "tokens per session",
        rows: results.tokens ?? [],
        valueKeys: ["tokens", "value"]
      }
    ];
  }, [results]);

  async function runFullEval() {
    setLoading(true);
    setError(null);
    try {
      setResults(await runEvalSuite());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eval run failed.");
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
      setError(err instanceof Error ? err.message : "Smoke judge failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-void px-4 py-6 md:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
              eval honesty
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-[44px] leading-[1.05] text-starlight">
              Does memory make the response more personal?
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-dim">
              Charts appear only after a completed real run. Cached real JSON is allowed;
              synthetic or hand-edited scores are not.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={runFullEval}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-field px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ember transition hover:border-ember/50 hover:text-glow disabled:cursor-not-allowed disabled:text-faint"
            >
              <Play aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>{loading ? "running" : "run evals"}</span>
            </button>
            <button
              type="button"
              onClick={runSmoke}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-field-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-dim transition hover:text-starlight disabled:cursor-not-allowed disabled:text-faint"
            >
              <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.8} />
              <span>smoke judge</span>
            </button>
          </div>
        </header>

        {error ? (
          <p className="border-l-2 border-coral pl-3 text-sm leading-6 text-coral">{error}</p>
        ) : null}

        {results?.real_run ? (
          <div className="space-y-6">
            {results.headline ? (
              <section className="rounded-xl border border-hairline bg-field p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
                  headline
                </p>
                <p className="brand-gradient-text mt-3 font-display text-[44px] leading-[1.05]">
                  {results.headline}
                </p>
              </section>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-3">
              {chartSpecs.map((spec) => (
                <ChartBlock key={spec.title} {...spec} />
              ))}
            </div>
          </div>
        ) : (
          <section className="rounded-xl border border-hairline bg-field p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
              no real eval suite yet
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-starlight">
              {results?.message ??
                "No completed live eval JSON is available. The chart area stays empty by design."}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-dim">
              The smoke judge can test JSON stability and token cost, but it does not
              populate `EVALS.md` or the comparison charts.
            </p>
          </section>
        )}

        {smoke ? (
          <section className="rounded-xl border border-hairline bg-field p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
                  smoke judge
                </p>
                <p className="mt-2 text-sm leading-6 text-starlight">{smoke.reason}</p>
              </div>
              <p className="font-mono text-3xl text-ember">{smoke.score}</p>
            </div>
            {smoke.llm_call ? (
              <dl className="mt-4 grid gap-3 rounded-lg border border-hairline bg-field-2 p-4 font-mono text-[11px] text-dim sm:grid-cols-4">
                <div>
                  <dt>mode</dt>
                  <dd className="mt-1 text-starlight">{smoke.mode}</dd>
                </div>
                <div>
                  <dt>prompt</dt>
                  <dd className="mt-1 text-starlight">
                    {String(smoke.llm_call.prompt_tokens ?? "n/a")}
                  </dd>
                </div>
                <div>
                  <dt>completion</dt>
                  <dd className="mt-1 text-starlight">
                    {String(smoke.llm_call.completion_tokens ?? "n/a")}
                  </dd>
                </div>
                <div>
                  <dt>latency</dt>
                  <dd className="mt-1 text-starlight">
                    {String(smoke.llm_call.latency_ms ?? "n/a")} ms
                  </dd>
                </div>
              </dl>
            ) : null}
          </section>
        ) : null}

        {results?.observed_llm_tokens ? (
          <section className="rounded-xl border border-hairline bg-field p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
              observed model tokens
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(results.observed_llm_tokens).map(([purpose, tokens]) => (
                <span
                  key={purpose}
                  className="rounded-full border border-hairline bg-field-2 px-3 py-1 font-mono text-[11px] text-dim"
                >
                  {purpose} · {tokens}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
