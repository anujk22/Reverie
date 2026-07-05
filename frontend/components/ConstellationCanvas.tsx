"use client";

import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
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

type Fiber = {
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  x2: number;
  y2: number;
  alpha: number;
  width: number;
  phase: number;
};

type Synapse = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  phase: number;
};

type StaticStar = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkle: boolean;
  phase: number;
};

const colors: Record<string, string> = {
  misconception: "#FF6F5E",
  mastery: "#F2A65A",
  preference: "#A98BFA",
  affect: "#A98BFA",
  goal: "#F5476B",
  fact: "#F5476B",
  strategy_outcome: "#F5476B"
};

// side profile facing right, normalized to a unit box (x right, y down)
const BRAIN_OUTLINE: Array<[number, number]> = [
  [0.055, 0.47],
  [0.045, 0.35],
  [0.09, 0.22],
  [0.17, 0.12],
  [0.28, 0.055],
  [0.42, 0.03],
  [0.56, 0.035],
  [0.68, 0.06],
  [0.79, 0.11],
  [0.875, 0.185],
  [0.935, 0.28],
  [0.955, 0.38],
  [0.94, 0.47],
  [0.9, 0.54],
  [0.845, 0.585],
  [0.78, 0.63],
  [0.71, 0.66],
  [0.62, 0.675],
  [0.53, 0.67],
  [0.47, 0.7],
  [0.435, 0.76],
  [0.38, 0.815],
  [0.3, 0.84],
  [0.22, 0.825],
  [0.16, 0.77],
  [0.115, 0.7],
  [0.075, 0.6]
];

const BRAIN_CORE: [number, number] = [0.46, 0.38];
const BRAIN_ASPECT = 1.18; // width / height of the outline's bounding box, roughly

// where each memory type gravitates inside the brain, echoing the
// violet (back) -> pink (core) -> amber (front) gradient of the fibers
const typeRegionX: Record<string, number> = {
  preference: 0.26,
  affect: 0.3,
  misconception: 0.48,
  goal: 0.55,
  fact: 0.55,
  strategy_outcome: 0.55,
  mastery: 0.72
};

const VIOLET: [number, number, number] = [169, 139, 250];
const PINK: [number, number, number] = [245, 71, 107];
const AMBER: [number, number, number] = [242, 166, 90];

function mix(a: [number, number, number], b: [number, number, number], t: number) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ] as [number, number, number];
}

// back of the brain is violet, the core burns pink, the frontal lobe warms to amber
function regionColor(fraction: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, fraction));
  if (t < 0.45) return mix(VIOLET, PINK, t / 0.45);
  return mix(PINK, AMBER, (t - 0.45) / 0.55);
}

