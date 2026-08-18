import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SOURCE_ID = 'official-magiccon-atlanta-2026-ticketed-play'
const SOURCE_URL = 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule.html'
const OUT_DIR = path.resolve('research/precanon/ticketed-play')

const retrievedAt = new Date().toISOString()
const stamp = retrievedAt.slice(0, 10)

function cleanLines(text) {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function cleanTitle(title) {
  return title
    .replace(/^\s*SOLD\s+OUT\s*[-–—]\s*/i, '')
    .replace(/\s*\(click here for more info\)\s*$/i, '')
    .replace(/\s*[-–—]\s*\$\d+(?:\.\d{2})?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function priceFromTitle(title) {
  const match = title.match(/\$(\d+(?:\.\d{2})?)/)
  return match ? { amount: Number(match[1]), display: `$${match[1]}`, currency: 'USD' } : null
}

function availabilityFromTitle(title) {
  if (/^\s*SOLD\s+OUT\b/i.test(title)) return 'sold_out'
  if (/\bwait\s*list|waitlist\b/i.test(title)) return 'waitlist'
  return 'listed'
}

function inferDifficulty(text) {
  const haystack = text.toLowerCase()
  if (/\bcompetitive|qualifier|championship|pro tour|legacy|modern|standard|pauper\b/.test(haystack)) return 'competitive'
  if (/\bchallenging|mega-draft|collector booster sealed|deluxe sealed|full box\b/.test(haystack)) return 'challenging'
  if (/\bsocial|commander party|commander|cocktail|meet|hosted\b/.test(haystack)) return 'social'
  return 'unknown'
}

function inferFormat(title, body) {
  const titleText = title.toLowerCase()
  const haystack = `${title} ${body}`.toLowerCase()
  if (/\b2hg|two-headed\b/.test(titleText)) return 'two_headed_giant'
  if (/\bcommander\b/.test(titleText)) return 'commander'
  if (/\bleague\b/.test(titleText)) return 'league'
  if (/\bdraft\b/.test(titleText)) return 'draft'
  if (/\bsealed\b/.test(titleText)) return 'sealed'
  if (/\bconstructed|legacy|modern|standard|pauper\b/.test(titleText)) return 'constructed'
  if (/\bcommander\b/.test(haystack)) return 'commander'
  if (/\bleague\b/.test(haystack)) return 'league'
  if (/\bdraft\b/.test(haystack)) return 'draft'
  if (/\bsealed\b/.test(haystack)) return 'sealed'
  if (/\bconstructed|legacy|modern|standard|pauper\b/.test(haystack)) return 'constructed'
  return 'unknown'
}

function inferTimeKind(title, body) {
  const haystack = `${title} ${body}`.toLowerCase()
  if (/\bleague\b/.test(haystack)) return 'league_window'
  if (/\bcommander party\b/.test(haystack)) return 'optional_window'
  return 'fixed_block'
}

function inferExploreBucket(text) {
  const haystack = text.toLowerCase()
  if (/\bplay|sealed|draft|commander|2hg|two-headed|league|tournament|constructed|qualifier\b/.test(haystack)) return 'play'
  if (/\bpanel|preview|seminar|learn|info\b/.test(haystack)) return 'info'
  if (/\breception|party|meet\s*&\s*greet|meet and greet|social\b/.test(haystack)) return 'social'
  return 'other'
}

function extractFirst(lines, pattern) {
  return lines.find(line => pattern.test(line))
}

function hashObject(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function titleFromUrl(url) {
  const panelName = new URL(url).searchParams.get('panel-name')
  if (!panelName) return ''
  return panelName
    .replace(/-/g, ' ')
    .replace(/\bClick here for more info\b/i, '(Click here for more info)')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
  await page.goto(SOURCE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('a[href*="ticketed-play-information.html?gtID="]', { timeout: 30000 })

  const sourcePage = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    text: document.body.innerText,
    links: Array.from(document.querySelectorAll('a[href*="ticketed-play-information.html?gtID="]')).map(anchor => ({
      href: anchor.href,
      text: anchor.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    })),
  }))

  const uniqueLinks = Array.from(new Map(sourcePage.links.map(link => [new URL(link.href).searchParams.get('gtID') ?? link.href, link])).values())
  const detailPage = await browser.newPage({ viewport: { width: 1100, height: 1400 } })
  const events = []

  for (const [index, link] of uniqueLinks.entries()) {
    await detailPage.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await detailPage.waitForSelector('body', { timeout: 10000 })
    await detailPage.waitForFunction(() => {
      const text = document.body.innerText
      return /\$\d+/.test(text) || /TOURNAMENT DETAILS|PARTICIPATION DETAILS|PRIZES \(per player\)/i.test(text)
    }, { timeout: 30000 })
    const detail = await detailPage.evaluate(() => ({
      title: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || document.title,
      url: location.href,
      text: document.body.innerText,
      links: Array.from(document.querySelectorAll('a[href]')).map(anchor => ({
        href: anchor.href,
        text: anchor.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      })),
    }))
    const sourceEventKey = new URL(detail.url).searchParams.get('gtID') ?? `event-${index + 1}`
    const lines = cleanLines(detail.text)
    const rawTitle = [detail.title, link.text, titleFromUrl(detail.url)]
      .find(title => title && !/^event information$/i.test(title)) ?? titleFromUrl(detail.url)
    const allText = `${rawTitle}\n${detail.text}`
    const price = priceFromTitle(rawTitle)
    events.push({
      sourceId: SOURCE_ID,
      sourceEventKey,
      sourceUrl: detail.url,
      retrievedAt,
      rawTitle,
      rawLines: lines,
      rawDateLabel: extractFirst(lines, /\b(Fri|Sat|Sun),\s+Nov\s+\d{1,2},\s+2026\b/i),
      rawTimeLabel: extractFirst(lines, /\b\d{1,2}:\d{2}\s*(AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(AM|PM)\b/i),
      rawLocation: extractFirst(lines, /^Ticketed Play$/i),
      rawAvailability: availabilityFromTitle(rawTitle),
      rawPrice: price?.display,
      rawDetailText: detail.text,
      rawLinks: detail.links,
      normalizedDraft: {
        sourceEventKey,
        sourceUrl: detail.url,
        sourceTitle: rawTitle,
        title: cleanTitle(rawTitle),
        exploreBucket: inferExploreBucket(allText),
        kind: 'ticketed_play',
        playFormat: inferFormat(rawTitle, detail.text),
        difficulty: inferDifficulty(allText),
        timeKind: inferTimeKind(rawTitle, detail.text),
        availability: availabilityFromTitle(rawTitle),
        price,
        purchaseRequired: Boolean(price),
        purchaseStatus: 'none',
        canonicalStatus: 'precanon_draft',
      },
    })
    if ((index + 1) % 25 === 0 || index + 1 === uniqueLinks.length) {
      console.log(`PRECANON_TICKETED_PLAY: scraped ${index + 1}/${uniqueLinks.length}`)
    }
  }

  await browser.close()

  const rawSnapshot = {
    schemaVersion: 1,
    stage: 'precanon_raw',
    sourceId: SOURCE_ID,
    sourceUrl: SOURCE_URL,
    retrievedAt,
    sourcePage: {
      title: sourcePage.title,
      url: sourcePage.url,
      visibleTextHash: hashObject(sourcePage.text),
    },
    eventCount: events.length,
    events,
  }

  const normalizedDraft = {
    schemaVersion: 1,
    stage: 'precanon_normalized_draft',
    sourceId: SOURCE_ID,
    sourceUrl: SOURCE_URL,
    retrievedAt,
    eventCount: events.length,
    events: events.map(event => event.normalizedDraft),
  }

  const manifest = {
    schemaVersion: 1,
    sourceId: SOURCE_ID,
    sourceUrl: SOURCE_URL,
    retrievedAt,
    eventCount: events.length,
    rawSnapshot: `snapshots/${stamp}_ticketed-play-v1.raw.json`,
    normalizedDraft: `snapshots/${stamp}_ticketed-play-v1.normalized-draft.json`,
    rawHash: hashObject(rawSnapshot),
    normalizedHash: hashObject(normalizedDraft),
  }

  await mkdir(path.join(OUT_DIR, 'snapshots'), { recursive: true })
  await writeFile(path.join(OUT_DIR, 'snapshots', `${stamp}_ticketed-play-v1.raw.json`), `${JSON.stringify(rawSnapshot, null, 2)}\n`)
  await writeFile(path.join(OUT_DIR, 'snapshots', `${stamp}_ticketed-play-v1.normalized-draft.json`), `${JSON.stringify(normalizedDraft, null, 2)}\n`)
  await writeFile(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(`PRECANON_TICKETED_PLAY: wrote ${events.length} events`)
  console.log(`PRECANON_TICKETED_PLAY: rawHash ${manifest.rawHash}`)
  console.log(`PRECANON_TICKETED_PLAY: normalizedHash ${manifest.normalizedHash}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
