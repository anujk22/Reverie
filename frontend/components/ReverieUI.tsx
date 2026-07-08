import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import {
  ArrowUp,
  Circle,
  Info,
  Maximize2,
  SlidersHorizontal,
  Sparkles
} from "lucide-react";
import type { Engram, MemoryGraph, RuntimeEvent } from "@/lib/api";
import { labelText } from "@/lib/text";

type MetadataChipProps = {
  label: string;
  value: string;
};

type TagPillProps = {
  children: ReactNode;
  tone?: "paper" | "dark";
  onClick?: () => void;
};

type ConfidenceLabelProps = {
  value: number | string;
  label?: string;
};

type MemoryCardProps = {
  actor: "You" | "Reverie" | string;
  timestamp: string;
  children: ReactNode;
  tags?: string[];
  confidence?: number | string;
  recall?: string;
  variant?: "person" | "reverie";
  pending?: boolean;
  onTagClick?: (tag: string) => void;
};

type ContextBudgetMeterProps = {
  used?: number;
  total?: number;
  available?: number;
  percent?: number;
};

type BrainMapPanelProps = {
  onExpand?: () => void;
  variant?: "full" | "embedded";
  graph?: MemoryGraph;
  event?: RuntimeEvent | null;
  budget?: ContextBudgetMeterProps;
};

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
};

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
};

type EmptyStateProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
};

const legend = [
  { label: "Experiences", className: "bg-[#ff7446]" },
  { label: "Skills", className: "bg-[#d4dc78]" },
  { label: "People", className: "bg-[#f4b85e]" },
  { label: "Goals", className: "bg-[#fb8c91]" }
];

type BrainRegion = {
  key: string;
  title: string;
  className: string;
  lineClassName: string;
  lineSide: "left" | "right";
  matches: (engram: Engram) => boolean;
};

const designWords = [
  "design",
  "ux",
  "user",
  "product",
  "interface",
  "onboarding",
  "friction",
  "architecture",
  "flow"
];
const seoulWords = ["seoul", "korea", "kr", "roots", "home", "location"];
const creativeWords = [
  "creative",
  "workflow",
  "process",
  "steps",
  "webhook",
  "retry",
  "migration",
  "doc"
];
const futureWords = ["future", "goal", "plan", "launch", "next", "live", "ship"];

const brainRegions: BrainRegion[] = [
  {
    key: "design",
    title: "Design Philosophy",
    className: "left-[4%] top-[25%] max-lg:left-[6%] max-lg:top-[20%]",
    lineClassName: "left-full top-8 h-px w-24 max-xl:w-14",
    lineSide: "right",
    matches: (engram) =>
      engram.type === "preference" ||
      engram.type === "strategy_outcome" ||
      hasMemorySignal(engram, designWords)
  },
  {
    key: "seoul",
    title: "Seoul Roots",
    className: "left-[7%] top-[66%] max-lg:left-[5%]",
    lineClassName: "left-full top-4 h-px w-28 max-xl:w-16",
    lineSide: "right",
    matches: (engram) => hasMemorySignal(engram, seoulWords)
  },
  {
    key: "flow",
    title: "Creative Flow",
    className: "right-[3%] top-[24%] text-left max-lg:right-[5%]",
    lineClassName: "right-full top-8 h-px w-24 max-xl:w-14",
    lineSide: "left",
    matches: (engram) =>
      engram.type === "mastery" ||
      engram.type === "strategy_outcome" ||
      hasMemorySignal(engram, creativeWords)
  },
  {
    key: "future",
    title: "Future Vision",
    className: "right-[2%] top-[72%] text-left max-lg:right-[4%]",
    lineClassName: "right-full top-4 h-px w-28 max-xl:w-16",
    lineSide: "left",
    matches: (engram) => engram.type === "goal" || hasMemorySignal(engram, futureWords)
  }
];

const brainTypeAnchors: Record<string, [number, number]> = {
  affect: [30, 55],
  fact: [56, 52],
  goal: [74, 43],
  mastery: [73, 32],
  misconception: [48, 48],
  preference: [34, 38],
  strategy_outcome: [64, 58]
};

const brainNodeColors: Record<string, string> = {
  affect: "#f4b85e",
  fact: "#ff7446",
  goal: "#fb8c91",
  mastery: "#d4dc78",
  misconception: "#ff7446",
  preference: "#f4b85e",
  strategy_outcome: "#d4dc78"
};

function memoryText(engram: Engram) {
  return `${engram.content} ${engram.subject_tags.join(" ")}`.toLowerCase();
}

function hasMemorySignal(engram: Engram, words: string[]) {
  const text = memoryText(engram);
  return words.some((word) => text.includes(word));
}

function pluralMemories(value: number) {
  return `${value.toLocaleString()} ${value === 1 ? "Memory" : "Memories"}`;
}

