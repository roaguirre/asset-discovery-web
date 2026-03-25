import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import LiveApp from "./LiveApp";
import type { LiveAppDeps, Unsubscribe } from "./deps";
import type {
  CreateRunPayload,
  LiveAssetRow,
  LiveAuthSession,
  LiveEventRecord,
  LiveJudgeSummary,
  LivePivotRecord,
  LiveRunRecord,
  LiveTrace,
} from "./types";

class FakeLiveDeps implements LiveAppDeps {
  authSession: LiveAuthSession | null;
  runs: LiveRunRecord[];
  assets: Record<string, LiveAssetRow[]>;
  traces: Record<string, LiveTrace[]>;
  pivots: Record<string, LivePivotRecord[]>;
  judgeSummaries: Record<string, LiveJudgeSummary>;
  events: Record<string, LiveEventRecord[]>;
  authListeners = new Set<(session: LiveAuthSession | null) => void>();
  runListeners = new Set<(runs: LiveRunRecord[]) => void>();
  assetListeners = new Map<string, Set<(assets: LiveAssetRow[]) => void>>();
  traceListeners = new Map<string, Set<(traces: LiveTrace[]) => void>>();
  pivotListeners = new Map<string, Set<(pivots: LivePivotRecord[]) => void>>();
  judgeSummaryListeners = new Map<
    string,
    Set<(summary: LiveJudgeSummary) => void>
  >();
  eventListeners = new Map<string, Set<(events: LiveEventRecord[]) => void>>();
  deferInitialAuth: boolean;
  deferInitialRuns: boolean;
  signInWithGoogle = vi.fn(async () => undefined);
  signOut = vi.fn(async () => undefined);
  getIDToken = vi.fn(async () => "token");
  resolveRunArtifactURL = vi.fn(async (downloadPath: string) => {
    return `https://downloads.test/${encodeURIComponent(downloadPath)}`;
  });
  createRunCalls: CreateRunPayload[] = [];
  decidePivotCalls: Array<{
    runID: string;
    pivotID: string;
    decision: "accepted" | "rejected";
  }> = [];

  constructor(config: {
    authSession?: LiveAuthSession | null;
    runs?: LiveRunRecord[];
    assets?: Record<string, LiveAssetRow[]>;
    traces?: Record<string, LiveTrace[]>;
    pivots?: Record<string, LivePivotRecord[]>;
    judgeSummaries?: Record<string, LiveJudgeSummary>;
    events?: Record<string, LiveEventRecord[]>;
    deferInitialAuth?: boolean;
    deferInitialRuns?: boolean;
  }) {
    this.authSession = config.authSession ?? null;
    this.runs = config.runs ?? [];
    this.assets = config.assets ?? {};
    this.traces = config.traces ?? {};
    this.pivots = config.pivots ?? {};
    this.judgeSummaries = config.judgeSummaries ?? {};
    this.events = config.events ?? {};
    this.deferInitialAuth = config.deferInitialAuth ?? false;
    this.deferInitialRuns = config.deferInitialRuns ?? false;
  }

  subscribeAuth(
    onSession: (session: LiveAuthSession | null) => void,
  ): Unsubscribe {
    this.authListeners.add(onSession);
    if (!this.deferInitialAuth) {
      onSession(this.authSession);
    }
    return () => {
      this.authListeners.delete(onSession);
    };
  }

  subscribeRuns(
    _ownerUID: string,
    onRuns: (runs: LiveRunRecord[]) => void,
  ): Unsubscribe {
    this.runListeners.add(onRuns);
    if (!this.deferInitialRuns) {
      onRuns(this.runs);
    }
    return () => {
      this.runListeners.delete(onRuns);
    };
  }

  subscribeAssets(
    runID: string,
    onAssets: (assets: LiveAssetRow[]) => void,
  ): Unsubscribe {
    return this.addRunListener(
      this.assetListeners,
      runID,
      onAssets,
      this.assets[runID] ?? [],
    );
  }

  subscribeTraces(
    runID: string,
    onTraces: (traces: LiveTrace[]) => void,
  ): Unsubscribe {
    return this.addRunListener(
      this.traceListeners,
      runID,
      onTraces,
      this.traces[runID] ?? [],
    );
  }

