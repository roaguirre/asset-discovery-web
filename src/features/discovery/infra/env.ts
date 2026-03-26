export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

const requiredFirebaseEnvKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

/**
 * readFirebaseConfig returns the configured Firebase web-app settings and
 * throws when required live configuration is missing.
 */
export function readFirebaseConfig(): FirebaseConfig {
  const missing = requiredFirebaseEnvKeys.filter((key) => {
    return String(import.meta.env[key] ?? "").trim() === "";
  });
  if (missing.length > 0) {
    throw new Error(`Missing required Firebase config: ${missing.join(", ")}`);
  }

  const apiKey = String(import.meta.env.VITE_FIREBASE_API_KEY ?? "").trim();
  const authDomain = String(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  ).trim();
  const projectId = String(
    import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  ).trim();
  const appId = String(import.meta.env.VITE_FIREBASE_APP_ID ?? "").trim();
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
 * readExportsBucket returns the configured Firebase Storage bucket used for
 * downloadable run artifacts and throws when it is missing.
 */
export function readExportsBucket(): string {
  const bucket = String(
    import.meta.env.VITE_FIREBASE_EXPORTS_BUCKET ?? "",
  ).trim();
  if (!bucket) {
    throw new Error(
      "Missing required Firebase exports bucket: VITE_FIREBASE_EXPORTS_BUCKET",
    );
  }
  return bucket;
}

/**
 * resolveLiveURL resolves live API paths against the configured backend origin
 * while preserving already-absolute URLs.
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
