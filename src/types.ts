export type Downloads = {
  json?: string
  csv?: string
  xlsx?: string
}

export type EvidenceGroup = {
  title: string
  items?: string[]
}

export type RunSummary = {
  id: string
  label: string
  created_at: string
  asset_count: number
  enumeration_count: number
  seed_count: number
  data_path: string
  downloads?: Downloads
}

export type Manifest = {
  runs: RunSummary[]
}

export type Row = {
  asset_id: string
  identifier: string
  asset_type: string
  domain_kind?: string
  registrable_domain?: string
  resolution_status?: string
  ownership_state?: string
  inclusion_reason?: string
  asn?: number
  organization?: string
  ptr?: string
  source: string
  discovered_by?: string
  enriched_by?: string
  enumeration_id: string
  seed_id: string
  status: string
  discovery_date?: string
  details?: string
  evidence_groups?: EvidenceGroup[]
  trace_path?: string
}

export type TraceSection = {
  title: string
  items?: string[]
}

export type TraceLink = {
  asset_id: string
  identifier: string
  label: string
  description?: string
  trace_path?: string
}

export type TraceContributor = {
  asset_id?: string
  enumeration_id?: string
  seed_id?: string
  seed_label?: string
  source?: string
  discovery_date?: string
}

export type TraceNode = {
  id: string
  parent_id?: string
  kind?: string
  label: string
  subtitle?: string
  badges?: string[]
  linked_asset_id?: string
  linked_observation_id?: string
  linked_relation_id?: string
  details?: TraceSection[]
}

export type Trace = {
  asset_id: string
  identifier: string
  asset_type: string
  source: string
  discovered_by?: string
  enriched_by?: string
  enumeration_id: string
  seed_id: string
  domain_kind?: string
  registrable_domain?: string
  resolution_status?: string
  contributors?: TraceContributor[]
  root_node_id?: string
  nodes?: TraceNode[]
  sections?: TraceSection[]
  related?: TraceLink[]
}

export type JudgeCandidate = {
  root: string
  confidence?: number
  kind?: string
  reason?: string
  explicit?: boolean
  support?: string[]
}

export type JudgeGroup = {
  collector: string
  seed_id?: string
  seed_label?: string
  seed_domains?: string[]
  scenario?: string
  accepted?: JudgeCandidate[]
  discarded?: JudgeCandidate[]
}

export type JudgeSummary = {
  evaluation_count: number
  accepted_count: number
  discarded_count: number
  groups?: JudgeGroup[]
}

export type Run = RunSummary & {
  rows: Row[]
  traces?: Trace[]
  judge_summary?: JudgeSummary
}

export type View = 'domains' | 'ips' | 'judge' | 'trace'

export type RouteState = {
  view: View
  runId: string
  assetId: string
}
