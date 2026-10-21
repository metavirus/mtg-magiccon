// Must match the Workbox CacheFirst cache in vite.config.ts. Warming an
// unrelated bucket would succeed here but the service worker would never serve
// those responses to image requests while offline.
export const DEVICE_ASSET_CACHE = 'magiccon-remote-images-v1'
const recentlyRefreshed = new Map<string, number>()
const downloads = new Map<string, Promise<void>>()
const MEDIA_REFRESH_INTERVAL = 5 * 60 * 1000

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

/** Inspect existing bytes, including offline; a prior successful download is not proof against eviction. */
export async function auditDeviceAssets(urls: Array<string | null | undefined>): Promise<DeviceAssetCacheResult> {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))]
  const failures: string[] = []
  let cached = 0
  try {
    if (!('caches' in globalThis)) throw new Error('Cache storage unavailable')
    const cache = await caches.open(DEVICE_ASSET_CACHE)
    for (const url of unique) {
      try {
        if (await cache.match(requestForAsset(url))) cached += 1
        else failures.push(url)
      } catch { failures.push(url) }
    }
  } catch { return { expected: unique.length, cached: 0, failures: unique } }
  return { expected: unique.length, cached, failures }
}

export function exhibitorAssetUrls(exhibitors: Array<{ imageUrl?: string; specials?: Array<{ imageUrl?: string }>; exclusives?: Array<{ imageUrl?: string }> }>) {
  return exhibitors.flatMap(exhibitor => [exhibitor.imageUrl, ...(exhibitor.specials ?? []).map(offer => offer.imageUrl), ...(exhibitor.exclusives ?? []).map(offer => offer.imageUrl)])
}

export async function cacheDeviceAssets(urls: Array<string | null | undefined>, refreshExisting = false): Promise<DeviceAssetCacheResult> {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))]
  if (!unique.length) return { expected: 0, cached: 0, failures: [] }
  if (!('caches' in globalThis) || !navigator.onLine) return { expected: unique.length, cached: 0, failures: unique }
  let cache: Cache
  try { cache = await caches.open(DEVICE_ASSET_CACHE) }
  catch { return { expected: unique.length, cached: 0, failures: unique } }
  let cursor = 0
  let cached = 0
  const failures: string[] = []
  const worker = async () => {
    while (cursor < unique.length) {
      const url = unique[cursor++]
      try {
        const request = requestForAsset(url)
        const present = await cache.match(request)
        if (!present || (refreshExisting && Date.now() - (recentlyRefreshed.get(request.url) ?? 0) >= MEDIA_REFRESH_INTERVAL)) {
          let download = downloads.get(request.url)
          if (!download) {
            download = (async () => {
              const response = await fetch(request, refreshExisting ? { cache: 'reload' } : undefined)
              if (!response.ok && response.type !== 'opaque') throw new Error(`HTTP ${response.status}`)
              await cache.put(request, response)
              recentlyRefreshed.set(request.url, Date.now())
            })().finally(() => { downloads.delete(request.url) })
            downloads.set(request.url, download)
          }
          await download
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
