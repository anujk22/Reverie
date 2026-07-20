"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE, isMockMode } from "@/lib/health";
import { useHealthStatus } from "@/lib/useHealthStatus";
import type { RuntimeEvent } from "@/lib/api";

export function RuntimeChip() {
  const { status, state } = useHealthStatus();
  const [degradedUntil, setDegradedUntil] = useState(0);

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
    if (state === "online") return "live";
    if (state === "offline") return "offline";
    return "checking";
  }, [mock, state]);

  const degraded = degradedUntil > Date.now();
  const showPrimaryStatus = mock || state !== "online";

  return (
    <div className="flex flex-col items-center gap-2">
      {showPrimaryStatus ? (
        <div
          className={`min-w-12 rounded-full border bg-field-2 px-2 py-1 text-center font-mono text-[10px] uppercase leading-none ${
            mock ? "border-gold/50 text-gold" : "border-coral/40 text-coral"
          }`}
        >
          {label}
        </div>
      ) : null}
      {degraded ? (
        <div
          className="w-20 rounded-full border border-gold/40 bg-field-2 px-2 py-1 text-center font-mono text-[10px] uppercase leading-tight text-gold"
        >
          live model degraded
        </div>
      ) : null}
    </div>
  );
}