function eventNote(value: string) {
  const notes: Record<string, string> = {
    "engram.archived": "Archived",
    "engram.decayed": "Softened",
    "engram.merged": "Merged",
    "engram.observed": "New Memory",
    "engram.reinforced": "Reinforced",
    "engram.superseded": "Rewritten"
  };
  return notes[value] ?? labelText(value.replace(/^engram\./, ""));
}

function regionNote(nodes: Engram[], event: RuntimeEvent | null | undefined, region: BrainRegion) {
  if (event?.kind === "memory_event" && event.engram && region.matches(event.engram)) {
    return eventNote(event.event_type);
  }
  if (!nodes.length) return "Listening";
  if (nodes.some((node) => node.provisional)) return "Forming";

  const averageStrength =
    nodes.reduce((total, node) => total + Math.max(0, Math.min(1, node.strength)), 0) /
    nodes.length;
  const recalls = nodes.reduce((total, node) => total + node.access_count, 0);
  if (averageStrength >= 0.72 || recalls >= nodes.length * 2) return "Reinforced";
  if (averageStrength >= 0.48) return "Active";
  return "New";
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash / 4294967295;
}

function clampPercent(value: number) {
  return Math.max(12, Math.min(88, value));
}

function nodePoint(engram: Engram) {
  const seed = hashSeed(engram.id);
  const [anchorX, anchorY] = brainTypeAnchors[engram.type] ?? [52, 48];
  const angle = seed * Math.PI * 2;
  const radius = 5 + ((seed * 11) % 1) * 13;
  return {
    x: clampPercent(anchorX + Math.cos(angle) * radius),
    y: clampPercent(anchorY + Math.sin(angle) * radius * 0.68)
  };
}

function nodeStyle(engram: Engram) {
  const point = nodePoint(engram);
  const strength = Math.max(0.08, Math.min(1, engram.strength));
  const size = 6 + Math.max(0, Math.min(1, engram.importance)) * 12;
  return {
    "--node-color": brainNodeColors[engram.type] ?? "#ff7446",
    "--node-opacity": engram.status === "archived" ? 0.22 : 0.3 + strength * 0.7,
    height: `${size}px`,
    left: `${point.x}%`,
    top: `${point.y}%`,
    width: `${size}px`
  } as CSSProperties;
}

function visibleBrainNodes(graph: MemoryGraph | undefined, event: RuntimeEvent | null | undefined) {
  const nodes = graph?.nodes ?? [];
  const eventNode =
    event?.kind === "memory_event" &&
    event.engram &&
    !nodes.some((node) => node.id === event.engram?.id)
      ? [event.engram]
      : [];
  return [...nodes, ...eventNode]
    .slice()
    .sort((left, right) => {
      const leftScore = left.strength * 0.6 + left.importance * 0.4;
      const rightScore = right.strength * 0.6 + right.importance * 0.4;
      return rightScore - leftScore;
    })
    .slice(0, 42);
}

function compactNumber(value: number) {
  if (value < 1000) return value.toLocaleString();
  const thousands = value / 1000;
  const formatted = Number.isInteger(thousands) ? `${thousands}` : thousands.toFixed(1);
  return `${formatted}K`;
}

export function MetadataChip({ label, value }: MetadataChipProps) {
  return (
    <span className="metadata-chip">
      <span>{label}:</span>
      <strong>{value}</strong>
    </span>
  );
}

export function TagPill({ children, tone = "paper", onClick }: TagPillProps) {
  const className = tone === "dark" ? "tag-pill tag-pill-dark" : "tag-pill";
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {children}
      </button>
    );
  }
  return <span className={className}>{children}</span>;
}

export function ConfidenceLabel({ value, label = "CONFIDENCE" }: ConfidenceLabelProps) {
  const text = typeof value === "number" ? `${value}%` : value;
  return (
    <span className="confidence-label">
      <span>{label}</span>
      <strong>{text}</strong>
    </span>
  );
}

export function MemoryCard({
  actor,
  timestamp,
  children,
  tags = [],
  confidence,
  recall,
  variant = actor === "Reverie" ? "reverie" : "person",
  pending = false,
  onTagClick
}: MemoryCardProps) {
  return (
    <article className={`memory-card ${pending ? "memory-card-pending" : ""}`}>
      <div className={`memory-avatar ${variant === "reverie" ? "memory-avatar-dark" : ""}`}>
        {variant === "reverie" ? <Sparkles aria-hidden="true" size={17} /> : "LP"}
      </div>
      <time className="memory-time">{timestamp}</time>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className={`memory-actor ${variant === "person" ? "text-coral" : "text-starlight"}`}>
            {actor}
          </h3>
          {recall ? <span className="memory-recall">{labelText(recall)}</span> : null}
        </div>
        <div className="memory-copy">{children}</div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <TagPill key={tag} onClick={onTagClick ? () => onTagClick(tag) : undefined}>
              #{tag}
            </TagPill>
          ))}
          {confidence ? <ConfidenceLabel value={confidence} /> : null}
        </div>
      </div>
    </article>
  );
}

