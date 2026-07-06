"use client";

import { useEffect, useMemo, useState } from "react";
import { healthUrl, isMockMode, type HealthStatus } from "@/lib/health";

type LoadState = "loading" | "online" | "offline";

function stateLabel(state: LoadState) {
  if (state === "loading") return "checking";
  return state;
}

function readiness(value: unknown) {
  if (value === true) return "ready";
  if (value === false) return "offline";
  if (typeof value === "string" && value.trim()) return value;
  return "waiting";
}

export function HealthPanel() {
  const [state, setState] = useState<LoadState>("loading");
  const [status, setStatus] = useState<HealthStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      setState("loading");
      try {
        const response = await fetch(healthUrl(), {
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }
        const data = (await response.json()) as HealthStatus;
        if (!cancelled) {
          setStatus(data);
          setState("online");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus({
            ok: false,
            error:
              error instanceof Error && error.message.toLowerCase().includes("failed to fetch")
                ? "memory engine unreachable"
                : "memory engine unavailable"
          });
          setState("offline");
        }
      }
    }

    loadHealth();
    const interval = window.setInterval(loadHealth, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const models = useMemo(() => {
    if (!status?.model_ids) return "not reported";
    if (Array.isArray(status.model_ids)) return status.model_ids.join(", ");
    return Object.values(status.model_ids).join(", ");
  }, [status]);

  const mock = isMockMode(status);

  return (
    <section className="stellar-panel rounded-lg p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-2xl font-medium text-starlight">Backend health</h2>
        <span className="rounded-full border border-hairline bg-field-2 px-2 py-0.5 font-mono text-xs text-dim">
          {stateLabel(state)}
        </span>
        {mock ? (
          <span className="rounded-full border border-ember/40 bg-field-2 px-2 py-0.5 font-mono text-xs text-warning">
            mock mode
          </span>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 text-sm text-starlight sm:grid-cols-2">
        <div>
          <dt className="text-dim">Service</dt>
          <dd className="mt-1 font-mono text-xs">{state === "online" ? "reachable" : stateLabel(state)}</dd>
        </div>
        <div>
          <dt className="text-dim">Backend</dt>
          <dd className="mt-1 font-mono text-xs">{readiness(status?.ok)}</dd>
        </div>
        <div>
          <dt className="text-dim">Memory store</dt>
          <dd className="mt-1 font-mono text-xs">{readiness(status?.db)}</dd>
        </div>
        <div>
          <dt className="text-dim">Model link</dt>
          <dd className="mt-1 font-mono text-xs">{readiness(status?.dashscope_reachable)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-dim">Model routing</dt>
          <dd className="mt-1 break-words font-mono text-xs">{models}</dd>
        </div>
        {status?.error ? (
          <div className="sm:col-span-2">
            <dt className="text-dim">Last signal</dt>
            <dd className="mt-1 font-mono text-xs text-warning">{status.error}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
