"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { RichText } from "@/components/RichText";
import { fetchEngramDetail, type Engram, type EngramDetail } from "@/lib/api";

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
    "engram.observed": "observed",
    "engram.consolidated": "consolidated",
    "engram.merged": "merged",
    "engram.superseded": "rewritten",
    "engram.reinforced": "recalled",
    "engram.decayed": "softened",
    "engram.archived": "let go"
  };
  return labels[value] ?? value.replace(/^engram\./, "").replace(/_/g, " ");
}

export function MemoryInspector({
  engram,
  onClose
}: {
  engram: Engram | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<EngramDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!engram) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setDetail(null);
    setError(null);
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

  if (!current) return null;

  return (
    <aside
      className="stellar-panel fixed inset-x-4 bottom-4 z-40 max-h-[78dvh] overflow-y-auto rounded-lg p-5 lg:inset-x-auto lg:bottom-[160px] lg:right-8 lg:top-auto lg:max-h-[42dvh] lg:w-[min(680px,calc(56vw-4rem))]"
      aria-label="Memory inspector"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`font-mono text-[11px] uppercase tracking-[0.22em] ${typeClass}`}>
            {current.type.replace("_", " ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-hairline bg-field-2 px-2 py-1 font-mono text-[10px] uppercase text-dim">
              {current.status}
            </span>
            {current.provisional ? (
              <span className="rounded-full border border-ember/40 px-2 py-1 font-mono text-[10px] uppercase text-ember">
                provisional
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

      <div className="display-glow mt-6 font-display text-[34px] leading-tight text-starlight">
        <RichText text={current.content} />
      </div>

      {detail?.provenance?.[0] ? (
        <div className="mt-4 font-display text-lg italic leading-snug text-glow">
          <RichText
            text={`'${trimQuote(detail.provenance[0].content)}' - said ${shortDate(
              detail.provenance[0].created_at
            ).toLowerCase()}`}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <div className="h-1.5 overflow-hidden rounded-full bg-field-2">
          <div
            className="brand-gradient h-full rounded-full"
            style={{ width: `${Math.round(Math.max(0.04, current.strength) * 100)}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-[12px] text-dim">
          {current.strength.toFixed(2)} · recalled ×{current.access_count}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-hairline bg-field-2/80 p-4 font-mono text-[11px] text-dim">
        <div>
          <dt>confidence</dt>
          <dd className="mt-1 text-starlight">{current.confidence.toFixed(2)}</dd>
        </div>
        <div>
          <dt>strength</dt>
          <dd className="mt-1 text-starlight">{current.strength.toFixed(2)}</dd>
        </div>
        <div>
          <dt>recalled</dt>
          <dd className="mt-1 text-starlight">{current.access_count}x</dd>
        </div>
        <div>
          <dt>born</dt>
          <dd className="mt-1 text-starlight">{shortDate(current.created_at)}</dd>
        </div>
      </dl>

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
          overwritten by a newer memory
        </div>
      ) : null}

      <section className="mt-7">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
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
                  {item.role} · {shortDate(item.created_at)}
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
        <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-dim">
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
    </aside>
  );
}
