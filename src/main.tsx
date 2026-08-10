import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './account.css'
import './density.css'
import App from './App'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().catch(() => undefined)
    })
  }).catch(() => undefined)
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
