import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import {
  ArrowUp,
  Circle,
  Info,
  Maximize2,
  SlidersHorizontal
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
  confidenceLabel?: string;
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
  selected?: number;
  searched?: number;
  filtered?: number;
  ranked?: number;
  retrievalMs?: number;
};

type BrainMapPanelProps = {
  onExpand?: () => void;
  variant?: "full" | "embedded";
  graph?: MemoryGraph;
  event?: RuntimeEvent | null;
  budget?: ContextBudgetMeterProps;
  attentionIds?: string[];
  selectedId?: string | null;
  onSelectMemory?: (engram: Engram) => void;
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
  { label: "Observed evidence", className: "bg-[#ff7446]" },
  { label: "Learned patterns", className: "bg-[#d4dc78]" },
  { label: "Preferences & affect", className: "bg-[#f4b85e]" },
  { label: "Goals & timing", className: "bg-[#fb8c91]" }
];

type BrainRegion = {
  key: string;
  title: string;
  className: string;
  matches: (engram: Engram) => boolean;
};

const brainRegions: BrainRegion[] = [
  {
    key: "preferences",
    title: "Personal Preferences",
    className: "left-[4%] top-[6%] max-lg:left-[6%]",
    matches: (engram) => engram.type === "preference"
  },
  {
    key: "pressure",
    title: "Current Pressure",
    className: "left-[7%] top-[66%] max-lg:left-[5%]",
    matches: (engram) => engram.type === "affect" || engram.type === "fact"
  },
  {
    key: "knowledge",
    title: "Working Knowledge",
    className: "right-[3%] top-[6%] text-left max-lg:right-[5%]",
    matches: (engram) =>
      engram.type === "misconception" ||
      engram.type === "mastery" ||
      engram.type === "strategy_outcome"
  },
  {
    key: "goals",
    title: "Goals & Timing",
    className: "right-[2%] top-[72%] text-left max-lg:right-[4%]",
    matches: (engram) => engram.type === "goal"
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

function pluralMemories(value: number) {
  return `${value.toLocaleString()} ${value === 1 ? "Memory" : "Memories"}`;
}

function eventNote(value: string) {
  const notes: Record<string, string> = {
    "engram.archived": "Below retention floor",
    "engram.decayed": "Strength decayed",
    "engram.deleted": "Explicitly forgotten",
    "engram.merged": "Duplicate consolidated",
    "engram.observed": "Candidate extracted",
    "engram.reinforced": "Selected for context",
    "engram.superseded": "Older version superseded"
  };
  return notes[value] ?? labelText(value.replace(/^engram\./, ""));
}

function regionNote(nodes: Engram[], event: RuntimeEvent | null | undefined, region: BrainRegion) {
  if (event?.kind === "memory_event" && event.engram && region.matches(event.engram)) {
    return eventNote(event.event_type);
  }
  if (!nodes.length) return "No durable memories";
  const forming = nodes.filter((node) => node.provisional).length;
  if (forming) return `${forming} observation${forming === 1 ? "" : "s"} forming`;

  const averageStrength =
    nodes.reduce((total, node) => total + Math.max(0, Math.min(1, node.strength)), 0) /
    nodes.length;
  const recalls = nodes.reduce((total, node) => total + node.access_count, 0);
  if (recalls) return `Durable · ${recalls} retrieval${recalls === 1 ? "" : "s"}`;
  if (averageStrength >= 0.48) return "Durable · active";
  return "Durable · weakening";
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
  confidenceLabel = "CONFIDENCE",
  recall,
  variant = actor === "Reverie" ? "reverie" : "person",
  pending = false,
  onTagClick
}: MemoryCardProps) {
  return (
    <article
      className={`memory-card memory-card-${variant} ${pending ? "memory-card-pending" : ""}`}
    >
      <div className="memory-card-content">
        <div className="memory-card-header">
          <h3 className={`memory-actor ${variant === "person" ? "text-coral" : "text-starlight"}`}>
            {actor}
          </h3>
          <time className="memory-time">{timestamp}</time>
          {recall ? <span className="memory-recall">{labelText(recall)}</span> : null}
        </div>
        <div className="memory-copy">{children}</div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <TagPill key={tag} onClick={onTagClick ? () => onTagClick(tag) : undefined}>
              #{tag}
            </TagPill>
          ))}
          {confidence !== undefined ? (
            <ConfidenceLabel value={confidence} label={confidenceLabel} />
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ContextBudgetMeter({
  used = 128000,
  total = 200000,
  available = 72000,
  percent = 64,
  selected,
  searched,
  filtered,
  ranked,
  retrievalMs
}: ContextBudgetMeterProps) {
  const safePercent = Math.round(Math.max(0, Math.min(100, percent)));
  return (
    <section className="context-budget" aria-label="Context budget">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2>MEMORY CONTEXT BUDGET</h2>
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
      {searched !== undefined ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-dim">
          {selected ?? 0} selected · {searched} searched · {filtered ?? 0} filtered · {ranked ?? 0}{" "}
          ranked{retrievalMs !== undefined ? ` · ${retrievalMs}ms` : ""}
        </p>
      ) : null}
    </section>
  );
}

export function BrainMapPanel({
  onExpand,
  variant = "full",
  graph,
  event,
  budget,
  attentionIds = [],
  selectedId,
  onSelectMemory
}: BrainMapPanelProps) {
  const eventId = event?.kind === "memory_event" ? event.event.id : null;
  const eventEngramId = event?.kind === "memory_event" ? event.event.engram_id : null;
  const nodes = visibleBrainNodes(graph, event);
  const activeNodes = nodes.filter((node) => node.status === "active");
  const attention = new Set(attentionIds);
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
      className={`brain-map-panel ${variant === "embedded" ? "brain-map-panel-embedded" : ""}`}
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

      {onExpand ? (
        <button
          type="button"
          aria-label="Expand memory map"
          onClick={onExpand}
          className="brain-expand"
        >
          <Maximize2 aria-hidden="true" size={18} strokeWidth={1.6} />
        </button>
      ) : null}

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
            unoptimized
            className="brain-image"
          />
          <div className="brain-live-layer">
            <svg className="brain-relationship-layer" viewBox="0 0 100 100" aria-hidden="true">
              {(graph?.links ?? []).map((link) => {
                const source = nodes.find((node) => node.id === link.source);
                const target = nodes.find((node) => node.id === link.target);
                if (!source || !target) return null;
                const active =
                  (attention.has(source.id) && attention.has(target.id)) ||
                  selectedId === source.id ||
                  selectedId === target.id;
                if (!active) return null;
                const start = nodePoint(source);
                const end = nodePoint(target);
                return (
                  <line
                    key={`${link.source}-${link.target}-${link.type}`}
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    className="brain-relationship-active"
                  />
                );
              })}
            </svg>
            {nodes.map((node) => {
              const isEventNode = eventEngramId === node.id;
              const isAttentionNode = attention.has(node.id);
              const isSelectedNode = selectedId === node.id;
              const eventClass =
                event?.kind === "memory_event" && isEventNode
                  ? ` brain-memory-node-event brain-memory-node-${event.event_type.replace(
                      /^engram\./,
                      ""
                    )}`
                  : "";
              return (
                <button
                  type="button"
                  key={`${node.id}-${isEventNode ? eventId : "idle"}`}
                  aria-label={`Inspect ${labelText(node.type)} memory: ${node.content}`}
                  onClick={() => onSelectMemory?.(node)}
                  className={`brain-memory-node brain-memory-node-${node.status}${eventClass}${
                    isAttentionNode ? " brain-memory-node-attention" : ""
                  }${isSelectedNode ? " brain-memory-node-selected" : ""}`}
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
