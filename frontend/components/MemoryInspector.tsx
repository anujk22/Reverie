"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { RichText } from "@/components/RichText";
import {
  correctEngram,
  fetchEngramDetail,
  forgetEngram,
  type Engram,
  type EngramDetail,
  type MemoryPackItem
} from "@/lib/api";
import { labelText } from "@/lib/text";

const typeText: Record<string, string> = {
  misconception: "text-coral",
  mastery: "text-gold",
  preference: "text-moth",
  affect: "text-moth",
  goal: "text-ember",
  fact: "text-ember",
  strategy_outcome: "text-ember"
};

function trimQuote(value: string) {
  return value.length > 140 ? `${value.slice(0, 140).trimEnd()}…` : value;
}

function trimMemory(value: string) {
  return value.length > 110 ? `${value.slice(0, 110).trimEnd()}…` : value;
}

function shortDate(value?: string) {
  if (!value) return "unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function eventLabel(value: string) {
  const labels: Record<string, string> = {
    "engram.observed": "Candidate extracted",
    "engram.consolidated": "Made durable",
    "engram.merged": "Duplicate consolidated",
    "engram.superseded": "Older version superseded",
    "engram.reinforced": "Selected for context",
    "engram.decayed": "Strength decayed",
    "engram.archived": "Below retention floor"
  };
  return labels[value] ?? labelText(value.replace(/^engram\./, ""));
}

