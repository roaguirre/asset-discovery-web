import type { Manifest, Run, RunSummary } from './types'

export const DEFAULT_MANIFEST_PATH = '/exports/visualizer/manifest.json'

export function resolveManifestURL(url: URL = new URL(window.location.href)): string {
  const manifest = url.searchParams.get('manifest')
  if (!manifest) {
    return new URL(DEFAULT_MANIFEST_PATH, url).toString()
  }

  return new URL(manifest, url).toString()
}

export function resolveRelativeURL(baseURL: string, path: string): string {
  return new URL(path, baseURL).toString()
}

export async function fetchManifest(
  fetchImpl: typeof fetch,
  manifestURL: string,
): Promise<Manifest> {
  const response = await fetchImpl(manifestURL)
  if (!response.ok) {
    throw new Error(`failed to load manifest: ${response.status} ${response.statusText}`)
  }

  return (await parseJSONResponse(response, `manifest ${manifestURL}`)) as Manifest
}

export async function fetchRun(
  fetchImpl: typeof fetch,
  manifestURL: string,
  summary: RunSummary,
): Promise<Run> {
  const runURL = resolveRelativeURL(manifestURL, summary.data_path)
  const response = await fetchImpl(runURL)
  if (!response.ok) {
    throw new Error(`failed to load run ${summary.id}: ${response.status} ${response.statusText}`)
  }

  return (await parseJSONResponse(response, `run ${summary.id} (${runURL})`)) as Run
}

async function parseJSONResponse(response: Response, label: string): Promise<unknown> {
  const text = await response.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(`failed to load ${label}: expected JSON but received HTML`)
    }
    throw new Error(`failed to load ${label}: response was not valid JSON`)
  }
}
