import type { LiveAssetTab, LiveRouteState, LiveView } from './types'

const defaultRouteState: LiveRouteState = {
  runID: '',
  view: 'assets',
  assetTab: 'all',
  assetID: '',
  pivotID: '',
}

export function parseLiveHash(hash: string): LiveRouteState {
  const rawHash = String(hash).replace(/^#/, '').trim()
  if (!rawHash) {
    return { ...defaultRouteState }
  }

  const params = new URLSearchParams(rawHash)
  const requestedView = params.get('view')
  const requestedTab = params.get('tab')

  return {
    runID: params.get('run')?.trim() ?? '',
    view: isLiveView(requestedView) ? requestedView : 'assets',
    assetTab: isLiveAssetTab(requestedTab) ? requestedTab : 'all',
    assetID: params.get('asset')?.trim() ?? '',
    pivotID: params.get('pivot')?.trim() ?? '',
  }
}

export function buildLiveHash(route: LiveRouteState): string {
  const params = new URLSearchParams()
  if (route.runID) {
    params.set('run', route.runID)
  }
  if (route.view !== 'assets' || route.runID) {
    params.set('view', route.view)
  }
  if (route.assetTab !== 'all') {
    params.set('tab', route.assetTab)
  }
  if (route.assetID) {
    params.set('asset', route.assetID)
  }
  if (route.pivotID) {
    params.set('pivot', route.pivotID)
  }
  const serialized = params.toString()
  return serialized ? `#${serialized}` : ''
}

export function emptyLiveRoute(): LiveRouteState {
  return { ...defaultRouteState }
}

function isLiveView(value: string | null): value is LiveView {
  return value === 'assets' || value === 'trace' || value === 'pivots' || value === 'activity'
}

function isLiveAssetTab(value: string | null): value is LiveAssetTab {
  return value === 'all' || value === 'domains' || value === 'ips'
}
