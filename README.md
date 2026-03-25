# asset-discovery-web

This repository now has two client modes:

- a Firebase-backed live workspace for authenticated demo users
- the legacy archive visualizer fed by exporter fixtures and archived manifest/run JSON

The Go backend lives in the sibling `asset-discovery` repository.

## Live Workspace

When Firebase env vars are present, the app boots the live client instead of the legacy archive visualizer.

The live workspace includes:

- Google sign-in through Firebase Auth
- a fixed top-bar run selector plus drawer navigation
- dedicated `Assets`, `Trace`, `Pivots`, and `Activity` views
- asset tabs for `All`, `Domains`, and `IPs`
- Firestore subscriptions for runs, assets, traces, pivots, seeds, and events
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

If the required Firebase env vars are absent, the app falls back to the legacy archive visualizer automatically.

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

The repo serves `/exports/*` from the sibling `../asset-discovery/exports` directory during local Vite dev and preview, so the legacy archive visualizer still works without copying files into this repo.

## Firebase Notes

- `.firebaserc` points at the current demo project by default.
- Google sign-in must be enabled in Firebase Auth for the selected project.
- `localhost` and `127.0.0.1` must be authorized auth domains for local popup sign-in.

`npm run test:firebase:rules` starts the Firestore emulator through the Firebase CLI, applies [`firestore.rules`](firestore.rules), and verifies creator-only reads plus the client-write deny rules. The wrapper script automatically selects an installed JDK 21+ when the system default Java is older.

## Runtime Behavior

- Live mode:
  - Google sign-in through Firebase Auth
  - Firestore subscriptions for runs, assets, traces, pivots, and events
  - API writes to the Go backend via `/api/*`
- Legacy mode:
  - Default manifest URL: `/exports/visualizer/manifest.json`
  - Alternate archive: `?manifest=<url-to-manifest.json>`
  - Deep links: hash routes such as `#trace/<run-id>/<asset-id>`
- During local `vite` dev and preview, `/exports/*` is served from the sibling `../asset-discovery/exports` directory automatically.

## Contract Pinning

The pinned exporter contract artifacts live under `contracts/visualizer/`:

- `manifest.v1.schema.json`
- `run.v1.schema.json`
- `manifest.v1.fixture.json`
- `run.v1.fixture.json`

This repo validates those pinned fixtures in test and should only update them in sync with the Go exporter contract.
