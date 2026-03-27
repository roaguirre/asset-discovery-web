import type {
  LiveAssetRow,
  LiveEventRecord,
  LiveJudgeSummary,
  LivePivotRecord,
  LiveRunRecord,
  LiveTrace,
} from "../../discovery/core/types";

export type StoryCropKey =
  | "run-overview"
  | "pivot-review"
  | "judge-analysis"
  | "trace-explorer"
  | "activity-feed";

export type StoryCrop = {
  key: StoryCropKey;
  label: string;
  title: string;
  caption: string;
};

export type ObservationBlock = {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  crop: StoryCropKey;
  side: "left" | "right";
};

export type CapabilityGroup = {
  title: string;
  items: string[];
  tone: "paper" | "accent" | "ink";
};

export type StoryRepository = {
  surface: "frontend" | "backend";
  label: string;
  shortLabel: string;
  name: string;
  href: string;
  license: string;
  copy: string;
};

export const storyRepositories: StoryRepository[] = [
  {
    surface: "frontend",
    label: "Frontend",
    shortLabel: "FE",
    name: "roaguirre/asset-discovery-web",
    href: "https://github.com/roaguirre/asset-discovery-web",
    license: "MIT License",
    copy:
      "React and Firebase workspace for live runs, pivot review, grouped judge analysis, trace context, and presentation surfaces.",
  },
  {
    surface: "backend",
    label: "Backend",
    shortLabel: "BE",
    name: "roaguirre/asset-discovery",
    href: "https://github.com/roaguirre/asset-discovery",
    license: "MIT License",
    copy:
      "Go discovery engine for schedulers, collectors, enrichers, canonical assets, exports, and the DAG-oriented runtime model.",
  },
];

export const storyProblemPoints = [
  {
    title: "Coverage expands faster than confidence.",
    copy:
      "Broader discovery usually surfaces more ambiguous candidates before it surfaces more clarity.",
  },
  {
    title: "Heuristics hide the hard decisions.",
    copy:
      "When weak candidates are promoted implicitly, the team inherits risk without seeing the tradeoff.",
  },
  {
    title: "Evidence gets scattered across tools.",
    copy:
      "Pivots, assets, trace context, and audit history lose force when they live in separate places.",
  },
];

export const storyCrops: StoryCrop[] = [
  {
    key: "run-overview",
    label: "Run Overview",
    title: "Coverage, judgment, and exports stay in one run summary.",
    caption:
      "The run surface exposes waves, assets, judge totals, and export state without leaving the workspace.",
  },
  {
    key: "pivot-review",
    label: "Pivot Review",
    title: "Ambiguous expansion points show up as explicit review decisions.",
    caption:
      "The system recommends strongly, but still asks for a structured decision instead of applying quiet heuristics.",
  },
  {
    key: "judge-analysis",
    label: "Judge Analysis",
    title: "Accepted and discarded candidates remain inspectable together.",
    caption:
      "Trust improves when the product shows the losing cases, support, and confidence, not only the survivors.",
  },
  {
    key: "trace-explorer",
    label: "Trace Explorer",
    title: "Every important asset can carry its supporting context with it.",
    caption:
      "Contributors, sections, tree nodes, and related assets make the run answer why something belongs here.",
  },
  {
    key: "activity-feed",
    label: "Activity Feed",
    title: "Every run step is observable as it happens.",
    caption:
      "Checkpoint events, collection signals, and enrichment results stream in real time so observers stay in sync without waiting for completion.",
  },
];

export const storyEvents: LiveEventRecord[] = [
  {
    id: "evt-1",
    kind: "run_started",
    message: "Run run-demo-2026-03-25 started with 4 seeds.",
    created_at: "2026-03-25T13:01:10Z",
  },
  {
    id: "evt-2",
    kind: "checkpoint",
    message: "Reached after_collection_wave at wave 0.",
    created_at: "2026-03-25T13:03:22Z",
  },
  {
    id: "evt-3",
    kind: "observation_added",
    message: "Recorded 3 observations from crt.sh for example-app.com.",
    created_at: "2026-03-25T13:04:18Z",
  },
  {
    id: "evt-4",
    kind: "observation_added",
    message: "Recorded 1 observation from rdap_collector for example-app.com.",
    created_at: "2026-03-25T13:04:21Z",
  },
  {
    id: "evt-5",
    kind: "checkpoint",
    message: "Reached after_reconsideration at wave 0.",
    created_at: "2026-03-25T13:07:45Z",
  },
  {
    id: "evt-6",
    kind: "checkpoint",
    message: "Reached after_collection_wave at wave 1.",
    created_at: "2026-03-25T13:11:30Z",
  },
  {
    id: "evt-7",
    kind: "observation_added",
    message: "Recorded 7 judge outcomes from dns_collector for portal.example-app.com.",
    created_at: "2026-03-25T13:14:02Z",
  },
  {
    id: "evt-8",
    kind: "artifacts_published",
    message: "Published result artifacts for run run-demo-2026-03-25.",
    created_at: "2026-03-25T13:22:00Z",
  },
  {
    id: "evt-9",
    kind: "run_completed",
    message: "Run run-demo-2026-03-25 completed with 29 asset(s).",
    created_at: "2026-03-25T13:22:05Z",
  },
];

