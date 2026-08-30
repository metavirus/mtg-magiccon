import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const localCatalogRoot = path.resolve('.codex-local/catalog-intake/atlanta-2025-accessories/processed')
const localCatalogMime = new Map([
  ['.json', 'application/json; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
])

function localCatalogIntake() {
  return {
    name: 'local-catalog-intake',
    apply: 'serve' as const,
    configureServer(server: { middlewares: { use: (route: string, handler: (request: { url?: string }, response: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body?: Uint8Array | string) => void }, next: () => void) => void) => void } }) {
      // A production PWA service worker can otherwise keep serving an old
      // precached shell on 127.0.0.1 even while Vite is healthy. Replace it in
      // development with a network-only worker and evict asset caches while
      // preserving the signed-in localStorage/session state.
      server.middlewares.use('/sw.js', (_request, response) => {
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/javascript; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(`
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys()
  await Promise.all(keys.map(key => caches.delete(key)))
  await self.clients.claim()
})()))
self.addEventListener('fetch', event => event.respondWith(fetch(event.request)))
`)
      })
      server.middlewares.use('/__local_catalog_intake', async (request, response, next) => {
        try {
          const relative = decodeURIComponent((request.url ?? '/').split('?')[0]).replace(/^\/+/, '')
          const target = path.resolve(localCatalogRoot, relative)
          if (target !== localCatalogRoot && !target.startsWith(`${localCatalogRoot}${path.sep}`)) {
            response.statusCode = 403
            response.end('Forbidden')
            return
          }
          if (!(await stat(target)).isFile()) return next()
          response.statusCode = 200
          response.setHeader('Content-Type', localCatalogMime.get(path.extname(target).toLowerCase()) ?? 'application/octet-stream')
          response.setHeader('Cache-Control', 'no-store')
          response.end(await readFile(target))
        } catch {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [localCatalogIntake(), react(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: [
      'favicon-peach-v2.png',
      'apple-touch-icon.png',
      'app-icon-1024.png',
      'magiccon-atlanta-peach.png',
      'gwcc-campus-reference.png',
      'artist-cynthia-sheppard.jpg',
      'artist-mark-poole.jpg',
      'artist-serena-malyon.jpg',
      'artist-rebecca-guay.png',
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
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      runtimeCaching: [{
        urlPattern: /^https:\/\/.*\.(?:avif|gif|jpe?g|png|webp)(?:\?.*)?$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'magiccon-remote-images-v1',
          cacheableResponse: { statuses: [0, 200] },
          expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 45 },
        },
      }],
    },
  })],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }
})
