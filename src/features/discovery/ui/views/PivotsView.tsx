import { JudgeAnalysisPanel } from "../components/JudgeAnalysisPanel";
import { formatDate, formatScore, formatStatus } from "../formatters";
import type {
  LiveJudgeSummary,
  LivePivotRecord,
} from "../../core/types";

export type PivotPanelTab = "review" | "judge";

type PivotsViewProps = {
  pivotPanelTab: PivotPanelTab;
  busyAction: string;
  selectedPivotID: string;
  pendingPivots: LivePivotRecord[];
  auditPivots: LivePivotRecord[];
  judgeSummary: LiveJudgeSummary;
  onSelectTab: (tab: PivotPanelTab) => void;
  onSelectPivot: (pivotID: string) => void;
  onPivotDecision: (
    pivot: LivePivotRecord,
    decision: "accepted" | "rejected",
  ) => void;
};

/**
 * PivotsView isolates pivot review and judge-analysis presentation from the
 * broader workspace orchestration logic.
 */
export function PivotsView({
  pivotPanelTab,
  busyAction,
  selectedPivotID,
  pendingPivots,
  auditPivots,
  judgeSummary,
  onSelectTab,
  onSelectPivot,
  onPivotDecision,
}: PivotsViewProps) {
  return (
    <section className="panel view-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Pivots</p>
          <h2>
            {pivotPanelTab === "review"
              ? `${pendingPivots.length} pending review`
              : `${judgeSummary.evaluation_count} judge evaluation${judgeSummary.evaluation_count === 1 ? "" : "s"}`}
          </h2>
          <p className="panel-copy">
            {pivotPanelTab === "review"
              ? "Pending decisions stay at the top. Automated outcomes remain visible in the audit lane."
              : "Grouped judge outcomes stay visible alongside the review workflow."}
          </p>
        </div>
        <div
          className="asset-tabs pivot-view-tabs"
          role="tablist"
          aria-label="Pivot analysis views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={pivotPanelTab === "review"}
            className={`asset-tab ${pivotPanelTab === "review" ? "is-active" : ""}`}
            onClick={() => onSelectTab("review")}
          >
            <span>Review</span>
            <strong>{pendingPivots.length + auditPivots.length}</strong>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pivotPanelTab === "judge"}
            className={`asset-tab ${pivotPanelTab === "judge" ? "is-active" : ""}`}
            onClick={() => onSelectTab("judge")}
          >
            <span>Judge Analysis</span>
            <strong>{judgeSummary.evaluation_count}</strong>
          </button>
        </div>
      </div>

      {pivotPanelTab === "review" ? (
        <div className="pivot-columns">
          <section className="pivot-column">
            <div className="subsection-heading">
              <h3>Pending</h3>
              <span>{pendingPivots.length}</span>
            </div>
            <div className="pivot-list">
              {pendingPivots.map((pivot) => (
                <article
                  key={pivot.id}
                  className={`pivot-card ${selectedPivotID === pivot.id ? "is-selected" : ""}`}
                  onClick={() => onSelectPivot(pivot.id)}
                >
                  <div className="pivot-copy">
                    <strong>{pivot.root}</strong>
                    <p>
                      {pivot.recommendation_reason ||
                        "AI recommended this pivot without an explicit explanation."}
                    </p>
                    <div className="pivot-meta">
                      <span>{pivot.collector || "judge"}</span>
                      <span>
                        {pivot.seed_label ||
                          pivot.seed_domains?.join(", ") ||
                          "Seed context pending"}
                      </span>
                      <span>{formatScore(pivot.recommendation_score)}</span>
                    </div>
                  </div>
                  <div className="pivot-actions">
                    <button
                      type="button"
                      className="hero-button compact"
                      disabled={busyAction === `accepted:${pivot.id}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onPivotDecision(pivot, "accepted");
                      }}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="ghost-button compact"
                      disabled={busyAction === `rejected:${pivot.id}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onPivotDecision(pivot, "rejected");
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              ))}
              {pendingPivots.length === 0 ? (
                <p className="empty-copy">No pivots need review right now.</p>
              ) : null}
            </div>
          </section>

          <section className="pivot-column">
            <div className="subsection-heading">
              <h3>Audit</h3>
              <span>{auditPivots.length}</span>
            </div>
            <div className="audit-list">
              {auditPivots.map((pivot) => (
                <article key={pivot.id} className="audit-item">
                  <div className="audit-header">
                    <strong>{pivot.root}</strong>
                    <span className={`status-pill status-${pivot.status}`}>
                      {formatStatus(pivot.status)}
                    </span>
                  </div>
                  <p>
                    {pivot.recommendation_reason ||
                      "No explicit rationale was stored for this recommendation."}
                  </p>
                  <div className="pivot-meta">
                    <span>{pivot.collector || "judge"}</span>
                    <span>{formatDate(pivot.updated_at)}</span>
                    <span>{formatScore(pivot.recommendation_score)}</span>
                  </div>
                </article>
              ))}
              {auditPivots.length === 0 ? (
                <p className="empty-copy">
                  Resolved recommendations will land here.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : (
        <JudgeAnalysisPanel judgeSummary={judgeSummary} />
      )}
    </section>
  );
}
