"use client";

import { motion } from "framer-motion";
import { MoreHorizontal, Moon, Plus, RefreshCcw, Send, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BudgetMeter } from "@/components/BudgetMeter";
import { ConstellationCanvas } from "@/components/ConstellationCanvas";
import { MemoryInspector } from "@/components/MemoryInspector";
import { RichText } from "@/components/RichText";
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

const sessionOneStarterTurns = [
  "I keep freezing when someone says the midterm is going to lean on chain rule. I can do plain power rule, but nested functions make me second-guess myself.",
  "Like with f(g(x)), my hand wants to write f'(x) times g'(x). I know that smells like product rule, but it is the mistake I keep making.",
  "Could we start with actual numbers first? If I see one worked example, the rule usually lands better.",
  "Please ask me one small question at a time. When someone dumps the full solution, I nod along and then cannot repeat it.",
  "Also, I usually study late after work, so shorter practice sets are easier for me to stick with."
];

const sessionTwoStarterTurns = [
  "Can we pick up from yesterday? I remember I mixed up the nested thing with product rule, but I want to try a worked one first.",
  "For (3x^2 + 5)^4, I think the outside derivative is 4(3x^2 + 5)^3, and then I multiply by 6x. Is that finally the move?",
  "It feels less panicky if I write outside first, then inside, almost like a checklist.",
  "One smaller thing still blurs: sin(5x^2). I forget whether cos keeps the inside unchanged before I multiply by the inside derivative.",
  "The power rule itself is fine now. It is recognizing that something is nested that slows me down."
];

const memoryDotColors: Record<string, string> = {
  misconception: "bg-coral",
  mastery: "bg-gold",
  preference: "bg-moth",
  affect: "bg-moth",
  goal: "bg-ember",
  fact: "bg-ember",
  strategy_outcome: "bg-ember"
};

