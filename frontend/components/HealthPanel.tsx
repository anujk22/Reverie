"use client";

import { useEffect, useMemo, useState } from "react";
import { healthUrl, isMockMode, type HealthStatus } from "@/lib/health";

type LoadState = "loading" | "online" | "offline";

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
            error: error instanceof Error ? error.message : "backend unavailable"
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
    <section className="rounded-md bg-panel p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">Backend health</h2>
        <span className="rounded-full bg-field-2 px-2 py-0.5 font-mono text-xs text-muted">
          {state}
        </span>
        {mock ? (
          <span className="rounded-full bg-field-2 px-2 py-0.5 font-mono text-xs text-warning">
            MOCK
          </span>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Endpoint</dt>
          <dd className="mt-1 break-all font-mono text-xs">{healthUrl()}</dd>
        </div>
        <div>
          <dt className="text-muted">API status</dt>
          <dd className="mt-1 font-mono text-xs">{String(status?.ok ?? false)}</dd>
        </div>
        <div>
          <dt className="text-muted">Database</dt>
          <dd className="mt-1 font-mono text-xs">{String(status?.db ?? "not reported")}</dd>
        </div>
        <div>
          <dt className="text-muted">DashScope</dt>
          <dd className="mt-1 font-mono text-xs">
            {String(status?.dashscope_reachable ?? "not reported")}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Models</dt>
          <dd className="mt-1 break-words font-mono text-xs">{models}</dd>
        </div>
        {status?.error ? (
          <div className="sm:col-span-2">
            <dt className="text-muted">Last error</dt>
            <dd className="mt-1 font-mono text-xs text-warning">{status.error}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
