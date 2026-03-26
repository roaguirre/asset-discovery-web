import { useState, type ReactNode } from "react";
import type { LivePivotRecord } from "../../discovery/core/types";
import { JudgeAnalysisPanel } from "../../discovery/ui/components/JudgeAnalysisPanel";
import { TraceExplorer } from "../../discovery/ui/components/TraceExplorer";
import { RunOverviewPanel } from "../../discovery/ui/components/RunOverviewPanel";
import {
  PivotsView,
  type PivotPanelTab,
} from "../../discovery/ui/views/PivotsView";
import type { CapabilityGroup, StoryCrop } from "./storyModel";
import {
  architecturePoints,
  storyAuditPivots,
  storyJudgeSummary,
  storyPendingPivots,
  storyRun,
  storyTrace,
  storyTraceAsset,
} from "./storyModel";

export type StoryCropCaptionMode = "full" | "label-only" | "hidden";

type StoryCropFigureProps = {
  crop: StoryCrop;
  className?: string;
  tone?: "paper" | "ink" | "accent";
  interactive?: boolean;
  captionMode?: StoryCropCaptionMode;
  children: ReactNode;
};

/**
 * StoryCropFigure frames a mocked workspace view as an editorial crop while
 * allowing each section to decide how much captioning the composition needs.
 */
export function StoryCropFigure({
  crop,
  className,
  tone = "paper",
  interactive = false,
  captionMode = "full",
  children,
}: StoryCropFigureProps) {
  const classes = [
    "story-crop",
    `tone-${tone}`,
    interactive ? "is-interactive" : null,
    captionMode === "label-only" ? "has-label-only-caption" : null,
    captionMode === "hidden" ? "has-hidden-caption" : null,
    className ?? null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <figure className={classes} aria-label={`${crop.label} mock view`}>
      {captionMode === "hidden" ? null : (
        <figcaption className="story-crop-copy">
          <p className="eyebrow">{crop.label}</p>
          {captionMode === "full" ? (
            <>
              <strong>{crop.title}</strong>
              <p>{crop.caption}</p>
            </>
          ) : null}
        </figcaption>
      )}
      <div className="story-crop-visual">{children}</div>
    </figure>
  );
}

/**
 * StoryProofStage keeps one editorial claim physically attached to one proof
 * surface so the evidence section reads as adjacent argument instead of a
 * sequence of floating cards.
 */
export function StoryProofStage({
  eyebrow,
  title,
  copy,
  side,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  side: "left" | "right";
  className?: string;
  children: ReactNode;
}) {
  const classes = [
    "story-proof-stage",
    side === "left" ? "proof-left" : "proof-right",
    className ?? null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <div className="story-proof-stage-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p>{copy}</p>
      </div>
      <div className="story-proof-stage-surface">{children}</div>
    </article>
  );
}

/**
 * StoryCapabilityBand renders one compact capability group without reusing the
 * heavier story-card pattern everywhere on the page.
 */
