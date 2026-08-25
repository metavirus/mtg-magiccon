import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon-peach-v2.png', 'apple-touch-icon.png', 'app-icon-1024.png'],
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