export const storyObservationBlocks: ObservationBlock[] = [
  {
    id: "pivot-review",
    eyebrow: "Review Surface",
    title: "Ambiguous expansion stops being silent.",
    copy:
      "Instead of silently widening scope, the system turns uncertain pivots into an explicit review workflow with evidence, context, and a clear decision boundary.",
    crop: "pivot-review",
    side: "right",
  },
  {
    id: "judge-analysis",
    eyebrow: "Judge Analysis",
    title: "Discarded candidates stay part of the evidence.",
    copy:
      "The product keeps accepted and discarded cases in the same frame, which makes automated judgment easier to inspect and harder to oversell.",
    crop: "judge-analysis",
    side: "left",
  },
  {
    id: "trace-explorer",
    eyebrow: "Trace Context",
    title: "Why an asset exists can be answered inside the product.",
    copy:
      "Analysts do not have to reconstruct provenance from memory. The trace view keeps the decision chain, supporting evidence, and adjacent assets connected to the record.",
    crop: "trace-explorer",
    side: "right",
  },
  {
    id: "activity-feed",
    eyebrow: "Live Execution",
    title: "Every run step is observable as it happens.",
    copy:
      "The activity feed streams checkpoint events, collection signals, and enrichment results in real time, keeping observers in sync with the run without waiting for completion.",
    crop: "activity-feed",
    side: "left",
  },
];

export const storyCapabilityGroups: CapabilityGroup[] = [
  {
    title: "Collection Signals In Scope",
    tone: "paper",
    items: [
      "crt.sh and RDAP registration signals",
      "Web hints, sitemaps, and crawler output",
      "ASN/CIDR and PTR frontier expansion",
      "Wayback and AlienVault passive history",
    ],
  },
  {
    title: "Trust Surfaces In Product",
    tone: "accent",
    items: [
      "Pending pivot review with audit state",
      "Grouped judge analysis with losing cases",
      "Ownership state and inclusion reason on assets",
      "Trace explorer for provenance and relations",
    ],
  },
  {
    title: "Operational Delivery",
    tone: "ink",
    items: [
      "Firebase-backed live run model",
      "Manual and autonomous execution modes",
      "JSON, CSV, and XLSX exports",
      "DAG visualization for technical review",
    ],
  },
];

export const walkthroughSteps = [
  {
    step: "1",
    title: "Start from a compact seed set",
    copy:
      "Use a company name and a small domain list so the expansion path stays visible instead of disappearing into a large seed file.",
  },
  {
    step: "2",
    title: "Run manual mode first",
    copy:
      "Manual mode demonstrates that AI recommendations can be strong without removing human control from the workflow.",
  },
  {
    step: "3",
    title: "Read the run before the details",
    copy:
      "Stop at waves, seeds, assets, judge totals, pending pivots, and exports to show the shape of the work clearly.",
  },
  {
    step: "4",
    title: "Inspect recommendation quality",
    copy:
      "Open pivots and judge analysis to show why one candidate deserves follow-up while another one gets discarded.",
  },
  {
    step: "5",
    title: "Move from asset rows to explanations",
    copy:
      "Browse the asset set, then open the trace to answer why a row belongs in the run without leaving the product.",
  },
];

export const architecturePoints = [
  {
    title: "Scheduler-owned frontier expansion",
    copy:
      "Collectors and enrichers hand newly discovered seeds back to the engine instead of recursing into themselves.",
  },
  {
    title: "Canonical assets plus raw provenance",
    copy:
      "Repeated sightings add evidence and relations without duplicating the canonical runtime asset set.",
  },
  {
    title: "Bounded reconsideration",
    copy:
      "Discarded judge candidates can be revisited once with fuller context, which keeps the run ambitious without losing control.",
  },
];

