export type Downloads = {
  json?: string;
  csv?: string;
  xlsx?: string;
};

export type EvidenceGroup = {
  title: string;
  items?: string[];
};

export type Row = {
  asset_id: string;
  identifier: string;
  asset_type: string;
  domain_kind?: string;
  registrable_domain?: string;
  resolution_status?: string;
  ownership_state?: string;
  inclusion_reason?: string;
  asn?: number;
  organization?: string;
  ptr?: string;
  source: string;
  discovered_by?: string;
  enriched_by?: string;
  enumeration_id: string;
  seed_id: string;
  status: string;
  discovery_date?: string;
  details?: string;
  evidence_groups?: EvidenceGroup[];
  trace_path?: string;
};

export type TraceSection = {
  title: string;
  items?: string[];
};

export type TraceLink = {
  asset_id: string;
  identifier: string;
  label: string;
  description?: string;
  trace_path?: string;
};

export type TraceContributor = {
  asset_id?: string;
  enumeration_id?: string;
  seed_id?: string;
  seed_label?: string;
  source?: string;
  discovery_date?: string;
};

export type TraceNode = {
  id: string;
  parent_id?: string;
  kind?: string;
  label: string;
  subtitle?: string;
  badges?: string[];
  linked_asset_id?: string;
  linked_observation_id?: string;
  linked_relation_id?: string;
  details?: TraceSection[];
};

export type Trace = {
  asset_id: string;
  identifier: string;
  asset_type: string;
  source: string;
  discovered_by?: string;
  enriched_by?: string;
  enumeration_id: string;
  seed_id: string;
  domain_kind?: string;
  registrable_domain?: string;
  resolution_status?: string;
  contributors?: TraceContributor[];
  root_node_id?: string;
  nodes?: TraceNode[];
  sections?: TraceSection[];
  related?: TraceLink[];
};

export type JudgeCandidate = {
  root: string;
  confidence?: number;
  kind?: string;
  reason?: string;
  explicit?: boolean;
  support?: string[];
};

export type JudgeGroup = {
  collector: string;
  seed_id?: string;
  seed_label?: string;
  seed_domains?: string[];
  scenario?: string;
  accepted?: JudgeCandidate[];
  discarded?: JudgeCandidate[];
};

export type JudgeSummary = {
  evaluation_count: number;
  accepted_count: number;
  discarded_count: number;
  groups?: JudgeGroup[];
};

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
  }>;
};
