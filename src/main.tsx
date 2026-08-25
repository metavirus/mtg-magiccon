import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './account.css'
import './density.css'
import App from './App'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
