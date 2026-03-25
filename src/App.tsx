import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'
import './App.css'
import { fetchManifest, fetchRun, resolveManifestURL, resolveRelativeURL } from './data'
import type {
  Downloads,
  JudgeCandidate,
  JudgeGroup,
  JudgeSummary,
  Manifest,
  RouteState,
  Row,
  Run,
  Trace,
  TraceContributor,
  TraceNode,
  TraceSection,
  View,
} from './types'

type SortDirection = 'asc' | 'desc'

type SortKey =
  | 'identifier'
  | 'domain_kind'
  | 'ownership_state'
  | 'resolution_status'
  | 'asn'
  | 'organization'
  | 'ptr'
  | 'source'
  | 'status'
  | 'discovery_date'

type TooltipState = {
  visible: boolean
  text: string
  left: number
  top: number
}

type DomainGroup = {
  key: string
  rows: Row[]
  summaryRow: Row | null
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const sourceDescriptions = Object.freeze({
  'crt.sh': 'Certificate Transparency results from crt.sh, used to surface domains seen in public TLS certificates.',
  dns_collector: 'Direct DNS lookups for the target domain, including A, AAAA, MX, TXT, and NS records.',
  hackertarget_collector: 'Passive subdomain and host search results returned by HackerTarget.',
  rdap_collector: 'Registration data from RDAP, including registrar, registrant, and nameserver metadata.',
  wayback_collector: 'Historical hostnames recovered from the Internet Archive Wayback Machine CDX index.',
  alienvault_collector: 'Passive DNS observations from AlienVault OTX.',
  web_hint_collector: 'Ownership hints mined from the target website and security.txt references.',
  sitemap_collector: 'Hosts and judged cross-root candidates discovered from robots.txt and sitemap documents.',
  reverse_registration_collector: 'Candidate sibling domains discovered through certificate transparency and RDAP overlap.',
  asn_cidr_collector: 'PTR-derived domains and roots discovered by pivoting through known ASN and CIDR network ranges.',
  domain_enricher: 'DNS and RDAP enrichment backfill that also materializes IP assets from resolved A and AAAA records.',
  ip_enricher: 'PTR, ASN, organization, and CIDR enrichment backfill applied to canonical IP assets.',
  crawler_collector: 'Assets discovered by crawling links from already-discovered web pages.',
} as Record<string, string>)

const sortLabels: Record<SortKey, string> = {
  identifier: 'Identifier',
  domain_kind: 'Kind',
  ownership_state: 'Ownership',
  resolution_status: 'Resolution',
  asn: 'ASN',
  organization: 'Organization',
  ptr: 'PTR',
  source: 'Source',
  status: 'Status',
  discovery_date: 'Discovered',
}

function escapeHTML(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function normalize(value: unknown): string {
  return String(value ?? '').toLowerCase()
}

function humanizeKey(value: unknown): string {
  return String(value ?? '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDomainKind(value: unknown): string {
  return humanizeKey(value)
}

function formatResolutionStatus(value: unknown): string {
  return humanizeKey(value)
}

function splitSources(value: string | undefined): string[] {
  const seen = new Set<string>()
  return String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => {
      if (!part || seen.has(part)) {
        return false
      }
      seen.add(part)
      return true
    })
}

function uniqueValues(rows: Row[], key: keyof Row): string[] {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))]
    .map((value) => String(value))
    .sort((left, right) => collator.compare(left, right))
}

function uniqueSourceValues(rows: Row[]): string[] {
  const values = new Set<string>()
  rows.forEach((row) => {
    splitSources(row.source).forEach((source) => values.add(source))
  })
  return [...values].sort((left, right) => collator.compare(left, right))
}

function describeSource(value: string): string {
  return sourceDescriptions[value] ?? `Collected from ${value || 'an unknown source'}.`
}

function parseHash(hash: string): RouteState {
  const value = String(hash).replace(/^#/, '')
  if (value === 'ips') {
    return { view: 'ips', runId: '', assetId: '' }
  }
  if (value === 'judge') {
    return { view: 'judge', runId: '', assetId: '' }
  }
  if (!value.startsWith('trace/')) {
    return { view: 'domains', runId: '', assetId: '' }
  }

  const parts = value.split('/')
  if (parts.length < 3) {
    return { view: 'domains', runId: '', assetId: '' }
  }

  return {
    view: 'trace',
    runId: decodeURIComponent(parts[1] ?? ''),
    assetId: decodeURIComponent(parts.slice(2).join('/')),
  }
}

function buildHash(view: View, runId: string, assetId: string): string {
  if (view === 'trace' && runId && assetId) {
    return `#trace/${encodeURIComponent(runId)}/${encodeURIComponent(assetId)}`
  }
  if (view === 'ips') {
    return '#ips'
  }
  if (view === 'judge') {
    return '#judge'
  }
  return ''
}

function rowsForSourceFilter(runRows: Row[], view: View): Row[] {
  if (view === 'domains') {
    return runRows.filter((row) => row.asset_type === 'domain')
  }
  if (view === 'ips') {
    return runRows.filter((row) => row.asset_type === 'ip')
  }
  return runRows
}

function hasActiveDomainFilters(
  search: string,
  domainKind: string,
  resolutionStatus: string,
  sources: string[],
): boolean {
  return Boolean(search) || Boolean(domainKind) || Boolean(resolutionStatus) || sources.length > 0
}

function compareRows(
  left: Row,
  right: Row,
  view: View,
  sortKey: SortKey,
  sortDirection: SortDirection,
): number {
  if (view === 'domains') {
    const leftGroup = left.registrable_domain ?? ''
    const rightGroup = right.registrable_domain ?? ''
    const groupDiff = collator.compare(leftGroup, rightGroup)
    if (groupDiff !== 0) {
      return groupDiff
    }
  }

  const direction = sortDirection === 'asc' ? 1 : -1
  if (sortKey === 'discovery_date') {
    const leftValue = left.discovery_date ? Date.parse(left.discovery_date) : 0
    const rightValue = right.discovery_date ? Date.parse(right.discovery_date) : 0
    if (leftValue < rightValue) {
      return -1 * direction
    }
    if (leftValue > rightValue) {
      return 1 * direction
    }
    return collator.compare(left.identifier, right.identifier)
  }

  const leftValue = String(left[sortKey] ?? '')
  const rightValue = String(right[sortKey] ?? '')
  return collator.compare(leftValue, rightValue) * direction
}

function visibleRows(
  run: Run | null,
  view: View,
  search: string,
  domainKind: string,
  resolutionStatus: string,
  sources: string[],
  sortKey: SortKey,
  sortDirection: SortDirection,
): Row[] {
  if (!run) {
    return []
  }

  return run.rows
    .filter((row) => {
      if (view === 'domains') {
        return row.asset_type === 'domain'
      }
      if (view === 'ips') {
        return row.asset_type === 'ip'
      }
      return true
    })
    .filter((row) => !domainKind || row.domain_kind === domainKind)
    .filter((row) => {
      if (!resolutionStatus || row.asset_type !== 'domain') {
        return true
      }
      return row.resolution_status === resolutionStatus
    })
    .filter((row) => {
      if (sources.length === 0) {
        return true
      }
      const rowSources = splitSources(row.source)
      return sources.every((source) => rowSources.includes(source))
    })
    .filter((row) => {
      if (!search) {
        return true
      }
      return normalize(
        [
          row.identifier,
          row.domain_kind,
          row.registrable_domain,
          row.asset_type,
          row.source,
          row.discovered_by,
          row.enriched_by,
          row.enumeration_id,
          row.seed_id,
          row.resolution_status,
          row.status,
          row.details,
          row.ownership_state,
          row.inclusion_reason,
        ].join(' '),
      ).includes(search)
    })
    .slice()
    .sort((left, right) => compareRows(left, right, view, sortKey, sortDirection))
}

function buildDomainGroups(rows: Row[], allRows: Row[]): DomainGroup[] {
  const groups: DomainGroup[] = []
  const byKey = new Map<string, DomainGroup>()
  const summaryByKey = new Map<string, Row>()

  allRows.forEach((row) => {
    const key = row.registrable_domain || row.identifier
    if (!key || row.domain_kind !== 'registrable' || summaryByKey.has(key)) {
      return
    }
    summaryByKey.set(key, row)
  })

  rows.forEach((row) => {
    const key = row.registrable_domain || row.identifier
    if (!key) {
      return
    }

    let group = byKey.get(key)
    if (!group) {
      group = { key, rows: [], summaryRow: null }
      byKey.set(key, group)
      groups.push(group)
    }
    group.rows.push(row)
  })

  groups.forEach((group) => {
    const summaryRow = summaryByKey.get(group.key) ?? null
    const visibleSummaryRow = summaryRow
      ? group.rows.find((row) => row.asset_id === summaryRow.asset_id) ?? null
      : null
    const others = group.rows.filter((row) => !visibleSummaryRow || row.asset_id !== visibleSummaryRow.asset_id)
    group.summaryRow = summaryRow
    group.rows = visibleSummaryRow ? [visibleSummaryRow, ...others] : group.rows.slice()
  })

  return groups
}

function displayedDomainRowCount(
  groups: DomainGroup[],
  expandedDomainGroups: Set<string>,
  filtersAreActive: boolean,
): number {
  return groups.reduce((count, group) => {
    const isExpanded = filtersAreActive || expandedDomainGroups.has(group.key)
    const childCount = group.summaryRow
      ? group.rows.filter((row) => row.asset_id !== group.summaryRow?.asset_id).length
      : group.rows.length
    return count + 1 + (isExpanded ? childCount : 0)
  }, 0)
}

function currentTrace(run: Run | null, assetId: string): Trace | null {
  if (!run || !Array.isArray(run.traces)) {
    return null
  }
  return run.traces.find((trace) => trace.asset_id === assetId) ?? null
}

function traceNodes(trace: Trace | null): TraceNode[] {
  return trace?.nodes ?? []
}

function findTraceNode(trace: Trace | null, nodeId: string): TraceNode | null {
  const nodes = traceNodes(trace)
  if (!nodes.length) {
    return null
  }
  if (nodeId) {
    return nodes.find((node) => node.id === nodeId) ?? null
  }
  const root = trace?.root_node_id ? nodes.find((node) => node.id === trace.root_node_id) : null
  return root ?? nodes[0] ?? null
}

function formatConfidence(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return ''
  }
  return value.toFixed(2)
}

