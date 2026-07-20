"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDemoDirector } from "@/components/DemoDirector";
import { MemoryInspector } from "@/components/MemoryInspector";
import {
  BrainMapPanel,
  ComposerChrome,
  EmptyState,
  MemoryCard
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
const SESSION_ONE_TITLE = "Session 1 · interview preparation";

const markerEyebrows: Record<string, string> = {
  "engram.observed": "New Memory",
  "engram.deleted": "Memory Forgotten",
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

function stripMemoryToastPrefix(content: string) {
  return content.replace(/^\s*(Noticed|Reinforced|Rewritten):\s*/i, "").trim();
}

function markerContent(event: RuntimeEvent) {
  if (event.kind !== "memory_event") return null;
  if (event.toast) return stripMemoryToastPrefix(String(event.toast));
  if (event.engram) return stripMemoryToastPrefix(event.engram.content);
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
  if (text.includes("one question") || text.includes("direct feedback")) return "direct feedback";
  if (text.includes("anxious") || text.includes("freezing")) return "interview pressure";
  if (text.includes("technical detail") || text.includes("impact")) return "answer focus";
  if (text.includes("interview") || text.includes("monday") || text.includes("friday")) {
    return "interview timing";
  }
  return item.type.replace("_", " ").split(" ").slice(0, 2).join(" ");
}

function memoryLabels(items?: MemoryPackItem[]) {
  if (!items?.length) return [];
  return Array.from(new Set(items.map(memoryLabel))).slice(0, 3);
}

function confidenceFrom(items?: MemoryPackItem[]) {
  if (!items?.length) return undefined;
  const confidenceValues = items
    .map((item) => item.confidence)
    .filter((value): value is number => typeof value === "number");
  if (!confidenceValues.length) return undefined;
  return Math.round(
    (confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length) * 100
  );
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function findDemoEngram(nodes: Engram[], criteria: DemoEngramCriteria) {
  const contains = criteria.contains?.toLowerCase();
  const typeMatches = nodes.filter(
    (node) => node.status === "active" && (!criteria.type || node.type === criteria.type)
  );
  if (!contains) return typeMatches[0] ?? null;
  return typeMatches.find((node) => node.content.toLowerCase().includes(contains)) ?? typeMatches[0] ?? null;
}

export function SessionClient() {
  const director = useDemoDirector();
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
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const hasChatRef = useRef(false);
  const sessionRef = useRef<SessionRecord | null>(null);
  const sendMessageRef = useRef<
    ((message?: string, signal?: AbortSignal) => Promise<void>) | null
  >(null);
  const initialBootStartedRef = useRef(false);
  const bootRequestRef = useRef(0);

  const loadGraph = useCallback(async () => {
    const data = await fetchGraph();
    setGraph(data);
    setSelected((current) => {
      if (!current) return current;
      return data.nodes.find((node) => node.id === current.id) ?? current;
    });
    return data;
  }, []);

  const boot = useCallback(async () => {
    const requestId = bootRequestRef.current + 1;
    bootRequestRef.current = requestId;
    setBooting(true);
    setError(null);
    try {
      const [sessions, graphData] = await Promise.all([listSessions(), fetchGraph()]);
      const latest = sessions.sessions[sessions.sessions.length - 1] ?? null;
      const active = latest && !latest.ended_at ? latest : await createSession(SESSION_ONE_TITLE);
      const nextPack = active.memory_pack ?? (await fetchMemoryPack(active.id));
      if (bootRequestRef.current !== requestId) return;
      sessionRef.current = active;
      setSession(active);
      setGraph(graphData);
      setPack(nextPack);
    } catch (err) {
      if (bootRequestRef.current !== requestId) return;
      setError(humanError(err));
    } finally {
      if (bootRequestRef.current === requestId) {
        setBooting(false);
      }
    }
  }, []);

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

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = "60px";
    const nextHeight = Math.min(168, Math.max(60, composer.scrollHeight));
    composer.style.height = `${nextHeight}px`;
    if (composer.scrollHeight > nextHeight) {
      composer.scrollTop = composer.scrollHeight;
    }
  }, [draft]);

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

    const unsubscribeReload = onDemoReload(async ({ session: nextSession, resolve, reject }) => {
      try {
        const requestId = bootRequestRef.current + 1;
        bootRequestRef.current = requestId;
        sessionRef.current = null;
        setSession(null);
        setPack(null);
        setGraph(emptyGraph);
        setItems([]);
        setDraft("");
        setSelected(null);
        setLastMemoryEvent(null);
        setDreaming(false);
        setError(null);
        if (nextSession) {
          setBooting(true);
          const [graphData, nextPack] = await Promise.all([
            fetchGraph(),
            nextSession.memory_pack ?? fetchMemoryPack(nextSession.id)
          ]);
          if (bootRequestRef.current !== requestId) {
            resolve();
            return;
          }
          sessionRef.current = nextSession;
          setSession(nextSession);
          setGraph(graphData);
          setPack(nextPack);
          setBooting(false);
          resolve();
          return;
        }
        await boot();
        resolve();
      } catch (err) {
        setBooting(false);
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
  const directorActive = director.status !== "idle";
  const durableMemoryCount = graph.nodes.filter(
    (node) => node.status === "active" && !node.provisional
  ).length;
  const sessionLabel = session?.title.split("·")[0]?.trim() ?? "No session";
  return (
    <div className="grid min-h-dvh overflow-hidden bg-field lg:h-dvh lg:grid-cols-[minmax(560px,46%)_minmax(0,54%)]">
      <section id="session-story" className="cosmic-shell flex min-h-dvh flex-col border-hairline lg:h-dvh lg:min-h-0 lg:border-r">
        <header className="relative shrink-0 px-6 pb-4 pt-6 md:px-10 lg:px-11 lg:pt-7">
          <div className="min-w-0">
            <div className="min-w-0">
              <p className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-starlight">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-coral" />
                Visible memory engine
              </p>
              <h1 className="display-glow font-display text-[40px] font-medium leading-[0.95] text-starlight md:text-[48px] xl:text-[54px]">
                REVERIE
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-6 text-dim">
                A memory agent that remembers, revises, and forgets across sessions.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-dim">
                <span className="text-starlight">Lena</span>
                <span aria-hidden="true" className="text-faint">·</span>
                <span>{sessionLabel}</span>
                <span aria-hidden="true" className="text-faint">·</span>
                <span>{durableMemoryCount} durable {durableMemoryCount === 1 ? "memory" : "memories"}</span>
              </div>
            </div>

          </div>

          {error ? (
            <p role="alert" className="relative mt-4 pl-4 text-sm leading-6 text-coral">
              <span className="transcript-rail absolute bottom-1 left-0 top-1 w-[3px] rounded-full" />
              {error}
            </p>
          ) : null}
        </header>

        <div id="session-thread" className="min-h-0 flex-1 overflow-y-auto px-6 py-3 md:px-10 lg:px-11">
          {booting ? (
            <div className="space-y-4">
              <div className="h-4 w-1/3 rounded-full bg-field-2" />
              <div className="stellar-panel h-32" />
              <div className="stellar-panel ml-auto h-36 w-5/6" />
            </div>
          ) : hasMessages ? (
            <div className="space-y-3 pb-6">
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
                    actor={item.role === "student" ? "Lena" : "Reverie"}
                    timestamp={formatTime(item.createdAt)}
                    variant={item.role === "student" ? "person" : "reverie"}
                    tags={memoryLabels(item.usedEngrams)}
                    confidence={item.role === "tutor" ? confidenceFrom(item.usedEngrams) : undefined}
                    confidenceLabel="MEMORY SUPPORT"
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
          ) : session ? (
            <div className="pb-6">
              <EmptyState title="No messages yet">
                <p>Memories form from what is said here.</p>
              </EmptyState>
            </div>
          ) : (
            <div className="pb-6">
              <EmptyState title="Memory engine offline">
                <p>Reconnect the backend to restore the persisted session and memory graph.</p>
              </EmptyState>
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
              ref={composerRef}
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
              placeholder="Message Reverie..."
            />
          </ComposerChrome>
        </form>
      </section>

      <BrainMapPanel
        graph={graph}
        event={lastMemoryEvent}
        attentionIds={pack?.winners.map((item) => item.engram_id) ?? []}
        selectedId={selected?.id}
        onSelectMemory={setSelected}
        budget={
          pack
            ? {
                used: pack.used,
                total: pack.budget,
                available: Math.max(0, pack.budget - pack.used),
                percent: (pack.used / Math.max(1, pack.budget)) * 100,
                selected: pack.pipeline?.selected,
                searched: pack.pipeline?.searched,
                filtered: pack.pipeline?.filtered,
                ranked: pack.pipeline?.ranked,
                retrievalMs: pack.pipeline?.retrieval_ms
              }
            : undefined
        }
      />

      <MemoryInspector
        engram={selected}
        onClose={() => setSelected(null)}
        presentation={directorActive}
        sessionId={session?.id}
        retrievalItem={pack?.winners.find((item) => item.engram_id === selected?.id)}
        onChanged={async () => {
          setSelected(null);
          await loadGraph();
          if (sessionRef.current) {
            setPack(await fetchMemoryPack(sessionRef.current.id));
          }
        }}
      />
    </div>
  );
}
