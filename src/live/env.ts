export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

/**
 * liveModeEnabled reports whether the Firebase-backed live workspace has the
 * minimum client configuration needed to boot.
 */
export function liveModeEnabled(): boolean {
  return Boolean(readFirebaseConfig());
}

/**
 * readFirebaseConfig returns the configured Firebase web-app settings or null
 * when the environment is incomplete and the app should stay in archive mode.
 */
export function readFirebaseConfig(): FirebaseConfig | null {
  const apiKey = String(import.meta.env.VITE_FIREBASE_API_KEY ?? "").trim();
  const authDomain = String(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  ).trim();
  const projectId = String(
    import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  ).trim();
  const appId = String(import.meta.env.VITE_FIREBASE_APP_ID ?? "").trim();
  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket:
      String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "").trim() ||
      undefined,
    messagingSenderId:
      String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "").trim() ||
      undefined,
  };
}

/**
 * readAPIBaseURL returns the optional absolute origin used for live API calls
 * and download links when the browser should talk to a remote backend.
 */
export function readAPIBaseURL(): string {
  return String(import.meta.env.VITE_ASSET_DISCOVERY_API_BASE_URL ?? "").trim();
}

/**
 * resolveLiveURL resolves live API and download paths against the configured
 * backend origin while preserving already-absolute URLs.
 */
export function resolveLiveURL(pathname: string): string {
  const value = String(pathname ?? "").trim();
  if (!value) {
    return value;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const apiBaseURL = readAPIBaseURL();
  if (!apiBaseURL) {
    return value;
  }

  const absolutePath = value.startsWith("/")
    ? value
    : `/${value.replace(/^\.?\/+/, "")}`;
  return new URL(absolutePath, apiBaseURL).toString();
}
