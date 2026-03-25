import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import "./LiveApp.css";
import type {
  JudgeCandidate,
  JudgeGroup,
  TraceContributor,
  TraceNode,
} from "../types";
import { isAllowlistedEmail } from "./allowlist";
import {
  assetSortTooltips,
  assetSummaryText,
  buildDomainGroups,
  compareAssetRows,
  defaultAssetSort,
  defaultDomainFilters,
  describeOwnership,
  describeSource,
  displayedDomainRowCount,
  filterAssets,
  filterAssetsByTab,
  hasActiveDomainFilters,
  humanizeToken,
  normalizeAssetSort,
  parseAssetDetails,
  sortKeysForTab,
  sortLabelForKey,
  splitSources,
  toggleAssetSort,
  uniqueAssetValues,
  uniqueSourceValues,
  type AssetSortKey,
  type AssetSortState,
  type AssetTableTab,
  type DomainFilterState,
  type DomainGroup,
} from "./assetTable";
import type { LiveAppDeps } from "./deps";
import { resolveLiveURL } from "./env";
import { buildLiveHash, emptyLiveRoute, parseLiveHash } from "./navigation";
import type {
  CreateRunPayload,
  LiveAssetRow,
  LiveAssetTab,
  LiveAuthSession,
  LiveEventRecord,
  LiveJudgeSummary,
  LivePivotRecord,
  LiveRouteState,
  LiveRunRecord,
  LiveTrace,
  LiveView,
} from "./types";

type LiveAppProps = {
  deps: LiveAppDeps;
};

type RunFormState = {
  companyName: string;
  domains: string;
  address: string;
  industry: string;
  mode: "autonomous" | "manual";
};

type TooltipState = {
  visible: boolean;
  text: string;
  left: number;
  top: number;
};

type ViewNavigationItem = {
  view: LiveView;
  label: string;
  count: number;
};

type PivotPanelTab = "review" | "judge";

const initialFormState: RunFormState = {
  companyName: "",
  domains: "",
  address: "",
  industry: "",
  mode: "autonomous",
};

const hiddenTooltip: TooltipState = {
  visible: false,
  text: "",
  left: 0,
  top: 0,
};

/**
 * Normalizes comma- or newline-delimited input into non-empty values.
 */
