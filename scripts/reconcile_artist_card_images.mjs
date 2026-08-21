import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const workingDir = path.join(repoRoot, 'local-assets', 'artist-card-working')
const normalizedPath = path.join(workingDir, 'artist_card_candidates.normalized.csv')
const reconciliationPath = path.join(workingDir, 'missing_image_reconciliation.csv')
const summaryPath = path.join(workingDir, 'import_summary.json')

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') quoted = false
      else cell += char
      continue
    }
    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''))
      rows.push(row)
      row = []
      cell = ''
    } else cell += char
  }
  if (cell.length || row.length) row.push(cell.replace(/\r$/, '')), rows.push(row)
  const [headers = [], ...body] = rows.filter(item => item.some(value => value.trim().length))
  return {
    headers,
    rows: body.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))),
  }
}

function stringifyCsv(headers, rows) {
  const escape = value => {
    const text = String(value ?? '')
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  return `${headers.join(',')}\n${rows.map(row => headers.map(header => escape(row[header])).join(',')).join('\n')}\n`
}

const normalized = parseCsv(fs.readFileSync(normalizedPath, 'utf8'))
const reconciliation = parseCsv(fs.readFileSync(reconciliationPath, 'utf8')).rows

const actualByScryfallId = new Map()
for (const row of reconciliation) {
  if (row.actual_file_present_in_zip !== 'True') continue
  if (!row['Scryfall ID'] || !row.actual_image_filename_in_zip) continue
  if (!actualByScryfallId.has(row['Scryfall ID'])) {
    actualByScryfallId.set(row['Scryfall ID'], row.actual_image_filename_in_zip)
  }
}

let updatedRows = 0
let stillMissing = 0
for (const row of normalized.rows) {
  if (row.local_image_found === 'yes') continue
  const actualFilename = actualByScryfallId.get(row.scryfall_id)
  if (actualFilename) {
    row.local_image_filename = actualFilename
    row.local_image_count = '1'
    row.local_image_found = 'yes'
    updatedRows += 1
  } else {
    stillMissing += 1
  }
}

fs.writeFileSync(normalizedPath, stringifyCsv(normalized.headers, normalized.rows))

if (fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
  summary.counts.card_rows_missing_local_image = stillMissing
  summary.counts.missing_image_reconciliation_rows = reconciliation.length
  summary.counts.missing_image_reconciled_rows = updatedRows
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)
}

console.log(JSON.stringify({
  reconciliation_rows: reconciliation.length,
  unique_reconciliation_scryfall_ids: actualByScryfallId.size,
  normalized_rows_updated: updatedRows,
  normalized_rows_still_missing: stillMissing,
}, null, 2))
