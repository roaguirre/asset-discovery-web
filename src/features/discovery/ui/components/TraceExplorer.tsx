import { humanizeToken } from "../../core/assetTable";
import {
  buildTraceChildren,
  buildTraceSummaryPills,
  buildTraceSummaryStats,
} from "../../core/traceModel";
import type {
  LiveAssetRow,
  LiveTrace,
  TraceNode,
} from "../../core/types";

type TraceExplorerProps = {
  trace: LiveTrace | null;
  asset: LiveAssetRow | null;
  selectedNode: TraceNode | null;
  selectedNodeID: string;
  onSelectNode: (nodeID: string) => void;
  onOpenTrace: (assetID: string) => void;
};

/**
 * TraceExplorer renders the focused trace summary, navigable tree, selected
 * node details, and related asset links for the current trace target.
 */
export function TraceExplorer({
  trace,
  asset,
  selectedNode,
  selectedNodeID,
  onSelectNode,
  onOpenTrace,
}: TraceExplorerProps) {
  const children = buildTraceChildren(trace);
  const related = trace?.related ?? [];

  return (
    <div className="trace-explorer">
      <TraceSummaryCard trace={trace} asset={asset} />

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

/**
 * TraceSummaryCard renders the headline trace context so other surfaces can
 * reuse the summary without coupling to the full explorer layout.
 */
export function TraceSummaryCard({
  trace,
  asset,
}: {
  trace: LiveTrace | null;
  asset: LiveAssetRow | null;
}) {
  const summaryPills = buildTraceSummaryPills(trace, asset);
  const summaryStats = buildTraceSummaryStats(trace);
  const sections = trace?.sections ?? [];

  return (
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
              <SectionItems items={section.items ?? []} />
            </article>
          ))
        ) : (
          <p className="empty-copy">
            Trace sections will appear here as checkpoint snapshots refresh.
          </p>
        )}
      </section>
    </article>
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
              <span>
                {node.subtitle && node.subtitle !== node.label
                  ? node.subtitle
                  : humanizeToken(node.kind, "Node")}
              </span>
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
  return (
    <div className="trace-node-detail-stack">
      <article className="trace-card">
        <h4>{node.label}</h4>
        <p className="panel-copy">
          {node.subtitle || "No subtitle exported for this node."}
        </p>
        {node.kind ? (
          <div className="badge-row">
            <span className="pill pill-subtle">{humanizeToken(node.kind)}</span>
          </div>
        ) : null}
      </article>
      {(node.details ?? []).length > 0 ? (
        (node.details ?? []).map((section) => (
          <article key={section.title} className="trace-card">
            <h4>{section.title}</h4>
            {(section.items ?? []).length > 0 ? (
              <SectionItems items={section.items ?? []} />
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

/**
 * Returns true when a value looks like a machine-generated ID — a hyphenated
 * token ending in a long numeric segment (e.g. dom-crtsh-1774476262294276000-541).
 */
function isTechnicalId(value: string): boolean {
  return /^[a-z][a-z0-9-]+-\d{10,}[\d-]*$/.test(value.trim());
}

/**
 * Returns the right className for a property value so technical IDs recede
 * visually while human-readable values stay prominent.
 */
function propValueClass(value: string): string {
  return isTechnicalId(value)
    ? "trace-prop-value trace-prop-value--id"
    : "trace-prop-value";
}

/**
 * Pipe-record fields that have dedicated trace sections below and should not
 * be repeated inside the Contributor Provenance rows.
 */
const REDUNDANT_PIPE_KEYS = new Set(["enumeration", "seed"]);

/**
 * SectionItems renders section item lists with smart formatting.
 *
 * When all items match "Key: value" format, they render as a labeled property
 * list. Pipe-separated records ("field value | field value") are split into
 * readable rows. Plain narrative text falls back to a standard bullet list.
 */
function SectionItems({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  // Detect "Key: value" format (colon-separated)
  const kvParsed = items.map((item) => {
    const idx = item.indexOf(": ");
    if (idx > 0 && idx < item.length - 2) {
      return { key: item.slice(0, idx), value: item.slice(idx + 2) };
    }
    return null;
  });

  if (kvParsed.every(Boolean)) {
    return (
      <ul className="trace-prop-list">
        {(kvParsed as Array<{ key: string; value: string }>).map((kv, i) => (
          <li key={items[i]} className="trace-prop-item">
            <span className="trace-prop-key">{kv.key}</span>
            <span className={propValueClass(kv.value)}>{kv.value}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Detect pipe-separated records ("field value | field value")
  if (items.some((item) => item.includes(" | "))) {
    return (
      <div className="trace-piped-records">
        {items.map((item, idx) => {
          if (!item.includes(" | ")) {
            // Try to parse as "word value" when the value is a technical ID
            const spaceIdx = item.indexOf(" ");
            if (spaceIdx > 0) {
              const potentialVal = item.slice(spaceIdx + 1);
              if (isTechnicalId(potentialVal)) {
                return (
                  <ul key={idx} className="trace-prop-list trace-piped-record">
                    <li className="trace-prop-item">
                      <span className="trace-prop-key">{item.slice(0, spaceIdx)}</span>
                      <span className="trace-prop-value trace-prop-value--id">{potentialVal}</span>
                    </li>
                  </ul>
                );
              }
            }
            return (
              <p key={idx} className="trace-prop-value">
                {item}
              </p>
            );
          }
          const parts = item
            .split(" | ")
            .map((chunk) => {
              const spaceIdx = chunk.indexOf(" ");
              return spaceIdx > 0
                ? { key: chunk.slice(0, spaceIdx), value: chunk.slice(spaceIdx + 1) }
                : { key: chunk, value: "" };
            })
            .filter((part) => !REDUNDANT_PIPE_KEYS.has(part.key.toLowerCase()));
          return (
            <ul key={idx} className="trace-prop-list trace-piped-record">
              {parts.map((part, partIdx) => (
                <li key={part.key || partIdx} className="trace-prop-item">
                  <span className="trace-prop-key">{part.key}</span>
                  <span className={propValueClass(part.value)}>{part.value}</span>
                </li>
              ))}
            </ul>
          );
        })}
      </div>
    );
  }

  // Plain narrative text — standard bullet list
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
