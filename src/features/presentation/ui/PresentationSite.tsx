import { SurfaceTopbar } from "../../../app/SurfaceTopbar";
import "./PresentationSite.css";

type PresentationSiteProps = {
  authHydrated: boolean;
  sessionActive: boolean;
  onOpenWorkspace: () => void;
  onSignInToWorkspace: () => void;
};

type StoryRepository = {
  surface: "frontend" | "backend";
  label: string;
  shortLabel: string;
  name: string;
  href: string;
  license: string;
  copy: string;
};

const storyRepositories: StoryRepository[] = [
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

const promiseCards = [
  {
    eyebrow: "Judgment",
    title: "AI decides when pivots deserve attention, not blind promotion.",
    copy:
      "Cross-root candidates from web hints, sitemaps, crawler output, registration overlap, ASN/CIDR pivots, and PTR evidence are judged explicitly instead of silently merged into scope.",
  },
  {
    eyebrow: "Coverage",
    title: "Frontier expansion grows the run without turning the DAG into a loop.",
    copy:
      "Newly discovered seeds open later follow-up waves, and discarded candidates can be reconsidered once with the full run context gathered so far.",
  },
  {
    eyebrow: "Trust",
    title: "Every important outcome stays explainable inside the product.",
    copy:
      "Ownership state, inclusion reason, pivot rationale, grouped judge analysis, and trace context make the dataset defensible to humans who need to trust it.",
  },
];

const problemCards = [
  {
    title: "Coverage expands faster than confidence.",
    copy:
      "Adding more pivots usually finds more assets, but it also increases ambiguity and review burden.",
  },
  {
    title: "Heuristics hide the hard decisions.",
    copy:
      "When a system silently promotes weak candidates, the team inherits risk without understanding the reasoning.",
  },
  {
    title: "Investigation flow fragments across tools.",
    copy:
      "Without pivots, assets, trace context, and audit in one place, comprehensiveness becomes difficult to defend.",
  },
];

const walkthroughSteps = [
  {
    step: "1",
    title: "Plant a compact seed set",
    copy:
      "Start from a company name and a small domain list. The demo is deliberately seeded narrowly so expansion becomes visible and explainable.",
  },
  {
    step: "2",
    title: "Run in manual mode first",
    copy:
      "Manual mode shows that AI recommendations do not remove human control. Pivots pause in review until the creator accepts or rejects them.",
  },
  {
    step: "3",
    title: "Inspect run metrics that matter",
    copy:
      "Wave count, seeds, assets, judge accepted and discarded counts, pending pivots, and exports make progress legible at a glance.",
  },
  {
    step: "4",
    title: "Review pivots and grouped judge outcomes",
    copy:
      "The product shows recommendation reason, score, confidence, support, and what the judge explicitly discarded, not only what it promoted.",
  },
  {
    step: "5",
    title: "Browse the asset set without losing context",
    copy:
      "Grouped domains, ownership state, inclusion reason, sources, and filters keep comprehensiveness useful instead of overwhelming.",
  },
  {
    step: "6",
    title: "Answer why an asset exists",
    copy:
      "Trace explorer carries contributors, relations, enrichment, and related assets into one view so the run can justify itself.",
  },
];

const signalCards = [
  {
    title: "Collectors already in the demo",
    items: [
      "crt.sh and RDAP for public registration signals",
      "DNS, web hints, sitemaps, and crawler output for web-root discovery",
      "ASN/CIDR and PTR pivots for network expansion",
      "Wayback and AlienVault for passive historical coverage",
    ],
  },
  {
    title: "Trust surfaces already in the UI",
    items: [
      "Pending pivot review and audit history",
      "Grouped judge analysis with accepted and discarded candidates",
      "Ownership state and inclusion reason on asset rows",
      "Dedicated trace explorer for provenance and relations",
    ],
  },
  {
    title: "Delivery surfaces already available",
    items: [
      "Firebase-backed live run model",
      "JSON, CSV, and XLSX exports",
      "Manual and autonomous execution modes",
      "A scheduler visualization for technical discussion",
    ],
  },
];

const architecturePoints = [
  {
    title: "Scheduler-owned frontier expansion",
    copy:
      "Collectors and enrichers never recurse into themselves. They hand new seeds back to the engine, which decides whether another wave should run.",
  },
  {
    title: "Canonical assets plus raw provenance",
    copy:
      "Assets, observations, and relations are modeled separately so repeated sightings add evidence without creating duplicate rows.",
  },
  {
    title: "Bounded reconsideration",
    copy:
      "Once the normal frontier is exhausted, discarded judge candidates can be reconsidered once with the full run context, keeping the process ambitious but controlled.",
  },
];

/**
 * GitHubMarkIcon keeps repository links visually consistent across the story
 * surface without depending on a third-party icon package.
 */
function GitHubMarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 1.25A10.75 10.75 0 0 0 1.25 12c0 4.6 2.9 8.52 6.97 10.02.56.1.76-.24.76-.54l-.01-1.9c-2.84.62-3.44-1.21-3.44-1.21-.46-1.19-1.14-1.5-1.14-1.5-.93-.64.07-.62.07-.62 1.03.07 1.57 1.06 1.57 1.06.92 1.56 2.4 1.11 2.98.85.09-.66.36-1.11.65-1.36-2.27-.26-4.66-1.14-4.66-5.06 0-1.12.4-2.04 1.05-2.76-.1-.27-.45-1.32.1-2.76 0 0 .86-.28 2.82 1.05a9.82 9.82 0 0 1 5.14 0c1.96-1.33 2.82-1.05 2.82-1.05.55 1.44.2 2.49.1 2.76.66.72 1.05 1.64 1.05 2.76 0 3.93-2.4 4.8-4.69 5.05.37.32.7.94.7 1.9l-.01 2.82c0 .3.2.65.77.54A10.76 10.76 0 0 0 22.75 12 10.75 10.75 0 0 0 12 1.25Z"
      />
    </svg>
  );
}

