"use client";

import { useMemo } from "react";
import { isMockMode, type HealthStatus } from "@/lib/health";
import { useHealthStatus, type HealthLoadState } from "@/lib/useHealthStatus";

function stateLabel(state: HealthLoadState) {
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
  const { status, state } = useHealthStatus();
  const viewStatus: HealthStatus | null = useMemo(
    () => status ?? (state === "offline" ? { ok: false, error: "memory engine unavailable" } : null),
    [state, status]
  );

  const models = useMemo(() => {
    if (!viewStatus?.model_ids) return "not reported";
    if (Array.isArray(viewStatus.model_ids)) return viewStatus.model_ids.join(", ");
    return Object.values(viewStatus.model_ids).join(", ");
  }, [viewStatus]);

  const mock = isMockMode(viewStatus);

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
          <dd className="mt-1 font-mono text-xs">{readiness(viewStatus?.ok)}</dd>
        </div>
        <div>
          <dt className="text-dim">Memory store</dt>
          <dd className="mt-1 font-mono text-xs">{readiness(viewStatus?.db)}</dd>
        </div>
        <div>
          <dt className="text-dim">Model link</dt>
          <dd className="mt-1 font-mono text-xs">{readiness(viewStatus?.dashscope_reachable)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-dim">Model routing</dt>
          <dd className="mt-1 break-words font-mono text-xs">{models}</dd>
        </div>
        {viewStatus?.error ? (
          <div className="sm:col-span-2">
            <dt className="text-dim">Last signal</dt>
            <dd className="mt-1 font-mono text-xs text-warning">{viewStatus.error}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
