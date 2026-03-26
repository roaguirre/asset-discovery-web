import { TraceExplorer } from "../components/TraceExplorer";
import type { TraceOption } from "../../core/traceModel";
import type {
  LiveAssetRow,
  LiveTrace,
  TraceNode,
} from "../../core/types";

type TraceViewProps = {
  traceTargetID: string;
  traceOptions: TraceOption[];
  selectedTrace: LiveTrace | null;
  selectedTraceAsset: LiveAssetRow | null;
  selectedTraceNode: TraceNode | null;
  selectedTraceNodeID: string;
  onSelectTraceAsset: (assetID: string) => void;
  onSelectTraceNode: (nodeID: string) => void;
  onOpenTrace: (assetID: string) => void;
};

/**
 * TraceView renders the dedicated trace workspace and handles the empty-state
 * fallback when the selected run has no traceable assets yet.
 */
export function TraceView({
  traceTargetID,
  traceOptions,
  selectedTrace,
  selectedTraceAsset,
  selectedTraceNode,
  selectedTraceNodeID,
  onSelectTraceAsset,
  onSelectTraceNode,
  onOpenTrace,
}: TraceViewProps) {
  return (
    <section className="panel view-panel trace-view">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Trace Focus</p>
          <h2>
            {selectedTrace?.identifier ||
              selectedTraceAsset?.identifier ||
              "No trace selected yet"}
          </h2>
          <p className="panel-copy">
            Open any asset from the table to carry its context into the dedicated
            trace view.
          </p>
        </div>
        <label className="trace-select">
          Focus asset
          <select
            value={traceTargetID}
            onChange={(event) => onSelectTraceAsset(event.target.value)}
            disabled={traceOptions.length === 0}
          >
            {traceOptions.length === 0 ? (
              <option value="">No assets available</option>
            ) : null}
            {traceOptions.map((option) => (
              <option key={option.asset_id} value={option.asset_id}>
                {option.identifier}
              </option>
            ))}
          </select>
        </label>
      </div>

      {traceTargetID ? (
        <TraceExplorer
          trace={selectedTrace}
          asset={selectedTraceAsset}
          selectedNode={selectedTraceNode}
          selectedNodeID={selectedTraceNodeID}
          onSelectNode={onSelectTraceNode}
          onOpenTrace={onOpenTrace}
        />
      ) : (
        <p className="empty-copy">
          Trace snapshots will appear here once the selected run exports asset
          context.
        </p>
      )}
    </section>
  );
}