function renderSourceCell(value: string | undefined): string {
  const sources = splitSources(value)
  if (sources.length === 0) {
    return '<span class="muted">-</span>'
  }

  return `<div class="source-list">${sources
    .map(
      (source) =>
        `<span class="pill source-pill" data-tooltip="${escapeHTML(describeSource(source))}">${escapeHTML(source)}</span>`,
    )
    .join('')}</div>`
}

function renderOwnershipBadge(value: string | undefined): string {
  const normalized = String(value ?? '').trim().toLowerCase()
  const label = normalized ? humanizeKey(normalized) : 'Unclassified'
  const tone = normalized ? ` ownership-${normalized.replaceAll('_', '-')}` : ''
  return `<span class="pill ownership-pill${tone}">${escapeHTML(label)}</span>`
}

function parseDetails(details: string | undefined): Array<{ label: string; value: string }> {
  if (!details) {
    return []
  }
  return details.split(' | ').map((part) => {
    const index = part.indexOf(' ')
    if (index < 0) {
      return { label: 'Info', value: part }
    }
    return { label: part.slice(0, index), value: part.slice(index + 1) }
  })
}

function renderEvidenceGroups(groups: Row['evidence_groups']): string {
  if (!Array.isArray(groups) || groups.length === 0) {
    return ''
  }

  return `<div class="detail-evidence-groups">${groups
    .map((group) => {
      const items = Array.isArray(group.items) ? group.items : []
      return [
        '<section class="detail-evidence-group">',
        `<div class="detail-preview-label">${escapeHTML(group.title || 'Evidence')}</div>`,
        items.length > 0
          ? `<div class="detail-evidence-items">${items
              .map((item) => `<div class="detail-evidence-item">${escapeHTML(item)}</div>`)
              .join('')}</div>`
          : '<div class="detail-evidence-item muted">No exported values.</div>',
        '</section>',
      ].join('')
    })
    .join('')}</div>`
}

function renderDetailPanel(row: Row, run: Run | null, runId: string): string {
  const trace = run?.traces?.find((candidate) => candidate.asset_id === row.asset_id) ?? null
  const detailPairs = parseDetails(row.details).filter((pair) => pair.label !== 'Ownership' && pair.label !== 'Reason')
  const previewPairs = detailPairs.slice(0, 4)
  const groupedEvidence = renderEvidenceGroups(row.evidence_groups)
  const contributors = trace?.contributors ?? []
  const related = trace?.related ?? []
  const nodes = traceNodes(trace)
  const observationCount = nodes.filter((node) => node.kind === 'observation').length
  const relationCount = nodes.filter((node) => node.kind === 'relation').length
  const enrichmentCount = nodes.filter((node) => node.kind === 'enrichment').length
  const colSpan = row.asset_type === 'ip' ? 9 : 8

  const identityBadges = [
    row.asset_type === 'domain' && row.domain_kind
      ? `<span class="pill pill-subtle">${escapeHTML(formatDomainKind(row.domain_kind))}</span>`
      : '',
    row.asset_type === 'domain' && row.registrable_domain
      ? `<span class="pill pill-subtle">${escapeHTML(row.registrable_domain)}</span>`
      : '',
    row.asset_type === 'domain' && row.resolution_status
      ? `<span class="pill pill-subtle">${escapeHTML(formatResolutionStatus(row.resolution_status))}</span>`
      : '',
    row.asset_type === 'ip' && row.ptr ? `<span class="pill pill-subtle">${escapeHTML(row.ptr)}</span>` : '',
    renderOwnershipBadge(row.ownership_state),
  ]
    .filter(Boolean)
    .join('')

  const evidenceHTML =
    groupedEvidence ||
    (previewPairs.length > 0
      ? `<ul class="detail-preview-list">${previewPairs
          .map(
            (pair) =>
              `<li><span class="detail-preview-label">${escapeHTML(pair.label)}</span><span class="detail-preview-value">${escapeHTML(pair.value)}</span></li>`,
          )
          .join('')}</ul>`
      : '<p class="muted">No additional evidence preview was exported for this row.</p>')

  const contributorSummary = [
    '<div class="detail-summary-meta">',
    `<span><strong>Enumeration</strong> ${escapeHTML(row.enumeration_id || '-')}</span>`,
    `<span><strong>Seed</strong> ${escapeHTML(row.seed_id || '-')}</span>`,
    row.asset_type === 'ip' ? `<span><strong>ASN</strong> ${escapeHTML(row.asn ? String(row.asn) : '-')}</span>` : '',
    row.asset_type === 'ip' ? `<span><strong>Org</strong> ${escapeHTML(row.organization || '-')}</span>` : '',
    '</div>',
    '<div class="detail-summary-sources">',
    `<div><strong>Discovered By</strong>${renderSourceCell(row.discovered_by || row.source)}</div>`,
    `<div><strong>Enriched By</strong>${renderSourceCell(row.enriched_by)}</div>`,
    '</div>',
  ].join('')

  const traceStats = [
    contributors.length ? `${contributors.length} contributor${contributors.length === 1 ? '' : 's'}` : '',
    observationCount ? `${observationCount} observation${observationCount === 1 ? '' : 's'}` : '',
    relationCount ? `${relationCount} relation${relationCount === 1 ? '' : 's'}` : '',
    enrichmentCount ? `${enrichmentCount} enrichment stage${enrichmentCount === 1 ? '' : 's'}` : '',
  ].filter(Boolean)

  const relatedPreview =
    related.length > 0
      ? `<div class="detail-related-inline">${related
          .slice(0, 3)
          .map((link) => `<span class="pill pill-subtle">${escapeHTML(link.identifier || link.asset_id)}</span>`)
          .join('')}${related.length > 3 ? `<span class="pill pill-subtle">+${related.length - 3} more</span>` : ''}</div>`
      : '<p class="muted">No related assets were linked in this export.</p>'

  return [
    `<td colspan="${String(colSpan)}">`,
    '<div class="detail-panel">',
    '<article class="detail-card detail-summary-card">',
    '<div class="detail-summary-head">',
    '<div>',
    '<div class="eyebrow">Inline Summary</div>',
    `<h4>${escapeHTML(row.identifier)}</h4>`,
    `<p class="muted">Asset ${escapeHTML(row.asset_id)} · ${escapeHTML(row.status || 'unknown')}</p>`,
    '</div>',
    `<div class="detail-summary-badges">${identityBadges}</div>`,
    '</div>',
    row.inclusion_reason
      ? `<p class="detail-summary-reason">${escapeHTML(row.inclusion_reason)}</p>`
      : '<p class="detail-summary-reason muted">No inclusion reason was exported for this asset.</p>',
    contributorSummary,
    '</article>',
    '<article class="detail-card detail-compact-card">',
    '<h4>Evidence Preview</h4>',
    evidenceHTML,
    '</article>',
    '<article class="detail-card detail-compact-card">',
    '<h4>Trace Summary</h4>',
    traceStats.length > 0
      ? `<div class="detail-related-inline">${traceStats
          .map((item) => `<span class="pill pill-subtle">${escapeHTML(item)}</span>`)
          .join('')}</div>`
      : '<p class="muted">Trace statistics are not available for this asset.</p>',
    relatedPreview,
    '<div class="detail-actions">',
    `<a href="${escapeHTML(row.trace_path || '#')}" class="result-trace-link" data-trace-link data-run-id="${escapeHTML(runId)}" data-asset-id="${escapeHTML(row.asset_id)}">Open Trace</a>`,
    '</div>',
    '</article>',
    '</div>',
    '</td>',
  ].join('')
}

