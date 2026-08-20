import { chromium } from 'playwright'

const baseUrl = process.env.MAGICCON_SMOKE_BASE_URL ?? 'http://127.0.0.1:5173/'
const companions = ['kavi', 'chris', 'juan', 'kyle']
const surfaces = ['home', 'trip', 'wallet', 'explore', 'plan', 'calendar']

const requiredBySurface = {
  home: ['Atlanta here we come'],
  trip: ['Where everyone is staying', 'Hilton Atlanta', 'Chris and Kyle', 'Omni at Centennial Park', 'Courtyard Atlanta Downtown'],
  wallet: ['Atlanta passes', 'Black Lotus badge order', 'Juan Premium Weekend'],
  explore: ['Find the keepers'],
  plan: ['Shape the weekend'],
  calendar: ['The road to Atlanta'],
}

const forbiddenEverywhere = [
  'No saved Black Lotus view',
  'Refresh the canonical source slice',
  'Project connection needed',
  "can't be refreshed",
  'could not be refreshed',
]

function urlFor(companion, surface) {
  const url = new URL(baseUrl)
  url.searchParams.set('preview', '1')
  url.searchParams.set('previewOwner', companion)
  url.hash = surface
  return url.toString()
}

function assertText({ companion, surface, body }) {
  const missing = (requiredBySurface[surface] ?? []).filter(needle => !body.includes(needle))
  const forbidden = forbiddenEverywhere.filter(needle => body.includes(needle))
  if (missing.length || forbidden.length) {
    const lines = [
      `COMPANION_SMOKE_FAIL ${companion} ${surface}`,
      missing.length ? `missing: ${missing.join(' | ')}` : null,
      forbidden.length ? `forbidden: ${forbidden.join(' | ')}` : null,
      `sample: ${body.replace(/\s+/g, ' ').slice(0, 360)}`,
    ].filter(Boolean)
    throw new Error(lines.join('\n'))
  }
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

try {
  for (const companion of companions) {
    for (const surface of surfaces) {
      const url = urlFor(companion, surface)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(400)
      const body = await page.locator('body').innerText({ timeout: 8000 })
      assertText({ companion, surface, body })
      console.log(`COMPANION_SMOKE_PASS ${companion} ${surface}`)
      if (surface === 'wallet') {
        await page.getByRole('tab', { name: 'Other' }).click({ timeout: 8000 })
        await page.waitForTimeout(200)
        const walletOtherBody = await page.locator('body').innerText({ timeout: 8000 })
        const walletOtherMissing = ['HOTEL RECEIPTS', 'Hilton · Nov 12-16', 'C/Ky'].filter(
          needle => !walletOtherBody.includes(needle),
        )
        const walletOtherForbidden = forbiddenEverywhere.filter(needle => walletOtherBody.includes(needle))
        if (walletOtherMissing.length || walletOtherForbidden.length) {
          throw new Error([
            `COMPANION_SMOKE_FAIL ${companion} wallet-other`,
            walletOtherMissing.length ? `missing: ${walletOtherMissing.join(' | ')}` : null,
            walletOtherForbidden.length ? `forbidden: ${walletOtherForbidden.join(' | ')}` : null,
            `sample: ${walletOtherBody.replace(/\s+/g, ' ').slice(0, 360)}`,
          ].filter(Boolean).join('\n'))
        }
        console.log(`COMPANION_SMOKE_PASS ${companion} wallet-other`)
        await page.getByRole('button', { name: /Hilton · Nov 12-16/ }).click({ timeout: 8000 })
        await page.waitForTimeout(200)
        const walletHiltonBody = await page.locator('body').innerText({ timeout: 8000 })
        const walletHiltonMissing = ['Hilton Atlanta · Chris + Kyle', 'Kyle Mandell', '255 Courtland Street NE'].filter(
          needle => !walletHiltonBody.includes(needle),
        )
        if (walletHiltonMissing.length) {
          throw new Error([
            `COMPANION_SMOKE_FAIL ${companion} wallet-hilton-modal`,
            `missing: ${walletHiltonMissing.join(' | ')}`,
            `sample: ${walletHiltonBody.replace(/\s+/g, ' ').slice(0, 360)}`,
          ].join('\n'))
        }
        console.log(`COMPANION_SMOKE_PASS ${companion} wallet-hilton-modal`)
      }
    }
  }
} finally {
  await browser.close()
}

console.log(`COMPANION_SMOKE_READY ${companions.length} companions x ${surfaces.length} surfaces`)
