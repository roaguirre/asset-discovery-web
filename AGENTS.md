# AGENTS.md

This repo is a standalone browser client for Asset Discovery.

### Workflow Rules

1. **Do not turn this into a backend**: This repo is a static client. Data loading should stay browser-side.
2. **Contract compatibility first**: If you change `src/types.ts`, the pinned schemas and fixtures under `contracts/visualizer/` must still match the real exporter contract. Do not invent frontend-only wire-shape changes.
3. **Preserve manifest resolution semantics**: The default manifest path is `/exports/visualizer/manifest.json`, and relative run/download URLs are resolved from the manifest URL, not from the page URL.
4. **Preserve deep links**: Keep hash-based trace/judge/browse routes working unless the task explicitly changes routing.
5. **Keep local dev usable**: If you touch `vite.config.ts`, preserve the `/exports/*` middleware so local development can read the sibling exporter output.
6. **Tests are required for behavior changes**: If you change loading, routing, filtering, rendering, or contract handling, update or add Vitest coverage.
7. **Prefer contract fixtures over ad hoc mocks when possible**: For exporter-shape regressions, use the pinned fixtures in `contracts/visualizer/`.

### Validation Commands

- Install deps: `npm ci`
- Run tests: `npm test`
- Build production bundle: `npm run build`
- Lint: `npm run lint`

### Contract Update Policy

- Non-breaking exporter additions should update the pinned schema and fixtures in sync with the Go exporter.
- Breaking payload changes should be coordinated with the `asset-discovery` repository rather than patched here in isolation.
- Do not add frontend-only fallback fields to “smooth over” exporter changes without explicit direction.
