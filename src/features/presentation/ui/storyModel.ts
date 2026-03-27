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
  | "trace-tree"
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
      "Browser client for live runs, pivot review, grouped judge analysis, trace context, and presentation surfaces.",
  },
  {
    surface: "backend",
    label: "Backend",
    shortLabel: "BE",
    name: "roaguirre/asset-discovery",
    href: "https://github.com/roaguirre/asset-discovery",
    license: "MIT License",
    copy:
      "Discovery engine for schedulers, collectors, enrichers, canonical assets, exports, and the DAG-oriented runtime model.",
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
    label: "Trace Summary",
    title: "Every important asset can carry its supporting context with it.",
    caption:
      "Contributors, sections, tree nodes, and related assets make the run answer why something belongs here.",
  },
  {
    key: "trace-tree",
    label: "Trace Tree",
    title: "The decision chain is a navigable tree of named, inspectable nodes.",
    caption:
      "Select any node to see the raw evidence, decision context, or enrichment record that justifies its place in the chain.",
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
    message: "Recorded 7 judge outcomes from web_hint_collector for exampleapp.io.",
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
    eyebrow: "Provenance",
    title: "Every asset traces back to the signal that first found it.",
    copy:
      "The trace summary surfaces the seed context, decision chain, and enrichment record that brought an asset into scope. No reconstruction from memory.",
    crop: "trace-explorer",
    side: "right",
  },
  {
    id: "trace-tree",
    eyebrow: "Decision Trail",
    title: "Walk the chain from asset to seed — one named node at a time.",
    copy:
      "The trace tree breaks the derivation into inspectable steps: canonical asset, accepted pivot, collector observation, and ownership evaluation. Selecting a node reveals the raw evidence behind that decision.",
    crop: "trace-tree",
    side: "left",
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
      "Certificate transparency (crt.sh), AlienVault OTX, Wayback archives",
      "Active DNS variant sweeps across common TLDs",
      "Web crawl, sitemap parsing, and security.txt extraction",
      "RDAP registration lookups and reverse registration via CT",
      "ASN/CIDR prefix enumeration with PTR reverse DNS pivots",
    ],
  },
  {
    title: "Trust Surfaces In Product",
    tone: "accent",
    items: [
      "LLM-gated ownership judgment on every cross-root candidate",
      "Pending pivot review with confidence score and stated reasoning",
      "Grouped judge analysis with accepted and discarded cases",
      "Ownership state, inclusion reason, and trace on every asset",
    ],
  },
  {
    title: "Operational Delivery",
    tone: "ink",
    items: [
      "Event-driven live run model with resume checkpoints",
      "Manual and autonomous execution modes",
      "Post-run reconsideration of discarded candidates",
      "JSON, CSV, and XLSX exports with full provenance",
    ],
  },
];

export type WalkthroughStep = {
  step: string;
  phase: string;
  title: string;
  copy: string;
  signals: string[];
};

export const walkthroughSteps: WalkthroughStep[] = [
  {
    step: "1",
    phase: "Scope definition",
    title: "Seed the investigation",
    copy: "Start with what you know — a company name and confirmed domains. These become the first frontier wave; the system discovers everything else and attributes it back to this starting point.",
    signals: ["company name", "known domains", "4 seeds"],
  },
  {
    step: "2",
    phase: "Signal collection",
    title: "Fan out across passive archives and active signals",
    copy: "Collectors run in parallel: certificate transparency logs, passive DNS archives, DNS variant sweeps across common TLDs, RDAP registration data, web crawling, sitemap parsing, and PTR reverse DNS from network ranges. Every cross-root result is judge-gated before it becomes a seed.",
    signals: ["crt.sh", "AlienVault OTX", "DNS sweep", "RDAP", "ASN / CIDR", "web crawl"],
  },
  {
    step: "3",
    phase: "LLM-gated pivot review",
    title: "Decide which roots to follow",
    copy: "An LLM evaluates each cross-root expansion candidate against the seed's company name, known domains, and industry context. Ownership confidence, decision kind, and stated reasoning are explicit before you commit. Ambiguous cases surface for human review.",
    signals: ["LLM judge", "confidence 0.94", "brand overlap", "accept / reject"],
  },
  {
    step: "4",
    phase: "Frontier expansion",
    title: "Accepted pivots seed the next wave",
    copy: "Each accepted pivot returns to the scheduler as a new frontier seed. The scheduler dispatches a follow-up wave — up to two discovered frontiers beyond the initial seeds — without ever letting a collector recurse into what it already proposed.",
    signals: ["new frontier seed", "wave N+1", "acyclic DAG"],
  },
  {
    step: "5",
    phase: "Provenance and delivery",
    title: "Trace every asset and export with attribution",
    copy: "The trace view connects each asset to its origin signal, collector, judge outcome, and review decision. Export with full lineage intact — recipients can inspect the reasoning themselves.",
    signals: ["origin trace", "ownership state", "JSON", "CSV", "XLSX"],
  },
];