function renderTraceSummary(trace: Trace): string {
  const pills: string[] = []
  const nodes = traceNodes(trace)
  const contributors = trace.contributors ?? []
  const uniqueContributorValues = (key: keyof TraceContributor): string[] => {
    const seen = new Set<string>()
    return contributors
      .map((item) => String(item[key] ?? '').trim())
      .filter((value) => {
        if (!value || seen.has(value)) {
          return false
        }
        seen.add(value)
        return true
      })
  }

  if (trace.asset_type) {
    pills.push(`<span class="pill">${escapeHTML(trace.asset_type)}</span>`)
  }
  if (trace.domain_kind) {
    pills.push(`<span class="pill">${escapeHTML(formatDomainKind(trace.domain_kind))}</span>`)
  }
  if (trace.registrable_domain) {
    pills.push(`<span class="pill">${escapeHTML(trace.registrable_domain)}</span>`)
  }
  if (trace.resolution_status) {
    pills.push(`<span class="pill">${escapeHTML(formatResolutionStatus(trace.resolution_status))}</span>`)
  }
  if (trace.discovered_by) {
    splitSources(trace.discovered_by).forEach((source) => {
      pills.push(`<span class="pill">Discovered via ${escapeHTML(source)}</span>`)
    })
  }
  if (trace.enriched_by) {
    splitSources(trace.enriched_by).forEach((source) => {
      pills.push(`<span class="pill">Enriched via ${escapeHTML(source)}</span>`)
    })
  } else if (trace.source && !trace.discovered_by) {
    splitSources(trace.source).forEach((source) => {
      pills.push(`<span class="pill">${escapeHTML(source)}</span>`)
    })
  }
  if (contributors.length > 0) {
    pills.push(`<span class="pill">${escapeHTML(String(contributors.length))} contributor${contributors.length === 1 ? '' : 's'}</span>`)
    const enumerations = uniqueContributorValues('enumeration_id')
    if (enumerations.length === 1) {
      pills.push(`<span class="pill">Enum ${escapeHTML(enumerations[0])}</span>`)
    } else if (enumerations.length > 1) {
      pills.push(`<span class="pill">${escapeHTML(String(enumerations.length))} enumerations</span>`)
    }
    const seeds = uniqueContributorValues('seed_id')
    if (seeds.length === 1) {
      pills.push(`<span class="pill">Seed ${escapeHTML(seeds[0])}</span>`)
    } else if (seeds.length > 1) {
      pills.push(`<span class="pill">${escapeHTML(String(seeds.length))} seeds</span>`)
    }
  } else {
    if (trace.enumeration_id) {
      pills.push(`<span class="pill">Enum ${escapeHTML(trace.enumeration_id)}</span>`)
    }
    if (trace.seed_id) {
      pills.push(`<span class="pill">Seed ${escapeHTML(trace.seed_id)}</span>`)
    }
  }
  const observationCount = nodes.filter((node) => node.kind === 'observation').length
  const relationCount = nodes.filter((node) => node.kind === 'relation').length
  if (observationCount > 0) {
    pills.push(`<span class="pill">${escapeHTML(String(observationCount))} observations</span>`)
  }
  if (relationCount > 0) {
    pills.push(`<span class="pill">${escapeHTML(String(relationCount))} relations</span>`)
  }
  return pills.join('')
}

function buildTraceChildren(trace: Trace): Map<string, TraceNode[]> {
  const children = new Map<string, TraceNode[]>()
  traceNodes(trace).forEach((node) => {
    const parentKey = node.parent_id || '__root__'
    const existing = children.get(parentKey) ?? []
    existing.push(node)
    children.set(parentKey, existing)
  })
  return children
}

function renderTraceNodeBranch(
  children: Map<string, TraceNode[]>,
  parentID: string,
  selectedID: string,
  depth: number,
): string {
  const nodes = children.get(parentID) ?? []
  return nodes
    .map((node) => {
      const childHTML = renderTraceNodeBranch(children, node.id, selectedID, depth + 1)
      const badges = [node.kind ? humanizeKey(node.kind) : '', ...(node.badges ?? [])].filter(Boolean)
      return [
        `<div class="trace-tree-node" style="--trace-depth:${String(depth)}">`,
        `<button type="button" class="trace-node-button${node.id === selectedID ? ' is-active' : ''}" data-trace-node-id="${escapeHTML(node.id)}">`,
        '<span class="trace-node-copy">',
        `<span class="trace-node-label">${escapeHTML(node.label || 'Trace Node')}</span>`,
        node.subtitle ? `<span class="trace-node-subtitle">${escapeHTML(node.subtitle)}</span>` : '',
        '</span>',
        badges.length > 0
          ? `<span class="trace-node-badges">${badges
              .map((badge) => `<span class="pill pill-subtle">${escapeHTML(badge)}</span>`)
              .join('')}</span>`
          : '',
        '</button>',
        childHTML ? `<div class="trace-tree-children">${childHTML}</div>` : '',
        '</div>',
      ].join('')
    })
    .join('')
}

function renderTraceTree(trace: Trace | null, selectedNodeID: string): string {
  const nodes = traceNodes(trace)
  const selected = findTraceNode(trace, selectedNodeID)
  if (nodes.length === 0 || !selected) {
    return '<div class="trace-panel-empty"><p class="muted">This result does not include exported trace nodes.</p></div>'
  }

  const children = buildTraceChildren(trace as Trace)
  return `<div class="trace-tree-list">${renderTraceNodeBranch(children, '__root__', selected.id, 0)}</div>`
}

function renderTraceDetailSection(section: TraceSection): string {
  const items = section.items ?? []
  return [
    '<article class="trace-card">',
    `<h3>${escapeHTML(section.title || 'Trace Details')}</h3>`,
    items.length > 0
      ? `<ul class="trace-items">${items.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}</ul>`
      : '<p class="muted">No exported items.</p>',
    '</article>',
  ].join('')
}

