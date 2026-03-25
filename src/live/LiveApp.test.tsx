import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LiveApp from './LiveApp'
import type { LiveAppDeps, Unsubscribe } from './deps'
import type {
  CreateRunPayload,
  LiveAssetRow,
  LiveAuthSession,
  LiveEventRecord,
  LivePivotRecord,
  LiveRunRecord,
  LiveTrace,
} from './types'

class FakeLiveDeps implements LiveAppDeps {
  authSession: LiveAuthSession | null
  runs: LiveRunRecord[]
  assets: Record<string, LiveAssetRow[]>
  traces: Record<string, LiveTrace[]>
  pivots: Record<string, LivePivotRecord[]>
  events: Record<string, LiveEventRecord[]>
  authListeners = new Set<(session: LiveAuthSession | null) => void>()
  runListeners = new Set<(runs: LiveRunRecord[]) => void>()
  assetListeners = new Map<string, Set<(assets: LiveAssetRow[]) => void>>()
  traceListeners = new Map<string, Set<(traces: LiveTrace[]) => void>>()
  pivotListeners = new Map<string, Set<(pivots: LivePivotRecord[]) => void>>()
  eventListeners = new Map<string, Set<(events: LiveEventRecord[]) => void>>()
  signInWithGoogle = vi.fn(async () => undefined)
  signOut = vi.fn(async () => undefined)
  getIDToken = vi.fn(async () => 'token')
  createRunCalls: CreateRunPayload[] = []
  decidePivotCalls: Array<{ runID: string; pivotID: string; decision: 'accepted' | 'rejected' }> = []

  constructor(config: {
    authSession?: LiveAuthSession | null
    runs?: LiveRunRecord[]
    assets?: Record<string, LiveAssetRow[]>
    traces?: Record<string, LiveTrace[]>
    pivots?: Record<string, LivePivotRecord[]>
    events?: Record<string, LiveEventRecord[]>
  }) {
    this.authSession = config.authSession ?? null
    this.runs = config.runs ?? []
    this.assets = config.assets ?? {}
    this.traces = config.traces ?? {}
    this.pivots = config.pivots ?? {}
    this.events = config.events ?? {}
  }

  subscribeAuth(onSession: (session: LiveAuthSession | null) => void): Unsubscribe {
    this.authListeners.add(onSession)
    onSession(this.authSession)
    return () => {
      this.authListeners.delete(onSession)
    }
  }

  subscribeRuns(_ownerUID: string, onRuns: (runs: LiveRunRecord[]) => void): Unsubscribe {
    this.runListeners.add(onRuns)
    onRuns(this.runs)
    return () => {
      this.runListeners.delete(onRuns)
    }
  }

  subscribeAssets(runID: string, onAssets: (assets: LiveAssetRow[]) => void): Unsubscribe {
    return this.addRunListener(this.assetListeners, runID, onAssets, this.assets[runID] ?? [])
  }

  subscribeTraces(runID: string, onTraces: (traces: LiveTrace[]) => void): Unsubscribe {
    return this.addRunListener(this.traceListeners, runID, onTraces, this.traces[runID] ?? [])
  }

  subscribePivots(runID: string, onPivots: (pivots: LivePivotRecord[]) => void): Unsubscribe {
    return this.addRunListener(this.pivotListeners, runID, onPivots, this.pivots[runID] ?? [])
  }

  subscribeEvents(runID: string, onEvents: (events: LiveEventRecord[]) => void): Unsubscribe {
    return this.addRunListener(this.eventListeners, runID, onEvents, this.events[runID] ?? [])
  }

  async createRun(payload: CreateRunPayload): Promise<LiveRunRecord> {
    this.createRunCalls.push(payload)
    const run: LiveRunRecord = {
      id: 'run-created',
      owner_uid: this.authSession?.uid ?? 'uid-1',
      owner_email: this.authSession?.email ?? 'roaguirred@gmail.com',
      mode: payload.mode,
      status: 'queued',
      current_wave: 0,
      seed_count: 1,
      enumeration_count: 0,
      asset_count: 0,
      pending_pivot_count: 0,
      created_at: '2026-03-25T12:00:00Z',
      updated_at: '2026-03-25T12:00:00Z',
    }
    this.runs = [run, ...this.runs]
    this.runListeners.forEach((listener) => listener(this.runs))
    return run
  }

