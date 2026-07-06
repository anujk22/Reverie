export type HealthStatus = {
  ok?: boolean;
  db?: boolean | string;
  dashscope_reachable?: boolean;
  model_ids?: string[] | Record<string, string>;
  mock?: boolean;
  mock_mode?: boolean;
  mock_llm?: boolean;
  demo_mode?: boolean;
  clock_offset_seconds?: number;
  simulated_date?: string | null;
  mode?: string;
  error?: string;
  [key: string]: unknown;
};

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ??
  "http://localhost:8000";

export function healthUrl() {
  return `${API_BASE}/api/health`;
}

export function isMockMode(status: HealthStatus | null) {
  if (!status) return false;
  return Boolean(
    status.mock ||
      status.mock_mode ||
      status.mock_llm ||
      status.mode === "mock" ||
      status.mode === "fallback"
  );
}
