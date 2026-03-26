import { humanizeToken } from "../../core/assetTable";
import { formatDate } from "../formatters";
import type { LiveEventRecord } from "../../core/types";

/**
 * ActivityView keeps run-event presentation isolated from the rest of the
 * workspace so activity rendering can evolve independently.
 */
export function ActivityView({ events }: { events: LiveEventRecord[] }) {
  return (
    <section className="panel view-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Activity Feed</p>
          <h2>
            {events.length} recent event{events.length === 1 ? "" : "s"}
          </h2>
          <p className="panel-copy">
            The feed stays isolated from assets, pivots, and trace so the main
            workspace can stay focused.
          </p>
        </div>
      </div>
      <div className="activity-list">
        {events.map((event) => (
          <article key={event.id} className="activity-item">
            <span className="status-pill subtle">
              {humanizeToken(event.kind, event.kind)}
            </span>
            <strong>{event.message}</strong>
            <span>{formatDate(event.created_at)}</span>
          </article>
        ))}
        {events.length === 0 ? (
          <p className="empty-copy">
            Run events will appear here once execution begins.
          </p>
        ) : null}
      </div>
    </section>
  );
}
