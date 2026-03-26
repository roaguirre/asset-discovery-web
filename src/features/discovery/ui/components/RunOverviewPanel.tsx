import { humanizeToken } from "../../core/assetTable";
import { formatStatus } from "../formatters";
import type { LiveJudgeSummary, LiveRunRecord } from "../../core/types";
import { StatCard } from "./common";

type RunOverviewPanelProps = {
  run: LiveRunRecord;
  judgeSummary: LiveJudgeSummary;
  downloadAction: string;
  onDownloadArtifact: (label: string, downloadPath: string) => void;
};

/**
 * RunOverviewPanel renders the selected run summary and artifact download
 * actions without exposing storage or formatting details to the parent view.
 */
export function RunOverviewPanel({
  run,
  judgeSummary,
  downloadAction,
  onDownloadArtifact,
}: RunOverviewPanelProps) {
  return (
    <section className="panel run-overview">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Selected Run</p>
          <h2>{run.id}</h2>
          <p className="panel-copy">
            {run.mode === "manual"
              ? "Recommended pivots wait in review until a human decision lands."
              : "Recommended pivots are applied automatically while the audit trail stays visible."}
          </p>
        </div>
        <span className={`status-pill status-${run.status}`}>
          {formatStatus(run.status)}
        </span>
      </div>
      <div className="stat-grid">
        <StatCard label="Mode" value={humanizeToken(run.mode, "n/a")} />
        <StatCard label="Wave" value={String(run.current_wave)} />
        <StatCard label="Assets" value={String(run.asset_count)} />
        <StatCard label="Seeds" value={String(run.seed_count)} />
        <StatCard
          label="Enumerations"
          value={String(run.enumeration_count)}
        />
        <StatCard
          label="Judge Accepted"
          value={String(run.judge_accepted_count ?? judgeSummary.accepted_count)}
        />
        <StatCard
          label="Judge Discarded"
          value={String(
            run.judge_discarded_count ?? judgeSummary.discarded_count,
          )}
        />
        <StatCard
          label="Pending Pivots"
          value={String(run.pending_pivot_count)}
        />
      </div>
      <div className="run-overview-footer">
        <div className="run-downloads" aria-label="Run downloads">
          {run.downloads?.json || run.downloads?.csv || run.downloads?.xlsx ? (
            <>
              <span className="muted-inline">Downloads</span>
              {run.downloads?.json ? (
                <button
                  type="button"
                  className="ghost-button compact"
                  onClick={() =>
                    onDownloadArtifact("JSON", run.downloads?.json ?? "")
                  }
                  disabled={downloadAction === run.downloads.json}
                >
                  {downloadAction === run.downloads.json
                    ? "Opening JSON..."
                    : "JSON"}
                </button>
              ) : null}
              {run.downloads?.csv ? (
                <button
                  type="button"
                  className="ghost-button compact"
                  onClick={() => onDownloadArtifact("CSV", run.downloads?.csv ?? "")}
                  disabled={downloadAction === run.downloads.csv}
                >
                  {downloadAction === run.downloads.csv ? "Opening CSV..." : "CSV"}
                </button>
              ) : null}
              {run.downloads?.xlsx ? (
                <button
                  type="button"
                  className="ghost-button compact"
                  onClick={() =>
                    onDownloadArtifact("XLSX", run.downloads?.xlsx ?? "")
                  }
                  disabled={downloadAction === run.downloads.xlsx}
                >
                  {downloadAction === run.downloads.xlsx
                    ? "Opening XLSX..."
                    : "XLSX"}
                </button>
              ) : null}
            </>
          ) : (
            <span className="muted-inline">
              {run.status === "completed" || run.status === "failed"
                ? "Downloads unavailable"
                : "Preparing exports..."}
            </span>
          )}
        </div>
      </div>
      {run.last_error ? (
        <p className="status-line status-error">{run.last_error}</p>
      ) : null}
    </section>
  );
}
