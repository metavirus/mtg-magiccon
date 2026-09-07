import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseCsv, aggregatePrintingQuantities, sourceRowId } from './build_artist_card_catalog_seed_sql.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const hash = text => crypto.createHash('sha256').update(text).digest('hex')
const metadata = row => Object.fromEntries(Object.entries(row).filter(([key]) => !['Quantity', 'sourceRecordOrdinals'].includes(key)))
const fieldsChanged = (before, after) => [...new Set([...Object.keys(before), ...Object.keys(after)])]
  .sort().filter(key => (before[key] ?? '') !== (after[key] ?? ''))

function snapshot(text) {
  // Parse a synthetic empty data record to validate the header even for an empty export.
  const headers = Object.keys(parseCsv(`${text.split(/\r?\n/)[0]}\n__header_probe__`)[0] ?? {})
  for (const field of ['Scryfall ID', 'Set code', 'Collector number', 'Foil', 'Artist', 'Name', 'Quantity']) {
    if (!headers.includes(field)) throw new Error(`Missing CSV column: ${field}`)
  }
  const records = parseCsv(text).map((row, index) => ({ ...row, sourceRecordOrdinals: [index + 1] }))
  const excluded = records.filter(row => !row.Artist || !row.Name)
  const eligible = records.filter(row => row.Artist && row.Name)
  const warnings = []
  for (const row of eligible) {
    if (!row['Scryfall ID'] || !row['Set code'] || !row['Collector number'] || !row.Foil) {
      throw new Error(`Incomplete printing identity at source record ${row.sourceRecordOrdinals[0]}`)
    }
    if (!/^\d+$/.test(row.Quantity)) warnings.push({ record: row.sourceRecordOrdinals[0], issue: 'Quantity is not a nonnegative integer; importer legacy parsing/default applies', value: row.Quantity })
  }
  const printings = aggregatePrintingQuantities(eligible)
  const previousById = new Map()
  const duplicateMetadataConflicts = []
  for (const row of eligible) {
    const id = sourceRowId(row)
    const previous = previousById.get(id)
    if (previous) {
      const fields = fieldsChanged(metadata(previous), metadata(row))
      if (fields.length) duplicateMetadataConflicts.push({ identity: id, records: [previous.sourceRecordOrdinals[0], row.sourceRecordOrdinals[0]], fields })
    }
    previousById.set(id, row)
  }
  return {
    sha256: hash(text), headers, records: records.length, eligibleRecords: eligible.length,
    printingCount: printings.length, copies: printings.reduce((sum, row) => sum + row.Quantity, 0),
    excluded: excluded.map(row => ({ record: row.sourceRecordOrdinals[0], name: row.Name, artist: row.Artist, quantity: row.Quantity, reason: 'Missing artist or name' })),
    duplicateGroups: printings.filter(row => row.sourceRecordOrdinals.length > 1).length,
    duplicateMetadataConflicts, warnings, printings,
  }
}

const item = row => ({ identity: sourceRowId(row), name: row.Name, artist: row.Artist, quantity: row.Quantity, sourceRecordOrdinals: row.sourceRecordOrdinals })
const withoutRows = ({ printings, ...rest }) => rest

export function reviewArtistCardImport(beforeCsv, afterCsv) {
  const after = snapshot(afterCsv)
  const before = beforeCsv === null ? null : snapshot(beforeCsv)
  const previous = new Map((before?.printings ?? []).map(row => [sourceRowId(row), row]))
  const next = new Map(after.printings.map(row => [sourceRowId(row), row]))
  const added = [], quantityChanged = [], metadataChanged = [], missing = []
  for (const [identity, row] of next) {
    const old = previous.get(identity)
    if (!old) { added.push(item(row)); continue }
    if (old.Quantity !== row.Quantity) quantityChanged.push({ ...item(row), before: old.Quantity, after: row.Quantity, delta: row.Quantity - old.Quantity })
    const fields = fieldsChanged(metadata(old), metadata(row))
    if (fields.length) metadataChanged.push({ ...item(row), changes: fields.map(field => ({ field, before: old[field] ?? '', after: row[field] ?? '' })) })
  }
  for (const [identity, row] of previous) if (!next.has(identity)) missing.push({ ...item(row), disposition: 'Retain existing holding; review absence, never automatically delete or zero' })
  return {
    version: 1, mode: before ? 'source-comparison' : 'initial-uncompared',
    scope: 'Two explicitly supplied local CSV snapshots, not a comparison with live Supabase. Profile CSV is not compared.',
    before: before ? withoutRows(before) : null, after: withoutRows(after),
    counts: { added: added.length, quantityChanged: quantityChanged.length, metadataChanged: metadataChanged.length, missing: missing.length },
    added, quantityChanged, metadataChanged, missing,
    policy: 'Review only. No database writes. Missing rows retained; signing choices and attendance untouched. CSV quantity totals are not projected database totals when missing holdings are retained.',
  }
}

export function renderArtistImportReview(report) {
  return [
    '# Artist collection import review', '',
    report.mode === 'initial-uncompared' ? 'Initial source only: no previous snapshot supplied. Additions below are not verified as new to the database.' : 'Compared the two supplied source snapshots; live collection state was not queried.', '',
    `Printings: ${report.before?.printingCount ?? 'not compared'} -> ${report.after.printingCount}. Copies: ${report.before?.copies ?? 'not compared'} -> ${report.after.copies}.`,
    `Added: ${report.counts.added}; quantity changes: ${report.counts.quantityChanged}; metadata changes: ${report.counts.metadataChanged}; missing: ${report.counts.missing}.`,
    `Excluded source records: ${report.after.excluded.length}; duplicate groups: ${report.after.duplicateGroups}; conflicting duplicate metadata: ${report.after.duplicateMetadataConflicts.length}; quantity warnings: ${report.after.warnings.length}.`, '',
    'Missing items are flags, not deletion instructions. All item-level changes and source hashes are in the companion JSON report.',
    'Resolve warnings/conflicting duplicate metadata before generating an import. Profiles require separate review.', '',
    report.policy, '',
  ].join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  const values = {}
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]
    if (flag === '--initial' && !values.initial) values.initial = true
    else if (['--before', '--after'].includes(flag) && !values[flag.slice(2)] && args[i + 1] && !args[i + 1].startsWith('--')) values[flag.slice(2)] = args[++i]
    else throw new Error(`Unknown, repeated, or incomplete argument: ${flag}`)
  }
  if (!values.after || Boolean(values.before) === Boolean(values.initial)) throw new Error('Usage: pnpm artist:review-import --after <new.csv> (--before <previous.csv> | --initial)')
  const afterText = fs.readFileSync(path.resolve(values.after), 'utf8')
  const beforeText = values.before ? fs.readFileSync(path.resolve(values.before), 'utf8') : null
  const report = reviewArtistCardImport(beforeText, afterText)
  report.sources = { before: values.before ? path.resolve(values.before) : null, after: path.resolve(values.after) }
  const directory = path.join(root, 'local-assets', 'artist-card-working', 'import-reviews')
  fs.mkdirSync(directory, { recursive: true })
  const stem = `${report.before?.sha256 ?? 'initial'}-${report.after.sha256}`
  fs.writeFileSync(path.join(directory, `${stem}.json`), JSON.stringify(report, null, 2) + '\n')
  fs.writeFileSync(path.join(directory, `${stem}.md`), renderArtistImportReview(report))
  console.log(renderArtistImportReview(report))
  console.log(`Local report: ${path.join(directory, `${stem}.json`)}`)
}