  subscribePivots(
    runID: string,
    onPivots: (pivots: LivePivotRecord[]) => void,
  ): Unsubscribe {
    return this.addRunListener(
      this.pivotListeners,
      runID,
      onPivots,
      this.pivots[runID] ?? [],
    );
  }

  subscribeJudgeSummary(
    runID: string,
    onSummary: (summary: LiveJudgeSummary) => void,
  ): Unsubscribe {
    const listeners =
      this.judgeSummaryListeners.get(runID) ??
      new Set<(summary: LiveJudgeSummary) => void>();
    listeners.add(onSummary);
    this.judgeSummaryListeners.set(runID, listeners);
    onSummary(this.judgeSummaries[runID] ?? buildJudgeSummary());
    return () => {
      listeners.delete(onSummary);
    };
  }

  subscribeEvents(
    runID: string,
    onEvents: (events: LiveEventRecord[]) => void,
  ): Unsubscribe {
    return this.addRunListener(
      this.eventListeners,
      runID,
      onEvents,
      this.events[runID] ?? [],
    );
  }

  async createRun(payload: CreateRunPayload): Promise<LiveRunRecord> {
    this.createRunCalls.push(payload);
    const run: LiveRunRecord = {
      id: "run-created",
      owner_uid: this.authSession?.uid ?? "uid-1",
      owner_email: this.authSession?.email ?? "roaguirred@gmail.com",
      mode: payload.mode,
      status: "queued",
      current_wave: 0,
      seed_count: 1,
      enumeration_count: 0,
      asset_count: 0,
      pending_pivot_count: 0,
      judge_evaluation_count: 0,
      judge_accepted_count: 0,
      judge_discarded_count: 0,
      created_at: "2026-03-25T12:00:00Z",
      updated_at: "2026-03-25T12:00:00Z",
    };
    this.emitRuns([run, ...this.runs]);
    return run;
  }

  async decidePivot(
    runID: string,
    pivotID: string,
    decision: "accepted" | "rejected",
  ): Promise<LivePivotRecord> {
    this.decidePivotCalls.push({ runID, pivotID, decision });
    const nextStatus = decision === "accepted" ? "accepted" : "rejected";
    this.pivots[runID] = (this.pivots[runID] ?? []).map((pivot) =>
      pivot.id === pivotID ? { ...pivot, status: nextStatus } : pivot,
    );
    this.pivotListeners
      .get(runID)
      ?.forEach((listener) => listener(this.pivots[runID] ?? []));
    return this.pivots[runID].find(
      (pivot) => pivot.id === pivotID,
    ) as LivePivotRecord;
  }

  /**
   * Pushes the current auth session, or an override, through every auth
   * subscriber so tests can control hydration timing.
   */
  emitAuthSession(session: LiveAuthSession | null = this.authSession): void {
    this.authSession = session;
    this.authListeners.forEach((listener) => listener(session));
  }

  /**
   * Pushes the current runs snapshot, or an override, through every run
   * subscriber so tests can control hydration timing.
   */
  emitRuns(runs: LiveRunRecord[] = this.runs): void {
    this.runs = runs;
    this.runListeners.forEach((listener) => listener(runs));
  }

  private addRunListener<T>(
    registry: Map<string, Set<(value: T[]) => void>>,
    runID: string,
    listener: (value: T[]) => void,
    initial: T[],
  ): Unsubscribe {
    const listeners = registry.get(runID) ?? new Set<(value: T[]) => void>();
    listeners.add(listener);
    registry.set(runID, listeners);
    listener(initial);
    return () => {
      listeners.delete(listener);
    };
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("LiveApp", () => {
  it("renders the sign-in gate and invokes Google sign-in", async () => {
    const deps = new FakeLiveDeps({});
    const user = userEvent.setup();

    render(<LiveApp deps={deps} />);

    await user.click(
      screen.getByRole("button", { name: "Sign In With Google" }),
    );

    expect(deps.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Discovery Console")).toBeInTheDocument();
  });

  it("holds the sign-in gate until auth hydration completes", async () => {
    const deps = new FakeLiveDeps({ deferInitialAuth: true });

    render(<LiveApp deps={deps} />);

    expect(screen.getByText("Preparing Workspace")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Sign In With Google" }),
    ).not.toBeInTheDocument();

    await act(async () => {
      deps.emitAuthSession(null);
    });

    expect(
      await screen.findByRole("button", { name: "Sign In With Google" }),
    ).toBeInTheDocument();
  });

  it("blocks users outside the allowlist", () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-2",
        email: "outsider@example.com",
        emailVerified: true,
      },
    });

    render(<LiveApp deps={deps} />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.getByText("outsider@example.com")).toBeInTheDocument();
  });

