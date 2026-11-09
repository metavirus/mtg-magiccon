import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parsePrizeWallHtml, parsePrizeWallTextRows, prizeWallSemanticDigest, safeOfficialPrizeUrl } from './lib/prize_wall_ingestion.mjs'

export const SOURCE = 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html'
export const TARGET = 'public/prize-wall/current.json'
const WORK = '.codex-local/prize-wall-ingest'
const json = value => `${JSON.stringify(value, null, 2)}\n`
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const identity = name => name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const execute = promisify(execFile)

export async function recognizeListing(file) {
  const { stdout } = await execute(process.execPath, ['--use-system-ca', 'scripts/extract_prize_wall_image.mjs', file], { timeout: 90000, maxBuffer: 2 * 1024 * 1024 })
  return JSON.parse(stdout)
}

// Redirects are checked before requesting the destination; source content never
// controls filesystem paths or shell arguments.
export async function fetchOfficial(url, maxBytes = 2 * 1024 * 1024, fetcher = fetch) {
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!safeOfficialPrizeUrl(url)) throw Error('Unapproved official source URL')
    const response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(30000) })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel()
      url = new URL(response.headers.get('location'), url).href
      continue
    }
    if (!response.ok) throw Error(`Official source HTTP ${response.status}`)
    if (Number(response.headers.get('content-length')) > maxBytes) {
      await response.body?.cancel()
      throw Error('Official source exceeds byte limit')
    }
    const chunks = []
    let size = 0
    for await (const chunk of response.body) {
      size += chunk.length
      if (size > maxBytes) throw Error('Official source exceeds byte limit')
      chunks.push(chunk)
    }
    return { bytes: Buffer.concat(chunks), contentType: response.headers.get('content-type') ?? '', url }
  }
  throw Error('Too many official source redirects')
}

