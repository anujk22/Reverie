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
import type { Engram, MemoryGraph, RuntimeEvent } from "@/lib/api";
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

type TransientEvent = {
  id: string;
  eventType: string;
  engramId: string | null;
  mergedFrom?: string;
  supersededBy?: string;
  start: number;
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

const BRAIN_IMAGE_SRC = "/assets/reverie-brain.png";

type ArtNode = {
  x: number;
  y: number;
  phase: number;
  weight: number;
};

type BrainArt = {
  source: HTMLCanvasElement | HTMLImageElement;
  nodes: ArtNode[];
  core: { x: number; y: number } | null;
};

type ArtRect = { x: number; y: number; w: number; h: number };

// side profile facing right, normalized to a unit box (x right, y down)
const BRAIN_OUTLINE: Array<[number, number]> = [
  [0.06, 0.53],
  [0.055, 0.4],
  [0.095, 0.27],
  [0.18, 0.16],
  [0.31, 0.08],
  [0.46, 0.045],
  [0.61, 0.055],
  [0.75, 0.1],
  [0.86, 0.18],
  [0.935, 0.3],
  [0.965, 0.43],
  [0.945, 0.53],
  [0.885, 0.61],
  [0.79, 0.68],
  [0.67, 0.72],
  [0.56, 0.72],
  [0.49, 0.755],
  [0.455, 0.825],
  [0.405, 0.895],
  [0.345, 0.91],
  [0.31, 0.835],
  [0.27, 0.765],
  [0.2, 0.735],
  [0.13, 0.665],
  [0.085, 0.6]
];

const BRAIN_CORE: [number, number] = [0.52, 0.43];
const BRAIN_ASPECT = 1.58; // width / height of the outline's bounding box, roughly

const SYNAPSE_ANCHORS: Array<[number, number, number]> = [
  [0.12, 0.46, 3.5],
  [0.18, 0.34, 4.2],
  [0.28, 0.23, 3.2],
  [0.39, 0.18, 4.0],
  [0.52, 0.17, 2.6],
  [0.65, 0.24, 3.0],
  [0.79, 0.34, 3.4],
  [0.88, 0.47, 4.1],
  [0.8, 0.58, 3.5],
  [0.68, 0.67, 4.0],
  [0.52, 0.7, 3.4],
  [0.36, 0.62, 4.6],
  [0.23, 0.56, 3.1],
  [0.47, 0.5, 3.0]
];

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

function createBrainCutout(image: HTMLImageElement): BrainArt {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { source: image, nodes: [], core: null };

  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  const lights = findArtworkLights(data.data, canvas.width, canvas.height);
  return { source: image, nodes: lights.nodes, core: lights.core };
}

// locate the bright synapse dots baked into the artwork so the live twinkle
// lands exactly where the painting already glows
function findArtworkLights(pixels: Uint8ClampedArray, width: number, height: number) {
  const cell = 14;
  const cols = Math.ceil(width / cell);
  const score = new Float32Array(cols * Math.ceil(height / cell));
  const sumX = new Float32Array(score.length);
  const sumY = new Float32Array(score.length);

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const index = (y * width + x) * 4;
      const whiteness = Math.min(pixels[index], pixels[index + 1], pixels[index + 2]);
      const alpha = pixels[index + 3];
      if (whiteness < 198 || alpha < 150) continue;
      const value = ((whiteness - 198) / 57) * (alpha / 255);
      const bucket = Math.floor(y / cell) * cols + Math.floor(x / cell);
      score[bucket] += value;
      sumX[bucket] += x * value;
      sumY[bucket] += y * value;
    }
  }

  const candidates: number[] = [];
  for (let bucket = 0; bucket < score.length; bucket += 1) {
    if (score[bucket] > 1.4) candidates.push(bucket);
  }
  candidates.sort((left, right) => score[right] - score[left]);

  const random = mulberry32(23);
  const picked: Array<ArtNode & { px: number; py: number }> = [];
  for (const bucket of candidates) {
    const px = sumX[bucket] / score[bucket];
    const py = sumY[bucket] / score[bucket];
    if (picked.some((node) => (node.px - px) ** 2 + (node.py - py) ** 2 < 34 ** 2)) continue;
    picked.push({
      x: px / width,
      y: py / height,
      phase: random() * Math.PI * 2,
      weight: score[bucket],
      px,
      py
    });
    if (picked.length >= 48) break;
  }
  if (!picked.length) return { nodes: [] as ArtNode[], core: null };

  // the starburst core is the largest white mass; cluster it out of the
  // twinkle list so it breathes as one light instead of shimmering in pieces
  const brightest = picked[0];
  const coreReach = Math.max(width, height) * 0.055;
  const coreCluster = picked.filter(
    (node) => (node.px - brightest.px) ** 2 + (node.py - brightest.py) ** 2 < coreReach ** 2
  );
  let coreX = 0;
  let coreY = 0;
  let coreWeight = 0;
  for (const node of coreCluster) {
    coreX += node.px * node.weight;
    coreY += node.py * node.weight;
    coreWeight += node.weight;
  }
  const nodes = picked
    .filter((node) => !coreCluster.includes(node))
    .map(({ px: _px, py: _py, ...node }) => node);
  return {
    nodes,
    core: { x: coreX / coreWeight / width, y: coreY / coreWeight / height }
  };
}