  it("keeps the empty-runs panel hidden until the first runs snapshot resolves", () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
      },
      deferInitialRuns: true,
    });

    render(<LiveApp deps={deps} />);

    expect(screen.getByText("Preparing Workspace")).toBeInTheDocument();
    expect(
      screen.queryByText("Select a run or launch a new one."),
    ).not.toBeInTheDocument();
  });

  it("shows the empty-runs panel after an empty first runs snapshot hydrates", async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
      },
      deferInitialRuns: true,
    });

    render(<LiveApp deps={deps} />);

    await act(async () => {
      deps.emitRuns([]);
    });

    expect(
      await screen.findByText("Select a run or launch a new one."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Preparing Workspace")).not.toBeInTheDocument();
  });

  it("goes from the loading gate to the selected run on the first non-empty runs snapshot", async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
      },
      deferInitialRuns: true,
    });

    render(<LiveApp deps={deps} />);

    expect(screen.getByText("Preparing Workspace")).toBeInTheDocument();

    await act(async () => {
      deps.emitRuns([buildRun("run-1")]);
    });

    expect(
      screen.queryByText("Select a run or launch a new one."),
    ).not.toBeInTheDocument();
    expect(await screen.findByText("Selected Run")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "run-1" }),
    ).toBeInTheDocument();
  });

  /**
   * Defaults new runs to autonomous mode and only reveals optional seed metadata
   * after a company or domain seed exists.
   */
  it("opens the new-run modal, validates, and submits a run", async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
        displayName: "Reviewer",
      },
    });
    const user = userEvent.setup();

    render(<LiveApp deps={deps} />);

    await user.click(screen.getByRole("button", { name: "New Run" }));
    expect(screen.getByRole("switch", { name: "✨ AI mode" })).toBeChecked();
    expect(screen.getByText("Fully autonomous")).toBeInTheDocument();
    expect(screen.queryByLabelText("Industry")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Address")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Tags")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Launch Run" }));

    expect(
      screen.getByText("Enter a company name or at least one domain."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Company"), "Example Holdings");
    expect(screen.getByLabelText("Industry")).toBeInTheDocument();
    expect(screen.getByLabelText("Address")).toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Domains"),
      "example.com, api.example.com",
    );
    await user.click(screen.getByRole("button", { name: "Launch Run" }));

    await waitFor(() => expect(deps.createRunCalls).toHaveLength(1));
    expect(deps.createRunCalls[0]).toEqual({
      mode: "autonomous",
      seeds: [
        {
          company_name: "Example Holdings",
          domains: ["example.com", "api.example.com"],
          address: undefined,
          industry: undefined,
        },
      ],
    });
    expect(
      await screen.findByText(/Queued autonomous run run-created\./),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(window.location.hash).toContain("run=run-created"),
    );
    expect(window.location.hash).toContain("view=assets");
  });

  it("restores run and view selection from the hash and keeps them in sync", async () => {
    window.history.replaceState(null, "", "/#run=run-2&view=activity");

    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
        displayName: "Reviewer",
      },
      runs: [
        buildRun("run-1", { updated_at: "2026-03-25T10:10:00Z" }),
        buildRun("run-2", {
          updated_at: "2026-03-25T10:20:00Z",
          status: "completed",
        }),
      ],
      events: {
        "run-2": [
          {
            id: "event-1",
            kind: "checkpoint",
            message: "Reached after_collection_wave at wave 2.",
            created_at: "2026-03-25T10:21:00Z",
          },
        ],
      },
    });
    const user = userEvent.setup();

    render(<LiveApp deps={deps} />);

    expect(await screen.findByText("Activity Feed")).toBeInTheDocument();
    expect(
      screen.getByText("Reached after_collection_wave at wave 2."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Pivots 0/i }));
    await waitFor(() => expect(window.location.hash).toContain("view=pivots"));

    await user.click(screen.getByRole("button", { name: "Select run" }));
    await user.click(screen.getByRole("menuitemradio", { name: /run-1/i }));
    await waitFor(() => expect(window.location.hash).toContain("run=run-1"));
    expect(window.location.hash).toContain("view=assets");
  });

  it("restores the asset tab from the hash and switches between all, domains, and ips", async () => {
    window.history.replaceState(null, "", "/#run=run-1&view=assets&tab=ips");

    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
      },
      runs: [buildRun("run-1")],
      assets: {
        "run-1": [
          buildAsset("asset-domain-1", {
            identifier: "alpha.example.com",
            asset_type: "domain",
            domain_kind: "registrable",
            resolution_status: "resolved",
            source: "dns_collector",
            discovery_date: "2026-03-25T10:10:00Z",
          }),
          buildAsset("asset-domain-2", {
            identifier: "zeta.example.com",
            asset_type: "domain",
            domain_kind: "subdomain",
            resolution_status: "pending",
            source: "web_hint_collector",
            discovery_date: "2026-03-25T10:05:00Z",
          }),
          buildAsset("asset-ip-1", {
            asset_id: "asset-ip-1",
            identifier: "203.0.113.10",
            asset_type: "ip",
            source: "ip_enricher",
            asn: 64500,
            organization: "Example Networks",
            ptr: "edge.example.net",
            discovery_date: "2026-03-25T10:08:00Z",
          }),
        ],
      },
    });
    const user = userEvent.setup();

    render(<LiveApp deps={deps} />);

    expect(await screen.findByRole("tab", { name: /IPs/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("table")).toHaveTextContent("203.0.113.10");
    expect(screen.queryByText("alpha.example.com")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Domains/i }));
    expect(
      await screen.findByRole("columnheader", { name: /Kind/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Resolution/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /ASN/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("alpha.example.com")).toBeInTheDocument();
    expect(screen.queryByText("203.0.113.10")).not.toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toContain("tab=domains"));

    await user.click(screen.getByRole("tab", { name: /^All/i }));
    expect(
      screen.getByRole("columnheader", { name: /Type/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("203.0.113.10")).toBeInTheDocument();
  });

  it("renders grouped domains, domain filters, and the trace explorer", async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
        displayName: "Reviewer",
      },
      runs: [buildRun("run-1")],
      assets: {
        "run-1": [
          buildAsset("asset-domain-1", {
            identifier: "zeta.example.com",
            asset_type: "domain",
            domain_kind: "subdomain",
            resolution_status: "resolved",
            source: "dns_collector, rdap_collector",
            registrable_domain: "example.com",
            discovery_date: "2026-03-25T10:05:00Z",
          }),
          buildAsset("asset-domain-2", {
            identifier: "example.com",
            asset_type: "domain",
            domain_kind: "registrable",
            resolution_status: "pending",
            source: "web_hint_collector",
            registrable_domain: "example.com",
            discovery_date: "2026-03-25T10:10:00Z",
          }),
          buildAsset("asset-domain-3", {
            identifier: "other.com",
            asset_type: "domain",
            domain_kind: "registrable",
            resolution_status: "resolved",
            source: "web_hint_collector",
            registrable_domain: "other.com",
            discovery_date: "2026-03-25T10:11:00Z",
          }),
          buildAsset("asset-ip-1", {
            identifier: "203.0.113.10",
            asset_type: "ip",
            source: "ip_enricher",
            asn: 64500,
            organization: "Example Networks",
            ptr: "edge.example.net",
            discovery_date: "2026-03-25T10:07:00Z",
          }),
          buildAsset("asset-ip-2", {
            identifier: "203.0.113.2",
            asset_type: "ip",
            source: "asn_cidr_collector",
            asn: 64496,
            organization: "Another Networks",
            ptr: "mail.example.net",
            discovery_date: "2026-03-25T10:06:00Z",
          }),
        ],
      },
      traces: {
        "run-1": [
          buildTrace("asset-domain-1", "zeta.example.com"),
          buildTrace("asset-domain-2", "example.com"),
          buildTrace("asset-ip-1", "203.0.113.10"),
        ],
      },
    });
    const user = userEvent.setup();

    render(<LiveApp deps={deps} />);

    const dnsPill = await screen.findByText("dns_collector");
    expect(dnsPill).toHaveAttribute("data-tooltip");
    expect(dnsPill).toHaveClass("tooltip-pill");
    await user.hover(dnsPill);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Direct DNS lookups for the target domain",
    );

    const ownershipPill = screen.getAllByText("Owned")[0];
    expect(ownershipPill).toHaveAttribute("data-tooltip");
    expect(ownershipPill).toHaveClass("tooltip-pill");

    await user.click(screen.getByRole("tab", { name: /Domains/i }));
    expect(await screen.findByText("example.com")).toBeInTheDocument();
    expect(screen.queryByText("zeta.example.com")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /All sources/i }));
    await user.click(screen.getByLabelText("dns_collector"));
    expect(await screen.findByText("zeta.example.com")).toBeInTheDocument();
    expect(screen.queryByText("other.com")).not.toBeInTheDocument();

    const identifierTrigger = screen.getByRole("button", {
      name: /show details for zeta\.example\.com/i,
    });
    expect(identifierTrigger).toHaveAttribute("aria-expanded", "false");
    await user.click(identifierTrigger);
    expect(identifierTrigger).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByText("Inline Summary")).toBeInTheDocument();

    await user.click(
      screen
        .getAllByRole("button", { name: "Open trace" })
        .find((button) =>
          button.closest("tr")?.textContent?.includes("zeta.example.com"),
        ) as HTMLElement,
    );
    expect(await screen.findByText("Trace Focus")).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toContain("view=trace"));
    expect(window.location.hash).toContain("asset=asset-domain-1");
    expect(screen.getByText("Trace Tree")).toBeInTheDocument();
    expect(screen.getByText("Node Details")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Resolved from seed/i }),
    );
    await waitFor(() =>
      expect(screen.getAllByText("Discovery relation")).toHaveLength(2),
    );
  });

  it("shows run metrics and opens Storage-backed downloads when artifacts are available", async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
      },
      runs: [
        buildRun("run-1", {
          seed_count: 3,
          enumeration_count: 7,
          judge_evaluation_count: 4,
          judge_accepted_count: 2,
          judge_discarded_count: 2,
          downloads: {
            json: "runs/run-1/results.json",
            csv: "runs/run-1/results.csv",
          },
        }),
      ],
    });
    const user = userEvent.setup();
    const windowOpen = vi.fn();
    const popupWindow = {
      closed: false,
      opener: null as Window | null,
      location: {
        replace: vi.fn(),
      },
      close: vi.fn(),
    };
    windowOpen.mockReturnValue(popupWindow);
    vi.stubGlobal("open", windowOpen);

    render(<LiveApp deps={deps} />);

    expect(await screen.findByText("Seeds")).toBeInTheDocument();
    expect(screen.getByText("Enumerations")).toBeInTheDocument();
    expect(screen.getByText("Judge Accepted")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "JSON" }));
    expect(deps.resolveRunArtifactURL).toHaveBeenCalledWith(
      "runs/run-1/results.json",
    );
    expect(windowOpen).toHaveBeenCalledWith("", "_blank");
    expect(popupWindow.location.replace).toHaveBeenCalledWith(
      "https://downloads.test/runs%2Frun-1%2Fresults.json",
    );
  });

  it("shows explicit download states when artifacts are still missing", async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
      },
      runs: [buildRun("run-running", { status: "running" })],
    });

    render(<LiveApp deps={deps} />);

    expect(await screen.findByText("Preparing exports...")).toBeInTheDocument();
  });

  it("shows downloads unavailable when a completed run has no published artifacts", async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
      },
      runs: [buildRun("run-complete", { status: "completed" })],
    });

    render(<LiveApp deps={deps} />);

    expect(
      await screen.findByText("Downloads unavailable"),
    ).toBeInTheDocument();
  });

  it("keeps the desktop drawer toggle in the drawer and logs out from the account menu", async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
        displayName: "Reviewer",
      },
      runs: [buildRun("run-1")],
    });
    const user = userEvent.setup();

    render(<LiveApp deps={deps} />);

    const topbar = document.querySelector(".workspace-topbar");
    expect(topbar).not.toBeNull();
    expect(screen.queryByText("My Runs")).not.toBeInTheDocument();
    expect(screen.queryByText("Asset workspace")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /navigation/i })).toHaveLength(
      1,
    );
    expect(
      screen.getByRole("button", { name: "Select run" }),
    ).toBeInTheDocument();
    expect(
      within(topbar as HTMLElement).queryByRole("button", {
        name: /navigation/i,
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Collapse navigation" }),
    );
    expect(screen.queryByText("Discovery Console")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /navigation/i })).toHaveLength(
      1,
    );

    await user.click(screen.getByRole("button", { name: "Expand navigation" }));
    expect(screen.getByText("Discovery Console")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /navigation/i })).toHaveLength(
      1,
    );

    await user.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.getByText("Reviewer")).toBeInTheDocument();
    expect(screen.getByText("roaguirred@gmail.com")).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "Log out" }));
    await waitFor(() => expect(deps.signOut).toHaveBeenCalledTimes(1));
  });

  it("uses the same fixed top bar on compact viewports and opens the drawer as an overlay", async () => {
    mockMatchMedia(true);

    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
      },
      runs: [buildRun("run-1")],
    });
    const user = userEvent.setup();

    render(<LiveApp deps={deps} />);

    const drawer = screen.getByLabelText("Workspace navigation");
    expect(drawer.className).not.toContain("is-open");
    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select run" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open account menu" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(drawer.className).toContain("is-open");
    expect(
      screen.getByRole("button", { name: "Close navigation" }),
    ).toBeInTheDocument();
  });

  it("renders pivots only in the pivots view and sends pivot decisions", async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
      },
      runs: [
        buildRun("run-1", {
          mode: "manual",
          status: "awaiting_review",
          current_wave: 2,
          asset_count: 2,
          pending_pivot_count: 1,
        }),
      ],
      assets: {
        "run-1": [buildAsset("asset-1", { identifier: "api.example.com" })],
      },
      pivots: {
        "run-1": [
          {
            id: "pivot-1",
            root: "example-app.com",
            status: "pending_review",
            collector: "web_hint_collector",
            recommendation_reason:
              "Brand overlap and matching page references.",
            recommendation_score: 0.94,
            candidate: { domains: ["example-app.com"] },
            created_at: "2026-03-25T10:06:00Z",
            updated_at: "2026-03-25T10:06:00Z",
          },
        ],
      },
      judgeSummaries: {
        "run-1": buildJudgeSummary({
          evaluation_count: 1,
          accepted_count: 1,
          discarded_count: 1,
          groups: [
            {
              collector: "web_hint_collector",
              seed_label: "Root Example",
              seed_domains: ["example.com"],
              scenario: "web ownership hints",
              accepted: [
                {
                  root: "example-app.com",
                  confidence: 0.94,
                  kind: "brand_overlap",
                  reason: "Brand overlap and matching page references.",
                  explicit: true,
                  support: ["Homepage references example-app.com"],
                },
              ],
              discarded: [
                {
                  root: "unrelated-app.com",
                  confidence: 0.18,
                  kind: "unrelated",
                  reason: "No ownership evidence remained after review.",
                  explicit: false,
                },
              ],
            },
          ],
        }),
      },
    });
    const user = userEvent.setup();

    render(<LiveApp deps={deps} />);

    await user.click(screen.getByRole("button", { name: /Pivots 1/i }));
    expect(await screen.findByRole("tab", { name: /Review/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("example-app.com")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Judge Analysis/i }));
    expect(
      await screen.findByText("Homepage references example-app.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("unrelated-app.com")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Review/i }));

    await user.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() =>
      expect(deps.decidePivotCalls).toEqual([
        { runID: "run-1", pivotID: "pivot-1", decision: "accepted" },
      ]),
    );
  });

  it("resolves the trace view from hash state and falls back when the requested asset is missing", async () => {
    window.history.replaceState(
      null,
      "",
      "/#run=run-1&view=trace&asset=missing",
    );

    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
      },
      runs: [buildRun("run-1")],
      traces: {
        "run-1": [buildTrace("asset-1", "alpha.example.com")],
      },
      assets: {
        "run-1": [buildAsset("asset-1", { identifier: "alpha.example.com" })],
      },
    });

    render(<LiveApp deps={deps} />);

    expect(await screen.findByText("Trace Focus")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "alpha.example.com" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Trace Tree")).toBeInTheDocument();
    await waitFor(() =>
      expect(window.location.hash).toContain("asset=asset-1"),
    );
  });

  it("does not expose project IDs or organization-specific branding in the rendered client", async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: "uid-1",
        email: "roaguirred@gmail.com",
        emailVerified: true,
        displayName: "Reviewer",
      },
      runs: [buildRun("run-1")],
    });
    const user = userEvent.setup();

    render(<LiveApp deps={deps} />);

    expect(screen.queryByText(/firebase/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/zerofox/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New Run" }));

    expect(screen.getByPlaceholderText("Example Holdings")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/zerofox/i)).not.toBeInTheDocument();
  });
});

