"use client";

import { motion } from "framer-motion";
import {
  MessageCircle,
  MoreHorizontal,
  Moon,
  Plus,
  RefreshCcw,
  Send,
  Sparkles
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BudgetMeter } from "@/components/BudgetMeter";
import { ConstellationCanvas } from "@/components/ConstellationCanvas";
import { MemoryInspector } from "@/components/MemoryInspector";
import { RichText } from "@/components/RichText";
import {
  onDemoCloseInspector,
  onDemoGraphRefresh,
  onDemoReload,
  onDemoSelectEngram,
  onDemoSend,
  type DemoEngramCriteria
} from "@/lib/demoBus";
import {
  apiUrl,
  createSession,
  endSession,
  fetchGraph,
  fetchMemoryPack,
  listSessions,
  resetDemo,
  type DreamReport,
  type Engram,
  type MemoryGraph,
  type MemoryPack,
  type MemoryPackItem,
  type RuntimeEvent,
  type SessionRecord
} from "@/lib/api";
import { modelId } from "@/lib/health";
import { uiText } from "@/lib/text";
import { useHealthStatus } from "@/lib/useHealthStatus";

type ChatMessage = {
  kind: "message";
  localId: string;
  backendId?: string;
  role: "student" | "tutor";
  content: string;
  createdAt: Date;
  usedEngrams?: MemoryPackItem[];
  pending?: boolean;
};

type MemoryMarker = {
  kind: "memory";
  localId: string;
  eyebrow: string;
  content: string;
};

type ChatItem = ChatMessage | MemoryMarker;

type DreamStage = {
  stage: string;
  status: string;
  counts: Record<string, unknown>;
};

const emptyGraph: MemoryGraph = { nodes: [], links: [] };
const SESSION_PERSON_NAME = "Lena";
const SESSION_ONE_TITLE = "Session 1 · store migration";
const SESSION_TWO_TITLE = "Session 2 · going live";

const sessionOneStarterTurns = [
  "I'm moving her store onto the platform this week, and the last order sync failed halfway through. I need help without getting sent to a doc maze.",
  "I thought webhook retries happened automatically after a failed order sync, so I never enabled anything. Is that wrong?",
  "Can you give me exact steps with real values? For example, tell me the toggle name and what it should be set to.",
  "Please ask one thing at a time. When support dumps five links at once, I lose the thread.",
  "I'm frustrated because the test order disappeared after the sync error, and the sale date is close."
];

const sessionTwoStarterTurns = [
  "I have 20 minutes before going live. Can we pick up with the smallest check first?",
  "The sync ran again, but I want to verify the retry setting before the sale starts.",
  "Please use exact values again, not links.",
  "If the platform asks for max attempts, what should I enter for launch?",
  "After that I need a short final checklist for orders, inventory, and webhooks."
];

const memoryDotColors: Record<string, string> = {
  misconception: "bg-coral",
  mastery: "bg-gold",
  preference: "bg-moth",
  affect: "bg-moth",
  goal: "bg-ember",
  fact: "bg-sage",
  strategy_outcome: "bg-sage"
};

const markerEyebrows: Record<string, string> = {
  "engram.observed": "new memory",
  "engram.reinforced": "memory reinforced",
  "engram.superseded": "memory rewritten"
};

function localId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function demoAbortError() {
  const error = new Error("Demo send cancelled.");
  error.name = "AbortError";
  return error;
}

function throwIfDemoAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw demoAbortError();
}

function waitForDemoTyping(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(demoAbortError());

  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      window.clearTimeout(timer);
      reject(demoAbortError());
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function shortDate(value?: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric"
  }).format(value ? new Date(value) : new Date());
}

function sessionEyebrow(session: SessionRecord | null) {
  return [shortDate(session?.started_at), normalizedSessionTitle(session)].join(" · ");
}

function sessionHeadline(session: SessionRecord | null) {
  return "Lena Park";
}

function stageSummary(stage: DreamStage) {
  const entries = Object.entries(stage.counts ?? {}).filter(
    ([, value]) => typeof value === "number"
  );
  if (!entries.length) return stage.status;
  return entries.map(([key, value]) => `${value} ${key}`).join(" · ");
}

