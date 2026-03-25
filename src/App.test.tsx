import { readFileSync } from 'node:fs'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Manifest, Run } from './types'

function readFixtureJSON<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as T
}

const contractManifest = readFixtureJSON<Manifest>('../contracts/visualizer/manifest.v1.fixture.json')
const contractRun = readFixtureJSON<Run>('../contracts/visualizer/run.v1.fixture.json')

const manifest: Manifest = {
  runs: [
    {
      id: 'run-1',
      label: '2026-03-24 11:15:00 -0300',
      created_at: '2026-03-24T14:15:00Z',
      asset_count: 2,
      enumeration_count: 1,
      seed_count: 1,
      data_path: 'runs/run-1.json',
      downloads: {
        json: '../runs/run-1/results.json',
        csv: '../runs/run-1/results.csv',
      },
    },
    {
      id: 'run-2',
      label: '2026-03-25 09:45:00 -0300',
      created_at: '2026-03-25T12:45:00Z',
      asset_count: 1,
      enumeration_count: 1,
      seed_count: 1,
      data_path: 'runs/run-2.json',
      downloads: {
        json: '../runs/run-2/results.json',
      },
    },
  ],
}

const run1: Run = {
  ...manifest.runs[0],
  rows: [
    {
      asset_id: 'asset-1',
      identifier: 'example.com',
      asset_type: 'domain',
      domain_kind: 'registrable',
      registrable_domain: 'example.com',
      resolution_status: 'resolved',
      ownership_state: 'owned',
      inclusion_reason: 'Supported by discovery observations.',
      source: 'rdap_collector',
      discovered_by: 'rdap_collector',
      enriched_by: 'domain_enricher',
      enumeration_id: 'enum-1',
      seed_id: 'seed-1',
      status: 'completed',
      discovery_date: '2026-03-24T14:15:00Z',
      details: 'Resolution resolved | Registrar Example Registrar',
      trace_path: '#trace/run-1/asset-1',
      evidence_groups: [
        {
          title: 'DNS',
          items: ['A:203.0.113.10'],
        },
      ],
    },
    {
      asset_id: 'asset-1-ip',
      identifier: '203.0.113.10',
      asset_type: 'ip',
      ownership_state: 'associated_infrastructure',
      source: 'ip_enricher',
      discovered_by: 'dns_collector',
      enriched_by: 'ip_enricher',
      enumeration_id: 'enum-1',
      seed_id: 'seed-1',
      status: 'completed',
      discovery_date: '2026-03-24T14:15:05Z',
      details: 'ASN 64500 | Org Example Hosting',
      organization: 'Example Hosting',
      asn: 64500,
      ptr: 'edge.example.net',
      trace_path: '#trace/run-1/asset-1-ip',
    },
  ],
  traces: [
    {
      asset_id: 'asset-1',
      identifier: 'example.com',
      asset_type: 'domain',
      source: 'rdap_collector',
      discovered_by: 'rdap_collector',
      enriched_by: 'domain_enricher',
      enumeration_id: 'enum-1',
      seed_id: 'seed-1',
      domain_kind: 'registrable',
      registrable_domain: 'example.com',
      resolution_status: 'resolved',
      root_node_id: 'node-1',
      nodes: [
        {
          id: 'node-1',
          kind: 'asset',
          label: 'example.com',
          subtitle: 'Canonical asset',
          details: [
            {
              title: 'Ownership',
              items: ['Inclusion reason: Supported by discovery observations.'],
            },
          ],
        },
      ],
      related: [
        {
          asset_id: 'asset-1-ip',
          identifier: '203.0.113.10',
          label: 'Same Registrable Domain',
          trace_path: '#trace/run-1/asset-1-ip',
        },
      ],
    },
  ],
  judge_summary: {
    evaluation_count: 1,
    accepted_count: 1,
    discarded_count: 1,
    groups: [
      {
        collector: 'web_hint_collector',
        seed_id: 'seed-1',
        seed_label: 'Example Corp',
        seed_domains: ['example.com'],
        scenario: 'ownership_hints',
        accepted: [
          {
            root: 'example-store.com',
            explicit: true,
            confidence: 0.91,
            reason: 'Brand match',
          },
        ],
        discarded: [
          {
            root: 'facebook.com',
            explicit: true,
            confidence: 0.99,
            reason: 'Third-party platform',
          },
        ],
      },
    ],
  },
}

const run2: Run = {
  ...manifest.runs[1],
  rows: [
    {
      asset_id: 'asset-2',
      identifier: 'portal.example-store.com',
      asset_type: 'domain',
      domain_kind: 'subdomain',
      registrable_domain: 'example-store.com',
      resolution_status: 'resolved',
      ownership_state: 'owned',
      inclusion_reason: 'Promoted by post-run reconsideration.',
      source: 'crawler_collector',
      discovered_by: 'crawler_collector',
      enriched_by: 'domain_enricher',
      enumeration_id: 'enum-2',
      seed_id: 'seed-2',
      status: 'completed',
      discovery_date: '2026-03-25T12:45:00Z',
      details: 'Resolution resolved | Registrar Store Registrar',
      trace_path: '#trace/run-2/asset-2',
      evidence_groups: [
        {
          title: 'DNS',
          items: ['A:198.51.100.42'],
        },
      ],
    },
  ],
  traces: [
    {
      asset_id: 'asset-2',
      identifier: 'portal.example-store.com',
      asset_type: 'domain',
      source: 'crawler_collector',
      discovered_by: 'crawler_collector',
      enriched_by: 'domain_enricher',
      enumeration_id: 'enum-2',
      seed_id: 'seed-2',
      domain_kind: 'subdomain',
      registrable_domain: 'example-store.com',
      resolution_status: 'resolved',
      root_node_id: 'node-asset-2',
      nodes: [
        {
          id: 'node-asset-2',
          kind: 'asset',
          label: 'portal.example-store.com',
          subtitle: 'Canonical asset',
          details: [
            {
              title: 'Ownership',
              items: ['Inclusion reason: Promoted by post-run reconsideration.'],
            },
          ],
        },
      ],
      related: [],
    },
  ],
}

