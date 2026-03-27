import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
} from "firebase/storage";
import type {
  LiveAppDeps,
  LiveAuthDeps,
  LiveRunActionDeps,
  LiveRunDataDeps,
  LiveRunListDeps,
} from "../ports";
import { readExportsBucket, readFirebaseConfig, resolveLiveURL } from "./env";
import type {
  CreateRunPayload,
  LiveAssetRow,
  LiveAuthSession,
  LiveEventRecord,
  LiveJudgeSummary,
  LivePivotRecord,
  LiveRunRecord,
  LiveTrace,
} from "../core/types";

const artifactDownloadUnavailableMessage = "Downloads unavailable right now.";
const objectNotFoundStorageErrorCode = "storage/object-not-found";
const noDownloadURLStorageErrorCode = "storage/no-download-url";

/**
 * ArtifactDownloadUnavailableError marks download failures that should be
 * surfaced to the user as a generic unavailable state instead of raw Firebase
 * infrastructure details.
 */
class ArtifactDownloadUnavailableError extends Error {
  constructor() {
    super(artifactDownloadUnavailableMessage);
    this.name = "ArtifactDownloadUnavailableError";
  }
}

/**
 * buildFirebaseLiveDeps preserves the app's existing dependency seam while
 * composing smaller Firebase-backed ports internally.
 */
export function buildFirebaseLiveDeps(): LiveAppDeps {
  const config = readFirebaseConfig();
  const exportsBucket = readExportsBucket();

  const app = getApps()[0] ?? initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app, `gs://${exportsBucket}`);
  const provider = new GoogleAuthProvider();
  const downloadURLCache = new Map<string, Promise<string>>();
  const authDeps = buildFirebaseAuthDeps(auth, provider);

  return {
    ...authDeps,
    ...buildFirebaseRunListDeps(db),
    ...buildFirebaseRunDataDeps(db, storage, downloadURLCache),
    ...buildFirebaseRunActionDeps(authDeps.getIDToken),
  };
}

function buildFirebaseAuthDeps(
  auth: ReturnType<typeof getAuth>,
  provider: GoogleAuthProvider,
): LiveAuthDeps {
  return {
    subscribeAuth(onSession) {
      return onAuthStateChanged(auth, (user) => onSession(mapUser(user)));
    },
    signInWithGoogle() {
      return signInWithPopup(auth, provider).then(() => undefined);
    },
    signOut() {
      return signOut(auth);
    },
    async getIDToken() {
      if (!auth.currentUser) {
        throw new Error("No signed-in Firebase session.");
      }
      return auth.currentUser.getIdToken();
    },
  };
}

function buildFirebaseRunListDeps(
  db: ReturnType<typeof getFirestore>,
): LiveRunListDeps {
  return {
    subscribeRuns(ownerUID, onRuns) {
      const runQuery = query(
        collection(db, "runs"),
        where("owner_uid", "==", ownerUID),
        orderBy("updated_at", "desc"),
      );
      return onSnapshot(runQuery, (snapshot) => {
        const runs = snapshot.docs
          .map((entry) =>
            normalizeRecord<LiveRunRecord>({ id: entry.id, ...entry.data() }),
          )
          .sort((left, right) =>
            compareDates(right.updated_at, left.updated_at),
          );
        onRuns(runs);
      });
    },
  };
}

function buildFirebaseRunDataDeps(
  db: ReturnType<typeof getFirestore>,
  storage: ReturnType<typeof getStorage>,
  downloadURLCache: Map<string, Promise<string>>,
): LiveRunDataDeps {
  return {
    subscribeAssets(runID, onAssets) {
      return onSnapshot(collection(db, "runs", runID, "assets"), (snapshot) => {
        const assets = snapshot.docs
          .map((entry) => normalizeRecord<LiveAssetRow>(entry.data()))
          .sort((left, right) =>
            compareDates(right.discovery_date, left.discovery_date),
          );
        onAssets(assets);
      });
    },
    subscribeTraces(runID, onTraces) {
      return onSnapshot(collection(db, "runs", runID, "traces"), (snapshot) => {
        const traces = snapshot.docs.map((entry) =>
          normalizeRecord<LiveTrace>(entry.data()),
        );
        onTraces(traces);
      });
    },
    subscribePivots(runID, onPivots) {
      return onSnapshot(collection(db, "runs", runID, "pivots"), (snapshot) => {
        const pivots = snapshot.docs
          .map((entry) =>
            normalizeRecord<LivePivotRecord>({
              id: entry.id,
              ...entry.data(),
            }),
          )
          .sort((left, right) =>
            compareDates(right.updated_at, left.updated_at),
          );
        onPivots(pivots);
      });
    },
    subscribeJudgeSummary(runID, onSummary) {
      return onSnapshot(
        doc(db, "runs", runID, "analysis", "judge_summary"),
        (snapshot) => {
          onSummary(
            snapshot.exists()
              ? normalizeRecord<LiveJudgeSummary>(snapshot.data())
              : {
                  evaluation_count: 0,
                  accepted_count: 0,
                  discarded_count: 0,
                  groups: [],
                },
          );
        },
      );
    },
    subscribeEvents(runID, onEvents) {
      const eventQuery = query(
        collection(db, "runs", runID, "events"),
        orderBy("created_at", "desc"),
      );
      return onSnapshot(eventQuery, (snapshot) => {
        const events = snapshot.docs.map((entry) =>
          normalizeRecord<LiveEventRecord>({ id: entry.id, ...entry.data() }),
        );
        onEvents(events);
      });
    },
    resolveRunArtifactURL(downloadPath) {
      const trimmed = String(downloadPath ?? "").trim();
      if (!trimmed) {
        return Promise.reject(new Error("Run artifact path is required."));
      }
      const cached = downloadURLCache.get(trimmed);
      if (cached) {
        return cached;
      }

      const pending = getDownloadURL(storageRef(storage, trimmed))
        .then((url) => preflightRunArtifactURL(url))
        .catch((error: unknown) => {
          downloadURLCache.delete(trimmed);
          throw normalizeRunArtifactDownloadError(error);
        });
      downloadURLCache.set(trimmed, pending);
      return pending;
    },
  };
}

