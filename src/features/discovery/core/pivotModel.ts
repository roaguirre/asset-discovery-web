import type { JudgeGroup, LivePivotRecord } from "./types";

export type PartitionedPivots = {
  pending: LivePivotRecord[];
  audit: LivePivotRecord[];
};

/**
 * comparePivots keeps the highest-confidence, most recently updated
 * recommendations at the top of the review and audit lists.
 */
export function comparePivots(
  left: LivePivotRecord,
  right: LivePivotRecord,
): number {
  const scoreDiff =
    (right.recommendation_score ?? 0) - (left.recommendation_score ?? 0);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }
  return Date.parse(right.updated_at) - Date.parse(left.updated_at);
}

/**
 * partitionPivots splits pivots into pending-review and audit buckets while
 * preserving a shared sort order between both lists.
 */
export function partitionPivots(
  pivots: LivePivotRecord[],
): PartitionedPivots {
  return {
    pending: pivots
      .filter((pivot) => pivot.status === "pending_review")
      .slice()
      .sort(comparePivots),
    audit: pivots
      .filter((pivot) => pivot.status !== "pending_review")
      .slice()
      .sort(comparePivots),
  };
}

/**
 * buildJudgeGroupKey produces a stable key from the exported grouping fields so
 * judge analysis cards remain deterministic across re-renders.
 */
export function buildJudgeGroupKey(group: JudgeGroup): string {
  return [
    group.collector,
    group.seed_id,
    group.seed_label,
    group.scenario,
    (group.seed_domains ?? []).join(","),
  ].join("::");
}
