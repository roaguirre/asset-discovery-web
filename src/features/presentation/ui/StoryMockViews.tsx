import { useState, type ReactNode } from "react";
import { humanizeToken } from "../../discovery/core/assetTable";
import { buildTraceChildren } from "../../discovery/core/traceModel";
import type { LivePivotRecord, TraceNode } from "../../discovery/core/types";
import { JudgeAnalysisPanel } from "../../discovery/ui/components/JudgeAnalysisPanel";
import { TraceSummaryCard, TraceExplorer } from "../../discovery/ui/components/TraceExplorer";
import { RunOverviewPanel } from "../../discovery/ui/components/RunOverviewPanel";
import {
  PivotsView,
  type PivotPanelTab,
} from "../../discovery/ui/views/PivotsView";
import { ActivityTerminal } from "../../discovery/ui/views/ActivityView";
import type { CapabilityGroup, StoryCrop } from "./storyModel";
import {
  architectureCollectors,
  storyAuditPivots,
  storyEvents,
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
 * StoryArchitecturePipeline replaces the former flat flow + principles cards
 * with a vertical system-design pipeline that shows the full runtime topology:
 * seeds → scheduler → collectors → judge/review → asset store.
 *
 * The scheduler node carries a feedback badge to communicate the closed-loop
 * frontier expansion model without needing a real arrow overlay.
 */
export function StoryArchitecturePipeline() {
  return (
    <div className="arch-pipeline" aria-label="Discovery system architecture pipeline">

      {/* Seeds */}
      <div className="arch-node arch-node--seeds">
        <header className="arch-node-header">
          <span className="arch-node-tag">Input</span>
        </header>
        <strong className="arch-node-name">Seed Frontier</strong>
        <p className="arch-node-desc">
          Company name + known domains define the initial wave scope.
        </p>
        <div className="arch-chips">
          <span>4 seeds</span>
          <span>example-app.com</span>
        </div>
      </div>

      <div className="arch-conn" aria-hidden="true">
        <div className="arch-conn-track" />
        <span className="arch-conn-label">frontier input</span>
      </div>

      {/* Scheduler — the orchestration core */}
      <div className="arch-node arch-node--scheduler">
        <header className="arch-node-header">
          <span className="arch-node-tag">Orchestration</span>
          <div className="arch-node-pulse" aria-hidden="true" />
        </header>
        <strong className="arch-node-name">Scheduler</strong>
        <p className="arch-node-desc">
          Wave-by-wave dispatch. Nothing is explored without scheduler authorization.
        </p>
        <div className="arch-chips arch-chips--accent">
          <span>acyclic</span>
          <span>wave-bounded</span>
          <span>DAG-oriented</span>
          <span>max 2 discovered frontiers</span>
        </div>
        <div className="arch-feedback-badge" aria-label="Feedback loop: accepted pivots return to scheduler">
          <span className="arch-feedback-icon" aria-hidden="true">↰</span>
          accepted pivots return here as new frontier seeds
        </div>
      </div>

      <div className="arch-conn" aria-hidden="true">
        <div className="arch-conn-track" />
        <span className="arch-conn-label">dispatches collectors</span>
      </div>

      {/* Collectors cluster */}
      <div className="arch-node arch-node--collectors">
        <header className="arch-node-header">
          <span className="arch-node-tag">Signal Collection</span>
        </header>
        <strong className="arch-node-name">Collectors</strong>
        <div className="arch-collector-grid">
          {architectureCollectors.map((c) => (
            <div key={c.label} className="arch-collector-item">
              <span className="arch-collector-name">{c.label}</span>
              <span className="arch-collector-desc">{c.desc}</span>
            </div>
          ))}
        </div>
        <p className="arch-node-desc arch-node-desc--small">
          11 collectors total. Every cross-root result is LLM-judged before advancing as a seed.
        </p>
      </div>

      <div className="arch-conn" aria-hidden="true">
        <div className="arch-conn-track" />
        <span className="arch-conn-label">raw signals</span>
      </div>

      {/* Judge + Review side-by-side */}
      <div className="arch-split">
        <div className="arch-node arch-node--judge">
          <span className="arch-node-tag">LLM · Automated</span>
          <strong className="arch-node-name">Ownership Judge</strong>
          <p className="arch-node-desc">
            LLM evaluates each cross-root candidate against seed context. Returns confidence, kind, and reasoning. Accepted or discarded — both stay traceable.
          </p>
          <div className="arch-chips" style={{marginTop: "6px"}}>
            <span>temp=0</span>
            <span>JSON output</span>
            <span>conservative</span>
          </div>
        </div>
        <div className="arch-split-conn" aria-hidden="true">
          <div className="arch-split-line" />
          <span className="arch-split-label">pending<br />review</span>
        </div>
        <div className="arch-node arch-node--review">
          <span className="arch-node-tag">Human</span>
          <strong className="arch-node-name">Review Surface</strong>
          <p className="arch-node-desc">
            Ambiguous pivots become explicit decisions. No silent scope expansion.
          </p>
        </div>
      </div>

      <div className="arch-conn" aria-hidden="true">
        <div className="arch-conn-track" />
        <span className="arch-conn-label">canonical assets</span>
      </div>

      {/* Asset Store */}
      <div className="arch-node arch-node--store">
        <header className="arch-node-header">
          <span className="arch-node-tag">Output</span>
        </header>
        <strong className="arch-node-name">Asset Store</strong>
        <p className="arch-node-desc">
          Deduplicated canonical results. Every asset carries its provenance, trace, and decision history.
        </p>
        <div className="arch-chips">
          <span>JSON</span>
          <span>CSV</span>
          <span>XLSX</span>
          <span>full provenance</span>
        </div>
      </div>

      <div className="arch-conn arch-conn--dashed" aria-hidden="true">
        <div className="arch-conn-track" />
        <span className="arch-conn-label">post-run · bounded reconsideration</span>
      </div>

      {/* Bounded Reconsideration */}
      <div className="arch-node arch-node--reconsider">
        <header className="arch-node-header">
          <span className="arch-node-tag">Reconsideration · Post-Run</span>
        </header>
        <strong className="arch-node-name">Bounded Reconsideration</strong>
        <p className="arch-node-desc">
          After all frontier waves are exhausted, discarded candidates are re-evaluated once with full run context — a complete picture of what was accepted and why.
        </p>
        <div className="arch-reconsider-steps">
          <div className="arch-reconsider-step">
            <span className="arch-reconsider-step-label">Discarded pool</span>
            <span className="arch-reconsider-step-desc">All rejected candidates from every wave, preserved with their original evidence.</span>
          </div>
          <span className="arch-reconsider-arrow" aria-hidden="true">→</span>
          <div className="arch-reconsider-step">
            <span className="arch-reconsider-step-label">LLM re-evaluates</span>
            <span className="arch-reconsider-step-desc">Judged again with the full accepted-asset set as context. Confidence may shift.</span>
          </div>
          <span className="arch-reconsider-arrow" aria-hidden="true">→</span>
          <div className="arch-reconsider-step">
            <span className="arch-reconsider-step-label">One extra wave</span>
            <span className="arch-reconsider-step-desc">Promoted candidates seed exactly one additional frontier — never recursive.</span>
          </div>
        </div>
        <div className="arch-reconsider-outcome">
          <span className="arch-reconsider-outcome-icon" aria-hidden="true">↰</span>
          promoted candidates return to the scheduler as a single bounded wave
        </div>
      </div>

    </div>
  );
}

/** @deprecated Use StoryArchitecturePipeline */
export function StoryArchitectureDiagram() {
  return <StoryArchitecturePipeline />;
}

/** @deprecated Integrated into StoryArchitecturePipeline */
export function StoryArchitecturePrinciples() {
  return null;
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
  const [selectedNodeID, setSelectedNodeID] = useState("trace-asset-root");
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

/**
 * StoryActivityMock renders the activity terminal directly — without the
 * workspace panel wrapper — so it can be embedded in story crops.
 */
export function StoryActivityMock() {
  return <ActivityTerminal events={storyEvents} />;
}

/**
 * StoryTraceSummaryMock renders only the trace summary card so the proof
 * section can show provenance context without the full explorer layout.
 */
export function StoryTraceSummaryMock() {
  return (
    <div className="trace-explorer">
      <TraceSummaryCard trace={storyTrace} asset={storyTraceAsset} />
    </div>
  );
}

/**
 * StoryTraceWorkspaceMock renders the trace tree and node details panel
 * directly — skipping the summary card — so the decision chain is the
 * immediate focus for the Decision Trail proof section.
 */
export function StoryTraceWorkspaceMock() {
  const [selectedNodeID, setSelectedNodeID] = useState("trace-asset-root");
  const selectedNode: TraceNode | null =
    storyTrace.nodes?.find((n) => n.id === selectedNodeID) ?? null;
  const children = buildTraceChildren(storyTrace);

  return (
    <div className="trace-explorer">
      <div className="trace-workspace-live">
        <aside className="trace-tree-shell-live">
          <div className="subsection-heading">
            <h3>Trace Tree</h3>
            <span>{storyTrace.nodes?.length ?? 0}</span>
          </div>
          <div className="trace-tree-list">
            <StoryTraceTreeBranch
              children={children}
              parentID="__root__"
              selectedNodeID={selectedNodeID}
              onSelectNode={setSelectedNodeID}
              depth={0}
            />
          </div>
        </aside>
        <section className="trace-panel-shell-live">
          <div className="subsection-heading">
            <h3>Node Details</h3>
            <span>
              {selectedNode ? humanizeToken(selectedNode.kind, "Node") : "Select a node"}
            </span>
          </div>
          {selectedNode ? (
            <div className="trace-node-detail-stack">
              <article className="trace-card">
                <h4>{selectedNode.label}</h4>
                <p className="panel-copy">
                  {selectedNode.subtitle || humanizeToken(selectedNode.kind, "Node")}
                </p>
                {selectedNode.kind ? (
                  <div className="badge-row">
                    <span className="pill pill-subtle">
                      {humanizeToken(selectedNode.kind)}
                    </span>
                  </div>
                ) : null}
              </article>
              {(selectedNode.details ?? []).map((section) => (
                <article key={section.title} className="trace-card">
                  <h4>{section.title}</h4>
                  <ul>
                    {(section.items ?? []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-copy">Select a node to inspect its evidence.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function StoryTraceTreeBranch({
  children,
  parentID,
  selectedNodeID,
  onSelectNode,
  depth,
}: {
  children: Map<string, TraceNode[]>;
  parentID: string;
  selectedNodeID: string;
  onSelectNode: (id: string) => void;
  depth: number;
}) {
  const nodes = children.get(parentID) ?? [];
  return (
    <>
      {nodes.map((node) => (
        <div
          key={node.id}
          className="trace-tree-node"
          style={{ ["--trace-depth" as string]: String(depth) }}
        >
          <button
            type="button"
            className={`trace-node-button ${node.id === selectedNodeID ? "is-active" : ""}`}
            onClick={() => onSelectNode(node.id)}
          >
            <span className="trace-node-copy">
              <strong>{node.label}</strong>
              <span>
                {node.subtitle && node.subtitle !== node.label
                  ? node.subtitle
                  : humanizeToken(node.kind, "Node")}
              </span>
            </span>
            <span className="trace-node-badges">
              {[node.kind ? humanizeToken(node.kind) : "", ...(node.badges ?? [])]
                .filter(Boolean)
                .slice(0, 2)
                .map((badge) => (
                  <span key={badge} className="pill pill-subtle">
                    {badge}
                  </span>
                ))}
            </span>
          </button>
          {(children.get(node.id) ?? []).length > 0 ? (
            <div className="trace-tree-children">
              <StoryTraceTreeBranch
                children={children}
                parentID={node.id}
                selectedNodeID={selectedNodeID}
                onSelectNode={onSelectNode}
                depth={depth + 1}
              />
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}
