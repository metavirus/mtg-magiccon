import fs from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fetchOfficial, preparePrizeWall, SOURCE } from '../sync_prize_wall.mjs'
import { publishPrizeWall } from '../publish_prize_wall.mjs'

const html = fs.readFileSync('scripts/fixtures/prize-wall.html', 'utf8')
const response = (body: string, contentType = 'text/html') => ({ bytes: Buffer.from(body), contentType })
async function prepare(source = html, previous: unknown = null, extra: Record<string, unknown> = {}) {
  let written: any = null
  const retained: Record<string, Buffer> = {}
  const receipt = await preparePrizeWall({ fetchSource: async () => response(source), readCurrent: async () => previous,
    retain: async (name: string, bytes: Buffer) => { retained[name] = bytes }, writeCandidate: async (snapshot: unknown) => { written = snapshot },
    now: () => '2026-11-09T12:00:00Z', ...extra })
  return { receipt, written, retained }
}

describe('unattended Prize Wall ingestion', () => {
  it('retains original bytes, publishes seven prices, and does not rewrite unchanged data', async () => {
    const first = await prepare()
    expect(first.retained['source.html'].toString()).toBe(html)
    expect(first.written.prices).toHaveLength(7)
    const second = await prepare(html.replace('</body>', '<!-- harmless change --></body>'), first.written)
    expect(second.receipt.changed).toBe(false)
    expect(second.written).toBeNull()
  })
  it('publishes clear changes despite an unreadable neighboring price, retaining the last known row', async () => {
    const first = await prepare()
    const next = await prepare(html.replace('500 Prize Tix', '600 Prize Tix').replace('2,500 Prize Tix', 'TBD Prize Tix'), first.written)
    expect(next.written.prices.find((p: any) => p.name === 'Play Boosters').tix).toBe(600)
    expect(next.written.prices.find((p: any) => p.name === 'Collector Boosters')).toMatchObject({ tix: 2500, retained: true })
    expect(next.receipt.issues.length).toBeGreaterThan(0)
  })
  it('does not write when source identity fails', async () => {
    await expect(prepare('<main>Prize Wall, another event</main>')).rejects.toThrow()
  })
  it('does not request a redirect destination outside approved hosts', async () => {
    let requests = 0
    await expect(fetchOfficial(SOURCE, 1000, async () => {
      requests++
      return new Response('', { status: 302, headers: { location: 'http://127.0.0.1/admin' } })
    })).rejects.toThrow('Unapproved')
    expect(requests).toBe(1)
  })
  it('bounds streaming responses', async () => {
    await expect(fetchOfficial(SOURCE, 2, async () => new Response('too big'))).rejects.toThrow('byte limit')
  })
  it('keeps readable text updates when an image fetch fails', async () => {
    const imageHtml = html.replace('</main>', '</main>')
      .replace('Play Boosters starting', '<img src="/content/dam/prize-list.png" alt="Prize listing">Play Boosters starting')
    const next = await prepare(imageHtml, null, { fetchSource: async (url: string) => {
      if (url === SOURCE) return response(imageHtml)
      throw Error('temporary 503')
    } })
    expect(next.written.prices).toHaveLength(7)
    expect(next.receipt.issues.some((issue: any) => issue.code === 'resource-unavailable')).toBe(true)
  })
  it('ingests readable image-only prices and retains the original board', async () => {
    const source = html.replace('<ul><li>Play Boosters', '<img src="/content/dam/prize-list.png" alt="Prize listing"><ul><li>Play Boosters')
    const next = await prepare(source, null, {
      fetchSource: async (url: string) => url === SOURCE ? response(source) : response('original-image-bytes', 'image/png'),
      recognizeImage: async () => ({ text: 'Festival Playmat 7,000 Prize Tix', rejectedLineCount: 0 }),
    })
    expect(next.written.prices.find((p: any) => p.name === 'Festival Playmat')).toMatchObject({ tix: 7000, qualifier: 'exact', evidence: { method: 'ocr' } })
    expect(Object.keys(next.retained).some(name => name.endsWith('.original'))).toBe(true)
  })
  it('keeps Prize Wall running independently of surveyor editorial holds and dispatches Pages explicitly', () => {
    const daily = fs.readFileSync('.github/workflows/daily-surveyor.yml', 'utf8')
    expect(daily).toContain('uses: ./.github/workflows/prize-wall-sync.yml')
    expect(daily.split('  prize-wall:')[1].split('  monitor:')[0]).not.toContain('needs:')
    const publish = fs.readFileSync('scripts/publish_prize_wall.mjs', 'utf8')
    expect(publish).toContain("['workflow', 'run', 'deploy-pages.yml', '--ref', 'main']")
    expect(publish).not.toContain('--force')
    const runner = fs.readFileSync('scripts/sync_prize_wall.mjs', 'utf8')
    const workflow = fs.readFileSync('.github/workflows/prize-wall-sync.yml', 'utf8')
    expect(runner).toContain("const WORK = '.codex-local/prize-wall-ingest'")
    expect(workflow).toContain('include-hidden-files: true')
    expect(workflow).toContain('.codex-local/prize-wall-ingest/*.original')
  })
  it('commits only its data and dispatches then verifies Pages', async () => {
    const calls: string[] = [], receipts: any[] = []
    let reads = 0
    await publishPrizeWall({ expected: 'data-sha', execute: (cmd: string, args: string[]) => {
      calls.push([cmd, ...args].join(' '))
      if (args[0] === 'status') return ' M public/prize-wall/current.json'
      if (args[0] === 'diff') return 'public/prize-wall/current.json'
      return 'commit-sha'
    }, receipt: async (value: any) => { receipts.push(value) }, liveMatches: async () => reads++ > 0, wait: async () => {}, attempts: 1 })
    expect(calls).toContain('git push origin HEAD:main')
    expect(calls).toContain('gh workflow run deploy-pages.yml --ref main')
    expect(receipts.at(-1).status).toBe('live')
  })
  it('recovers a failed deployment even with unchanged source data', async () => {
    const calls: string[] = [], receipts: any[] = []
    let reads = 0
    await publishPrizeWall({ expected: 'data-sha', execute: (cmd: string, args: string[]) => {
      calls.push([cmd, ...args].join(' ')); return args[0] === 'status' ? '' : 'commit-sha'
    }, receipt: async (value: any) => { receipts.push(value) }, liveMatches: async () => reads++ > 0, wait: async () => {}, attempts: 1 })
    expect(calls.some(call => call.startsWith('git push'))).toBe(false)
    expect(calls).toContain('gh workflow run deploy-pages.yml --ref main')
    expect(receipts.at(-1).status).toBe('live')
  })
  it('does nothing when current data is already public and refuses unrelated modifications', async () => {
    const calls: string[] = []
    const options = { expected: 'data-sha', execute: (cmd: string, args: string[]) => { calls.push(cmd); return '' },
      receipt: async () => {}, liveMatches: async () => true }
    await publishPrizeWall(options)
    expect(calls).not.toContain('gh')
    await expect(publishPrizeWall({ ...options, execute: () => ' M src/App.tsx' })).rejects.toThrow('unrelated')
  })
})