export const architectureCollectors = [
  { label: "crt.sh", desc: "Cert transparency" },
  { label: "DNS sweep", desc: "Variants + records" },
  { label: "Web crawl", desc: "Pages + cross-root links" },
  { label: "RDAP", desc: "Registrar + ownership" },
  { label: "ASN / CIDR", desc: "Network prefixes + PTR" },
  { label: "AlienVault OTX", desc: "Passive DNS history" },
  { label: "Wayback", desc: "Historical captures" },
  { label: "Sitemaps", desc: "robots.txt + sitemap XML" },
  { label: "Rev. registration", desc: "CT + RDAP overlap" },
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
    root: "exampleapp.io",
    status: "pending_review",
    collector: "web_hint_collector",
    scenario: "cross_root_domain",
    seed_id: "seed-primary",
    seed_label: "Example App",
    seed_domains: ["example-app.com"],
    recommendation_kind: "brand_overlap",
    recommendation_reason:
      "Exact brand name in the registrable domain, linked from product navigation and footer on the primary seed site. Registration data aligns with the same company identity.",
    recommendation_score: 0.94,
    recommendation_notes: [
      "Footer links on example-app.com resolve to exampleapp.io",
      "Same product vocabulary and navigation structure",
    ],
    candidate: {
      id: "candidate-portal",
      company_name: "Example App",
      domains: ["exampleapp.io"],
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
          root: "exampleapp.io",
          confidence: 0.94,
          kind: "brand_overlap",
          reason:
            "Exact brand name in the registrable domain. Footer links on example-app.com resolve here, and product navigation is structurally identical.",
          explicit: true,
          support: [
            "Footer links on example-app.com point to exampleapp.io",
            "Product language and navigation structure match the seed site",
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
  identifier: "exampleapp.io",
  asset_type: "domain",
  domain_kind: "apex",
  registrable_domain: "exampleapp.io",
  resolution_status: "active",
  ownership_state: "owned",
  inclusion_reason: "Accepted cross-root pivot from web hint collector. Brand name match confirmed by footer links and registration data.",
  source: "web_hint_collector",
  discovered_by: "web_hint_collector",
  enriched_by: "dns_enricher",
  enumeration_id: "enum-portal",
  seed_id: "seed-primary",
  status: "running",
  discovery_date: "2026-03-25T13:18:00Z",
  details:
    "Discovered via footer links from example-app.com pointing to a different registrable domain. Brand name match and registration data confirm first-party ownership.",
  evidence_groups: [
    {
      title: "Ownership Evidence",
      items: [
        "Footer links on example-app.com resolve to exampleapp.io",
        "Identical product vocabulary and navigation structure",
      ],
    },
  ],
};

export const storyTrace: LiveTrace = {
  asset_id: "asset-portal",
  identifier: "exampleapp.io",
  asset_type: "domain",
  domain_kind: "apex",
  registrable_domain: "exampleapp.io",
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
      label: "exampleapp.io",
      subtitle: "domain",
      badges: ["owned"],
      linked_asset_id: "asset-portal",
      details: [
        {
          title: "Result",
          items: [
            "Asset type: domain",
            "Domain kind: apex",
            "Registrable domain: exampleapp.io",
            "Discovered by: web_hint_collector",
            "Enriched by: dns_enricher",
            "DNS resolution: active",
          ],
        },
      ],
    },
    {
      id: "trace-obs-group",
      parent_id: "trace-asset-root",
      kind: "group",
      label: "Observations",
      subtitle: "2 supporting observations",
    },
    {
      id: "trace-web-hint",
      parent_id: "trace-obs-group",
      kind: "observation",
      label: "web_hint_collector",
      subtitle: "exampleapp.io",
      badges: ["discovery"],
      details: [
        {
          title: "Signal",
          items: [
            "Footer links on example-app.com resolve to exampleapp.io",
            "Product navigation structure matches the seed site",
          ],
        },
      ],
    },
    {
      id: "trace-dns-obs",
      parent_id: "trace-obs-group",
      kind: "observation",
      label: "dns_enricher",
      subtitle: "exampleapp.io",
      badges: ["enrichment"],
      details: [
        {
          title: "DNS Result",
          items: [
            "DNS resolution: active",
            "Resolution aligned with first-party hosting patterns",
          ],
        },
      ],
    },
    {
      id: "trace-seed-group",
      parent_id: "trace-asset-root",
      kind: "group",
      label: "Seed Context",
      subtitle: "1 contributing seed",
    },
    {
      id: "trace-seed",
      parent_id: "trace-seed-group",
      kind: "seed",
      label: "Example App",
      subtitle: "seed-primary",
      badges: ["example-app.com"],
      details: [
        {
          title: "Seed Context",
          items: [
            "Company: Example App",
            "Seed domains: example-app.com",
          ],
        },
      ],
    },
    {
      id: "trace-enrichment-group",
      parent_id: "trace-asset-root",
      kind: "group",
      label: "Enrichment",
      subtitle: "Runtime enrichment results",
    },
    {
      id: "trace-dns-enricher",
      parent_id: "trace-enrichment-group",
      kind: "enrichment",
      label: "dns_enricher",
      subtitle: "exampleapp.io",
      details: [
        {
          title: "Enrichment",
          items: [
            "Status: completed",
            "DNS resolution: active",
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
        "exampleapp.io was surfaced via a footer link during web hint collection — a different registrable domain from the seed.",
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
        "Trace lineage confirmed the cross-root relationship back to example-app.com.",
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
