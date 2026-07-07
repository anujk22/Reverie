"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MemoryInspector } from "@/components/MemoryInspector";
import {
  BrainMapPanel,
  ComposerChrome,
  EmptyState,
  MemoryCard,
  MetadataChip
} from "@/components/ReverieUI";
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
  fetchGraph,
  fetchMemoryPack,
  listSessions,
  type Engram,
  type MemoryGraph,
  type MemoryPack,
  type MemoryPackItem,
  type RuntimeEvent,
  type SessionRecord
} from "@/lib/api";
import { uiText } from "@/lib/text";

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

const emptyGraph: MemoryGraph = { nodes: [], links: [] };
const SESSION_ONE_TITLE = "Session 1 · store migration";

const metadata = [
  ["ID", "LP-90817"],
  ["AGE", "34"],
  ["OCCUPATION", "Product Designer"],
  ["LOCATION", "Seoul, KR"],
  ["MEMORY DEPTH", "Deep"],
  ["RELATIONSHIP", "Self"],
  ["LAST SYNC", "2m ago"]
];

const sampleCards = [
  {
    actor: "You",
    timestamp: "09:42 AM",
    content: "What were the key takeaways from my design review yesterday?",
    tags: ["design-review"],
    variant: "person" as const
  },
  {
    actor: "Reverie",
    timestamp: "09:42 AM",
    content:
      "The team praised the clarity of your information architecture and empathy in user flows. You noted concerns about the onboarding friction and plan to run a usability test this week.",
    tags: ["design-review", "ux", "team-feedback"],
    confidence: 92,
    recall: "memory recall",
    variant: "reverie" as const
  },
  {
    actor: "You",
    timestamp: "09:43 AM",
    content: "Remind me why this matters to me.",
    tags: ["reflection"],
    variant: "person" as const
  },
  {
    actor: "Reverie",
    timestamp: "09:43 AM",
    content:
      "You care about creating products that feel effortless and human. Reducing friction aligns with your mission to design experiences that respect people's time and attention.",
    tags: ["values", "mission", "north-star"],
    confidence: 95,
    recall: "self model",
    variant: "reverie" as const
  }
];

