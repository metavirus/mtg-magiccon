import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workingDir = path.join(repoRoot, 'local-assets', 'artist-card-working')
const cardCsvPath = fs.existsSync(path.join(workingDir, 'ManaBox_Collection_Art_Taxonomy_v2_with_Prices.csv'))
  ? path.join(workingDir, 'ManaBox_Collection_Art_Taxonomy_v2_with_Prices.csv')
  : path.join(workingDir, 'cards with price.csv')
const profileCsvPath = path.join(workingDir, 'artist_profiles.normalized.csv')
const outputPath = path.join(workingDir, 'artist_card_catalog_seed.sql')

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }

  const [headers, ...body] = rows
  return body
    .filter(values => values.some(value => String(value ?? '').trim()))
    .map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function readText(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required import file: ${filePath}`)
  }
  return fs.readFileSync(filePath, 'utf8')
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function sql(value) {
  if (value === null || value === undefined || value === '') return 'null'
  return `'${String(value).replaceAll("'", "''")}'`
}

function sqlNumber(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? String(parsed) : 'null'
}

function sqlInt(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? String(parsed) : 'null'
}

function sqlTextArray(value) {
  const parts = String(value ?? '')
    .split(/[;|]/)
    .map(part => part.trim())
    .filter(Boolean)
  if (!parts.length) return "'{}'::text[]"
  return `array[${parts.map(sql).join(', ')}]::text[]`
}

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function scryfallUrl(row) {
  const setCode = String(row['Set code'] ?? '').toLowerCase()
  const collectorNumber = row['Collector number']
  if (!setCode || !collectorNumber) return ''
  return `https://scryfall.com/card/${setCode}/${collectorNumber}/${slugify(row.Name)}`
}

export function sourceRowId(row) {
  return [
    row['Scryfall ID'],
    String(row['Set code'] ?? '').toLowerCase(),
    row['Collector number'],
    String(row.Foil ?? '').toLowerCase(),
  ].join('|')
}

function firstPresent(...values) {
  return values.map(value => String(value ?? '').trim()).find(Boolean) ?? ''
}

export function aggregatePrintingQuantities(rows) {
  const printings = new Map()
  for (const row of rows) {
    const identity = sourceRowId(row)
    // Match the existing per-row SQL default before summing this snapshot.
    const quantity = Number.parseInt(sqlInt(row.Quantity), 10)
    const previous = printings.get(identity)
    // Preserve the prior last-row metadata precedence, but retain every copy.
    printings.set(identity, {
      ...row,
      Quantity: (previous?.Quantity ?? 0) + (Number.isFinite(quantity) ? quantity : 1),
      sourceRecordOrdinals: [...(previous?.sourceRecordOrdinals ?? []), ...(row.sourceRecordOrdinals ?? [])],
    })
  }
  return [...printings.values()]
}