function parseDelimitedValues(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Reveals optional seed fields only after the user has entered company or domain data.
 */
function hasSeedIdentityInput(formState: RunFormState): boolean {
  return (
    formState.companyName.trim().length > 0 ||
    parseDelimitedValues(formState.domains).length > 0
  );
}

const assetTabLabels: Record<LiveAssetTab, string> = {
  all: "All",
  domains: "Domains",
  ips: "IPs",
};

const viewLabels: Record<LiveView, string> = {
  assets: "Assets",
  trace: "Trace",
  pivots: "Pivots",
  activity: "Activity",
};

const drawerPreferenceKey = "asset-discovery-live:drawer-collapsed";

export default function LiveApp({ deps }: LiveAppProps) {
  const [session, setSession] = useState<LiveAuthSession | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [runs, setRuns] = useState<LiveRunRecord[]>([]);
  const [runsHydrated, setRunsHydrated] = useState(false);
  const [assets, setAssets] = useState<LiveAssetRow[]>([]);
  const [traces, setTraces] = useState<LiveTrace[]>([]);
  const [pivots, setPivots] = useState<LivePivotRecord[]>([]);
  const [judgeSummary, setJudgeSummary] =
    useState<LiveJudgeSummary>(emptyJudgeSummary);
  const [events, setEvents] = useState<LiveEventRecord[]>([]);
  const [route, setRoute] = useState<LiveRouteState>(() =>
    parseLiveHash(window.location.hash),
  );
  const [assetSearch, setAssetSearch] = useState("");
  const [assetSort, setAssetSort] = useState<AssetSortState>(defaultAssetSort);
  const [domainFilters, setDomainFilters] =
    useState<DomainFilterState>(defaultDomainFilters);
  const [expandedAssetID, setExpandedAssetID] = useState("");
  const [expandedDomainGroups, setExpandedDomainGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedTraceNodeID, setSelectedTraceNodeID] = useState("");
  const [formState, setFormState] = useState<RunFormState>(initialFormState);
  const [message, setMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCollapsed, setDrawerCollapsed] = useState(readDrawerPreference);
  const [compactViewport, setCompactViewport] = useState(() =>
    isCompactViewport(),
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [runMenuOpen, setRunMenuOpen] = useState(false);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [pivotPanelTab, setPivotPanelTab] = useState<PivotPanelTab>("review");
  const [tooltip, setTooltip] = useState<TooltipState>(hiddenTooltip);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const runMenuRef = useRef<HTMLDivElement | null>(null);
  const sourceMenuRef = useRef<HTMLDivElement | null>(null);

  const deferredAssetSearch = useDeferredValue(assetSearch);
  const showOptionalSeedFields = hasSeedIdentityInput(formState);
  const selectedRun = runs.find((run) => run.id === route.runID) ?? null;
  const activeAssetTab = route.assetTab;
  const activeAssetSort = normalizeAssetSort(assetSort, activeAssetTab);
  const allDomainAssets = filterAssetsByTab(assets, "domains");
  const visibleAssets = filterAssets(
    assets,
    deferredAssetSearch,
    activeAssetTab,
    domainFilters,
  )
    .slice()
    .sort((left, right) =>
      compareAssetRows(left, right, activeAssetSort, activeAssetTab),
    );
  const visibleDomainGroups =
    activeAssetTab === "domains"
      ? buildDomainGroups(visibleAssets, allDomainAssets)
      : [];
  const domainFiltersActive =
    activeAssetTab === "domains"
      ? hasActiveDomainFilters(deferredAssetSearch, domainFilters)
      : false;
  const displayedAssetCount =
    activeAssetTab === "domains"
      ? displayedDomainRowCount(
          visibleDomainGroups,
          expandedDomainGroups,
          domainFiltersActive,
        )
      : visibleAssets.length;
  const pendingPivots = pivots
    .filter((pivot) => pivot.status === "pending_review")
    .slice()
    .sort((left, right) => comparePivots(left, right));
  const auditPivots = pivots
    .filter((pivot) => pivot.status !== "pending_review")
    .slice()
    .sort((left, right) => comparePivots(left, right));
  const traceTargetID = resolveTraceTargetID(
    route.view,
    route.assetID,
    traces,
    assets,
  );
  const selectedTrace =
    traces.find((trace) => trace.asset_id === traceTargetID) ?? null;
  const selectedTraceAsset =
    assets.find((asset) => asset.asset_id === traceTargetID) ?? null;
  const selectedTraceNode = findTraceNode(selectedTrace, selectedTraceNodeID);
  const traceOptions = buildTraceOptions(assets, traces);
  const availableDomainKinds = uniqueAssetValues(
    allDomainAssets,
    "domain_kind",
  );
  const availableResolutionStatuses = uniqueAssetValues(
    allDomainAssets,
    "resolution_status",
  );
  const availableDomainSources = uniqueSourceValues(allDomainAssets);
  const viewItems: ViewNavigationItem[] = [
    { view: "assets", label: viewLabels.assets, count: assets.length },
    { view: "trace", label: viewLabels.trace, count: assets.length },
    {
      view: "pivots",
      label: viewLabels.pivots,
      count: pendingPivots.length + auditPivots.length,
    },
    { view: "activity", label: viewLabels.activity, count: events.length },
  ];
  const expandedDrawer = compactViewport ? true : !drawerCollapsed;
  const runCountsByAssetTab = {
    all: assets.length,
    domains: filterAssetsByTab(assets, "domains").length,
    ips: filterAssetsByTab(assets, "ips").length,
  };
  const drawerToggleLabel = compactViewport
    ? drawerOpen
      ? "Close navigation"
      : "Open navigation"
    : expandedDrawer
      ? "Collapse navigation"
      : "Expand navigation";
  const runSelectorLabel = selectedRun
    ? formatRunSelectorLabel(selectedRun)
    : runsHydrated
      ? "No runs yet"
      : "Loading runs";

  useEffect(
    () =>
      deps.subscribeAuth((nextSession) => {
        startTransition(() => {
          setAuthHydrated(true);
          setSession(nextSession);
        });
      }),
    [deps],
  );

  useEffect(() => {
    const syncRoute = () => {
      const next = parseLiveHash(window.location.hash);
      startTransition(() => {
        setRoute((current) => (sameRoute(current, next) ? current : next));
      });
    };

    window.addEventListener("hashchange", syncRoute);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
    };
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      setCompactViewport(false);
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1100px)");
    const syncViewport = () => {
      setCompactViewport(mediaQuery.matches);
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    const nextHash = buildLiveHash(route);
    if (window.location.hash === nextHash) {
      return;
    }
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${nextHash}`,
    );
  }, [route]);

  useEffect(() => {
    window.localStorage.setItem(
      drawerPreferenceKey,
      drawerCollapsed ? "true" : "false",
    );
  }, [drawerCollapsed]);

  useEffect(() => {
    if (!session?.uid) {
      setRunsHydrated(false);
      setRuns([]);
      setAssets([]);
      setTraces([]);
      setPivots([]);
      setJudgeSummary(emptyJudgeSummary);
      setEvents([]);
      if (authHydrated) {
        setRoute(emptyLiveRoute());
      }
      return;
    }

    return deps.subscribeRuns(session.uid, (nextRuns) => {
      startTransition(() => {
        setRunsHydrated(true);
        setRuns(nextRuns);
      });
    });
  }, [authHydrated, deps, session?.uid]);

  useEffect(() => {
    if (!session?.uid || !runsHydrated) {
      return;
    }

    if (runs.length === 0) {
      if (
        route.runID ||
        route.assetID ||
        route.pivotID ||
        route.view !== "assets" ||
        route.assetTab !== "all"
      ) {
        setRoute(emptyLiveRoute());
      }
      return;
    }

    if (runs.some((run) => run.id === route.runID)) {
      return;
    }

    setRoute({
      runID: runs[0]?.id ?? "",
      view: "assets",
      assetTab: "all",
      assetID: "",
      pivotID: "",
    });
  }, [
    route.assetID,
    route.assetTab,
    route.pivotID,
    route.runID,
    route.view,
    runs,
    runsHydrated,
    session?.uid,
  ]);

  useEffect(() => {
    if (!route.runID) {
      setAssets([]);
      setTraces([]);
      setPivots([]);
      setJudgeSummary(emptyJudgeSummary);
      setEvents([]);
      return;
    }

    const unsubscribes = [
      deps.subscribeAssets(route.runID, setAssets),
      deps.subscribeTraces(route.runID, setTraces),
      deps.subscribePivots(route.runID, setPivots),
      deps.subscribeJudgeSummary(route.runID, setJudgeSummary),
      deps.subscribeEvents(route.runID, setEvents),
    ];
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [deps, route.runID]);

  useEffect(() => {
    setExpandedAssetID("");
    setAssetSearch("");
    setDomainFilters(defaultDomainFilters);
    setExpandedDomainGroups(new Set());
    setSourceMenuOpen(false);
  }, [route.assetTab, route.runID]);

  useEffect(() => {
    setDrawerOpen(false);
    setAccountMenuOpen(false);
    setRunMenuOpen(false);
    setSourceMenuOpen(false);
  }, [route.assetTab, route.runID, route.view]);

  useEffect(() => {
    setPivotPanelTab("review");
  }, [route.runID]);

  useEffect(() => {
    if (
      route.view !== "trace" ||
      !traceTargetID ||
      route.assetID === traceTargetID
    ) {
      return;
    }
    setRoute((current) => ({
      ...current,
      assetID: traceTargetID,
    }));
  }, [route.assetID, route.view, traceTargetID]);

  useEffect(() => {
    setSelectedTraceNodeID("");
  }, [traceTargetID]);

  useEffect(() => {
    const initialNodeID = resolveInitialTraceNodeID(selectedTrace);
    if (!initialNodeID) {
      if (selectedTraceNodeID) {
        setSelectedTraceNodeID("");
      }
      return;
    }

    const hasSelectedNode = (selectedTrace?.nodes ?? []).some(
      (node) => node.id === selectedTraceNodeID,
    );
    if (!hasSelectedNode) {
      setSelectedTraceNodeID(initialNodeID);
    }
  }, [selectedTrace, selectedTraceNodeID]);

  useEffect(() => {
    if (
      !drawerOpen &&
      !createModalOpen &&
      !accountMenuOpen &&
      !runMenuOpen &&
      !sourceMenuOpen
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setDrawerOpen(false);
      setCreateModalOpen(false);
      setAccountMenuOpen(false);
      setRunMenuOpen(false);
      setSourceMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    accountMenuOpen,
    createModalOpen,
    drawerOpen,
    runMenuOpen,
    sourceMenuOpen,
  ]);

  useEffect(() => {
    if (!accountMenuOpen && !runMenuOpen && !sourceMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | globalThis.MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
      if (!runMenuRef.current?.contains(event.target)) {
        setRunMenuOpen(false);
      }
      if (!sourceMenuRef.current?.contains(event.target)) {
        setSourceMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [accountMenuOpen, runMenuOpen, sourceMenuOpen]);

  async function handleCreateRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = buildCreateRunPayload(formState);
    const validationError = validateCreateRunPayload(payload);
    if (validationError) {
      setModalMessage(validationError);
      return;
    }

    setBusyAction("create-run");
    setMessage("");
    setModalMessage("");
    try {
      const run = await deps.createRun(payload);
      setFormState(initialFormState);
      setCreateModalOpen(false);
      setRoute({
        runID: run.id,
        view: "assets",
        assetTab: "all",
        assetID: "",
        pivotID: "",
      });
      setMessage(`Queued ${run.mode} run ${run.id}.`);
    } catch (error) {
      setModalMessage(
        error instanceof Error ? error.message : "Failed to create run.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handlePivotDecision(
    pivot: LivePivotRecord,
    decision: "accepted" | "rejected",
  ) {
    setBusyAction(`${decision}:${pivot.id}`);
    setMessage("");
    try {
      await deps.decidePivot(route.runID, pivot.id, decision);
      setMessage(
        `${decision === "accepted" ? "Accepted" : "Rejected"} ${pivot.root}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to update pivot.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function handleSignIn() {
    setBusyAction("sign-in");
    setMessage("");
    try {
      await deps.signInWithGoogle();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign in failed.");
    } finally {
      setBusyAction("");
    }
  }

  async function handleSignOut() {
    setBusyAction("sign-out");
    try {
      await deps.signOut();
    } finally {
      setBusyAction("");
    }
  }

  function openCreateModal() {
    setModalMessage("");
    setCreateModalOpen(true);
    setDrawerOpen(false);
    setRunMenuOpen(false);
  }

  function handleSelectRun(runID: string) {
    setRoute({
      runID,
      view: "assets",
      assetTab: "all",
      assetID: "",
      pivotID: "",
    });
    setDrawerOpen(false);
    setRunMenuOpen(false);
  }

  function handleSelectView(view: LiveView) {
    setRoute((current) => ({
      ...current,
      view,
      assetID: view === "trace" ? current.assetID : "",
      pivotID: view === "pivots" ? current.pivotID : "",
    }));
  }

  function handleSelectAssetTab(assetTab: AssetTableTab) {
    setRoute((current) => ({
      ...current,
      view: "assets",
      assetTab,
      assetID: "",
      pivotID: "",
    }));
  }

  function handleOpenTrace(assetID: string) {
    setRoute((current) => ({
      ...current,
      view: "trace",
      assetID,
      pivotID: "",
    }));
  }

  function handleSelectTraceAsset(assetID: string) {
    setRoute((current) => ({
      ...current,
      view: "trace",
      assetID,
    }));
  }

  function handleSelectPivot(pivotID: string) {
    setRoute((current) => ({
      ...current,
      view: "pivots",
      pivotID,
    }));
  }

  function handleSortChange(key: AssetSortKey) {
    setAssetSort((current) =>
      toggleAssetSort(normalizeAssetSort(current, activeAssetTab), key),
    );
  }

  function handleToggleAssetDetails(assetID: string) {
    setExpandedAssetID((current) => (current === assetID ? "" : assetID));
  }

  function handleToggleDomainGroup(groupKey: string) {
    if (domainFiltersActive) {
      return;
    }
    setExpandedDomainGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  function handleToggleSource(source: string) {
    setDomainFilters((current) => {
      const hasSource = current.sources.includes(source);
      return {
        ...current,
        sources: hasSource
          ? current.sources.filter((item) => item !== source)
          : [...current.sources, source].sort((left, right) =>
              left.localeCompare(right),
            ),
      };
    });
  }

  function handleSelectTraceNode(nodeID: string) {
    setSelectedTraceNodeID(nodeID);
  }

  function handleTooltipOver(
    event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>,
  ) {
    const target = findTooltipElement(event.target);
    if (target) {
      showTooltip(target, setTooltip);
      return;
    }
    hideTooltip(setTooltip);
  }

  function handleTooltipMove(event: MouseEvent<HTMLElement>) {
    const target = findTooltipElement(event.target);
    if (target) {
      showTooltip(target, setTooltip);
    }
  }

  function handleDrawerToggle() {
    if (compactViewport) {
      setDrawerOpen((current) => !current);
      setRunMenuOpen(false);
      setAccountMenuOpen(false);
      return;
    }
    setDrawerCollapsed((current) => !current);
    setRunMenuOpen(false);
    setAccountMenuOpen(false);
  }

  if (!session) {
    return (
      <main className="live-shell live-auth-shell">
        <section className="live-auth-card">
          <p className="eyebrow">Discovery Console</p>
          <h1>
            Live asset discovery, pivot review, and trace context in one
            workspace.
          </h1>
          <p className="live-intro">
            Sign in with Google to launch automated or manual runs, review
            recommended pivots, and watch discovery state stream into the
            client.
          </p>
          <button
            type="button"
            className="hero-button"
            onClick={handleSignIn}
            disabled={busyAction === "sign-in"}
          >
            {busyAction === "sign-in"
              ? "Opening Google..."
              : "Sign In With Google"}
          </button>
          <p className="meta-note">Approved verified Google accounts only.</p>
          {message ? (
            <p className="status-line status-error">{message}</p>
          ) : null}
        </section>
      </main>
    );
  }

  if (!session.emailVerified || !isAllowlistedEmail(session.email)) {
    return (
      <main className="live-shell live-auth-shell">
        <section className="live-auth-card">
          <p className="eyebrow">Access Restricted</p>
          <h1>{session.email}</h1>
          <p className="live-intro">
            This demo only accepts approved verified accounts. Sign out and
            switch to an authorized login.
          </p>
          <button
            type="button"
            className="hero-button"
            onClick={handleSignOut}
            disabled={busyAction === "sign-out"}
          >
            {busyAction === "sign-out" ? "Signing Out..." : "Sign Out"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main
      className="live-shell live-app-shell"
      onMouseOver={handleTooltipOver}
      onMouseMove={handleTooltipMove}
      onMouseLeave={() => hideTooltip(setTooltip)}
      onFocus={handleTooltipOver}
      onBlur={() => hideTooltip(setTooltip)}
    >
      <header className="workspace-topbar">
        <div className="topbar-left">
          {compactViewport ? (
            <button
              type="button"
              className="topbar-drawer-toggle"
              aria-label={drawerToggleLabel}
              onClick={handleDrawerToggle}
            >
              {drawerOpen ? <CloseIcon /> : <DrawerIcon />}
            </button>
          ) : null}
          <div className="run-selector-shell" ref={runMenuRef}>
            <button
              type="button"
              className="run-selector-trigger"
              aria-label="Select run"
              aria-haspopup="menu"
              aria-expanded={runMenuOpen}
              disabled={runs.length === 0}
              onClick={() => {
                if (runs.length === 0) {
                  return;
                }
                setAccountMenuOpen(false);
                setRunMenuOpen((current) => !current);
              }}
            >
              <span
                className="run-selector-label"
                title={selectedRun?.id || runSelectorLabel}
              >
                {runSelectorLabel}
              </span>
              <ChevronDownIcon />
            </button>
            {runMenuOpen ? (
              <section
                className="run-selector-menu"
                role="menu"
                aria-label="Run selector"
              >
                {runs.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    className={`run-selector-item ${run.id === route.runID ? "is-active" : ""}`}
                    role="menuitemradio"
                    aria-checked={run.id === route.runID}
                    onClick={() => handleSelectRun(run.id)}
                  >
                    <div className="run-selector-item-copy">
                      <strong>{run.id}</strong>
                      <span>
                        {run.mode === "manual"
                          ? "Manual review enabled"
                          : "Autonomous execution"}
                      </span>
                    </div>
                    <div className="run-selector-item-meta">
                      <span className={`status-pill status-${run.status}`}>
                        {formatStatus(run.status)}
                      </span>
                      <span>{formatDate(run.updated_at)}</span>
                      <span>{run.asset_count} assets</span>
                    </div>
                  </button>
                ))}
              </section>
            ) : null}
          </div>
        </div>

        <div className="account-shell" ref={accountMenuRef}>
          <button
            type="button"
            className="avatar-button"
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={accountMenuOpen}
            onClick={() => {
              setRunMenuOpen(false);
              setAccountMenuOpen((current) => !current);
            }}
          >
            <span className="avatar-face">{sessionInitials(session)}</span>
          </button>
          {accountMenuOpen ? (
            <section
              className="account-menu"
              role="menu"
              aria-label="Account menu"
            >
              <div className="account-menu-header">
                <strong>{sessionLabel(session)}</strong>
                <span>{session.email}</span>
              </div>
              <button
                type="button"
                className="account-menu-item"
                role="menuitem"
                onClick={() => {
                  setAccountMenuOpen(false);
                  void handleSignOut();
                }}
                disabled={busyAction === "sign-out"}
              >
                {busyAction === "sign-out" ? "Logging out..." : "Log out"}
              </button>
            </section>
          ) : null}
        </div>
      </header>

      <div
        className={`drawer-scrim ${drawerOpen ? "is-open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />

      <div className="live-body">
        <aside
          className={`app-drawer ${expandedDrawer ? "is-expanded" : "is-collapsed"} ${drawerOpen ? "is-open" : ""}`}
          aria-label="Workspace navigation"
        >
          <div className="drawer-inner">
            {expandedDrawer ? (
              <div className="drawer-header">
                <div className="drawer-brand">
                  <div>
                    <p className="eyebrow">Asset Discovery</p>
                    <h2>Discovery Console</h2>
                    <p className="drawer-copy">
                      Runs, traces, pivots, and the live asset table stay in one
                      shell.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <button
              type="button"
              className={
                expandedDrawer ? "hero-button drawer-cta" : "rail-action"
              }
              aria-label="New Run"
              onClick={openCreateModal}
            >
              {expandedDrawer ? (
                <>
                  <PlusIcon />
                  <span>New Run</span>
                </>
              ) : (
                <PlusIcon />
              )}
            </button>

            <nav className="drawer-nav" aria-label="Workspace views">
              {viewItems.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  className={`drawer-link ${route.view === item.view ? "is-active" : ""}`}
                  aria-label={`${item.label} ${item.count}`}
                  onClick={() => handleSelectView(item.view)}
                  disabled={!selectedRun}
                >
                  <span className="drawer-link-icon">
                    {iconForView(item.view)}
                  </span>
                  {expandedDrawer ? (
                    <span className="drawer-link-label">{item.label}</span>
                  ) : null}
                  {expandedDrawer ? (
                    <strong className="drawer-link-count">{item.count}</strong>
                  ) : null}
                </button>
              ))}
            </nav>

            {!compactViewport ? (
              <div className="drawer-footer">
                <button
                  type="button"
                  className="drawer-footer-toggle"
                  aria-label={drawerToggleLabel}
                  onClick={handleDrawerToggle}
                >
                  <DrawerIcon />
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="live-main">
          {message ? <p className="status-line">{message}</p> : null}

          {selectedRun ? (
            <>
              <section className="panel run-overview">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Selected Run</p>
                    <h2>{selectedRun.id}</h2>
                    <p className="panel-copy">
                      {selectedRun.mode === "manual"
                        ? "Recommended pivots wait in review until a human decision lands."
                        : "Recommended pivots are applied automatically while the audit trail stays visible."}
                    </p>
                  </div>
                  <span className={`status-pill status-${selectedRun.status}`}>
                    {formatStatus(selectedRun.status)}
                  </span>
                </div>
                <div className="stat-grid">
                  <StatCard
                    label="Mode"
                    value={humanizeToken(selectedRun.mode, "n/a")}
                  />
                  <StatCard
                    label="Wave"
                    value={String(selectedRun.current_wave)}
                  />
                  <StatCard
                    label="Assets"
                    value={String(selectedRun.asset_count)}
                  />
                  <StatCard
                    label="Seeds"
                    value={String(selectedRun.seed_count)}
                  />
                  <StatCard
                    label="Enumerations"
                    value={String(selectedRun.enumeration_count)}
                  />
                  <StatCard
                    label="Judge Accepted"
                    value={String(
                      selectedRun.judge_accepted_count ??
                        judgeSummary.accepted_count,
                    )}
                  />
                  <StatCard
                    label="Judge Discarded"
                    value={String(
                      selectedRun.judge_discarded_count ??
                        judgeSummary.discarded_count,
                    )}
                  />
                  <StatCard
                    label="Pending Pivots"
                    value={String(selectedRun.pending_pivot_count)}
                  />
                </div>
                <div className="run-overview-footer">
                  <div className="run-downloads" aria-label="Run downloads">
                    {selectedRun.downloads?.json ||
                    selectedRun.downloads?.csv ||
                    selectedRun.downloads?.xlsx ? (
                      <>
                        <span className="muted-inline">Downloads</span>
                        {selectedRun.downloads?.json ? (
                          <a
                            className="ghost-button compact"
                            href={resolveLiveURL(selectedRun.downloads.json)}
                          >
                            JSON
                          </a>
                        ) : null}
                        {selectedRun.downloads?.csv ? (
                          <a
                            className="ghost-button compact"
                            href={resolveLiveURL(selectedRun.downloads.csv)}
                          >
                            CSV
                          </a>
                        ) : null}
                        {selectedRun.downloads?.xlsx ? (
                          <a
                            className="ghost-button compact"
                            href={resolveLiveURL(selectedRun.downloads.xlsx)}
                          >
                            XLSX
                          </a>
                        ) : null}
                      </>
                    ) : (
                      <span className="muted-inline">
                        Downloads appear once the run exports result artifacts.
                      </span>
                    )}
                  </div>
                </div>
                {selectedRun.last_error ? (
                  <p className="status-line status-error">
                    {selectedRun.last_error}
                  </p>
                ) : null}
              </section>

              {route.view === "assets" ? (
                <section className="panel view-panel asset-view-panel">
                  <div className="asset-toolbar">
                    <div>
                      <p className="eyebrow">Live Assets</p>
                      <h2>
                        {displayedAssetCount} visible row
                        {displayedAssetCount === 1 ? "" : "s"}
                      </h2>
                      <p className="panel-copy">
                        {activeAssetTab === "domains"
                          ? `${visibleAssets.length} matching domain asset${visibleAssets.length === 1 ? "" : "s"} grouped by registrable domain.`
                          : "Sort, filter, and inspect the live Firestore projection without moving pivots or trace out of the way."}
                      </p>
                    </div>
                    <div className="asset-toolbar-controls">
                      <div
                        className="asset-tabs"
                        role="tablist"
                        aria-label="Asset types"
                      >
                        {(["all", "domains", "ips"] as AssetTableTab[]).map(
                          (tab) => (
                            <button
                              key={tab}
                              type="button"
                              role="tab"
                              aria-selected={activeAssetTab === tab}
                              className={`asset-tab ${activeAssetTab === tab ? "is-active" : ""}`}
                              onClick={() => handleSelectAssetTab(tab)}
                            >
                              <span>{assetTabLabels[tab]}</span>
                              <strong>{runCountsByAssetTab[tab]}</strong>
                            </button>
                          ),
                        )}
                      </div>
                      <input
                        className="search-input"
                        placeholder="Search identifiers, sources, ownership, provenance, or notes"
                        value={assetSearch}
                        onChange={(event) => setAssetSearch(event.target.value)}
                      />
                      {activeAssetTab === "domains" ? (
                        <div className="domain-filter-row">
                          <label className="filter-field">
                            Domain Kind
                            <select
                              value={domainFilters.domainKind}
                              onChange={(event) =>
                                setDomainFilters((current) => ({
                                  ...current,
                                  domainKind: event.target.value,
                                }))
                              }
                            >
                              <option value="">All domain kinds</option>
                              {availableDomainKinds.map((value) => (
                                <option key={value} value={value}>
                                  {humanizeToken(value)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="filter-field">
                            Resolution
                            <select
                              value={domainFilters.resolutionStatus}
                              onChange={(event) =>
                                setDomainFilters((current) => ({
                                  ...current,
                                  resolutionStatus: event.target.value,
                                }))
                              }
                            >
                              <option value="">All resolution states</option>
                              {availableResolutionStatuses.map((value) => (
                                <option key={value} value={value}>
                                  {humanizeToken(value)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <div className="filter-field">
                            <span>Source</span>
                            <div
                              className={`multi-select${sourceMenuOpen ? " is-open" : ""}`}
                              ref={sourceMenuRef}
                            >
                              <button
                                type="button"
                                className="multi-select-trigger"
                                aria-haspopup="true"
                                aria-expanded={sourceMenuOpen}
                                onClick={() =>
                                  setSourceMenuOpen((current) => !current)
                                }
                              >
                                {domainFilters.sources.length === 0
                                  ? "All sources"
                                  : domainFilters.sources.length === 1
                                    ? domainFilters.sources[0]
                                    : `${domainFilters.sources.length} sources selected`}
                              </button>
                              <div
                                className="multi-select-menu"
                                hidden={!sourceMenuOpen}
                              >
                                <label className="multi-select-option multi-select-option-all">
                                  <input
                                    type="checkbox"
                                    checked={domainFilters.sources.length === 0}
                                    onChange={() =>
                                      setDomainFilters((current) => ({
                                        ...current,
                                        sources: [],
                                      }))
                                    }
                                  />
                                  <span>All sources</span>
                                </label>
                                <div className="multi-select-options">
                                  {availableDomainSources.map((source) => (
                                    <label
                                      key={source}
                                      className="multi-select-option"
                                      data-tooltip={describeSource(source)}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={domainFilters.sources.includes(
                                          source,
                                        )}
                                        onChange={() =>
                                          handleToggleSource(source)
                                        }
                                      />
                                      <span>{source}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="asset-table-shell">
                    {visibleAssets.length > 0 ? (
                      <AssetsTable
                        tab={activeAssetTab}
                        assets={visibleAssets}
                        allAssets={assets}
                        traces={traces}
                        expandedAssetID={expandedAssetID}
                        expandedDomainGroups={expandedDomainGroups}
                        domainFiltersActive={domainFiltersActive}
                        sort={activeAssetSort}
                        onSortChange={handleSortChange}
                        onToggleDetails={handleToggleAssetDetails}
                        onToggleDomainGroup={handleToggleDomainGroup}
                        onOpenTrace={handleOpenTrace}
                      />
                    ) : (
                      <p className="empty-copy table-empty-copy">
                        No assets match the current filter.
                      </p>
                    )}
                  </div>
                </section>
              ) : null}

              {route.view === "trace" ? (
                <section className="panel view-panel trace-view">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Trace Focus</p>
                      <h2>
                        {selectedTrace?.identifier ||
                          selectedTraceAsset?.identifier ||
                          "No trace selected yet"}
                      </h2>
                      <p className="panel-copy">
                        Open any asset from the table to carry its context into
                        the dedicated trace view.
                      </p>
                    </div>
                    <label className="trace-select">
                      Focus asset
                      <select
                        value={traceTargetID}
                        onChange={(event) =>
                          handleSelectTraceAsset(event.target.value)
                        }
                        disabled={traceOptions.length === 0}
                      >
                        {traceOptions.length === 0 ? (
                          <option value="">No assets available</option>
                        ) : null}
                        {traceOptions.map((option) => (
                          <option key={option.asset_id} value={option.asset_id}>
                            {option.identifier}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {traceTargetID ? (
                    <TraceExplorer
                      trace={selectedTrace}
                      asset={selectedTraceAsset}
                      selectedNode={selectedTraceNode}
                      selectedNodeID={selectedTraceNodeID}
                      onSelectNode={handleSelectTraceNode}
                      onOpenTrace={handleOpenTrace}
                    />
                  ) : (
                    <p className="empty-copy">
                      Trace snapshots will appear here once the selected run
                      exports asset context.
                    </p>
                  )}
                </section>
              ) : null}

              {route.view === "pivots" ? (
                <section className="panel view-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Pivots</p>
                      <h2>
                        {pivotPanelTab === "review"
                          ? `${pendingPivots.length} pending review`
                          : `${judgeSummary.evaluation_count} judge evaluation${judgeSummary.evaluation_count === 1 ? "" : "s"}`}
                      </h2>
                      <p className="panel-copy">
                        {pivotPanelTab === "review"
                          ? "Pending decisions stay at the top. Automated outcomes remain visible in the audit lane."
                          : "Grouped judge outcomes stay visible alongside the review workflow."}
                      </p>
                    </div>
                    <div
                      className="asset-tabs pivot-view-tabs"
                      role="tablist"
                      aria-label="Pivot analysis views"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={pivotPanelTab === "review"}
                        className={`asset-tab ${pivotPanelTab === "review" ? "is-active" : ""}`}
                        onClick={() => setPivotPanelTab("review")}
                      >
                        <span>Review</span>
                        <strong>
                          {pendingPivots.length + auditPivots.length}
                        </strong>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={pivotPanelTab === "judge"}
                        className={`asset-tab ${pivotPanelTab === "judge" ? "is-active" : ""}`}
                        onClick={() => setPivotPanelTab("judge")}
                      >
                        <span>Judge Analysis</span>
                        <strong>{judgeSummary.evaluation_count}</strong>
                      </button>
                    </div>
                  </div>

                  {pivotPanelTab === "review" ? (
                    <div className="pivot-columns">
                      <section className="pivot-column">
                        <div className="subsection-heading">
                          <h3>Pending</h3>
                          <span>{pendingPivots.length}</span>
                        </div>
                        <div className="pivot-list">
                          {pendingPivots.map((pivot) => (
                            <article
                              key={pivot.id}
                              className={`pivot-card ${route.pivotID === pivot.id ? "is-selected" : ""}`}
                              onClick={() => handleSelectPivot(pivot.id)}
                            >
                              <div className="pivot-copy">
                                <strong>{pivot.root}</strong>
                                <p>
                                  {pivot.recommendation_reason ||
                                    "AI recommended this pivot without an explicit explanation."}
                                </p>
                                <div className="pivot-meta">
                                  <span>{pivot.collector || "judge"}</span>
                                  <span>
                                    {pivot.seed_label ||
                                      pivot.seed_domains?.join(", ") ||
                                      "Seed context pending"}
                                  </span>
                                  <span>
                                    {formatScore(pivot.recommendation_score)}
                                  </span>
                                </div>
                              </div>
                              <div className="pivot-actions">
                                <button
                                  type="button"
                                  className="hero-button compact"
                                  disabled={
                                    busyAction === `accepted:${pivot.id}`
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handlePivotDecision(pivot, "accepted");
                                  }}
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  className="ghost-button compact"
                                  disabled={
                                    busyAction === `rejected:${pivot.id}`
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handlePivotDecision(pivot, "rejected");
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            </article>
                          ))}
                          {pendingPivots.length === 0 ? (
                            <p className="empty-copy">
                              No pivots need review right now.
                            </p>
                          ) : null}
                        </div>
                      </section>

                      <section className="pivot-column">
                        <div className="subsection-heading">
                          <h3>Audit</h3>
                          <span>{auditPivots.length}</span>
                        </div>
                        <div className="audit-list">
                          {auditPivots.map((pivot) => (
                            <article key={pivot.id} className="audit-item">
                              <div className="audit-header">
                                <strong>{pivot.root}</strong>
                                <span
                                  className={`status-pill status-${pivot.status}`}
                                >
                                  {formatStatus(pivot.status)}
                                </span>
                              </div>
                              <p>
                                {pivot.recommendation_reason ||
                                  "No explicit rationale was stored for this recommendation."}
                              </p>
                              <div className="pivot-meta">
                                <span>{pivot.collector || "judge"}</span>
                                <span>{formatDate(pivot.updated_at)}</span>
                                <span>
                                  {formatScore(pivot.recommendation_score)}
                                </span>
                              </div>
                            </article>
                          ))}
                          {auditPivots.length === 0 ? (
                            <p className="empty-copy">
                              Resolved recommendations will land here.
                            </p>
                          ) : null}
                        </div>
                      </section>
                    </div>
                  ) : (
                    <JudgeAnalysisPanel judgeSummary={judgeSummary} />
                  )}
                </section>
              ) : null}

              {route.view === "activity" ? (
                <section className="panel view-panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Activity Feed</p>
                      <h2>
                        {events.length} recent event
                        {events.length === 1 ? "" : "s"}
                      </h2>
                      <p className="panel-copy">
                        The feed stays isolated from assets, pivots, and trace
                        so the main workspace can stay focused.
                      </p>
                    </div>
                  </div>
                  <div className="activity-list">
                    {events.map((event) => (
                      <article key={event.id} className="activity-item">
                        <span className="status-pill subtle">
                          {humanizeToken(event.kind, event.kind)}
                        </span>
                        <strong>{event.message}</strong>
                        <span>{formatDate(event.created_at)}</span>
                      </article>
                    ))}
                    {events.length === 0 ? (
                      <p className="empty-copy">
                        Run events will appear here once execution begins.
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <section className="panel empty-panel">
              <p className="eyebrow">Ready</p>
              <h2>Select a run or launch a new one.</h2>
              <p className="empty-copy">
                The live workspace hydrates from Firestore once a signed-in
                creator owns at least one run.
              </p>
              <button
                type="button"
                className="hero-button"
                onClick={openCreateModal}
              >
                Create Run
              </button>
            </section>
          )}
        </section>
      </div>

      {createModalOpen ? (
        <div
          className="modal-scrim"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setCreateModalOpen(false);
            }
          }}
        >
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-run-title"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">New Run</p>
                <h2 id="new-run-title">Plant seeds</h2>
                <p className="panel-copy">
                  Use a compact seed set, then let the workspace take over.
                </p>
              </div>
              <button
                type="button"
                className="ghost-button compact"
                onClick={() => setCreateModalOpen(false)}
              >
                Close
              </button>
            </div>
            <form className="create-form" onSubmit={handleCreateRun}>
              <label>
                Company
                <input
                  value={formState.companyName}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      companyName: event.target.value,
                    }))
                  }
                  placeholder="Example Holdings"
                />
              </label>
              <label>
                Domains
                <textarea
                  rows={3}
                  value={formState.domains}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      domains: event.target.value,
                    }))
                  }
                  placeholder="example.com, api.example.com"
                />
              </label>
              <div className="mode-switch-field">
                <span className="mode-switch-label">Mode</span>
                <label className="mode-switch">
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label="✨ AI mode"
                    checked={formState.mode === "autonomous"}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        mode: event.target.checked ? "autonomous" : "manual",
                      }))
                    }
                  />
                  <span className="mode-switch-copy">
                    <strong>✨ AI mode</strong>
                    <span>
                      {formState.mode === "autonomous"
                        ? "Fully autonomous"
                        : "Human-in-the-loop"}
                    </span>
                  </span>
                  <span className="mode-switch-track" aria-hidden="true">
                    <span className="mode-switch-thumb" />
                  </span>
                </label>
              </div>
              {showOptionalSeedFields ? (
                <div className="form-row">
                  <label>
                    Industry
                    <input
                      value={formState.industry}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          industry: event.target.value,
                        }))
                      }
                      placeholder="Retail"
                    />
                  </label>
                  <label>
                    Address
                    <input
                      value={formState.address}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      placeholder="San Francisco, CA"
                    />
                  </label>
                </div>
              ) : null}
              {modalMessage ? (
                <p className="status-line status-error">{modalMessage}</p>
              ) : null}
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hero-button"
                  disabled={busyAction === "create-run"}
                >
                  {busyAction === "create-run" ? "Submitting..." : "Launch Run"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {tooltip.visible ? (
        <div
          className="live-tooltip"
          role="tooltip"
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          {tooltip.text}
        </div>
      ) : null}
    </main>
  );
}

function AssetsTable({
  tab,
  assets,
  allAssets,
  traces,
  expandedAssetID,
  expandedDomainGroups,
  domainFiltersActive,
  sort,
  onSortChange,
  onToggleDetails,
  onToggleDomainGroup,
  onOpenTrace,
}: {
  tab: AssetTableTab;
  assets: LiveAssetRow[];
  allAssets: LiveAssetRow[];
  traces: LiveTrace[];
  expandedAssetID: string;
  expandedDomainGroups: Set<string>;
  domainFiltersActive: boolean;
  sort: AssetSortState;
  onSortChange: (key: AssetSortKey) => void;
  onToggleDetails: (assetID: string) => void;
  onToggleDomainGroup: (groupKey: string) => void;
  onOpenTrace: (assetID: string) => void;
}) {
  const traceForAsset = (assetID: string) =>
    traces.find((trace) => trace.asset_id === assetID) ?? null;
  const sortKeys = sortKeysForTab(tab);
  const domainGroups =
    tab === "domains"
      ? buildDomainGroups(assets, filterAssetsByTab(allAssets, "domains"))
      : [];

  return (
    <table className={`asset-table asset-table-${tab}`}>
      <thead>
        <tr>
          {tab === "domains" ? <th className="group-toggle-header" /> : null}
          {sortKeys.map((key) => (
            <th key={key}>
              <button
                type="button"
                className="sort-button"
                data-tooltip={assetSortTooltips[key]}
                onClick={() => onSortChange(key)}
              >
                {sortLabelForKey(sort, key)}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tab === "domains"
          ? domainGroups.map((group) => {
              const summaryAsset = group.summaryAsset ?? group.rows[0] ?? null;
              if (!summaryAsset) {
                return null;
              }

              const summaryTrace = traceForAsset(summaryAsset.asset_id);
              const childAssets = group.rows.filter(
                (asset) => asset.asset_id !== summaryAsset.asset_id,
              );
              const groupExpanded =
                domainFiltersActive || expandedDomainGroups.has(group.key);
              const summaryExpanded = expandedAssetID === summaryAsset.asset_id;

              return (
                <DomainGroupRows
                  key={group.key}
                  group={group}
                  childAssets={childAssets}
                  groupExpanded={groupExpanded}
                  groupExpansionLocked={domainFiltersActive}
                  summaryAsset={summaryAsset}
                  summaryExpanded={summaryExpanded}
                  summaryTrace={summaryTrace}
                  onToggleGroup={() => onToggleDomainGroup(group.key)}
                  onToggleDetails={() => onToggleDetails(summaryAsset.asset_id)}
                  onOpenTrace={() => onOpenTrace(summaryAsset.asset_id)}
                  traceForAsset={traceForAsset}
                  expandedAssetID={expandedAssetID}
                  onToggleAssetDetails={onToggleDetails}
                  onOpenAssetTrace={onOpenTrace}
                />
              );
            })
          : assets.map((asset) => {
              const sharedProps = {
                asset,
                isExpanded: expandedAssetID === asset.asset_id,
                summary: assetSummaryText(asset),
                trace: traceForAsset(asset.asset_id),
                onToggle: () => onToggleDetails(asset.asset_id),
                onOpenTrace: () => onOpenTrace(asset.asset_id),
              };

              if (tab === "ips") {
                return <IPAddressRow key={asset.asset_id} {...sharedProps} />;
              }
              return <AllAssetRow key={asset.asset_id} {...sharedProps} />;
            })}
      </tbody>
    </table>
  );
}

function DomainGroupRows({
  group,
  childAssets,
  groupExpanded,
  groupExpansionLocked,
  summaryAsset,
  summaryExpanded,
  summaryTrace,
  onToggleGroup,
  onToggleDetails,
  onOpenTrace,
  traceForAsset,
  expandedAssetID,
  onToggleAssetDetails,
  onOpenAssetTrace,
}: {
  group: DomainGroup;
  childAssets: LiveAssetRow[];
  groupExpanded: boolean;
  groupExpansionLocked: boolean;
  summaryAsset: LiveAssetRow;
  summaryExpanded: boolean;
  summaryTrace: LiveTrace | null;
  onToggleGroup: () => void;
  onToggleDetails: () => void;
  onOpenTrace: () => void;
  traceForAsset: (assetID: string) => LiveTrace | null;
  expandedAssetID: string;
  onToggleAssetDetails: (assetID: string) => void;
  onOpenAssetTrace: (assetID: string) => void;
}) {
  return (
    <>
      <tr
        className={`domain-group-row ${summaryExpanded ? "is-expanded" : ""}`}
      >
        <td className="group-toggle-cell">
          <button
            type="button"
            className="group-toggle"
            aria-expanded={groupExpanded}
            aria-label={`${groupExpanded ? "Collapse" : "Expand"} ${group.key}`}
            onClick={onToggleGroup}
            disabled={groupExpansionLocked}
          >
            {groupExpanded ? "▼" : "▶"}
          </button>
        </td>
        <td>
          <AssetIdentityCell
            asset={summaryAsset}
            isExpanded={summaryExpanded}
            summary={assetSummaryText(summaryAsset)}
            onToggle={onToggleDetails}
            onOpenTrace={onOpenTrace}
          />
        </td>
        <td>{humanizeToken(summaryAsset.domain_kind, "Domain")}</td>
        <td>
          <OwnershipPill value={summaryAsset.ownership_state} />
        </td>
        <td>{humanizeToken(summaryAsset.resolution_status, "Pending")}</td>
        <td>
          <SourcePills value={summaryAsset.source} />
        </td>
        <td>{humanizeToken(summaryAsset.status, "Unknown")}</td>
        <td>{formatDate(summaryAsset.discovery_date)}</td>
      </tr>
      {summaryExpanded ? (
        <tr className="detail-row">
          <td colSpan={8}>
            <div id={`asset-detail-${summaryAsset.asset_id}`}>
              <AssetDetailPanel
                asset={summaryAsset}
                trace={summaryTrace}
                onOpenTrace={onOpenTrace}
              />
            </div>
          </td>
        </tr>
      ) : null}
      {groupExpanded
        ? childAssets.map((asset) => (
            <DomainChildRow
              key={asset.asset_id}
              asset={asset}
              isExpanded={expandedAssetID === asset.asset_id}
              summary={assetSummaryText(asset)}
              trace={traceForAsset(asset.asset_id)}
              onToggle={() => onToggleAssetDetails(asset.asset_id)}
              onOpenTrace={() => onOpenAssetTrace(asset.asset_id)}
            />
          ))
        : null}
    </>
  );
}

function AllAssetRow(props: SharedAssetRowProps) {
  const { asset, isExpanded, trace, onToggle, onOpenTrace, summary } = props;

  return (
    <>
      <tr className={isExpanded ? "is-expanded" : ""}>
        <td>
          <AssetIdentityCell
            asset={asset}
            isExpanded={isExpanded}
            summary={summary}
            onToggle={onToggle}
            onOpenTrace={onOpenTrace}
          />
        </td>
        <td>{humanizeToken(asset.asset_type, "Unknown")}</td>
        <td>
          <OwnershipPill value={asset.ownership_state} />
        </td>
        <td>
          <SourcePills value={asset.source} />
        </td>
        <td>{formatDate(asset.discovery_date)}</td>
      </tr>
      {isExpanded ? (
        <tr className="detail-row">
          <td colSpan={5}>
            <div id={`asset-detail-${asset.asset_id}`}>
              <AssetDetailPanel
                asset={asset}
                trace={trace}
                onOpenTrace={onOpenTrace}
              />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function DomainChildRow(props: SharedAssetRowProps) {
  const { asset, isExpanded, trace, onToggle, onOpenTrace, summary } = props;

  return (
    <>
      <tr className={`domain-child-row ${isExpanded ? "is-expanded" : ""}`}>
        <td className="group-toggle-spacer" />
        <td>
          <AssetIdentityCell
            asset={asset}
            isExpanded={isExpanded}
            summary={summary}
            onToggle={onToggle}
            onOpenTrace={onOpenTrace}
            className="asset-identifier-stack nested"
          />
        </td>
        <td>{humanizeToken(asset.domain_kind, "Domain")}</td>
        <td>
          <OwnershipPill value={asset.ownership_state} />
        </td>
        <td>{humanizeToken(asset.resolution_status, "Pending")}</td>
        <td>
          <SourcePills value={asset.source} />
        </td>
        <td>{humanizeToken(asset.status, "Unknown")}</td>
        <td>{formatDate(asset.discovery_date)}</td>
      </tr>
      {isExpanded ? (
        <tr className="detail-row">
          <td colSpan={8}>
            <div id={`asset-detail-${asset.asset_id}`}>
              <AssetDetailPanel
                asset={asset}
                trace={trace}
                onOpenTrace={onOpenTrace}
              />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function IPAddressRow(props: SharedAssetRowProps) {
  const { asset, isExpanded, trace, onToggle, onOpenTrace, summary } = props;

  return (
    <>
      <tr className={isExpanded ? "is-expanded" : ""}>
        <td>
          <AssetIdentityCell
            asset={asset}
            isExpanded={isExpanded}
            summary={summary}
            onToggle={onToggle}
            onOpenTrace={onOpenTrace}
          />
        </td>
        <td>
          <OwnershipPill value={asset.ownership_state} />
        </td>
        <td>{asset.asn ? String(asset.asn) : "n/a"}</td>
        <td data-tooltip={tooltipIfNeeded(asset.organization || "", 32)}>
          {asset.organization || "n/a"}
        </td>
        <td data-tooltip={tooltipIfNeeded(asset.ptr || "", 32)}>
          {asset.ptr || "n/a"}
        </td>
        <td>
          <SourcePills value={asset.source} />
        </td>
        <td>{humanizeToken(asset.status, "Unknown")}</td>
        <td>{formatDate(asset.discovery_date)}</td>
      </tr>
      {isExpanded ? (
        <tr className="detail-row">
          <td colSpan={8}>
            <div id={`asset-detail-${asset.asset_id}`}>
              <AssetDetailPanel
                asset={asset}
                trace={trace}
                onOpenTrace={onOpenTrace}
              />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

type SharedAssetRowProps = {
  asset: LiveAssetRow;
  isExpanded: boolean;
  summary: string;
  trace: LiveTrace | null;
  onToggle: () => void;
  onOpenTrace: () => void;
};

function AssetIdentityCell({
  asset,
  isExpanded,
  summary,
  onToggle,
  onOpenTrace,
  className,
}: {
  asset: LiveAssetRow;
  isExpanded: boolean;
  summary: string;
  onToggle: () => void;
  onOpenTrace: () => void;
  className?: string;
}) {
  return (
    <div className={className || "asset-identifier-stack"}>
      <button
        type="button"
        className={`identifier-trigger ${isExpanded ? "is-expanded" : ""}`}
        aria-expanded={isExpanded}
        aria-controls={`asset-detail-${asset.asset_id}`}
        aria-label={`${isExpanded ? "Hide details for" : "Show details for"} ${asset.identifier}`}
        onClick={onToggle}
        data-tooltip={tooltipIfNeeded(asset.identifier, 34)}
      >
        <strong>{asset.identifier}</strong>
      </button>
      <span
        className="table-subcopy"
        data-tooltip={tooltipIfNeeded(summary, 88)}
      >
        {summary}
      </span>
      <div className="row-actions">
        <button type="button" className="inline-link" onClick={onOpenTrace}>
          Open trace
        </button>
      </div>
    </div>
  );
}

function AssetDetailPanel({
  asset,
  trace,
  onOpenTrace,
}: {
  asset: LiveAssetRow;
  trace: LiveTrace | null;
  onOpenTrace: () => void;
}) {
  const detailPairs = parseAssetDetails(asset.details).filter(
    (pair) => pair.label !== "Ownership" && pair.label !== "Reason",
  );
  const evidenceGroups = asset.evidence_groups ?? [];
  const related = trace?.related ?? [];

  return (
    <div className="detail-grid">
      <article className="detail-card">
        <p className="eyebrow">Inline Summary</p>
        <h3>{asset.identifier}</h3>
        <p className="detail-reason">
          {asset.inclusion_reason ||
            "No inclusion reason was exported for this asset."}
        </p>
        <div className="badge-row">
          <span className="pill">
            {humanizeToken(asset.asset_type, "Unknown")}
          </span>
          {asset.registrable_domain ? (
            <span className="pill pill-subtle">{asset.registrable_domain}</span>
          ) : null}
          {asset.domain_kind ? (
            <span className="pill pill-subtle">
              {humanizeToken(asset.domain_kind)}
            </span>
          ) : null}
          {asset.resolution_status ? (
            <span className="pill pill-subtle">
              {humanizeToken(asset.resolution_status)}
            </span>
          ) : null}
          {asset.ptr ? (
            <span className="pill pill-subtle">{asset.ptr}</span>
          ) : null}
          <OwnershipPill value={asset.ownership_state} />
        </div>
        <div className="detail-meta">
          <span>
            <strong>Enumeration</strong> {asset.enumeration_id || "-"}
          </span>
          <span>
            <strong>Seed</strong> {asset.seed_id || "-"}
          </span>
          <span>
            <strong>Status</strong> {humanizeToken(asset.status, "Unknown")}
          </span>
          {asset.asn ? (
            <span>
              <strong>ASN</strong> {asset.asn}
            </span>
          ) : null}
          {asset.organization ? (
            <span>
              <strong>Organization</strong> {asset.organization}
            </span>
          ) : null}
        </div>
        <div className="detail-source-grid">
          <div>
            <strong>Sources</strong>
            <SourcePills value={asset.source} />
          </div>
          {asset.discovered_by ? (
            <div>
              <strong>Discovered By</strong>
              <SourcePills value={asset.discovered_by} />
            </div>
          ) : null}
          {asset.enriched_by ? (
            <div>
              <strong>Enriched By</strong>
              <SourcePills value={asset.enriched_by} />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="ghost-button compact"
          onClick={onOpenTrace}
        >
          Open Trace View
        </button>
      </article>

      <article className="detail-card">
        <p className="eyebrow">Evidence Preview</p>
        <h3>Exported detail</h3>
        {evidenceGroups.length > 0 ? (
          <div className="evidence-groups">
            {evidenceGroups.map((group) => (
              <section key={group.title} className="evidence-group">
                <strong>{group.title || "Evidence"}</strong>
                <ul>
                  {(group.items ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : detailPairs.length > 0 ? (
          <ul className="detail-pair-list">
            {detailPairs.slice(0, 6).map((pair) => (
              <li key={`${pair.label}:${pair.value}`}>
                <span>{pair.label}</span>
                <strong>{pair.value}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-copy">
            No additional evidence preview was exported for this asset.
          </p>
        )}
      </article>

      <article className="detail-card">
        <p className="eyebrow">Trace Context</p>
        <h3>{trace?.nodes?.length ?? 0} trace nodes</h3>
        <p className="panel-copy">
          {trace?.contributors?.length ?? 0} contributor
          {trace?.contributors?.length === 1 ? "" : "s"} and {related.length}{" "}
          related asset
          {related.length === 1 ? "" : "s"} exported for this asset.
        </p>
        <ul className="trace-node-list compact-list">
          {(trace?.nodes ?? []).slice(0, 4).map((node) => (
            <li key={node.id}>
              <strong>{node.label}</strong>
              <span>{node.subtitle || node.kind || "node"}</span>
            </li>
          ))}
        </ul>
        {related.length > 0 ? (
          <div className="related-list">
            {related.slice(0, 3).map((link) => (
              <span
                key={link.asset_id}
                className="pill pill-subtle"
                data-tooltip={link.description}
              >
                {link.identifier}
              </span>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  );
}

function TraceExplorer({
  trace,
  asset,
  selectedNode,
  selectedNodeID,
  onSelectNode,
  onOpenTrace,
}: {
  trace: LiveTrace | null;
  asset: LiveAssetRow | null;
  selectedNode: TraceNode | null;
  selectedNodeID: string;
  onSelectNode: (nodeID: string) => void;
  onOpenTrace: (assetID: string) => void;
}) {
  const children = buildTraceChildren(trace);
  const summaryPills = buildTraceSummaryPills(trace, asset);
  const summaryStats = buildTraceSummaryStats(trace);
  const sections = trace?.sections ?? [];
  const related = trace?.related ?? [];

  return (
    <div className="trace-explorer">
      <article className="trace-card trace-summary-card">
        <p className="eyebrow">Trace Summary</p>
        <h3>{trace?.identifier || asset?.identifier || "Unknown asset"}</h3>
        <div className="badge-row">
          {summaryPills.map((pill) => (
            <span key={pill} className="pill pill-subtle">
              {pill}
            </span>
          ))}
        </div>
        {summaryStats.length > 0 ? (
          <div className="trace-stat-row">
            {summaryStats.map((stat) => (
              <span key={stat} className="pill">
                {stat}
              </span>
            ))}
          </div>
        ) : null}
        <section className="trace-section-stack">
          {sections.length > 0 ? (
            sections.slice(0, 4).map((section) => (
              <article key={section.title} className="trace-section-card">
                <strong>{section.title}</strong>
                <ul>
                  {(section.items ?? []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))
          ) : (
            <p className="empty-copy">
              Trace sections will appear here as checkpoint snapshots refresh.
            </p>
          )}
        </section>
      </article>

      <div className="trace-workspace-live">
        <aside className="trace-tree-shell-live">
          <div className="subsection-heading">
            <h3>Trace Tree</h3>
            <span>{trace?.nodes?.length ?? 0}</span>
          </div>
          {(trace?.nodes ?? []).length > 0 ? (
            <div className="trace-tree-list">
              <TraceTreeBranch
                children={children}
                parentID="__root__"
                selectedNodeID={selectedNodeID}
                onSelectNode={onSelectNode}
                depth={0}
              />
            </div>
          ) : (
            <p className="empty-copy">
              No trace nodes were exported for this asset yet.
            </p>
          )}
        </aside>

        <section className="trace-panel-shell-live">
          <div className="subsection-heading">
            <h3>Node Details</h3>
            <span>
              {selectedNode
                ? humanizeToken(selectedNode.kind, "Node")
                : "Select a node"}
            </span>
          </div>
          {selectedNode ? (
            <TraceNodeDetailsCard node={selectedNode} />
          ) : (
            <p className="empty-copy">
              Select a node to inspect its exported properties and evidence.
            </p>
          )}
        </section>
      </div>

      <article className="trace-card">
        <div className="subsection-heading">
          <h3>Related Assets</h3>
          <span>{related.length}</span>
        </div>
        {related.length > 0 ? (
          <div className="related-grid">
            {related.map((link) => (
              <button
                key={link.asset_id}
                type="button"
                className="ghost-button related-trace-card"
                onClick={() => onOpenTrace(link.asset_id)}
              >
                <strong>{link.identifier}</strong>
                <span>{link.label}</span>
                {link.description ? <small>{link.description}</small> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-copy">
            No related assets were linked for this trace snapshot.
          </p>
        )}
      </article>
    </div>
  );
}

function TraceTreeBranch({
  children,
  parentID,
  selectedNodeID,
  onSelectNode,
  depth,
}: {
  children: Map<string, TraceNode[]>;
  parentID: string;
  selectedNodeID: string;
  onSelectNode: (nodeID: string) => void;
  depth: number;
}) {
  const nodes = children.get(parentID) ?? [];
  return (
    <>
      {nodes.map((node) => (
        <div
          key={node.id}
          className="trace-tree-node"
          style={{ ["--trace-depth" as string]: String(depth) }}
        >
          <button
            type="button"
            className={`trace-node-button ${node.id === selectedNodeID ? "is-active" : ""}`}
            onClick={() => onSelectNode(node.id)}
          >
            <span className="trace-node-copy">
              <strong>{node.label}</strong>
              <span>{node.subtitle || humanizeToken(node.kind, "Node")}</span>
            </span>
            <span className="trace-node-badges">
              {[
                node.kind ? humanizeToken(node.kind) : "",
                ...(node.badges ?? []),
              ]
                .filter(Boolean)
                .slice(0, 2)
                .map((badge) => (
                  <span key={badge} className="pill pill-subtle">
                    {badge}
                  </span>
                ))}
            </span>
          </button>
          {(children.get(node.id) ?? []).length > 0 ? (
            <div className="trace-tree-children">
              <TraceTreeBranch
                children={children}
                parentID={node.id}
                selectedNodeID={selectedNodeID}
                onSelectNode={onSelectNode}
                depth={depth + 1}
              />
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}

function TraceNodeDetailsCard({ node }: { node: TraceNode }) {
  const meta = [
    node.kind ? humanizeToken(node.kind) : "",
    node.linked_asset_id ? `Asset ${node.linked_asset_id}` : "",
    node.linked_observation_id
      ? `Observation ${node.linked_observation_id}`
      : "",
    node.linked_relation_id ? `Relation ${node.linked_relation_id}` : "",
  ].filter(Boolean);

  return (
    <div className="trace-node-detail-stack">
      <article className="trace-card">
        <h4>{node.label}</h4>
        <p className="panel-copy">
          {node.subtitle || "No subtitle exported for this node."}
        </p>
        <div className="badge-row">
          {meta.map((value) => (
            <span key={value} className="pill pill-subtle">
              {value}
            </span>
          ))}
        </div>
      </article>
      {(node.details ?? []).length > 0 ? (
        (node.details ?? []).map((section) => (
          <article key={section.title} className="trace-card">
            <h4>{section.title}</h4>
            {(section.items ?? []).length > 0 ? (
              <ul className="trace-node-detail-list">
                {(section.items ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-copy">No exported items.</p>
            )}
          </article>
        ))
      ) : (
        <article className="trace-card">
          <h4>No Details</h4>
          <p className="empty-copy">
            This node does not include additional exported details.
          </p>
        </article>
      )}
    </div>
  );
}

function JudgeAnalysisPanel({
  judgeSummary,
}: {
  judgeSummary: LiveJudgeSummary;
}) {
  const groups = judgeSummary.groups ?? [];

  return (
    <div className="judge-analysis-stack">
      <div className="judge-analysis-summary">
        <span className="pill">Accepted {judgeSummary.accepted_count}</span>
        <span className="pill">Discarded {judgeSummary.discarded_count}</span>
      </div>
      {groups.length > 0 ? (
        groups.map((group) => (
          <JudgeGroupCard key={buildJudgeGroupKey(group)} group={group} />
        ))
      ) : (
        <p className="empty-copy">
          No judge evaluations were captured for this run.
        </p>
      )}
    </div>
  );
}

function JudgeGroupCard({ group }: { group: JudgeGroup }) {
  const accepted = group.accepted ?? [];
  const discarded = group.discarded ?? [];

  return (
    <article className="judge-group-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Judge Group</p>
          <h3>{humanizeToken(group.collector, "Judge")}</h3>
          <p className="panel-copy">
            {group.seed_label || group.seed_id || "Unknown seed"}
            {group.scenario ? ` · ${humanizeToken(group.scenario)}` : ""}
          </p>
        </div>
        <div className="badge-row">
          {group.seed_domains?.map((domain) => (
            <span key={domain} className="pill pill-subtle">
              {domain}
            </span>
          ))}
        </div>
      </div>
      <div className="judge-columns">
        <section className="judge-column">
          <div className="subsection-heading">
            <h4>Accepted</h4>
            <span>{accepted.length}</span>
          </div>
          {accepted.length > 0 ? (
            accepted.map((candidate) => (
              <JudgeCandidateCard
                key={`accepted:${candidate.root}`}
                candidate={candidate}
                accepted
              />
            ))
          ) : (
            <p className="empty-copy">No accepted candidates in this group.</p>
          )}
        </section>
        <section className="judge-column">
          <div className="subsection-heading">
            <h4>Discarded</h4>
            <span>{discarded.length}</span>
          </div>
          {discarded.length > 0 ? (
            discarded.map((candidate) => (
              <JudgeCandidateCard
                key={`discarded:${candidate.root}`}
                candidate={candidate}
                accepted={false}
              />
            ))
          ) : (
            <p className="empty-copy">No discarded candidates in this group.</p>
          )}
        </section>
      </div>
    </article>
  );
}

function JudgeCandidateCard({
  candidate,
  accepted,
}: {
  candidate: JudgeCandidate;
  accepted: boolean;
}) {
  return (
    <article className="judge-candidate-card">
      <div className="audit-header">
        <strong>{candidate.root}</strong>
        <span
          className={`status-pill ${accepted ? "status-accepted" : "status-rejected"}`}
        >
          {accepted ? "Accepted" : "Discarded"}
        </span>
      </div>
      <p>{candidate.reason || "No reason was returned for this candidate."}</p>
      <div className="badge-row">
        {candidate.kind ? (
          <span className="pill pill-subtle">
            {humanizeToken(candidate.kind)}
          </span>
        ) : null}
        {typeof candidate.confidence === "number" ? (
          <span className="pill pill-subtle">
            Confidence {candidate.confidence.toFixed(2)}
          </span>
        ) : null}
        <span className="pill pill-subtle">
          {candidate.explicit ? "Explicit" : "Implicit"}
        </span>
      </div>
      {(candidate.support ?? []).length > 0 ? (
        <ul className="trace-node-detail-list">
          {(candidate.support ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function SourcePills({ value }: { value: string | undefined }) {
  const sources = splitSources(value);
  if (sources.length === 0) {
    return <span className="muted-inline">n/a</span>;
  }

  return (
    <div className="source-list">
      {sources.map((source) => (
        <span
          key={source}
          className="pill source-pill tooltip-pill"
          data-tooltip={describeSource(source)}
        >
          {source}
        </span>
      ))}
    </div>
  );
}

function OwnershipPill({ value }: { value: string | undefined }) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  const tone = normalized
    ? ` ownership-${normalized.replaceAll("_", "-")}`
    : "";
  return (
    <span
      className={`pill ownership-pill tooltip-pill${tone}`}
      data-tooltip={describeOwnership(value)}
    >
      {humanizeToken(value, "Unclassified")}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function buildCreateRunPayload(formState: RunFormState): CreateRunPayload {
  const domains = parseDelimitedValues(formState.domains);

  return {
    mode: formState.mode,
    seeds: [
      {
        company_name: formState.companyName.trim() || undefined,
        domains,
        address: formState.address.trim() || undefined,
        industry: formState.industry.trim() || undefined,
      },
    ],
  };
}

function validateCreateRunPayload(payload: CreateRunPayload): string {
  const firstSeed = payload.seeds[0];
  if (!firstSeed) {
    return "Add at least one seed before launching the run.";
  }
  if (!firstSeed.company_name && (firstSeed.domains?.length ?? 0) === 0) {
    return "Enter a company name or at least one domain.";
  }
  return "";
}

function sameRoute(left: LiveRouteState, right: LiveRouteState): boolean {
  return (
    left.runID === right.runID &&
    left.view === right.view &&
    left.assetTab === right.assetTab &&
    left.assetID === right.assetID &&
    left.pivotID === right.pivotID
  );
}

function resolveTraceTargetID(
  view: LiveView,
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

function buildTraceOptions(
  assets: LiveAssetRow[],
  traces: LiveTrace[],
): Array<{ asset_id: string; identifier: string }> {
  const options = new Map<string, { asset_id: string; identifier: string }>();
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

function emptyJudgeSummary(): LiveJudgeSummary {
  return {
    evaluation_count: 0,
    accepted_count: 0,
    discarded_count: 0,
    groups: [],
  };
}

function resolveInitialTraceNodeID(trace: LiveTrace | null): string {
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

function findTraceNode(
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

function buildTraceChildren(trace: LiveTrace | null): Map<string, TraceNode[]> {
  const children = new Map<string, TraceNode[]>();
  (trace?.nodes ?? []).forEach((node) => {
    const parentKey = node.parent_id || "__root__";
    const existing = children.get(parentKey) ?? [];
    existing.push(node);
    children.set(parentKey, existing);
  });
  return children;
}

function buildTraceSummaryPills(
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

function buildTraceSummaryStats(trace: LiveTrace | null): string[] {
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

function uniqueContributorValues(
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

function buildJudgeGroupKey(group: JudgeGroup): string {
  return [
    group.collector,
    group.seed_id,
    group.seed_label,
    group.scenario,
    (group.seed_domains ?? []).join(","),
  ].join("::");
}

function comparePivots(left: LivePivotRecord, right: LivePivotRecord): number {
  const scoreDiff =
    (right.recommendation_score ?? 0) - (left.recommendation_score ?? 0);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }
  return Date.parse(right.updated_at) - Date.parse(left.updated_at);
}

function findTooltipElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const matched = target.closest<HTMLElement>("[data-tooltip]");
  return matched && document.body.contains(matched) ? matched : null;
}

function showTooltip(
  element: HTMLElement,
  setTooltip: (
    updater: TooltipState | ((current: TooltipState) => TooltipState),
  ) => void,
) {
  const text = element.dataset.tooltip;
  if (!text) {
    return;
  }
  const rect = element.getBoundingClientRect();
  setTooltip({
    visible: true,
    text,
    left: rect.left + rect.width / 2,
    top: rect.bottom + 12,
  });
}

function hideTooltip(
  setTooltip: (
    updater: TooltipState | ((current: TooltipState) => TooltipState),
  ) => void,
) {
  setTooltip((current) => (current.visible ? hiddenTooltip : current));
}

function tooltipIfNeeded(value: string, limit: number): string | undefined {
  return value.length > limit ? value : undefined;
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return "Pending";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatScore(score: number | undefined): string {
  if (typeof score !== "number") {
    return "No score";
  }
  return `${Math.round(score * 100)}% confidence`;
}

function formatStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function formatRunSelectorLabel(run: LiveRunRecord): string {
  return run.id;
}

function sessionLabel(session: LiveAuthSession): string {
  return (
    session.displayName?.trim() || session.email.split("@")[0] || session.email
  );
}

function sessionInitials(session: LiveAuthSession): string {
  const label = session.displayName?.trim() || session.email;
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function readDrawerPreference(): boolean {
  return window.localStorage.getItem(drawerPreferenceKey) === "true";
}

function isCompactViewport(): boolean {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 1100px)").matches
    : false;
}

function iconForView(view: LiveView) {
  if (view === "trace") {
    return <TraceIcon />;
  }
  if (view === "pivots") {
    return <PivotIcon />;
  }
  if (view === "activity") {
    return <ActivityIcon />;
  }
  return <AssetsIcon />;
}

function DrawerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="5" width="15" height="14" rx="2.5" />
      <path d="M11 5v14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function AssetsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v14H4z" />
      <path d="M9 5v14M4 10h16" />
    </svg>
  );
}

function TraceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.5 11l7-4M8.5 13l7 4" />
    </svg>
  );
}

function PivotIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 5v14" />
      <path d="M7 12h10" />
      <path d="M13 8l4 4-4 4" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 17h3l3-10 4 14 2-7h4" />
    </svg>
  );
}
