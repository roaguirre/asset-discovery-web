import { useEffect, useState, type ReactNode } from "react";
import {
  SurfaceDrawerOverlay,
  SurfaceDrawerToggleButton,
  SurfaceTopbar,
} from "../../../components/surface";
import {
  StoryActivityMock,
  StoryArchitecturePipeline,
  StoryCapabilityBand,
  StoryCropFigure,
  StoryJudgeAnalysisMock,
  StoryProofStage,
  StoryPivotsViewMock,
  StoryRunOverviewMock,
  StoryTraceExplorerMock,
} from "./StoryMockViews";
import {
  storyCapabilityGroups,
  storyCrops,
  storyObservationBlocks,
  storyProblemPoints,
  storyRepositories,
  walkthroughSteps,
  type StoryCrop,
} from "./storyModel";
import "./PresentationSite.css";

type PresentationSiteProps = {
  authHydrated: boolean;
  sessionActive: boolean;
  onOpenWorkspace: () => void;
  onSignInToWorkspace: () => void;
};

const storyCropMap = new Map<StoryCrop["key"], StoryCrop>(
  storyCrops.map((crop) => [crop.key, crop]),
);
const storyNavigationLinks = [
  { href: "#promise", label: "Evidence" },
  { href: "#walkthrough", label: "Walkthrough" },
  { href: "#architecture", label: "Architecture" },
  { href: "#open-source", label: "Open Source" },
] as const;

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

function cropFor(key: StoryCrop["key"]) {
  return storyCropMap.get(key) as StoryCrop;
}

/**
 * PresentationSite is the public story-first landing surface for the demo. It
 * frames the live workspace as an editorial proof document before the audience
 * enters the signed-in console.
 */
