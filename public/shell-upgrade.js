/* The one-time bridge lets old installed apps adopt the current shell even
   when their startup update listener times out. Later releases use the normal
   waiting-worker path so an in-progress page can finish its work. */
const upgradeCache = 'magiccon-shell-upgrades'
const shellMarker = new URL('./__shell_v2_active', self.registration.scope).href

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    if (!(await caches.match(shellMarker, { cacheName: upgradeCache }))) {
      await self.skipWaiting()
    }
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(upgradeCache)
    await cache.put(shellMarker, new Response('active'))
  })())
})
