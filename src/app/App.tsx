import { useState } from "react";
import "./App.css";
import { CreateRunModal } from "../features/discovery/ui/components/CreateRunModal";
import { RunOverviewPanel } from "../features/discovery/ui/components/RunOverviewPanel";
import { WorkspaceChrome } from "../features/discovery/ui/components/WorkspaceChrome";
import type { LiveAppDeps } from "../features/discovery/ports";
import { useWorkspace } from "../features/discovery/state/useWorkspace";
import {
  handleTooltipMove,
  handleTooltipOverOrFocus,
  hiddenTooltip,
  hideTooltip,
} from "../features/discovery/ui/tooltip";
import { ActivityView } from "../features/discovery/ui/views/ActivityView";
import { AssetsView } from "../features/discovery/ui/views/AssetsView";
import { PivotsView } from "../features/discovery/ui/views/PivotsView";
import { TraceView } from "../features/discovery/ui/views/TraceView";

type AppProps = {
  deps: LiveAppDeps;
};

/**
 * BootstrapLoadingGate holds the UI on a neutral shell while auth or the first
 * workspace selection is still being restored.
 */
function BootstrapLoadingGate() {
  return (
    <main className="live-shell live-auth-shell" aria-busy="true">
      <section className="live-auth-card" role="status" aria-live="polite">
        <p className="eyebrow">Preparing Workspace</p>
        <h1>Loading discovery console.</h1>
        <p className="live-intro">
          Restoring your session and latest runs before rendering the live
          workspace.
        </p>
      </section>
    </main>
  );
}

/**
 * App is the composition root for the live workspace. It owns only the
 * top-level gating and shared tooltip overlay while delegating orchestration to
 * the workspace controller and presentation to focused view components.
 */
