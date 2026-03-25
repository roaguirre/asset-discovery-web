import type { LiveAssetRow, LiveAssetTab } from './types'

export type AssetSortDirection = 'asc' | 'desc'
export type AssetTableTab = LiveAssetTab
export type AssetSortKey =
  | 'identifier'
  | 'asset_type'
  | 'domain_kind'
  | 'ownership_state'
  | 'resolution_status'
  | 'asn'
  | 'organization'
  | 'ptr'
  | 'source'
  | 'status'
  | 'discovery_date'

export type AssetSortState = {
  key: AssetSortKey
  direction: AssetSortDirection
}

export type AssetDetailPair = {
  label: string
  value: string
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

const ownershipDescriptions = Object.freeze({
  owned: 'Confirmed as directly owned or controlled by the target.',
  likely_owned: 'Strong evidence suggests the asset is owned or controlled by the target.',
  inferred: 'The asset is included because the evidence implies a likely connection, but it is not directly confirmed.',
  third_party: 'The asset appears associated with external infrastructure, a vendor, or a partner rather than the target.',
  unrelated: 'The asset was observed during discovery but judged unrelated to the target.',
  rejected: 'The asset or pivot candidate was reviewed and explicitly rejected from the owned set.',
} as Record<string, string>)

const tabSortKeys: Record<AssetTableTab, AssetSortKey[]> = {
  all: ['identifier', 'asset_type', 'ownership_state', 'source', 'discovery_date'],
  domains: ['identifier', 'domain_kind', 'ownership_state', 'resolution_status', 'source', 'status', 'discovery_date'],
  ips: ['identifier', 'ownership_state', 'asn', 'organization', 'ptr', 'source', 'status', 'discovery_date'],
}

export const defaultAssetSort: AssetSortState = {
  key: 'discovery_date',
  direction: 'desc',
}

export const assetSortLabels: Record<AssetSortKey, string> = {
  identifier: 'Identifier',
  asset_type: 'Type',
  domain_kind: 'Kind',
  ownership_state: 'Ownership',
  resolution_status: 'Resolution',
  asn: 'ASN',
  organization: 'Organization',
  ptr: 'PTR',
  source: 'Source',
  status: 'Status',
  discovery_date: 'Observed',
}

export const assetSortTooltips: Record<AssetSortKey, string> = {
  identifier: 'The domain, hostname, IP, or asset identifier discovered during the run.',
  asset_type: 'The normalized asset class currently assigned to the row.',
  domain_kind: 'Whether this domain is a registrable root or a discovered subdomain.',
  ownership_state: 'The verified or inferred ownership assessment for this asset.',
  resolution_status: 'Whether the domain resolves, failed to resolve, or has not been checked yet.',
  asn: 'Autonomous System Number associated with this IP address.',
  organization: 'Organization name returned by IP ownership enrichment.',
  ptr: 'Reverse DNS hostname returned for this IP address, when one exists.',
  source: 'Collectors and enrichers that contributed evidence to this row.',
  status: 'Merged pipeline status for the contributing discovery work.',
  discovery_date: 'When this asset was first observed during the current run.',
}

export function filterAssets(assets: LiveAssetRow[], search: string, tab: AssetTableTab): LiveAssetRow[] {
  const normalizedSearch = search.trim().toLowerCase()
  const tabScopedAssets = filterAssetsByTab(assets, tab)

  if (!normalizedSearch) {
    return tabScopedAssets
  }

  return tabScopedAssets.filter((asset) =>
    [
      asset.identifier,
      asset.asset_type,
      asset.domain_kind,
      asset.ownership_state,
      asset.resolution_status,
      asset.source,
      asset.status,
      asset.inclusion_reason,
      asset.registrable_domain,
      asset.asn ? String(asset.asn) : '',
      asset.organization,
      asset.ptr,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch),
  )
}

export function filterAssetsByTab(assets: LiveAssetRow[], tab: AssetTableTab): LiveAssetRow[] {
  if (tab === 'domains') {
    return assets.filter((asset) => asset.asset_type === 'domain')
  }
  if (tab === 'ips') {
    return assets.filter((asset) => asset.asset_type === 'ip')
  }
  return assets
}

export function toggleAssetSort(current: AssetSortState, key: AssetSortKey): AssetSortState {
  if (current.key === key) {
    return {
      key,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    }
  }

  return {
    key,
    direction: key === 'discovery_date' ? 'desc' : 'asc',
  }
}

export function sortKeysForTab(tab: AssetTableTab): AssetSortKey[] {
  return tabSortKeys[tab]
}

export function normalizeAssetSort(sort: AssetSortState, tab: AssetTableTab): AssetSortState {
  return tabSortKeys[tab].includes(sort.key) ? sort : defaultAssetSort
}

export function compareAssetRows(left: LiveAssetRow, right: LiveAssetRow, sort: AssetSortState): number {
  const direction = sort.direction === 'asc' ? 1 : -1

  if (sort.key === 'discovery_date') {
    const leftValue = parseSortableDate(left.discovery_date)
    const rightValue = parseSortableDate(right.discovery_date)
    if (leftValue !== rightValue) {
      return (leftValue - rightValue) * direction
    }
    return collator.compare(left.identifier, right.identifier)
  }

  if (sort.key === 'asn') {
    const numberDiff = compareOptionalNumbers(left.asn, right.asn)
    if (numberDiff !== 0) {
      return numberDiff * direction
    }
    return collator.compare(left.identifier, right.identifier)
  }

  const leftValue = normalizeAssetValue(left, sort.key)
  const rightValue = normalizeAssetValue(right, sort.key)
  const diff = collator.compare(leftValue, rightValue) * direction
  if (diff !== 0) {
    return diff
  }
  return collator.compare(left.identifier, right.identifier)
}

export function splitSources(value: string | undefined): string[] {
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

export function describeSource(value: string): string {
  return sourceDescriptions[value] ?? `Collected from ${value || 'an unknown source'}.`
}

export function describeOwnership(value: string | undefined): string {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) {
    return 'Ownership has not been classified for this asset yet.'
  }
  return ownershipDescriptions[normalized] ?? `${humanizeToken(normalized, 'Ownership')} classification generated from the current evidence.`
}

export function parseAssetDetails(details: string | undefined): AssetDetailPair[] {
  if (!details) {
    return []
  }
  return details.split(' | ').map((part) => {
    const index = part.indexOf(' ')
    if (index < 0) {
      return { label: 'Info', value: part }
    }
    return {
      label: part.slice(0, index),
      value: part.slice(index + 1),
    }
  })
}

export function assetSummaryText(asset: LiveAssetRow): string {
  return asset.inclusion_reason?.trim() || asset.registrable_domain?.trim() || asset.organization?.trim() || asset.ptr?.trim() || 'No extra note'
}

export function humanizeToken(value: string | undefined, fallback = 'n/a'): string {
  const normalized = String(value ?? '').trim()
  if (!normalized) {
    return fallback
  }
  return normalized.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

export function sortLabelForKey(sort: AssetSortState, key: AssetSortKey): string {
  const label = assetSortLabels[key]
  if (sort.key !== key) {
    return label
  }
  return `${label}${sort.direction === 'asc' ? ' ▲' : ' ▼'}`
}

function normalizeAssetValue(asset: LiveAssetRow, key: Exclude<AssetSortKey, 'discovery_date' | 'asn'>): string {
  if (key === 'source') {
    return splitSources(asset.source).join(', ')
  }
  return String(asset[key] ?? '')
}

function compareOptionalNumbers(left: number | undefined, right: number | undefined): number {
  const leftValid = typeof left === 'number' && Number.isFinite(left)
  const rightValid = typeof right === 'number' && Number.isFinite(right)

  if (leftValid && rightValid) {
    return left! - right!
  }
  if (leftValid) {
    return -1
  }
  if (rightValid) {
    return 1
  }
  return 0
}

function parseSortableDate(value: string | undefined): number {
  const parsed = Date.parse(value ?? '')
  return Number.isNaN(parsed) ? 0 : parsed
}
