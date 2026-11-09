import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { parsePrizeWallHtml, parsePrizeWallTextRows, prizeWallSemanticDigest, PRIZE_WALL_SOURCE_URL, safeOfficialPrizeUrl } from './prize_wall_ingestion.mjs'

const fixture = readFileSync('scripts/fixtures/prize-wall.html', 'utf8')
const parse = (html = fixture, retrievedAt = '2026-11-09T00:00:00Z') => parsePrizeWallHtml(html, { sourceUrl: PRIZE_WALL_SOURCE_URL, retrievedAt })
const append = (content: string) => fixture.replace('<h1', `${content}<h1`)
const partial = (html: string, code: string) => {
  const result = parse(html)
  expect(result.status).toBe('ok')
  expect(result.snapshot.extractionComplete).toBe(false)
  expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code })]))
}
const blocked = (html: string, code: string) => {
  const result = parse(html)
  expect(result.status).toBe('blocked')
  expect(result.snapshot).toBeUndefined()
  expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code })]))
}

describe('official Prize Wall HTML ingestion', () => {
  it('extracts seven source-backed starting costs and only explicit optional items and operations', () => {
    const result = parse()
    expect(result.status).toBe('ok')
    const snapshot = result.snapshot
    expect(snapshot.schemaVersion).toBe(1)
    expect(snapshot.prices.map((row: { tix: number }) => row.tix)).toEqual([500, 2500, 5000, 6000, 20000, 40000, 50000])
    expect(snapshot.prices.every((row: { qualifier: string }) => row.qualifier === 'starting')).toBe(true)
    expect(snapshot.optionalItems).toEqual(['Deck Boxes & Sleeves', 'Playmats', 'Dice', 'Secret Lairs', 'Cool Magic Related Items'])
    expect(snapshot.operationalDetails.map((row: { text: string }) => row.text)).toEqual([
      'The Prize Wall is located inside the Magic Ticketed Play Area',
      'Friday and Saturday: 10:00 AM to 11:59 PM',
      'Sunday: 10:00 AM – 6:00 PM',
      'NOTE: You must be in line by 5:30 PM on Sunday',
    ])
    const dom = new JSDOM(fixture)
    for (const row of snapshot.prices) expect(dom.window.document.querySelector(row.evidence.selector)?.textContent).toBe(row.evidence.text)
    dom.window.close()
    expect(snapshot.catalogLinks).toEqual([])
    expect(snapshot.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
  })
  it('accepts changed costs and new exact item lines without inventing inventory', () => {
    const result = parse(append('<p>Example Playmat: 7,000 Prize Tix</p>').replace('starting at 500 Prize', 'starting at 750 Prize'))
    expect(result.status).toBe('ok')
    expect(result.snapshot.prices[0]).toMatchObject({ name: 'Example Playmat', tix: 7000, qualifier: 'exact' })
    expect(result.snapshot.prices[1].tix).toBe(750)
    expect(result.snapshot.semanticSha256).not.toBe(parse().snapshot.semanticSha256)
  })
  it('keeps semantics stable across timestamps, raw shell changes, and inline formatting', () => {
    const original = parse().snapshot
    const changed = parse(fixture.replace('Play Boosters starting', '<strong>Play Boosters</strong> starting') + '\n<!-- shell changed -->', '2026-11-10T00:00:00Z').snapshot
    expect(changed.sourceSha256).not.toBe(original.sourceSha256)
    expect(changed.semanticSha256).toBe(original.semanticSha256)
  })
  it('ignores prizes and unsafe links outside the content region', () => {
    expect(parse(fixture.replace('</body>', '<footer>Fake: 42 Tix <a href="javascript:alert(1)">Prize catalog</a></footer></body>')).snapshot.prices).toHaveLength(7)
  })
  it.each([
    ['<p>New prize is roughly 200 Tix or 500 Tix</p>', 'unparsed-tix-line'],
    ['<p>Play Boosters: 700 Prize Tix</p>', 'conflicting-price'],
    ['<p>Playmat: 2,50 Prize Tix</p>', 'unparsed-tix-line'],
    ['<p>Playmat: -200 Prize Tix</p>', 'unparsed-tix-line'],
    ['<p>Playmat: 0 Prize Tix</p>', 'unparsed-tix-line'],
    ['<p>Playmat: 1.5 Prize Tix</p>', 'unparsed-tix-line'],
    ['<p>Playmat: many Prize Tix</p>', 'unparsed-tix-line'],
    ['<p>Playmat: 999999999999999999999 Prize Tix</p>', 'invalid-tix'],
  ])('keeps good rows while flagging ambiguous lines: %s', (line, code) => partial(append(line), code))
  it('blocks partial extraction and empty content', () => {
    partial(fixture.replace('<li>Play Boosters starting at 500 Prize Tix</li>', ''), 'partial-category-list')
    partial(fixture.replace('500 Prize Tix', 'five hundred Prize Tix'), 'unparsed-tix-line')
    blocked(fixture.replaceAll(/<li>[^<]*Prize Tix<\/li>/g, ''), 'no-usable-content')
    blocked('', 'empty-source')
    blocked(fixture.replace('id="main"', 'id="other"'), 'missing-or-ambiguous-main')
    blocked(append('<main></main>'), 'missing-or-ambiguous-main')
  })
  it('rejects a wrong event, year, dates, title, or source identity', () => {
    blocked(fixture.replaceAll('Atlanta', 'Las Vegas'), 'wrong-event')
    blocked(fixture.replaceAll('2026', '2027'), 'wrong-event-year')
    blocked(fixture.replace('</head>', '<meta property="og:url" content="https://mcvegas.mtgfestivals.com/"></head>'), 'conflicting-page-identity')
    expect(parsePrizeWallHtml(fixture, { sourceUrl: 'https://mcvegas.mtgfestivals.com/en-us/magic-play/prize-wall.html' }).status).toBe('blocked')
  })
  it.each(['javascript:alert(1)', 'http://mcatlanta.mtgfestivals.com/prize-wall.pdf', 'https://mcatlanta.mtgfestivals.com.evil.test/prize-wall.pdf', 'https://user:pass@mcatlanta.mtgfestivals.com/prize-wall.pdf', 'https://mcatlanta.mtgfestivals.com:8443/prize-wall.pdf', '//evil.test/prize-wall.pdf'])('rejects unsafe URL %s', href => {
    expect(safeOfficialPrizeUrl(href)).toBeNull()
    partial(append(`<a href="${href}">Prize catalog</a>`), 'unsafe-catalog-link')
  })
  it('reports linked PDF and image catalogs as links, never extracted price data', () => {
    const result = parse(append('<a href="/content/prize-wall.pdf">Full prize catalog</a><a href="/content/prize-list.png">Prize list image</a>'))
    expect(result.status).toBe('ok')
    expect(result.snapshot.catalogLinks).toMatchObject([
      { url: 'https://mcatlanta.mtgfestivals.com/content/prize-wall.pdf', format: 'pdf', ingestion: 'link-only' },
      { url: 'https://mcatlanta.mtgfestivals.com/content/prize-list.png', format: 'image', ingestion: 'link-only' },
    ])
    expect(result.snapshot.prices).toHaveLength(7)
  })
  it('tolerates heading typos and deduplicates identical price rows', () => {
    const result = parse(append('<p>Play Boosters starting at 500 Prize Tix</p>').replace('Prize Wall</h1>', 'Przie wall</h1>'))
    expect(result.status).toBe('ok')
    expect(result.snapshot.extractionComplete).toBe(true)
    expect(result.snapshot.prices).toHaveLength(7)
  })
  it('does not choose either conflicting price', () => {
    const result = parse(append('<p>Play Boosters: 700 Prize Tix</p>'))
    expect(result.status).toBe('ok')
    expect(result.snapshot.prices.some((row: { name: string }) => row.name === 'Play Boosters')).toBe(false)
  })
  it('exposes inventory images but excludes the historical hero image', () => {
    const result = parse(fixture.replace('<li>Play Boosters starting', '<li><img src="/content/prize-photo.png" alt="Play Booster">Play Boosters starting'))
    expect(result.snapshot.catalogLinks).toMatchObject([{ format: 'image', use: 'listing', name: 'Play Boosters', url: 'https://mcatlanta.mtgfestivals.com/content/prize-photo.png' }])
    expect(result.snapshot.catalogLinks).toHaveLength(1)
  })
  it('parses clear OCR lines and retains exact raw evidence without guessing ambiguous amounts', () => {
    const result = parsePrizeWallTextRows('  Example Playmat 7,000 Prize Tix  \nJumbo Cards starting at 20000 Tix\nDice: $10 or 500 Tix\nSleeves 100 or 200 Tix\nBroken: 2,50 Tix')
    expect(result.prices).toMatchObject([{ name: 'Example Playmat', tix: 7000, evidence: { text: '  Example Playmat 7,000 Prize Tix  ' } }, { name: 'Jumbo Cards', tix: 20000, qualifier: 'starting' }])
    expect(result.issues).toHaveLength(3)
    expect(result.extractionComplete).toBe(false)
  })
  it('finds images despite a misspelled inventory heading and preserves valid neighboring rows', () => {
    const changed = fixture.replace('What is available on the Prize Wall?', 'What is availble on the Prize Wall?').replace('<li>Play Boosters starting', '<li><img src="/content/listing.png" alt="Booster">Play Boosters starting')
    const result = parse(changed.replace('starting at 2,500 Prize Tix', 'starting at 2,50 Prize Tix'))
    expect(result.status).toBe('ok')
    expect(result.snapshot.prices).toHaveLength(6)
    expect(result.snapshot.prices[0].tix).toBe(500)
    expect(result.snapshot.catalogLinks[0]).toMatchObject({ use: 'listing', name: 'Play Boosters' })
    expect(result.snapshot.extractionComplete).toBe(false)
  })
  it('includes product images and retained status in semantic changes', () => {
    const snapshot = parse().snapshot
    const original = snapshot.semanticSha256
    snapshot.prices[0].imageUrl = 'https://mcatlanta.mtgfestivals.com/content/booster.png'
    expect(prizeWallSemanticDigest(snapshot)).not.toBe(original)
    delete snapshot.prices[0].imageUrl
    snapshot.prices[0].retained = true
    expect(prizeWallSemanticDigest(snapshot)).not.toBe(original)
  })
  it('reads clear numeric table rows only when the board supplies a Tix header', () => {
    const text = 'Prize Tix\nPlay Boosters 500\nCollector Boosters 2,500\n12 x 17 Jumbo Cards 20000\nDice 100 200\nSleeves $10'
    const result = parsePrizeWallTextRows(text)
    expect(result.prices).toMatchObject([
      { name: 'Play Boosters', tix: 500, evidence: { text: 'Play Boosters 500' } },
      { name: 'Collector Boosters', tix: 2500 },
    ])
    expect(result.issues).toHaveLength(3)
    expect(parsePrizeWallTextRows('Play Boosters 500').prices).toEqual([])
  })
  it('joins a wrapped product name with its following explicit Tix amount and retains both raw lines', () => {
    const result = parsePrizeWallTextRows('Example Playmat\n  7,000 Prize Tix \nDice\n500 Tix\n12 x 17 Cards\n20,000 Tix')
    expect(result.prices).toMatchObject([
      { name: 'Example Playmat', tix: 7000, evidence: { text: 'Example Playmat\n  7,000 Prize Tix ' } },
      { name: 'Dice', tix: 500 },
    ])
    expect(result.prices).toHaveLength(2)
    expect(result.issues).toHaveLength(1)
  })
  it('recognizes bounded official AEM responsive listing images without treating the hero as inventory', () => {
    const config = JSON.stringify({
      basePath: '/content/dam/sitebuilder/rna/mtgfestivals/mcatlanta/2026/prize-board.jpg/_jcr_content/renditions/original.image_file.',
      defaultImg: '{base}1200.800.file/prize-board.jpg',
      altText: 'Prize board',
      sources: [{ srcset: '{base}1200.800.file/123/prize-board.jpg 1200w' }],
    }).replaceAll('"', '&quot;')
    const image = `<div data-rx-params-imageresponsive="${config}"><div class="img-resp__anchor"></div></div>`
    const result = parse(fixture.replace('<li>Play Boosters starting', `<li>${image}Play Boosters starting`))
    expect(result.snapshot.catalogLinks).toMatchObject([{
      label: 'Prize board', format: 'image', use: 'listing', name: 'Play Boosters',
      url: 'https://mcatlanta.mtgfestivals.com/content/dam/sitebuilder/rna/mtgfestivals/mcatlanta/2026/prize-board.jpg/_jcr_content/renditions/original.image_file.1200.800.file/prize-board.jpg',
    }])
    expect(result.snapshot.catalogLinks).toHaveLength(1)
    expect(parse(append(image)).snapshot.catalogLinks).toEqual([])
  })
  it('skips unsafe or malformed AEM image configs while keeping useful prices', () => {
    for (const config of ['not json', JSON.stringify({ basePath: 'https://evil.test/', defaultImg: '{base}board.png', altText: 'Prize board' })]) {
      const image = `<div data-rx-params-imageresponsive="${config.replaceAll('"', '&quot;')}"></div>`
      const result = parse(fixture.replace('<li>Play Boosters starting', `<li>${image}Play Boosters starting`))
      expect(result.status).toBe('ok')
      expect(result.snapshot.prices).toHaveLength(7)
      expect(result.snapshot.catalogLinks).toEqual([])
      expect(result.snapshot.extractionComplete).toBe(false)
    }
  })
})
