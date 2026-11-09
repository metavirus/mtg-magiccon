import { createHash } from 'node:crypto'
import { JSDOM } from 'jsdom'

export const PRIZE_WALL_SOURCE_URL = 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html'
const hosts = new Set(['mcatlanta.mtgfestivals.com', 'www.mtgfestivals.com', 'mtgfestivals.com'])
const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim()
const identity = value => normalize(value).toLowerCase().replace(/[‘’'“”"]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const hash = value => createHash('sha256').update(value).digest('hex')

/** Only explicitly allowed first-party HTTPS destinations; no credentials or alternate ports. */
export function safeOfficialPrizeUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.username || url.password || url.port) return null
    url.hash = ''
    return url.href
  } catch { return null }
}

export function prizeWallSemanticDigest(snapshot) {
  return hash(JSON.stringify({
    schemaVersion: snapshot.schemaVersion, event: snapshot.event, sourceUrl: snapshot.sourceUrl, extractionComplete: snapshot.extractionComplete,
    prices: snapshot.prices.map(({ name, tix, qualifier, imageUrl, retained, retainedFromPrior }) => ({ name, tix, qualifier, imageUrl, retained, retainedFromPrior })),
    optionalItems: snapshot.optionalItems,
    operationalDetails: snapshot.operationalDetails.map(({ text }) => text),
    catalogLinks: snapshot.catalogLinks.map(({ label, url, format, ingestion, use, name }) => ({ label, url, format, ingestion, use, name })),
  }))
}

/** OCR/HTML line recognition only. The caller owns image evidence and OCR confidence. */
export function parsePrizeWallTextRows(text) {
  const prices = [], issues = [], seen = new Map(), conflicts = new Set()
  const rawLines = String(text ?? '').split(/\r?\n/)
  const isHeader = line => /^(?:(?:item|product|prize|name)\s+)?(?:prize\s+)?tix\s*:?$/i.test(normalize(line))
  const hasTixHeader = rawLines.some(isHeader)
  const amount = '(?:[1-9]\\d{0,2}(?:,\\d{3})+|[1-9]\\d*)'
  const standaloneAmount = new RegExp(`^${amount}\\s+(?:Prize\\s+)?Tix[.!]?$`, 'i')
  const headerRow = new RegExp(`^([^\\d$€£]+?)\\s+(${amount})$`)
  const productName = line => line.length > 1 && line.length <= 120 && /[a-z]/i.test(line) && !/[\d$€£:?!;.]|\btix\b/i.test(line) && !/^(?:item|product|prize|name|price|cost|total|note|available|starting|from|and more)$/i.test(line)
  const rows = []
  for (let index = 0; index < rawLines.length; index++) {
    const rawLine = rawLines[index], line = normalize(rawLine)
    if (!line || isHeader(line)) continue
    const next = normalize(rawLines[index + 1])
    if (productName(line) && standaloneAmount.test(next)) {
      rows.push({ line: `${line} ${next}`, rawLine: `${rawLine}\n${rawLines[++index]}` })
      continue
    }
    if (hasTixHeader && !/\btix\b/i.test(line)) {
      const match = line.match(headerRow)
      if (match && productName(normalize(match[1]))) rows.push({ line: `${line} Prize Tix`, rawLine })
      else if (/\d/.test(line)) issues.push({ code: 'ambiguous-tix-table-row', text: rawLine })
      continue
    }
    rows.push({ line, rawLine })
  }
  for (const { line, rawLine } of rows) {
    if (!line || !/\btix\b/i.test(line)) continue
    const match = line.match(/^(.+?)\s*(?:(starting\s+(?:at|from))\s*|[:–—-]\s*|\s+)((?:[1-9]\d{0,2}(?:,\d{3})+)|(?:[1-9]\d*))\s+(?:Prize\s+)?Tix[.!]?$/i)
    if (!match || /[$€£]|\btix\b|\bstarting\b|\bfrom\b|\bat least\b|[:–—-]$|\d\s*(?:or|\/|[-–—])\s*$/i.test(match?.[1] ?? '') || (line.match(/\btix\b/gi) ?? []).length !== 1) {
      issues.push({ code: 'unparsed-tix-line', text: rawLine }); continue
    }
    const name = normalize(match[1]), tix = Number(match[3].replaceAll(',', '')), qualifier = match[2] ? 'starting' : 'exact'
    if (!Number.isSafeInteger(tix)) { issues.push({ code: 'invalid-tix', text: rawLine }); continue }
    const key = identity(name)
    if (conflicts.has(key)) continue
    if (seen.has(key)) {
      const previous = seen.get(key)
      if (previous.tix === tix && previous.qualifier === qualifier) continue
      prices.splice(prices.indexOf(previous), 1)
      conflicts.add(key)
      issues.push({ code: 'conflicting-price', text: rawLine, name })
      continue
    }
    const row = { name, tix, qualifier, evidence: { text: rawLine } }
    prices.push(row)
    seen.set(key, row)
  }
  return { prices, issues, extractionComplete: issues.length === 0 }
}

