"use client";

import { useMemo, useState } from "react";
import type { Engram, MemoryPack, MemoryPackItem } from "@/lib/api";
import { uiText } from "@/lib/text";

const typeColors: Record<string, string> = {
  misconception: "bg-coral",
  mastery: "bg-sage",
  preference: "bg-moth",
  affect: "bg-moth",
  goal: "bg-ember",
  fact: "bg-ember",
  strategy_outcome: "bg-ember"
};

function scoreLine(item: MemoryPackItem) {
  const parts = Object.entries(item.breakdown ?? {}).map(
    ([key, value]) => `${key} ${value.toFixed(2)}`
  );
  return parts.length ? parts.join(" · ") : `score ${item.score.toFixed(2)}`;
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
  const [hovered, setHovered] = useState<string | null>(null);
  const budget = pack?.budget ?? 1200;
  const used = pack?.used ?? 0;
  const winners = pack?.winners ?? [];
  const excluded = pack?.excluded?.slice(0, 2) ?? [];

  const nodeById = useMemo(() => {
    return new Map(engrams.map((engram) => [engram.id, engram]));
  }, [engrams]);

  function updateHover(id: string | null) {
    setHovered(id);
    onHover(id);
  }

  return (
    <section className="border-t border-hairline bg-field px-4 py-3 md:px-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-dim">
          Working memory
        </h2>
        <p className="font-mono text-xs text-starlight">
          {used} / {budget} tokens
        </p>
      </div>

      <div
        className="mt-3 flex h-3 overflow-visible rounded-full border border-hairline bg-void"
        aria-label={`Working memory budget ${used} of ${budget} tokens`}
      >
        {winners.length === 0 ? (
          <div className="h-full w-px bg-faint" />
        ) : (
          winners.map((item) => {
            const width = Math.max(5, (item.tokens / Math.max(budget, 1)) * 100);
            const color = typeColors[item.type] ?? "bg-ember";
            return (
              <div
                key={item.engram_id}
                className={`relative h-full ${color} first:rounded-l-full last:rounded-r-full`}
                style={{ width: `${width}%` }}
                onMouseEnter={() => updateHover(item.engram_id)}
                onMouseLeave={() => updateHover(null)}
              >
                {hovered === item.engram_id ? (
                  <div className="absolute bottom-5 left-1/2 z-20 w-72 -translate-x-1/2 rounded-md border border-hairline bg-field-2 p-3 shadow-none">
                    <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-dim">
                      {item.tokens} tokens · {item.type}
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
          })
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {winners.map((item) => (
          <button
            key={item.engram_id}
            type="button"
            className="min-h-8 rounded-full border border-hairline px-3 py-1 text-left font-mono text-[11px] text-dim transition hover:border-ember hover:text-starlight"
            onMouseEnter={() => updateHover(item.engram_id)}
            onMouseLeave={() => updateHover(null)}
            onFocus={() => updateHover(item.engram_id)}
            onBlur={() => updateHover(null)}
            onClick={() => {
              onSelect?.(item.engram_id);
            }}
          >
            {item.type.replace("_", " ")} · {item.tokens}
          </button>
        ))}
      </div>

      <div className="mt-3 min-h-10 text-xs leading-5 text-dim">
        {excluded.length ? (
          excluded.map((item) => (
            <p key={item.engram_id}>
              excluded: {uiText(item.content)} · {item.reason}
            </p>
          ))
        ) : (
          <p>No exclusions yet.</p>
        )}
      </div>
    </section>
  );
}
