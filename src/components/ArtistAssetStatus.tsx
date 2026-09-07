import { useEffect, useState } from 'react'
import { auditDeviceAssets, cacheDeviceAssets, type DeviceAssetCacheResult } from '../lib/deviceAssets'
import './ArtistAssetStatus.css'

export function ArtistAssetStatus({ urls, missingImages, online, revision }: { urls: string[]; missingImages: number; online: boolean; revision: number }) {
  const [result, setResult] = useState<DeviceAssetCacheResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const manifest = JSON.stringify([...new Set(urls.filter(Boolean))].sort())
  useEffect(() => {
    let active = true
    setLoading(true)
    setResult(null)
    const assets = JSON.parse(manifest) as string[]
    void (online ? cacheDeviceAssets(assets) : auditDeviceAssets(assets))
      .then(value => { if (active) setResult(value) })
      .catch(() => { if (active) setResult({ expected: assets.length, cached: 0, failures: assets }) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [manifest, online, revision, retry])
  const expected = (result?.expected ?? JSON.parse(manifest).length) + missingImages
  const cached = result?.cached ?? 0
  return <div className="artist-asset-status" role="status">
    <small>{loading ? (online ? 'Saving artist/card images' : 'Checking saved artist/card images')
      : expected === 0 ? 'No artist/card images in this catalog'
      : cached === expected ? `Artist/card images saved · ${cached}/${expected}`
      : `Artist/card images incomplete · ${cached}/${expected}`}</small>
    {!loading && cached < expected && <>
      <small>{missingImages ? `${missingImages} image references missing. ` : ''}{online ? 'Some images are not available offline yet.' : 'Reconnect to download missing images.'}</small>
      {online && <button type="button" onClick={() => setRetry(value => value + 1)}>Retry image download</button>}
    </>}
  </div>
}
