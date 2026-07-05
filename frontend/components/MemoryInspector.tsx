"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { fetchEngramDetail, type Engram, type EngramDetail } from "@/lib/api";
import { uiText } from "@/lib/text";

const typeText: Record<string, string> = {
  misconception: "text-coral",
  mastery: "text-sage",
  preference: "text-moth",
  affect: "text-moth",
  goal: "text-ember",
  fact: "text-ember",
  strategy_outcome: "text-ember"
};

function shortDate(value?: string) {
  if (!value) return "unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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
      className="fixed inset-x-0 bottom-0 z-40 max-h-[82dvh] overflow-y-auto border-t border-hairline bg-field p-5 shadow-none lg:inset-x-auto lg:right-0 lg:top-0 lg:h-dvh lg:max-h-none lg:w-[420px] lg:border-l lg:border-t-0"
      aria-label="Memory inspector"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`font-mono text-[11px] uppercase tracking-[0.08em] ${typeClass}`}>
            {current.type.replace("_", " ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-hairline px-2 py-1 font-mono text-[10px] uppercase text-dim">
              {current.status}
            </span>
            {current.provisional ? (
              <span className="rounded-full border border-ember px-2 py-1 font-mono text-[10px] uppercase text-ember">
                provisional
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          aria-label="Close inspector"
          title="Close inspector"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-hairline text-dim transition hover:bg-field-2 hover:text-starlight"
        >
          <X aria-hidden="true" size={18} strokeWidth={1.8} />
        </button>
      </div>

      <p className="mt-6 font-display text-[28px] font-semibold leading-tight text-starlight">
        {uiText(current.content)}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-hairline py-4 font-mono text-[11px] text-dim">
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
        <div className="mt-5 border border-coral bg-void p-3 text-sm leading-5 text-starlight">
          overwritten by {current.superseded_by}
        </div>
      ) : null}

      <section className="mt-7">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-dim">
          Provenance
        </h3>
        <div className="mt-3 grid gap-3">
          {detail?.provenance?.length ? (
            detail.provenance.map((item) => (
              <button
                key={item.id}
                type="button"
                className="border-l border-ember bg-field-2 p-3 text-left text-sm leading-6 text-starlight"
                onClick={() => {
                  document.getElementById(item.id)?.scrollIntoView({
                    block: "center",
                    behavior: "smooth"
                  });
                }}
              >
                <span className="block font-mono text-[10px] uppercase tracking-[0.08em] text-dim">
                  {item.role} · {shortDate(item.created_at)}
                </span>
                <span className="mt-2 block">{uiText(item.content)}</span>
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
        <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-dim">
          Lifecycle
        </h3>
        <ol className="mt-3 border-l border-hairline">
          {detail?.events?.length ? (
            detail.events.map((event) => (
              <li key={event.id} className="relative ml-4 pb-4">
                <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-ember" />
                <p className="font-mono text-[11px] text-starlight">{event.event_type}</p>
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