/**
 * PresentationSite is the public story-first landing surface for the demo. It
 * frames the live workspace as a product proposal before the audience enters the
 * signed-in console.
 */
export function PresentationSite({
  authHydrated,
  sessionActive,
  onOpenWorkspace,
  onSignInToWorkspace,
}: PresentationSiteProps) {
  const primaryActionLabel = sessionActive
    ? "Open Live Workspace"
    : "Sign In For Live Demo";
  const primaryAction = sessionActive ? onOpenWorkspace : onSignInToWorkspace;
  const sessionLabel = !authHydrated
    ? "Checking demo session"
    : sessionActive
      ? "Authenticated demo session available"
      : "Public story mode";

  return (
    <main className="story-shell" id="top">
      <div className="story-orbit story-orbit-one" aria-hidden="true" />
      <div className="story-orbit story-orbit-two" aria-hidden="true" />

      <SurfaceTopbar
        className="story-topbar"
        start={
          <div className="story-brand-lockup">
            <p className="eyebrow">Asset Discovery</p>
            <strong className="story-brand">
              AI-guided discovery with visible reasoning.
            </strong>
          </div>
        }
        middle={
          <nav className="story-nav" aria-label="Presentation sections">
            <a href="#promise">Promise</a>
            <a href="#walkthrough">Walkthrough</a>
            <a href="#architecture">Architecture</a>
            <a href="#open-source">Open Source</a>
          </nav>
        }
        end={
          <div className="story-actions">
            <div className="story-repo-links" aria-label="Source repositories">
              {storyRepositories.map((repository) => (
                <a
                  key={repository.name}
                  className="story-repo-link"
                  href={repository.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${repository.label.toLowerCase()} repository on GitHub`}
                  title={repository.name}
                >
                  <GitHubMarkIcon />
                  <span className="story-repo-link-label">
                    {repository.shortLabel}
                  </span>
                </a>
              ))}
            </div>
            <span className="story-status">{sessionLabel}</span>
            <button
              type="button"
              className="hero-button compact"
              onClick={primaryAction}
            >
              {primaryActionLabel}
            </button>
          </div>
        }
      />

      <section className="story-hero">
        <div className="story-hero-copy">
          <p className="eyebrow">Demo Narrative</p>
          <h1>Asset discovery should expand coverage without asking the team to trust a black box.</h1>
          <p className="story-summary">
            This demo combines compact seed input, AI-judged pivots, scheduler-managed
            frontier expansion, and traceable outcomes in one product surface. The
            goal is not to find more assets at any cost. The goal is to make broader
            discovery easier to trust, discuss, and operationalize.
          </p>
          <div className="story-hero-actions">
            <button
              type="button"
              className="hero-button"
              onClick={primaryAction}
            >
              {primaryActionLabel}
            </button>
            <a className="ghost-button" href="#walkthrough">
              See The Demo Flow
            </a>
          </div>
          <ul className="story-proof-list">
            <li>AI-judged pivots instead of silent heuristic promotion</li>
            <li>Frontier-based follow-up waves instead of uncontrolled recursion</li>
            <li>Explicit ownership and trace context instead of opaque output</li>
          </ul>
        </div>

        <div className="story-hero-visual" aria-label="Presentation preview">
          <article className="story-preview story-preview-overview">
            <p className="eyebrow">Run Overview</p>
            <h2>One workspace for coverage, judgment, and evidence.</h2>
            <div className="story-preview-stats">
              <span>Wave-aware scheduling</span>
              <span>Judge accepted / discarded</span>
              <span>Manual or autonomous execution</span>
              <span>Export-ready outputs</span>
            </div>
          </article>
          <article className="story-preview story-preview-pivot">
            <p className="eyebrow">Pivot Review</p>
            <strong>example-app.com</strong>
            <p>
              Brand overlap and matching page references make this a strong
              candidate for follow-up collection.
            </p>
            <div className="story-preview-actions">
              <span className="story-pill story-pill-accept">Accept</span>
              <span className="story-pill story-pill-reject">Reject</span>
              <span className="story-pill">Confidence 0.94</span>
            </div>
          </article>
          <article className="story-preview story-preview-trace">
            <p className="eyebrow">Trace Explorer</p>
            <strong>Why is this asset here?</strong>
            <ul>
              <li>Contributors and seed context remain visible</li>
              <li>Discovery relations and enrichment stay inspectable</li>
              <li>Questionable assets can be explained instead of hidden</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="story-section" id="problem">
        <div className="story-section-header">
          <p className="eyebrow">Problem</p>
          <h2>Asset discovery becomes less useful when scale outruns trust.</h2>
          <p>
            The interesting question is not whether a pipeline can collect more
            data. It is whether the team can defend why the results deserve
            attention.
          </p>
        </div>
        <div className="story-grid story-grid-three">
          {problemCards.map((card) => (
            <article key={card.title} className="story-card">
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="story-section" id="promise">
        <div className="story-section-header">
          <p className="eyebrow">Product Promise</p>
          <h2>Three ideas turn the demo from a collector bundle into a product direction.</h2>
        </div>
        <div className="story-grid story-grid-three">
          {promiseCards.map((card) => (
            <article key={card.title} className="story-card story-card-accent">
              <p className="eyebrow">{card.eyebrow}</p>
              <h3>{card.title}</h3>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="story-section" id="signals">
        <div className="story-section-header">
          <p className="eyebrow">Current Demo Scope</p>
          <h2>The presentation stays grounded in what the repositories already do.</h2>
        </div>
        <div className="story-grid story-grid-three">
          {signalCards.map((card) => (
            <article key={card.title} className="story-card story-card-ink">
              <h3>{card.title}</h3>
              <ul className="story-list">
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="story-section" id="walkthrough">
        <div className="story-section-header">
          <p className="eyebrow">Live Walkthrough</p>
          <h2>The demo flow is designed to sell the product through evidence, not theater.</h2>
          <p>
            Manual mode leads because it proves the system can recommend strongly
            without pretending every decision should be automatic.
          </p>
        </div>
        <ol className="story-timeline">
          {walkthroughSteps.map((step) => (
            <li key={step.step} className="story-timeline-item">
              <span className="story-step">{step.step}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="story-section" id="architecture">
        <div className="story-section-header">
          <p className="eyebrow">Technical Proof</p>
          <h2>The architecture supports the product story instead of competing with it.</h2>
          <p>
            The backend stays rooted in a scheduler-managed DAG, canonical assets,
            and bounded reconsideration. That gives the team room to debate
            alternatives without losing implementation discipline.
          </p>
        </div>
        <div className="story-grid story-grid-three">
          {architecturePoints.map((point) => (
            <article key={point.title} className="story-card">
              <h3>{point.title}</h3>
              <p>{point.copy}</p>
            </article>
          ))}
        </div>
        <div className="story-callout">
          <strong>Supporting technical artifact</strong>
          <p>
            The sibling <code>asset-discovery</code> project already includes a
            DAG visualization that explains the scheduler, collection waves, and
            bounded frontier release. Use it after the live product flow lands.
          </p>
        </div>
      </section>

      <section className="story-section" id="open-source">
        <div className="story-section-header">
          <p className="eyebrow">Open Source Repositories</p>
          <h2>The demo is split into frontend and backend repositories you can inspect directly.</h2>
          <p>
            Both repositories now carry MIT licenses and point to the actual
            frontend workspace and Go discovery engine shown in the demo.
          </p>
        </div>
        <div className="story-grid story-grid-two">
          {storyRepositories.map((repository) => (
            <a
              key={repository.name}
              className={`story-card story-repo-card ${repository.surface === "backend" ? "story-card-ink" : "story-card-accent"}`}
              href={repository.href}
              target="_blank"
              rel="noreferrer"
            >
              <div className="story-repo-card-header">
                <span className="story-repo-surface">{repository.label}</span>
                <GitHubMarkIcon />
              </div>
              <h3>{repository.name}</h3>
              <p>{repository.copy}</p>
              <div className="story-repo-meta">
                <span>{repository.license}</span>
                <span>Main branch</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="story-final">
        <div>
          <p className="eyebrow">Closing Claim</p>
          <h2>Comprehensiveness matters more when the reasoning is visible.</h2>
          <p>
            The point of the demo is not to argue that one implementation is final.
            It is to show a higher standard for how discovery products can balance
            ambition, rigor, and trust.
          </p>
        </div>
        <div className="story-hero-actions">
          <button
            type="button"
            className="hero-button"
            onClick={primaryAction}
          >
            {primaryActionLabel}
          </button>
          <a className="ghost-button" href="#top">
            Back To Top
          </a>
        </div>
      </section>
    </main>
  );
}