function renderTraceNodePanel(trace: Trace | null, selectedNodeID: string): string {
  const node = findTraceNode(trace, selectedNodeID)
  if (!node) {
    return '<div class="trace-panel-empty"><p class="muted">Select a node to inspect its exported properties and evidence.</p></div>'
  }

  const meta = [
    node.kind ? `<span class="pill pill-subtle">${escapeHTML(humanizeKey(node.kind))}</span>` : '',
    node.linked_asset_id ? `<span class="pill pill-subtle">Asset ${escapeHTML(node.linked_asset_id)}</span>` : '',
    node.linked_observation_id
      ? `<span class="pill pill-subtle">Observation ${escapeHTML(node.linked_observation_id)}</span>`
      : '',
    node.linked_relation_id ? `<span class="pill pill-subtle">Relation ${escapeHTML(node.linked_relation_id)}</span>` : '',
  ]
    .filter(Boolean)
    .join('')

  return [
    '<article class="trace-panel-body">',
    '<div class="trace-panel-hero">',
    '<div>',
    `<h3>${escapeHTML(node.label || 'Trace Node')}</h3>`,
    node.subtitle
      ? `<p class="muted">${escapeHTML(node.subtitle)}</p>`
      : '<p class="muted">No subtitle exported for this node.</p>',
    '</div>',
    meta ? `<div class="trace-panel-meta">${meta}</div>` : '',
    '</div>',
    (node.details ?? []).length > 0
      ? (node.details ?? []).map((section) => renderTraceDetailSection(section)).join('')
      : '<div class="trace-card"><h3>No Details</h3><p class="muted">This node does not include additional exported details.</p></div>',
    '</article>',
  ].join('')
}

function renderTraceRelated(trace: Trace | null, runId: string): string {
  const related = trace?.related ?? []
  if (related.length === 0) {
    return '<p class="muted">No related results were linked for this exported trace.</p>'
  }
  return `<div class="trace-related-list">${related
    .map(
      (link) =>
        [
          '<div class="trace-related-item">',
          '<div class="trace-related-copy">',
          `<strong>${escapeHTML(link.identifier || link.asset_id)}</strong>`,
          `<span class="muted">${escapeHTML(link.label || 'Related Result')}</span>`,
          link.description ? `<div class="muted">${escapeHTML(link.description)}</div>` : '',
          '</div>',
          `<a href="${escapeHTML(link.trace_path || '#')}" class="trace-related-link" data-trace-link data-run-id="${escapeHTML(runId)}" data-asset-id="${escapeHTML(link.asset_id)}">Open Trace</a>`,
          '</div>',
        ].join(''),
    )
    .join('')}</div>`
}

function renderJudgeCandidate(candidate: JudgeCandidate, accepted: boolean): string {
  const meta = []
  if (candidate.kind) {
    meta.push(`<span class="pill pill-subtle">${escapeHTML(humanizeKey(candidate.kind))}</span>`)
  }
  const confidence = formatConfidence(candidate.confidence)
  if (confidence) {
    meta.push(`<span class="pill pill-subtle">Confidence ${escapeHTML(confidence)}</span>`)
  }
  meta.push(`<span class="pill pill-subtle">${candidate.explicit ? 'Explicit' : 'Implicit'}</span>`)
  const support =
    Array.isArray(candidate.support) && candidate.support.length > 0
      ? `<ul class="judge-support">${candidate.support
          .map((item) => `<li>${escapeHTML(item)}</li>`)
          .join('')}</ul>`
      : ''

  return [
    '<details class="judge-item">',
    '<summary class="judge-item-summary">',
    '<div class="judge-item-head">',
    `<strong>${escapeHTML(candidate.root || 'unknown')}</strong>`,
    candidate.reason
      ? `<div class="judge-item-reason">${escapeHTML(candidate.reason)}</div>`
      : '<div class="judge-item-reason">No reason was returned for this candidate.</div>',
    '</div>',
    `<span class="pill ${accepted ? 'pill-accepted' : 'pill-discarded'}">${accepted ? 'Accepted' : 'Discarded'}</span>`,
    '</summary>',
    '<div class="judge-item-copy">',
    meta.length > 0 ? `<div class="judge-meta">${meta.join('')}</div>` : '',
    support,
    '</div>',
    '</details>',
  ].join('')
}

function renderJudgeGroup(group: JudgeGroup): string {
  const seedLabel = group.seed_label || group.seed_id || 'Unknown seed'
  const seedDomains = group.seed_domains?.length ? group.seed_domains.join(', ') : ''
  const accepted = group.accepted ?? []
  const discarded = group.discarded ?? []
  const groupMeta = [`<span class="pill pill-subtle">${escapeHTML(humanizeKey(group.collector || 'judge'))}</span>`]
  if (group.scenario) {
    groupMeta.push(`<span class="pill pill-subtle">${escapeHTML(humanizeKey(group.scenario))}</span>`)
  }
  if (seedDomains) {
    groupMeta.push(`<span class="pill pill-subtle">${escapeHTML(seedDomains)}</span>`)
  }
  const renderColumn = (title: string, items: JudgeCandidate[], acceptedItems: boolean): string => {
    if (items.length === 0) {
      return `<section class="judge-column"><h4>${escapeHTML(title)}</h4><p class="muted">No candidates in this bucket.</p></section>`
    }
    return `<section class="judge-column"><h4>${escapeHTML(title)}</h4><div class="judge-list">${items
      .map((item) => renderJudgeCandidate(item, acceptedItems))
      .join('')}</div></section>`
  }

  return [
    '<details class="judge-group">',
    '<summary class="judge-group-toggle">',
    '<div>',
    `<h3>${escapeHTML(humanizeKey(group.collector || 'judge'))} for ${escapeHTML(seedLabel)}</h3>`,
    group.seed_id && group.seed_id !== seedLabel
      ? `<div class="muted">Seed ID: ${escapeHTML(group.seed_id)}</div>`
      : '',
    '</div>',
    '<div>',
    `<div class="judge-group-stats"><span class="pill pill-count">Accepted ${String(accepted.length)}</span><span class="pill pill-count">Discarded ${String(discarded.length)}</span></div>`,
    `<div class="judge-group-meta">${groupMeta.join('')}</div>`,
    '</div>',
    '</summary>',
    '<div class="judge-columns">',
    renderColumn(`Accepted Candidates (${String(accepted.length)})`, accepted, true),
    renderColumn(`Discarded Candidates (${String(discarded.length)})`, discarded, false),
    '</div>',
    '</details>',
  ].join('')
}

function renderJudgeSummary(summary: JudgeSummary | undefined): string {
  const groups = summary?.groups ?? []
  return groups.map((group) => renderJudgeGroup(group)).join('')
}

function renderLLMSummary(run: Run | null): string {
  if (!run) {
    return 'No run loaded.'
  }

  const domains = new Set<string>()
  const sources = new Set<string>()
  const types = { domain: 0, ip: 0 }
  const kinds = { registrable: 0, subdomain: 0 }

  run.rows.forEach((row) => {
    if (row.registrable_domain) {
      domains.add(row.registrable_domain)
    }
    splitSources(row.source).forEach((source) => sources.add(source))
    if (row.asset_type === 'domain') {
      types.domain += 1
    } else {
      types.ip += 1
    }
    if (row.domain_kind === 'registrable') {
      kinds.registrable += 1
    } else if (row.domain_kind === 'subdomain') {
      kinds.subdomain += 1
    }
  })

  const judge = run.judge_summary ?? { evaluation_count: 0, accepted_count: 0, discarded_count: 0 }
  return [
    `Run: ${run.id}`,
    `Date: ${run.label}`,
    `Total Assets: ${run.asset_count}`,
    `  Domains: ${types.domain} (registrable: ${kinds.registrable}, subdomain: ${kinds.subdomain})`,
    `  IPs: ${types.ip}`,
    `Unique Registrable Domains: ${domains.size} [${[...domains].sort().join(', ')}]`,
    `Sources Used: ${sources.size} [${[...sources].sort().join(', ')}]`,
    `Enumerations: ${run.enumeration_count || 0}`,
    `Seeds: ${run.seed_count || 0}`,
    `Judge Evaluations: ${judge.evaluation_count || 0}`,
    `  Accepted Candidates: ${judge.accepted_count || 0}`,
    `  Discarded Candidates: ${judge.discarded_count || 0}`,
  ].join('\n')
}

