import { useEffect, useState } from 'react'
import { auditDeviceAssets, cacheDeviceAssets, type DeviceAssetIntegrity, type DeviceAssetCacheResult } from '../lib/deviceAssets'
import './ArtistAssetStatus.css'

export function ArtistAssetStatus({ urls, missingImages, online, revision, label = 'Artist/card images', integrity = {} }: { urls: string[]; missingImages: number; online: boolean; revision: number; label?: string; integrity?: DeviceAssetIntegrity }) {
  const [result, setResult] = useState<DeviceAssetCacheResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const manifest = JSON.stringify([...new Set(urls.filter(Boolean))].sort())
  const integrityManifest = JSON.stringify(integrity)
  useEffect(() => {
    let active = true
    setLoading(true)
    setResult(null)
    const assets = JSON.parse(manifest) as string[]
    void (online ? cacheDeviceAssets(assets, false, JSON.parse(integrityManifest)) : auditDeviceAssets(assets, JSON.parse(integrityManifest)))
      .then(value => { if (active) setResult(value) })
      .catch(() => { if (active) setResult({ expected: assets.length, cached: 0, failures: assets }) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [manifest, integrityManifest, online, revision, retry])
  const expected = (result?.expected ?? JSON.parse(manifest).length) + missingImages
  const cached = result?.cached ?? 0
  return <div className="artist-asset-status" role="status">
    <small>{loading ? (online ? `Saving ${label.toLowerCase()}` : `Checking saved ${label.toLowerCase()}`)
      : expected === 0 ? `No ${label.toLowerCase()} in this catalog`
      : cached === expected ? `${label} saved · ${cached}/${expected}`
      : `${label} incomplete · ${cached}/${expected}`}</small>
    {!loading && cached < expected && <>
      <small>{missingImages ? `${missingImages} product images unavailable. ` : ''}{cached < (result?.expected ?? 0) ? online ? 'Some images are not available offline yet.' : 'Reconnect to download missing images.' : ''}</small>
      {online && cached < (result?.expected ?? 0) && <button type="button" onClick={() => setRetry(value => value + 1)}>Retry image download</button>}
    </>}
  </div>
}
