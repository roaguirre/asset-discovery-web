import type { MutableRefObject } from "react";
import {
  describeSource,
  humanizeToken,
  type AssetSortKey,
  type AssetSortState,
  type AssetTableTab,
  type DomainFilterState,
} from "../../core/assetTable";
import type { LiveAssetRow, LiveTrace } from "../../core/types";
import { AssetsTable } from "../components/AssetTable";
import { assetTabLabels } from "../viewLabels";

type AssetsViewProps = {
  activeAssetTab: AssetTableTab;
  assetSearch: string;
  assets: LiveAssetRow[];
  traces: LiveTrace[];
  visibleAssets: LiveAssetRow[];
  displayedAssetCount: number;
  runCountsByAssetTab: Record<AssetTableTab, number>;
  availableDomainKinds: string[];
  availableResolutionStatuses: string[];
  availableDomainSources: string[];
  domainFilters: DomainFilterState;
  domainFiltersActive: boolean;
  sourceMenuOpen: boolean;
  sourceMenuRef: MutableRefObject<HTMLDivElement | null>;
  expandedAssetID: string;
  expandedDomainGroups: Set<string>;
  activeAssetSort: AssetSortState;
  onAssetSearchChange: (value: string) => void;
  onSelectAssetTab: (tab: AssetTableTab) => void;
  onDomainKindChange: (value: string) => void;
  onResolutionStatusChange: (value: string) => void;
  onToggleSourceMenu: () => void;
  onResetSources: () => void;
  onToggleSource: (source: string) => void;
  onSortChange: (key: AssetSortKey) => void;
  onToggleDetails: (assetID: string) => void;
  onToggleDomainGroup: (groupKey: string) => void;
  onOpenTrace: (assetID: string) => void;
};

/**
 * AssetsView renders the asset-table workspace, including tab switching,
 * search, domain-only filters, and grouped table output.
 */
export function AssetsView({
  activeAssetTab,
  assetSearch,
  assets,
  traces,
  visibleAssets,
  displayedAssetCount,
  runCountsByAssetTab,
  availableDomainKinds,
  availableResolutionStatuses,
  availableDomainSources,
  domainFilters,
  domainFiltersActive,
  sourceMenuOpen,
  sourceMenuRef,
  expandedAssetID,
  expandedDomainGroups,
  activeAssetSort,
  onAssetSearchChange,
  onSelectAssetTab,
  onDomainKindChange,
  onResolutionStatusChange,
  onToggleSourceMenu,
  onResetSources,
  onToggleSource,
  onSortChange,
  onToggleDetails,
  onToggleDomainGroup,
  onOpenTrace,
}: AssetsViewProps) {
  return (
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
          <div className="asset-tabs" role="tablist" aria-label="Asset types">
            {(["all", "domains", "ips"] as AssetTableTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeAssetTab === tab}
                className={`asset-tab ${activeAssetTab === tab ? "is-active" : ""}`}
                onClick={() => onSelectAssetTab(tab)}
              >
                <span>{assetTabLabels[tab]}</span>
                <strong>{runCountsByAssetTab[tab]}</strong>
              </button>
            ))}
          </div>
          <input
            className="search-input"
            placeholder="Search identifiers, sources, ownership, provenance, or notes"
            value={assetSearch}
            onChange={(event) => onAssetSearchChange(event.target.value)}
          />
          {activeAssetTab === "domains" ? (
            <div className="domain-filter-row">
              <label className="filter-field">
                Domain Kind
                <select
                  value={domainFilters.domainKind}
                  onChange={(event) => onDomainKindChange(event.target.value)}
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
                    onResolutionStatusChange(event.target.value)
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
                    onClick={onToggleSourceMenu}
                  >
                    {domainFilters.sources.length === 0
                      ? "All sources"
                      : domainFilters.sources.length === 1
                        ? domainFilters.sources[0]
                        : `${domainFilters.sources.length} sources selected`}
                  </button>
                  <div className="multi-select-menu" hidden={!sourceMenuOpen}>
                    <label className="multi-select-option multi-select-option-all">
                      <input
                        type="checkbox"
                        checked={domainFilters.sources.length === 0}
                        onChange={onResetSources}
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
                            checked={domainFilters.sources.includes(source)}
                            onChange={() => onToggleSource(source)}
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
            onSortChange={onSortChange}
            onToggleDetails={onToggleDetails}
            onToggleDomainGroup={onToggleDomainGroup}
            onOpenTrace={onOpenTrace}
          />
        ) : (
          <p className="empty-copy table-empty-copy">
            No assets match the current filter.
          </p>
        )}
      </div>
    </section>
  );
}
