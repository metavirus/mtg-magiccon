import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: [
      'favicon-peach-v2.png',
      'apple-touch-icon.png',
      'app-icon-1024.png',
      'magiccon-atlanta-peach.png',
      'gwcc-campus-reference.png',
      'black-lotus-order-qr.png',
      'black-lotus-order-original-qr.png',
      'black-lotus-order-original-summary.png',
      'black-lotus-order-original-page-1.png',
      'black-lotus-order-original-page-2.png',
      'black-lotus-order-original-page-3.png',
      'black-lotus-order-original-page-4.png',
      'black-lotus-order-original-page-5.png',
      'juan-premium-order-original.html',
    ],
    manifest: {
      name: 'MagicCon Atlanta Companion',
      short_name: 'MagicCon',
      display: 'standalone',
      start_url: './',
      theme_color: '#07101d',
      background_color: '#07101d',
      icons: [
        { src: 'app-icon-1024.png', sizes: '1024x1024', type: 'image/png' },
        { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    workbox: {
      cleanupOutdatedCaches: true,
      navigateFallback: 'index.html',
      globPatterns: ['index.html', '**/*.{js,css,svg}'],
    },
  })],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }
})
