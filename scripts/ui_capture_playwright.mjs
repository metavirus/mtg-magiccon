import fs from 'node:fs'
import { chromium } from 'playwright'

const values = new Map()
for (let index = 2; index < process.argv.length; index += 2) {
  values.set(process.argv[index], process.argv[index + 1])
}

const url = values.get('--url')
const screenshot = values.get('--screenshot')
const dom = values.get('--dom')
const text = values.get('--text')
const width = Number(values.get('--width') ?? 1600)
const height = Number(values.get('--height') ?? 1000)

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
  const page = await browser.newPage({ viewport: { width, height } })
  writePhase('goto')
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 })
  await page.waitForTimeout(1_500)
  writePhase('screenshot')
  await withTimeout('page.screenshot', page.screenshot({ path: screenshot, fullPage: false }), 10_000)

  writePhase('read')
  const html = await page.content()
  const visibleText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim()
  fs.writeFileSync(dom, html, 'utf8')
  fs.writeFileSync(text, `${visibleText}\n`, 'utf8')

  process.stdout.write(JSON.stringify({
    title: await page.title(),
    url: page.url(),
    visibleText: visibleText.slice(0, 500),
  }))
} finally {
  writePhase('close')
  await withTimeout('browser.close', browser.close(), 5_000)
}