export function buildArtistCardCatalogSeed(cardCsv, profileCsv, options = {}) {
  const { ownerId, cardSource, profileSource } = options
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId ?? '')) {
    throw new Error('An explicit UUID ownerId is required')
  }
  for (const [label, source] of Object.entries({ cardSource, profileSource })) {
    if (!source?.name?.trim() || !source?.path?.trim()) throw new Error(`${label} requires explicit name and path`)
  }
  const withOrdinals = rows => rows.map((row, index) => ({ ...row, sourceRecordOrdinals: [index + 1] }))
  const cardRows = aggregatePrintingQuantities(withOrdinals(parseCsv(cardCsv)).filter(row => row.Artist && row.Name))
  const profiles = new Map(withOrdinals(parseCsv(profileCsv)).filter(row => row.artist_name).map(row => [row.artist_name, row]))
  const artists = [...new Set([...cardRows.map(row => row.Artist), ...profiles.keys()])].sort((a, b) => a.localeCompare(b))
  const owner = `${sql(ownerId)}::uuid`
  const batch = (source, csv) => `(select id from public.artist_import_batches where owner_id = ${owner} and source_path = ${sql(source.path)} and source_sha256 = ${sql(sha256(csv))})`
  const cardBatch = batch(cardSource, cardCsv)
  const profileBatch = batch(profileSource, profileCsv)
  const ordinal = row => `array[${row.sourceRecordOrdinals.join(', ')}]::integer[]`
  const artistId = name => `(select id from public.artists where canonical_name = ${sql(name)})`
  const printingId = row => `(select id from public.artist_card_printings where source_row_id = ${sql(sourceRowId(row))})`
  const lines = [
    '-- Generated by scripts/build_artist_card_catalog_seed_sql.mjs',
    '-- Source CSVs remain ignored import evidence; canonical facts live in Supabase tables.',
    '-- Attendance is maintained separately from card/profile imports; reviewed event evidence is untouched.',
    '-- Staging is transaction-local; absent source identities are never deleted.',
    'begin;',
  ]
  // Typed, transaction-local staging keeps SQL statement growth bounded by chunks,
  // rather than emitting a whole chain of canonical upserts per source printing.
  const stage = (table, columns, rows, extraTypes = {}) => {
    const name = `artist_seed_${table}`
    const typedColumns = columns.map(column => extraTypes[column] ? `null::${extraTypes[column]} as ${column}` : column)
    lines.push(`create temporary table ${name} on commit drop as select ${typedColumns.join(', ')} from public.${table} with no data;`)
    for (let start = 0; start < rows.length; start += 500) {
      lines.push(`insert into ${name} (${columns.join(', ')}) values\n${rows.slice(start, start + 500).map(row => `(${row.join(', ')})`).join(',\n')};`)
    }
    return name
  }
  const upsert = (table, columns, rows, keys, custom = {}) => {
    const name = stage(table, columns, rows)
    const changes = columns.filter(column => !keys.includes(column)).map(column =>
      `${column} = ${custom[column] ?? `excluded.${column}`}`)
    for (const [column, expression] of Object.entries(custom)) {
      if (!columns.includes(column)) changes.push(`${column} = ${expression}`)
    }
    lines.push(`insert into public.${table} (${columns.join(', ')})\nselect ${columns.join(', ')} from ${name} where true\non conflict (${keys.join(', ')}) do update set\n  ${changes.join(',\n  ')};`)
  }
  upsert('artist_import_batches',
    ['owner_id', 'source_name', 'source_path', 'source_sha256', 'source_kind', 'notes', 'imported_at'],
    [[profileSource, profileCsv, 'artist_profiles', 'Owner collection profile import'],
      [cardSource, cardCsv, 'card_catalog', 'Owner inventory and assessment import']]
      .map(([source, csv, kind, note]) => [owner, sql(source.name), sql(source.path), sql(sha256(csv)), sql(kind), sql(note), 'now()']),
    ['owner_id', 'source_path', 'source_sha256'])

  const styleFields = ['predominant_style', 'abstract_surreal_tendency', 'style_confidence', 'style_description',
    'mtg_catalog_printings_found', 'earliest_mtg_credit_year', 'latest_mtg_credit_year', 'historical_style_signals', 'sample_mtg_cards']
  upsert('artists', ['canonical_name', 'display_name', 'scryfall_search_url', ...styleFields, 'updated_at'],
    artists.map(artist => {
      const profile = profiles.get(artist) ?? {}
      return [sql(artist), sql(artist), sql(`https://scryfall.com/search?as=grid&order=name&q=%28game%3Apaper%29+artist%3A${encodeURIComponent(artist.split(' ').at(-1) ?? artist)}+prefer%3Abest`),
        ...styleFields.map(field => /printings_found|credit_year/.test(field) ? sqlInt(profile[field]) : sql(profile[field])), 'now()']
    }), ['canonical_name'])
  upsert('artist_collection_profiles',
    ['owner_id', 'artist_id', 'collection_card_count', 'unique_collection_printings', 'source_batch_id', 'source_record_ordinals', 'imported_at'],
    [...profiles].map(([artist, row]) => [owner, artistId(artist), sqlInt(row.collection_card_count), sqlInt(row.unique_collection_printings), profileBatch, ordinal(row), 'now()']),
    ['owner_id', 'artist_id'])

  // Aggregation preserves first-identity insertion order and last-row metadata.
  // Match that legacy loop's card precedence while ensuring each nonnull Scryfall
  // ID is affected only once by ON CONFLICT, even across multiple finishes/sets.
  const cards = [...new Map(cardRows.map(row => [row['Scryfall ID'] ? `scryfall:${row['Scryfall ID']}` : `printing:${sourceRowId(row)}`, row])).values()]
  const cardFields = ['id', 'artist_id', 'scryfall_id', 'card_name', 'scryfall_url', 'card_image_url', 'art_crop_url', 'updated_at']
  const cardStage = stage('artist_cards', [...cardFields, 'import_source_row_id'], cards.map(row => [
    `coalesce((select id from public.artist_cards where scryfall_id = ${sql(row['Scryfall ID'])}), (select card_id from public.artist_card_printings where source_row_id = ${sql(sourceRowId(row))} and ${sql(row['Scryfall ID'])} is null), gen_random_uuid())`,
    artistId(row.Artist), sql(row['Scryfall ID']), sql(row.Name), sql(scryfallUrl(row)), sql(row['Card Image URL']), sql(row['Art Crop URL']), 'now()', sql(sourceRowId(row)),
  ]), { import_source_row_id: 'text' })
  for (const [predicate, conflict] of [['is not null', 'scryfall_id'], ['is null', 'id']]) {
    lines.push(`insert into public.artist_cards (${cardFields.join(', ')})
select ${cardFields.join(', ')} from ${cardStage} where scryfall_id ${predicate}
on conflict (${conflict}) do update set
  ${cardFields.filter(field => field !== 'id').map(field => `${field} = excluded.${field}`).join(',\n  ')};`)
  }
  // Null Scryfall IDs use the exact printing key, never a nonunique card name.
  const cardId = row => row['Scryfall ID']
    ? `(select id from public.artist_cards where scryfall_id = ${sql(row['Scryfall ID'])})`
    : `(select id from ${cardStage} where import_source_row_id = ${sql(sourceRowId(row))} and scryfall_id is null)`
  const printingFields = ['set_code', 'set_name', 'collector_number', 'foil', 'rarity',
    'market_price_usd', 'market_price_source_field', 'scryfall_usd', 'scryfall_usd_foil', 'scryfall_usd_etched',
    'scryfall_eur', 'scryfall_eur_foil', 'scryfall_mtgo_tix', 'price_as_of', 'price_notes', 'printing_type', 'special_treatments']
  const printingSourceFields = ['Set code', 'Set name', 'Collector number', 'Foil', 'Rarity',
    'Market Price USD', 'Market Price Source Field', 'Scryfall USD', 'Scryfall USD Foil', 'Scryfall USD Etched',
    'Scryfall EUR', 'Scryfall EUR Foil', 'Scryfall MTGO TIX', 'Price As Of', 'Price Notes', 'Printing Type', 'Special Treatment']
  upsert('artist_card_printings', ['card_id', 'source_row_id', ...printingFields, 'updated_at'],
    cardRows.map(row => [cardId(row), sql(sourceRowId(row)), ...printingFields.map((field, i) =>
      field === 'special_treatments' ? sqlTextArray(row[printingSourceFields[i]]) :
        /^(market_price_usd|scryfall_)/.test(field) ? sqlNumber(row[printingSourceFields[i]]) : sql(row[printingSourceFields[i]])), 'now()']),
    ['source_row_id'])
  upsert('artist_collection_inventory',
    ['owner_id', 'printing_id', 'quantity', 'local_image_filename', 'local_image_found', 'source_batch_id', 'source_record_ordinals', 'source_observed_at', 'imported_at', 'provenance_status'],
    cardRows.map(row => [owner, printingId(row), sqlInt(row.Quantity), sql(row['Image Filename']), row['Image Filename'] ? 'true' : 'false', cardBatch, ordinal(row), 'null', 'now()', "'source_linked'"]),
    ['owner_id', 'printing_id'])
  const assessmentFields = ['card_art_category', 'surreal_abstract_focus', 'card_art_confidence', 'card_art_description',
    'visual_art_category', 'visual_match_for_taste', 'visual_confidence', 'visual_assessment_notes', 'metadata_vs_visual', 'card_art_basis', 'card_art_tags', 'assessment_source']
  const content = table => `row(${assessmentFields.map(field => `${table}.${field}`).join(', ')})`
  upsert('artist_card_assessments',
    ['owner_id', 'printing_id', 'source_batch_id', 'source_record_ordinals', 'source_assessed_at', ...assessmentFields, 'updated_at'],
    cardRows.map(row => [owner, printingId(row), cardBatch, ordinal(row), 'null',
      sql(firstPresent(row['Art Taxonomy v2'], row['Card Art Category'])),
      sql(firstPresent(row['Abstract/Surreal/Disproportion Fit'], row['Surreal/Abstract Focus'])),
      sql(firstPresent(row['Taxonomy v2 Confidence'], row['Card Art Confidence'])),
      sql(firstPresent(row['Taxonomy v2 Description'], row['Card Art Description'])),
      ...['Visual Art Category', 'Visual Match for Your Taste', 'Visual Confidence', 'Visual Assessment Notes', 'Metadata vs Visual', 'Card Art Basis'].map(field => sql(row[field])),
      sqlTextArray(row['Card Art Tags']), "'chatgpt_v2_artist_card_taxonomy'", 'now()']),
    ['owner_id', 'printing_id'], {
      assessed_at: `case when ${content('artist_card_assessments')} is distinct from ${content('excluded')} then now() else artist_card_assessments.assessed_at end`,
    })
  lines.push('commit;')
  return { sql: `${lines.join('\n')}\n`, artistCount: artists.length, printingCount: cardRows.length }
}

