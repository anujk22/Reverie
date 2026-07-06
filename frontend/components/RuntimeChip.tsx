"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE, healthUrl, isMockMode, type HealthStatus } from "@/lib/health";
import type { RuntimeEvent } from "@/lib/api";

type LoadState = "checking" | "live" | "offline";

export function RuntimeChip() {
  const [state, setState] = useState<LoadState>("checking");
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [degradedUntil, setDegradedUntil] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const response = await fetch(healthUrl(), {
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        if (!response.ok) throw new Error(response.statusText);
        const data = (await response.json()) as HealthStatus;
        if (!cancelled) {
          setStatus(data);
          setState(data.ok ? "live" : "offline");
        }
      } catch {
        if (!cancelled) {
          setStatus(null);
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

  useEffect(() => {
    const source = new EventSource(`${API_BASE}/api/events/stream`);
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as RuntimeEvent;
        if (event.kind === "runtime_degraded") {
          setDegradedUntil(Date.now() + 30000);
        }
      } catch {
        return;
      }
    };
    source.onerror = () => undefined;
    const interval = window.setInterval(() => {
      setDegradedUntil((value) => (value && value < Date.now() ? 0 : value));
    }, 1000);
    return () => {
      source.close();
      window.clearInterval(interval);
    };
  }, []);

  const mock = isMockMode(status);
  const label = useMemo(() => {
    if (mock) return "MOCK";
    if (state === "live") return "live";
    if (state === "offline") return "offline";
    return "checking";
  }, [mock, state]);

  const offset = Number(status?.clock_offset_seconds ?? 0);
  const degraded = degradedUntil > Date.now();

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`min-w-12 rounded-full border bg-field-2 px-2 py-1 text-center font-mono text-[10px] uppercase leading-none ${
          mock
            ? "border-gold/50 text-gold"
            : state === "live"
              ? "border-sage/40 text-sage"
              : "border-coral/40 text-coral"
        }`}
        title="Runtime status"
      >
        {label}
      </div>
      {offset ? (
        <div
          className="min-w-12 rounded-full border border-hairline bg-field-2 px-2 py-1 text-center font-mono text-[10px] uppercase leading-none text-dim"
          title="Simulated demo date"
        >
          {status?.simulated_date ?? "shifted"}
        </div>
      ) : null}
      {degraded ? (
        <div
          className="w-20 rounded-full border border-gold/40 bg-field-2 px-2 py-1 text-center font-mono text-[10px] uppercase leading-tight text-gold"
          title="A live model call degraded and fell back"
        >
          live model degraded
        </div>
      ) : null}
    </div>
  );
}