  async decidePivot(runID: string, pivotID: string, decision: 'accepted' | 'rejected'): Promise<LivePivotRecord> {
    this.decidePivotCalls.push({ runID, pivotID, decision })
    const nextStatus = decision === 'accepted' ? 'accepted' : 'rejected'
    this.pivots[runID] = (this.pivots[runID] ?? []).map((pivot) => (pivot.id === pivotID ? { ...pivot, status: nextStatus } : pivot))
    this.pivotListeners.get(runID)?.forEach((listener) => listener(this.pivots[runID] ?? []))
    return this.pivots[runID].find((pivot) => pivot.id === pivotID) as LivePivotRecord
  }

  private addRunListener<T>(
    registry: Map<string, Set<(value: T[]) => void>>,
    runID: string,
    listener: (value: T[]) => void,
    initial: T[],
  ): Unsubscribe {
    const listeners = registry.get(runID) ?? new Set<(value: T[]) => void>()
    listeners.add(listener)
    registry.set(runID, listeners)
    listener(initial)
    return () => {
      listeners.delete(listener)
    }
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('LiveApp', () => {
  it('renders the sign-in gate and invokes Google sign-in', async () => {
    const deps = new FakeLiveDeps({})
    const user = userEvent.setup()

    render(<LiveApp deps={deps} />)

    await user.click(screen.getByRole('button', { name: 'Sign In With Google' }))

    expect(deps.signInWithGoogle).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Discovery Console')).toBeInTheDocument()
  })

  it('blocks users outside the allowlist', () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: 'uid-2',
        email: 'outsider@example.com',
        emailVerified: true,
      },
    })

    render(<LiveApp deps={deps} />)

    expect(screen.getByText('Access Restricted')).toBeInTheDocument()
    expect(screen.getByText('outsider@example.com')).toBeInTheDocument()
  })

  it('opens the new-run modal, validates, and submits a run', async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: 'uid-1',
        email: 'roaguirred@gmail.com',
        emailVerified: true,
        displayName: 'Reviewer',
      },
    })
    const user = userEvent.setup()

    render(<LiveApp deps={deps} />)

    await user.click(screen.getByRole('button', { name: 'New Run' }))
    await user.click(screen.getByRole('button', { name: 'Launch Run' }))

    expect(screen.getByText('Enter a company name or at least one domain.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Company'), 'Example Holdings')
    await user.type(screen.getByLabelText('Domains'), 'example.com, api.example.com')
    await user.click(screen.getByRole('button', { name: 'Launch Run' }))

    await waitFor(() => expect(deps.createRunCalls).toHaveLength(1))
    expect(deps.createRunCalls[0]).toEqual({
      mode: 'manual',
      seeds: [
        {
          company_name: 'Example Holdings',
          domains: ['example.com', 'api.example.com'],
          address: undefined,
          industry: undefined,
          tags: [],
        },
      ],
    })
    expect(await screen.findByText(/Queued manual run run-created\./)).toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toContain('run=run-created'))
    expect(window.location.hash).toContain('view=assets')
  })

  it('restores run and view selection from the hash and keeps them in sync', async () => {
    window.history.replaceState(null, '', '/#run=run-2&view=activity')

    const deps = new FakeLiveDeps({
      authSession: {
        uid: 'uid-1',
        email: 'roaguirred@gmail.com',
        emailVerified: true,
        displayName: 'Reviewer',
      },
      runs: [
        buildRun('run-1', { updated_at: '2026-03-25T10:10:00Z' }),
        buildRun('run-2', { updated_at: '2026-03-25T10:20:00Z', status: 'completed' }),
      ],
      events: {
        'run-2': [
          {
            id: 'event-1',
            kind: 'checkpoint',
            message: 'Reached after_collection_wave at wave 2.',
            created_at: '2026-03-25T10:21:00Z',
          },
        ],
      },
    })
    const user = userEvent.setup()

    render(<LiveApp deps={deps} />)

    expect(await screen.findByText('Activity Feed')).toBeInTheDocument()
    expect(screen.getByText('Reached after_collection_wave at wave 2.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Pivots 0/i }))
    await waitFor(() => expect(window.location.hash).toContain('view=pivots'))

    await user.click(screen.getByRole('button', { name: 'Select run' }))
    await user.click(screen.getByRole('menuitemradio', { name: /run-1/i }))
    await waitFor(() => expect(window.location.hash).toContain('run=run-1'))
    expect(window.location.hash).toContain('view=assets')
  })

  it('restores the asset tab from the hash and switches between all, domains, and ips', async () => {
    window.history.replaceState(null, '', '/#run=run-1&view=assets&tab=ips')

    const deps = new FakeLiveDeps({
      authSession: {
        uid: 'uid-1',
        email: 'roaguirred@gmail.com',
        emailVerified: true,
      },
      runs: [buildRun('run-1')],
      assets: {
        'run-1': [
          buildAsset('asset-domain-1', {
            identifier: 'alpha.example.com',
            asset_type: 'domain',
            domain_kind: 'registrable',
            resolution_status: 'resolved',
            source: 'dns_collector',
            discovery_date: '2026-03-25T10:10:00Z',
          }),
          buildAsset('asset-domain-2', {
            identifier: 'zeta.example.com',
            asset_type: 'domain',
            domain_kind: 'subdomain',
            resolution_status: 'pending',
            source: 'web_hint_collector',
            discovery_date: '2026-03-25T10:05:00Z',
          }),
          buildAsset('asset-ip-1', {
            asset_id: 'asset-ip-1',
            identifier: '203.0.113.10',
            asset_type: 'ip',
            source: 'ip_enricher',
            asn: 64500,
            organization: 'Example Networks',
            ptr: 'edge.example.net',
            discovery_date: '2026-03-25T10:08:00Z',
          }),
        ],
      },
    })
    const user = userEvent.setup()

    render(<LiveApp deps={deps} />)

    expect(await screen.findByRole('tab', { name: /IPs/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('table')).toHaveTextContent('203.0.113.10')
    expect(screen.queryByText('alpha.example.com')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Domains/i }))
    expect(await screen.findByRole('columnheader', { name: /Kind/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Resolution/i })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /ASN/i })).not.toBeInTheDocument()
    expect(screen.getByText('alpha.example.com')).toBeInTheDocument()
    expect(screen.queryByText('203.0.113.10')).not.toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toContain('tab=domains'))

    await user.click(screen.getByRole('tab', { name: /^All/i }))
    expect(screen.getByRole('columnheader', { name: /Type/i })).toBeInTheDocument()
    expect(screen.getByText('203.0.113.10')).toBeInTheDocument()
  })

  it('renders tab-specific columns, sorting, tooltips, and trace actions', async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: 'uid-1',
        email: 'roaguirred@gmail.com',
        emailVerified: true,
        displayName: 'Reviewer',
      },
      runs: [buildRun('run-1')],
      assets: {
        'run-1': [
          buildAsset('asset-domain-1', {
            identifier: 'zeta.example.com',
            asset_type: 'domain',
            domain_kind: 'subdomain',
            resolution_status: 'resolved',
            source: 'dns_collector, rdap_collector',
            discovery_date: '2026-03-25T10:05:00Z',
          }),
          buildAsset('asset-domain-2', {
            identifier: 'alpha.example.com',
            asset_type: 'domain',
            domain_kind: 'registrable',
            resolution_status: 'pending',
            source: 'web_hint_collector',
            discovery_date: '2026-03-25T10:10:00Z',
          }),
          buildAsset('asset-ip-1', {
            identifier: '203.0.113.10',
            asset_type: 'ip',
            source: 'ip_enricher',
            asn: 64500,
            organization: 'Example Networks',
            ptr: 'edge.example.net',
            discovery_date: '2026-03-25T10:07:00Z',
          }),
          buildAsset('asset-ip-2', {
            identifier: '203.0.113.2',
            asset_type: 'ip',
            source: 'asn_cidr_collector',
            asn: 64496,
            organization: 'Another Networks',
            ptr: 'mail.example.net',
            discovery_date: '2026-03-25T10:06:00Z',
          }),
        ],
      },
      traces: {
        'run-1': [
          buildTrace('asset-domain-1', 'zeta.example.com'),
          buildTrace('asset-domain-2', 'alpha.example.com'),
          buildTrace('asset-ip-1', '203.0.113.10'),
        ],
      },
    })
    const user = userEvent.setup()

    render(<LiveApp deps={deps} />)

    const dnsPill = await screen.findByText('dns_collector')
    expect(dnsPill).toHaveAttribute('data-tooltip')
    expect(dnsPill).toHaveClass('tooltip-pill')
    await user.hover(dnsPill)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Direct DNS lookups for the target domain')

    const ownershipPill = screen.getAllByText('Owned')[0]
    expect(ownershipPill).toHaveAttribute('data-tooltip')
    expect(ownershipPill).toHaveClass('tooltip-pill')

    await user.click(screen.getByRole('tab', { name: /Domains/i }))
    await user.click(screen.getByRole('button', { name: /Kind/i }))
    const domainRows = within(screen.getByRole('table')).getAllByRole('row')
    expect(domainRows[1]).toHaveTextContent('alpha.example.com')
    expect(domainRows[2]).toHaveTextContent('zeta.example.com')

    const identifierTrigger = within(domainRows[2]).getByRole('button', { name: /zeta\.example\.com/i })
    expect(identifierTrigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(identifierTrigger)
    expect(identifierTrigger).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText('Inline Summary')).toBeInTheDocument()

    await user.click(within(domainRows[2]).getByRole('button', { name: 'Open trace' }))
    expect(await screen.findByText('Trace Focus')).toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toContain('view=trace'))
    expect(window.location.hash).toContain('asset=asset-domain-1')

    await user.click(screen.getByRole('button', { name: /Assets 4/i }))
    await user.click(screen.getByRole('tab', { name: /IPs/i }))
    expect(await screen.findByRole('columnheader', { name: /ASN/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /ASN/i }))
    const ipRows = within(screen.getByRole('table')).getAllByRole('row')
    expect(ipRows[1]).toHaveTextContent('203.0.113.2')
    expect(ipRows[2]).toHaveTextContent('203.0.113.10')
  })

  it('keeps the desktop drawer toggle in the drawer and logs out from the account menu', async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: 'uid-1',
        email: 'roaguirred@gmail.com',
        emailVerified: true,
        displayName: 'Reviewer',
      },
      runs: [buildRun('run-1')],
    })
    const user = userEvent.setup()

    render(<LiveApp deps={deps} />)

    const topbar = document.querySelector('.workspace-topbar')
    expect(topbar).not.toBeNull()
    expect(screen.queryByText('My Runs')).not.toBeInTheDocument()
    expect(screen.queryByText('Asset workspace')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /navigation/i })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Select run' })).toBeInTheDocument()
    expect(within(topbar as HTMLElement).queryByRole('button', { name: /navigation/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Collapse navigation' }))
    expect(screen.queryByText('Discovery Console')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /navigation/i })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Expand navigation' }))
    expect(screen.getByText('Discovery Console')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /navigation/i })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Open account menu' }))
    expect(screen.getByText('Reviewer')).toBeInTheDocument()
    expect(screen.getByText('roaguirred@gmail.com')).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: 'Log out' }))
    await waitFor(() => expect(deps.signOut).toHaveBeenCalledTimes(1))
  })

  it('uses the same fixed top bar on compact viewports and opens the drawer as an overlay', async () => {
    mockMatchMedia(true)

    const deps = new FakeLiveDeps({
      authSession: {
        uid: 'uid-1',
        email: 'roaguirred@gmail.com',
        emailVerified: true,
      },
      runs: [buildRun('run-1')],
    })
    const user = userEvent.setup()

    render(<LiveApp deps={deps} />)

    const drawer = screen.getByLabelText('Workspace navigation')
    expect(drawer.className).not.toContain('is-open')
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select run' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open account menu' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(drawer.className).toContain('is-open')
    expect(screen.getByRole('button', { name: 'Close navigation' })).toBeInTheDocument()
  })

  it('renders pivots only in the pivots view and sends pivot decisions', async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: 'uid-1',
        email: 'roaguirred@gmail.com',
        emailVerified: true,
      },
      runs: [
        buildRun('run-1', {
          mode: 'manual',
          status: 'awaiting_review',
          current_wave: 2,
          asset_count: 2,
          pending_pivot_count: 1,
        }),
      ],
      assets: {
        'run-1': [buildAsset('asset-1', { identifier: 'api.example.com' })],
      },
      pivots: {
        'run-1': [
          {
            id: 'pivot-1',
            root: 'example-app.com',
            status: 'pending_review',
            collector: 'web_hint_collector',
            recommendation_reason: 'Brand overlap and matching page references.',
            recommendation_score: 0.94,
            candidate: { domains: ['example-app.com'] },
            created_at: '2026-03-25T10:06:00Z',
            updated_at: '2026-03-25T10:06:00Z',
          },
        ],
      },
    })
    const user = userEvent.setup()

    render(<LiveApp deps={deps} />)

    expect(screen.queryByText('Pivot Review')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Pivots 1/i }))

    expect(await screen.findByText('Pivot Review')).toBeInTheDocument()
    expect(screen.getByText('example-app.com')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() =>
      expect(deps.decidePivotCalls).toEqual([{ runID: 'run-1', pivotID: 'pivot-1', decision: 'accepted' }]),
    )
  })

  it('resolves the trace view from hash state and falls back when the requested asset is missing', async () => {
    window.history.replaceState(null, '', '/#run=run-1&view=trace&asset=missing')

    const deps = new FakeLiveDeps({
      authSession: {
        uid: 'uid-1',
        email: 'roaguirred@gmail.com',
        emailVerified: true,
      },
      runs: [buildRun('run-1')],
      traces: {
        'run-1': [buildTrace('asset-1', 'alpha.example.com')],
      },
      assets: {
        'run-1': [buildAsset('asset-1', { identifier: 'alpha.example.com' })],
      },
    })

    render(<LiveApp deps={deps} />)

    expect(await screen.findByText('Trace Focus')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'alpha.example.com' })).toBeInTheDocument()
    await waitFor(() => expect(window.location.hash).toContain('asset=asset-1'))
  })

  it('does not expose project IDs or organization-specific branding in the rendered client', async () => {
    const deps = new FakeLiveDeps({
      authSession: {
        uid: 'uid-1',
        email: 'roaguirred@gmail.com',
        emailVerified: true,
        displayName: 'Reviewer',
      },
      runs: [buildRun('run-1')],
    })
    const user = userEvent.setup()

    render(<LiveApp deps={deps} />)

    expect(screen.queryByText(/firebase/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/zerofox/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New Run' }))

    expect(screen.getByPlaceholderText('Example Holdings')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/zerofox/i)).not.toBeInTheDocument()
  })
})