export const storyRun: LiveRunRecord = {
  id: "run-demo-2026-03-25",
  owner_uid: "uid-demo",
  owner_email: "roaguirred@gmail.com",
  mode: "manual",
  status: "awaiting_review",
  current_wave: 3,
  seed_count: 4,
  enumeration_count: 12,
  asset_count: 29,
  pending_pivot_count: 2,
  judge_evaluation_count: 7,
  judge_accepted_count: 3,
  judge_discarded_count: 4,
  downloads: {
    json: "runs/run-demo-2026-03-25/export.json",
    csv: "runs/run-demo-2026-03-25/export.csv",
    xlsx: "runs/run-demo-2026-03-25/export.xlsx",
  },
  created_at: "2026-03-25T13:00:00Z",
  updated_at: "2026-03-25T13:22:00Z",
  started_at: "2026-03-25T13:01:10Z",
};

export const storyPendingPivots: LivePivotRecord[] = [
  {
    id: "pivot-portal",
    root: "portal.example-app.com",
    status: "pending_review",
    collector: "web_hint_collector",
    scenario: "cross_root_domain",
    seed_id: "seed-primary",
    seed_label: "Example App",
    seed_domains: ["example-app.com"],
    recommendation_kind: "brand_overlap",
    recommendation_reason:
      "Brand overlap, linked login references, and matching footer copy make this follow-up root a strong candidate.",
    recommendation_score: 0.94,
    recommendation_notes: [
      "Shared product language on the public site",
      "Login links from the main seed domain",
    ],
    candidate: {
      id: "candidate-portal",
      company_name: "Example App",
      domains: ["portal.example-app.com"],
      industry: "B2B SaaS",
    },
    created_at: "2026-03-25T13:12:00Z",
    updated_at: "2026-03-25T13:18:00Z",
  },
  {
    id: "pivot-careers",
    root: "careers.example-app.com",
    status: "pending_review",
    collector: "sitemap_collector",
    scenario: "subdomain_follow_up",
    seed_id: "seed-primary",
    seed_label: "Example App",
    seed_domains: ["example-app.com"],
    recommendation_kind: "first_party_content",
    recommendation_reason:
      "Sitemap references, repeated brand identity, and shared navigation suggest a first-party careers surface worth collecting.",
    recommendation_score: 0.88,
    recommendation_notes: ["Shared registrable domain", "Repeated navigation and policy links"],
    candidate: {
      id: "candidate-careers",
      company_name: "Example App",
      domains: ["careers.example-app.com"],
      industry: "B2B SaaS",
    },
    created_at: "2026-03-25T13:15:00Z",
    updated_at: "2026-03-25T13:20:00Z",
  },
];

export const storyAuditPivots: LivePivotRecord[] = [
  {
    id: "pivot-status",
    root: "status.example-app.net",
    status: "rejected",
    collector: "registration_collector",
    scenario: "cross_root_domain",
    seed_id: "seed-primary",
    seed_label: "Example App",
    seed_domains: ["example-app.com"],
    recommendation_kind: "registration_overlap",
    recommendation_reason:
      "Registration overlap exists, but the public content and legal pages do not support first-party ownership strongly enough.",
    recommendation_score: 0.41,
    recommendation_notes: ["Shared registrar only", "No strong site copy overlap"],
    candidate: {
      id: "candidate-status",
      company_name: "Example App",
      domains: ["status.example-app.net"],
      industry: "B2B SaaS",
    },
    created_at: "2026-03-25T13:08:00Z",
    updated_at: "2026-03-25T13:17:00Z",
    decision_at: "2026-03-25T13:17:00Z",
    decision_by_uid: "uid-demo",
    decision_by_email: "roaguirred@gmail.com",
  },
];

export const storyJudgeSummary: LiveJudgeSummary = {
  evaluation_count: 7,
  accepted_count: 3,
  discarded_count: 4,
  groups: [
    {
      collector: "web_hint_collector",
      seed_id: "seed-primary",
      seed_label: "Example App",
      seed_domains: ["example-app.com"],
      scenario: "cross_root_domain",
      accepted: [
        {
          root: "portal.example-app.com",
          confidence: 0.94,
          kind: "brand_overlap",
          reason:
            "Login references, repeated navigation copy, and policy linkage make this an explicit first-party follow-up candidate.",
          explicit: true,
          support: [
            "Footer and legal links resolve back to example-app.com",
            "Product language matches the main seed site",
          ],
        },
      ],
      discarded: [
        {
          root: "status.example-app.net",
          confidence: 0.41,
          kind: "registration_overlap",
          reason:
            "Registration similarity alone is not enough to justify first-party scope expansion here.",
          explicit: true,
          support: [
            "Registrar overlap without strong site copy support",
            "No clear first-party policy or navigation evidence",
          ],
        },
        {
          root: "example-app-support.co",
          confidence: 0.33,
          kind: "brand_reference",
          reason:
            "Brand mentions exist, but the domain structure and ownership evidence remain too weak.",
          explicit: false,
          support: ["Third-party hosting footprint", "No first-party footer or ownership copy"],
        },
      ],
    },
  ],
};

