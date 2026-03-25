import type { Downloads, JudgeSummary, Row, Trace } from "../types";

export type LiveRunMode = "autonomous" | "manual";
export type LiveRunStatus =
  | "queued"
  | "running"
  | "awaiting_review"
  | "completed"
  | "failed";
export type LiveView = "assets" | "trace" | "pivots" | "activity";
export type LiveAssetTab = "all" | "domains" | "ips";
export type LivePivotStatus =
  | "pending_review"
  | "accepted"
  | "rejected"
  | "auto_accepted"
  | "auto_rejected";

export type LiveAuthSession = {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
};

export type LiveRouteState = {
  runID: string;
  view: LiveView;
  assetTab: LiveAssetTab;
  assetID: string;
  pivotID: string;
};

export type LiveRunRecord = {
  id: string;
  owner_uid: string;
  owner_email: string;
  mode: LiveRunMode;
  status: LiveRunStatus;
  current_wave: number;
  seed_count: number;
  enumeration_count: number;
  asset_count: number;
  pending_pivot_count: number;
  judge_evaluation_count: number;
  judge_accepted_count: number;
  judge_discarded_count: number;
  last_error?: string;
  downloads?: Downloads;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
};

export type LiveSeedRecord = {
  id: string;
  source: string;
  pivot_id?: string;
  submitted_at: string;
  seed: {
    id: string;
    company_name?: string;
    domains?: string[];
    address?: string;
    industry?: string;
    tags?: string[];
  };
};

export type LivePivotRecord = {
  id: string;
  root: string;
  status: LivePivotStatus;
  collector?: string;
  scenario?: string;
  seed_id?: string;
  seed_label?: string;
  seed_domains?: string[];
  recommendation_kind?: string;
  recommendation_reason?: string;
  recommendation_score?: number;
  recommendation_notes?: string[];
  candidate: {
    id?: string;
    company_name?: string;
    domains?: string[];
    address?: string;
    industry?: string;
    tags?: string[];
  };
  created_at: string;
  updated_at: string;
  decision_at?: string;
  decision_by_uid?: string;
  decision_by_email?: string;
};

export type LiveEventRecord = {
  id: string;
  kind: string;
  message: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

export type LiveAssetRow = Row;
export type LiveTrace = Trace;
export type LiveJudgeSummary = JudgeSummary;

export type CreateRunPayload = {
  mode: LiveRunMode;
  seeds: Array<{
    company_name?: string;
    domains?: string[];
    address?: string;
    industry?: string;
    tags?: string[];
  }>;
};