function markerContent(event: RuntimeEvent) {
  if (event.kind !== "memory_event") return null;
  if (event.toast) return String(event.toast);
  if (event.engram) return event.engram.content;
  return null;
}

function humanError(error: unknown) {
  const raw = error instanceof Error ? error.message : "Reverie could not complete that.";
  if (raw.toLowerCase().includes("failed to fetch")) {
    return "Can't reach the memory engine. Is the backend running?";
  }
  if (/^\d{3}\s/.test(raw)) {
    return "The memory engine could not complete that request.";
  }
  return raw;
}

function memoryLabel(item: MemoryPackItem) {
  const text = item.content.toLowerCase();
  if (text.includes("step") || text.includes("real value") || text.includes("doc")) return "exact steps";
  if (text.includes("frustrated") || text.includes("failed order")) return "low pressure";
  if (text.includes("webhook") || text.includes("retry")) return "webhook retries";
  if (text.includes("sale") || text.includes("launch")) return "launch date";
  if (text.includes("shipping")) return "shipping zone";
  if (text.includes("order sync")) return "order sync";
  return item.type.replace("_", " ").split(" ").slice(0, 2).join(" ");
}

function findDemoEngram(nodes: Engram[], criteria: DemoEngramCriteria) {
  const contains = criteria.contains?.toLowerCase();
  return (
    nodes.find((node) => {
      if (criteria.type && node.type !== criteria.type) return false;
      if (contains && !node.content.toLowerCase().includes(contains)) return false;
      return true;
    }) ?? null
  );
}

function sessionNumber(session: SessionRecord | null) {
  const match = /session\s*(\d+)/i.exec(session?.title ?? "");
  return match?.[1] ?? "1";
}

function normalizedSessionTitle(session: SessionRecord | null) {
  const title = session?.title ?? SESSION_ONE_TITLE;
  return title.replace(/\s+-\s+/g, " · ").toLowerCase();
}

function sessionTopic(session: SessionRecord | null) {
  const title = normalizedSessionTitle(session);
  const topic = title.split("·").pop()?.trim() || "store migration";
  return topic;
}

function sortedSessions(sessions: SessionRecord[], session: SessionRecord | null) {
  const byId = new Map(sessions.map((item) => [item.id, item]));
  if (session && !byId.has(session.id)) byId.set(session.id, session);
  return [...byId.values()].sort(
    (left, right) =>
      new Date(left.started_at).getTime() - new Date(right.started_at).getTime()
  );
}