function mockFetch(routes: Record<string, unknown>): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const key = String(input)
    const payload = routes[key]
    if (payload === undefined) {
      return new Response('not found', { status: 404, statusText: 'Not Found' })
    }
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

beforeEach(() => {
  window.history.replaceState({}, '', 'https://visualizer.test/')
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('loads the manifest and resolves download links relative to the manifest URL', async () => {
    const fetchMock = mockFetch({
      'https://visualizer.test/exports/custom/manifest.json': manifest,
      'https://visualizer.test/exports/custom/runs/run-1.json': run1,
    })
    vi.stubGlobal('fetch', fetchMock)

    window.history.replaceState({}, '', 'https://visualizer.test/?manifest=/exports/custom/manifest.json')
    render(<App />)

    await screen.findAllByText('example.com')

    expect(fetchMock).toHaveBeenCalledWith('https://visualizer.test/exports/custom/manifest.json')
    expect(fetchMock).toHaveBeenCalledWith('https://visualizer.test/exports/custom/runs/run-1.json')

    const jsonLink = screen.getByRole('link', { name: 'JSON' })
    expect(jsonLink).toHaveAttribute('href', 'https://visualizer.test/exports/runs/run-1/results.json')
  })

  it('lazy loads another run when the run selector changes', async () => {
    const fetchMock = mockFetch({
      'https://visualizer.test/exports/visualizer/manifest.json': manifest,
      'https://visualizer.test/exports/visualizer/runs/run-1.json': run1,
      'https://visualizer.test/exports/visualizer/runs/run-2.json': run2,
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findAllByText('example.com')

    await userEvent.selectOptions(screen.getByLabelText('Run'), 'run-2')

    await screen.findByText('2026-03-25 09:45:00 -0300')
    await screen.findByText('example-store.com')
    expect(fetchMock).toHaveBeenCalledWith('https://visualizer.test/exports/visualizer/runs/run-2.json')
  })

  it('opens trace routes from the hash and renders node details for the selected run', async () => {
    const fetchMock = mockFetch({
      'https://visualizer.test/exports/visualizer/manifest.json': manifest,
      'https://visualizer.test/exports/visualizer/runs/run-2.json': run2,
    })
    vi.stubGlobal('fetch', fetchMock)

    window.history.replaceState({}, '', 'https://visualizer.test/#trace/run-2/asset-2')
    render(<App />)

    await screen.findAllByText('portal.example-store.com')
    await screen.findByText('Node Details')
    expect(screen.getAllByText('Canonical asset').length).toBeGreaterThan(0)
  })

  it('renders the judge view and candidate groups from exported judge summaries', async () => {
    const fetchMock = mockFetch({
      'https://visualizer.test/exports/visualizer/manifest.json': manifest,
      'https://visualizer.test/exports/visualizer/runs/run-1.json': run1,
    })
    vi.stubGlobal('fetch', fetchMock)

    window.history.replaceState({}, '', 'https://visualizer.test/#judge')
    render(<App />)

    await screen.findByText('Accepted And Discarded Candidates')
    expect(screen.getByText('example-store.com')).toBeInTheDocument()
    expect(screen.getByText('facebook.com')).toBeInTheDocument()
  })

  it('falls back to a clear error message when the manifest fails to load', async () => {
    const fetchMock = vi.fn(async () => new Response('boom', { status: 500, statusText: 'Internal Server Error' }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('failed to load manifest: 500 Internal Server Error')).toBeInTheDocument()
    })
  })

  it('shows a clear error when the manifest URL returns HTML instead of JSON', async () => {
    const fetchMock = vi.fn(async () => new Response('<!doctype html><html></html>', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByText(
          'failed to load manifest https://visualizer.test/exports/visualizer/manifest.json: expected JSON but received HTML',
        ),
      ).toBeInTheDocument()
    })
  })

  it('counts visible domain rows without double-counting the summary row after expansion', async () => {
    const fetchMock = mockFetch({
      'https://visualizer.test/exports/visualizer/manifest.json': contractManifest,
      'https://visualizer.test/exports/visualizer/runs/run-contract.json': contractRun,
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
    await screen.findAllByText('example.com')

    expect(document.getElementById('visible-count')).toHaveTextContent('1')

    const groupToggle = document.querySelector<HTMLButtonElement>('.domain-group-toggle')
    expect(groupToggle).not.toBeNull()
    await userEvent.click(groupToggle as HTMLButtonElement)

    await screen.findByText('api.example.com')
    expect(document.getElementById('visible-count')).toHaveTextContent('2')
  })
})
