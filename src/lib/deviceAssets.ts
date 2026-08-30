// Must match the Workbox CacheFirst cache in vite.config.ts. Warming an
// unrelated bucket would succeed here but the service worker would never serve
// those responses to image requests while offline.
export const DEVICE_ASSET_CACHE = 'magiccon-remote-images-v1'

export type DeviceAssetCacheResult = {
  expected: number
  cached: number
  failures: string[]
}

function requestForAsset(url: string) {
  const absolute = new URL(url, window.location.href)
  return new Request(absolute, absolute.origin === window.location.origin
    ? { credentials: 'same-origin' }
    : { mode: 'no-cors', credentials: 'omit' })
}

export async function cacheDeviceAssets(urls: Array<string | null | undefined>): Promise<DeviceAssetCacheResult> {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))]
  if (!unique.length) return { expected: 0, cached: 0, failures: [] }
  if (!('caches' in globalThis) || !navigator.onLine) return { expected: unique.length, cached: 0, failures: unique }
  const cache = await caches.open(DEVICE_ASSET_CACHE)
  let cursor = 0
  let cached = 0
  const failures: string[] = []
  const worker = async () => {
    while (cursor < unique.length) {
      const url = unique[cursor++]
      try {
        const request = requestForAsset(url)
        if (!(await cache.match(request))) {
          const response = await fetch(request)
          if (!response.ok && response.type !== 'opaque') throw new Error(`HTTP ${response.status}`)
          await cache.put(request, response)
        }
        cached += 1
      } catch {
        failures.push(url)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, unique.length) }, worker))
  return { expected: unique.length, cached, failures }
}
