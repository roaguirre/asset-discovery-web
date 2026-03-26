import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { isAllowlistedEmail } from "../core/allowlist";
import {
  buildDomainGroups,
  compareAssetRows,
  defaultAssetSort,
  defaultDomainFilters,
  displayedDomainRowCount,
  filterAssets,
  filterAssetsByTab,
  hasActiveDomainFilters,
  normalizeAssetSort,
  toggleAssetSort,
  uniqueAssetValues,
  uniqueSourceValues,
  type AssetSortKey,
  type AssetSortState,
  type AssetTableTab,
  type DomainFilterState,
} from "../core/assetTable";
import type { LiveAppDeps } from "../ports";
import { buildLiveHash, emptyLiveRoute, parseLiveHash } from "../core/navigation";
import { partitionPivots } from "../core/pivotModel";
import {
  buildCreateRunPayload,
  hasSeedIdentityInput,
  initialRunFormState,
  validateCreateRunPayload,
  type RunFormState,
} from "../core/runForm";
import {
  buildTraceOptions as buildTraceSelectionOptions,
  findTraceNode,
  resolveInitialTraceNodeID,
  resolveTraceTargetID,
} from "../core/traceModel";
import type {
  LiveAssetRow,
  LiveAuthSession,
  LiveEventRecord,
  LiveJudgeSummary,
  LivePivotRecord,
  LiveRouteState,
  LiveRunRecord,
  LiveTrace,
  LiveView,
} from "../core/types";
import { formatRunSelectorLabel } from "../ui/formatters";
import { viewLabels } from "../ui/viewLabels";

const drawerPreferenceKey = "asset-discovery-live:drawer-collapsed";

/**
 * useWorkspace centralizes workspace bootstrapping, hash sync, run-scoped
 * subscriptions, async mutations, and shell UI state behind one controller
 * interface for the top-level app shell.
 */
