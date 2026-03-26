import { describe, expect, it } from "vitest";
import {
  buildTraceOptions,
  buildTraceSummaryPills,
  buildTraceSummaryStats,
  findTraceNode,
  resolveInitialTraceNodeID,
  resolveTraceTargetID,
} from "./traceModel";
import type { LiveAssetRow, LiveTrace } from "./types";

describe("traceModel", () => {
  /**
   * Falls back to the first available traceable asset when hash state points at
   * an asset that no longer exists.
   */
  it("resolves a valid trace target from traces and assets", () => {
    const traces = [buildTrace("asset-2", "beta.example.com")];
    const assets = [buildAsset("asset-1", "alpha.example.com")];

    expect(resolveTraceTargetID("trace", "missing", traces, assets)).toBe(
      "asset-2",
    );
    expect(resolveTraceTargetID("assets", "missing", traces, assets)).toBe(
      "missing",
    );
  });

  /**
   * Prefers the exported root node and falls back to it when no explicit node
   * selection exists.
   */
  it("prefers the exported root node when selecting node details", () => {
    const trace = buildTrace("asset-1", "alpha.example.com");

    expect(resolveInitialTraceNodeID(trace)).toBe("node-root");
    expect(findTraceNode(trace, "")?.id).toBe("node-root");
    expect(findTraceNode(trace, "node-child")?.id).toBe("node-child");
  });

  /**
   * Produces deterministic selection options and summary copy from the trace
   * record plus asset fallback data.
   */
  it("builds trace options and summary metadata", () => {
    const trace = buildTrace("asset-1", "alpha.example.com");
    const asset = buildAsset("asset-2", "zeta.example.com");

    expect(
      buildTraceOptions(
        [asset, buildAsset("asset-1", "alpha.example.com")],
        [trace],
      ),
    ).toEqual([
      { asset_id: "asset-1", identifier: "alpha.example.com" },
      { asset_id: "asset-2", identifier: "zeta.example.com" },
    ]);

    expect(buildTraceSummaryPills(trace, asset)).toContain("Discovered via dns_collector");
    expect(buildTraceSummaryPills(trace, asset)).toContain("1 enumeration");
    expect(buildTraceSummaryStats(trace)).toEqual([
      "1 contributor",
      "1 relation",
      "1 enrichment stage",
    ]);
  });
});

/**
 * buildAsset creates the smallest asset fixture needed by the trace-model
 * tests.
 */
function buildAsset(assetID: string, identifier: string): LiveAssetRow {
  return {
    asset_id: assetID,
    identifier,
    asset_type: "domain",
    domain_kind: "subdomain",
    registrable_domain: "example.com",
    resolution_status: "resolved",
    source: "dns_collector",
    discovered_by: "dns_collector",
    enumeration_id: "enum-1",
    seed_id: "seed-1",
    status: "running",
    discovery_date: "2026-03-25T10:05:00Z",
  };
}

/**
 * buildTrace creates the smallest exported trace needed by the trace-model
 * tests.
 */
function buildTrace(assetID: string, identifier: string): LiveTrace {
  return {
    asset_id: assetID,
    identifier,
    asset_type: "domain",
    source: "dns_collector",
    discovered_by: "dns_collector",
    enumeration_id: "enum-1",
    seed_id: "seed-1",
    root_node_id: "node-root",
    contributors: [
      {
        enumeration_id: "enum-1",
        seed_id: "seed-1",
        source: "dns_collector",
      },
    ],
    nodes: [
      {
        id: "node-root",
        kind: "asset",
        label: identifier,
      },
      {
        id: "node-child",
        parent_id: "node-root",
        kind: "relation",
        label: "Resolved from seed",
      },
      {
        id: "node-enrichment",
        parent_id: "node-child",
        kind: "enrichment",
        label: "WHOIS backfill",
      },
    ],
  };
}
