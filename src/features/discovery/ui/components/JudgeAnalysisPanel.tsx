import { humanizeToken } from "../../core/assetTable";
import { buildJudgeGroupKey } from "../../core/pivotModel";
import type {
  JudgeCandidate,
  JudgeGroup,
  LiveJudgeSummary,
} from "../../core/types";

/**
 * JudgeAnalysisPanel renders grouped accepted and discarded judge outcomes for
 * the currently selected run.
 */
export function JudgeAnalysisPanel({
  judgeSummary,
}: {
  judgeSummary: LiveJudgeSummary;
}) {
  const groups = judgeSummary.groups ?? [];

  return (
    <div className="judge-analysis-stack">
      <div className="judge-analysis-summary">
        <span className="pill">Accepted {judgeSummary.accepted_count}</span>
        <span className="pill">Discarded {judgeSummary.discarded_count}</span>
      </div>
      {groups.length > 0 ? (
        groups.map((group) => (
          <JudgeGroupCard key={buildJudgeGroupKey(group)} group={group} />
        ))
      ) : (
        <p className="empty-copy">
          No judge evaluations were captured for this run.
        </p>
      )}
    </div>
  );
}

function JudgeGroupCard({ group }: { group: JudgeGroup }) {
  const accepted = group.accepted ?? [];
  const discarded = group.discarded ?? [];

  return (
    <article className="judge-group-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Judge Group</p>
          <h3>{humanizeToken(group.collector, "Judge")}</h3>
          <p className="panel-copy">
            {group.seed_label || group.seed_id || "Unknown seed"}
            {group.scenario ? ` · ${humanizeToken(group.scenario)}` : ""}
          </p>
        </div>
        <div className="badge-row">
          {group.seed_domains?.map((domain) => (
            <span key={domain} className="pill pill-subtle">
              {domain}
            </span>
          ))}
        </div>
      </div>
      <div className="judge-columns">
        <section className="judge-column">
          <div className="subsection-heading">
            <h4>Accepted</h4>
            <span>{accepted.length}</span>
          </div>
          {accepted.length > 0 ? (
            accepted.map((candidate) => (
              <JudgeCandidateCard
                key={`accepted:${candidate.root}`}
                candidate={candidate}
                accepted
              />
            ))
          ) : (
            <p className="empty-copy">No accepted candidates in this group.</p>
          )}
        </section>
        <section className="judge-column">
          <div className="subsection-heading">
            <h4>Discarded</h4>
            <span>{discarded.length}</span>
          </div>
          {discarded.length > 0 ? (
            discarded.map((candidate) => (
              <JudgeCandidateCard
                key={`discarded:${candidate.root}`}
                candidate={candidate}
                accepted={false}
              />
            ))
          ) : (
            <p className="empty-copy">No discarded candidates in this group.</p>
          )}
        </section>
      </div>
    </article>
  );
}

function JudgeCandidateCard({
  candidate,
  accepted,
}: {
  candidate: JudgeCandidate;
  accepted: boolean;
}) {
  return (
    <article className="judge-candidate-card">
      <div className="audit-header">
        <strong>{candidate.root}</strong>
        <span
          className={`status-pill ${accepted ? "status-accepted" : "status-rejected"}`}
        >
          {accepted ? "Accepted" : "Discarded"}
        </span>
      </div>
      <p>{candidate.reason || "No reason was returned for this candidate."}</p>
      <div className="badge-row">
        {candidate.kind ? (
          <span className="pill pill-subtle">
            {humanizeToken(candidate.kind)}
          </span>
        ) : null}
        {typeof candidate.confidence === "number" ? (
          <span className="pill pill-subtle">
            Confidence {candidate.confidence.toFixed(2)}
          </span>
        ) : null}
        <span className="pill pill-subtle">
          {candidate.explicit ? "Explicit" : "Implicit"}
        </span>
      </div>
      {(candidate.support ?? []).length > 0 ? (
        <ul className="trace-node-detail-list">
          {(candidate.support ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
