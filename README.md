# asset-discovery-web

This repository is the standalone browser client for the asset discovery visualizer.

The Go exporter lives in the sibling `asset-discovery` repository and produces data only:

- `manifest.json`
- `runs/<run-id>.json`

This client loads that archive and renders the browse, trace, and judge-analysis views.

## Commands

```bash
npm ci
npm run dev
npm test
npm run build
```

## Runtime Behavior

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