const markerEyebrows: Record<string, string> = {
  "engram.observed": "new memory",
  "engram.reinforced": "memory reinforced",
  "engram.superseded": "memory rewritten"
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

function sessionEyebrow(session: SessionRecord | null) {
  const match = /session\s*(\d+)/i.exec(session?.title ?? "");
  const parts = [shortDate(session?.started_at), "Maya Chen"];
  if (match) parts.push(`Session ${match[1]}`);
  return parts.join(" · ");
}

function sessionHeadline(session: SessionRecord | null) {
  const title = session?.title ?? "Session - chain rule";
  const subject = title.split(" - ")[1] ?? title;
  const sentence = subject.charAt(0).toUpperCase() + subject.slice(1);
  return /[.?!]$/.test(sentence) ? sentence : `${sentence}.`;
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

function sessionNumber(session: SessionRecord | null) {
  const match = /session\s*(\d+)/i.exec(session?.title ?? "");
  return match?.[1] ?? "1";
}

function SessionTimeline({
  session,
  dreaming
}: {
  session: SessionRecord | null;
  dreaming: boolean;
}) {
  const active = sessionNumber(session);
  return (
    <section className="flex h-full items-center border-l border-hairline px-8">
      <div className="w-full">
        <div className="flex items-center justify-between font-mono text-[15px] text-starlight">
          <span className={active === "1" ? "text-starlight" : "text-dim"}>S1</span>
          <span className="text-dim">-</span>
          <span className={`inline-flex items-center gap-2 ${dreaming ? "text-glow" : "text-dim"}`}>
            <Moon aria-hidden="true" size={16} strokeWidth={1.8} />
            dream
          </span>
          <span className="text-dim">-</span>
          <span className={active === "2" ? "text-glow" : "text-ember"}>S2</span>
        </div>
        <div className="relative mt-5 h-8">
          <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-sage/60 via-dim/50 to-ember/70" />
          <div
            className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${
              active === "1" ? "bg-glow ember-glow" : "bg-dim"
            }`}
            style={{ left: "5%" }}
          />
          <div
            className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              dreaming ? "bg-glow ember-glow" : "bg-faint"
            }`}
          />
          <div
            className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${
              active === "2" ? "bg-ember ember-glow" : "bg-faint"
            }`}
            style={{ right: "5%" }}
          />
        </div>
      </div>
    </section>
  );
}

export function SessionClient() {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [graph, setGraph] = useState<MemoryGraph>(emptyGraph);
  const [pack, setPack] = useState<MemoryPack | null>(null);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<Engram | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [dreaming, setDreaming] = useState(false);
  const [dreamStages, setDreamStages] = useState<Record<string, DreamStage>>({});
  const [lastReport, setLastReport] = useState<DreamReport | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasChatRef = useRef(false);

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
    hasChatRef.current = items.some((item) => item.kind === "message");
  }, [items]);

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

      window.setTimeout(() => loadGraph().catch(() => undefined), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tutor stream failed.");
      patchMessage(tutorLocalId, {
        pending: false,
        content: "The tutor stream is unavailable. The memory state is still intact."
      });
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
      setItems([]);
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
  const hasMessages = items.some((item) => item.kind === "message");

  return (
    <div className="cosmic-shell grid min-h-dvh overflow-hidden md:min-h-[calc(100dvh-1.5rem)] lg:h-[calc(100dvh-1.5rem)] lg:grid-cols-[minmax(390px,44%)_minmax(0,56%)]">
      <section className="order-2 flex min-h-[66dvh] flex-col border-hairline bg-void/72 lg:order-1 lg:h-full lg:min-h-0 lg:border-r">
        <header className="border-b border-hairline bg-void/62 px-7 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
                {sessionEyebrow(session)}
              </p>
              <h1 className="display-glow mt-2 font-display text-[44px] font-medium leading-none text-starlight">
                {sessionHeadline(session)}
              </h1>
            </div>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                disabled={!session || dreaming || streaming}
                onClick={() => runDream()}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-field/80 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ember transition hover:border-ember/50 hover:text-glow disabled:cursor-not-allowed disabled:text-faint"
              >
                <Moon aria-hidden="true" size={16} strokeWidth={1.8} />
                <span>End session</span>
              </button>
              <button
                type="button"
                aria-label="More session actions"
                title="More session actions"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-field/80 text-dim transition hover:text-starlight"
              >
                <MoreHorizontal aria-hidden="true" size={18} strokeWidth={1.8} />
              </button>
              {menuOpen ? (
                <div className="stellar-panel absolute right-0 top-12 z-30 w-44 rounded-lg p-2">
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
            <p className="relative mt-4 pl-4 text-sm leading-6 text-coral">
              <span className="transcript-rail absolute bottom-1 left-0 top-1 w-[3px] rounded-full" />
              {error}
            </p>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto px-7 py-5">
          <div
            className={`flex min-h-full flex-col ${
              hasMessages ? "justify-end" : "justify-start"
            }`}
          >
            {booting ? (
              <div className="space-y-4 pb-4">
                <div className="h-4 w-2/3 rounded-full bg-field-2" />
                <div className="stellar-panel ml-auto h-20 w-4/5 rounded-lg" />
                <div className="h-28 w-5/6 bg-void" />
              </div>
            ) : !hasMessages ? (
              <div className="flex flex-col gap-3 pb-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
                  pick up the thread
                </p>
                {starterTurns.map((turn) => (
                  <button
                    key={turn}
                    type="button"
                    onClick={() => sendMessage(turn)}
                    className="stellar-panel group relative min-h-[64px] overflow-hidden rounded-lg px-7 py-3.5 text-left font-mono text-[13px] leading-6 text-starlight/90 transition hover:border-ember/50 hover:text-starlight"
                  >
                    <span className="transcript-rail absolute bottom-5 left-0 top-5 w-[3px] rounded-full opacity-95" />
                    <RichText text={turn} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-7 pb-4">
                {items.map((item) =>
                  item.kind === "memory" ? (
                    <motion.div
                      key={item.localId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="flex items-center gap-3"
                      role="status"
                    >
                      <span className="hairline-divider h-px flex-1 opacity-60" />
                      <span className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-ember">
                        <Sparkles aria-hidden="true" size={12} strokeWidth={1.8} />
                        <span className="truncate">
                          {item.eyebrow} - {item.content.toLowerCase()}
                        </span>
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
                        <div className="stellar-panel max-w-[76%] rounded-lg px-6 py-4 font-mono text-[15px] leading-7 text-starlight">
                          <RichText text={item.content} />
                        </div>
                      ) : (
                        <div className="relative max-w-[94%] pl-6 font-mono text-[15px] leading-8 text-starlight">
                          <span className="transcript-rail absolute bottom-1 left-0 top-1 w-[3px] rounded-full" />
                          {item.content ? (
                            <RichText text={item.content} />
                          ) : (
                            <p className="text-dim">{item.pending ? "Thinking…" : ""}</p>
                          )}
                          {item.usedEngrams?.length ? (
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
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
          className="border-t border-hairline bg-void/72 px-7 py-4"
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
            <div className="stellar-panel flex items-end gap-3 rounded-[18px] px-4 py-2.5 focus-within:border-ember/50">
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
                className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 font-display text-[24px] leading-8 text-starlight outline-none placeholder:text-dim disabled:cursor-not-allowed disabled:text-faint"
                placeholder="Type your message…"
              />
              <button
                type="submit"
                aria-label="Send message"
                title="Send message"
                disabled={streaming || !draft.trim() || !session}
                className="brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[0_0_28px_rgba(255,111,94,0.38)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Send aria-hidden="true" size={25} strokeWidth={2.35} />
              </button>
            </div>
          )}
        </form>
      </section>

      <section className="order-1 flex h-[58dvh] min-h-[520px] flex-col bg-void lg:order-2 lg:h-full lg:min-h-0">
        <div className="relative min-h-0 flex-1">
          <ConstellationCanvas
            graph={graph}
            selectedId={selected?.id ?? null}
            highlightedId={highlightedId}
            pulseId={pulseId}
            onSelect={setSelected}
          />

          <div className="pointer-events-none absolute left-8 top-7 max-w-[calc(100%-4rem)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ember">
              the constellation
            </p>
            <p className="mt-1 max-w-sm font-mono text-[11px] leading-5 text-dim">
              {graph.nodes.length} memories · {graph.nodes.filter((node) => node.provisional).length} provisional
            </p>
          </div>

          {Object.keys(dreamStages).length ? (
            <div className="stellar-panel absolute bottom-5 left-8 right-8 rounded-lg p-3 backdrop-blur">
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

        <div className="grid min-h-[136px] shrink-0 border-t border-hairline bg-void/78 lg:grid-cols-[55%_45%]">
          <BudgetMeter
            pack={pack}
            engrams={graph.nodes}
            onHover={setHighlightedId}
            onSelect={selectEngramById}
          />
          <SessionTimeline session={session} dreaming={dreaming} />
        </div>
      </section>

      <MemoryInspector engram={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
