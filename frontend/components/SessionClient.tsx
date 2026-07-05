"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal, Moon, Plus, RefreshCcw, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BudgetMeter } from "@/components/BudgetMeter";
import { ConstellationCanvas } from "@/components/ConstellationCanvas";
import { MemoryInspector } from "@/components/MemoryInspector";
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
import { uiText } from "@/lib/text";

type ChatMessage = {
  localId: string;
  backendId?: string;
  role: "student" | "tutor";
  content: string;
  createdAt: Date;
  usedEngrams?: MemoryPackItem[];
  pending?: boolean;
};

type Toast = {
  id: string;
  eyebrow: string;
  content: string;
};

type DreamStage = {
  stage: string;
  status: string;
  counts: Record<string, number>;
};

const emptyGraph: MemoryGraph = { nodes: [], links: [] };

const sessionOneStarterTurns = [
  "I keep freezing when someone says the midterm is going to lean on chain rule. I can do plain power rule, but nested functions make me second-guess myself.",
  "Like with f(g(x)), my hand wants to write f'(x) times g'(x). I know that smells like product rule, but it is the mistake I keep making.",
  "Could we start with actual numbers first? If I see one worked example, the rule usually lands better.",
  "Please ask me one small question at a time. When someone dumps the full solution, I nod along and then cannot repeat it.",
  "Also, I usually study late after work, so shorter practice sets are easier for me to stick with."
];

const sessionTwoStarterTurns = [
  "Can we pick up from yesterday? I remember I mixed up the nested thing with product rule, but I want to try a worked one first.",
  "For (3x^2 + 5)^4, I think the outside derivative is 4(3x^2 + 5)^3, and then I multiply by 6x for the inside. Is that finally the move?",
  "It feels less panicky if I write outside first, then inside, almost like a checklist.",
  "One smaller thing still blurs: sin(5x^2). I forget whether cos keeps the inside unchanged before I multiply by the inside derivative.",
  "The power rule itself is fine now. It is recognizing that something is nested that slows me down."
];

const memoryDotColors: Record<string, string> = {
  misconception: "bg-coral",
  mastery: "bg-sage",
  preference: "bg-moth",
  affect: "bg-moth",
  goal: "bg-ember",
  fact: "bg-ember",
  strategy_outcome: "bg-ember"
};