export default function App({ deps }: AppProps) {
  const workspace = useWorkspace(deps);
  const [tooltip, setTooltip] = useState(hiddenTooltip);

  if (!workspace.authHydrated) {
    return <BootstrapLoadingGate />;
  }

  if (!workspace.session) {
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
            onClick={workspace.handleSignIn}
            disabled={workspace.busyAction === "sign-in"}
          >
            {workspace.busyAction === "sign-in"
              ? "Opening Google..."
              : "Sign In With Google"}
          </button>
          <p className="meta-note">Approved verified Google accounts only.</p>
          {workspace.message ? (
            <p className="status-line status-error">{workspace.message}</p>
          ) : null}
        </section>
      </main>
    );
  }

  if (workspace.sessionRestricted) {
    return (
      <main className="live-shell live-auth-shell">
        <section className="live-auth-card">
          <p className="eyebrow">Access Restricted</p>
          <h1>{workspace.session.email}</h1>
          <p className="live-intro">
            This demo only accepts approved verified accounts. Sign out and
            switch to an authorized login.
          </p>
          <button
            type="button"
            className="hero-button"
            onClick={workspace.handleSignOut}
            disabled={workspace.busyAction === "sign-out"}
          >
            {workspace.busyAction === "sign-out" ? "Signing Out..." : "Sign Out"}
          </button>
        </section>
      </main>
    );
  }

  if (workspace.workspaceBootstrapping) {
    return <BootstrapLoadingGate />;
  }

  return (
    <main
      className="live-shell live-app-shell"
      onMouseOver={(event) => handleTooltipOverOrFocus(event, setTooltip)}
      onMouseMove={(event) => handleTooltipMove(event, setTooltip)}
      onMouseLeave={() => hideTooltip(setTooltip)}
      onFocus={(event) => handleTooltipOverOrFocus(event, setTooltip)}
      onBlur={() => hideTooltip(setTooltip)}
    >
      <WorkspaceChrome
        compactViewport={workspace.compactViewport}
        drawerOpen={workspace.drawerOpen}
        expandedDrawer={workspace.expandedDrawer}
        drawerToggleLabel={workspace.drawerToggleLabel}
        runMenuOpen={workspace.runMenuOpen}
        accountMenuOpen={workspace.accountMenuOpen}
        runMenuRef={workspace.runMenuRef}
        accountMenuRef={workspace.accountMenuRef}
        runs={workspace.runs}
        selectedRun={workspace.selectedRun}
        routeRunID={workspace.route.runID}
        runSelectorLabel={workspace.runSelectorLabel}
        session={workspace.session}
        busyAction={workspace.busyAction}
        viewItems={workspace.viewItems}
        activeView={workspace.route.view}
        onDrawerToggle={workspace.handleDrawerToggle}
        onCloseDrawer={workspace.closeDrawer}
        onToggleRunMenu={workspace.toggleRunMenu}
        onToggleAccountMenu={workspace.toggleAccountMenu}
        onOpenCreateModal={workspace.openCreateModal}
        onSelectRun={workspace.handleSelectRun}
        onSelectView={workspace.handleSelectView}
        onSignOut={workspace.handleSignOut}
      >
        {workspace.message ? <p className="status-line">{workspace.message}</p> : null}

        {workspace.selectedRun ? (
          <>
            <RunOverviewPanel
              run={workspace.selectedRun}
              judgeSummary={workspace.judgeSummary}
              downloadAction={workspace.downloadAction}
              onDownloadArtifact={workspace.handleDownloadArtifact}
            />

            {workspace.route.view === "assets" ? (
              <AssetsView
                activeAssetTab={workspace.activeAssetTab}
                assetSearch={workspace.assetSearch}
                assets={workspace.assets}
                traces={workspace.traces}
                visibleAssets={workspace.visibleAssets}
                displayedAssetCount={workspace.displayedAssetCount}
                runCountsByAssetTab={workspace.runCountsByAssetTab}
                availableDomainKinds={workspace.availableDomainKinds}
                availableResolutionStatuses={
                  workspace.availableResolutionStatuses
                }
                availableDomainSources={workspace.availableDomainSources}
                domainFilters={workspace.domainFilters}
                domainFiltersActive={workspace.domainFiltersActive}
                sourceMenuOpen={workspace.sourceMenuOpen}
                sourceMenuRef={workspace.sourceMenuRef}
                expandedAssetID={workspace.expandedAssetID}
                expandedDomainGroups={workspace.expandedDomainGroups}
                activeAssetSort={workspace.activeAssetSort}
                onAssetSearchChange={workspace.setAssetSearch}
                onSelectAssetTab={workspace.handleSelectAssetTab}
                onDomainKindChange={workspace.setDomainKind}
                onResolutionStatusChange={workspace.setResolutionStatus}
                onToggleSourceMenu={workspace.toggleSourceMenu}
                onResetSources={workspace.resetSources}
                onToggleSource={workspace.handleToggleSource}
                onSortChange={workspace.handleSortChange}
                onToggleDetails={workspace.handleToggleAssetDetails}
                onToggleDomainGroup={workspace.handleToggleDomainGroup}
                onOpenTrace={workspace.handleOpenTrace}
              />
            ) : null}

            {workspace.route.view === "trace" ? (
              <TraceView
                traceTargetID={workspace.traceTargetID}
                traceOptions={workspace.traceOptions}
                selectedTrace={workspace.selectedTrace}
                selectedTraceAsset={workspace.selectedTraceAsset}
                selectedTraceNode={workspace.selectedTraceNode}
                selectedTraceNodeID={workspace.selectedTraceNodeID}
                onSelectTraceAsset={workspace.handleSelectTraceAsset}
                onSelectTraceNode={workspace.handleSelectTraceNode}
                onOpenTrace={workspace.handleOpenTrace}
              />
            ) : null}

            {workspace.route.view === "pivots" ? (
              <PivotsView
                pivotPanelTab={workspace.pivotPanelTab}
                busyAction={workspace.busyAction}
                selectedPivotID={workspace.route.pivotID}
                pendingPivots={workspace.pendingPivots}
                auditPivots={workspace.auditPivots}
                judgeSummary={workspace.judgeSummary}
                onSelectTab={workspace.setPivotPanelTab}
                onSelectPivot={workspace.handleSelectPivot}
                onPivotDecision={workspace.handlePivotDecision}
              />
            ) : null}

            {workspace.route.view === "activity" ? (
              <ActivityView events={workspace.events} />
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
              onClick={workspace.openCreateModal}
            >
              Create Run
            </button>
          </section>
        )}
      </WorkspaceChrome>

      <CreateRunModal
        open={workspace.createModalOpen}
        formState={workspace.formState}
        modalMessage={workspace.modalMessage}
        busyAction={workspace.busyAction}
        showOptionalSeedFields={workspace.showOptionalSeedFields}
        onClose={workspace.closeCreateModal}
        onSubmit={workspace.handleCreateRun}
        onCompanyNameChange={workspace.setCompanyName}
        onDomainsChange={workspace.setDomains}
        onModeChange={workspace.setMode}
        onIndustryChange={workspace.setIndustry}
        onAddressChange={workspace.setAddress}
      />

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
