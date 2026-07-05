"use client";

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum
} from "d3-force";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Engram, MemoryGraph } from "@/lib/api";
import { uiText } from "@/lib/text";

type CanvasNode = SimulationNodeDatum & {
  id: string;
  engram: Engram;
  seed: number;
};

type CanvasLink = SimulationLinkDatum<CanvasNode> & {
  source: string | CanvasNode;
  target: string | CanvasNode;
  type: string;
};

type Tooltip = {
  x: number;
  y: number;
  engram: Engram;
} | null;

const colors: Record<string, string> = {
  misconception: "#E5534B",
  mastery: "#3FBFAD",
  preference: "#B9A7E8",
  affect: "#B9A7E8",
  goal: "#E8A33D",
  fact: "#E8A33D",
  strategy_outcome: "#E8A33D"
};

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash / 4294967295;
}

function nodeColor(engram: Engram) {
  if (engram.status !== "active") return "#4A5674";
  return colors[engram.type] ?? "#E8A33D";
}

function nodeRadius(engram: Engram) {
  return 4 + Math.max(0, Math.min(1, engram.importance)) * 10;
}

function alphaFor(engram: Engram) {
  if (engram.status === "archived") return 0.15;
  if (engram.status === "superseded") return 0.34;
  if (engram.provisional) return 0.42;
  return 0.72 + Math.max(0, Math.min(1, engram.strength)) * 0.28;
}

function resolveNode(value: string | CanvasNode) {
  return typeof value === "string" ? null : value;
}

export function ConstellationCanvas({
  graph,
  selectedId,
  highlightedId,
  pulseId,
  onSelect
}: {
  graph: MemoryGraph;
  selectedId: string | null;
  highlightedId: string | null;
  pulseId: string | null;
  onSelect: (engram: Engram) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<CanvasNode[]>([]);
  const linksRef = useRef<CanvasLink[]>([]);
  const animationRef = useRef<number | null>(null);
  const [size, setSize] = useState({ width: 720, height: 520 });
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [motionReduced, setMotionReduced] = useState(false);

  const graphKey = useMemo(
    () =>
      graph.nodes
        .map((node) => `${node.id}:${node.status}:${node.strength}:${node.provisional}`)
        .join("|"),
    [graph.nodes]
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotionReduced(query.matches);
    const listener = () => setMotionReduced(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect;
      setSize({
        width: Math.max(320, rect.width),
        height: Math.max(300, rect.height)
      });
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const existing = new Map(nodesRef.current.map((node) => [node.id, node]));
    const nextNodes = graph.nodes.map((engram) => {
      const prior = existing.get(engram.id);
      if (prior) {
        prior.engram = engram;
        return prior;
      }
      const seed = hashSeed(engram.id);
      return {
        id: engram.id,
        engram,
        seed,
        x: size.width * (0.2 + seed * 0.6),
        y: size.height * (0.18 + ((seed * 7) % 1) * 0.64)
      };
    });

    const tagLinks: CanvasLink[] = [];
    for (let index = 0; index < nextNodes.length; index += 1) {
      for (let other = index + 1; other < nextNodes.length; other += 1) {
        const leftTags = nextNodes[index].engram.subject_tags;
        const rightTags = nextNodes[other].engram.subject_tags;
        if (leftTags.some((tag) => rightTags.includes(tag))) {
          tagLinks.push({
            source: nextNodes[index].id,
            target: nextNodes[other].id,
            type: "shared_tag"
          });
        }
      }
    }

    const explicitLinks: CanvasLink[] = graph.links.map((link) => ({
      source: link.source,
      target: link.target,
      type: link.type
    }));

    nodesRef.current = nextNodes;
    linksRef.current = [...explicitLinks, ...tagLinks];

    const simulation = forceSimulation<CanvasNode>(nextNodes)
      .force("charge", forceManyBody<CanvasNode>().strength(-80))
      .force(
        "link",
        forceLink<CanvasNode, CanvasLink>(linksRef.current)
          .id((node) => node.id)
          .strength((link) => (link.type === "shared_tag" ? 0.04 : 0.3))
          .distance((link) => (link.type === "shared_tag" ? 110 : 80))
      )
      .force("collide", forceCollide<CanvasNode>().radius((node) => nodeRadius(node.engram) + 10))
      .force("center", forceCenter<CanvasNode>(size.width / 2, size.height / 2))
      .alpha(0.8)
      .alphaDecay(0.08);

    for (let tick = 0; tick < 80; tick += 1) simulation.tick();
    simulation.stop();
  }, [graphKey, graph.links, graph.nodes, size.height, size.width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    function draw(time: number) {
      if (!context) return;
      context.clearRect(0, 0, size.width, size.height);
      context.fillStyle = "#070B14";
      context.fillRect(0, 0, size.width, size.height);

      drawStaticField(context, size.width, size.height);
      drawArchiveBelt(context, size.width, size.height);

      for (const link of linksRef.current) {
        const source = resolveNode(link.source);
        const target = resolveNode(link.target);
        if (!source || !target) continue;
        const visible =
          link.type !== "shared_tag" ||
          highlightedId === source.id ||
          highlightedId === target.id ||
          selectedId === source.id ||
          selectedId === target.id;
        if (!visible) continue;
        context.beginPath();
        context.strokeStyle = link.type === "shared_tag" ? "rgba(74,86,116,0.22)" : "rgba(232,163,61,0.42)";
        context.lineWidth = 1;
        context.moveTo(source.x ?? 0, source.y ?? 0);
        context.lineTo(target.x ?? 0, target.y ?? 0);
        context.stroke();
      }

      for (const node of nodesRef.current) {
        const x = (node.x ?? size.width / 2) + ambientDrift(node.seed, time, motionReduced);
        const y =
          (node.y ?? size.height / 2) +
          ambientDrift((node.seed * 3) % 1, time + 1200, motionReduced);
        drawNode(context, node.engram, x, y, {
          selected: selectedId === node.id,
          highlighted: highlightedId === node.id,
          pulse: pulseId === node.id,
          time
        });
      }

      animationRef.current = window.requestAnimationFrame(draw);
    }

    animationRef.current = window.requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    };
  }, [highlightedId, motionReduced, pulseId, selectedId, size.height, size.width]);

  function nodeAt(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (let index = nodesRef.current.length - 1; index >= 0; index -= 1) {
      const node = nodesRef.current[index];
      const radius = nodeRadius(node.engram) * 1.8;
      const dx = x - (node.x ?? 0);
      const dy = y - (node.y ?? 0);
      if (dx * dx + dy * dy <= radius * radius) return { node, x, y };
    }
    return null;
  }

  return (
    <div ref={wrapperRef} className="relative h-full min-h-[300px] overflow-hidden bg-void">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair"
        aria-label="Memory constellation"
        onMouseMove={(event) => {
          const hit = nodeAt(event.clientX, event.clientY);
          setTooltip(hit ? { x: hit.x, y: hit.y, engram: hit.node.engram } : null);
        }}
        onMouseLeave={() => setTooltip(null)}
        onClick={(event) => {
          const hit = nodeAt(event.clientX, event.clientY);
          if (hit) onSelect(hit.node.engram);
        }}
      />

      {graph.nodes.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center">
          <p className="max-w-md font-display text-2xl italic leading-snug text-dim">
            Reverie has not met Maya yet. Everything she teaches it will appear here.
          </p>
        </div>
      ) : null}

      {tooltip ? (
        <div
          className="pointer-events-none absolute z-20 w-72 rounded-md border border-hairline bg-field-2 p-3 text-left"
          style={{
            left: Math.min(size.width - 300, Math.max(12, tooltip.x + 14)),
            top: Math.min(size.height - 140, Math.max(12, tooltip.y + 14))
          }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-dim">
            {tooltip.engram.type.replace("_", " ")} · strength {tooltip.engram.strength.toFixed(2)}
          </p>
          <p className="mt-2 text-xs leading-5 text-starlight">
            {uiText(tooltip.engram.content)}
          </p>
          <p className="mt-2 font-mono text-[10px] text-dim">
            confidence {tooltip.engram.confidence.toFixed(2)}
          </p>
        </div>
      ) : null}

      <ul className="sr-only" aria-live="polite">
        {graph.nodes.map((engram) => (
          <li key={engram.id}>
            {engram.type}: {uiText(engram.content)}. Strength {engram.strength.toFixed(2)}.
          </li>
        ))}
      </ul>
    </div>
  );
}