function localId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shortDate(value?: string) {
  if (!value) return "today";
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

function stageSummary(stage: DreamStage) {
  const entries = Object.entries(stage.counts ?? {});
  if (!entries.length) return stage.status;
  return entries.map(([key, value]) => `${value} ${key}`).join(" · ");
}

function eventToast(event: RuntimeEvent) {
  if (event.kind !== "memory_event") return null;
  if (event.toast) return String(event.toast);
  if (event.engram) return event.engram.content;
  return event.event_type;
}

function memoryLabel(item: MemoryPackItem) {
  const text = item.content.toLowerCase();
  if (text.includes("worked example") || text.includes("example")) return "example first";
  if (text.includes("anxious") || text.includes("anxiety") || text.includes("midterm")) return "exam nerves";
  if (text.includes("product rule")) return "product mixup";
  if (text.includes("power rule")) return "power rule";
  if (text.includes("guiding") || text.includes("question")) return "guided prompts";
  if (text.includes("late") || text.includes("shorter")) return "short sets";
  if (text.includes("outer") || text.includes("inner")) return "outer inner";
  return item.type.replace("_", " ").split(" ").slice(0, 2).join(" ");
}

export function SessionClient() {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [graph, setGraph] = useState<MemoryGraph>(emptyGraph);
  const [pack, setPack] = useState<MemoryPack | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<Engram | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dreaming, setDreaming] = useState(false);
  const [dreamStages, setDreamStages] = useState<Record<string, DreamStage>>({});
  const [lastReport, setLastReport] = useState<DreamReport | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadGraph = useCallback(async () => {
    const data = await fetchGraph();
    setGraph(data);
    setSelected((current) => {
      if (!current) return current;
      return data.nodes.find((node) => node.id === current.id) ?? current;
    });
  }, []);

  const startSession = useCallback(async (title?: string) => {
    const created = await createSession(title);
    setSession(created);
    setPack(created.memory_pack ?? null);
    setMessages([]);
    setDreamStages({});
    setLastReport(null);
    return created;
  }, []);

  const boot = useCallback(async () => {
    setBooting(true);
    setError(null);
    try {
      const [sessions, graphData] = await Promise.all([listSessions(), fetchGraph()]);
      const latest = sessions.sessions[sessions.sessions.length - 1] ?? null;
      const active = latest && !latest.ended_at ? latest : await startSession("Session 1 - chain rule");
      setSession(active);
      setGraph(graphData);
      if (active.memory_pack) {
        setPack(active.memory_pack);
      } else {
        setPack(await fetchMemoryPack(active.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Reverie.");
    } finally {
      setBooting(false);
    }
  }, [startSession]);

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    const source = new EventSource(apiUrl("/api/events/stream"));
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as RuntimeEvent;
        if (event.kind === "memory_event") {
          if (event.engram) {
            setPulseId(event.engram.id);
            window.setTimeout(() => setPulseId(null), 1400);
          }
          const content = eventToast(event);
          if (content) {
            const toast = {
              id: localId("toast"),
              eyebrow: event.event_type.replace("engram.", ""),
              content: uiText(content)
            };
            setToasts((items) => [toast, ...items].slice(0, 2));
            window.setTimeout(() => {
              setToasts((items) => items.filter((item) => item.id !== toast.id));
            }, 4800);
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
  }, [messages]);

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
          student_id: "stu_maya",
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

  async function sendMessage(message = draft) {
    const text = message.trim();
    if (!text || !session || streaming || dreaming) return;

    setDraft("");
    setError(null);
    setStreaming(true);

    const studentLocalId = localId("student");
    const tutorLocalId = localId("tutor");
    setMessages((items) => [
      ...items,
      {
        localId: studentLocalId,
        role: "student",
        content: text,
        createdAt: new Date()
      },
      {
        localId: tutorLocalId,
        role: "tutor",
        content: "",
        createdAt: new Date(),
        pending: true
      }
    ]);

    try {
      const response = await fetch(apiUrl(`/api/sessions/${session.id}/chat`), {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: text })
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
            setMessages((items) =>
              items.map((item) =>
                item.localId === tutorLocalId
                  ? { ...item, usedEngrams: nextPack.winners }
                  : item
              )
            );
          }
          if (payload.kind === "token") {
            reply += payload.token;
            setMessages((items) =>
              items.map((item) =>
                item.localId === tutorLocalId ? { ...item, content: reply } : item
              )
            );
          }
          if (payload.kind === "done") {
            setMessages((items) =>
              items.map((item) => {
                if (item.localId === studentLocalId) {
                  return { ...item, backendId: payload.student_utterance_id };
                }
                if (item.localId === tutorLocalId) {
                  return {
                    ...item,
                    backendId: payload.tutor_utterance_id,
                    content: payload.reply || reply,
                    pending: false
                  };
                }
                return item;
              })
            );
          }
        }
      }

      window.setTimeout(() => loadGraph().catch(() => undefined), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tutor stream failed.");
      setMessages((items) =>
        items.map((item) =>
          item.localId === tutorLocalId
            ? {
                ...item,
                pending: false,
                content: "The tutor stream is unavailable. The memory state is still intact."
              }
            : item
        )
      );
    } finally {
      setStreaming(false);
    }
  }

  async function runDream() {
    if (!session || dreaming) return;
    setDreaming(true);
    setError(null);
    try {
      const report = await endSession(session.id);
      setLastReport(report);
      await loadGraph();
      const next = await startSession("Session 2 - chain rule recall");
      setPack(next.memory_pack ?? (await fetchMemoryPack(next.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dream cycle failed.");
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
      setMessages([]);
      setSelected(null);
      setPack(null);
      await startSession("Session 1 - chain rule");
      await loadGraph();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBooting(false);
    }
  }

  const stageList = ["replay", "distill", "deduplicate", "reconcile", "decay", "report"];
  const starterTurns = session?.title?.includes("Session 2")
    ? sessionTwoStarterTurns
    : sessionOneStarterTurns;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(360px,44%)_minmax(0,56%)]">
      <section className="order-2 flex min-h-[60dvh] flex-col bg-void lg:order-1 lg:h-dvh lg:min-h-0">
        <header className="bg-field px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-dim">
                {shortDate(session?.started_at)} · Maya Chen
              </p>
              <h1 className="mt-2 font-display text-[28px] font-semibold leading-tight text-starlight">
                {session?.title ?? "Session - chain rule"}
              </h1>
            </div>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                disabled={!session || dreaming || streaming}
                onClick={() => runDream()}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-field-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ember transition hover:text-glow disabled:cursor-not-allowed disabled:text-faint"
              >
                <Moon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>End session</span>
              </button>
              <button
                type="button"
                aria-label="More session actions"
                title="More session actions"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-11 w-11 items-center justify-center rounded-md bg-field-2 text-dim transition hover:text-starlight"
              >
                <MoreHorizontal aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-12 z-30 w-44 rounded-md bg-field-2 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      startSession("Session 2 - chain rule recall").catch((err) =>
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
              last dream: {lastReport.duration_ms ?? "recorded"} ms
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 border-l border-coral pl-3 text-sm leading-6 text-coral">
              {error}
            </p>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex min-h-full flex-col justify-end">
            {booting ? (
              <div className="space-y-4 pb-4">
                <div className="h-4 w-2/3 rounded-full bg-field-2" />
                <div className="ml-auto h-20 w-4/5 rounded-md bg-field-2" />
                <div className="h-28 w-5/6 bg-void" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col gap-3 pb-4 text-sm leading-6 text-dim">
                {starterTurns.map((turn) => (
                  <button
                    key={turn}
                    type="button"
                    onClick={() => sendMessage(turn)}
                    className="min-h-11 rounded-[10px] bg-field-2 px-4 py-[14px] text-left text-starlight transition hover:text-glow"
                  >
                    {turn}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {messages.map((message) => (
                  <motion.article
                    key={message.localId}
                    id={message.backendId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className={message.role === "student" ? "flex justify-end" : "block"}
                  >
                    {message.role === "student" ? (
                      <div className="max-w-[72%] rounded-[10px] bg-field-2 px-4 py-[14px] text-sm leading-6 text-starlight">
                        {uiText(message.content)}
                      </div>
                    ) : (
                      <div className="max-w-[92%] border-l-2 border-ember pl-4 text-sm leading-7 text-starlight">
                        <p>
                          {uiText(message.content) || (message.pending ? "Thinking" : "")}
                        </p>
                        {message.usedEngrams?.length ? (
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-dim">
                              drawing on
                            </span>
                            {message.usedEngrams.map((item) => (
                              <button
                                key={item.engram_id}
                                type="button"
                                className="inline-flex min-h-7 items-center gap-1.5 rounded-full px-1 py-1 font-mono text-[11px] text-dim transition hover:text-starlight"
                                onMouseEnter={() => setHighlightedId(item.engram_id)}
                                onMouseLeave={() => setHighlightedId(null)}
                                onFocus={() => setHighlightedId(item.engram_id)}
                                onBlur={() => setHighlightedId(null)}
                                onClick={() => {
                                  selectEngramById(item.engram_id);
                                }}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    memoryDotColors[item.type] ?? "bg-ember"
                                  }`}
                                />
                                <span>{memoryLabel(item)}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </motion.article>
                ))}
                <div ref={scrollRef} />
              </div>
            )}
          </div>
        </div>

        <form
          className="bg-field p-4"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          {dreaming ? (
            <div className="flex min-h-14 items-center gap-3 text-sm text-dim">
              <span className="h-px flex-1 bg-ember" />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ember">
                dreaming
              </span>
              <span className="h-px flex-1 bg-ember" />
            </div>
          ) : (
            <div className="flex gap-3">
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
                rows={2}
                className="min-h-14 flex-1 resize-none rounded-md bg-field-2 px-4 py-3 text-sm leading-6 text-starlight placeholder:text-faint disabled:cursor-not-allowed disabled:text-faint"
                placeholder="Ask about f(g(x))"
              />
              <button
                type="submit"
                aria-label="Send message"
                title="Send message"
                disabled={streaming || !draft.trim() || !session}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-field-2 text-ember transition hover:text-glow disabled:cursor-not-allowed disabled:text-faint"
              >
                <Send aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
            </div>
          )}
        </form>
      </section>

      <section className="order-1 flex h-[52dvh] min-h-[460px] flex-col bg-void lg:order-2 lg:h-dvh">
        <div className="relative flex-1">
          <ConstellationCanvas
            graph={graph}
            selectedId={selected?.id ?? null}
            highlightedId={highlightedId}
            pulseId={pulseId}
            onSelect={setSelected}
          />

          <div className="pointer-events-none absolute left-4 top-4 max-w-[calc(100%-2rem)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-dim">
              the constellation
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-dim">
              {graph.nodes.length} memories · {graph.nodes.filter((node) => node.provisional).length} provisional
            </p>
          </div>

          {Object.keys(dreamStages).length ? (
            <div className="absolute bottom-4 left-4 right-4 rounded-md bg-field/95 p-3">
              <div className="flex flex-wrap gap-2">
                {stageList.map((stage) => {
                  const item = dreamStages[stage];
                  return (
                    <div
                      key={stage}
                      className={`rounded-full bg-field-2 px-2 py-1 font-mono text-[10px] ${
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

          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="absolute left-4 top-16 w-80 rounded-md bg-field p-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ember">
                  {toast.eyebrow}
                </p>
                <p className="mt-1 text-xs leading-5 text-starlight">{uiText(toast.content)}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <BudgetMeter
          pack={pack}
          engrams={graph.nodes}
          onHover={setHighlightedId}
          onSelect={selectEngramById}
        />
      </section>

      <MemoryInspector engram={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