export function StoryCapabilityBand({ group }: { group: CapabilityGroup }) {
  return (
    <article className={`story-capability-band tone-${group.tone}`}>
      <h3>{group.title}</h3>
      <ul className="story-capability-list">
        {group.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

/**
 * StoryArchitectureDiagram explains the scheduler-owned frontier flow with a
 * purpose-built visual instead of another generic card list.
 */
export function StoryArchitectureDiagram() {
  return (
    <div className="story-frontier-diagram" aria-label="Scheduler frontier diagram">
      <div className="story-flow-node">
        <span>Seed frontier</span>
        <strong>Current wave</strong>
      </div>
      <span className="story-flow-arrow" aria-hidden="true">
        →
      </span>
      <div className="story-flow-node">
        <span>Collectors</span>
        <strong>Signals gathered</strong>
      </div>
      <span className="story-flow-arrow" aria-hidden="true">
        →
      </span>
      <div className="story-flow-node">
        <span>Judge + review</span>
        <strong>Pivots accepted or discarded</strong>
      </div>
      <span className="story-flow-arrow" aria-hidden="true">
        →
      </span>
      <div className="story-flow-node is-accent">
        <span>Scheduler</span>
        <strong>Next frontier released</strong>
      </div>
    </div>
  );
}

/**
 * StoryArchitecturePrinciples keeps the architecture section concise while
 * still exposing the runtime decisions that support the product story.
 */
export function StoryArchitecturePrinciples() {
  return (
    <div className="story-architecture-principles">
      {architecturePoints.map((point) => (
        <article key={point.title} className="story-architecture-point">
          <h3>{point.title}</h3>
          <p>{point.copy}</p>
        </article>
      ))}
    </div>
  );
}

/**
 * StoryRunOverviewMock renders the mocked run summary used throughout the
 * landing page hero and proof sections.
 */
export function StoryRunOverviewMock() {
  return (
    <RunOverviewPanel
      run={storyRun}
      judgeSummary={storyJudgeSummary}
      downloadAction=""
      onDownloadArtifact={() => undefined}
    />
  );
}

/**
 * StoryPivotsViewMock keeps a lightweight interactive review state for the
 * landing page so the mock feels like a real surface rather than a screenshot.
 */
export function StoryPivotsViewMock() {
  const [pendingPivots, setPendingPivots] = useState(storyPendingPivots);
  const [auditPivots, setAuditPivots] = useState(storyAuditPivots);
  const [selectedPivotID, setSelectedPivotID] = useState(
    storyPendingPivots[0]?.id ?? "",
  );

  const handlePivotDecision = (
    pivot: (typeof storyPendingPivots)[number],
    decision: "accepted" | "rejected",
  ) => {
    const resolvedStatus: LivePivotRecord["status"] =
      decision === "accepted" ? "accepted" : "rejected";
    const nextPending = pendingPivots.filter((item) => item.id !== pivot.id);
    const resolvedPivot: LivePivotRecord = {
      ...pivot,
      status: resolvedStatus,
      updated_at: "2026-03-25T13:24:00Z",
      decision_at: "2026-03-25T13:24:00Z",
      decision_by_uid: "uid-demo",
      decision_by_email: "roaguirred@gmail.com",
    };

    setPendingPivots(nextPending);
    setAuditPivots((current) => [resolvedPivot, ...current]);
    setSelectedPivotID(nextPending[0]?.id ?? "");
  };

  return (
    <PivotsView
      pivotPanelTab={"review" satisfies PivotPanelTab}
      busyAction=""
      selectedPivotID={selectedPivotID}
      pendingPivots={pendingPivots}
      auditPivots={auditPivots}
      judgeSummary={storyJudgeSummary}
      showTabs={false}
      onSelectTab={() => undefined}
      onSelectPivot={setSelectedPivotID}
      onPivotDecision={handlePivotDecision}
    />
  );
}

/**
 * StoryJudgeAnalysisMock renders the grouped judge summary used in the
 * observational proof section.
 */
export function StoryJudgeAnalysisMock() {
  return <JudgeAnalysisPanel judgeSummary={storyJudgeSummary} />;
}

/**
 * StoryTraceExplorerMock keeps node selection interactive so the landing page
 * can demonstrate explainability with the real trace explorer UI.
 */
export function StoryTraceExplorerMock() {
  const [selectedNodeID, setSelectedNodeID] = useState("trace-ownership");
  const selectedNode =
    storyTrace.nodes?.find((node) => node.id === selectedNodeID) ?? null;

  return (
    <TraceExplorer
      trace={storyTrace}
      asset={storyTraceAsset}
      selectedNode={selectedNode}
      selectedNodeID={selectedNodeID}
      onSelectNode={setSelectedNodeID}
      onOpenTrace={() => undefined}
    />
  );
}
