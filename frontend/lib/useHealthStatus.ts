"use client";

import { useEffect, useState } from "react";
import { healthUrl, type HealthStatus } from "@/lib/health";

export type HealthLoadState = "loading" | "online" | "offline";

export function useHealthStatus() {
  const [state, setState] = useState<HealthLoadState>("loading");
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
          setState(data.ok ? "online" : "offline");
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

  return { status, state };
}
