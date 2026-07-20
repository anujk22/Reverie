"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  advanceClock,
  createSession,
  endSession,
  fetchMemoryPack,
  runLatestDream,
  resetDemo,
  type SessionRecord
} from "@/lib/api";
import {
  closeDemoInspector,
  hasDemoGraphRefreshListener,
  hasDemoSendListener,
  hasDemoSelectEngramListener,
  refreshDemoGraph,
  reloadDemoSession,
  selectDemoEngram,
  sendDemoMessage
} from "@/lib/demoBus";
import { filmScript, type DemoBeat, type DemoPage } from "@/lib/filmScript";

type DirectorStatus = "idle" | "playing" | "paused" | "done";

type StartOptions = {
  autoplay?: boolean;
};

type DemoDirectorContextValue = {
  status: DirectorStatus;
  currentBeat: DemoBeat | null;
  currentBeatIndex: number;
  totalBeats: number;
  busy: boolean;
  autoplay: boolean;
  start: (options?: StartOptions) => void;
  exit: () => void;
  replay: () => void;
  advance: () => void;
  replayBeat: () => void;
  toggleAutoplay: () => void;
};

const DemoDirectorContext = createContext<DemoDirectorContextValue | null>(null);

function abortError() {
  const error = new Error("Director run cancelled.");
  error.name = "AbortError";
  return error;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Director action failed.";
}

function wait(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return Promise.resolve();
  if (signal?.aborted) return Promise.reject(abortError());

  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      window.clearTimeout(timer);
      reject(abortError());
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

function removeDirectorParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("film")) return;
  url.searchParams.delete("film");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function useDemoDirector() {
  const context = useContext(DemoDirectorContext);
  if (!context) {
    throw new Error("useDemoDirector must be used inside DemoDirectorProvider.");
  }
  return context;
}

