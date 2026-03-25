# asset-discovery-web

This repository contains the Firebase-backed live Asset Discovery workspace. The Go backend lives in the sibling `asset-discovery` repository.

The live workspace includes:

- Google sign-in through Firebase Auth
- dedicated `Assets`, `Trace`, `Pivots`, and `Activity` views
- Firestore subscriptions for runs, assets, traces, pivots, judge analysis, seeds, and events
- API writes to the Go backend for run creation and manual pivot decisions

Manual runs pause for review and expose pending pivots in the `Pivots` view. Autonomous runs apply AI-recommended pivots automatically and surface those decisions in the same audit stream.

Only verified Google accounts in `@zerofox.com` or `roaguirred@gmail.com` are allowed to sign in to the demo.

## Commands

```bash
npm ci
npm run dev
npm test
npm run test:firebase:rules
npm run build
```

## Environment

Copy [`.env.example`](.env.example) to `.env.local` and populate the Firebase web app values:

```bash
cp .env.example .env.local
```

The app now requires live Firebase config to start. Missing required values fail fast at bootstrap.

The current env surface is:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_ASSET_DISCOVERY_API_BASE_URL`

For local development, prefer leaving `VITE_ASSET_DISCOVERY_API_BASE_URL` empty. Vite then proxies `/api/*` and `/healthz` to `http://127.0.0.1:8080` automatically.

Set `VITE_ASSET_DISCOVERY_API_BASE_URL` only when the browser should call the Go API on another origin directly. The backend only allows cross-origin browser writes from:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://asset-discovery-0325-f111.web.app`
- `https://asset-discovery-0325-f111.firebaseapp.com`

## Local Development

Run the live UI with the sibling backend:

```bash
# terminal 1
cd ../asset-discovery
make server

# terminal 2
npm run dev
```

## Firebase Notes

- `.firebaserc` points at the current demo project by default.
- Google sign-in must be enabled in Firebase Auth for the selected project.
- `localhost` and `127.0.0.1` must be authorized auth domains for local popup sign-in.

`npm run test:firebase:rules` starts the Firestore emulator through the Firebase CLI, applies [`firestore.rules`](firestore.rules), and verifies creator-only reads plus the client-write deny rules. The wrapper script automatically selects an installed JDK 21+ when the system default Java is older.

## Runtime Behavior

- Google sign-in through Firebase Auth
- Firestore subscriptions for runs, assets, traces, pivots, judge analysis, seeds, and events
- API writes to the Go backend via `/api/*`
- hash-based live navigation for `Assets`, `Trace`, `Pivots`, and `Activity`
