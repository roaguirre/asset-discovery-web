import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
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
import type { LiveAppDeps } from "./deps";
import type {
  LiveAssetRow,
  LiveAuthSession,
  LiveEventRecord,
  LiveJudgeSummary,
  LivePivotRecord,
  LiveRunRecord,
  LiveTrace,
} from "./types";
import { readExportsBucket, resolveLiveURL, readFirebaseConfig } from "./env";

export function buildFirebaseLiveDeps(): LiveAppDeps {
  const config = readFirebaseConfig();
  const exportsBucket = readExportsBucket();

  const app = getApps()[0] ?? initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app, `gs://${exportsBucket}`);
  const provider = new GoogleAuthProvider();
  const downloadURLCache = new Map<string, Promise<string>>();

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
    subscribeRuns(ownerUID, onRuns) {
      const runQuery = query(
        collection(db, "runs"),
        where("owner_uid", "==", ownerUID),
        orderBy("updated_at", "desc"),
      );
      return onSnapshot(runQuery, (snapshot) => {
        const runs = snapshot.docs
          .map((doc) =>
            normalizeRecord<LiveRunRecord>({ id: doc.id, ...doc.data() }),
          )
          .sort((left, right) =>
            compareDates(right.updated_at, left.updated_at),
          );
        onRuns(runs);
      });
    },
    subscribeAssets(runID, onAssets) {
      return onSnapshot(collection(db, "runs", runID, "assets"), (snapshot) => {
        const assets = snapshot.docs
          .map((doc) => normalizeRecord<LiveAssetRow>(doc.data()))
          .sort((left, right) =>
            compareDates(right.discovery_date, left.discovery_date),
          );
        onAssets(assets);
      });
    },
    subscribeTraces(runID, onTraces) {
      return onSnapshot(collection(db, "runs", runID, "traces"), (snapshot) => {
        const traces = snapshot.docs.map((doc) =>
          normalizeRecord<LiveTrace>(doc.data()),
        );
        onTraces(traces);
      });
    },
    subscribePivots(runID, onPivots) {
      return onSnapshot(collection(db, "runs", runID, "pivots"), (snapshot) => {
        const pivots = snapshot.docs
          .map((doc) =>
            normalizeRecord<LivePivotRecord>({ id: doc.id, ...doc.data() }),
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
        const events = snapshot.docs.map((doc) =>
          normalizeRecord<LiveEventRecord>({ id: doc.id, ...doc.data() }),
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

      const pending = getDownloadURL(storageRef(storage, trimmed)).catch(
        (error: unknown) => {
          downloadURLCache.delete(trimmed);
          throw error;
        },
      );
      downloadURLCache.set(trimmed, pending);
      return pending;
    },
    async createRun(payload) {
      const token = await this.getIDToken();
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
      const token = await this.getIDToken();
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