function selectorFor(element, main) {
  if (element === main) return main.id === 'main' ? '#main' : main.tagName.toLowerCase()
  const siblings = [...element.parentElement.children].filter(node => node.tagName === element.tagName)
  return `${selectorFor(element.parentElement, main)} > ${element.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(element) + 1})`
}

// Block boundaries separate lines, while inline emphasis and link text remain intact.
function sourceLines(main) {
  const lines = []
  let buffer = '', owner = main
  const flush = () => {
    const text = normalize(buffer)
    if (text) lines.push({ text, element: owner, evidence: { text, selector: selectorFor(owner, main) } })
    buffer = ''
  }
  function walk(node) {
    if (node.nodeType === 3) { buffer += node.textContent; return }
    if (node.nodeType !== 1 || node.matches('script,style,link,noscript,template,nav,[hidden],[aria-hidden="true"]')) return
    const block = /^(DIV|SECTION|ARTICLE|P|LI|UL|OL|H[1-6]|TR|BR)$/.test(node.tagName)
    if (block) { flush(); owner = node }
    if (node.tagName === 'TD' || node.tagName === 'TH') buffer += ' '
    for (const child of node.childNodes) walk(child)
    if (block) { flush(); owner = node.parentElement ?? main }
  }
  walk(main)
  flush()
  return lines
}

const baselineNames = ['Play Boosters', 'Collector Boosters', 'Commander Precons', 'Bundles', '12” x 17” ‘Jumbo’ Cards', "23” x 32” 'Oversized’ Cards", 'Uncut Sheets']
const informationalTix = [
  /^Prizes, Prize Tix,? & the Prize Wall!$/i,
  /^What are Prize Tix and How Do I Get Them\?$/i,
  /^Prize Tix are awarded by participating in scheduled & on demand Magic Ticketed Play events that can later be redeemed at the Prize Wall for amazing items! Prize Tix payouts are listed in the description of each play event\.$/i,
  /^Prize Tix have no cash value\. Prize Tix are only valid for the duration of the MagicCon they were issued at and cannot be saved for or redeemed at future MagicCon events\. All Prizes and Prize Tix costs are subject to change, and allocation is based on availability\. Some limitations may apply\.$/i,
]

