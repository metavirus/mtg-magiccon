import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icon.svg'],
    manifest: {
      name: 'MagicCon Atlanta Companion', short_name: 'MagicCon', start_url: '/', display: 'standalone',
      background_color: '#f5efe4', theme_color: '#17130f',
      icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
    },
    workbox: {
      navigateFallback: '/index.html',
      runtimeCaching: [{
        urlPattern: /^https:\/\/pavjsexxbueuzhzgemgy\.supabase\.co\/rest\/v1\//,
        handler: 'NetworkOnly'
      }]
    }
  })],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }
})