const markerEyebrows: Record<string, string> = {
  "engram.observed": "New Memory",
  "engram.reinforced": "Memory Reinforced",
  "engram.superseded": "Memory Rewritten"
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

function confidenceFrom(items?: MemoryPackItem[]) {
  if (!items?.length) return undefined;
  const score = items.reduce((total, item) => total + item.score, 0) / items.length;
  return Math.max(72, Math.min(99, Math.round(score * 100)));
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
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

export function SessionClient() {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [graph, setGraph] = useState<MemoryGraph>(emptyGraph);
  const [pack, setPack] = useState<MemoryPack | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<Engram | null>(null);
  const [lastMemoryEvent, setLastMemoryEvent] = useState<RuntimeEvent | null>(null);
  const [dreaming, setDreaming] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    setPack(created.memory_pack ?? null);
    setItems([]);
    return created;
  }, []);

  const boot = useCallback(async () => {
    setBooting(true);
    setError(null);
    try {
      const [sessions, graphData] = await Promise.all([listSessions(), fetchGraph()]);
      const latest = sessions.sessions[sessions.sessions.length - 1] ?? null;
      const active = latest && !latest.ended_at ? latest : await startSession(SESSION_ONE_TITLE);
      sessionRef.current = active;
      setSession(active);
      setGraph(graphData);
      setPack(active.memory_pack ?? (await fetchMemoryPack(active.id)));
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
          setLastMemoryEvent(event);
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
          setDreaming(event.status !== "done" || event.stage !== "report");
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

      window.setTimeout(() => loadGraph().catch(() => undefined), 1500);
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
        setLastMemoryEvent(null);
        setDreaming(false);
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
  }, [boot, dreaming, loadGraph, streaming]);

  const hasMessages = items.some((item) => item.kind === "message");
  return (
    <div className="grid min-h-dvh overflow-hidden bg-field lg:h-dvh lg:grid-cols-[minmax(560px,46%)_minmax(0,54%)]">
      <section className="cosmic-shell flex min-h-dvh flex-col border-hairline lg:h-dvh lg:min-h-0 lg:border-r">
        <header className="relative shrink-0 px-6 pb-4 pt-8 md:px-10 lg:px-11 lg:pt-10">
          <div className="min-w-0">
            <div className="min-w-0">
              <h1 className="display-glow whitespace-nowrap font-display text-[58px] font-medium leading-[0.9] text-starlight max-sm:whitespace-normal md:text-[74px] xl:text-[86px]">
                LENA PARK
              </h1>
              <div className="mt-7 flex max-w-[720px] flex-wrap gap-2">
                {metadata.map(([label, value]) => (
                  <MetadataChip key={label} label={label} value={value} />
                ))}
              </div>
            </div>

          </div>

          {error ? (
            <p className="relative mt-4 pl-4 text-sm leading-6 text-coral">
              <span className="transcript-rail absolute bottom-1 left-0 top-1 w-[3px] rounded-full" />
              {error}
            </p>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3 md:px-10 lg:px-11">
          {booting ? (
            <div className="space-y-4">
              <div className="h-4 w-1/3 rounded-full bg-field-2" />
              <div className="stellar-panel h-32" />
              <div className="stellar-panel ml-auto h-36 w-5/6" />
            </div>
          ) : hasMessages ? (
            <div className="space-y-2 pb-6">
              {items.map((item) =>
                item.kind === "memory" ? (
                  <div
                    key={item.localId}
                    className="flex items-center gap-3 py-2"
                    role="status"
                  >
                    <span className="hairline-divider h-px flex-1 opacity-60" />
                    <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-sage">
                      <Sparkles aria-hidden="true" size={12} strokeWidth={1.8} />
                      <span className="truncate">
                        {item.eyebrow}: {item.content}
                      </span>
                    </span>
                    <span className="hairline-divider h-px flex-1 opacity-60" />
                  </div>
                ) : (
                  <MemoryCard
                    key={item.localId}
                    actor={item.role === "student" ? "You" : "Reverie"}
                    timestamp={formatTime(item.createdAt)}
                    variant={item.role === "student" ? "person" : "reverie"}
                    tags={item.usedEngrams?.slice(0, 3).map(memoryLabel) ?? []}
                    confidence={item.role === "tutor" ? confidenceFrom(item.usedEngrams) : undefined}
                    recall={item.usedEngrams?.length ? "memory recall" : undefined}
                    pending={item.pending}
                    onTagClick={(tag) => {
                      const match = item.usedEngrams?.find((used) => memoryLabel(used) === tag);
                      if (match) selectEngramById(match.engram_id);
                    }}
                  >
                    {item.content ? (
                      <RichText text={item.content} />
                    ) : (
                      <span className="text-dim">{item.pending ? "Thinking..." : ""}</span>
                    )}
                  </MemoryCard>
                )
              )}
              <div ref={scrollRef} />
            </div>
          ) : (
            <div className="space-y-2 pb-6">
              {sampleCards.map((card) => (
                <MemoryCard
                  key={`${card.actor}-${card.timestamp}-${card.content}`}
                  actor={card.actor}
                  timestamp={card.timestamp}
                  variant={card.variant}
                  tags={card.tags}
                  confidence={card.confidence}
                  recall={card.recall}
                >
                  {card.content}
                </MemoryCard>
              ))}
              {!session ? (
                <EmptyState title="Memory engine offline">
                  <p>Start the backend to replace this reference transcript with live memory.</p>
                </EmptyState>
              ) : null}
            </div>
          )}
        </div>

        <form
          className="shrink-0 border-t border-hairline px-6 py-5 md:px-10 lg:px-11"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <ComposerChrome
            onSubmit={() => sendMessage()}
            disabled={streaming || !draft.trim() || !session || dreaming}
          >
            <label className="sr-only" htmlFor="message">
              Message
            </label>
            <textarea
              id="message"
              value={draft}
              disabled={streaming || !session || dreaming}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder="Ask anything about your memories..."
            />
          </ComposerChrome>
        </form>
      </section>

      <BrainMapPanel
        graph={graph}
        event={lastMemoryEvent}
        budget={
          pack
            ? {
                used: pack.used,
                total: pack.budget,
                available: Math.max(0, pack.budget - pack.used),
                percent: (pack.used / Math.max(1, pack.budget)) * 100
              }
            : undefined
        }
      />

      <MemoryInspector engram={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