/** Pure parser: never fetches, mutates prior data, or claims PDF/image contents were read. */
export function parsePrizeWallHtml(html, { sourceUrl = PRIZE_WALL_SOURCE_URL, retrievedAt } = {}) {
  const sourceSha256 = hash(typeof html === 'string' ? html : '')
  const issues = []
  const block = () => ({ status: 'blocked', sourceUrl, sourceSha256, issues })
  if (sourceUrl !== PRIZE_WALL_SOURCE_URL) issues.push({ code: 'wrong-source-url' })
  if (typeof html !== 'string' || !html.trim()) issues.push({ code: 'empty-source' })
  if (issues.length) return block()
  const dom = new JSDOM(html)
  try {
    const document = dom.window.document
    const mains = [...document.querySelectorAll('#main,main,[role="main"]')]
    if (mains.length !== 1) { issues.push({ code: 'missing-or-ambiguous-main' }); return block() }
    const main = mains[0]
    const description = document.querySelector('meta[name="description"]')?.content ?? ''
    const showInfo = [...document.querySelectorAll('.show-info-mega__element,.footer-show-info__content')].map(node => normalize(node.textContent))
    if (!/MagicCon\s*:?\s*Atlanta\b/i.test(description) || !showInfo.some(text => /^Atlanta\s*,?\s*GA$/i.test(text))) issues.push({ code: 'wrong-event' })
    const dates = showInfo.filter(text => /\b20\d{2}\b/.test(text))
    if (!dates.length || dates.some(text => [...text.matchAll(/\b20\d{2}\b/g)].some(match => match[0] !== '2026'))) issues.push({ code: 'wrong-event-year' })
    const canonical = document.querySelector('link[rel="canonical"],meta[property="og:url"]')
    if (canonical && (canonical.getAttribute('href') ?? canonical.getAttribute('content')) !== sourceUrl) issues.push({ code: 'conflicting-page-identity' })
    if (issues.length) return block()

    const prices = [], optionalItems = [], operationalDetails = [], catalogLinks = []
    const seen = new Map(), conflicts = new Set()
    let optional = false
    const lines = sourceLines(main)
    for (const { text, element, evidence } of lines) {
      if (/Other products may include\s*:?$/i.test(text)) { optional = true; continue }
      if (optional && element.tagName === 'LI' && !/\btix\b/i.test(text)) {
        if (!/^AND MORE!$/i.test(text)) optionalItems.push(text)
        continue
      }
      optional = false
      if (/^(?:The Prize Wall is located inside |Friday and Saturday: |Sunday: |NOTE: You must be in line by )/.test(text)) operationalDetails.push({ text, evidence })
      if (!/\btix\b/i.test(text)) continue
      if (informationalTix.some(pattern => pattern.test(text)) || (!/\d/.test(text) && (/^H[1-6]$/.test(element.tagName) || /^Prize Tix (?:are|have)\b/i.test(text)))) continue
      const parsed = parsePrizeWallTextRows(text)
      if (!parsed.prices.length) { issues.push(...parsed.issues); continue }
      const { name, tix, qualifier } = parsed.prices[0]
      const key = identity(name)
      if (conflicts.has(key)) continue
      if (seen.has(key)) {
        const previous = seen.get(key)
        if (previous.tix === tix && previous.qualifier === qualifier) continue
        issues.push({ code: 'conflicting-price', text, name })
        prices.splice(prices.indexOf(previous), 1)
        conflicts.add(key)
        continue
      }
      prices.push({ name, tix, qualifier, evidence })
      seen.set(key, prices.at(-1))
    }
    // The known category list is atomic: a dropped/malformed bullet must not silently shrink it.
    const baselinePresent = baselineNames.filter(name => seen.has(identity(name)))
    if (baselinePresent.length && baselinePresent.length !== baselineNames.length) issues.push({ code: 'partial-category-list' })
    for (const anchor of main.querySelectorAll('a[href]')) {
      const label = normalize(anchor.textContent || anchor.querySelector('img')?.alt)
      const href = anchor.getAttribute('href')
      if (!/(?:catalog|catalogue|prize[ -]?(?:wall|list|guide)|full list of prizes)/i.test(`${label} ${href}`)) continue
      let resolved
      try { resolved = new URL(href, sourceUrl).href } catch { resolved = '' }
      const url = safeOfficialPrizeUrl(resolved)
      if (!url) { issues.push({ code: 'unsafe-catalog-link', text: href }); continue }
      if (url === sourceUrl || catalogLinks.some(link => link.url === url)) continue
      const pathname = new URL(url).pathname
      const format = /\.pdf(?:\/|$)/i.test(pathname) ? 'pdf' : /\.(?:png|jpe?g|webp|gif|avif)(?:\/|$)/i.test(pathname) ? 'image' : 'html'
      catalogLinks.push({ label: label || 'Official prize catalog', url, format, ingestion: 'link-only', use: 'catalog', evidence: { text: label, selector: selectorFor(anchor, main) } })
    }
    let inInventory = false
    for (const element of main.querySelectorAll('h1,h2,h3,img,[data-rx-params-imageresponsive]')) {
      if (/^H[1-3]$/.test(element.tagName)) {
        if (/avail\w*.*prize wall|prize (?:catalog|list|inventory)/i.test(element.textContent)) inInventory = true
        else if (element.tagName !== 'H3') inInventory = false
        continue
      }
      const row = element.closest('li,tr')
      const rowPrices = row ? parsePrizeWallTextRows(normalize(row.textContent)).prices : []
      if (!inInventory && rowPrices.length !== 1) continue
      let responsiveImage
      const responsiveConfig = element.getAttribute('data-rx-params-imageresponsive')
      if (responsiveConfig) {
        try {
          if (responsiveConfig.length > 16384) throw new Error('oversized-config')
          const config = JSON.parse(responsiveConfig)
          if (typeof config.defaultImg !== 'string' || typeof config.basePath !== 'string') throw new Error('missing-image-path')
          responsiveImage = { href: config.defaultImg.replaceAll('{base}', config.basePath), label: typeof config.altText === 'string' ? config.altText : '' }
        } catch {
          issues.push({ code: 'unparsed-listing-image-config', text: 'Invalid responsive image configuration' })
          continue
        }
      }
      const href = responsiveImage?.href || element.getAttribute('src') || element.getAttribute('data-src')
      if (!href) continue
      let resolved
      try { resolved = new URL(href, sourceUrl).href } catch { resolved = '' }
      const url = safeOfficialPrizeUrl(resolved)
      if (!url) { issues.push({ code: 'unsafe-listing-image', text: href }); continue }
      if (catalogLinks.some(link => link.url === url)) continue
      const label = normalize(responsiveImage?.label || element.getAttribute('alt')) || 'Prize listing image'
      if (/logo|icon|banner|hero|decorative/i.test(label)) continue
      catalogLinks.push({ label, url, format: 'image', ingestion: 'link-only', use: 'listing', ...(rowPrices.length === 1 ? { name: rowPrices[0].name } : {}), evidence: { text: normalize(row?.textContent) || label, selector: selectorFor(element, main) } })
    }
    if (!prices.length && !catalogLinks.length) { issues.push({ code: 'no-usable-content' }); return block() }
    const snapshot = { schemaVersion: 1, event: 'magiccon-atlanta-2026', sourceUrl, sourceSha256, retrievedAt, extractionComplete: issues.length === 0, prices, optionalItems, operationalDetails, catalogLinks }
    snapshot.semanticSha256 = prizeWallSemanticDigest(snapshot)
    return { status: 'ok', snapshot, issues }
  } finally { dom.window.close() }
}
