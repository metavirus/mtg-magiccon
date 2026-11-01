import manifest from './atlantaMerchMediaManifest.json'

/** originalUrl is the faithful max-2000px detail derivative, not source-original bytes.
 * One source identity and media pack shared by both purchasing channels. */
export function atlantaMerchMedia(productKey: string) {
  const image = manifest.images.find(item => item.productKey === productKey)
  return image ? { thumbnailUrl: `./${image.thumbnail.path}`, originalUrl: `./${image.original.path}`, sourceUrl: image.sourceUrl } : null
}
export const atlantaMerchAssetIntegrity: Record<string, string> = Object.fromEntries(manifest.images.flatMap(image => [
  [`./${image.original.path}`, image.original.sha256],
  [`./${image.thumbnail.path}`, image.thumbnail.sha256],
]))
export const atlantaMerchAssetUrls = Object.keys(atlantaMerchAssetIntegrity)
export const atlantaMerchMissingImageCount = manifest.missingProductKeys.length
