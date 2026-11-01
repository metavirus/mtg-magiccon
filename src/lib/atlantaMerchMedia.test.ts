import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import manifest from './atlantaMerchMediaManifest.json'
import data from '../../research/merchandise/2026-10-31/normalized-merch-review.json'
import { atlantaMerchAssetUrls, atlantaMerchMedia, atlantaMerchMissingImageCount } from './atlantaMerchMedia'

describe('Atlanta merchandise exact media package', () => {
  it('covers all source images once, retains original provenance and bounded detail derivatives, and retains missing identities honestly', () => {
    expect(manifest.images).toHaveLength(60)
    expect(atlantaMerchAssetUrls).toHaveLength(120)
    expect(manifest.packagedBytes).toBeLessThan(20 * 1024 * 1024)
    expect(manifest.images.every(image => image.original.width <= 2000 && image.original.height <= 2000 && image.original.width <= image.sourceOriginal.width && image.original.height <= image.sourceOriginal.height)).toBe(true)
    expect(atlantaMerchMissingImageCount).toBe(2)
    const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
    expect(sha(readFileSync(manifest.sourcePath))).toBe(manifest.sourceSha256)
    for (const product of data.products) {
      const entries = manifest.images.filter(image => image.productKey === product.productKey)
      expect(entries.map(image => image.sourceUrl)).toEqual(product.images.map(image => image.url))
      if (!entries.length) expect(atlantaMerchMedia(product.productKey)).toBeNull()
      for (const entry of entries) for (const asset of [entry.original, entry.thumbnail]) {
        const bytes = readFileSync(`public/${asset.path}`)
        expect(bytes.length).toBe(asset.bytes)
        expect(sha(bytes)).toBe(asset.sha256)
      }
    }
  })
})
