import { describe, expect, it } from "vitest";
import { buildJudgeGroupKey, partitionPivots } from "./pivotModel";
import type { LivePivotRecord } from "./types";

describe("pivotModel", () => {
  /**
   * Splits pending and audit pivots while applying one consistent sort order to
   * both partitions.
   */
  it("partitions pivots into sorted review and audit buckets", () => {
    const pivots: LivePivotRecord[] = [
      buildPivot("pivot-pending-low", "pending_review", 0.55, "2026-03-25T10:00:00Z"),
      buildPivot("pivot-pending-high", "pending_review", 0.92, "2026-03-25T09:00:00Z"),
      buildPivot("pivot-audit", "accepted", 0.61, "2026-03-25T11:00:00Z"),
    ];

    expect(partitionPivots(pivots)).toEqual({
      pending: [
        buildPivot("pivot-pending-high", "pending_review", 0.92, "2026-03-25T09:00:00Z"),
        buildPivot("pivot-pending-low", "pending_review", 0.55, "2026-03-25T10:00:00Z"),
      ],
      audit: [
        buildPivot("pivot-audit", "accepted", 0.61, "2026-03-25T11:00:00Z"),
      ],
    });
  });

  /**
   * Produces a deterministic group key from the exported judge grouping fields.
   */
  it("builds a stable judge group key", () => {
    expect(
      buildJudgeGroupKey({
        collector: "web_hint_collector",
        seed_id: "seed-1",
        seed_label: "Example Seed",
        scenario: "brand overlap",
        seed_domains: ["example.com", "example.org"],
      }),
    ).toBe(
      "web_hint_collector::seed-1::Example Seed::brand overlap::example.com,example.org",
    );
  });
});

/**
 * buildPivot creates a compact pivot fixture for the pivot-model tests.
 */
function buildPivot(
  id: string,
  status: LivePivotRecord["status"],
  score: number,
  updatedAt: string,
): LivePivotRecord {
  return {
    id,
    root: `${id}.example.com`,
    status,
    recommendation_score: score,
    candidate: { domains: [`${id}.example.com`] },
    created_at: updatedAt,
    updated_at: updatedAt,
  };
}