export const storyTraceAsset: LiveAssetRow = {
  asset_id: "asset-portal",
  identifier: "portal.example-app.com",
  asset_type: "domain",
  domain_kind: "subdomain",
  registrable_domain: "example-app.com",
  resolution_status: "active",
  ownership_state: "owned",
  inclusion_reason: "Accepted pivot from web hint collector after manual review.",
  source: "web_hint_collector",
  discovered_by: "web_hint_collector",
  enriched_by: "dns_enricher",
  enumeration_id: "enum-portal",
  seed_id: "seed-primary",
  status: "running",
  discovery_date: "2026-03-25T13:18:00Z",
  details:
    "Observed on product navigation and linked login surfaces. DNS and web context support first-party ownership.",
  evidence_groups: [
    {
      title: "Ownership Evidence",
      items: [
        "Footer and legal links resolve to example-app.com",
        "Shared product copy across portal and primary domain",
      ],
    },
  ],
};

export const storyTrace: LiveTrace = {
  asset_id: "asset-portal",
  identifier: "portal.example-app.com",
  asset_type: "domain",
  domain_kind: "subdomain",
  registrable_domain: "example-app.com",
  resolution_status: "active",
  source: "web_hint_collector",
  discovered_by: "web_hint_collector",
  enriched_by: "dns_enricher",
  enumeration_id: "enum-portal",
  seed_id: "seed-primary",
  root_node_id: "trace-asset-root",
  contributors: [
    {
      seed_id: "seed-primary",
      seed_label: "Example App",
      enumeration_id: "enum-portal",
      source: "web_hint_collector",
      discovery_date: "2026-03-25T13:18:00Z",
    },
    {
      asset_id: "asset-example-app",
      enumeration_id: "enum-seed",
      source: "dns_collector",
      discovery_date: "2026-03-25T13:03:00Z",
    },
  ],
  nodes: [
    {
      id: "trace-asset-root",
      kind: "asset",
      label: "portal.example-app.com",
      subtitle: "Canonical asset",
      badges: ["Owned", "Domain"],
      linked_asset_id: "asset-portal",
      details: [
        {
          title: "Identity",
          items: [
            "Registrable domain: example-app.com",
            "Status: active",
          ],
        },
      ],
    },
    {
      id: "trace-pivot",
      parent_id: "trace-asset-root",
      kind: "relation",
      label: "Accepted pivot",
      subtitle: "Manual review decision",
      badges: ["Review"],
      linked_relation_id: "relation-pivot-portal",
      details: [
        {
          title: "Decision",
          items: [
            "Manual acceptance on 2026-03-25",
            "Decision based on brand overlap and linked login flows",
          ],
        },
      ],
    },
    {
      id: "trace-web-hint",
      parent_id: "trace-pivot",
      kind: "observation",
      label: "Web hint evidence",
      subtitle: "Homepage and footer references",
      badges: ["Collector"],
      linked_observation_id: "observation-web-hint",
      details: [
        {
          title: "Observed Signals",
          items: [
            "Primary navigation linked to portal.example-app.com/login",
            "Footer legal and privacy links matched the seed domain",
          ],
        },
      ],
    },
    {
      id: "trace-ownership",
      parent_id: "trace-pivot",
      kind: "evaluation",
      label: "Ownership reasoning",
      subtitle: "Why the asset stayed in scope",
      badges: ["Judge"],
      details: [
        {
          title: "Supporting Context",
          items: [
            "Shared product vocabulary across seed and portal",
            "DNS enrichment aligned with first-party hosting patterns",
            "No conflicting third-party brand or hosting evidence",
          ],
        },
      ],
    },
  ],
  sections: [
    {
      title: "Seed Context",
      items: [
        "The run started from Example App and example-app.com.",
        "The portal root was discovered during follow-up web collection.",
      ],
    },
    {
      title: "Decision Chain",
      items: [
        "Web hint collector proposed the root as a follow-up pivot.",
        "Manual review accepted the pivot after evidence was inspected.",
      ],
    },
    {
      title: "Enrichment",
      items: [
        "DNS enrichment resolved the asset as active.",
        "Trace lineage linked the portal back to the seed domain.",
      ],
    },
  ],
  related: [
    {
      asset_id: "asset-api",
      identifier: "api.example-app.com",
      label: "Shared registrable domain",
      description: "Collected during the same follow-up wave.",
    },
    {
      asset_id: "asset-login",
      identifier: "login.example-app.com",
      label: "Linked login surface",
      description: "Referenced in the same navigation and auth flow.",
    },
  ],
};
