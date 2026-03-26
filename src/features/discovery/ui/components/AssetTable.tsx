import {
  assetSortTooltips,
  assetSummaryText,
  buildDomainGroups,
  filterAssetsByTab,
  humanizeToken,
  parseAssetDetails,
  sortKeysForTab,
  sortLabelForKey,
  type AssetSortKey,
  type AssetSortState,
  type AssetTableTab,
  type DomainGroup,
} from "../../core/assetTable";
import { formatDate } from "../formatters";
import { tooltipIfNeeded } from "../tooltip";
import type { LiveAssetRow, LiveTrace } from "../../core/types";
import { OwnershipPill, SourcePills } from "./common";

type AssetsTableProps = {
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
};

/**
 * AssetsTable renders the live asset read model for all tabs while keeping
 * row-level details and grouped domain behavior behind one narrow interface.
 */
export function AssetsTable({
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
}: AssetsTableProps) {
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