function renderResultsHead(view: View, sortKey: SortKey, sortDirection: SortDirection): string {
  const label = (key: SortKey): string => {
    const suffix = key === sortKey ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''
    return `${sortLabels[key]}${suffix}`
  }

  if (view === 'domains') {
    return `<tr>
      <th style="width:2.5rem"></th>
      <th><button type="button" data-key="identifier" data-tooltip="The domain or hostname identifier for this asset.">${escapeHTML(label('identifier'))}</button></th>
      <th><button type="button" data-key="domain_kind" data-tooltip="Whether this domain is a registrable root or a discovered subdomain.">${escapeHTML(label('domain_kind'))}</button></th>
      <th><button type="button" data-key="ownership_state" data-tooltip="The verified or implicit ownership state of this asset.">${escapeHTML(label('ownership_state'))}</button></th>
      <th><button type="button" data-key="resolution_status" data-tooltip="Whether the domain currently resolves, was enriched but did not resolve, or has not been checked yet.">${escapeHTML(label('resolution_status'))}</button></th>
      <th><button type="button" data-key="source" data-tooltip="Collectors and enrichers that contributed this exported result.">${escapeHTML(label('source'))}</button></th>
      <th><button type="button" data-key="status" data-tooltip="Merged enumeration status for the contributing discovery runs.">${escapeHTML(label('status'))}</button></th>
      <th><button type="button" data-key="discovery_date" data-tooltip="When this result was first observed in the current exported run.">${escapeHTML(label('discovery_date'))}</button></th>
    </tr>`
  }

  if (view === 'ips') {
    return `<tr>
      <th style="width:2.5rem"></th>
      <th><button type="button" data-key="identifier" data-tooltip="The IP address identifier for this asset.">${escapeHTML(label('identifier'))}</button></th>
      <th><button type="button" data-key="ownership_state" data-tooltip="The verified or implicit ownership state of this asset.">${escapeHTML(label('ownership_state'))}</button></th>
      <th><button type="button" data-key="asn" data-tooltip="Autonomous System Number associated with this IP address.">${escapeHTML(label('asn'))}</button></th>
      <th><button type="button" data-key="organization" data-tooltip="Organization name returned by the IP ownership enrichment lookup.">${escapeHTML(label('organization'))}</button></th>
      <th><button type="button" data-key="ptr" data-tooltip="Reverse DNS hostname returned for this IP address, when one exists.">${escapeHTML(label('ptr'))}</button></th>
      <th><button type="button" data-key="source" data-tooltip="Collectors and enrichers that contributed this exported result.">${escapeHTML(label('source'))}</button></th>
      <th><button type="button" data-key="status" data-tooltip="Merged enumeration status for the contributing discovery runs.">${escapeHTML(label('status'))}</button></th>
      <th><button type="button" data-key="discovery_date" data-tooltip="When this result was first observed in the current exported run.">${escapeHTML(label('discovery_date'))}</button></th>
    </tr>`
  }

  return ''
}

function renderResultsBody(
  view: View,
  run: Run | null,
  runId: string,
  rows: Row[],
  domainGroups: DomainGroup[],
  expandedRows: Set<string>,
  expandedDomainGroups: Set<string>,
  filtersAreActive: boolean,
  copiedValue: string | null,
): string {
  if (view === 'domains') {
    return domainGroups
      .map((group) => {
        const expanded = filtersAreActive || expandedDomainGroups.has(group.key)
        const summaryRow = group.summaryRow
        const displayRow = summaryRow || group.rows[0] || null
        const childRows = group.rows.filter((row) => !summaryRow || row.asset_id !== summaryRow.asset_id)
        const summaryExpanded = summaryRow ? expandedRows.has(summaryRow.asset_id) : false
        const summaryDiscovered = displayRow?.discovery_date
          ? new Date(displayRow.discovery_date).toLocaleString()
          : ''
        const summaryKind = displayRow?.domain_kind ? formatDomainKind(displayRow.domain_kind) : 'Domain'
        const summaryResolution = displayRow ? formatResolutionStatus(displayRow.resolution_status || '-') : '-'
        const summaryStatus = displayRow ? escapeHTML(displayRow.status || '-') : '-'
        const copied = copiedValue === group.key

        const groupRow = [
          '<tr class="domain-group-row">',
          `<td><div class="domain-group-controls"><button type="button" class="domain-group-toggle" data-domain-group="${escapeHTML(group.key)}" aria-expanded="${expanded ? 'true' : 'false'}">${expanded ? '▼' : '▶'}</button></div></td>`,
          `<td><div class="domain-group-summary"><div class="domain-group-copy">${
            summaryRow
              ? `<button type="button" class="domain-summary-trigger" data-summary-asset-id="${escapeHTML(summaryRow.asset_id)}" aria-expanded="${summaryExpanded ? 'true' : 'false'}"><strong>${escapeHTML(group.key)}</strong></button>`
              : `<strong>${escapeHTML(group.key)}</strong>`
          }<span class="pill">${group.rows.length} asset${group.rows.length === 1 ? '' : 's'}</span><button type="button" class="copy-trigger" data-copy-value="${escapeHTML(group.key)}" aria-label="Copy domain" data-tooltip="Copy to clipboard">${copied ? '✓' : copyIcon()}</button></div></div></td>`,
          `<td><span class="pill">${escapeHTML(summaryKind)}</span></td>`,
          `<td>${displayRow ? renderOwnershipBadge(displayRow.ownership_state) : '<span class="muted">-</span>'}</td>`,
          `<td><span class="pill pill-subtle">${escapeHTML(summaryResolution)}</span></td>`,
          `<td>${displayRow ? renderSourceCell(displayRow.source) : '<span class="muted">-</span>'}</td>`,
          `<td>${summaryStatus}</td>`,
          `<td>${escapeHTML(summaryDiscovered)}</td>`,
          '</tr>',
          summaryExpanded && summaryRow
            ? `<tr class="detail-row">${renderDetailPanel(summaryRow, run, runId)}</tr>`
            : '',
          expanded
            ? childRows
                .map((row) => {
                  const discovered = row.discovery_date ? new Date(row.discovery_date).toLocaleString() : ''
                  const isExpanded = expandedRows.has(row.asset_id)
                  const copiedChild = copiedValue === row.identifier
                  return [
                    '<tr class="domain-child-row">',
                    '<td></td>',
                    `<td><div class="domain-child-identifier"><button type="button" class="domain-child-trigger" data-child-asset-id="${escapeHTML(row.asset_id)}" aria-expanded="${isExpanded ? 'true' : 'false'}"><strong>${escapeHTML(row.identifier)}</strong></button><button type="button" class="copy-trigger" data-copy-value="${escapeHTML(row.identifier)}" aria-label="Copy domain" data-tooltip="Copy to clipboard">${copiedChild ? '✓' : copyIcon()}</button></div></td>`,
                    `<td><span class="pill">${escapeHTML(row.domain_kind ? formatDomainKind(row.domain_kind) : row.asset_type || '-')}</span></td>`,
                    `<td>${renderOwnershipBadge(row.ownership_state)}</td>`,
                    `<td><span class="pill pill-subtle">${escapeHTML(formatResolutionStatus(row.resolution_status || '-'))}</span></td>`,
                    `<td>${renderSourceCell(row.source)}</td>`,
                    `<td>${escapeHTML(row.status || '-')}</td>`,
                    `<td>${escapeHTML(discovered)}</td>`,
                    '</tr>',
                    isExpanded ? `<tr class="detail-row">${renderDetailPanel(row, run, runId)}</tr>` : '',
                  ].join('')
                })
                .join('')
            : '',
        ].join('')

        return groupRow
      })
      .join('')
  }

  if (view === 'ips') {
    return rows
      .map((row) => {
        const discovered = row.discovery_date ? new Date(row.discovery_date).toLocaleString() : ''
        const isExpanded = expandedRows.has(row.asset_id)
        const copied = copiedValue === row.identifier
        return [
          '<tr>',
          `<td><button type="button" class="detail-toggle" data-asset-id="${escapeHTML(row.asset_id)}">${isExpanded ? '▼' : '▶'}</button></td>`,
          `<td><div class="identifier-with-copy"><strong>${escapeHTML(row.identifier)}</strong><button type="button" class="copy-trigger" data-copy-value="${escapeHTML(row.identifier)}" aria-label="Copy IP" data-tooltip="Copy to clipboard">${copied ? '✓' : copyIcon()}</button></div></td>`,
          `<td>${renderOwnershipBadge(row.ownership_state)}</td>`,
          `<td>${escapeHTML(row.asn ? String(row.asn) : '-')}</td>`,
          `<td>${escapeHTML(row.organization || '-')}</td>`,
          `<td><span class="pill pill-subtle">${escapeHTML(row.ptr || '-')}</span></td>`,
          `<td>${renderSourceCell(row.source)}</td>`,
          `<td>${escapeHTML(row.status || '-')}</td>`,
          `<td>${escapeHTML(discovered)}</td>`,
          '</tr>',
          isExpanded ? `<tr class="detail-row">${renderDetailPanel(row, run, runId)}</tr>` : '',
        ].join('')
      })
      .join('')
  }

  return ''
}

