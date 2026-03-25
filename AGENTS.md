# AGENTS.md

This repo is the live web client for Asset Discovery.

### Workflow Rules

1. **Do not turn this into a backend**: This repo is a static client. Data loading should stay browser-side.
2. **Live schema compatibility first**: Keep Firestore document shapes and API payloads aligned with the sibling `asset-discovery` live read model. Do not invent frontend-only fallback fields to hide backend mismatches.
3. **Preserve live navigation**: Keep the current hash-based live routing and shell behavior working unless the task explicitly changes navigation.
4. **Keep local dev usable**: If you touch `vite.config.ts`, preserve the `/api/*` and `/healthz` proxy behavior used with the sibling Go server.
5. **Tests are required for behavior changes**: If you change loading, routing, filtering, rendering, auth, or live dependency behavior, update or add Vitest coverage.
6. **Prefer focused live fakes**: For live UI regressions, use the existing fake dependency pattern instead of rebuilding dead archive fixtures.

### Validation Commands

- Install deps: `npm ci`
- Run tests: `npm test`
- Build production bundle: `npm run build`
- Lint: `npm run lint`
