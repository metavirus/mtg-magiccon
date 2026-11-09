import fs from 'node:fs/promises'
import sharp from 'sharp'
import { createWorker } from 'tesseract.js'

// Runs in a disposable child process; the caller enforces a 90-second budget.
const [file] = process.argv.slice(2)
if (!file) throw Error('Image evidence path required')
const image = await sharp(await fs.readFile(file), { limitInputPixels: 25000000 })
  .rotate().resize({ width: 2400, height: 3200, fit: 'inside' }).flatten({ background: '#fff' }).png().toBuffer()
const worker = await createWorker('eng', 1, { cachePath: '.codex-local/prize-wall-ingest', logger: () => {} })
try {
  const { data } = await worker.recognize(image, {}, { text: true, blocks: true })
  const lines = (data.blocks ?? []).flatMap(block => block.paragraphs ?? []).flatMap(paragraph => paragraph.lines ?? [])
  const readable = lines.filter(line => line.confidence >= 70 && (line.words ?? [])
    .filter(word => /\d/.test(word.text)).every(word => word.confidence >= 80))
  process.stdout.write(JSON.stringify({ text: readable.map(line => line.text).join('\n'),
    originalText: data.text, confidence: data.confidence, rejectedLineCount: lines.length - readable.length }))
} finally { await worker.terminate() }
