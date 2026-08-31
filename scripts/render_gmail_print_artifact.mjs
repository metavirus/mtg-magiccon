import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const inputPath = process.argv[2]
const outputDir = process.argv[3]
const outputPrefix = process.argv[4]

if (!inputPath || !outputDir || !outputPrefix) {
  throw new Error('Usage: node scripts/render_gmail_print_artifact.mjs <ignored-source.json> <output-dir> <output-prefix>')
}

const source = JSON.parse(await fs.readFile(inputPath, 'utf8'))
for (const field of ['account', 'date', 'from', 'subject', 'to', 'html']) {
  if (!String(source[field] ?? '').trim()) throw new Error(`Missing Gmail print field: ${field}`)
}

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

// Gmail's API sometimes returns an already-decoded non-breaking space as the
// UTF-8 mojibake sequence `Â `. Normalize that one transport artifact before
// rendering while leaving the receipt's actual wording and markup untouched.
const normalizedSourceHtml = source.html.replaceAll('\u00c2\u00a0', '\u00a0')
const styleTags = [...normalizedSourceHtml.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map(match => match[0]).join('\n')
const bodyMatch = normalizedSourceHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)
const messageBody = bodyMatch?.[1] ?? normalizedSourceHtml
const attachmentImages = await Promise.all((source.attachmentImages ?? []).map(async attachment => {
  if (!String(attachment?.filename ?? '').trim() || !String(attachment?.localPath ?? '').trim()) {
    throw new Error('Gmail print image attachments require filename and localPath.')
  }
  const attachmentPath = path.resolve(path.dirname(inputPath), attachment.localPath)
  const bytes = await fs.readFile(attachmentPath)
  const extension = path.extname(attachmentPath).toLowerCase()
  const mimeType = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png'
  return `<figure class="gmail-attachment"><figcaption>${escapeHtml(attachment.filename)}</figcaption><img src="data:${mimeType};base64,${bytes.toString('base64')}" alt="${escapeHtml(attachment.filename)}"></figure>`
}))
const attachmentMarkup = attachmentImages.join('\n')
const printedAt = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Los_Angeles',
}).format(new Date())

const documentHtml = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
${styleTags}
<style>
  @page { size: Letter; margin: 0.42in 0.52in 0.5in; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #202124; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
  .gmail-print-shell { width: 100%; }
  .gmail-print-meta { display: grid; grid-template-columns: 145px minmax(0, 1fr) 145px; align-items: center; margin: 0 0 30px; color: #202124; font-size: 11px; }
  .gmail-print-meta span:first-child { white-space: nowrap; }
  .gmail-print-meta span:nth-child(2) { min-width: 0; overflow: hidden; font-weight: 500; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
  .gmail-print-meta span:last-child { text-align: right; }
  .gmail-account-row { display: flex; align-items: center; justify-content: space-between; min-height: 44px; margin: 0 18px 17px; }
  .gmail-lockup { display: flex; align-items: center; gap: 9px; font-size: 29px; color: #4a4a4a; letter-spacing: -1px; }
  .gmail-mark { position: relative; width: 39px; height: 29px; border-radius: 4px; overflow: hidden; background: linear-gradient(135deg,#4285f4 0 22%,#34a853 22% 43%,#fbbc04 43% 63%,#ea4335 63% 100%); }
  .gmail-mark::after { content: ''; position: absolute; inset: 6px 7px 5px; background: #fff; clip-path: polygon(0 0,50% 45%,100% 0,100% 100%,78% 100%,78% 38%,50% 66%,22% 38%,22% 100%,0 100%); }
  .gmail-account { color: #6b6b6b; font-size: 13px; font-weight: 600; }
  .gmail-rule { border: 0; border-top: 1px solid #b9b9b9; margin: 0 18px; }
  .gmail-subject { margin: 11px 18px 7px; font-size: 20px; line-height: 1.2; color: #111; font-weight: 700; }
  .gmail-message-head { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 18px; margin: 8px 18px 3px; font-size: 12px; }
  .gmail-message-head strong { font-weight: 700; }
  .gmail-to { margin: 0 18px 24px; font-size: 12px; }
  .gmail-message-body { margin: 0 18px; overflow: visible; }
  .gmail-message-body img { max-width: 100% !important; height: auto; }
  .gmail-message-body table { max-width: 100% !important; }
  .gmail-attachment { break-inside: avoid; margin: 28px 0 0; padding-top: 14px; border-top: 1px solid #dadce0; }
  .gmail-attachment figcaption { margin: 0 0 10px; color: #5f6368; font-weight: 700; }
</style>
</head>
<body>
  <main class="gmail-print-shell">
    <div class="gmail-print-meta"><span>${escapeHtml(printedAt)}</span><span>Gmail - ${escapeHtml(source.subject)}</span><span></span></div>
    <div class="gmail-account-row"><div class="gmail-lockup"><span class="gmail-mark"></span><span>Gmail</span></div><div class="gmail-account">${escapeHtml(source.account)}</div></div>
    <hr class="gmail-rule">
    <h1 class="gmail-subject">${escapeHtml(source.subject)}</h1>
    <hr class="gmail-rule">
    <div class="gmail-message-head"><div><strong>${escapeHtml(source.from)}</strong></div><time>${escapeHtml(source.date)}</time></div>
    <div class="gmail-to">To: ${escapeHtml(source.to)}</div>
    <section class="gmail-message-body">${messageBody}${attachmentMarkup}</section>
  </main>
</body>
</html>`

await fs.mkdir(outputDir, { recursive: true })
const imagePath = path.join(outputDir, `${outputPrefix}.png`)
for (const name of await fs.readdir(outputDir)) {
  if (name === `${outputPrefix}.png`) {
    await fs.rm(path.join(outputDir, name), { force: true })
  }
}
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1275, height: 900 }, deviceScaleFactor: 1 })
  await page.setContent(documentHtml, { waitUntil: 'networkidle', timeout: 30_000 })
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(image => image.complete
      ? Promise.resolve()
      : new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true })
          image.addEventListener('error', resolve, { once: true })
        })))
  })
  await page.screenshot({ path: imagePath, fullPage: true, type: 'png' })
} finally {
  await browser.close()
}
const image = await fs.stat(imagePath)
if (!image.size) throw new Error('Gmail proof render produced an empty image.')
console.log(JSON.stringify({ status: 'rendered', imagePath, byteSize: image.size }, null, 2))
