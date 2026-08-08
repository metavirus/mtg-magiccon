import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon.svg', 'apple-touch-icon.png', 'app-icon-1024.png', 'magiccon-atlanta-peach.png'],
    manifest: {
      name: 'MagicCon Atlanta Companion', short_name: 'MagicCon', start_url: '.', display: 'standalone',
      background_color: '#07101d', theme_color: '#07101d',
      icons: [
        { src: 'app-icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
        { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
      ]
    },
    workbox: {
      clientsClaim: true,
      navigateFallback: 'index.html',
      skipWaiting: true,
      runtimeCaching: [{
        urlPattern: /^https:\/\/pavjsexxbueuzhzgemgy\.supabase\.co\/rest\/v1\//,
        handler: 'NetworkOnly'
      }]
    }
  })],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }
})