function SessionTimeline({
  sessions,
  session,
  dreaming
}: {
  sessions: SessionRecord[];
  session: SessionRecord | null;
  dreaming: boolean;
}) {
  const ordered = sortedSessions(sessions, session);
  type TimelineStop = {
    key: string;
    kind: "session" | "dream";
    label: string;
    current: boolean;
    complete: boolean;
  };
  const stops: TimelineStop[] = ordered.flatMap((item, index) => {
    const dreamComplete =
      Boolean(item.ended_at) || Boolean(item.dream_completed) || index < ordered.length - 1;
    return [
      {
        key: item.id,
        kind: "session" as const,
        label: `S${index + 1}`,
        current: session?.id === item.id && !dreaming,
        complete: index < ordered.findIndex((candidate) => candidate.id === session?.id)
      },
      ...(dreamComplete || (dreaming && session?.id === item.id)
        ? [
            {
              key: `${item.id}-dream`,
              kind: "dream" as const,
              label: "dream",
              current: dreaming && session?.id === item.id,
              complete: dreamComplete
            }
          ]
        : [])
    ];
  });

  const visibleStops = [...stops];
  if (!visibleStops.length) {
    visibleStops.push({
      key: "session-1",
      kind: "session",
      label: "S1",
      current: true,
      complete: false
    });
  }
  if (ordered.length <= 2) {
    if (!visibleStops.some((stop) => stop.kind === "dream")) {
      visibleStops.splice(1, 0, {
        key: "dream-placeholder",
        kind: "dream",
        label: "dream",
        current: false,
        complete: false
      });
    }
    if (!visibleStops.some((stop) => stop.kind === "session" && stop.label === "S2")) {
      visibleStops.push({
        key: "session-2-placeholder",
        kind: "session",
        label: "S2",
        current: false,
        complete: false
      });
    }
  }

  return (
    <section className="flex h-full items-center border-l border-hairline px-8">
      <div className="flex w-full items-center gap-3 font-mono text-[14px] text-starlight">
        {visibleStops.map((stop, index) => (
          <div key={stop.key} className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className={`inline-flex min-w-0 items-center gap-2 whitespace-nowrap ${
                stop.current ? "text-ember" : stop.complete ? "text-sage" : "text-dim"
              }`}
            >
              {stop.kind === "dream" ? (
                <Moon aria-hidden="true" size={16} strokeWidth={1.8} />
              ) : null}
              <span>{stop.label}</span>
              <span
                className={`h-3 w-3 shrink-0 rounded-full border ${
                  stop.current
                    ? "border-ember bg-field-2"
                    : stop.complete
                      ? "border-sage bg-sage"
                      : "border-faint bg-field-2"
                }`}
              />
            </span>
            {index < visibleStops.length - 1 ? <span className="h-px flex-1 bg-hairline" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function SessionClient() {
  const { status: healthStatus } = useHealthStatus();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [graph, setGraph] = useState<MemoryGraph>(emptyGraph);
  const [pack, setPack] = useState<MemoryPack | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<Engram | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [canvasEvent, setCanvasEvent] = useState<RuntimeEvent | null>(null);
  const [dreaming, setDreaming] = useState(false);
  const [dreamStages, setDreamStages] = useState<Record<string, DreamStage>>({});
  const [lastReport, setLastReport] = useState<DreamReport | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasChatRef = useRef(false);
  const sessionRef = useRef<SessionRecord | null>(null);
  const sendMessageRef = useRef<
    ((message?: string, signal?: AbortSignal) => Promise<void>) | null
  >(null);
  const initialBootStartedRef = useRef(false);

  const loadGraph = useCallback(async () => {
    const data = await fetchGraph();
    setGraph(data);
    setSelected((current) => {
      if (!current) return current;
      return data.nodes.find((node) => node.id === current.id) ?? current;
    });
    return data;
  }, []);

  const startSession = useCallback(async (title?: string) => {
    const created = await createSession(title);
    sessionRef.current = created;
    setSession(created);
    setSessions((current) => sortedSessions(current, created));
    setPack(created.memory_pack ?? null);
    setItems([]);
    setDreamStages({});
    setLastReport(null);
    return created;
  }, []);

  const boot = useCallback(async () => {
    setBooting(true);
    setError(null);
    try {
      const [sessions, graphData] = await Promise.all([listSessions(), fetchGraph()]);
      setSessions(sessions.sessions);
      const latest = sessions.sessions[sessions.sessions.length - 1] ?? null;
      const active = latest && !latest.ended_at ? latest : await startSession(SESSION_ONE_TITLE);
      sessionRef.current = active;
      setSession(active);
      setGraph(graphData);
      if (active.memory_pack) {
        setPack(active.memory_pack);
      } else {
        setPack(await fetchMemoryPack(active.id));
      }
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBooting(false);
    }
  }, [startSession]);

  useEffect(() => {
    if (initialBootStartedRef.current) return;
    initialBootStartedRef.current = true;
    boot();
  }, [boot]);

  useEffect(() => {
    hasChatRef.current = items.some((item) => item.kind === "message");
  }, [items]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const source = new EventSource(apiUrl("/api/events/stream"));
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as RuntimeEvent;
        if (event.kind === "memory_event") {
          setCanvasEvent(event);
          if (event.engram) {
            setPulseId(event.engram.id);
            window.setTimeout(() => setPulseId(null), 1400);
          }
          const eyebrow = markerEyebrows[event.event_type];
          const content = markerContent(event);
          if (eyebrow && content && hasChatRef.current) {
            setItems((current) => [
              ...current,
              {
                kind: "memory",
                localId: localId("memory"),
                eyebrow,
                content: uiText(content)
              }
            ]);
          }
          loadGraph().catch(() => undefined);
        }
        if (event.kind === "dream_stage") {
          setDreaming(event.status !== "done");
          setDreamStages((current) => ({
            ...current,
            [event.stage]: event
          }));
        }
      } catch {
        return;
      }
    };
    source.onerror = () => undefined;
    return () => source.close();
  }, [loadGraph]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [items]);

  const nodeById = useMemo(() => {
    return new Map(graph.nodes.map((node) => [node.id, node]));
  }, [graph.nodes]);

  const selectEngramById = useCallback(
    (id: string) => {
      const node = nodeById.get(id);
      if (node) {
        setSelected(node);
        return;
      }
      const fallback = pack?.winners.find((item) => item.engram_id === id);
      if (fallback) {
        setSelected({
          id,
          student_id: "person_lena",
          type: fallback.type as Engram["type"],
          content: fallback.content,
          subject_tags: [],
          confidence: 0,
          importance: 0,
          strength: 0,
          status: "active",
          provisional: false,
          superseded_by: null,
          created_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          access_count: 0
        });
      }
    },
    [nodeById, pack?.winners]
  );

  async function sendMessage(message = draft, signal?: AbortSignal) {
    const text = message.trim();
    const activeSession = sessionRef.current;
    if (!text || !activeSession || streaming || dreaming) return;
    if (signal?.aborted) return;

    setDraft("");
    setError(null);
    setStreaming(true);

    const studentLocalId = localId("student");
    const tutorLocalId = localId("tutor");
    setItems((current) => [
      ...current,
      {
        kind: "message",
        localId: studentLocalId,
        role: "student",
        content: text,
        createdAt: new Date()
      },
      {
        kind: "message",
        localId: tutorLocalId,
        role: "tutor",
        content: "",
        createdAt: new Date(),
        pending: true
      }
    ]);

    function patchMessage(id: string, patch: Partial<ChatMessage>) {
      setItems((current) =>
        current.map((item) =>
          item.kind === "message" && item.localId === id ? { ...item, ...patch } : item
        )
      );
    }

    try {
      const response = await fetch(apiUrl(`/api/sessions/${activeSession.id}/chat`), {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: text }),
        signal
      });
      if (!response.ok || !response.body) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          const line = block
            .split("\n")
            .find((item) => item.startsWith("data:"));
          if (!line) continue;
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.kind === "memory_pack") {
            const nextPack = payload as MemoryPack;
            setPack(nextPack);
            patchMessage(tutorLocalId, { usedEngrams: nextPack.winners });
            nextPack.winners.slice(0, 6).forEach((winner, index) => {
              window.setTimeout(() => {
                setPulseId(winner.engram_id);
              }, index * 120);
            });
            window.setTimeout(() => setPulseId(null), nextPack.winners.length * 120 + 500);
          }
          if (payload.kind === "token") {
            reply += payload.token;
            patchMessage(tutorLocalId, { content: reply });
          }
          if (payload.kind === "done") {
            patchMessage(studentLocalId, { backendId: payload.student_utterance_id });
            patchMessage(tutorLocalId, {
              backendId: payload.tutor_utterance_id,
              content: payload.reply || reply,
              pending: false
            });
          }
        }
      }

      window.setTimeout(() => loadGraph().catch(() => undefined), 1800);
    } catch (err) {
      if (signal?.aborted) {
        patchMessage(tutorLocalId, {
          pending: false,
          content: ""
        });
        return;
      }
      setError(humanError(err));
      patchMessage(tutorLocalId, {
        pending: false,
        content: "The assistant stream is unavailable. The memory state is still intact."
      });
    } finally {
      setStreaming(false);
    }
  }

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });

  async function runDream() {
    if (!session || dreaming) return;
    setDreaming(true);
    setError(null);
    try {
      const report = await endSession(session.id);
      setLastReport(report);
      const refreshed = await listSessions();
      setSessions(refreshed.sessions);
      await loadGraph();
      const next = await startSession(SESSION_TWO_TITLE);
      setPack(next.memory_pack ?? (await fetchMemoryPack(next.id)));
    } catch (err) {
      setError(humanError(err));
    } finally {
      setDreaming(false);
    }
  }

  async function resetLocalDemo() {
    setError(null);
    setBooting(true);
    try {
      await resetDemo();
      setGraph(emptyGraph);
      setItems([]);
      setSessions([]);
      setSelected(null);
      setPack(null);
      await startSession(SESSION_ONE_TITLE);
      await loadGraph();
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => {
    const unsubscribeSend = onDemoSend(async ({ text, signal, resolve, reject }) => {
      try {
        if (!sessionRef.current) throw new Error("Session page is not ready.");
        if (streaming || dreaming) throw new Error("Session page is busy.");

        throwIfDemoAborted(signal);
        setDraft("");

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) {
          setDraft(text);
        } else {
          for (let index = 1; index <= text.length; index += 1) {
            throwIfDemoAborted(signal);
            setDraft(text.slice(0, index));
            await waitForDemoTyping(25, signal);
          }
        }

        throwIfDemoAborted(signal);
        const currentSendMessage = sendMessageRef.current;
        if (!currentSendMessage) throw new Error("Session page is not ready.");
        await currentSendMessage(text, signal);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    const unsubscribeReload = onDemoReload(async ({ resolve, reject }) => {
      try {
        setItems([]);
        setDraft("");
        setSelected(null);
        setHighlightedId(null);
        setPulseId(null);
        setCanvasEvent(null);
        setDreaming(false);
        setDreamStages({});
        setLastReport(null);
        setError(null);
        await boot();
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    const unsubscribeGraphRefresh = onDemoGraphRefresh(async ({ resolve, reject }) => {
      try {
        await loadGraph();
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    const unsubscribeSelectEngram = onDemoSelectEngram(
      async ({ type, contains, resolve, reject }) => {
        try {
          const criteria = { type, contains };
          let node: Engram | null = null;
          for (let attempt = 0; attempt < 24; attempt += 1) {
            const nextGraph = await loadGraph();
            node = findDemoEngram(nextGraph.nodes, criteria);
            if (node) break;
            await waitForDemoTyping(250);
          }
          if (!node) throw new Error("No matching memory for the film inspector.");
          setSelected(node);
          resolve();
        } catch (err) {
          reject(err);
        }
      }
    );

    const unsubscribeCloseInspector = onDemoCloseInspector(({ resolve }) => {
      setSelected(null);
      resolve();
    });

    return () => {
      unsubscribeSend();
      unsubscribeReload();
      unsubscribeGraphRefresh();
      unsubscribeSelectEngram();
      unsubscribeCloseInspector();
    };
  }, [boot, dreaming, graph.nodes, loadGraph, session, streaming]);

  const stageList = ["replay", "distill", "deduplicate", "reconcile", "decay", "report"];
  const starterTurns = session?.title?.includes("Session 2")
    ? sessionTwoStarterTurns
    : sessionOneStarterTurns;
  const hasMessages = items.some((item) => item.kind === "message");
  const memoryCount = graph.nodes.length;
  const provisionalCount = graph.nodes.filter((node) => node.provisional).length;
  const chatModel = modelId(healthStatus, "chat");
  const observerModel = modelId(healthStatus, "observer");

  return (
    <div className="cosmic-shell grid min-h-dvh overflow-hidden md:min-h-[calc(100dvh-1.5rem)] lg:h-[calc(100dvh-1.5rem)] lg:grid-cols-[minmax(390px,44%)_minmax(0,56%)]">
      <section className="order-2 flex min-h-[66dvh] flex-col border-hairline bg-field lg:order-1 lg:h-full lg:min-h-0 lg:border-r">
        <header className="flex h-[var(--reverie-header-h)] shrink-0 flex-col justify-center border-b border-hairline bg-field px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
                {sessionEyebrow(session)}
              </p>
              <h1 className="display-glow mt-2 font-display text-[24px] font-semibold uppercase tracking-widest leading-none text-starlight">
                {sessionHeadline(session)}
              </h1>
            </div>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                disabled={!session || dreaming || streaming}
                onClick={() => runDream()}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-hairline bg-field-2 px-4 py-2 text-[13px] font-medium text-starlight transition hover:border-ember hover:bg-ember hover:text-field-2 disabled:cursor-not-allowed disabled:border-hairline disabled:text-faint"
              >
                <Moon aria-hidden="true" size={16} strokeWidth={1.8} />
                <span>End session</span>
              </button>
              <button
                type="button"
                aria-label="More session actions"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-field-2 text-starlight transition hover:border-ember hover:bg-ember hover:text-field-2"
              >
                <MoreHorizontal aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
              {menuOpen ? (
                <div className="stellar-panel absolute right-0 top-12 z-30 w-44 rounded-lg p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      startSession(SESSION_TWO_TITLE).catch((err) =>
                        setError(err.message)
                      );
                    }}
                    className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-starlight transition hover:bg-field"
                  >
                    <Plus aria-hidden="true" size={16} strokeWidth={1.8} />
                    <span>New session</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      resetLocalDemo();
                    }}
                    className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-starlight transition hover:bg-field"
                  >
                    <RefreshCcw aria-hidden="true" size={15} strokeWidth={1.8} />
                    <span>Reset demo</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {lastReport ? (
            <p className="mt-3 font-mono text-[11px] text-dim">
              {lastReport.duration_ms
                ? `last dream finished in ${(lastReport.duration_ms / 1000).toFixed(1)}s`
                : "last dream complete"}
            </p>
          ) : null}
          {error ? (
            <p className="relative mt-4 pl-4 text-sm leading-6 text-coral">
              <span className="transcript-rail absolute bottom-1 left-0 top-1 w-[3px] rounded-full" />
              {error}
            </p>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className={`flex min-h-full flex-col ${hasMessages ? "justify-end" : "justify-start"}`}>
            {booting ? (
              <div className="space-y-4 pb-4">
                <div className="h-4 w-2/3 rounded-full bg-field-2" />
                <div className="stellar-panel ml-auto h-20 w-4/5 rounded-lg" />
                <div className="h-28 w-5/6 bg-void" />
              </div>
            ) : !hasMessages ? (
              <div className="flex flex-col gap-5 pb-8">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
                    pick up the thread
                  </p>
                  <p className="mt-4 max-w-xl font-display text-[28px] italic leading-snug text-starlight">
                    {sessionNumber(session) === "1"
                      ? `Reverie knows nothing about ${SESSION_PERSON_NAME} yet.`
                      : "Reverie has been dreaming about last time."}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-dim">
                    Start with what {SESSION_PERSON_NAME} would say, or write your own below.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {starterTurns.map((turn) => (
                    <button
                      key={turn}
                      type="button"
                      onClick={() => sendMessage(turn)}
                      className="relative flex max-w-xl items-start gap-4 rounded-lg border border-hairline bg-field-2 px-5 py-3.5 text-left text-[13.5px] leading-6 text-starlight shadow-[0_8px_28px_-18px_rgba(93,64,35,0.22)] transition hover:border-ember/40 hover:text-starlight"
                    >
                      <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-ember" />
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember/10 text-starlight">
                        <MessageCircle aria-hidden="true" size={16} strokeWidth={1.7} />
                      </span>
                      <span className="min-w-0">
                        <RichText text={turn} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-7 pb-4">
                {items.map((item) =>
                  item.kind === "memory" ? (
                    <motion.div
                      key={item.localId}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-center gap-3"
                      role="status"
                    >
                      <span className="hairline-divider h-px flex-1 opacity-60" />
                      <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-sage">
                        <Sparkles aria-hidden="true" size={12} strokeWidth={1.8} />
                        <span className="truncate">
                          {item.eyebrow} - {item.content.toLowerCase()}
                        </span>
                        {observerModel ? (
                          <span className="hidden shrink-0 text-[10px] text-dim sm:inline">
                            observer · {observerModel}
                          </span>
                        ) : null}
                      </span>
                      <span className="hairline-divider h-px flex-1 opacity-60" />
                    </motion.div>
                  ) : (
                    <motion.article
                      key={item.localId}
                      id={item.backendId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className={item.role === "student" ? "flex justify-end" : "block"}
                    >
                      {item.role === "student" ? (
                        <div className="relative flex max-w-[82%] items-start gap-4 rounded-lg border border-hairline bg-field-2 px-5 py-3.5 text-[15px] leading-7 text-starlight shadow-[0_8px_28px_-18px_rgba(93,64,35,0.18)]">
                          <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-full bg-ember" />
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember/10 text-starlight">
                            <MessageCircle aria-hidden="true" size={16} strokeWidth={1.7} />
                          </span>
                          <span className="min-w-0">
                            <RichText text={item.content} />
                          </span>
                        </div>
                      ) : (
                        <div className="relative max-w-[94%] text-[15.5px] leading-8 text-starlight">
                          {chatModel ? (
                            <p className="mb-2 font-mono text-[10px] leading-none text-dim">
                              reply · {chatModel}
                            </p>
                          ) : null}
                          {item.content ? (
                            <RichText text={item.content} />
                          ) : (
                            <p className="text-dim">{item.pending ? "Thinking…" : ""}</p>
                          )}
                          {item.usedEngrams?.length ? (
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-sage">
                                drawing on
                              </span>
                              {item.usedEngrams.map((used) => (
                                <button
                                  key={used.engram_id}
                                  type="button"
                                  className="inline-flex min-h-7 items-center gap-1.5 rounded-full px-1 py-1 font-mono text-[11px] text-dim transition hover:text-starlight"
                                  onMouseEnter={() => setHighlightedId(used.engram_id)}
                                  onMouseLeave={() => setHighlightedId(null)}
                                  onFocus={() => setHighlightedId(used.engram_id)}
                                  onBlur={() => setHighlightedId(null)}
                                  onClick={() => {
                                    selectEngramById(used.engram_id);
                                  }}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      memoryDotColors[used.type] ?? "bg-ember"
                                    }`}
                                  />
                                  <span>{memoryLabel(used)}</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </motion.article>
                  )
                )}
                <div ref={scrollRef} />
              </div>
            )}
          </div>
        </div>

        <form
          className="flex h-[var(--reverie-bottom-h)] shrink-0 items-center border-t border-hairline bg-field px-8"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          {dreaming ? (
            <div className="flex min-h-14 items-center gap-3 text-sm text-dim">
              <span className="hairline-divider h-px flex-1" />
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
                dreaming
              </span>
              <span className="hairline-divider h-px flex-1" />
            </div>
          ) : (
            <div className="stellar-panel flex w-full items-end gap-3 rounded-[22px] px-4 py-2.5 focus-within:border-ember/50">
              <label className="sr-only" htmlFor="message">
                Message
              </label>
              <textarea
                id="message"
                value={draft}
                disabled={streaming || !session}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[16px] leading-7 text-starlight outline-none placeholder:text-dim disabled:cursor-not-allowed disabled:text-faint"
                placeholder="Type your message…"
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={streaming || !draft.trim() || !session}
                className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-field-2 shadow-[0_8px_20px_-12px_rgba(93,64,35,0.42)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Send aria-hidden="true" size={20} strokeWidth={2} />
              </button>
            </div>
          )}
        </form>
      </section>

      <section className="order-1 flex h-[58dvh] min-h-[520px] flex-col bg-field lg:order-2 lg:h-full lg:min-h-0">
        <header className="flex h-[var(--reverie-header-h)] shrink-0 flex-col justify-center border-b border-hairline bg-field px-8">
          <h2 className="font-display text-[20px] font-semibold uppercase tracking-widest text-ember">
            Memory Constellation
          </h2>
          <p className="mt-1.5 max-w-lg font-mono text-[10px] leading-relaxed uppercase tracking-wider text-dim">
            {memoryCount} memories · {provisionalCount} provisional — every glowing node is something Reverie learned from her own words
          </p>
        </header>
        <div className="relative min-h-0 flex-1">
          <ConstellationCanvas
            graph={graph}
            selectedId={selected?.id ?? null}
            highlightedId={highlightedId}
            pulseId={pulseId}
            event={canvasEvent}
            onSelect={setSelected}
          />

          {Object.keys(dreamStages).length ? (
            <div className="stellar-panel absolute bottom-5 left-8 right-8 rounded-lg p-3">
              <div className="flex flex-wrap gap-2">
                {stageList.map((stage) => {
                  const item = dreamStages[stage];
                  return (
                    <div
                      key={stage}
                      className={`rounded-full border border-hairline bg-field-2 px-2 py-1 font-mono text-[10px] ${
                        item?.status === "done"
                          ? "text-sage"
                          : item
                            ? "text-ember"
                            : "text-dim"
                      }`}
                    >
                      {stage} {item ? stageSummary(item) : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid h-[var(--reverie-bottom-h)] shrink-0 border-t border-hairline bg-field lg:grid-cols-[55%_45%]">
          <BudgetMeter
            pack={pack}
            engrams={graph.nodes}
            onHover={setHighlightedId}
            onSelect={selectEngramById}
          />
          <SessionTimeline sessions={sessions} session={session} dreaming={dreaming} />
        </div>
      </section>

      <MemoryInspector engram={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