function ambientDrift(seed: number, time: number, reduced: boolean) {
  if (reduced) return 0;
  return Math.sin(time / 6000 + seed * Math.PI * 2) * 2;
}

function drawStaticField(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save();
  for (let index = 0; index < 70; index += 1) {
    const seed = hashSeed(`static-${index}`);
    const x = (seed * 997) % width;
    const y = ((seed * 1777) % 1) * height;
    const alpha = 0.08 + ((seed * 31) % 0.14);
    context.fillStyle = `rgba(233,237,246,${alpha})`;
    context.fillRect(x, y, 1, 1);
  }
  context.restore();
}

function drawArchiveBelt(context: CanvasRenderingContext2D, width: number, height: number) {
  context.save();
  context.strokeStyle = "rgba(74,86,116,0.28)";
  context.lineWidth = 1;
  context.beginPath();
  context.ellipse(width / 2, height / 2, width * 0.46, height * 0.42, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawNode(
  context: CanvasRenderingContext2D,
  engram: Engram,
  x: number,
  y: number,
  state: { selected: boolean; highlighted: boolean; pulse: boolean; time: number }
) {
  const baseRadius = nodeRadius(engram);
  const color = nodeColor(engram);
  const scale = state.selected || state.highlighted ? 1.3 : 1;
  const pulse = state.pulse ? 1 + Math.sin(state.time / 160) * 0.12 : 1;
  const radius = baseRadius * scale * pulse;
  const alpha = alphaFor(engram);
  const glow = Math.max(0.08, engram.strength) * 0.34;

  context.save();
  context.globalAlpha = alpha;

  const gradient = context.createRadialGradient(x, y, radius * 0.2, x, y, radius * 3.2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.35, `${color}66`);
  gradient.addColorStop(1, "rgba(7,11,20,0)");
  context.fillStyle = gradient;
  context.globalAlpha = glow;
  context.beginPath();
  context.arc(x, y, radius * 3.4, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = alpha;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = state.selected ? "#FFD9A0" : color;
  context.lineWidth = state.selected ? 1.5 : 1;
  if (engram.provisional) context.setLineDash([3, 4]);
  context.beginPath();
  context.arc(x, y, radius + 5, 0, Math.PI * 2);
  context.stroke();

  context.restore();
}
