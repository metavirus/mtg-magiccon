import { describe, expect, it } from 'vitest'
import { pageContentFingerprint, upgradeUnchangedPageBaseline, watchedPageChanged } from './monitoring_page_fingerprint.mjs'

const url = 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html'
const page = (nav: string, text: string, footer = 'Privacy', link = '/en-us/magic-play/prize-wall.html') => `<!doctype html><html><body><header><nav>${nav}</nav></header><div id="main"><h1>Prize Wall</h1><p>${text}</p><a href="${link}">Prize details</a></div><footer>${footer}</footer></body></html>`

describe('substantive watched-page fingerprint', () => {
  it('ignores navigation and footer churn but catches changed Prize Tix facts and content links', () => {
    const before = pageContentFingerprint(page('Buy badges', 'Play Boosters start at 500 Prize Tix'), url)
    const chrome = pageContentFingerprint(page('Buy badges — now', 'Play Boosters start at 500 Prize Tix', 'New footer'), url)
    const fact = pageContentFingerprint(page('Buy badges', 'Play Boosters start at 600 Prize Tix'), url)
    const link = pageContentFingerprint(page('Buy badges', 'Play Boosters start at 500 Prize Tix', 'Privacy', '/en-us/magic-play/new-prizes.html'), url)
    expect(before.contentRegion).toBe('main')
    expect(chrome.contentHash).toBe(before.contentHash)
    expect(chrome.contentLinkHash).toBe(before.contentLinkHash)
    expect(fact.contentHash).not.toBe(before.contentHash)
    expect(link.contentLinkHash).not.toBe(before.contentLinkHash)
  })

  it('falls back to body rather than silently ignoring a page with no main container', () => {
    const result = pageContentFingerprint('<html><body><h1>New venue policy</h1><p>The show opens at 9 AM on Friday.</p></body></html>', url)
    expect(result.contentRegion).toBe('body_fallback')
    expect(result.contentSample).toContain('9 AM')
  })

  it('upgrades an unchanged legacy baseline without claiming a new event', () => {
    const current = { ...pageContentFingerprint(page('Buy badges', 'Play Boosters start at 500 Prize Tix'), url), textHash: 'raw-text', linkHash: 'raw-links', status: 200 }
    const legacy = { textHash: 'raw-text', linkHash: 'raw-links', status: 200, acceptedAt: 'yesterday' }
    expect(watchedPageChanged(legacy, current)).toBe(false)
    const upgraded = upgradeUnchangedPageBaseline(legacy, current)
    expect(upgraded.acceptedAt).toBe('yesterday')
    expect(watchedPageChanged(upgraded, { ...current, textHash: 'new navigation', linkHash: 'new footer' })).toBe(false)
    expect(watchedPageChanged(upgraded, { ...current, contentHash: 'changed fact' })).toBe(true)
    expect(upgradeUnchangedPageBaseline({ ...legacy, textHash: 'different raw page' }, current)).not.toHaveProperty('contentHash')
  })
})