function copyIcon(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
}

function findTooltipElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null
  }
  const matched = target.closest<HTMLElement>('[data-tooltip]')
  return matched && document.body.contains(matched) ? matched : null
}

function resolveSelectedRunSummary(manifest: Manifest | null, requestedRunID: string): Manifest['runs'][number] | null {
  if (!manifest?.runs.length) {
    return null
  }
  if (requestedRunID) {
    const matched = manifest.runs.find((run) => run.id === requestedRunID)
    if (matched) {
      return matched
    }
  }
  return manifest.runs[0] ?? null
}

function resolveTraceSelection(run: Run | null, view: View, requestedAssetID: string): { view: View; assetId: string } {
  if (view !== 'trace' || !run) {
    return { view, assetId: requestedAssetID }
  }

  if (currentTrace(run, requestedAssetID)) {
    return { view, assetId: requestedAssetID }
  }

  const fallbackAssetID =
    run.traces?.[0]?.asset_id ?? visibleRows(run, 'domains', '', '', '', [], 'discovery_date', 'desc')[0]?.asset_id ?? ''
  if (fallbackAssetID) {
    return { view: 'trace', assetId: fallbackAssetID }
  }

  return { view: 'domains', assetId: '' }
}

function sanitizeSelectedValues(values: string[], availableValues: string[]): string[] {
  return values.filter((value) => availableValues.includes(value))
}

