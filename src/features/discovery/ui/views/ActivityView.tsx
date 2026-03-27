import { formatTerminalTime } from "../formatters";
import type { LiveEventRecord } from "../../core/types";

/**
 * Maps an event kind token to a visual category used for colour-coding log rows.
 */
function logCategory(kind: string): string {
  if (/complet|success|publish/.test(kind)) return "done";
  if (/error|fail/.test(kind)) return "err";
  if (/checkpoint/.test(kind)) return "step";
  if (/observation|asset|added/.test(kind)) return "event";
  return "info";
}

/**
 * ActivityTerminal renders the dark terminal stream for a list of run events.
 * Exported so it can be embedded standalone on the story surface without the
 * panel wrapper that ActivityView adds for the authenticated workspace.
 */
export function ActivityTerminal({ events }: { events: LiveEventRecord[] }) {
  return (
    <div className="activity-terminal">
      <header className="activity-terminal-bar">
        <div className="activity-terminal-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <span className="activity-terminal-title">
          <span>Activity Feed</span>
          <span className="activity-terminal-count">
            &nbsp;&mdash;&nbsp;{events.length} event
            {events.length === 1 ? "" : "s"}
          </span>
        </span>
      </header>
      <div className="activity-log-stream" role="log" aria-live="polite">
        {events.length === 0 ? (
          <p className="activity-log-empty">awaiting events…</p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={`activity-log-row activity-log-row--${logCategory(event.kind)}`}
            >
              <span className="activity-log-time">
                {formatTerminalTime(event.created_at)}
              </span>
              <span className="activity-log-kind">{event.kind}</span>
              <span className="activity-log-msg">{event.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * ActivityView keeps run-event presentation isolated from the rest of the
 * workspace so activity rendering can evolve independently.
 */
export function ActivityView({ events }: { events: LiveEventRecord[] }) {
  return (
    <section className="panel view-panel">
      <ActivityTerminal events={events} />
    </section>
  );
}
