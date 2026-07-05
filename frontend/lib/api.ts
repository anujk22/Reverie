import { API_BASE } from "@/lib/health";

export type EngramStatus = "active" | "superseded" | "archived";

export type EngramType =
  | "misconception"
  | "mastery"
  | "preference"
  | "affect"
  | "goal"
  | "fact"
  | "strategy_outcome";

export type Engram = {
  id: string;
  student_id: string;
  type: EngramType;
  content: string;
  subject_tags: string[];
  confidence: number;
  importance: number;
  strength: number;
  status: EngramStatus;
  provisional: boolean;
  superseded_by: string | null;
  created_at: string;
  last_accessed_at: string;
  access_count: number;
};

export type MemoryGraph = {
  nodes: Engram[];
  links: Array<{ source: string; target: string; type: string }>;
};

export type SessionRecord = {
  id: string;
  student_id: string;
  started_at: string;
  ended_at?: string | null;
  title: string;
  dream_completed?: number;
  memory_pack?: MemoryPack;
};

export type MemoryPackItem = {
  engram_id: string;
  content: string;
  type: EngramType | string;
  tokens: number;
  score: number;
  breakdown: Record<string, number>;
};

export type ExcludedMemory = {
  engram_id: string;
  content: string;
  reason: string;
};

export type MemoryPack = {
  budget: number;
  used: number;
  winners: MemoryPackItem[];
  excluded: ExcludedMemory[];
};

export type Utterance = {
  id: string;
  session_id: string;
  role: "student" | "tutor";
  content: string;
  created_at: string;
  seq: number;
};

export type MemoryEvent = {
  id: string;
  engram_id: string | null;
  event_type: string;
  payload_json: Record<string, unknown>;
  session_id: string | null;
  created_at: string;
};

export type EngramDetail = {
  engram: Engram;
  provenance: Utterance[];
  events: MemoryEvent[];
};

export type DreamReport = {
  id?: string;
  report_id?: string;
  session_id: string;
  stats?: Record<string, unknown>;
  stats_json?: Record<string, unknown>;
  duration_ms?: number;
  started_at?: string;
  finished_at?: string;
};

export type EvalResults = {
  generated_at?: number;
  mode: string;
  real_run: boolean;
  message?: string;
  conditions?: string[];
  personalization?: Array<Record<string, unknown>>;
  recall_precision?: Array<Record<string, unknown>>;
  tokens?: Array<Record<string, unknown>>;
  headline?: string;
  forgetting_check?: string;
  observed_llm_tokens?: Record<string, number>;
};

export type SmokeEvalResult = {
  mode: string;
  real_run: boolean;
  condition: string;
  sessions: number;
  score: number;
  reason: string;
  llm_call: Record<string, unknown> | null;
};

export type RuntimeEvent =
  | {
      kind: "memory_event";
      event_type: string;
      event: MemoryEvent;
      engram: Engram | null;
      toast?: string | null;
      at: string;
    }
  | {
      kind: "dream_stage";
      stage: string;
      status: string;
      counts: Record<string, unknown>;
    };

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export function listSessions() {
  return jsonRequest<{ sessions: SessionRecord[] }>("/api/sessions");
}

export function createSession(title?: string) {
  return jsonRequest<SessionRecord>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ title })
  });
}

export function fetchGraph() {
  return jsonRequest<MemoryGraph>("/api/memory/graph");
}

export function fetchEngramDetail(id: string) {
  return jsonRequest<EngramDetail>(`/api/memory/engrams/${id}`);
}

export function fetchMemoryPack(sessionId: string) {
  return jsonRequest<MemoryPack>(`/api/sessions/${sessionId}/memory-pack`);
}

export function fetchLatestDreamReport() {
  return jsonRequest<{ report: DreamReport | null }>("/api/dream/reports/latest");
}

export function runLatestDream() {
  return jsonRequest<DreamReport>("/api/dream/run", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function fetchEvalResults() {
  return jsonRequest<EvalResults>("/api/evals/results");
}

export function runEvalSuite() {
  return jsonRequest<EvalResults>("/api/evals/run", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function runSmokeEval() {
  return jsonRequest<SmokeEvalResult>("/api/evals/smoke", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function endSession(sessionId: string) {
  return jsonRequest<DreamReport>(`/api/sessions/${sessionId}/end`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

export function resetDemo() {
  return jsonRequest<{ ok: boolean }>("/api/conductor/reset", {
    method: "POST",
    body: JSON.stringify({})
  });
}
