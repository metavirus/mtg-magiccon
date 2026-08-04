import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.GITHUB_PAGES === '1' ? '/mtg-magiccon/' : '/',
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icon.svg', 'apple-touch-icon.png', 'app-icon-1024.png', 'magiccon-atlanta-peach.png'],
    manifest: {
      name: 'MagicCon Atlanta Companion', short_name: 'MagicCon', start_url: process.env.GITHUB_PAGES === '1' ? '/mtg-magiccon/' : '/', display: 'standalone',
      background_color: '#07101d', theme_color: '#07101d',
      icons: [
        { src: process.env.GITHUB_PAGES === '1' ? '/mtg-magiccon/app-icon-1024.png' : '/app-icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
        { src: process.env.GITHUB_PAGES === '1' ? '/mtg-magiccon/icon.svg' : '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
      ]
    },
    workbox: {
      navigateFallback: process.env.GITHUB_PAGES === '1' ? '/mtg-magiccon/index.html' : '/index.html',
      runtimeCaching: [{
        urlPattern: /^https:\/\/pavjsexxbueuzhzgemgy\.supabase\.co\/rest\/v1\//,
        handler: 'NetworkOnly'
      }]
    }
  })],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }
})
