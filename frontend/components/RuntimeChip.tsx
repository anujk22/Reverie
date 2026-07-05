"use client";

import { useEffect, useMemo, useState } from "react";
import { healthUrl, isMockMode, type HealthStatus } from "@/lib/health";

type LoadState = "checking" | "live" | "offline";

export function RuntimeChip() {
  const [state, setState] = useState<LoadState>("checking");
  const [status, setStatus] = useState<HealthStatus | null>(null);

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

  const mock = isMockMode(status);
  const label = useMemo(() => {
    if (mock) return "MOCK";
    if (state === "live") return "live";
    if (state === "offline") return "offline";
    return "checking";
  }, [mock, state]);

  return (
    <div
      className={`min-w-12 rounded-full bg-field-2 px-2 py-1 text-center font-mono text-[10px] uppercase leading-none ${
        mock
          ? "text-ember"
          : state === "live"
            ? "text-sage"
            : "text-coral"
      }`}
      title={healthUrl()}
    >
      {label}
    </div>
  );
}