export function PresentationSite({
  sessionActive,
  onOpenWorkspace,
  onSignInToWorkspace,
}: PresentationSiteProps) {
  const [compactViewport, setCompactViewport] = useState(() =>
    isCompactStoryViewport(),
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const primaryActionLabel = sessionActive
    ? "Open Live Workspace"
    : "Sign In For Live Demo";
  const primaryAction = sessionActive ? onOpenWorkspace : onSignInToWorkspace;
  const drawerToggleLabel = drawerOpen ? "Close navigation" : "Open navigation";

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1100px)");
    const syncViewport = () => {
      const nextCompactViewport = mediaQuery.matches;
      setCompactViewport(nextCompactViewport);
      if (!nextCompactViewport) {
        setDrawerOpen(false);
      }
    };

    mediaQuery.addEventListener("change", syncViewport);
    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  const topbarClassName = compactViewport
    ? "story-topbar is-compact"
    : "story-topbar";

  return (
    <main className="story-shell" id="top">
      <div className="story-orbit story-orbit-one" aria-hidden="true" />
      <div className="story-orbit story-orbit-two" aria-hidden="true" />

      <SurfaceTopbar
        className={topbarClassName}
        innerClassName="story-topbar-inner"
        start={
          <div
            className={
              compactViewport
                ? "story-topbar-start-cluster"
                : "story-brand-lockup"
            }
          >
            {compactViewport ? (
              <SurfaceDrawerToggleButton
                open={drawerOpen}
                label={drawerToggleLabel}
                onToggle={() => setDrawerOpen((current) => !current)}
              />
            ) : null}
            <div
              className={
                compactViewport
                  ? "story-brand-lockup is-compact"
                  : "story-brand-lockup"
              }
            >
              <p className="eyebrow">Asset Discovery</p>
              <strong className="story-brand">
                AI-guided discovery with visible reasoning.
              </strong>
            </div>
          </div>
        }
        middle={
          compactViewport ? null : (
            <nav className="story-nav" aria-label="Presentation sections">
              {storyNavigationLinks.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          )
        }
        end={
          <div className={compactViewport ? "story-actions is-compact" : "story-actions"}>
            {compactViewport ? null : (
              <>
                <div
                  className="story-repo-links"
                  aria-label="Source repositories"
                >
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
              </>
            )}
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

      {compactViewport ? (
        <SurfaceDrawerOverlay
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ariaLabel="Story navigation"
          scrimClassName="story-drawer-scrim"
          drawerClassName="story-drawer"
        >
          <div className="story-drawer-inner">
            <div className="story-drawer-header">
              <div className="story-brand-lockup is-compact-drawer">
                <p className="eyebrow">Asset Discovery</p>
                <strong className="story-brand">
                  AI-guided discovery with visible reasoning.
                </strong>
              </div>
            </div>

            <nav className="story-drawer-nav" aria-label="Story sections">
              {storyNavigationLinks.map((link) => (
                <a
                  key={link.href}
                  className="story-drawer-link"
                  href={link.href}
                  onClick={() => setDrawerOpen(false)}
                >
                  <span>{link.label}</span>
                </a>
              ))}
            </nav>

            <div className="story-drawer-group">
              <p className="eyebrow">Open Source Repositories</p>
              <div className="story-drawer-repos">
                {storyRepositories.map((repository) => (
                  <a
                    key={repository.name}
                    className="story-drawer-repo-link"
                    href={repository.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <div className="story-drawer-repo-header">
                      <span className="story-drawer-repo-surface">
                        {repository.label}
                      </span>
                      <GitHubMarkIcon />
                    </div>
                    <strong>{repository.name}</strong>
                    <p>{repository.license}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </SurfaceDrawerOverlay>
      ) : null}

      <section className="story-hero">
        <div className="story-hero-copy">
          <h1>Asset discovery should expand coverage without asking the team to trust a black box.</h1>
          <p className="story-summary">
            The demo shows a discovery loop that can widen coverage without
            hiding uncertainty. Recommendation quality, review state, and trace
            context stay visible as the run expands.
          </p>
          <div className="story-hero-actions">
            <button
              type="button"
              className="hero-button"
              onClick={primaryAction}
            >
              {primaryActionLabel}
            </button>
            <a className="ghost-button" href="#promise">
              See The Evidence
            </a>
          </div>
        </div>

        <div className="story-hero-montage">
          <StoryCropFigure
            crop={cropFor("run-overview")}
            className="is-overview"
            tone="ink"
            captionMode="hidden"
          >
            <StoryRunOverviewMock />
          </StoryCropFigure>
        </div>
      </section>

      <section className="story-section story-problem-section" id="problem">
        <div className="story-problem-layout">
          <div className="story-problem-intro">
            <p className="eyebrow">Problem</p>
            <h2>Coverage gets easier to debate when the product keeps the reasoning close to the result.</h2>
            <p>
              The hard part is not only collecting more potential assets. It is
              making the expanding result set legible enough that the team can
              decide what deserves trust and follow-up.
            </p>
          </div>
          <div className="story-problem-list">
            {storyProblemPoints.map((point) => (
              <article key={point.title} className="story-problem-card">
                <h3>{point.title}</h3>
                <p>{point.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="story-section story-evidence-section" id="promise">
        <div className="story-section-header">
          <p className="eyebrow">Evidence</p>
          <h2>What becomes visible when discovery has to justify itself.</h2>
          <p>
            The goal here is not to declare a product direction in the abstract.
            It is to show what the workflow starts revealing once review,
            judgment, and trace context stay inside the same surface.
          </p>
        </div>
        <div className="story-observation-stack">
          {storyObservationBlocks.map((block) => {
            const crop = cropFor(block.crop);
            let surface: ReactNode;

            if (block.crop === "pivot-review") {
              surface = (
                <StoryCropFigure
                  crop={crop}
                  interactive
                  className="is-proof-panel"
                  captionMode="label-only"
                >
                  <StoryPivotsViewMock />
                </StoryCropFigure>
              );
            } else if (block.crop === "judge-analysis") {
              surface = (
                <StoryCropFigure
                  crop={crop}
                  className="is-proof-panel"
                  captionMode="label-only"
                >
                  <StoryJudgeAnalysisMock />
                </StoryCropFigure>
              );
            } else if (block.crop === "activity-feed") {
              surface = (
                <StoryCropFigure
                  crop={crop}
                  tone="ink"
                  className="is-proof-panel"
                  captionMode="label-only"
                >
                  <StoryActivityMock />
                </StoryCropFigure>
              );
            } else {
              surface = (
                <StoryCropFigure
                  crop={crop}
                  interactive
                  className="is-proof-panel"
                  captionMode="label-only"
                >
                  <StoryTraceExplorerMock />
                </StoryCropFigure>
              );
            }

            return (
              <StoryProofStage
                key={block.id}
                eyebrow={block.eyebrow}
                title={block.title}
                copy={block.copy}
                side={block.side}
              >
                {surface}
              </StoryProofStage>
            );
          })}
        </div>
      </section>

      <section className="story-section story-capability-section" id="signals">
        <div className="story-section-header">
          <p className="eyebrow">Current Demo Scope</p>
          <h2>The demo already covers the discovery loop, the review loop, and the delivery loop.</h2>
          <p>
            Collection, review, traceability, and export delivery already land
            in the same working surface for this demo scope.
          </p>
        </div>
        <div className="story-capability-grid">
          {storyCapabilityGroups.map((group) => (
            <StoryCapabilityBand key={group.title} group={group} />
          ))}
        </div>
      </section>

      <section className="story-section story-walkthrough-section" id="walkthrough">
        <div className="story-walkthrough-layout">
          <div className="story-walkthrough-intro">
            <p className="eyebrow">OSINT Workflow</p>
            <h2>From seed to surface in a single traceable run.</h2>
            <p>
              Each step extends coverage without hiding the reasoning. Seeds
              become signals, signals become reviewed decisions, decisions become
              attributable findings you can inspect.
            </p>
          </div>
          <ol className="story-walkthrough-flow">
            {walkthroughSteps.map((step) => (
              <li key={step.step} className="story-walkthrough-step">
                <div className="story-step-marker">
                  <span className="story-step-num">{step.step}</span>
                </div>
                <div className="story-step-body">
                  <span className="story-step-phase">{step.phase}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                  <div className="story-step-signals">
                    {step.signals.map((signal) => (
                      <span key={signal} className="story-step-signal">
                        {signal}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="story-architecture-band" id="architecture">
        <div className="story-architecture-copy">
          <p className="eyebrow">System Design</p>
          <h2>Every expansion goes through the scheduler. No collector recurses.</h2>
          <p>
            The pipeline is acyclic by design. An LLM gates every ownership
            claim at the collector boundary, accepted pivots return to the
            scheduler as new frontier seeds, and the asset store deduplicates
            across waves by identity.
          </p>
          <p>
            After all frontier waves are exhausted, <strong>bounded
            reconsideration</strong> re-evaluates every discarded candidate
            once — with the full accepted-asset set in context. Confidence
            scores that were borderline at collection time may shift. Promoted
            candidates seed exactly one additional wave; the run then closes.
            No silent expansion, no unbounded recursion.
          </p>
        </div>
        <div className="story-architecture-visual">
          <StoryArchitecturePipeline />
        </div>
      </section>

      <section className="story-section" id="open-source">
        <div className="story-section-header">
          <p className="eyebrow">Open Source Repositories</p>
          <h2>The demo is split into frontend and backend repositories you can inspect directly.</h2>
          <p>
            Both repositories carry MIT licenses and point to the actual
            workspace and discovery engine used throughout the demo.
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
            The landing page is meant to make that felt before the live demo
            begins: the system grows scope, but it also keeps the supporting
            rationale close enough to inspect.
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

function isCompactStoryViewport(): boolean {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 1100px)").matches
    : false;
}