export function useWorkspace(deps: LiveAppDeps) {
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
  const [formState, setFormState] = useState<RunFormState>(initialRunFormState);
  const [message, setMessage] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [downloadAction, setDownloadAction] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCollapsed, setDrawerCollapsed] = useState(readDrawerPreference);
  const [compactViewport, setCompactViewport] = useState(() =>
    isCompactViewport(),
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [runMenuOpen, setRunMenuOpen] = useState(false);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [pivotPanelTab, setPivotPanelTab] = useState<"review" | "judge">(
    "review",
  );
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
  const domainFiltersActive =
    activeAssetTab === "domains"
      ? hasActiveDomainFilters(deferredAssetSearch, domainFilters)
      : false;
  const displayedAssetCount =
    activeAssetTab === "domains"
      ? displayedDomainRowCount(
          buildDomainGroups(visibleAssets, allDomainAssets),
          expandedDomainGroups,
          domainFiltersActive,
        )
      : visibleAssets.length;
  const { pending: pendingPivots, audit: auditPivots } = partitionPivots(pivots);
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
  const traceOptions = buildTraceSelectionOptions(assets, traces);
  const availableDomainKinds = uniqueAssetValues(
    allDomainAssets,
    "domain_kind",
  );
  const availableResolutionStatuses = uniqueAssetValues(
    allDomainAssets,
    "resolution_status",
  );
  const availableDomainSources = uniqueSourceValues(allDomainAssets);
  const viewItems = [
    { view: "assets" as LiveView, label: viewLabels.assets, count: assets.length },
    { view: "trace" as LiveView, label: viewLabels.trace, count: assets.length },
    {
      view: "pivots" as LiveView,
      label: viewLabels.pivots,
      count: pendingPivots.length + auditPivots.length,
    },
    {
      view: "activity" as LiveView,
      label: viewLabels.activity,
      count: events.length,
    },
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
  const sessionRestricted =
    session != null &&
    (!session.emailVerified || !isAllowlistedEmail(session.email));
  const workspaceBootstrapping =
    session != null &&
    !sessionRestricted &&
    (!runsHydrated || (runs.length > 0 && selectedRun == null));

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
      setFormState(initialRunFormState);
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

  async function performPivotDecision(
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

  async function performSignIn() {
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

  async function performSignOut() {
    setBusyAction("sign-out");
    try {
      await deps.signOut();
    } finally {
      setBusyAction("");
    }
  }

  async function performDownloadArtifact(label: string, downloadPath: string) {
    const openedWindow = window.open("", "_blank");
    if (openedWindow) {
      openedWindow.opener = null;
    }
    setDownloadAction(downloadPath);
    setMessage("");
    try {
      const url = await deps.resolveRunArtifactURL(downloadPath);
      if (openedWindow && !openedWindow.closed) {
        openedWindow.location.replace(url);
        return;
      }
      window.location.assign(url);
    } catch (error) {
      openedWindow?.close();
      setMessage(
        error instanceof Error
          ? error.message
          : `Failed to open ${label} download.`,
      );
    } finally {
      setDownloadAction("");
    }
  }

  function openCreateModal() {
    setModalMessage("");
    setCreateModalOpen(true);
    setDrawerOpen(false);
    setRunMenuOpen(false);
  }

  function closeCreateModal() {
    setCreateModalOpen(false);
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

  return {
    session,
    authHydrated,
    runs,
    runsHydrated,
    assets,
    traces,
    pivots,
    judgeSummary,
    events,
    route,
    selectedRun,
    activeAssetTab,
    activeAssetSort,
    allDomainAssets,
    visibleAssets,
    domainFiltersActive,
    displayedAssetCount,
    pendingPivots,
    auditPivots,
    traceTargetID,
    selectedTrace,
    selectedTraceAsset,
    selectedTraceNode,
    traceOptions,
    availableDomainKinds,
    availableResolutionStatuses,
    availableDomainSources,
    viewItems,
    runCountsByAssetTab,
    drawerToggleLabel,
    runSelectorLabel,
    sessionRestricted,
    workspaceBootstrapping,
    assetSearch,
    domainFilters,
    expandedAssetID,
    expandedDomainGroups,
    selectedTraceNodeID,
    formState,
    showOptionalSeedFields,
    message,
    modalMessage,
    busyAction,
    downloadAction,
    drawerOpen,
    drawerCollapsed,
    compactViewport,
    createModalOpen,
    accountMenuOpen,
    runMenuOpen,
    sourceMenuOpen,
    pivotPanelTab,
    accountMenuRef,
    runMenuRef,
    sourceMenuRef,
    expandedDrawer,
    setAssetSearch,
    setPivotPanelTab,
    setSelectedTraceNodeID,
    performSignIn,
    performSignOut,
    performDownloadArtifact,
    handleCreateRun,
    openCreateModal,
    closeCreateModal,
    handleSelectRun,
    handleSelectView,
    handleSelectAssetTab,
    handleOpenTrace,
    handleSelectTraceAsset,
    handleSelectPivot,
    handleSortChange,
    handleToggleAssetDetails,
    handleToggleDomainGroup,
    handleToggleSource,
    handleDrawerToggle,
    setDomainKind(value: string) {
      setDomainFilters((current) => ({
        ...current,
        domainKind: value,
      }));
    },
    setResolutionStatus(value: string) {
      setDomainFilters((current) => ({
        ...current,
        resolutionStatus: value,
      }));
    },
    resetSources() {
      setDomainFilters((current) => ({
        ...current,
        sources: [],
      }));
    },
    toggleSourceMenu() {
      setSourceMenuOpen((current) => !current);
    },
    setCompanyName(value: string) {
      setFormState((current) => ({
        ...current,
        companyName: value,
      }));
    },
    setDomains(value: string) {
      setFormState((current) => ({
        ...current,
        domains: value,
      }));
    },
    setIndustry(value: string) {
      setFormState((current) => ({
        ...current,
        industry: value,
      }));
    },
    setAddress(value: string) {
      setFormState((current) => ({
        ...current,
        address: value,
      }));
    },
    setMode(checked: boolean) {
      setFormState((current) => ({
        ...current,
        mode: checked ? "autonomous" : "manual",
      }));
    },
    toggleRunMenu() {
      if (runs.length === 0) {
        return;
      }
      setAccountMenuOpen(false);
      setRunMenuOpen((current) => !current);
    },
    toggleAccountMenu() {
      setRunMenuOpen(false);
      setAccountMenuOpen((current) => !current);
    },
    closeDrawer() {
      setDrawerOpen(false);
    },
    handleSelectTraceNode(nodeID: string) {
      setSelectedTraceNodeID(nodeID);
    },
    handlePivotDecision(pivot: LivePivotRecord, decision: "accepted" | "rejected") {
      void performPivotDecision(pivot, decision);
    },
    handleSignIn() {
      void performSignIn();
    },
    handleSignOut() {
      setAccountMenuOpen(false);
      void performSignOut();
    },
    handleDownloadArtifact(label: string, downloadPath: string) {
      void performDownloadArtifact(label, downloadPath);
    },
  };
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

function emptyJudgeSummary(): LiveJudgeSummary {
  return {
    evaluation_count: 0,
    accepted_count: 0,
    discarded_count: 0,
    groups: [],
  };
}

function readDrawerPreference(): boolean {
  return window.localStorage.getItem(drawerPreferenceKey) === "true";
}

function isCompactViewport(): boolean {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 1100px)").matches
    : false;
}
