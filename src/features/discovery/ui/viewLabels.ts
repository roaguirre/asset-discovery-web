import type { AssetTableTab } from "../core/assetTable";
import type { LiveView } from "../core/types";

export const assetTabLabels: Record<AssetTableTab, string> = {
  all: "All",
  domains: "Domains",
  ips: "IPs",
};

export const viewLabels: Record<LiveView, string> = {
  assets: "Assets",
  trace: "Trace",
  pivots: "Pivots",
  activity: "Activity",
};
