import {
  describeOwnership,
  describeSource,
  humanizeToken,
  splitSources,
} from "../../core/assetTable";
import type { LiveView } from "../../core/types";

/**
 * SourcePills renders the contributing source list with hover help for each
 * collector token.
 */
export function SourcePills({ value }: { value: string | undefined }) {
  const sources = splitSources(value);
  if (sources.length === 0) {
    return <span className="muted-inline">n/a</span>;
  }

  return (
    <div className="source-list">
      {sources.map((source) => (
        <span
          key={source}
          className="pill source-pill tooltip-pill"
          data-tooltip={describeSource(source)}
        >
          {source}
        </span>
      ))}
    </div>
  );
}

/**
 * OwnershipPill keeps ownership classifications visually distinct while
 * surfacing the longer explanation on hover and focus.
 */
export function OwnershipPill({ value }: { value: string | undefined }) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  const tone = normalized
    ? ` ownership-${normalized.replaceAll("_", "-")}`
    : "";
  return (
    <span
      className={`pill ownership-pill tooltip-pill${tone}`}
      data-tooltip={describeOwnership(value)}
    >
      {humanizeToken(value, "Unclassified")}
    </span>
  );
}

/**
 * StatCard renders one run overview metric with a consistent visual shell.
 */
export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function ViewIcon({ view }: { view: LiveView }) {
  if (view === "trace") {
    return <TraceIcon />;
  }
  if (view === "pivots") {
    return <PivotIcon />;
  }
  if (view === "activity") {
    return <ActivityIcon />;
  }
  return <AssetsIcon />;
}

export function DrawerIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 5l10 10M15 5 5 15" />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5 7 5 6 5-6" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

function AssetsIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 5h12v10H4z" />
      <path d="M7 8h6M7 11h6" />
    </svg>
  );
}

function TraceIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="5" cy="5" r="2" />
      <circle cx="15" cy="5" r="2" />
      <circle cx="10" cy="15" r="2" />
      <path d="M7 5h6M6 6.5l3 6M14 6.5l-3 6" />
    </svg>
  );
}

function PivotIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 4v12M5 10h7" />
      <path d="m10 6 4 4-4 4" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 11h3l2-4 3 7 2-4h2" />
    </svg>
  );
}
