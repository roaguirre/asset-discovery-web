import type { MutableRefObject, ReactNode } from "react";
import {
  SurfaceDrawerOverlay,
  SurfaceDrawerToggleButton,
  SurfaceTopbar,
} from "../../../../components/surface";
import { formatDate, formatStatus, sessionInitials, sessionLabel } from "../formatters";
import type {
  LiveAuthSession,
  LiveRunRecord,
  LiveView,
} from "../../core/types";
import {
  ChevronDownIcon,
  PlusIcon,
  ViewIcon,
} from "./common";

export type ViewNavigationItem = {
  view: LiveView;
  label: string;
  count: number;
};

type WorkspaceChromeProps = {
  compactViewport: boolean;
  drawerOpen: boolean;
  expandedDrawer: boolean;
  drawerToggleLabel: string;
  runMenuOpen: boolean;
  accountMenuOpen: boolean;
  runMenuRef: MutableRefObject<HTMLDivElement | null>;
  accountMenuRef: MutableRefObject<HTMLDivElement | null>;
  runs: LiveRunRecord[];
  selectedRun: LiveRunRecord | null;
  routeRunID: string;
  runSelectorLabel: string;
  session: LiveAuthSession;
  busyAction: string;
  viewItems: ViewNavigationItem[];
  activeView: LiveView;
  onDrawerToggle: () => void;
  onCloseDrawer: () => void;
  onToggleRunMenu: () => void;
  onToggleAccountMenu: () => void;
  onOpenCreateModal: () => void;
  onSelectRun: (runID: string) => void;
  onSelectView: (view: LiveView) => void;
  onSignOut: () => void;
  children: ReactNode;
};

/**
 * WorkspaceChrome renders the persistent workspace frame so the app shell can focus
 * on gating and wiring the currently selected view.
 */
export function WorkspaceChrome({
  compactViewport,
  drawerOpen,
  expandedDrawer,
  drawerToggleLabel,
  runMenuOpen,
  accountMenuOpen,
  runMenuRef,
  accountMenuRef,
  runs,
  selectedRun,
  routeRunID,
  runSelectorLabel,
  session,
  busyAction,
  viewItems,
  activeView,
  onDrawerToggle,
  onCloseDrawer,
  onToggleRunMenu,
  onToggleAccountMenu,
  onOpenCreateModal,
  onSelectRun,
  onSelectView,
  onSignOut,
  children,
}: WorkspaceChromeProps) {
  const collapsedDrawer = !expandedDrawer;
  const drawerContent = (
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
        className={expandedDrawer ? "hero-button drawer-cta" : "rail-action"}
        aria-label="New Run"
        data-tooltip={collapsedDrawer ? "New Run" : undefined}
        data-tooltip-placement={collapsedDrawer ? "right" : undefined}
        onClick={onOpenCreateModal}
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
            className={`drawer-link ${activeView === item.view ? "is-active" : ""}`}
            aria-label={`${item.label} ${item.count}`}
            data-tooltip={collapsedDrawer ? item.label : undefined}
            data-tooltip-placement={collapsedDrawer ? "right" : undefined}
            onClick={() => onSelectView(item.view)}
            disabled={!selectedRun}
          >
            <span className="drawer-link-icon">
              <ViewIcon view={item.view} />
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
            onClick={onDrawerToggle}
          >
            <SurfaceDrawerHandleIcon />
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <SurfaceTopbar
        className="workspace-topbar"
        start={
          <div className="topbar-left">
            {compactViewport ? (
              <SurfaceDrawerToggleButton
                open={drawerOpen}
                label={drawerToggleLabel}
                onToggle={onDrawerToggle}
              />
            ) : null}
            <div className="run-selector-shell" ref={runMenuRef}>
              <button
                type="button"
                className="run-selector-trigger"
                aria-label="Select run"
                aria-haspopup="menu"
                aria-expanded={runMenuOpen}
                disabled={runs.length === 0}
                onClick={onToggleRunMenu}
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
                      className={`run-selector-item ${run.id === routeRunID ? "is-active" : ""}`}
                      role="menuitemradio"
                      aria-checked={run.id === routeRunID}
                      onClick={() => onSelectRun(run.id)}
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
        }
        end={
          <div className="account-shell" ref={accountMenuRef}>
            <button
              type="button"
              className="avatar-button"
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={onToggleAccountMenu}
            >
              <span className="avatar-face">{sessionInitials(session)}</span>
            </button>
            {accountMenuOpen ? (
              <section className="account-menu" role="menu" aria-label="Account menu">
                <div className="account-menu-header">
                  <strong>{sessionLabel(session)}</strong>
                  <span>{session.email}</span>
                </div>
                <button
                  type="button"
                  className="account-menu-item"
                  role="menuitem"
                  onClick={onSignOut}
                  disabled={busyAction === "sign-out"}
                >
                  {busyAction === "sign-out" ? "Logging out..." : "Log out"}
                </button>
              </section>
            ) : null}
          </div>
        }
      />

      {compactViewport ? (
        <SurfaceDrawerOverlay
          open={drawerOpen}
          onClose={onCloseDrawer}
          ariaLabel="Workspace navigation"
          scrimClassName="drawer-scrim"
          drawerClassName="app-drawer is-expanded"
        >
          {drawerContent}
        </SurfaceDrawerOverlay>
      ) : null}

      <div className="live-body">
        {!compactViewport ? (
          <aside
            className={`app-drawer ${expandedDrawer ? "is-expanded" : "is-collapsed"}`}
            aria-label="Workspace navigation"
          >
            {drawerContent}
          </aside>
        ) : null}

        <section className="live-main">{children}</section>
      </div>
    </>
  );
}

function SurfaceDrawerHandleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </svg>
  );
}