function buildFirebaseRunActionDeps(
  getIDToken: LiveAuthDeps["getIDToken"],
): LiveRunActionDeps {
  return {
    async createRun(payload: CreateRunPayload) {
      const token = await getIDToken();
      const response = await fetch(resolveLiveURL("/api/runs"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      return parseAPIResponse<LiveRunRecord>(response);
    },
    async decidePivot(runID, pivotID, decision) {
      const token = await getIDToken();
      const response = await fetch(
        resolveLiveURL(
          `/api/runs/${encodeURIComponent(runID)}/pivots/${encodeURIComponent(pivotID)}/decision`,
        ),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ decision }),
        },
      );
      return parseAPIResponse<LivePivotRecord>(response);
    },
  };
}

function mapUser(user: User | null): LiveAuthSession | null {
  if (!user?.email) {
    return null;
  }
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName ?? undefined,
  };
}

function normalizeRecord<T>(value: unknown): T {
  return normalizeUnknown(value) as T;
}

function normalizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeUnknown);
  }
  if (value && typeof value === "object") {
    if (typeof (value as { toDate?: () => Date }).toDate === "function") {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }
    const normalized: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      normalized[key] = normalizeUnknown(entry);
    });
    return normalized;
  }
  return value;
}

function compareDates(
  left: string | undefined,
  right: string | undefined,
): number {
  return Date.parse(left ?? "") - Date.parse(right ?? "");
}

/**
 * preflightRunArtifactURL verifies that a resolved Firebase Storage download
 * URL can actually serve content before the UI navigates a popup to it.
 */
export async function preflightRunArtifactURL(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  try {
    const response = await fetchImpl(url, { method: "HEAD" });
    if (!response.ok) {
      throw new ArtifactDownloadUnavailableError();
    }
    return url;
  } catch (error) {
    if (error instanceof ArtifactDownloadUnavailableError) {
      throw error;
    }
    throw new ArtifactDownloadUnavailableError();
  }
}

/**
 * normalizeRunArtifactDownloadError collapses known Firebase Storage download
 * failures into a generic unavailable state while preserving unrelated errors.
 */
export function normalizeRunArtifactDownloadError(error: unknown): Error {
  if (error instanceof ArtifactDownloadUnavailableError) {
    return error;
  }
  if (isKnownRunArtifactDownloadFailure(error)) {
    return new ArtifactDownloadUnavailableError();
  }
  if (error instanceof Error) {
    return error;
  }
  return new ArtifactDownloadUnavailableError();
}

/**
 * parseAPIResponse converts the live API response body into JSON and prefers
 * explicit API error messages over transport-level fallback text.
 */
export async function parseAPIResponse<T>(response: Response): Promise<T> {
  const rawBody = await response.text();
  const payload = parseResponseBody<T | { error?: string }>(rawBody);
  if (!response.ok) {
    const explicitError =
      payload && typeof payload === "object"
        ? (payload as { error?: string }).error
        : undefined;
    const fallbackError =
      rawBody.trim() ||
      `${response.status} ${response.statusText || "request failed"}`;
    throw new Error(String(explicitError ?? fallbackError));
  }
  if (payload === undefined) {
    throw new Error(
      rawBody.trim()
        ? "The server returned invalid JSON."
        : "The server returned an empty response.",
    );
  }
  return payload as T;
}

function parseResponseBody<T>(rawBody: string): T | undefined {
  const trimmed = rawBody.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return undefined;
  }
}

function isKnownRunArtifactDownloadFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    serverResponse?: unknown;
    customData?: { serverResponse?: unknown };
  };
  const code = String(candidate.code ?? "").trim();
  if (
    code === objectNotFoundStorageErrorCode ||
    code === noDownloadURLStorageErrorCode
  ) {
    return true;
  }

  const serverResponse = readStorageServerResponse(candidate);
  return (
    /required service account is missing necessary permissions/i.test(
      serverResponse,
    ) || /"code"\s*:\s*412\b/.test(serverResponse)
  );
}

function readStorageServerResponse(candidate: {
  message?: unknown;
  serverResponse?: unknown;
  customData?: { serverResponse?: unknown };
}): string {
  return [
    candidate.serverResponse,
    candidate.customData?.serverResponse,
    candidate.message,
  ]
    .map((value) => String(value ?? "").trim())
    .find((value) => value.length > 0) ?? "";
}
