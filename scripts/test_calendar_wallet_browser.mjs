import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { preview } from 'vite'

const dist = resolve(process.argv[2] ?? 'dist')
const server = await preview({
  configFile: false,
  base: '/mtg-magiccon/',
  build: { outDir: dist },
  preview: { host: '127.0.0.1', port: 0, strictPort: true },
})
const origin = `http://127.0.0.1:${server.httpServer.address().port}`
const svg = n => `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><rect width="320" height="220" fill="white"/><text x="22" y="46">Example receipt · Page ${n} of 2</text></svg>`
let browser
try {
  browser = await chromium.launch({ headless: true })
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const context = await browser.newContext({ viewport })
    let recoverPage = false
    let recoveredRequests = 0
    let offline = false
    await context.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin === origin) return route.continue()
      // Never let the fixture contact the live backend or other external services.
      if (offline || !url.hostname.endsWith('.supabase.co')) return route.abort()
      if (recoverPage && url.pathname.endsWith('/private-receipt-artifacts/fixture/page-2.svg')) {
        if (route.request().method() !== 'OPTIONS') recoveredRequests++
        return route.fulfill({
          status: route.request().method() === 'OPTIONS' ? 204 : 200,
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
          },
          contentType: 'image/svg+xml',
          body: svg(2),
        })
      }
      await new Promise(resolve => setTimeout(resolve, 5500))
      await route.abort().catch(() => {})
    })
    const base = origin + '/mtg-magiccon/?auth=1'
    let page = await context.newPage()
    await page.goto(base)
    await page.evaluate(async proof => {
      const ownerId = 'fixture-owner'
      const stamp = new Date().toISOString()
      const save = (lane, value) => localStorage.setItem(`magiccon:offline-lane:v1:${ownerId}:${lane}`, JSON.stringify({ version: 1, ownerId, lane, savedAt: stamp, value }))
      localStorage.setItem('magiccon:offline-identity:v1', JSON.stringify({ userId: ownerId, email: 'user@example.com' }))
      const leg = (leg_key, flight_number, departure_airport, arrival_airport, departure_at, arrival_at) => ({ leg_key, flight_number, departure_airport, arrival_airport, departure_at, arrival_at })
      save('flights', [{ itinerary_key: 'atlanta-2026-delta-hogfbx', traveler_person_keys: ['kavi'], legs: [
        leg('outbound','DL 329','SNA','ATL','2026-11-11T14:00:00-08:00','2026-11-11T21:16:00-05:00'),
        leg('return','DL 1602','ATL','SNA','2026-11-15T20:25:00-05:00','2026-11-15T22:14:00-08:00'),
      ] }])
      save('selections', [{ owner_id: ownerId, object_id: 'onboarding-tour', selection_key: 'completed', selection_value: 'true' }])
      save('walletReceipts', [{
        id: 'fixture-order', title: 'Saved convention order', receipt_type: 'store', vendor: 'MagicCon', amount: 5, currency: 'USD',
        attendee_person_key: 'kavi', attendee_person_keys: ['kavi'], line_items: [],
        receipt_artifacts: [1,2].map(n => ({
          id: `page-${n}`, display_label: `Page ${n} of 2`, display_order: n, mime_type: 'image/svg+xml',
          artifact_role: 'original', bucket_id: 'private-receipt-artifacts', object_path: `fixture/page-${n}.svg`,
        })),
      }])
      const cache = await caches.open('magiccon-private-receipt-artifacts-v1')
      await cache.put(new URL('./__offline_wallet/fixture-owner/page-1', location.href), new Response(
        proof,
        { headers: { 'Content-Type': 'image/svg+xml' } },
      ))
    }, svg(1))
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10000 })
    async function wallet() {
      await page.getByRole('tab', { name: 'Store', exact: true }).click()
      await page.getByRole('button', { name: /Kavi · Store order/ }).click()
      await page.getByRole('tab', { name: 'Original', exact: true }).click()
      await page.getByRole('button', { name: 'Show proof' }).waitFor({ timeout: 3000 })
    }
    await page.goto(base + '#calendar')
    await page.reload()
    const heading = page.getByRole('heading', { name: 'Arrive ATL · Courtyard night' })
    await page.getByRole('heading', { name: 'The road to Atlanta.', level: 1 }).waitFor()
    await page.getByText('Checking for updates…').waitFor()
    assert.equal(await heading.isVisible(), false, 'Cached events must stay hidden during the online check')
    await page.locator('button[aria-label="Refresh this view"][aria-description^="Saved copy"]').waitFor({ timeout: 7000 })
    assert.equal(await page.getByText(/^Saved copy/).count(), 0, 'Saved status must not occupy page space')
    await heading.waitFor()
    await page.goto(base + '#wallet')
    await page.locator('button[aria-label="Refresh this view"][aria-description^="Saved copy"]').waitFor({ timeout: 7000 })
    const refresh = page.getByRole('button', { name: 'Refresh this view' })
    await refresh.click()
    await page.getByText('Checking for updates…').waitFor()
    assert.equal(await refresh.isDisabled(), true, 'Refresh must not start a duplicate request')
    await page.locator('button[aria-label="Refresh this view"][aria-description^="Saved copy"]').waitFor({ timeout: 7000 })
    await wallet()
    await page.getByRole('button', { name: 'Retry Page 2 of 2' }).waitFor({ timeout: 20000 })
    await page.getByText('1 of 2 pages available', { exact: true }).waitFor()
    recoverPage = true
    await page.getByRole('button', { name: 'Retry Page 2 of 2' }).click()
    await page.getByText('Original receipt · 2 pages', { exact: true }).waitFor({ timeout: 3000 })
    assert.equal(recoveredRequests, 1, 'Retry must fetch just the missing page once')
    await page.close()
    offline = true
    await context.setOffline(true)
    page = await context.newPage()
    await page.goto(base + '#calendar')
    await page.getByRole('heading', { name: 'Arrive ATL · Courtyard night' }).waitFor({ timeout: 3000 })
    await page.goto(base + '#wallet')
    await wallet()
    await page.getByRole('button', { name: 'Show proof' }).click()
    async function assertReadableProof(label) {
      await page.waitForFunction(expected => {
        const image = document.querySelector('dialog.receipt-reader img')
        return image?.alt === expected && image.complete && image.naturalWidth > 0
      }, label, { timeout: 3000 })
    }
    await assertReadableProof('Page 1 of 2')
    await page.getByRole('button', { name: 'Next receipt page' }).click()
    await assertReadableProof('Page 2 of 2')
    console.log(`${viewport.width}px: online check kept the header visible and hid cached content; retry, saved fallback, and offline proof passed`)
    await context.setOffline(false)
    await page.goto(origin + '/mtg-magiccon/kavimap/index.html')
    await page.locator('.pf-toolbar').waitFor()
    await page.evaluate(() => window.postMessage({ type: 'kavimap:schedule', version: 1,
      nextRooms: { 'black-lotus': ['Kavi', 'Chris', 'Juan', 'Kyle'].map(person => ({ person, title: 'Upcoming event', eventId: person })) },
      eventHits: [], eventPeople: {}, roomEvents: {},
    }, '*'))
    await page.locator('.map-person-stop').first().waitFor()
    const markers = await page.locator('.map-person-stop').evaluateAll(nodes => nodes.map(node => {
      const frame = node.closest('foreignObject').getBoundingClientRect()
      const bubble = node.querySelector('.person-bubble').getBoundingClientRect()
      return { inside: bubble.left - 3 >= frame.left - .5 && bubble.right + 3 <= frame.right + .5 && bubble.top - 3 >= frame.top - .5 && bubble.bottom + 3 <= frame.bottom + .5 }
    }))
    assert.equal(markers.length, 4)
    assert(markers.every(marker => marker.inside), 'Every person bubble must stay inside its SVG marker, without inherited drawer positioning')
    await context.close()
  }
} finally {
  try { await browser?.close() }
  finally { await server.close() }
}
