import { createRoot } from 'react-dom/client'
import './index.css'
import { liveModeEnabled } from './live/env'

const root = createRoot(document.getElementById('root')!)

void bootstrap()

async function bootstrap(): Promise<void> {
  if (liveModeEnabled()) {
    const [{ default: LiveApp }, { buildFirebaseLiveDeps }] = await Promise.all([
      import('./live/LiveApp.tsx'),
      import('./live/firebaseDeps'),
    ])
    root.render(<LiveApp deps={buildFirebaseLiveDeps()} />)
    return
  }

  const { default: App } = await import('./App.tsx')
  root.render(<App />)
}