function App() {
  const initialRoute = parseHash(window.location.hash)
  const sourceFilterRef = useRef<HTMLDivElement | null>(null)
  const [manifestURL] = useState(() => resolveManifestURL())
  const copyTimerRef = useRef<number | null>(null)

  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [manifestError, setManifestError] = useState('')
  const [isManifestLoading, setIsManifestLoading] = useState(true)
  const [runCache, setRunCache] = useState<Record<string, Run>>({})
  const [runError, setRunError] = useState('')
  const [runLoadingID, setRunLoadingID] = useState('')

  const [runId, setRunId] = useState(initialRoute.runId)
  const [view, setView] = useState<View>(initialRoute.view)
  const [traceAssetId, setTraceAssetId] = useState(initialRoute.assetId)
  const [traceNodeId, setTraceNodeId] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const search = useDeferredValue(normalize(searchInput))
  const [domainKind, setDomainKind] = useState('')
  const [resolutionStatus, setResolutionStatus] = useState('')
  const [sources, setSources] = useState<string[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('discovery_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set())
  const [expandedDomainGroups, setExpandedDomainGroups] = useState<Set<string>>(() => new Set())
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    text: '',
    left: 0,
    top: 0,
  })

  useEffect(() => {
    let active = true

    void fetchManifest(window.fetch.bind(window), manifestURL)
      .then((nextManifest) => {
        if (!active) {
          return
        }
        setManifest(nextManifest)
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }
        setManifestError(error instanceof Error ? error.message : 'failed to load manifest')
      })
      .finally(() => {
        if (active) {
          setIsManifestLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [manifestURL])

  const selectedRunSummary = resolveSelectedRunSummary(manifest, runId)
  const selectedRunID = selectedRunSummary?.id ?? ''
  const run = selectedRunSummary ? (runCache[selectedRunSummary.id] ?? null) : null

  useEffect(() => {
    if (!selectedRunSummary || runCache[selectedRunSummary.id]) {
      return
    }

    let active = true
    queueMicrotask(() => {
      if (!active) {
        return
      }
      setRunError('')
      setRunLoadingID(selectedRunSummary.id)
    })

    void fetchRun(window.fetch.bind(window), manifestURL, selectedRunSummary)
      .then((loadedRun) => {
        if (!active) {
          return
        }
        setRunCache((current) => ({ ...current, [loadedRun.id]: loadedRun }))
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }
        setRunError(error instanceof Error ? error.message : `failed to load run ${selectedRunSummary.id}`)
      })
      .finally(() => {
        if (active) {
          setRunLoadingID((current) => (current === selectedRunSummary.id ? '' : current))
        }
      })

    return () => {
      active = false
    }
  }, [manifestURL, runCache, selectedRunSummary])

  useEffect(() => {
    const handleHashChange = (): void => {
      const next = parseHash(window.location.hash)
      startTransition(() => {
        setView(next.view)
        if (next.runId) {
          setRunId(next.runId)
        }
        setTraceAssetId(next.assetId)
        setTraceNodeId('')
      })
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const resolvedTraceSelection = resolveTraceSelection(run, view, traceAssetId)
  const activeView = resolvedTraceSelection.view
  const activeTraceAssetId = resolvedTraceSelection.assetId
  const trace = currentTrace(run, activeTraceAssetId)
  const activeTraceNodeId = findTraceNode(trace, traceNodeId)?.id ?? ''
  const availableDomainKinds = run ? uniqueValues(run.rows, 'domain_kind') : []
  const activeDomainKind = domainKind && availableDomainKinds.includes(domainKind) ? domainKind : ''
  const availableResolutionStatuses = run
    ? uniqueValues(run.rows.filter((row) => row.asset_type === 'domain'), 'resolution_status')
    : []
  const activeResolutionStatus =
    resolutionStatus && availableResolutionStatuses.includes(resolutionStatus) ? resolutionStatus : ''
  const availableSources = run ? uniqueSourceValues(rowsForSourceFilter(run.rows, activeView)) : []
  const activeSources = sanitizeSelectedValues(sources, availableSources)
  const rows = visibleRows(run, activeView, search, activeDomainKind, activeResolutionStatus, activeSources, sortKey, sortDirection)
  const allDomainRows = run ? rowsForSourceFilter(run.rows, activeView) : []
  const domainGroups = activeView === 'domains' ? buildDomainGroups(rows, allDomainRows) : []
  const filtersAreActive = hasActiveDomainFilters(search, activeDomainKind, activeResolutionStatus, activeSources)
  const displayedCount =
    activeView === 'domains' ? displayedDomainRowCount(domainGroups, expandedDomainGroups, filtersAreActive) : rows.length

  useEffect(() => {
    const nextHash = buildHash(activeView, selectedRunID, activeTraceAssetId)
    if (window.location.hash !== nextHash) {
      const url = new URL(window.location.href)
      url.hash = nextHash
      window.history.replaceState(null, '', url)
    }
  }, [activeTraceAssetId, activeView, selectedRunID])

  useEffect(() => {
    if (!isSourceMenuOpen) {
      return
    }

    const handleDocumentClick = (event: MouseEvent): void => {
      if (sourceFilterRef.current && !sourceFilterRef.current.contains(event.target as Node)) {
        setIsSourceMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsSourceMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isSourceMenuOpen])

  useEffect(() => {
    const hideTooltip = (): void => {
      setTooltip((current) => (current.visible ? { ...current, visible: false } : current))
    }

    window.addEventListener('scroll', hideTooltip, true)
    window.addEventListener('resize', hideTooltip)
    return () => {
      window.removeEventListener('scroll', hideTooltip, true)
      window.removeEventListener('resize', hideTooltip)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  const runCount = manifest?.runs.length ?? 0
  const tableCaption =
    !selectedRunSummary
      ? 'No archived runs loaded.'
      : activeView === 'domains'
        ? `Showing ${domainGroups.length} registrable domains from ${rows.length} matching domain assets in ${selectedRunSummary.label}.`
        : `Showing ${rows.length} of ${run?.rows.length ?? selectedRunSummary.asset_count} rows from ${selectedRunSummary.label}.`
  const judgeSummary = run?.judge_summary
  const judgeGroupsHTML = renderJudgeSummary(judgeSummary)
  const judgeCaption =
    judgeSummary && (judgeSummary.groups?.length ?? 0) > 0
      ? `Captured ${judgeSummary.evaluation_count || 0} judge evaluation${judgeSummary.evaluation_count === 1 ? '' : 's'} across ${(judgeSummary.accepted_count || 0) + (judgeSummary.discarded_count || 0)} unique candidate roots.`
      : 'No judge evaluations were captured for this run.'
  const runDownloads: Downloads | undefined = run?.downloads ?? selectedRunSummary?.downloads
  const activeRunID = selectedRunSummary?.id ?? selectedRunID
  const resultsHeadHTML = renderResultsHead(activeView, sortKey, sortDirection)
  const resultsBodyHTML = renderResultsBody(
    activeView,
    run,
    activeRunID,
    rows,
    domainGroups,
    expandedRows,
    expandedDomainGroups,
    filtersAreActive,
    copiedValue,
  )
  const llmSummary = renderLLMSummary(run)

  const openTrace = (nextRunId: string, assetId: string): void => {
    if (!nextRunId || !assetId) {
      return
    }
    setRunId(nextRunId)
    setView('trace')
    setTraceAssetId(assetId)
    setTraceNodeId('')
    setExpandedRows(new Set())
    setExpandedDomainGroups(new Set())
  }

  const copyToClipboard = (value: string): void => {
    if (!value) {
      return
    }
    void navigator.clipboard.writeText(value)
    setCopiedValue(value)
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current)
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedValue((current) => (current === value ? null : current))
    }, 1200)
  }

  const handleSortClick = (event: React.MouseEvent<HTMLTableSectionElement>): void => {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-key]') : null
    if (!target) {
      return
    }
    const key = target.dataset.key as SortKey | undefined
    if (!key) {
      return
    }
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection(key === 'discovery_date' ? 'desc' : 'asc')
  }

  const handleResultsClick = (event: React.MouseEvent<HTMLElement>): void => {
    const target = event.target instanceof Element ? event.target : null
    if (!target) {
      return
    }

    const toggle = target.closest<HTMLElement>('.detail-toggle, .domain-summary-trigger, .domain-child-trigger')
    if (toggle) {
      const assetID = toggle.dataset.assetId || toggle.dataset.summaryAssetId || toggle.dataset.childAssetId || ''
      if (!assetID) {
        return
      }
      setExpandedRows((current) => {
        const next = new Set(current)
        if (next.has(assetID)) {
          next.delete(assetID)
        } else {
          next.add(assetID)
        }
        return next
      })
      return
    }

    const groupToggle = target.closest<HTMLElement>('[data-domain-group]')
    if (groupToggle) {
      const groupKey = groupToggle.dataset.domainGroup || ''
      if (!groupKey || filtersAreActive) {
        return
      }
      setExpandedDomainGroups((current) => {
        const next = new Set(current)
        if (next.has(groupKey)) {
          next.delete(groupKey)
        } else {
          next.add(groupKey)
        }
        return next
      })
      return
    }

    const copyTrigger = target.closest<HTMLElement>('.copy-trigger')
    if (copyTrigger) {
      copyToClipboard(copyTrigger.dataset.copyValue || '')
      return
    }

    const traceLink = target.closest<HTMLElement>('[data-trace-link]')
    if (traceLink) {
      event.preventDefault()
      openTrace(traceLink.dataset.runId || activeRunID, traceLink.dataset.assetId || '')
    }
  }

  const handleTraceClick = (event: React.MouseEvent<HTMLElement>): void => {
    const target = event.target instanceof Element ? event.target : null
    if (!target) {
      return
    }

    const traceNode = target.closest<HTMLElement>('[data-trace-node-id]')
    if (traceNode) {
      setTraceNodeId(traceNode.dataset.traceNodeId || '')
      return
    }

    const traceLink = target.closest<HTMLElement>('[data-trace-link]')
    if (traceLink) {
      event.preventDefault()
      openTrace(traceLink.dataset.runId || activeRunID, traceLink.dataset.assetId || '')
    }
  }

  const showTooltip = (element: HTMLElement): void => {
    const text = element.dataset.tooltip
    if (!text) {
      setTooltip((current) => (current.visible ? { ...current, visible: false } : current))
      return
    }
    const rect = element.getBoundingClientRect()
    setTooltip({
      visible: true,
      text,
      left: rect.left + rect.width / 2,
      top: rect.bottom + 12,
    })
  }

  const handleTooltipOver = (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>): void => {
    const target = findTooltipElement(event.target)
    if (target) {
      showTooltip(target)
    }
  }

  const handleTooltipMove = (event: React.MouseEvent<HTMLElement>): void => {
    const target = findTooltipElement(event.target)
    if (target) {
      showTooltip(target)
    }
  }

  const hideTooltip = (): void => {
    setTooltip((current) => (current.visible ? { ...current, visible: false } : current))
  }

  if (isManifestLoading) {
    return (
      <main>
        <section className="hero">
          <div className="eyebrow">Visualizer Loading</div>
          <h1>Asset Discovery Visualizer</h1>
          <p>Loading archived run manifest from {manifestURL}.</p>
        </section>
      </main>
    )
  }

  if (manifestError) {
    return (
      <main>
        <section className="hero">
          <div className="eyebrow">Load Error</div>
          <h1>Asset Discovery Visualizer</h1>
          <p>{manifestError}</p>
        </section>
      </main>
    )
  }

  const showingTrace = activeView === 'trace' && Boolean(trace)
  const showingJudge = activeView === 'judge'
  const showingResults = activeView === 'domains' || activeView === 'ips' || (!showingTrace && !showingJudge)

  return (
    <>
      <div
        className="app-tooltip"
        id="app-tooltip"
        role="tooltip"
        aria-hidden={!tooltip.visible}
        data-visible={tooltip.visible}
        style={{
          left: `${tooltip.left}px`,
          top: `${tooltip.top}px`,
          opacity: tooltip.visible ? 1 : 0,
          transform: 'translate(-50%, 0)',
        }}
      >
        {tooltip.text}
      </div>
      <main
        onMouseOver={handleTooltipOver}
        onMouseMove={handleTooltipMove}
        onMouseOut={hideTooltip}
        onFocus={handleTooltipOver}
        onBlur={hideTooltip}
      >
        <section className="hero">
          <div className="eyebrow">Enumeration Results</div>
          <h1>Asset Discovery Visualizer</h1>
          <p>All archived discovery runs in one place. Choose a run, filter the table, and sort any column. Expand any row for deep details and trace provenance.</p>
          <p className="muted">Manifest: {manifestURL}</p>
        </section>

        <section className="controls">
          <div className="field">
            <label htmlFor="run-select">Run</label>
            <select
              id="run-select"
              value={selectedRunSummary?.id ?? ''}
              onChange={(event) => {
                setRunId(event.target.value)
                setExpandedRows(new Set())
                setExpandedDomainGroups(new Set())
                setTraceNodeId('')
                setIsSourceMenuOpen(false)
              }}
            >
              {(manifest?.runs ?? []).map((summary) => (
                <option key={summary.id} value={summary.id}>
                  {summary.label} ({summary.asset_count} assets)
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="search-input">Search</label>
            <input
              id="search-input"
              type="search"
              value={searchInput}
              placeholder="Filter identifier, registrable domain, details, source, seed, or enumeration"
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <div className="field" hidden={activeView !== 'domains'}>
            <label htmlFor="domain-kind-filter">Domain Kind</label>
            <select
              id="domain-kind-filter"
              value={activeDomainKind}
              onChange={(event) => setDomainKind(event.target.value)}
            >
              <option value="">All domain kinds</option>
              {availableDomainKinds.map((value) => (
                <option key={value} value={value}>
                  {formatDomainKind(value)}
                </option>
              ))}
            </select>
          </div>

          <div className="field" id="resolution-status-field" hidden={activeView !== 'domains'}>
            <label htmlFor="resolution-status-filter">Resolution</label>
            <select
              id="resolution-status-filter"
              value={activeResolutionStatus}
              onChange={(event) => setResolutionStatus(event.target.value)}
            >
              <option value="">All resolution states</option>
              {availableResolutionStatuses.map((value) => (
                <option key={value} value={value}>
                  {formatResolutionStatus(value)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="source-filter-trigger">Source</label>
            <div className={`multi-select${isSourceMenuOpen ? ' is-open' : ''}`} id="source-filter" ref={sourceFilterRef}>
              <button
                id="source-filter-trigger"
                type="button"
                className="multi-select-trigger"
                aria-haspopup="true"
                aria-expanded={isSourceMenuOpen}
                onClick={() => setIsSourceMenuOpen((current) => !current)}
              >
                {activeSources.length === 0
                  ? 'All sources'
                  : activeSources.length === 1
                    ? activeSources[0]
                    : `${activeSources.length} sources selected`}
              </button>
              <div className="multi-select-menu" id="source-filter-menu" hidden={!isSourceMenuOpen}>
                <label className="multi-select-option multi-select-option-all" data-tooltip="Show assets from every source.">
                  <input
                    type="checkbox"
                    data-role="all"
                    checked={activeSources.length === 0}
                    onChange={() => setSources([])}
                  />
                  <span>All sources</span>
                </label>
                <div className="multi-select-options" id="source-filter-options">
                  {availableSources.map((source) => (
                    <label key={source} className="multi-select-option" data-tooltip={describeSource(source)}>
                      <input
                        type="checkbox"
                        checked={activeSources.includes(source)}
                        onChange={(event) => {
                          setSources((current) => {
                            if (event.target.checked) {
                              return [...current, source].sort((left, right) => collator.compare(left, right))
                            }
                            return current.filter((item) => item !== source)
                          })
                        }}
                      />
                      <span>{source}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="summary">
          <article className="metric">
            <span>Archived Runs</span>
            <strong id="run-count">{runCount}</strong>
          </article>
          <article className="metric">
            <span>Selected Run</span>
            <strong id="selected-run">{selectedRunSummary?.label ?? 'No runs'}</strong>
          </article>
          <article className="metric">
            <span>Assets</span>
            <strong id="asset-count">{selectedRunSummary?.asset_count ?? 0}</strong>
          </article>
          <article className="metric">
            <span>Enumerations</span>
            <strong id="enumeration-count">{selectedRunSummary?.enumeration_count ?? 0}</strong>
          </article>
          <article className="metric">
            <span>Seeds</span>
            <strong id="seed-count">{selectedRunSummary?.seed_count ?? 0}</strong>
          </article>
          <article className="metric">
            <span>Visible Rows</span>
            <strong id="visible-count">{displayedCount}</strong>
          </article>
          <article className="metric">
            <span>Judge Accepted</span>
            <strong id="judge-accepted-count">{judgeSummary?.accepted_count ?? 0}</strong>
          </article>
          <article className="metric">
            <span>Judge Discarded</span>
            <strong id="judge-discarded-count">{judgeSummary?.discarded_count ?? 0}</strong>
          </article>
        </section>

        <section className="table-shell">
          <div className="table-meta">
            <div className="table-toolbar">
              <div className="muted" id="table-caption">
                {runLoadingID ? `Loading run ${runLoadingID}...` : tableCaption}
              </div>
              <div className="view-toggle" role="tablist" aria-label="Visualizer views">
                <button type="button" id="domains-view-button" className={activeView === 'domains' ? 'is-active' : ''} onClick={() => setView('domains')}>
                  Domains
                </button>
                <button type="button" id="ips-view-button" className={activeView === 'ips' ? 'is-active' : ''} onClick={() => setView('ips')}>
                  IPs
                </button>
                <button type="button" id="judge-view-button" className={activeView === 'judge' ? 'is-active' : ''} onClick={() => setView('judge')}>
                  Judge
                </button>
                <button
                  type="button"
                  id="trace-view-button"
                  className={showingTrace ? 'is-active' : ''}
                  onClick={() => {
                    if (activeTraceAssetId && currentTrace(run, activeTraceAssetId)) {
                      setView('trace')
                      return
                    }
                    const nextAsset = rows[0]?.asset_id ?? run?.traces?.[0]?.asset_id ?? ''
                    if (nextAsset) {
                      openTrace(activeRunID, nextAsset)
                    }
                  }}
                >
                  Trace
                </button>
              </div>
            </div>
            <div id="download-links">
              {runDownloads &&
                [
                  ['JSON', runDownloads.json],
                  ['CSV', runDownloads.csv],
                  ['XLSX', runDownloads.xlsx],
                ].map(([label, href]) =>
                  href ? (
                    <a key={label} href={resolveRelativeURL(manifestURL, href)}>
                      {label}
                    </a>
                  ) : null,
                )}
            </div>
          </div>

          <section className="judge-shell" id="judge-shell" hidden={!showingJudge || !judgeGroupsHTML}>
            <div>
              <div className="eyebrow">Judge Analysis</div>
              <h2>Accepted And Discarded Candidates</h2>
              <p className="muted" id="judge-caption">
                {judgeCaption}
              </p>
            </div>
            <div id="judge-groups" className="judge-groups" dangerouslySetInnerHTML={{ __html: judgeGroupsHTML }} />
          </section>

          <div className="table-wrap" id="results-view" hidden={!showingResults} onClick={handleResultsClick}>
            <table>
              <thead id="results-head" onClick={handleSortClick} dangerouslySetInnerHTML={{ __html: resultsHeadHTML }} />
              <tbody id="results-body" dangerouslySetInnerHTML={{ __html: resultsBodyHTML }} />
            </table>
          </div>

          <p id="empty-state" style={{ display: showingResults && (activeView === 'domains' ? domainGroups.length === 0 : rows.length === 0) ? 'block' : 'none' }}>
            No rows match the active filters.
          </p>

          <section className="trace-view" id="trace-view" hidden={!showingTrace} onClick={handleTraceClick}>
            <div className="trace-header">
              <div>
                <div className="eyebrow">Result Trace</div>
                <h2 id="trace-title">{trace?.identifier || trace?.asset_id || 'Select a result'}</h2>
                <p id="trace-subtitle">
                  {trace
                    ? `Trace for asset ${trace.asset_id}. Follow related results to pivot across the exported dataset.`
                    : 'Choose any result row to inspect its exported provenance, context, and related results.'}
                </p>
              </div>
              <button type="button" className="trace-back-button" id="trace-back-button" onClick={() => setView('domains')}>
                Back To Results
              </button>
            </div>
            <div id="trace-summary" className="trace-summary" dangerouslySetInnerHTML={{ __html: trace ? renderTraceSummary(trace) : '' }} />
            <div className="trace-workspace">
              <aside className="trace-tree-shell">
                <div className="eyebrow">Trace Tree</div>
                <div id="trace-tree" dangerouslySetInnerHTML={{ __html: renderTraceTree(trace, activeTraceNodeId) }} />
              </aside>
              <section className="trace-panel-shell">
                <div className="eyebrow">Node Details</div>
                <div id="trace-panel" dangerouslySetInnerHTML={{ __html: renderTraceNodePanel(trace, activeTraceNodeId) }} />
              </section>
            </div>
            <div className="trace-related-shell">
              <h3>Related Results</h3>
              <div id="trace-related" dangerouslySetInnerHTML={{ __html: renderTraceRelated(trace, activeRunID) }} />
            </div>
          </section>

          {showingJudge && !judgeGroupsHTML ? (
            <section className="judge-shell" id="judge-shell-empty">
              <div>
                <div className="eyebrow">Judge Analysis</div>
                <h2>Accepted And Discarded Candidates</h2>
                <p className="muted">{judgeCaption}</p>
              </div>
            </section>
          ) : null}
        </section>

        <section className="llm-summary" id="llm-summary">
          <div className="eyebrow">Machine-Readable Summary</div>
          <h2>Run Overview</h2>
          <pre id="llm-summary-text">{runError || llmSummary}</pre>
        </section>
      </main>
    </>
  )
}

export default App