// Reconciliation deliberately excludes shared metadata and existing assessment text/times.
export function buildArtistInventoryReconciliation(cardCsv, profileCsv, options = {}) {
  // Reuse the public builder's owner/source validation without writing an artifact.
  buildArtistCardCatalogSeed('', '', options)
  const { ownerId, cardSource, profileSource } = options
  const rows = parseCsv(cardCsv).map((row, index) => ({ ...row, sourceRecordOrdinals: [index + 1] }))
    .filter(row => row.Artist && row.Name)
  const printings = aggregatePrintingQuantities(rows)
  if (!printings.length) throw new Error('Cannot reconcile an empty inventory snapshot')
  const profiles = parseCsv(profileCsv).map((row, index) => ({ ...row, ordinal: index + 1 })).filter(row => row.artist_name)
  const lastRows = [...new Map(rows.map(row => [sourceRowId(row), row])).values()]
  const lastHash = sha256(lastRows.map(row => {
    const quantity = Number.parseInt(sqlInt(row.Quantity), 10)
    return `${sourceRowId(row)}:${Number.isFinite(quantity) ? quantity : 1}`
  }).sort().join('\n'))
  const total = printings.reduce((sum, row) => sum + row.Quantity, 0)
  const owner = `${sql(ownerId)}::uuid`
  const batch = (source, csv) => `(select id from public.artist_import_batches where owner_id = ${owner} and source_path = ${sql(source.path)} and source_sha256 = ${sql(sha256(csv))})`
  const cardBatch = batch(cardSource, cardCsv)
  const profileBatch = batch(profileSource, profileCsv)
  const ordinal = row => `array[${row.sourceRecordOrdinals.join(',')}]::integer[]`
  return { printingCount: printings.length, quantity: total, lastRowQuantityHash: lastHash, sql: `begin;
lock table public.artist_collection_inventory, public.artist_card_assessments, public.artist_collection_profiles in share row exclusive mode;
lock table public.artist_card_printings, public.artist_signing_interests, public.artist_import_batches in share mode;
create temporary table artist_reconcile_source (source_row_id text primary key, quantity integer, local_image_filename text, source_record_ordinals integer[]) on commit drop;
insert into artist_reconcile_source values
${printings.map(row => `(${sql(sourceRowId(row))}, ${sqlInt(row.Quantity)}, ${sql(row['Image Filename'])}, ${ordinal(row)})`).join(',\n')};
create temporary table artist_reconcile_baseline on commit drop as
select (select md5(string_agg(id::text || ':' || source_row_id, ',' order by id)) from public.artist_card_printings) as printings,
  (select md5(string_agg(row_to_json(s)::text, ',' order by id)) from public.artist_signing_interests s) as signing;
do $$ begin
  if ${cardBatch} is null or ${profileBatch} is null then raise exception 'Exact owner/source/hash batches are required'; end if;
  if (select count(*) from public.artist_collection_inventory where owner_id = ${owner}) <> ${printings.length}
    or (select count(*) from artist_reconcile_source s join public.artist_card_printings p using(source_row_id)
      join public.artist_collection_inventory i on i.printing_id = p.id and i.owner_id = ${owner}) <> ${printings.length}
    or (select count(*) from artist_reconcile_source s join public.artist_card_printings p using(source_row_id)
      join public.artist_card_assessments a on a.printing_id = p.id and a.owner_id = ${owner}) <> ${printings.length} then
    raise exception 'Inventory/assessment identity mismatch'; end if;
  if (select encode(sha256(convert_to(string_agg(p.source_row_id || ':' || i.quantity::text, E'\\n' order by p.source_row_id collate "C"), 'UTF8')), 'hex')
    from public.artist_collection_inventory i join public.artist_card_printings p on p.id = i.printing_id
    where i.owner_id = ${owner}) <> ${sql(lastHash)} then raise exception 'Hosted last-row quantity snapshot mismatch'; end if;
end $$;
update public.artist_collection_inventory i set quantity = s.quantity, local_image_filename = s.local_image_filename,
  local_image_found = s.local_image_filename is not null, source_batch_id = ${cardBatch},
  source_record_ordinals = s.source_record_ordinals, source_observed_at = null, imported_at = now(), provenance_status = 'source_linked'
from artist_reconcile_source s join public.artist_card_printings p using(source_row_id)
where i.owner_id = ${owner} and i.printing_id = p.id;
update public.artist_card_assessments a set source_batch_id = ${cardBatch}, source_record_ordinals = s.source_record_ordinals
from artist_reconcile_source s join public.artist_card_printings p using(source_row_id)
where a.owner_id = ${owner} and a.printing_id = p.id;
${profiles.length ? `update public.artist_collection_profiles cp set source_batch_id = ${profileBatch}, source_record_ordinals = array[s.ordinal]::integer[]
from (values ${profiles.map(row => `(${sql(row.artist_name)}, ${row.ordinal})`).join(',\n')}) as s(artist_name, ordinal)
join public.artists a on a.canonical_name = s.artist_name
where cp.owner_id = ${owner} and cp.artist_id = a.id;` : ''}
do $$ begin
  if (select count(*) from public.artist_collection_inventory where owner_id = ${owner} and source_batch_id = ${cardBatch} and provenance_status = 'source_linked') <> ${printings.length}
    or (select count(*) from public.artist_card_assessments where owner_id = ${owner} and source_batch_id = ${cardBatch}) <> ${printings.length}
    or (select sum(quantity) from public.artist_collection_inventory where owner_id = ${owner}) <> ${total}
    or exists(select 1 from artist_reconcile_source s join public.artist_card_printings p using(source_row_id)
      join public.artist_collection_inventory i on i.printing_id = p.id and i.owner_id = ${owner}
      where i.quantity is distinct from s.quantity or i.source_record_ordinals is distinct from s.source_record_ordinals)
    or (select printings from artist_reconcile_baseline) is distinct from
       (select md5(string_agg(id::text || ':' || source_row_id, ',' order by id)) from public.artist_card_printings)
    or (select signing from artist_reconcile_baseline) is distinct from
       (select md5(string_agg(row_to_json(s)::text, ',' order by id)) from public.artist_signing_interests s) then
    raise exception 'Reconciliation preservation/readback guard failed'; end if;
end $$;
commit;
` }
}