export async function preparePrizeWall({ fetchSource = fetchOfficial, readCurrent, retain, writeCandidate, recognizeImage, now = () => new Date().toISOString() }) {
  const previous = await readCurrent()
  const source = await fetchSource(SOURCE)
  if (!/text\/html/i.test(source.contentType)) throw Error('Prize Wall page is not HTML')
  await retain('source.html', source.bytes)
  const parsed = parsePrizeWallHtml(source.bytes.toString('utf8'), { sourceUrl: SOURCE, retrievedAt: now() })
  if (parsed.status !== 'ok') {
    await retain('parse-result.json', Buffer.from(json(parsed)))
    throw Error(`Prize Wall source needs repair: ${parsed.issues.map(issue => issue.code).join(', ')}`)
  }
  const snapshot = parsed.snapshot
  const issues = [...parsed.issues]
  const resources = []
  const goodLinks = []
  let resourceBytes = 0, ocrCount = 0
  for (const [index, link] of snapshot.catalogLinks.entries()) {
    try {
      if (index >= 60 || resourceBytes >= 64 * 1024 * 1024) throw Error('Resource budget reached')
      const resource = await fetchSource(link.url, 12 * 1024 * 1024)
      resourceBytes += resource.bytes.length
      const expected = { pdf: /application\/pdf/i, image: /image\/(png|jpeg|webp|gif|avif)/i, html: /text\/html/i }[link.format]
      if (!expected?.test(resource.contentType)) throw Error('Catalog resource content type mismatch')
      if (link.format === 'pdf' && !resource.bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw Error('Invalid PDF resource')
      const digest = sha(resource.bytes)
      const file = `catalog-${index}-${digest}.original`
      await retain(file, resource.bytes)
      resources.push({ url: link.url, sha256: digest, bytes: resource.bytes.length, contentType: resource.contentType })
      goodLinks.push(link)
      const associated = link.name && snapshot.prices.find(row => identity(row.name) === identity(link.name))
      if (associated && link.format === 'image') associated.imageUrl = link.url
      if (link.format === 'image' && !associated && recognizeImage && ocrCount++ < 6) {
        try {
          const ocr = await recognizeImage(file)
          await retain(`ocr-${index}.json`, Buffer.from(json(ocr)))
          const extracted = parsePrizeWallTextRows(ocr.text)
          issues.push(...extracted.issues.map(issue => ({ ...issue, url: link.url })))
          if (ocr.rejectedLineCount) issues.push({ code: 'image-lines-unreadable', url: link.url })
          for (const row of extracted.prices) {
            const existing = snapshot.prices.find(item => identity(item.name) === identity(row.name))
            if (existing) {
              if (existing.tix !== row.tix) issues.push({ code: 'image-price-conflict', name: row.name, url: link.url })
              continue
            }
            snapshot.prices.push({ ...row, evidence: { ...row.evidence, sourceUrl: link.url, sourceSha256: digest, method: 'ocr' } })
          }
          if (extracted.prices.length) link.ingestion = 'ocr'
        } catch (error) { issues.push({ code: 'image-extraction-unavailable', url: link.url, reason: error.message.slice(0, 200) }) }
      }
    } catch (error) {
      issues.push({ code: 'resource-unavailable', url: link.url, reason: error.message })
      const prior = previous?.catalogLinks?.find(item => item.url === link.url)
      if (prior) goodLinks.push(prior)
    }
  }
  snapshot.catalogLinks = goodLinks
  snapshot.extractionComplete = snapshot.extractionComplete && issues.length === 0
  if (!snapshot.extractionComplete) {
    const names = new Set(snapshot.prices.map(row => identity(row.name)))
    for (const old of previous?.prices ?? []) if (!names.has(identity(old.name))) snapshot.prices.push({ ...old, retained: true })
  }
  if (!snapshot.prices.length && !snapshot.catalogLinks.length) throw Error('No usable Prize Wall content; retaining published data')
  snapshot.semanticSha256 = prizeWallSemanticDigest(snapshot)
  // Resource replacement at the same URL is a material update too.
  snapshot.catalogResourceSha256 = sha(json(resources))
  const changed = previous?.semanticSha256 !== snapshot.semanticSha256 || previous?.catalogResourceSha256 !== snapshot.catalogResourceSha256
  await retain('candidate.json', Buffer.from(json(snapshot)))
  if (changed) await writeCandidate(snapshot)
  return { status: changed ? 'updated' : 'unchanged', changed, sourceSha256: snapshot.sourceSha256,
    semanticSha256: snapshot.semanticSha256, catalogResourceSha256: snapshot.catalogResourceSha256,
    priceCount: snapshot.prices.length, resources, issues, checkedAt: now() }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.some(arg => arg !== '--prepare')) throw Error('Only --prepare is supported; publication belongs to the cloud workflow')
  await fs.mkdir(WORK, { recursive: true })
  try {
    const receipt = await preparePrizeWall({
      readCurrent: async () => { try { return JSON.parse(await fs.readFile(TARGET, 'utf8')) } catch (error) { if (error.code === 'ENOENT') return null; throw error } },
      retain: (name, bytes) => fs.writeFile(path.join(WORK, name), bytes),
      recognizeImage: name => recognizeListing(path.join(WORK, name)),
      writeCandidate: async snapshot => { await fs.mkdir(path.dirname(TARGET), { recursive: true }); await fs.writeFile(TARGET, json(snapshot)) },
    })
    await fs.writeFile(path.join(WORK, 'receipt.json'), json(receipt))
    if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `changed=${receipt.changed}\n`)
    console.log(`Prize Wall: ${receipt.status}; ${receipt.priceCount} prices; ${receipt.resources.length} catalog resources`)
    for (const issue of receipt.issues) console.log(`::warning title=Prize Wall item retained::${issue.code}`)
  } catch (error) {
    await fs.writeFile(path.join(WORK, 'receipt.json'), json({ status: 'blocked', checkedAt: new Date().toISOString(), reason: error.message }))
    throw error
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main()
