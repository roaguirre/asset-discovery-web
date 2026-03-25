import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { collection, getFirestore, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import type { LiveAppDeps } from './deps'
import type { LiveAssetRow, LiveAuthSession, LiveEventRecord, LivePivotRecord, LiveRunRecord, LiveTrace } from './types'
import { readFirebaseConfig } from './env'

const apiBaseURL = String(import.meta.env.VITE_ASSET_DISCOVERY_API_BASE_URL ?? '').trim()

export function buildFirebaseLiveDeps(): LiveAppDeps {
  const config = readFirebaseConfig()
  if (!config) {
    throw new Error('Firebase live mode is not configured.')
  }

  const app = getApps()[0] ?? initializeApp(config)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const provider = new GoogleAuthProvider()

  return {
    subscribeAuth(onSession) {
      return onAuthStateChanged(auth, (user) => onSession(mapUser(user)))
    },
    signInWithGoogle() {
      return signInWithPopup(auth, provider).then(() => undefined)
    },
    signOut() {
      return signOut(auth)
    },
    async getIDToken() {
      if (!auth.currentUser) {
        throw new Error('No signed-in Firebase session.')
      }
      return auth.currentUser.getIdToken()
    },
    subscribeRuns(ownerUID, onRuns) {
      const runQuery = query(collection(db, 'runs'), where('owner_uid', '==', ownerUID), orderBy('updated_at', 'desc'))
      return onSnapshot(runQuery, (snapshot) => {
        const runs = snapshot.docs
          .map((doc) => normalizeRecord<LiveRunRecord>({ id: doc.id, ...doc.data() }))
          .sort((left, right) => compareDates(right.updated_at, left.updated_at))
        onRuns(runs)
      })
    },
    subscribeAssets(runID, onAssets) {
      return onSnapshot(collection(db, 'runs', runID, 'assets'), (snapshot) => {
        const assets = snapshot.docs
          .map((doc) => normalizeRecord<LiveAssetRow>(doc.data()))
          .sort((left, right) => compareDates(right.discovery_date, left.discovery_date))
        onAssets(assets)
      })
    },
    subscribeTraces(runID, onTraces) {
      return onSnapshot(collection(db, 'runs', runID, 'traces'), (snapshot) => {
        const traces = snapshot.docs.map((doc) => normalizeRecord<LiveTrace>(doc.data()))
        onTraces(traces)
      })
    },
    subscribePivots(runID, onPivots) {
      return onSnapshot(collection(db, 'runs', runID, 'pivots'), (snapshot) => {
        const pivots = snapshot.docs
          .map((doc) => normalizeRecord<LivePivotRecord>({ id: doc.id, ...doc.data() }))
          .sort((left, right) => compareDates(right.updated_at, left.updated_at))
        onPivots(pivots)
      })
    },
    subscribeEvents(runID, onEvents) {
      const eventQuery = query(collection(db, 'runs', runID, 'events'), orderBy('created_at', 'desc'))
      return onSnapshot(eventQuery, (snapshot) => {
        const events = snapshot.docs.map((doc) => normalizeRecord<LiveEventRecord>({ id: doc.id, ...doc.data() }))
        onEvents(events)
      })
    },
    async createRun(payload) {
      const token = await this.getIDToken()
      const response = await fetch(resolveAPIURL('/api/runs'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      return parseAPIResponse<LiveRunRecord>(response)
    },
    async decidePivot(runID, pivotID, decision) {
      const token = await this.getIDToken()
      const response = await fetch(resolveAPIURL(`/api/runs/${encodeURIComponent(runID)}/pivots/${encodeURIComponent(pivotID)}/decision`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision }),
      })
      return parseAPIResponse<LivePivotRecord>(response)
    },
  }
}

function mapUser(user: User | null): LiveAuthSession | null {
  if (!user?.email) {
    return null
  }
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName ?? undefined,
  }
}

function normalizeRecord<T>(value: unknown): T {
  return normalizeUnknown(value) as T
}

function normalizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeUnknown)
  }
  if (value && typeof value === 'object') {
    if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().toISOString()
    }
    const normalized: Record<string, unknown> = {}
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      normalized[key] = normalizeUnknown(entry)
    })
    return normalized
  }
  return value
}

function compareDates(left: string | undefined, right: string | undefined): number {
  return Date.parse(left ?? '') - Date.parse(right ?? '')
}

function resolveAPIURL(pathname: string): string {
  if (!apiBaseURL) {
    return pathname
  }
  return new URL(pathname, apiBaseURL).toString()
}

export async function parseAPIResponse<T>(response: Response): Promise<T> {
  const rawBody = await response.text()
  const payload = parseResponseBody<T | { error?: string }>(rawBody)
  if (!response.ok) {
    const explicitError = payload && typeof payload === 'object' ? (payload as { error?: string }).error : undefined
    const fallbackError = rawBody.trim() || `${response.status} ${response.statusText || 'request failed'}`
    throw new Error(String(explicitError ?? fallbackError))
  }
  if (payload === undefined) {
    throw new Error(rawBody.trim() ? 'The server returned invalid JSON.' : 'The server returned an empty response.')
  }
  return payload as T
}

function parseResponseBody<T>(rawBody: string): T | undefined {
  const trimmed = rawBody.trim()
  if (!trimmed) {
    return undefined
  }
  try {
    return JSON.parse(trimmed) as T
  } catch {
    return undefined
  }
}
