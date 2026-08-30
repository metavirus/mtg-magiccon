import path from 'node:path'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { catalogBrowserPreviewModel } from './catalogPreview'

describe('catalog QA presentation assets', () => {
  it('uses square images with real transparency for every preview offer', async () => {
    expect(catalogBrowserPreviewModel.offers).toHaveLength(17)

    for (const offer of catalogBrowserPreviewModel.offers) {
      expect(offer.presentationUrl, offer.product_name).toMatch(/^\/catalog-qa\/.*-transparent\.webp$/)
      const assetPath = path.join(process.cwd(), 'public', offer.presentationUrl!.replace(/^\//, ''))
      const image = sharp(assetPath)
      const metadata = await image.metadata()

      expect(metadata.width, offer.product_name).toBe(640)
      expect(metadata.height, offer.product_name).toBe(640)
      expect(metadata.hasAlpha, offer.product_name).toBe(true)

      const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      let minimumAlpha = 255
      for (let index = 3; index < data.length; index += info.channels) minimumAlpha = Math.min(minimumAlpha, data[index])
      expect(minimumAlpha, `${offer.product_name} must not retain an opaque removable matte`).toBe(0)
    }
  })
})
