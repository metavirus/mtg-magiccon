import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [urlValue, outputValue] = process.argv.slice(2)
if (!urlValue || !outputValue) throw new Error('Usage: catalog_fetch_exact_image.mjs <https-url> <.codex-local-output>')
const url = new URL(urlValue)
if (url.protocol !== 'https:') throw new Error('Exact-match product images must use HTTPS')
const output = path.resolve(outputValue)
const allowedRoot = path.resolve('.codex-local') + path.sep
if (!output.startsWith(allowedRoot)) throw new Error('Exact-match downloads must stay under .codex-local')

const response = await fetch(url, { headers: { 'user-agent': 'mtg-magiccon-catalog-review/1.0' } })
if (!response.ok) throw new Error(`Image fetch failed with HTTP ${response.status}`)
const contentType = response.headers.get('content-type')?.split(';')[0] ?? ''
if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) throw new Error(`Unexpected image content type: ${contentType}`)
const bytes = Buffer.from(await response.arrayBuffer())
if (bytes.length < 1024) throw new Error('Fetched image is implausibly small')
await mkdir(path.dirname(output), { recursive: true })
await writeFile(output, bytes, { flag: 'wx' })
console.log(JSON.stringify({
  output,
  source_url: url.href,
  content_type: contentType,
  byte_size: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
}, null, 2))
