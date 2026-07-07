"use client";

import { useMemo, useState } from "react";
import type { Engram, MemoryPack, MemoryPackItem } from "@/lib/api";
import { modelId } from "@/lib/health";
import { labelText, uiText } from "@/lib/text";
import { useHealthStatus } from "@/lib/useHealthStatus";

const typeColors: Record<string, string> = {
  misconception: "bg-coral",
  mastery: "bg-gold",
  preference: "bg-moth",
  affect: "bg-moth",
  goal: "bg-ember",
  fact: "bg-sage",
  strategy_outcome: "bg-sage"
};

function scoreLine(item: MemoryPackItem) {
  const labels: Record<string, string> = {
    sim: "Match",
    strength: "Strength",
    recency: "Recency",
    prior: "Priority"
  };
  const parts = Object.entries(item.breakdown ?? {}).map(
    ([key, value]) => `${labels[key] ?? labelText(key)} ${value.toFixed(2)}`
  );
  return parts.length ? parts.join(" · ") : `Score ${item.score.toFixed(2)}`;
}

export function BudgetMeter({
  pack,
  engrams,
  onHover,
  onSelect
}: {
  pack: MemoryPack | null;
  engrams: Engram[];
  onHover: (id: string | null) => void;
  onSelect?: (id: string) => void;
}) {
  const { status: healthStatus } = useHealthStatus();
  const [hovered, setHovered] = useState<string | null>(null);
  const budget = pack?.budget ?? 1200;
  const used = pack?.used ?? 0;
  const winners = pack?.winners ?? [];
  const excluded = pack?.excluded?.slice(0, 2) ?? [];
  const embedModel = modelId(healthStatus, "embed");

  const nodeById = useMemo(() => {
    return new Map(engrams.map((engram) => [engram.id, engram]));
  }, [engrams]);

  function updateHover(id: string | null) {
    setHovered(id);
    onHover(id);
  }

  return (
    <section className="flex h-full flex-col justify-center px-8 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-sage">
          Working Memory
        </h2>
        <p className="font-mono text-[13px] text-starlight">
          {used.toLocaleString()} / {budget.toLocaleString()} Tokens
        </p>
      </div>

      <div
        className="mt-3 flex h-3 max-w-[560px] gap-[3px] overflow-visible rounded-full bg-hairline/70 p-[1px]"
        aria-label={`Working memory budget ${used} of ${budget} tokens`}
      >
        {winners.length === 0 ? (
          <div className="h-full w-full rounded-full bg-field" />
        ) : (
          <>
            {winners.map((item) => {
              const width = Math.max(5, (item.tokens / Math.max(budget, 1)) * 100);
              const color = typeColors[item.type] ?? "bg-ember";
              return (
                <div
                  key={item.engram_id}
                  className={`relative h-full rounded-full ${color}`}
                  style={{ width: `${width}%` }}
                  onMouseEnter={() => updateHover(item.engram_id)}
                  onMouseLeave={() => updateHover(null)}
                >
                  {hovered === item.engram_id ? (
                    <div className="absolute bottom-5 left-1/2 z-20 w-72 -translate-x-1/2 rounded-lg border border-hairline bg-field-2 p-3 shadow-[0_8px_28px_-12px_rgba(93,64,35,0.14)]">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
                        {item.tokens} Tokens · {labelText(item.type)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-starlight">
                        {uiText(nodeById.get(item.engram_id)?.content ?? item.content)}
                      </p>
                      <p className="mt-2 font-mono text-[11px] text-dim">
                        {scoreLine(item)}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div
              className="h-full rounded-full bg-field"
              style={{
                width: `${Math.max(0, 100 - (used / Math.max(budget, 1)) * 100)}%`
              }}
            />
          </>
        )}
      </div>

      <div className="mt-3 flex max-h-8 flex-wrap gap-2 overflow-hidden">
        {winners.map((item) => (
          <button
            key={item.engram_id}
            type="button"
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 py-1 text-left font-mono text-[11px] text-dim transition hover:bg-field-2 hover:text-starlight"
            onMouseEnter={() => updateHover(item.engram_id)}
            onMouseLeave={() => updateHover(null)}
            onFocus={() => updateHover(item.engram_id)}
            onBlur={() => updateHover(null)}
            onClick={() => {
              onSelect?.(item.engram_id);
            }}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${typeColors[item.type] ?? "bg-ember"}`} />
            <span>
              {labelText(item.type)} · {item.tokens}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-2 min-h-5 font-mono text-[11px] leading-5 text-faint">
        {excluded.length ? (
          excluded.map((item) => (
            <p key={item.engram_id}>
              Excluded: {uiText(item.content)} · {labelText(item.reason)}
            </p>
          ))
        ) : (
          <p>No exclusions yet.</p>
        )}
      </div>
      {embedModel ? (
        <p className="mt-1 font-mono text-[10px] text-dim">Retrieval · {embedModel}</p>
      ) : null}
    </section>
  );
}