export function parseSeedArgs(args) {
  const parsed = { reconcileOnly: false }
  const seen = new Set()
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (!['--owner', '--cards', '--profiles', '--reconcile-only'].includes(arg) || seen.has(arg)) {
      throw new Error(`Unknown or duplicate option: ${arg}`)
    }
    seen.add(arg)
    if (arg === '--reconcile-only') parsed.reconcileOnly = true
    else {
      const value = args[++i]
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`)
      parsed[arg.slice(2)] = value
    }
  }
  if (!parsed.owner) throw new Error('Usage: pnpm artist:seed-sql [--reconcile-only] --owner <UUID> [--cards <CSV>] [--profiles <CSV>]')
  return parsed
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
const args = parseSeedArgs(process.argv.slice(2))
const { reconcileOnly } = args
const selectedCards = args.cards ? path.resolve(args.cards) : cardCsvPath
const selectedProfiles = args.profiles ? path.resolve(args.profiles) : profileCsvPath
const cardCsv = readText(selectedCards)
const profileCsv = readText(selectedProfiles)
const seed = (reconcileOnly ? buildArtistInventoryReconciliation : buildArtistCardCatalogSeed)(cardCsv, profileCsv, {
  ownerId: args.owner,
  cardSource: { name: path.basename(selectedCards), path: path.relative(repoRoot, selectedCards).replaceAll('\\', '/') },
  profileSource: { name: path.basename(selectedProfiles), path: path.relative(repoRoot, selectedProfiles).replaceAll('\\', '/') },
})
const targetPath = reconcileOnly ? path.join(workingDir, 'artist_inventory_reconciliation.sql') : outputPath
fs.writeFileSync(targetPath, seed.sql)
console.log(`Artist/card SQL written: ${path.relative(repoRoot, targetPath)}`)
if (!reconcileOnly) console.log(`Artists in catalog: ${seed.artistCount}`)
console.log('Attendance unchanged: card/profile imports do not write appearances.')
console.log(`Card printings: ${seed.printingCount}`)
for (const [label, sourcePath, sourceCsv] of [['Cards', selectedCards, cardCsv], ['Profiles', selectedProfiles, profileCsv]]) {
  console.log(`${label} source: ${sourcePath}`)
  console.log(`${label} SHA-256: ${sha256(sourceCsv)}`)
  const rows = parseCsv(sourceCsv)
  const eligible = rows.filter(row => label === 'Cards' ? row.Artist && row.Name : row.artist_name).length
  console.log(`${label} records: ${rows.length} parsed, ${eligible} eligible, ${rows.length - eligible} excluded`)
}
}