function buildRun(id: string, overrides: Partial<LiveRunRecord> = {}): LiveRunRecord {
  return {
    id,
    owner_uid: 'uid-1',
    owner_email: 'roaguirred@gmail.com',
    mode: 'autonomous',
    status: 'running',
    current_wave: 1,
    seed_count: 1,
    enumeration_count: 2,
    asset_count: 1,
    pending_pivot_count: 0,
    created_at: '2026-03-25T10:00:00Z',
    updated_at: '2026-03-25T10:10:00Z',
    ...overrides,
  }
}

function buildAsset(assetID: string, overrides: Partial<LiveAssetRow> = {}): LiveAssetRow {
  return {
    asset_id: assetID,
    identifier: `${assetID}.example.com`,
    asset_type: 'domain',
    ownership_state: 'owned',
    source: 'dns_collector',
    inclusion_reason: 'Promoted by judged web hint.',
    enumeration_id: 'enum-1',
    seed_id: 'seed-1',
    status: 'running',
    discovery_date: '2026-03-25T10:05:00Z',
    ...overrides,
  }
}

function buildTrace(assetID: string, identifier: string): LiveTrace {
  return {
    asset_id: assetID,
    identifier,
    asset_type: 'domain',
    source: 'dns_collector',
    enumeration_id: 'enum-1',
    seed_id: 'seed-1',
    nodes: [{ id: `node-${assetID}`, label: identifier, subtitle: 'Canonical asset' }],
    sections: [{ title: 'Seed Context', items: ['Shared registrable domain evidence.'] }],
  }
}

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches,
      media: '(max-width: 1100px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}
