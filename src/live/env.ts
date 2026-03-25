export type FirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  storageBucket?: string
  messagingSenderId?: string
}

export function liveModeEnabled(): boolean {
  return Boolean(readFirebaseConfig())
}

export function readFirebaseConfig(): FirebaseConfig | null {
  const apiKey = String(import.meta.env.VITE_FIREBASE_API_KEY ?? '').trim()
  const authDomain = String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim()
  const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim()
  const appId = String(import.meta.env.VITE_FIREBASE_APP_ID ?? '').trim()
  if (!apiKey || !authDomain || !projectId || !appId) {
    return null
  }
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim() || undefined,
    messagingSenderId: String(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '').trim() || undefined,
  }
}
