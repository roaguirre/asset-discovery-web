import { humanizeToken, splitSources } from "./assetTable";
import type {
  LiveAssetRow,
  LiveTrace,
  TraceContributor,
  TraceNode,
} from "./types";

export type TraceOption = {
  asset_id: string;
  identifier: string;
};

/**
 * resolveTraceTargetID keeps the trace view pinned to a valid asset whenever
 * hash state references an asset that is no longer present.
 */
export function resolveTraceTargetID(
  view: "assets" | "trace" | "pivots" | "activity",
  assetID: string,
  traces: LiveTrace[],
  assets: LiveAssetRow[],
): string {
  if (view !== "trace") {
    return assetID;
  }
  const availableIDs = new Set<string>([
    ...traces.map((trace) => trace.asset_id),
    ...assets.map((asset) => asset.asset_id),
  ]);
  if (assetID && availableIDs.has(assetID)) {
    return assetID;
  }
  return traces[0]?.asset_id ?? assets[0]?.asset_id ?? "";
}

/**
 * buildTraceOptions returns the distinct selectable assets that can populate
 * the trace focus dropdown.
 */
export function buildTraceOptions(
  assets: LiveAssetRow[],
  traces: LiveTrace[],
): TraceOption[] {
  const options = new Map<string, TraceOption>();
  traces.forEach((trace) => {
    options.set(trace.asset_id, {
      asset_id: trace.asset_id,
      identifier: trace.identifier,
    });
  });
  assets.forEach((asset) => {
    if (!options.has(asset.asset_id)) {
      options.set(asset.asset_id, {
        asset_id: asset.asset_id,
        identifier: asset.identifier,
      });
    }
  });
  return [...options.values()].sort((left, right) =>
    left.identifier.localeCompare(right.identifier),
  );
}

/**
 * resolveInitialTraceNodeID chooses the exported root node when available and
 * otherwise falls back to the first node in the trace.
 */
export function resolveInitialTraceNodeID(trace: LiveTrace | null): string {
  if (!trace) {
    return "";
  }
  const nodes = trace.nodes ?? [];
  if (trace.root_node_id) {
    const root = nodes.find((node) => node.id === trace.root_node_id);
    if (root) {
      return root.id;
    }
  }
  return nodes[0]?.id ?? "";
}

/**
 * findTraceNode returns the selected trace node or the best initial fallback
 * when the requested node is absent.
 */
export function findTraceNode(
  trace: LiveTrace | null,
  nodeID: string,
): TraceNode | null {
  const nodes = trace?.nodes ?? [];
  if (nodes.length === 0) {
    return null;
  }
  if (nodeID) {
    return nodes.find((node) => node.id === nodeID) ?? null;
  }
  return (
    nodes.find((node) => node.id === resolveInitialTraceNodeID(trace)) ??
    nodes[0] ??
    null
  );
}

/**
 * buildTraceChildren indexes exported trace nodes by parent so the tree view
 * can recurse without repeatedly scanning the full node list.
 */
export function buildTraceChildren(
  trace: LiveTrace | null,
): Map<string, TraceNode[]> {
  const children = new Map<string, TraceNode[]>();
  (trace?.nodes ?? []).forEach((node) => {
    const parentKey = node.parent_id || "__root__";
    const existing = children.get(parentKey) ?? [];
    existing.push(node);
    children.set(parentKey, existing);
  });
  return children;
}

/**
 * buildTraceSummaryPills collapses the most useful asset and contributor
 * metadata into a short set of summary badges for the trace view.
 */
export function buildTraceSummaryPills(
  trace: LiveTrace | null,
  asset: LiveAssetRow | null,
): string[] {
  const pills: string[] = [];
  const contributors = trace?.contributors ?? [];

  const pushSources = (prefix: string, value: string | undefined) => {
    splitSources(value).forEach((source) => {
      pills.push(prefix ? `${prefix} ${source}` : source);
    });
  };

  const assetType = trace?.asset_type || asset?.asset_type;
  if (assetType) {
    pills.push(humanizeToken(assetType));
  }
  if (trace?.domain_kind || asset?.domain_kind) {
    pills.push(humanizeToken(trace?.domain_kind || asset?.domain_kind));
  }
  if (trace?.registrable_domain || asset?.registrable_domain) {
    pills.push(trace?.registrable_domain || asset?.registrable_domain || "");
  }
  if (trace?.resolution_status || asset?.resolution_status) {
    pills.push(
      humanizeToken(trace?.resolution_status || asset?.resolution_status),
    );
  }

  pushSources("Discovered via", trace?.discovered_by || asset?.discovered_by);
  pushSources("Enriched via", trace?.enriched_by || asset?.enriched_by);
  if (!trace?.discovered_by && !trace?.enriched_by) {
    pushSources("", trace?.source || asset?.source);
  }

  const enumerationValues = uniqueContributorValues(
    contributors,
    "enumeration_id",
  );
  if (enumerationValues.length === 1) {
    pills.push(`Enum ${enumerationValues[0]}`);
  } else if (enumerationValues.length > 1) {
    pills.push(`${enumerationValues.length} enumerations`);
  } else if (trace?.enumeration_id || asset?.enumeration_id) {
    pills.push(`Enum ${trace?.enumeration_id || asset?.enumeration_id}`);
  }

  const seedValues = uniqueContributorValues(contributors, "seed_id");
  if (seedValues.length === 1) {
    pills.push(`Seed ${seedValues[0]}`);
  } else if (seedValues.length > 1) {
    pills.push(`${seedValues.length} seeds`);
  } else if (trace?.seed_id || asset?.seed_id) {
    pills.push(`Seed ${trace?.seed_id || asset?.seed_id}`);
  }

  return pills.filter(Boolean);
}

/**
 * buildTraceSummaryStats summarizes the major exported trace record counts.
 */
export function buildTraceSummaryStats(trace: LiveTrace | null): string[] {
  const contributors = trace?.contributors ?? [];
  const nodes = trace?.nodes ?? [];
  const observationCount = nodes.filter(
    (node) => node.kind === "observation",
  ).length;
  const relationCount = nodes.filter((node) => node.kind === "relation").length;
  const enrichmentCount = nodes.filter(
    (node) => node.kind === "enrichment",
  ).length;
  const stats: string[] = [];

  if (contributors.length > 0) {
    stats.push(
      `${contributors.length} contributor${contributors.length === 1 ? "" : "s"}`,
    );
  }
  if (observationCount > 0) {
    stats.push(
      `${observationCount} observation${observationCount === 1 ? "" : "s"}`,
    );
  }
  if (relationCount > 0) {
    stats.push(`${relationCount} relation${relationCount === 1 ? "" : "s"}`);
  }
  if (enrichmentCount > 0) {
    stats.push(
      `${enrichmentCount} enrichment stage${enrichmentCount === 1 ? "" : "s"}`,
    );
  }
  return stats;
}

/**
 * uniqueContributorValues returns distinct non-empty contributor field values
 * while preserving their original discovery order.
 */
export function uniqueContributorValues(
  contributors: TraceContributor[],
  key: keyof TraceContributor,
): string[] {
  const seen = new Set<string>();
  return contributors
    .map((item) => String(item[key] ?? "").trim())
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
}
