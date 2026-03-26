export type AppSurface = "story" | "workspace";

const surfaceParam = "surface";

/**
 * parseExplicitSurface returns a caller-requested top-level app surface when the
 * URL search params include one. Absent or unsupported values leave surface
 * selection to the caller's fallback policy.
 */
export function parseExplicitSurface(
  search: string,
): AppSurface | undefined {
  const params = new URLSearchParams(String(search).replace(/^\?/, ""));
  const requested = params.get(surfaceParam)?.trim();
  if (requested === "story" || requested === "workspace") {
    return requested;
  }
  return undefined;
}

/**
 * hasLiveHashState identifies hashes that belong to the live workspace routing
 * model so public presentation anchors do not accidentally boot the console.
 */
export function hasLiveHashState(hash: string): boolean {
  const rawHash = String(hash).replace(/^#/, "").trim();
  if (!rawHash) {
    return false;
  }

  const params = new URLSearchParams(rawHash);
  return ["run", "view", "tab", "asset", "pivot"].some((key) =>
    Boolean(params.get(key)?.trim()),
  );
}

/**
 * buildWorkspaceSurfaceURL promotes the public story into the live workspace
 * without carrying over presentation anchors that would be meaningless to the
 * console router.
 */
export function buildWorkspaceSurfaceURL(): string {
  const url = new URL(window.location.href);
  url.searchParams.set(surfaceParam, "workspace");
  url.hash = "";
  return `${url.pathname}${url.search}${url.hash}`;
}