function rgba(rgb: [number, number, number], alpha: number) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash / 4294967295;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nodeColor(engram: Engram) {
  if (engram.status !== "active") return "#5D4B58";
  return colors[engram.type] ?? "#F5476B";
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

function nodeLabel(engram: Engram) {
  const text = engram.content.toLowerCase();
  if (text.includes("worked example") || text.includes("example")) return "example first";
  if (text.includes("anxious") || text.includes("anxiety")) return "exam nerves";
  if (text.includes("product rule")) return "product rule mixup";
  if (text.includes("power rule")) return "power rule";
  if (text.includes("guiding") || text.includes("question")) return "guided prompts";
  if (text.includes("outer") || text.includes("inner")) return "outer / inner";
  if (text.includes("shorter") || text.includes("late")) return "short sets";
  return engram.type.replace("_", " ");
}

type BrainFrame = {
  offsetX: number;
  offsetY: number;
  scale: number; // multiply normalized coords by this
  coreX: number;
  coreY: number;
  polygon: Array<[number, number]>; // canvas coords
  minX: number;
  maxX: number;
};

function computeFrame(width: number, height: number): BrainFrame {
  const margin = 0.06;
  const usableW = width * (1 - margin * 2);
  const usableH = height * (1 - margin * 2);
  const scale = Math.min(usableW, usableH * BRAIN_ASPECT);
  const brainW = scale;
  const brainH = scale / BRAIN_ASPECT;
  const offsetX = (width - brainW) / 2;
  const offsetY = (height - brainH) / 2;
  const polygon = BRAIN_OUTLINE.map(
    ([x, y]) => [offsetX + x * brainW, offsetY + y * brainH] as [number, number]
  );
  const xs = polygon.map((point) => point[0]);
  return {
    offsetX,
    offsetY,
    scale: brainW,
    coreX: offsetX + BRAIN_CORE[0] * brainW,
    coreY: offsetY + BRAIN_CORE[1] * brainH,
    polygon,
    minX: Math.min(...xs),
    maxX: Math.max(...xs)
  };
}

function toCanvas(frame: BrainFrame, nx: number, ny: number): [number, number] {
  return [
    frame.offsetX + nx * frame.scale,
    frame.offsetY + (ny * frame.scale) / BRAIN_ASPECT
  ];
}

function pointInPolygon(x: number, y: number, polygon: Array<[number, number]>) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function clampIntoBrain(frame: BrainFrame, x: number, y: number): [number, number] {
  if (pointInPolygon(x, y, frame.polygon)) return [x, y];
  // walk toward the core until we are back inside
  let cx = x;
  let cy = y;
  for (let step = 0; step < 24; step += 1) {
    cx += (frame.coreX - cx) * 0.14;
    cy += (frame.coreY - cy) * 0.14;
    if (pointInPolygon(cx, cy, frame.polygon)) break;
  }
  return [cx, cy];
}

// distance from core to the silhouette along a direction
function marchToEdge(frame: BrainFrame, angle: number) {
  const stepSize = frame.scale / 160;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let distance = stepSize;
  const limit = frame.scale * 1.2;
  while (distance < limit) {
    const x = frame.coreX + dx * distance;
    const y = frame.coreY + dy * distance;
    if (!pointInPolygon(x, y, frame.polygon)) return distance;
    distance += stepSize;
  }
  return distance;
}

function buildFibers(frame: BrainFrame): { fibers: Fiber[]; synapses: Synapse[] } {
  const random = mulberry32(97);
  const fibers: Fiber[] = [];
  const synapses: Synapse[] = [];

  // long tracts radiating from the core toward the silhouette
  const radial = 44;
  for (let index = 0; index < radial; index += 1) {
    const angle = (index / radial) * Math.PI * 2 + (random() - 0.5) * 0.22;
    const edge = marchToEdge(frame, angle);
    const reach = edge * (0.62 + random() * 0.32);
    const x2 = frame.coreX + Math.cos(angle) * reach;
    const y2 = frame.coreY + Math.sin(angle) * reach;
    const midX = frame.coreX + Math.cos(angle) * reach * 0.5;
    const midY = frame.coreY + Math.sin(angle) * reach * 0.5;
    const bowDirection = Math.sin(angle) >= 0 ? 1 : -1;
    const bow = reach * (0.18 + random() * 0.2) * bowDirection;
    const cx = midX + Math.cos(angle + Math.PI / 2) * bow;
    const cy = midY + Math.sin(angle + Math.PI / 2) * bow;
    fibers.push({
      x1: frame.coreX,
      y1: frame.coreY,
      cx,
      cy,
      x2,
      y2,
      alpha: 0.1 + random() * 0.16,
      width: 0.6 + random() * 0.7,
      phase: random() * Math.PI * 2
    });
  }

  // nested arcs that wrap around the core like folded cortex shells
  const shells = 30;
  for (let index = 0; index < shells; index += 1) {
    const theta1 = random() * Math.PI * 2;
    const theta2 = theta1 + 0.6 + random() * 1.1;
    const r1 = marchToEdge(frame, theta1) * (0.45 + random() * 0.45);
    const r2 = marchToEdge(frame, theta2) * (0.45 + random() * 0.45);
    const x1 = frame.coreX + Math.cos(theta1) * r1;
    const y1 = frame.coreY + Math.sin(theta1) * r1;
    const x2 = frame.coreX + Math.cos(theta2) * r2;
    const y2 = frame.coreY + Math.sin(theta2) * r2;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const pull = 0.3 + random() * 0.25;
    const cx = midX + (frame.coreX - midX) * -pull;
    const cy = midY + (frame.coreY - midY) * -pull;
    const [ccx, ccy] = clampIntoBrain(frame, cx, cy);
    fibers.push({
      x1,
      y1,
      cx: ccx,
      cy: ccy,
      x2,
      y2,
      alpha: 0.07 + random() * 0.12,
      width: 0.5 + random() * 0.6,
      phase: random() * Math.PI * 2
    });
  }

  // synapse motes scattered along the fibers
  for (const fiber of fibers) {
    const count = 1 + Math.floor(random() * 3);
    for (let index = 0; index < count; index += 1) {
      const t = 0.25 + random() * 0.7;
      const inv = 1 - t;
      const x = inv * inv * fiber.x1 + 2 * inv * t * fiber.cx + t * t * fiber.x2;
      const y = inv * inv * fiber.y1 + 2 * inv * t * fiber.cy + t * t * fiber.y2;
      synapses.push({
        x,
        y,
        radius: 0.7 + random() * 1.5,
        alpha: 0.25 + random() * 0.5,
        phase: random() * Math.PI * 2
      });
    }
  }

  return { fibers, synapses };
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
  const starfieldRef = useRef<StaticStar[]>([]);
  const fibersRef = useRef<{ fibers: Fiber[]; synapses: Synapse[] }>({
    fibers: [],
    synapses: []
  });
  const frameRef = useRef<BrainFrame | null>(null);
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
        height: Math.max(260, rect.height)
      });
    });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    starfieldRef.current = Array.from({ length: 90 }, (_, index) => {
      const seed = hashSeed(`static-${index}`);
      return {
        x: (seed * 997) % 1,
        y: (seed * 1777) % 1,
        radius: 0.4 + ((seed * 61) % 1) * 0.9,
        alpha: 0.04 + ((seed * 31) % 0.12),
        twinkle: index < 12,
        phase: seed * Math.PI * 2
      };
    });
  }, []);

  useEffect(() => {
    const frame = computeFrame(size.width, size.height);
    frameRef.current = frame;
    fibersRef.current = buildFibers(frame);
  }, [size.height, size.width]);

  useEffect(() => {
    const frame = frameRef.current ?? computeFrame(size.width, size.height);
    const existing = new Map(nodesRef.current.map((node) => [node.id, node]));
    const nextNodes = graph.nodes.map((engram) => {
      const prior = existing.get(engram.id);
      if (prior) {
        prior.engram = engram;
        return prior;
      }
      const seed = hashSeed(engram.id);
      const regionX = typeRegionX[engram.type] ?? 0.5;
      const [x, y] = toCanvas(
        frame,
        regionX + (seed - 0.5) * 0.24,
        0.34 + ((seed * 7) % 1) * 0.26
      );
      return { id: engram.id, engram, seed, x, y };
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

    const radiusScale = Math.max(0.55, Math.min(1, Math.min(size.width, size.height) / 480));
    const simulation = forceSimulation<CanvasNode>(nextNodes)
      .force("charge", forceManyBody<CanvasNode>().strength(-46))
      .force(
        "link",
        forceLink<CanvasNode, CanvasLink>(linksRef.current)
          .id((node) => node.id)
          .strength((link) => (link.type === "shared_tag" ? 0.03 : 0.2))
          .distance(() => frame.scale * 0.16)
      )
      .force(
        "collide",
        forceCollide<CanvasNode>().radius(
          (node) => nodeRadius(node.engram, radiusScale) + frame.scale * 0.02
        )
      )
      .force(
        "x",
        forceX<CanvasNode>((node) => {
          const regionX = typeRegionX[node.engram.type] ?? 0.5;
          return toCanvas(frame, regionX, 0)[0];
        }).strength(0.05)
      )
      .force("y", forceY<CanvasNode>(toCanvas(frame, 0, 0.38)[1]).strength(0.04))
      .alpha(0.9)
      .alphaDecay(0.07);

    for (let tick = 0; tick < 110; tick += 1) {
      simulation.tick();
      for (const node of nextNodes) {
        const [cx, cy] = clampIntoBrain(frame, node.x ?? frame.coreX, node.y ?? frame.coreY);
        node.x = cx;
        node.y = cy;
      }
    }
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

    const dormant = nodesRef.current.length === 0;

    function draw(time: number) {
      if (!context) return;
      const frame = frameRef.current;
      context.clearRect(0, 0, size.width, size.height);
      context.fillStyle = "#0B0609";
      context.fillRect(0, 0, size.width, size.height);
      drawStaticField(context, size.width, size.height, starfieldRef.current, time, motionReduced);

      if (frame) {
        const vitality = dormant ? 0.35 : 1;
        drawFibers(context, frame, fibersRef.current, time, motionReduced, vitality);
        drawCore(context, frame, time, motionReduced, vitality);
      }

      const radiusScale = Math.max(0.55, Math.min(1, Math.min(size.width, size.height) / 480));

      if (frame) {
        for (const link of linksRef.current) {
          const source = resolveNode(link.source);
          const target = resolveNode(link.target);
          if (!source || !target) continue;
          drawCurvedLink(context, frame, source, target, link.type);
        }
      }

      for (const node of nodesRef.current) {
        const x = (node.x ?? size.width / 2) + ambientDrift(node.seed, time, motionReduced);
        const y =
          (node.y ?? size.height / 2) +
          ambientDrift((node.seed * 3) % 1, time + 1200, motionReduced);
        drawNode(context, node.engram, x, y, radiusScale, {
          selected: selectedId === node.id,
          highlighted: highlightedId === node.id,
          pulse: pulseId === node.id,
          time
        });
      }

      if (size.width > 460) {
        drawStrongLabels(
          context,
          nodesRef.current,
          size.width,
          size.height,
          radiusScale,
          time,
          motionReduced
        );
      }

      animationRef.current = window.requestAnimationFrame(draw);
    }

    animationRef.current = window.requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    };
  }, [graphKey, highlightedId, motionReduced, pulseId, selectedId, size.height, size.width]);

  function nodeAt(clientX: number, clientY: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const radiusScale = Math.max(0.55, Math.min(1, Math.min(size.width, size.height) / 480));
    for (let index = nodesRef.current.length - 1; index >= 0; index -= 1) {
      const node = nodesRef.current[index];
      const radius = nodeRadius(node.engram, radiusScale) * 1.9;
      const dx = x - (node.x ?? 0);
      const dy = y - (node.y ?? 0);
      if (dx * dx + dy * dy <= radius * radius) return { node, x, y };
    }
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      className="relative h-full min-h-[260px] overflow-hidden bg-void sm:min-h-[300px]"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair"
        aria-label="Memory brain"
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
          className="pointer-events-none absolute z-20 w-72 rounded-lg border border-hairline bg-field-2/95 p-3 text-left backdrop-blur"
          style={{
            left: Math.min(size.width - 300, Math.max(12, tooltip.x + 14)),
            top: Math.min(size.height - 140, Math.max(12, tooltip.y + 14))
          }}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
            <span style={{ color: nodeColor(tooltip.engram) }}>
              {tooltip.engram.type.replace("_", " ")}
            </span>
            {" · strength "}
            {tooltip.engram.strength.toFixed(2)}
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

function nodeRadius(engram: Engram, scale = 1) {
  return (4 + Math.max(0, Math.min(1, engram.importance)) * 10) * scale;
}

function ambientDrift(seed: number, time: number, reduced: boolean) {
  if (reduced) return 0;
  return Math.sin(time / 6000 + seed * Math.PI * 2) * 2;
}

function drawStaticField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  stars: StaticStar[],
  time: number,
  reduced: boolean
) {
  context.save();
  for (const star of stars) {
    const x = star.x * width;
    const y = star.y * height;
    const twinkle = star.twinkle && !reduced ? 0.55 + Math.sin(time / 2600 + star.phase) * 0.35 : 1;
    const alpha = Math.max(0.03, star.alpha * twinkle);
    context.fillStyle = `rgba(243,236,227,${alpha})`;
    context.beginPath();
    context.arc(x, y, star.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function fiberFraction(frame: BrainFrame, x: number) {
  return (x - frame.minX) / Math.max(1, frame.maxX - frame.minX);
}

function drawFibers(
  context: CanvasRenderingContext2D,
  frame: BrainFrame,
  bundle: { fibers: Fiber[]; synapses: Synapse[] },
  time: number,
  reduced: boolean,
  vitality: number
) {
  context.save();
  context.globalCompositeOperation = "lighter";

  for (const fiber of bundle.fibers) {
    const breath = reduced ? 1 : 0.75 + Math.sin(time / 3400 + fiber.phase) * 0.25;
    const alpha = fiber.alpha * breath * vitality;
    const startColor = regionColor(fiberFraction(frame, fiber.x1));
    const endColor = regionColor(fiberFraction(frame, fiber.x2));
    const gradient = context.createLinearGradient(fiber.x1, fiber.y1, fiber.x2, fiber.y2);
    gradient.addColorStop(0, rgba(startColor, alpha));
    gradient.addColorStop(1, rgba(endColor, alpha * 0.85));
    context.strokeStyle = gradient;
    context.lineWidth = fiber.width;
    context.beginPath();
    context.moveTo(fiber.x1, fiber.y1);
    context.quadraticCurveTo(fiber.cx, fiber.cy, fiber.x2, fiber.y2);
    context.stroke();
  }

  for (const synapse of bundle.synapses) {
    const twinkle = reduced ? 0.8 : 0.55 + Math.sin(time / 1900 + synapse.phase) * 0.45;
    const alpha = synapse.alpha * twinkle * vitality * 0.55;
    const color = regionColor(fiberFraction(frame, synapse.x));
    context.fillStyle = rgba(color, alpha);
    context.beginPath();
    context.arc(synapse.x, synapse.y, synapse.radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawCore(
  context: CanvasRenderingContext2D,
  frame: BrainFrame,
  time: number,
  reduced: boolean,
  vitality: number
) {
  const breath = reduced ? 1 : 0.85 + Math.sin(time / 2600) * 0.15;
  const radius = frame.scale * 0.085 * breath;
  context.save();
  context.globalCompositeOperation = "lighter";

  const halo = context.createRadialGradient(
    frame.coreX,
    frame.coreY,
    radius * 0.1,
    frame.coreX,
    frame.coreY,
    radius * 3.2
  );
  halo.addColorStop(0, `rgba(255,214,224,${0.5 * vitality})`);
  halo.addColorStop(0.28, `rgba(245,71,107,${0.3 * vitality})`);
  halo.addColorStop(1, "rgba(11,6,9,0)");
  context.fillStyle = halo;
  context.beginPath();
  context.arc(frame.coreX, frame.coreY, radius * 3.2, 0, Math.PI * 2);
  context.fill();

  const core = context.createRadialGradient(
    frame.coreX,
    frame.coreY,
    0,
    frame.coreX,
    frame.coreY,
    radius
  );
  core.addColorStop(0, `rgba(255,255,255,${0.95 * vitality})`);
  core.addColorStop(0.45, `rgba(255,183,197,${0.75 * vitality})`);
  core.addColorStop(1, "rgba(245,71,107,0)");
  context.fillStyle = core;
  context.beginPath();
  context.arc(frame.coreX, frame.coreY, radius, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function drawCurvedLink(
  context: CanvasRenderingContext2D,
  frame: BrainFrame,
  source: CanvasNode,
  target: CanvasNode,
  type: string
) {
  const x1 = source.x ?? 0;
  const y1 = source.y ?? 0;
  const x2 = target.x ?? 0;
  const y2 = target.y ?? 0;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  // bow slightly toward the core so links read as fibers, not wires
  const cx = midX + (frame.coreX - midX) * 0.24;
  const cy = midY + (frame.coreY - midY) * 0.24;
  context.save();
  context.strokeStyle =
    type === "shared_tag" ? "rgba(169,139,250,0.16)" : "rgba(245,71,107,0.4)";
  context.lineWidth = type === "shared_tag" ? 0.6 : 0.9;
  context.beginPath();
  context.moveTo(x1, y1);
  context.quadraticCurveTo(cx, cy, x2, y2);
  context.stroke();
  context.restore();
}

function drawStrongLabels(
  context: CanvasRenderingContext2D,
  nodes: CanvasNode[],
  width: number,
  height: number,
  radiusScale: number,
  time: number,
  reduced: boolean
) {
  const strongest = nodes
    .filter((node) => node.engram.status === "active")
    .sort((left, right) => {
      const leftScore = left.engram.strength * 0.65 + left.engram.importance * 0.35;
      const rightScore = right.engram.strength * 0.65 + right.engram.importance * 0.35;
      return rightScore - leftScore;
    })
    .slice(0, 3);

  context.save();
  context.font = "10px JetBrains Mono, monospace";
  context.textBaseline = "middle";
  for (const node of strongest) {
    const x = (node.x ?? width / 2) + ambientDrift(node.seed, time, reduced);
    const y = (node.y ?? height / 2) + ambientDrift((node.seed * 3) % 1, time + 1200, reduced);
    const radius = nodeRadius(node.engram, radiusScale);
    const label = nodeLabel(node.engram);
    const textWidth = context.measureText(label).width;
    const labelX = Math.min(width - textWidth - 14, Math.max(14, x + radius + 11));
    const labelY = Math.min(height - 12, Math.max(12, y - radius - 9));
    context.fillStyle = "rgba(11,6,9,0.66)";
    context.fillRect(labelX - 5, labelY - 8, textWidth + 10, 16);
    context.fillStyle = "rgba(160,141,155,0.9)";
    context.fillText(label, labelX, labelY);
  }
  context.restore();
}

function drawNode(
  context: CanvasRenderingContext2D,
  engram: Engram,
  x: number,
  y: number,
  radiusScale: number,
  state: { selected: boolean; highlighted: boolean; pulse: boolean; time: number }
) {
  const baseRadius = nodeRadius(engram, radiusScale);
  const color = nodeColor(engram);
  const scale = state.selected || state.highlighted ? 1.3 : 1;
  const pulse = state.pulse ? 1 + Math.sin(state.time / 160) * 0.12 : 1;
  const radius = baseRadius * scale * pulse;
  const alpha = alphaFor(engram);
  const strength = Math.max(0.08, Math.min(1, engram.strength));
  const breathing = 0.88 + Math.sin(state.time / 4000 + hashSeed(engram.id) * Math.PI * 2) * 0.12;
  const haloOpacity = strength * 0.5 * breathing;

  context.save();

  if (state.pulse) {
    const ripple = ((state.time % 1500) / 1500) * radius * 4;
    context.globalAlpha = Math.max(0, 0.5 - ripple / (radius * 8));
    context.strokeStyle = color;
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(x, y, radius + ripple, 0, Math.PI * 2);
    context.stroke();
  }

  const gradient = context.createRadialGradient(x, y, radius * 0.2, x, y, radius * 3);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.42, `${color}77`);
  gradient.addColorStop(1, "rgba(11,6,9,0)");
  context.fillStyle = gradient;
  context.globalAlpha = haloOpacity;
  context.beginPath();
  context.arc(x, y, radius * 3, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = alpha * 0.46;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius * 1.72, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = alpha;
  const core = context.createRadialGradient(
    x - radius * 0.38,
    y - radius * 0.38,
    radius * 0.1,
    x,
    y,
    radius
  );
  core.addColorStop(0, "#FFFFFF");
  core.addColorStop(0.18, "#FFD3DC");
  core.addColorStop(0.45, color);
  core.addColorStop(1, color);
  context.fillStyle = core;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = Math.min(1, alpha + 0.2);
  context.fillStyle = "rgba(255,255,255,0.62)";
  context.beginPath();
  context.arc(x - radius * 0.28, y - radius * 0.32, Math.max(1, radius * 0.22), 0, Math.PI * 2);
  context.fill();

  if (engram.provisional || state.selected || state.highlighted) {
    context.globalAlpha = state.selected || state.highlighted ? 0.95 : 0.5;
    context.strokeStyle = state.selected ? "#FF93A8" : color;
    context.lineWidth = state.selected || state.highlighted ? 1.1 : 0.8;
    if (engram.provisional) context.setLineDash([3, 4]);
    context.beginPath();
    context.arc(x, y, radius + 5, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}