export function MemoryInspector({
  engram,
  onClose,
  presentation = false,
  sessionId,
  retrievalItem,
  onChanged
}: {
  engram: Engram | null;
  onClose: () => void;
  presentation?: boolean;
  sessionId?: string;
  retrievalItem?: MemoryPackItem;
  onChanged?: () => Promise<void> | void;
}) {
  const [detail, setDetail] = useState<EngramDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [correction, setCorrection] = useState("");
  const [confirmForget, setConfirmForget] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!engram) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setDetail(null);
    setError(null);
    setEditing(false);
    setCorrection(engram.content);
    setConfirmForget(false);
    setActionError(null);
    fetchEngramDetail(engram.id)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [engram]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const current = detail?.engram ?? engram;
  const typeClass = current ? (typeText[current.type] ?? "text-ember") : "text-ember";
  const tags = useMemo(() => current?.subject_tags ?? [], [current]);

  async function saveCorrection() {
    if (!current || !sessionId || correction.trim() === current.content.trim()) return;
    setSaving(true);
    setActionError(null);
    try {
      await correctEngram(current.id, sessionId, correction.trim());
      await onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not correct this memory.");
    } finally {
      setSaving(false);
    }
  }

  async function forgetMemory() {
    if (!current) return;
    setSaving(true);
    setActionError(null);
    try {
      await forgetEngram(current.id, sessionId);
      await onChanged?.();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not forget this memory.");
    } finally {
      setSaving(false);
    }
  }

  if (!current) return null;

  return (
    <aside
      className={`stellar-panel fixed inset-x-4 bottom-4 z-40 max-h-[78dvh] overflow-y-auto rounded-lg p-5 lg:inset-x-auto lg:right-8 ${
        presentation
          ? "lg:bottom-auto lg:top-24 lg:max-h-[calc(100dvh-15rem)] lg:w-[min(600px,calc(54vw-4rem))]"
          : "lg:bottom-5 lg:top-auto lg:max-h-[70dvh] lg:w-[min(620px,calc(54vw-3rem))]"
      }`}
      aria-label="Memory inspector"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`font-mono text-[11px] uppercase tracking-[0.22em] ${typeClass}`}>
            {labelText(current.type)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-hairline bg-field-2 px-2 py-1 font-mono text-[10px] uppercase text-dim">
              {labelText(current.status)}
            </span>
            {current.provisional ? (
              <span className="rounded-full border border-ember/40 px-2 py-1 font-mono text-[10px] uppercase text-ember">
                Provisional
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close inspector"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-field-2 text-dim transition hover:text-starlight"
        >
          <X aria-hidden="true" size={18} strokeWidth={1.8} />
        </button>
      </div>

      <div
        className={`display-glow font-display leading-tight text-starlight ${
          presentation
            ? "mt-4 line-clamp-3 text-[28px] md:text-[32px]"
            : "mt-6 text-[30px]"
        }`}
      >
        <RichText text={presentation ? trimMemory(current.content) : current.content} />
      </div>

      {detail?.provenance?.[0] ? (
        <div className={presentation ? "mt-4 border-t border-hairline pt-4" : "mt-4"}>
          {presentation ? (
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
              Source quote
            </p>
          ) : null}
          <div
            className={`font-display italic leading-snug text-glow ${
              presentation ? "line-clamp-3 text-[16px]" : "text-lg"
            }`}
          >
            <RichText
              text={`'${trimQuote(detail.provenance[0].content)}' - said ${shortDate(
                detail.provenance[0].created_at
              )}`}
            />
          </div>
        </div>
      ) : null}

      {presentation ? (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-hairline pt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-dim">
          <span>Extraction confidence {Math.round(current.confidence * 100)}%</span>
          <span>Strength {Math.round(current.strength * 100)}%</span>
          <span>Recalled {current.access_count}x</span>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <div className="h-1.5 overflow-hidden rounded-full bg-field-2">
              <div
                className="brand-gradient h-full rounded-full"
                style={{ width: `${Math.round(Math.max(0.04, current.strength) * 100)}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-[12px] text-dim">
              {current.strength.toFixed(2)} · Recalled ×{current.access_count}
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-hairline bg-field-2/80 p-4 font-mono text-[11px] text-dim">
            <div>
              <dt>Extraction confidence</dt>
              <dd className="mt-1 text-starlight">{current.confidence.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Strength</dt>
              <dd className="mt-1 text-starlight">{current.strength.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Recalled</dt>
              <dd className="mt-1 text-starlight">{current.access_count}x</dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd className="mt-1 text-starlight">{shortDate(current.created_at)}</dd>
            </div>
            <div>
              <dt>Last retrieved</dt>
              <dd className="mt-1 text-starlight">{shortDate(current.last_accessed_at)}</dd>
            </div>
            <div>
              <dt>Consolidation</dt>
              <dd className="mt-1 text-starlight">
                {current.provisional ? "Awaiting dream" : "Durable"}
              </dd>
            </div>
          </dl>

          {retrievalItem ? (
            <section className="mt-5 rounded-lg border border-sage/30 bg-field-2/80 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-sage">
                Selected for this response
              </p>
              <p className="mt-2 text-sm leading-5 text-starlight">
                {retrievalItem.selection_reason ?? "Selected by the retrieval ranker."}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-3 font-mono text-[10px] text-dim">
                <div>
                  <dt>Match</dt>
                  <dd className="mt-1 text-starlight">
                    {retrievalItem.semantic_similarity?.toFixed(2) ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt>Rank score</dt>
                  <dd className="mt-1 text-starlight">{retrievalItem.score.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Token cost</dt>
                  <dd className="mt-1 text-starlight">{retrievalItem.tokens}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-hairline px-2 py-1 font-mono text-[10px] text-dim"
              >
                {tag}
              </span>
            ))}
          </div>

          {current.superseded_by ? (
            <div className="mt-5 rounded-lg border border-coral/40 bg-field-2 p-3 text-sm leading-5 text-coral">
              Overwritten by a newer memory
            </div>
          ) : null}

          <section className="mt-7">
            <h3 className="text-[14px] font-medium text-starlight">
              Provenance
            </h3>
            <div className="mt-3 grid gap-3">
              {detail?.provenance?.length ? (
                detail.provenance.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="relative rounded-lg border border-hairline bg-field-2/80 p-3 pl-5 text-left font-mono text-[12px] leading-6 text-starlight"
                    onClick={() => {
                      document.getElementById(item.id)?.scrollIntoView({
                        block: "center",
                        behavior: "smooth"
                      });
                    }}
                  >
                    <span className="transcript-rail absolute bottom-3 left-0 top-3 w-[3px] rounded-full" />
                    <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
                      {item.role} · session {item.session_id.slice(-6)} · {shortDate(item.created_at)}
                    </span>
                    <span className="mt-2 block">
                      <RichText text={item.content} />
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-sm leading-6 text-dim">
                  {error ? `Could not load provenance: ${error}` : "Loading provenance."}
                </p>
              )}
            </div>
          </section>

          <section className="mt-7">
            <h3 className="text-[14px] font-medium text-starlight">
              Lifecycle
            </h3>
            <ol className="mt-3">
              {detail?.events?.length ? (
                detail.events.map((event) => (
                  <li key={event.id} className="relative pb-4 pl-4">
                    <span className="absolute left-0 top-1 h-2 w-2 rounded-full bg-ember" />
                    <p className="font-mono text-[11px] text-starlight">
                      {eventLabel(event.event_type)}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-dim">
                      {shortDate(event.created_at)}
                    </p>
                  </li>
                ))
              ) : (
                <li className="ml-4 text-sm text-dim">Loading lifecycle.</li>
              )}
            </ol>
          </section>

          {current.status === "active" && sessionId ? (
            <section className="mt-7 border-t border-hairline pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[14px] font-medium text-starlight">Memory controls</h3>
                  <p className="mt-1 text-xs leading-5 text-dim">
                    Corrections preserve the earlier version and direct provenance.
                  </p>
                </div>
                {!editing ? (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="flex min-h-11 items-center gap-2 rounded-full border border-hairline px-4 font-mono text-[11px] text-dim transition hover:text-starlight"
                  >
                    <Pencil aria-hidden="true" size={14} />
                    Correct
                  </button>
                ) : null}
              </div>

              {editing ? (
                <div className="mt-4">
                  <label htmlFor="memory-correction" className="sr-only">
                    Corrected memory
                  </label>
                  <textarea
                    id="memory-correction"
                    value={correction}
                    onChange={(event) => setCorrection(event.target.value)}
                    rows={4}
                    maxLength={500}
                    className="w-full rounded-lg border border-hairline bg-field-2 p-3 text-sm leading-6 text-starlight outline-none transition focus:border-sage/60"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving || correction.trim() === current.content.trim()}
                      onClick={saveCorrection}
                      className="premium-button premium-button-primary"
                    >
                      <Check aria-hidden="true" size={15} />
                      {saving ? "Saving" : "Store correction"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setEditing(false);
                        setCorrection(current.content);
                      }}
                      className="premium-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {confirmForget ? (
                  <>
                    <p className="mr-auto text-xs text-coral">Remove this memory and its vector?</p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={forgetMemory}
                      className="flex min-h-11 items-center gap-2 rounded-full border border-coral/50 px-4 font-mono text-[11px] text-coral"
                    >
                      <Trash2 aria-hidden="true" size={14} />
                      {saving ? "Forgetting" : "Confirm forget"}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setConfirmForget(false)}
                      className="min-h-11 rounded-full px-4 font-mono text-[11px] text-dim"
                    >
                      Keep memory
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmForget(true)}
                    className="flex min-h-11 items-center gap-2 font-mono text-[11px] text-dim transition hover:text-coral"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                    Forget this memory
                  </button>
                )}
              </div>
              {actionError ? (
                <p role="alert" className="mt-3 text-xs leading-5 text-coral">
                  {actionError}
                </p>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </aside>
  );
}
