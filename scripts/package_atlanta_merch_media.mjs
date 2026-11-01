import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import sharp from 'sharp'
const sourcePath = 'research/merchandise/2026-10-31/normalized-merch-review.json'
const sourceBytes = await readFile(sourcePath)
const source = JSON.parse(sourceBytes)
const root = 'public/merchandise/atlanta-2026'
await mkdir(root, { recursive: true })
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const archiveRoot = '.codex-local/merchandise/atlanta-2026-originals'
await mkdir(archiveRoot, { recursive: true })
const images = []
let totalBytes = 0
for (const product of source.products) for (const image of product.images) {
  const url = new URL(image.url)
  if (url.protocol !== 'https:' || url.hostname !== 'cdn.shopify.com') throw new Error('Unexpected source host')
  const key = sha(Buffer.from(image.url)).slice(0, 20)
  const originalPath = `${archiveRoot}/${key}.png`
  let bytes
  try { bytes = await readFile(originalPath) } catch {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Invalid source image ${response.status}`)
    bytes = Buffer.from(await response.arrayBuffer())
  }
  totalBytes += bytes.length
  if (totalBytes > 200 * 1024 * 1024 || bytes.length > 15 * 1024 * 1024) throw new Error('Bounded media budget exceeded')
  const metadata = await sharp(bytes).metadata()
  if (metadata.format !== 'png' || !metadata.width || !metadata.height) throw new Error('Expected original PNG')
  // Decode the complete image, not only its header, before accepting original bytes.
  const thumb = await sharp(bytes).resize(320, 320, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
  await writeFile(originalPath, bytes)
  const detail = await sharp(bytes).resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toBuffer()
  const detailMetadata = await sharp(detail).metadata()
  const detailPath = `${root}/${key}-detail.webp`
  await writeFile(detailPath, detail)
  const thumbPath = `${root}/${key}-thumb.webp`
  await writeFile(thumbPath, thumb)
  images.push({ productKey: product.productKey, sourceUrl: image.url, sourceOriginal: { archivePath: originalPath, sha256: sha(bytes), bytes: bytes.length, width: metadata.width, height: metadata.height }, original: { role: 'detail-derivative', path: detailPath.replace('public/', ''), sha256: sha(detail), bytes: detail.length, width: detailMetadata.width, height: detailMetadata.height }, thumbnail: { path: thumbPath.replace('public/', ''), sha256: sha(thumb), bytes: thumb.length } })
}
const packagedBytes = images.reduce((n, image) => n + image.original.bytes + image.thumbnail.bytes, 0)
if (packagedBytes > 20 * 1024 * 1024) throw new Error('Device pack exceeds 20 MiB budget')
const manifest = { detailPolicy: 'Faithful WebP quality 90, maximum 2000px, no upscaling. Exact originals archived locally; source URLs retained for online originals.', packagedBytes, sourcePath, sourceSha256: sha(sourceBytes), generatedAt: new Date().toISOString(), images, missingProductKeys: source.products.filter(p => !p.images.length).map(p => p.productKey) }
await writeFile('src/lib/atlantaMerchMediaManifest.json', JSON.stringify(manifest, null, 2) + '\n')
console.log(JSON.stringify({ originals: images.length, archivedOriginalBytes: totalBytes, packagedBytes, thumbnailBytes: images.reduce((n,i) => n + i.thumbnail.bytes, 0), missing: manifest.missingProductKeys.length }))