function nodeColor(engram: Engram) {
  if (engram.status !== "active") return "#5D4B58";
  return colors[engram.type] ?? "#F5476B";
}

function alphaFor(engram: Engram) {
  if (engram.status === "archived") return 0.15;
  if (engram.status === "superseded") return 0.34;
  if (engram.provisional) return 0.62;
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
  const margin = 0.05;
  const usableW = width * (1 - margin * 2);
  const usableH = height * (1 - margin * 2);
  const scale = Math.min(usableW, usableH * BRAIN_ASPECT, width * 0.815, height * 0.95);
  const brainW = scale;
  const brainH = scale / BRAIN_ASPECT;
  const offsetX = (width - brainW) / 2;
  const offsetY = (height - brainH) * 0.34;
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

function traceBrainPath(context: CanvasRenderingContext2D, frame: BrainFrame) {
  const p = (x: number, y: number) => toCanvas(frame, x, y);
  const move = p(0.06, 0.51);
  context.beginPath();
  context.moveTo(move[0], move[1]);
  let c1 = p(0.035, 0.39);
  let c2 = p(0.085, 0.22);
  let end = p(0.2, 0.14);
  context.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1]);
  c1 = p(0.32, 0.045);
  c2 = p(0.53, 0.015);
  end = p(0.7, 0.075);
  context.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1]);
  c1 = p(0.86, 0.13);
  c2 = p(0.965, 0.27);
  end = p(0.965, 0.43);
  context.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1]);
  c1 = p(0.965, 0.56);
  c2 = p(0.855, 0.66);
  end = p(0.72, 0.7);
  context.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1]);
  c1 = p(0.62, 0.735);
  c2 = p(0.53, 0.71);
  end = p(0.47, 0.73);
  context.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1]);
  c1 = p(0.42, 0.755);
  c2 = p(0.41, 0.845);
  end = p(0.35, 0.89);
  context.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1]);
  c1 = p(0.325, 0.8);
  c2 = p(0.285, 0.735);
  end = p(0.21, 0.71);
  context.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1]);
  c1 = p(0.125, 0.685);
  c2 = p(0.08, 0.61);
  end = p(0.06, 0.51);
  context.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], end[0], end[1]);
  context.closePath();
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
  const radial = 58;
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
  const shells = 44;
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
    const count = 2 + Math.floor(random() * 3);
    for (let index = 0; index < count; index += 1) {
      const t = 0.25 + random() * 0.7;
      const inv = 1 - t;
      const x = inv * inv * fiber.x1 + 2 * inv * t * fiber.cx + t * t * fiber.x2;
      const y = inv * inv * fiber.y1 + 2 * inv * t * fiber.cy + t * t * fiber.y2;
      synapses.push({
        x,
        y,
        radius: 0.9 + random() * 2.2,
        alpha: 0.35 + random() * 0.55,
        phase: random() * Math.PI * 2
      });
    }
  }

  for (const [nx, ny, radius] of SYNAPSE_ANCHORS) {
    const [x, y] = toCanvas(frame, nx, ny);
    if (!pointInPolygon(x, y, frame.polygon)) continue;
    synapses.push({
      x,
      y,
      radius,
      alpha: 0.82,
      phase: random() * Math.PI * 2
    });
  }

  return { fibers, synapses };
}