function buildRun(
  id: string,
  overrides: Partial<LiveRunRecord> = {},
): LiveRunRecord {
  return {
    id,
    owner_uid: "uid-1",
    owner_email: "roaguirred@gmail.com",
    mode: "autonomous",
    status: "running",
    current_wave: 1,
    seed_count: 1,
    enumeration_count: 2,
    asset_count: 1,
    pending_pivot_count: 0,
    judge_evaluation_count: 0,
    judge_accepted_count: 0,
    judge_discarded_count: 0,
    created_at: "2026-03-25T10:00:00Z",
    updated_at: "2026-03-25T10:10:00Z",
    ...overrides,
  };
}

function buildAsset(
  assetID: string,
  overrides: Partial<LiveAssetRow> = {},
): LiveAssetRow {
  return {
    asset_id: assetID,
    identifier: `${assetID}.example.com`,
    asset_type: "domain",
    ownership_state: "owned",
    source: "dns_collector",
    inclusion_reason: "Promoted by judged web hint.",
    enumeration_id: "enum-1",
    seed_id: "seed-1",
    status: "running",
    discovery_date: "2026-03-25T10:05:00Z",
    ...overrides,
  };
}

function buildTrace(assetID: string, identifier: string): LiveTrace {
  return {
    asset_id: assetID,
    identifier,
    asset_type: "domain",
    source: "dns_collector",
    enumeration_id: "enum-1",
    seed_id: "seed-1",
    root_node_id: `node-${assetID}`,
    contributors: [
      { seed_id: "seed-1", enumeration_id: "enum-1", source: "dns_collector" },
    ],
    nodes: [
      {
        id: `node-${assetID}`,
        kind: "asset",
        label: identifier,
        subtitle: "Canonical asset",
      },
      {
        id: `node-${assetID}-relation`,
        parent_id: `node-${assetID}`,
        kind: "relation",
        label: "Resolved from seed",
        subtitle: "Discovery relation",
      },
    ],
    sections: [
      { title: "Seed Context", items: ["Shared registrable domain evidence."] },
    ],
  };
}

function buildJudgeSummary(
  overrides: Partial<LiveJudgeSummary> = {},
): LiveJudgeSummary {
  return {
    evaluation_count: 0,
    accepted_count: 0,
    discarded_count: 0,
    groups: [],
    ...overrides,
  };
}

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches,
      media: "(max-width: 1100px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}