export function ContextBudgetMeter({
  used = 128000,
  total = 200000,
  available = 72000,
  percent = 64
}: ContextBudgetMeterProps) {
  const safePercent = Math.round(Math.max(0, Math.min(100, percent)));
  return (
    <section className="context-budget" aria-label="Context budget">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2>CONTEXT BUDGET</h2>
          <Info aria-hidden="true" size={15} strokeWidth={1.6} />
        </div>
        <p className="context-budget-total">
          {compactNumber(used)} / {compactNumber(total)} TOKENS
        </p>
      </div>
      <div className="context-budget-track" aria-hidden="true">
        <div className="context-budget-fill" style={{ width: `${safePercent}%` }} />
      </div>
      <div className="context-budget-footer">
        <p>{safePercent}% USED</p>
        <p>{compactNumber(available)} AVAILABLE</p>
      </div>
    </section>
  );
}

export function BrainMapPanel({
  onExpand,
  variant = "full",
  graph,
  event,
  budget
}: BrainMapPanelProps) {
  const eventId = event?.kind === "memory_event" ? event.event.id : null;
  const eventEngramId = event?.kind === "memory_event" ? event.event.engram_id : null;
  const nodes = visibleBrainNodes(graph, event);
  const activeNodes = nodes.filter((node) => node.status === "active");
  const regionViews = brainRegions.map((region) => {
    const regionNodes = activeNodes.filter(region.matches);
    return {
      ...region,
      detail: pluralMemories(regionNodes.length),
      note: regionNote(regionNodes, event, region)
    };
  });

  return (
    <aside
      className={`brain-map-panel ${
        variant === "embedded" ? "brain-map-panel-embedded" : ""
      }`}
      aria-label="Active autobiographical memory map"
    >
      <div className="brain-panel-noise" />
      <div className="brain-panel-header">
        <div>
          <p className="brain-panel-kicker">ACTIVE MAP</p>
          <p className="brain-panel-subtitle">
            <span className="h-2 w-2 rounded-full bg-sage" />
            Autobiographical Memory
          </p>
        </div>
        <div className="brain-legend">
          {legend.map((item) => (
            <span key={item.label}>
              <span className={item.className} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Expand memory map"
        onClick={onExpand}
        className="brain-expand"
      >
        <Maximize2 aria-hidden="true" size={18} strokeWidth={1.6} />
      </button>

      <div className="brain-stage">
        <div className="brain-ambient brain-ambient-a" />
        <div className="brain-ambient brain-ambient-b" />
        <div className="brain-artwork-frame">
          <Image
            src="/assets/brainbest.png"
            alt="Autobiographical memory network shaped like a brain"
            width={1438}
            height={1230}
            priority
            className="brain-image"
          />
          <div className="brain-live-layer" aria-hidden="true">
            {nodes.map((node) => {
              const isEventNode = eventEngramId === node.id;
              const eventClass =
                event?.kind === "memory_event" && isEventNode
                  ? ` brain-memory-node-event brain-memory-node-${event.event_type.replace(
                      /^engram\./,
                      ""
                    )}`
                  : "";
              return (
                <span
                  key={`${node.id}-${isEventNode ? eventId : "idle"}`}
                  className={`brain-memory-node brain-memory-node-${node.status}${eventClass}`}
                  style={nodeStyle(node)}
                />
              );
            })}
          </div>
        </div>
        <div className="brain-particle brain-particle-a" />
        <div className="brain-particle brain-particle-b" />
        <div className="brain-particle brain-particle-c" />

        {regionViews.map((callout) => (
          <div key={callout.key} className={`brain-callout ${callout.className}`}>
            <span
              className={`brain-callout-line brain-callout-line-to-${callout.lineSide} ${callout.lineClassName}`}
            />
            <h3>{callout.title}</h3>
            <p>{callout.detail}</p>
            <p>{callout.note}</p>
          </div>
        ))}
      </div>

      {budget ? <ContextBudgetMeter {...budget} /> : null}
    </aside>
  );
}

export function SectionHeader({ eyebrow, title, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        {eyebrow ? <p>{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Circle aria-hidden="true" size={24} strokeWidth={1.5} />
      <h3>{title}</h3>
      <div>{children}</div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions, meta }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="page-header-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="page-header-description">{description}</p> : null}
        {meta ? <div className="mt-4 flex flex-wrap gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function ComposerChrome({
  children,
  onSubmit,
  disabled
}: {
  children: ReactNode;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="composer-chrome">
      {children}
      <button type="button" aria-label="Send message" onClick={onSubmit} disabled={disabled}>
        <ArrowUp aria-hidden="true" size={20} strokeWidth={2} />
      </button>
      <button type="button" aria-label="Memory controls">
        <SlidersHorizontal aria-hidden="true" size={19} strokeWidth={1.7} />
      </button>
    </div>
  );
}