export function ConstellationCanvas({
  graph,
  selectedId,
  highlightedId,
  pulseId,
  event,
  onSelect
}: {
  graph: MemoryGraph;
  selectedId: string | null;
  highlightedId: string | null;
  pulseId: string | null;
  event?: RuntimeEvent | null;
  onSelect: (engram: Engram) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const brainArtRef = useRef<BrainArt | null>(null);
  const nodesRef = useRef<CanvasNode[]>([]);
  const linksRef = useRef<CanvasLink[]>([]);
  const starfieldRef = useRef<StaticStar[]>([]);
  const sceneryRef = useRef<HTMLCanvasElement | null>(null);
  const transientsRef = useRef<TransientEvent[]>([]);
  const fibersRef = useRef<{ fibers: Fiber[]; synapses: Synapse[] }>({
    fibers: [],
    synapses: []
  });
  const frameRef = useRef<BrainFrame | null>(null);
  const animationRef = useRef<number | null>(null);
  const [size, setSize] = useState({ width: 720, height: 520 });
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [motionReduced, setMotionReduced] = useState(false);
  const [brainImageReady, setBrainImageReady] = useState(false);

  useEffect(() => {
    if (!event || event.kind !== "memory_event") return;
    const payload = event.event.payload_json ?? {};
    transientsRef.current = [
      ...transientsRef.current.slice(-10),
      {
        id: `${event.event.id}-${performance.now()}`,
        eventType: event.event_type,
        engramId: event.event.engram_id,
        mergedFrom: typeof payload.merged_from === "string" ? payload.merged_from : undefined,
        supersededBy:
          typeof payload.superseded_by === "string" ? payload.superseded_by : undefined,
        start: performance.now()
      }
    ];
  }, [event]);

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
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      brainArtRef.current = createBrainCutout(image);
      setBrainImageReady(true);
    };
    image.onerror = () => setBrainImageReady(false);
    image.src = BRAIN_IMAGE_SRC;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
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
    const random = mulberry32(4271);
    starfieldRef.current = Array.from({ length: 1320 }, (_, index) => {
      const major = index % 79 === 0;
      const seed = random();
      return {
        x: seed,
        y: random(),
        radius: major ? 1 + random() * 0.58 : 0.3 + random() * 0.74,
        alpha: major ? 0.42 + random() * 0.18 : 0.09 + random() * 0.32,
        twinkle: index < 72 || major,
        phase: random() * Math.PI * 2
      };
    });
  }, []);

  useEffect(() => {
    const frame = computeFrame(size.width, size.height);
    frameRef.current = frame;
    fibersRef.current = buildFibers(frame);
    sceneryRef.current = buildScenery(
      size.width,
      size.height,
      window.devicePixelRatio || 1,
      starfieldRef.current
    );
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
        let [cx, cy] = clampIntoBrain(frame, node.x ?? frame.coreX, node.y ?? frame.coreY);
        // keep live memories off the artwork's starburst so they stay legible
        let dx = cx - frame.coreX;
        let dy = cy - frame.coreY;
        let distance = Math.hypot(dx, dy);
        if (distance < 1) {
          dx = Math.cos(node.seed * Math.PI * 2);
          dy = Math.sin(node.seed * Math.PI * 2);
          distance = 1;
        }
        const guard = frame.scale * 0.14;
        if (distance < guard) {
          const push = guard / distance;
          [cx, cy] = clampIntoBrain(frame, frame.coreX + dx * push, frame.coreY + dy * push);
        }
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
      context.fillStyle = "#020104";
      context.fillRect(0, 0, size.width, size.height);
      if (sceneryRef.current) {
        context.drawImage(sceneryRef.current, 0, 0, size.width, size.height);
      }
      drawTwinkleStars(context, size.width, size.height, starfieldRef.current, time, motionReduced);

      if (frame) {
        // the mind wakes up: dormant at zero memories, fully lit around six
        const wakefulness = Math.min(1, 0.3 + nodesRef.current.length * 0.14);
        const vitality = dormant ? 0.88 : 1;
        const art = brainImageReady ? brainArtRef.current : null;
        if (art) {
          const rect = artworkRect(frame, art.source);
          context.save();
          context.globalAlpha = wakefulness;
          drawBrainArtwork(context, rect, art.source);
          context.restore();
        } else {
          drawBrainBase(context, frame, time, motionReduced, vitality);
          drawFibers(context, frame, fibersRef.current, time, motionReduced, vitality);
          drawCore(context, frame, time, motionReduced, vitality);
          drawBrainRim(context, frame, time, motionReduced, vitality);
        }
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

      drawTransientEvents(
        context,
        nodesRef.current,
        transientsRef.current,
        time,
        size.width,
        size.height,
        motionReduced
      );
      transientsRef.current = transientsRef.current.filter(
        (item) => time - item.start < 2400
      );

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
  }, [
    brainImageReady,
    graphKey,
    highlightedId,
    motionReduced,
    pulseId,
    selectedId,
    size.height,
    size.width
  ]);

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
        <div className="pointer-events-none absolute inset-x-0 top-[72%] flex justify-center px-8 text-center">
          <p className="max-w-xl font-display text-[27px] italic leading-snug text-[#d9aec2]">
            Reverie has not met Lena yet.
            <br />
            Everything she tells it will appear here.
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

function drawTransientEvents(
  context: CanvasRenderingContext2D,
  nodes: CanvasNode[],
  events: TransientEvent[],
  time: number,
  width: number,
  height: number,
  reduced: boolean
) {
  if (!events.length) return;
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const event of events) {
    const age = Math.max(0, time - event.start);
    const duration = reduced ? 450 : event.eventType === "engram.archived" ? 2200 : 1300;
    const progress = Math.min(1, age / duration);
    const fade = 1 - progress;
    const target = event.engramId ? byId.get(event.engramId) : null;
    const targetX = target?.x ?? width / 2;
    const targetY = target?.y ?? height / 2;

    context.save();
    context.globalCompositeOperation = "lighter";
    context.lineCap = "round";

    if (event.eventType === "engram.merged" && event.mergedFrom) {
      const source = byId.get(event.mergedFrom);
      if (source && target) {
        const sx = source.x ?? targetX;
        const sy = source.y ?? targetY;
        const x = sx + (targetX - sx) * progress;
        const y = sy + (targetY - sy) * progress;
        context.strokeStyle = `rgba(255,147,168,${0.5 * fade})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(sx, sy);
        context.lineTo(targetX, targetY);
        context.stroke();
        context.fillStyle = `rgba(255,147,168,${0.85 * fade})`;
        context.beginPath();
        context.arc(x, y, 5 + 10 * (1 - fade), 0, Math.PI * 2);
        context.fill();
      }
    } else if (event.eventType === "engram.superseded") {
      const successor = event.supersededBy ? byId.get(event.supersededBy) : null;
      context.strokeStyle = `rgba(255,111,94,${0.72 * fade})`;
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(targetX, targetY, 18 + progress * 10, 0, Math.PI * 2);
      context.stroke();
      if (successor) {
        context.strokeStyle = `rgba(255,147,168,${0.36 * fade})`;
        context.beginPath();
        context.moveTo(targetX, targetY);
        context.lineTo(successor.x ?? targetX, successor.y ?? targetY);
        context.stroke();
      }
    } else if (event.eventType === "engram.archived") {
      const edgeX = targetX < width / 2 ? 18 : width - 18;
      const edgeY = Math.min(height - 18, Math.max(18, targetY + (targetY - height / 2) * 0.55));
      const x = targetX + (edgeX - targetX) * progress;
      const y = targetY + (edgeY - targetY) * progress;
      context.strokeStyle = `rgba(110,92,102,${0.7 * fade})`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(targetX, targetY);
      context.lineTo(x, y);
      context.stroke();
      context.fillStyle = `rgba(110,92,102,${0.55 * fade})`;
      context.beginPath();
      context.arc(x, y, 4 + 4 * progress, 0, Math.PI * 2);
      context.fill();
    } else {
      const color =
        event.eventType === "engram.reinforced"
          ? "99,201,165"
          : event.eventType === "engram.observed"
            ? "255,147,168"
            : "242,166,90";
      context.strokeStyle = `rgba(${color},${0.72 * fade})`;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(targetX, targetY, 12 + progress * 18, 0, Math.PI * 2);
      context.stroke();
    }

    context.restore();
  }
}

function nodeRadius(engram: Engram, scale = 1) {
  return (4.5 + Math.max(0, Math.min(1, engram.importance)) * 11) * scale;
}

function ambientDrift(seed: number, time: number, reduced: boolean) {
  if (reduced) return 0;
  return Math.sin(time / 6000 + seed * Math.PI * 2) * 2;
}

function starColor(star: StaticStar, alpha: number) {
  if (star.phase > Math.PI * 1.08) return `rgba(255,147,168,${alpha})`;
  if (star.phase < Math.PI * 0.42) return `rgba(242,166,90,${alpha * 0.85})`;
  return `rgba(243,236,227,${alpha})`;
}

// everything that never moves (fixed stars, nebula, diffraction glints) is
// burned onto one offscreen plate so the animation loop just blits it
function buildScenery(width: number, height: number, dpr: number, stars: StaticStar[]) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  context.scale(dpr, dpr);
  context.globalCompositeOperation = "lighter";

  // nebula bank rolling in from the lower-right corner
  const base = Math.min(width, height);
  const random = mulberry32(511);
  const plumes: Array<[number, number, number, [number, number, number], number]> = [
    [1.04, 1.08, 0.62, [168, 44, 78], 0.1],
    [0.86, 1.06, 0.42, [150, 40, 70], 0.08],
    [1.08, 0.87, 0.38, [158, 36, 64], 0.08],
    [0.95, 0.95, 0.24, [214, 66, 110], 0.06]
  ];
  for (let index = 0; index < 16; index += 1) {
    plumes.push([
      0.78 + random() * 0.3,
      0.7 + random() * 0.4,
      0.05 + random() * 0.09,
      mix([176, 50, 88], [214, 66, 118], random()),
      0.02 + random() * 0.035
    ]);
  }
  for (const [nx, ny, nr, color, alpha] of plumes) {
    const x = nx * width;
    const y = ny * height;
    const radius = nr * base * 1.5;
    const cloud = context.createRadialGradient(x, y, 0, x, y, radius);
    cloud.addColorStop(0, rgba(color, alpha));
    cloud.addColorStop(0.55, rgba(color, alpha * 0.45));
    cloud.addColorStop(1, "rgba(5,4,8,0)");
    context.fillStyle = cloud;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  for (const star of stars) {
    if (star.twinkle) continue;
    context.fillStyle = starColor(star, star.alpha);
    context.beginPath();
    context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
    context.fill();
  }

  drawGlint(context, width * 0.935, height * 0.42, base * 0.036, [255, 208, 224]);
  drawGlint(context, width * 0.075, height * 0.18, base * 0.02, [255, 216, 226]);
  drawGlint(context, width * 0.16, height * 0.88, base * 0.014, [255, 188, 212]);

  return canvas;
}

function drawGlint(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  tint: [number, number, number]
) {
  const halo = context.createRadialGradient(x, y, 0, x, y, size * 0.9);
  halo.addColorStop(0, rgba(tint, 0.5));
  halo.addColorStop(0.35, rgba(tint, 0.14));
  halo.addColorStop(1, "rgba(5,4,8,0)");
  context.fillStyle = halo;
  context.beginPath();
  context.arc(x, y, size * 0.9, 0, Math.PI * 2);
  context.fill();

  const spikes: Array<[number, number, number]> = [
    [1, 0, size],
    [-1, 0, size],
    [0, 1, size * 0.8],
    [0, -1, size * 0.8]
  ];
  for (const [dx, dy, reach] of spikes) {
    const spike = context.createLinearGradient(x, y, x + dx * reach, y + dy * reach);
    spike.addColorStop(0, "rgba(255,255,255,0.9)");
    spike.addColorStop(1, "rgba(255,255,255,0)");
    context.strokeStyle = spike;
    context.lineWidth = 1.3;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + dx * reach, y + dy * reach);
    context.stroke();
  }

  context.fillStyle = "rgba(255,255,255,0.95)";
  context.beginPath();
  context.arc(x, y, 1.6, 0, Math.PI * 2);
  context.fill();
}

function drawTwinkleStars(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  stars: StaticStar[],
  time: number,
  reduced: boolean
) {
  context.save();
  context.globalCompositeOperation = "lighter";
  for (const star of stars) {
    if (!star.twinkle) continue;
    const x = star.x * width;
    const y = star.y * height;
    const twinkle = reduced ? 1 : 0.55 + Math.sin(time / 2600 + star.phase) * 0.35;
    const alpha = Math.max(0.03, star.alpha * twinkle);
    context.fillStyle = starColor(star, alpha);
    context.beginPath();
    context.arc(x, y, star.radius, 0, Math.PI * 2);
    context.fill();

    if (star.radius > 0.8) {
      context.strokeStyle = `rgba(255,147,168,${alpha * 0.42})`;
      context.lineWidth = 0.7;
      context.beginPath();
      context.moveTo(x - star.radius * 5, y);
      context.lineTo(x + star.radius * 5, y);
      context.moveTo(x, y - star.radius * 5);
      context.lineTo(x, y + star.radius * 5);
      context.stroke();
    }
  }
  context.restore();
}

function artworkRect(frame: BrainFrame, image: HTMLCanvasElement | HTMLImageElement): ArtRect {
  const imageWidth = image instanceof HTMLCanvasElement ? image.width : image.naturalWidth;
  const imageHeight = image instanceof HTMLCanvasElement ? image.height : image.naturalHeight;
  const imageAspect = imageWidth / Math.max(1, imageHeight);
  const w = frame.scale * 1.2;
  const h = w / imageAspect;
  const brainH = frame.scale / BRAIN_ASPECT;
  return {
    x: frame.offsetX + frame.scale * 0.5 - w * 0.5,
    y: frame.offsetY + brainH * 0.47 - h * 0.5,
    w,
    h
  };
}

function drawBrainArtwork(
  context: CanvasRenderingContext2D,
  rect: ArtRect,
  image: HTMLCanvasElement | HTMLImageElement
) {
  context.save();
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
  context.filter = "none";
  context.drawImage(image, rect.x, rect.y, rect.w, rect.h);
  context.restore();
}

// a soft shimmer riding exactly on the artwork's own painted lights
function drawArtworkLife(
  context: CanvasRenderingContext2D,
  rect: ArtRect,
  art: BrainArt,
  time: number,
  reduced: boolean,
  vitality: number
) {
  context.save();
  context.globalCompositeOperation = "lighter";
  const unit = rect.w / 900;

  for (const node of art.nodes) {
    const x = rect.x + node.x * rect.w;
    const y = rect.y + node.y * rect.h;
    const wave = reduced ? 0.7 : 0.5 + Math.sin(time / 1500 + node.phase) * 0.5;
    const alpha = (0.05 + wave * 0.2) * vitality;
    const radius = (2.2 + Math.min(1, node.weight / 12) * 3.2) * unit;
    const color = regionColor(node.x);

    const halo = context.createRadialGradient(x, y, radius * 0.2, x, y, radius * 6);
    halo.addColorStop(0, rgba(color, alpha));
    halo.addColorStop(0.4, rgba(color, alpha * 0.4));
    halo.addColorStop(1, "rgba(5,4,8,0)");
    context.fillStyle = halo;
    context.beginPath();
    context.arc(x, y, radius * 6, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = `rgba(255,255,255,${alpha * 0.85})`;
    context.beginPath();
    context.arc(x, y, radius * 0.55, 0, Math.PI * 2);
    context.fill();
  }

  if (art.core) {
    const x = rect.x + art.core.x * rect.w;
    const y = rect.y + art.core.y * rect.h;
    const breath = reduced ? 0.8 : 0.65 + Math.sin(time / 2600) * 0.35;
    const radius = rect.w * 0.05 * (0.8 + breath * 0.25);
    const halo = context.createRadialGradient(x, y, radius * 0.1, x, y, radius * 2.6);
    halo.addColorStop(0, `rgba(255,196,210,${0.22 * breath * vitality})`);
    halo.addColorStop(0.4, `rgba(245,71,107,${0.12 * breath * vitality})`);
    halo.addColorStop(1, "rgba(5,4,8,0)");
    context.fillStyle = halo;
    context.beginPath();
    context.arc(x, y, radius * 2.6, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawBrainBase(
  context: CanvasRenderingContext2D,
  frame: BrainFrame,
  time: number,
  reduced: boolean,
  vitality: number
) {
  const breath = reduced ? 1 : 0.92 + Math.sin(time / 4200) * 0.08;
  context.save();
  traceBrainPath(context, frame);

  const wash = context.createRadialGradient(
    frame.coreX,
    frame.coreY,
    frame.scale * 0.04,
    frame.coreX,
    frame.coreY,
    frame.scale * 0.62
  );
  wash.addColorStop(0, `rgba(245,71,107,${0.18 * vitality * breath})`);
  wash.addColorStop(0.42, `rgba(169,139,250,${0.055 * vitality})`);
  wash.addColorStop(1, "rgba(5,4,8,0)");
  context.fillStyle = wash;
  context.fill();

  context.globalCompositeOperation = "lighter";
  context.lineWidth = 1.2;
  context.strokeStyle = `rgba(169,139,250,${0.18 * vitality})`;
  traceBrainPath(context, frame);
  context.stroke();
  context.restore();
}

function drawBrainRim(
  context: CanvasRenderingContext2D,
  frame: BrainFrame,
  time: number,
  reduced: boolean,
  vitality: number
) {
  const shimmer = reduced ? 1 : 0.75 + Math.sin(time / 3600) * 0.25;
  context.save();
  context.globalCompositeOperation = "lighter";

  const outline = context.createLinearGradient(frame.minX, frame.coreY, frame.maxX, frame.coreY);
  outline.addColorStop(0, `rgba(169,139,250,${0.72 * vitality * shimmer})`);
  outline.addColorStop(0.5, `rgba(255,76,169,${0.8 * vitality})`);
  outline.addColorStop(1, `rgba(255,128,69,${0.72 * vitality * shimmer})`);

  context.strokeStyle = outline;
  context.lineWidth = Math.max(1, frame.scale * 0.0022);
  traceBrainPath(context, frame);
  context.stroke();

  context.shadowColor = "rgba(245,71,107,0.62)";
  context.shadowBlur = frame.scale * 0.018;
  context.strokeStyle = `rgba(255,147,168,${0.34 * vitality})`;
  context.lineWidth = Math.max(1, frame.scale * 0.0012);
  traceBrainPath(context, frame);
  context.stroke();

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
  traceBrainPath(context, frame);
  context.clip();
  context.globalCompositeOperation = "lighter";

  for (const fiber of bundle.fibers) {
    const breath = reduced ? 1 : 0.75 + Math.sin(time / 3400 + fiber.phase) * 0.25;
    const alpha = Math.min(0.48, fiber.alpha * 1.55 * breath * vitality);
    const startColor = regionColor(fiberFraction(frame, fiber.x1));
    const endColor = regionColor(fiberFraction(frame, fiber.x2));
    const gradient = context.createLinearGradient(fiber.x1, fiber.y1, fiber.x2, fiber.y2);
    gradient.addColorStop(0, rgba(startColor, alpha));
    gradient.addColorStop(1, rgba(endColor, alpha * 0.85));
    context.strokeStyle = gradient;
    context.lineWidth = fiber.width * 1.08;
    context.beginPath();
    context.moveTo(fiber.x1, fiber.y1);
    context.quadraticCurveTo(fiber.cx, fiber.cy, fiber.x2, fiber.y2);
    context.stroke();
  }

  for (const synapse of bundle.synapses) {
    const twinkle = reduced ? 0.8 : 0.55 + Math.sin(time / 1900 + synapse.phase) * 0.45;
    const alpha = synapse.alpha * twinkle * vitality * 0.82;
    const color = regionColor(fiberFraction(frame, synapse.x));
    const radius = synapse.radius * 1.12;

    const glow = context.createRadialGradient(
      synapse.x,
      synapse.y,
      radius * 0.2,
      synapse.x,
      synapse.y,
      radius * 5.4
    );
    glow.addColorStop(0, rgba(color, alpha * 0.45));
    glow.addColorStop(0.34, rgba(color, alpha * 0.22));
    glow.addColorStop(1, "rgba(5,4,8,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(synapse.x, synapse.y, radius * 5.4, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = rgba(color, alpha);
    context.beginPath();
    context.arc(synapse.x, synapse.y, radius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = `rgba(255,255,255,${Math.min(0.72, alpha * 0.8)})`;
    context.beginPath();
    context.arc(
      synapse.x - radius * 0.28,
      synapse.y - radius * 0.28,
      Math.max(0.7, radius * 0.28),
      0,
      Math.PI * 2
    );
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
  const radius = frame.scale * 0.058 * breath;
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
  halo.addColorStop(1, "rgba(5,4,8,0)");
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
    context.fillStyle = "rgba(5,4,8,0.72)";
    context.fillRect(labelX - 5, labelY - 8, textWidth + 10, 16);
    context.fillStyle = "rgba(224,206,216,0.95)";
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

  // dark backing disc separates the orb from the bright artwork behind it
  context.globalAlpha = 0.5;
  context.fillStyle = "#050408";
  context.beginPath();
  context.arc(x, y, radius * 1.9, 0, Math.PI * 2);
  context.fill();

  const gradient = context.createRadialGradient(x, y, radius * 0.2, x, y, radius * 3);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.42, `${color}77`);
  gradient.addColorStop(1, "rgba(5,4,8,0)");
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

  context.globalAlpha = Math.min(1, alpha + 0.3);
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
