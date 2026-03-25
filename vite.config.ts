import { existsSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import type { Connect } from 'vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const assetDiscoveryRepoRoot = resolve(__dirname, '../asset-discovery')
const exportsRoot = resolve(assetDiscoveryRepoRoot, 'exports')

function contentTypeFor(pathname: string): string {
  switch (extname(pathname).toLowerCase()) {
    case '.json':
      return 'application/json; charset=utf-8'
    case '.csv':
      return 'text/csv; charset=utf-8'
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    default:
      return 'application/octet-stream'
  }
}

function exportsMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const pathname = req.url ? req.url.split('?')[0] : ''
    if (!pathname || !pathname.startsWith('/exports/')) {
      next()
      return
    }

    const filePath = resolve(exportsRoot, `.${pathname.slice('/exports'.length)}`)
    if (!filePath.startsWith(exportsRoot) || !existsSync(filePath)) {
      next()
      return
    }

    try {
      const body = readFileSync(filePath)
      res.statusCode = 200
      res.setHeader('Content-Type', contentTypeFor(filePath))
      res.end(body)
    } catch (error) {
      next(error as Error)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-asset-discovery-exports',
      configureServer(server) {
        server.middlewares.use(exportsMiddleware())
      },
      configurePreviewServer(server) {
        server.middlewares.use(exportsMiddleware())
      },
    },
  ],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'https://visualizer.test/',
      },
    },
    setupFiles: './src/test/setup.ts',
  },
})