export function DemoDirectorProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<DirectorStatus>("idle");
  const [beatIndex, setBeatIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusRef = useRef<DirectorStatus>("idle");
  const beatIndexRef = useRef(0);
  const busyRef = useRef(false);
  const autoplayRef = useRef(false);
  const playbackPausedRef = useRef(false);
  const errorRef = useRef<string | null>(null);
  const runTokenRef = useRef(0);
  const autoTimerRef = useRef<number | null>(null);
  const autoTimerStartedAtRef = useRef<number | null>(null);
  const autoTimerRemainingRef = useRef<number | null>(null);
  const runBeatRef = useRef<(index: number) => void>(() => undefined);
  const abortRef = useRef<AbortController | null>(null);
  const currentSessionRef = useRef<SessionRecord | null>(null);
  const urlStartRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    beatIndexRef.current = beatIndex;
  }, [beatIndex]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    autoplayRef.current = autoplay;
  }, [autoplay]);

  useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current !== null) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    autoTimerStartedAtRef.current = null;
    autoTimerRemainingRef.current = null;
  }, []);

  const pauseAutoTimer = useCallback(() => {
    if (autoTimerRef.current === null) return;

    window.clearTimeout(autoTimerRef.current);
    autoTimerRef.current = null;
    if (
      autoTimerStartedAtRef.current !== null &&
      autoTimerRemainingRef.current !== null
    ) {
      const elapsed = performance.now() - autoTimerStartedAtRef.current;
      autoTimerRemainingRef.current = Math.max(
        0,
        autoTimerRemainingRef.current - elapsed
      );
    }
    autoTimerStartedAtRef.current = null;
  }, []);

  const waitForPlayback = useCallback(async (ms: number, signal?: AbortSignal) => {
    let remaining = ms;
    while (remaining > 0) {
      throwIfAborted(signal);
      if (playbackPausedRef.current) {
        await wait(50, signal);
        continue;
      }

      const slice = Math.min(remaining, 50);
      const startedAt = performance.now();
      await wait(slice, signal);
      if (!playbackPausedRef.current) {
        remaining -= performance.now() - startedAt;
      }
    }
  }, []);

  const navigateTo = useCallback(
    async (page: DemoPage, signal?: AbortSignal) => {
      throwIfAborted(signal);
      if (window.location.pathname !== page) {
        router.push(page);
        await waitForPlayback(450, signal);
      }
    },
    [router, waitForPlayback]
  );

  const focusBeat = useCallback(async (target: string | undefined, signal?: AbortSignal) => {
    if (!target) return;
    for (let index = 0; index < 12; index += 1) {
      throwIfAborted(signal);
      const element = document.getElementById(target);
      if (element) {
        if (target === "eval-results") {
          window.scrollTo({ top: 0, behavior: "auto" });
          await waitForPlayback(300, signal);
          return;
        }
        element.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "center"
        });
        await waitForPlayback(300, signal);
        return;
      }
      await waitForPlayback(100, signal);
    }
  }, [waitForPlayback]);

  const syncSessionPage = useCallback(async (signal?: AbortSignal, session?: SessionRecord) => {
    let lastError: unknown = null;
    for (let index = 0; index < 24; index += 1) {
      throwIfAborted(signal);
      try {
        await reloadDemoSession(session);
        return;
      } catch (err) {
        lastError = err;
        await waitForPlayback(120, signal);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("Session page is not ready.");
  }, [waitForPlayback]);

  const waitForSendListener = useCallback(async (signal?: AbortSignal) => {
    for (let index = 0; index < 24; index += 1) {
      throwIfAborted(signal);
      if (hasDemoSendListener()) return;
      await waitForPlayback(120, signal);
    }
    throw new Error("Session page is not ready.");
  }, [waitForPlayback]);

  const waitForGraphRefreshListener = useCallback(async (signal?: AbortSignal) => {
    for (let index = 0; index < 24; index += 1) {
      throwIfAborted(signal);
      if (hasDemoGraphRefreshListener()) return;
      await waitForPlayback(120, signal);
    }
    throw new Error("Graph view is not ready.");
  }, [waitForPlayback]);

  const waitForSelectEngramListener = useCallback(async (signal?: AbortSignal) => {
    for (let index = 0; index < 24; index += 1) {
      throwIfAborted(signal);
      if (hasDemoSelectEngramListener()) return;
      await waitForPlayback(120, signal);
    }
    throw new Error("Memory inspector is not ready.");
  }, [waitForPlayback]);

  const executeBeat = useCallback(
    async (beat: DemoBeat, signal?: AbortSignal) => {
      const { action } = beat;

      if (action.type === "reset") {
        await resetDemo();
        throwIfAborted(signal);
        currentSessionRef.current = await createSession(action.createSessionTitle);
        await navigateTo(beat.page, signal);
        await syncSessionPage(signal, currentSessionRef.current);
        return;
      }

      if (action.type === "create_session") {
        currentSessionRef.current = await createSession(action.title);
        if (action.showMemoryPack && currentSessionRef.current) {
          await fetchMemoryPack(currentSessionRef.current.id);
        }
        await navigateTo(beat.page, signal);
        await syncSessionPage(signal, currentSessionRef.current);
        return;
      }

      await navigateTo(beat.page, signal);

      if (action.type === "send_message") {
        await waitForSendListener(signal);
        await sendDemoMessage(action.text, signal);
        await waitForPlayback(action.settleMs ?? 0, signal);
        return;
      }

      if (action.type === "run_dream") {
        if (action.endCurrentSession && currentSessionRef.current) {
          await endSession(currentSessionRef.current.id);
          currentSessionRef.current = null;
        } else {
          await runLatestDream();
        }
        return;
      }

      if (action.type === "end_session") {
        if (!currentSessionRef.current) {
          throw new Error("No active session to end.");
        }
        await endSession(currentSessionRef.current.id);
        currentSessionRef.current = null;
        return;
      }

      if (action.type === "advance_clock") {
        await waitForGraphRefreshListener(signal);
        await advanceClock(action.days);
        await refreshDemoGraph();
        await waitForPlayback(action.settleMs ?? 0, signal);
        return;
      }

      if (action.type === "show_engram_inspector") {
        await waitForSelectEngramListener(signal);
        await selectDemoEngram({
          type: action.engramType,
          contains: action.contains
        });
        await waitForPlayback(action.holdMs ?? 0, signal);
        await closeDemoInspector();
        return;
      }

      if (action.type === "show_memory_pack") {
        if (!currentSessionRef.current) {
          throw new Error("No active session for memory pack.");
        }
        await fetchMemoryPack(currentSessionRef.current.id);
      }
    },
    [
      navigateTo,
      syncSessionPage,
      waitForGraphRefreshListener,
      waitForSelectEngramListener,
      waitForSendListener,
      waitForPlayback
    ]
  );

  const scheduleAutoAdvance = useCallback(
    (index: number, delay: number) => {
      clearAutoTimer();
      autoTimerRemainingRef.current = delay;
      autoTimerStartedAtRef.current = performance.now();
      autoTimerRef.current = window.setTimeout(() => {
        autoTimerRef.current = null;
        autoTimerStartedAtRef.current = null;
        autoTimerRemainingRef.current = null;
        runBeatRef.current(index + 1);
      }, delay);
    },
    [clearAutoTimer]
  );

  const runBeat = useCallback(
    async (index: number) => {
      clearAutoTimer();
      abortRef.current?.abort();

      if (index >= filmScript.length) {
        statusRef.current = "done";
        busyRef.current = false;
        setStatus("done");
        setBusy(false);
        setError(null);
        return;
      }

      const token = runTokenRef.current + 1;
      runTokenRef.current = token;
      const abortController = new AbortController();
      abortRef.current = abortController;

      statusRef.current = "playing";
      busyRef.current = true;
      setBeatIndex(index);
      setStatus("playing");
      setBusy(true);
      setError(null);

      try {
        const beat = filmScript[index];
        await executeBeat(beat, abortController.signal);
        await focusBeat(beat.focus, abortController.signal);
        if (runTokenRef.current !== token) return;
        abortRef.current = null;
        busyRef.current = false;
        setBusy(false);

        if (index === filmScript.length - 1) {
          statusRef.current = "done";
          setStatus("done");
          return;
        }

        if (autoplayRef.current) {
          scheduleAutoAdvance(index, beat.autoAdvanceMs ?? 3500);
        } else {
          statusRef.current = "paused";
          setStatus("paused");
        }
      } catch (err) {
        if (runTokenRef.current !== token) return;
        abortRef.current = null;
        busyRef.current = false;
        setBusy(false);
        if (err instanceof Error && err.name === "AbortError") return;
        statusRef.current = "paused";
        setStatus("paused");
        setError(errorMessage(err));
      }
    },
    [clearAutoTimer, executeBeat, focusBeat, scheduleAutoAdvance]
  );

  useEffect(() => {
    runBeatRef.current = runBeat;
  }, [runBeat]);

  const start = useCallback(
    (options?: StartOptions) => {
      if (busyRef.current || statusRef.current === "playing" || statusRef.current === "paused") {
        return;
      }
      removeDirectorParam();
      currentSessionRef.current = null;
      playbackPausedRef.current = false;
      setAutoplay(Boolean(options?.autoplay));
      autoplayRef.current = Boolean(options?.autoplay);
      runBeatRef.current(0);
    },
    []
  );

  const exit = useCallback(() => {
    runTokenRef.current += 1;
    clearAutoTimer();
    abortRef.current?.abort();
    abortRef.current = null;
    currentSessionRef.current = null;
    removeDirectorParam();
    statusRef.current = "idle";
    busyRef.current = false;
    autoplayRef.current = false;
    playbackPausedRef.current = false;
    errorRef.current = null;
    setStatus("idle");
    setBeatIndex(0);
    setBusy(false);
    setAutoplay(false);
    setError(null);
  }, [clearAutoTimer]);

  const advance = useCallback(() => {
    if (busyRef.current) return;
    clearAutoTimer();
    playbackPausedRef.current = false;

    const currentStatus = statusRef.current;
    if (currentStatus === "idle" || currentStatus === "done") return;

    const currentIndex = beatIndexRef.current;
    runBeatRef.current(currentIndex + 1);
  }, [clearAutoTimer]);

  const replayBeat = useCallback(() => {
    if (busyRef.current) return;
    clearAutoTimer();
    playbackPausedRef.current = false;

    const currentStatus = statusRef.current;
    if (currentStatus === "idle" || currentStatus === "done") return;

    runBeatRef.current(beatIndexRef.current);
  }, [clearAutoTimer]);

  const pauseAutoplay = useCallback(() => {
    pauseAutoTimer();
    autoplayRef.current = false;
    playbackPausedRef.current = true;
    setAutoplay(false);
    if (statusRef.current !== "idle" && statusRef.current !== "done") {
      statusRef.current = "paused";
      setStatus("paused");
    }
  }, [pauseAutoTimer]);

  const resumeAutoplay = useCallback(() => {
    if (statusRef.current === "idle" || statusRef.current === "done") return;
    autoplayRef.current = true;
    playbackPausedRef.current = false;
    setAutoplay(true);
    statusRef.current = "playing";
    setStatus("playing");

    if (
      !busyRef.current &&
      !errorRef.current &&
      beatIndexRef.current < filmScript.length - 1
    ) {
      const remainingDelay = autoTimerRemainingRef.current;
      scheduleAutoAdvance(
        beatIndexRef.current,
        remainingDelay ?? filmScript[beatIndexRef.current]?.autoAdvanceMs ?? 3500
      );
    }
  }, [scheduleAutoAdvance]);

  const toggleAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      pauseAutoplay();
      return;
    }

    resumeAutoplay();
  }, [pauseAutoplay, resumeAutoplay]);

  const replay = useCallback(() => {
    start({ autoplay: autoplayRef.current });
  }, [start]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!urlStartRef.current && url.searchParams.get("film") === "1") {
      urlStartRef.current = true;
      start();
    }
  }, [start]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (statusRef.current === "idle") return;

      if (event.key === "Escape") {
        event.preventDefault();
        exit();
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        toggleAutoplay();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        advance();
        return;
      }

      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "r") {
        event.preventDefault();
        replayBeat();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, exit, replayBeat, toggleAutoplay]);

  useEffect(() => {
    return () => {
      clearAutoTimer();
      abortRef.current?.abort();
    };
  }, [clearAutoTimer]);

  const context = useMemo<DemoDirectorContextValue>(
    () => ({
      status,
      currentBeat: filmScript[beatIndex] ?? null,
      currentBeatIndex: beatIndex,
      totalBeats: filmScript.length,
      busy,
      autoplay,
      start,
      exit,
      replay,
      advance,
      replayBeat,
      toggleAutoplay
    }),
    [advance, autoplay, beatIndex, busy, exit, replay, replayBeat, start, status, toggleAutoplay]
  );

  return (
    <DemoDirectorContext.Provider value={context}>
      {children}
      <DemoDirectorOverlay error={error} />
    </DemoDirectorContext.Provider>
  );
}

