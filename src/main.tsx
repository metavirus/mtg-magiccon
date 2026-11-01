import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './account.css'
import './density.css'
import App from './App'
import { showStartupStalled, startWithCurrentShell } from './startupShell'

startWithCurrentShell({
  serviceWorker: import.meta.env.PROD && 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
  online: navigator.onLine,
  workerUrl: `${import.meta.env.BASE_URL}sw.js`,
  mount: () => {
    // Enter the standalone study only after the shell update gate has activated
    // its routing exclusion; older offline workers otherwise return the app shell.
    if (new URLSearchParams(window.location.search).get('mapStudy') === '1') {
      window.location.replace(new URL('map-preview/', window.location.href).href)
      return
    }
    createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
  },
  reload: () => window.location.reload(),
  stalled: () => showStartupStalled(document.getElementById('root')!, () => window.location.reload()),
})
