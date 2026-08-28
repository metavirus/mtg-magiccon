import fs from 'node:fs'
import { chromium } from 'playwright'

const values = new Map()
for (let index = 2; index < process.argv.length; index++) {
  const key = process.argv[index]
  if (!key.startsWith('--')) continue
  const candidate = process.argv[index + 1]
  if (candidate && !candidate.startsWith('--')) {
    values.set(key, candidate)
    index++
  } else {
    values.set(key, 'true')
  }
}

const url = values.get('--url')
const screenshot = values.get('--screenshot')
const dom = values.get('--dom')
const text = values.get('--text')
const width = Number(values.get('--width') ?? 1600)
const height = Number(values.get('--height') ?? 1000)
const offlineReopen = values.get('--offline-reopen') === 'true'
const expectText = values.get('--expect-text') === 'true' ? '' : values.get('--expect-text') ?? ''
const expectImage = values.get('--expect-image') === 'true' ? '' : values.get('--expect-image') ?? ''
const expectAssetsValue = values.get('--expect-assets') === 'true' ? '' : values.get('--expect-assets') ?? ''
const expectAssets = expectAssetsValue.split('|').filter(Boolean)

if (!url || !screenshot || !dom || !text) {
  throw new Error('Missing required UI capture argument.')
}

function writePhase(phase) {
  process.stderr.write(`UI_CAPTURE_PHASE ${phase}\n`)
}

async function withTimeout(label, promise, timeoutMs) {
  let timeout
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timeout)
  }
}

writePhase('launch')
const browser = await withTimeout('chromium.launch', chromium.launch({
  headless: true,
  args: ['--disable-gpu-sandbox'],
}), 15_000)
try {
  writePhase('newPage')
  const context = await browser.newContext({ viewport: { width, height } })
  let page = await context.newPage()
  writePhase('goto')
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 })
  await page.waitForTimeout(1_500)
  let serviceWorkerControlled = false
  if (offlineReopen) {
    writePhase('serviceWorkerReady')
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    serviceWorkerControlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller))
    if (!serviceWorkerControlled) {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 })
      serviceWorkerControlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller))
    }
    if (!serviceWorkerControlled) throw new Error('Service worker did not control the warmed page.')
    writePhase('offlineReopen')
    await page.close()
    await context.setOffline(true)
    await context.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'onLine', { configurable: true, get: () => false })
    })
    page = await context.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await page.waitForTimeout(750)
  }
  writePhase('screenshot')
  await withTimeout('page.screenshot', page.screenshot({ path: screenshot, fullPage: false }), 10_000)

  writePhase('read')
  const html = await page.content()
  const visibleText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim()
  if (expectText && !visibleText.includes(expectText)) throw new Error(`Expected visible text was missing: ${expectText}`)
  if (expectImage) {
    const imageReady = await page.locator(expectImage).evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)
    if (!imageReady) throw new Error(`Expected cached image was unavailable: ${expectImage}`)
  }
  if (expectAssets.length) {
    const assetResults = await page.evaluate(async assets => Promise.all(assets.map(async asset => {
      try {
        const response = await fetch(new URL(asset, location.href), { signal: AbortSignal.timeout(3_000) })
        return { asset, ok: response.ok }
      } catch {
        return { asset, ok: false }
      }
    })), expectAssets)
    const missingAssets = assetResults.filter(result => !result.ok).map(result => result.asset)
    if (missingAssets.length) throw new Error(`Expected cached assets were unavailable: ${missingAssets.join(', ')}`)
  }
  fs.writeFileSync(dom, html, 'utf8')
  fs.writeFileSync(text, `${visibleText}\n`, 'utf8')

  process.stdout.write(JSON.stringify({
    title: await page.title(),
    url: page.url(),
    visibleText: visibleText.slice(0, 500),
    offlineReopen,
    serviceWorkerControlled,
    navigatorOnline: await page.evaluate(() => navigator.onLine),
  }))
} finally {
  writePhase('close')
  await withTimeout('browser.close', browser.close(), 5_000)
}
