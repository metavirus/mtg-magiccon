import { createHash } from 'node:crypto'
import { JSDOM } from 'jsdom'

const hash = value => createHash('sha256').update(value).digest('hex')
const compact = value => String(value ?? '').replace(/\s+/g, ' ').trim()

export function pageContentFingerprint(html, baseUrl) {
  const document = new JSDOM(html).window.document
  const main = document.querySelector('#main, main')
  // A missing/empty content region is not permission to ignore the page.
  const region = main && compact(main.textContent).length >= 40 ? main : document.body
  const clone = region.cloneNode(true)
  clone.querySelectorAll('script,style,noscript,template').forEach(node => node.remove())
  const text = compact(clone.textContent)
  const links = [...clone.querySelectorAll('a[href]')].flatMap(node => {
    try {
      const url = new URL(node.getAttribute('href'), baseUrl)
      if (!['https:', 'http:'].includes(url.protocol)) return []
      url.hash = ''
      return [{ url: url.toString(), label: compact(node.textContent).slice(0, 120) }]
    } catch { return [] }
  }).sort((a, b) => `${a.url}|${a.label}`.localeCompare(`${b.url}|${b.label}`))
  const media = [...clone.querySelectorAll('img[alt]')].flatMap(node => {
    const alt = compact(node.getAttribute('alt'))
    if (!alt) return []
    try { return [`${alt}|${new URL(node.getAttribute('src') ?? '', baseUrl).toString()}`] }
    catch { return [alt] }
  }).sort()
  return {
    contentHash: hash(JSON.stringify({ text, media })),
    contentLinkHash: hash(links.map(link => `${link.label}|${link.url}`).join('\n')),
    contentSample: text.slice(0, 12000),
    contentLinks: links,
    contentRegion: region === main ? 'main' : 'body_fallback',
  }
}

export function watchedPageChanged(previous, current) {
  if (!previous) return false
  if (!previous.contentHash || !previous.contentLinkHash) {
    return previous.textHash !== current.textHash || previous.linkHash !== current.linkHash || previous.status !== current.status
  }
  return previous.contentHash !== current.contentHash || previous.contentLinkHash !== current.contentLinkHash || previous.status !== current.status
}

export function upgradeUnchangedPageBaseline(previous, current) {
  if (!previous || (previous.contentHash && previous.contentLinkHash) || watchedPageChanged(previous, current)) return previous
  return {
    ...previous,
    contentHash: current.contentHash,
    contentLinkHash: current.contentLinkHash,
    contentSample: current.contentSample,
    contentLinks: current.contentLinks,
    contentRegion: current.contentRegion,
  }
}