function DemoDirectorOverlay({ error }: { error: string | null }) {
  const {
    status,
    currentBeat,
    currentBeatIndex,
    totalBeats,
    busy,
    autoplay,
    exit,
    replay,
    toggleAutoplay
  } = useDemoDirector();

  if (status === "idle" || !currentBeat) return null;

  const caption = error ?? currentBeat.caption;
  const stateLabel = status === "done" ? "Done" : busy ? "Running" : autoplay ? "Playing" : "Paused";
  const inspectorBeat = currentBeat.action.type === "show_engram_inspector";

  if (!error) {
    const quietControlAction = status === "done" ? replay : toggleAutoplay;
    const quietControlLabel = status === "done" ? "Replay" : autoplay ? "Pause" : "Play";

    return (
      <div className="pointer-events-none fixed inset-0 z-50">
        <button
          type="button"
          aria-label={quietControlLabel}
          title={quietControlLabel}
          onClick={quietControlAction}
          className="pointer-events-auto fixed bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full border border-hairline/70 bg-field/80 text-dim opacity-70 shadow-sm transition hover:text-starlight hover:opacity-100"
        >
          {autoplay && status !== "done" ? (
            <Pause aria-hidden="true" size={12} strokeWidth={1.8} />
          ) : (
            <Play aria-hidden="true" size={12} strokeWidth={1.8} />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      <div
        className={`fixed bottom-4 w-[calc(100vw-2rem)] max-w-lg md:bottom-6 ${
          inspectorBeat
            ? "left-4 md:left-6 lg:left-[142px]"
            : "right-4 md:right-6"
        }`}
      >
        <div
          className="stellar-panel pointer-events-auto relative overflow-hidden rounded-lg px-4 py-3.5 md:px-5 md:py-4"
          role={error ? "alert" : undefined}
        >
          {busy ? <div className="dream-shimmer absolute inset-x-0 top-0 h-px" /> : null}
          <div className="flex flex-col gap-3.5">
            <div className="min-w-0">
              {error ? (
                <p className="mb-1.5 font-sans text-xs font-semibold text-coral">
                  Demo paused
                </p>
              ) : null}
              <p
                className={`text-wrap-pretty ${
                  error
                    ? "max-w-[46ch] font-sans text-[15px] leading-5 text-starlight"
                    : `font-display text-[20px] leading-6 text-starlight md:text-[22px] md:leading-[1.3] ${
                        inspectorBeat ? "max-w-[34ch]" : "max-w-[38ch]"
                      }`
                }`}
              >
                {caption}
              </p>
              {error ? (
                <p className="mt-1.5 font-sans text-xs leading-4 text-dim">
                  Press R to retry this beat.
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <span className="min-w-[72px] font-sans text-xs text-dim">
                {stateLabel}
              </span>
              <div className="flex flex-1 items-center gap-1.5" aria-label="Demo beat progress">
                {filmScript.map((beat, index) => (
                  <span
                    key={beat.id}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentBeatIndex
                        ? "w-7 bg-ember ember-glow"
                        : index < currentBeatIndex
                          ? "w-2 bg-glow/70"
                          : "w-2 bg-faint"
                    }`}
                  />
                ))}
              </div>
              <span className="whitespace-nowrap font-mono text-[10px] tracking-[0.04em] text-dim">
                {currentBeatIndex + 1} / {totalBeats}
              </span>
              <button
                type="button"
                aria-label={autoplay ? "Pause auto-advance" : "Resume auto-advance"}
                onClick={toggleAutoplay}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-field text-ember transition hover:text-glow"
              >
                {autoplay ? (
                  <Pause aria-hidden="true" size={14} strokeWidth={1.8} />
                ) : (
                  <Play aria-hidden="true" size={14} strokeWidth={1.8} />
                )}
              </button>
              <button
                type="button"
                aria-label="Exit film mode"
                onClick={exit}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-field text-dim transition hover:text-starlight"
              >
                <X aria-hidden="true" size={14} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          {status === "done" ? (
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={replay}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-hairline bg-field px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ember transition hover:text-glow"
              >
                <RotateCcw aria-hidden="true" size={14} strokeWidth={1.8} />
                <span>Replay</span>
              </button>
              <button
                type="button"
                onClick={exit}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-hairline bg-field px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-dim transition hover:text-starlight"
              >
                <X aria-hidden="true" size={14} strokeWidth={1.8} />
                <span>Exit</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
