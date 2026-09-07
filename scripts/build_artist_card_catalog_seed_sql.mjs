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

function sourceRowId(row) {
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
const profileRows = withOrdinals(parseCsv(profileCsv)).filter(row => row.artist_name)
const batchId = (source, csv) => `(select id from public.artist_import_batches where owner_id = ${sql(ownerId)}::uuid and source_path = ${sql(source.path)} and source_sha256 = ${sql(sha256(csv))})`
const cardBatchId = batchId(cardSource, cardCsv)
const profileBatchId = batchId(profileSource, profileCsv)
const ordinalsSql = row => `array[${row.sourceRecordOrdinals.join(', ')}]::integer[]`
const assessmentFields = ['card_art_category', 'surreal_abstract_focus', 'card_art_confidence',
  'card_art_description', 'visual_art_category', 'visual_match_for_taste', 'visual_confidence',
  'visual_assessment_notes', 'metadata_vs_visual', 'card_art_basis', 'card_art_tags', 'assessment_source']
const assessmentContent = table => `row(${assessmentFields.map(field => `${table}.${field}`).join(', ')})`
const profilesByArtist = new Map(profileRows.map(row => [row.artist_name, row]))
const artistsFromCatalog = [
  ...new Set([
    ...cardRows.map(row => row.Artist),
    ...profileRows.map(row => row.artist_name),
  ]),
].sort((a, b) => a.localeCompare(b))
const lines = []

lines.push('-- Generated by scripts/build_artist_card_catalog_seed_sql.mjs')
lines.push('-- Source CSVs remain ignored import evidence; canonical facts live in Supabase tables.')
lines.push('-- Attendance is maintained separately from card/profile imports; reviewed event evidence is untouched.')
lines.push('begin;')
lines.push(`
insert into public.artist_import_batches (owner_id, source_name, source_path, source_sha256, source_kind, notes)
values
  (${sql(ownerId)}::uuid, ${sql(profileSource.name)}, ${sql(profileSource.path)}, ${sql(sha256(profileCsv))}, 'artist_profiles', 'Owner collection profile import'),
  (${sql(ownerId)}::uuid, ${sql(cardSource.name)}, ${sql(cardSource.path)}, ${sql(sha256(cardCsv))}, 'card_catalog', 'Owner inventory and assessment import')
on conflict (owner_id, source_path, source_sha256) do update set imported_at = now(), source_name = excluded.source_name, notes = excluded.notes;
`)

for (const artist of artistsFromCatalog) {
  const profile = profilesByArtist.get(artist) ?? {}
  lines.push(`
insert into public.artists (
  canonical_name, display_name, scryfall_search_url, predominant_style, abstract_surreal_tendency,
  style_confidence, style_description,
  mtg_catalog_printings_found, earliest_mtg_credit_year, latest_mtg_credit_year,
  historical_style_signals, sample_mtg_cards, updated_at
) values (
  ${sql(artist)}, ${sql(artist)}, ${sql(`https://scryfall.com/search?as=grid&order=name&q=%28game%3Apaper%29+artist%3A${encodeURIComponent(artist.split(' ').at(-1) ?? artist)}+prefer%3Abest`)},
  ${sql(profile.predominant_style)}, ${sql(profile.abstract_surreal_tendency)}, ${sql(profile.style_confidence)},
  ${sql(profile.style_description)},
  ${sqlInt(profile.mtg_catalog_printings_found)}, ${sqlInt(profile.earliest_mtg_credit_year)}, ${sqlInt(profile.latest_mtg_credit_year)},
  ${sql(profile.historical_style_signals)}, ${sql(profile.sample_mtg_cards)}, now()
)
on conflict (canonical_name) do update set
  display_name = excluded.display_name,
  scryfall_search_url = excluded.scryfall_search_url,
  predominant_style = excluded.predominant_style,
  abstract_surreal_tendency = excluded.abstract_surreal_tendency,
  style_confidence = excluded.style_confidence,
  style_description = excluded.style_description,
  mtg_catalog_printings_found = excluded.mtg_catalog_printings_found,
  earliest_mtg_credit_year = excluded.earliest_mtg_credit_year,
  latest_mtg_credit_year = excluded.latest_mtg_credit_year,
  historical_style_signals = excluded.historical_style_signals,
  sample_mtg_cards = excluded.sample_mtg_cards,
  updated_at = now();
`)
  if (profile.sourceRecordOrdinals) lines.push(`
insert into public.artist_collection_profiles (
  owner_id, artist_id, collection_card_count, unique_collection_printings, source_batch_id, source_record_ordinals, imported_at
)
select ${sql(ownerId)}::uuid, id, ${sqlInt(profile.collection_card_count)}, ${sqlInt(profile.unique_collection_printings)},
  ${profileBatchId}, ${ordinalsSql(profile)}, now()
from public.artists where canonical_name = ${sql(artist)}
on conflict (owner_id, artist_id) do update set
  collection_card_count = excluded.collection_card_count,
  unique_collection_printings = excluded.unique_collection_printings,
  source_batch_id = excluded.source_batch_id,
  source_record_ordinals = excluded.source_record_ordinals,
  imported_at = now();
`)
}

for (const row of cardRows) {
  const rowId = sourceRowId(row)
  lines.push(`
with artist_row as (
  select id from public.artists where canonical_name = ${sql(row.Artist)}
), card_upsert as (
  insert into public.artist_cards (
    artist_id, scryfall_id, card_name, scryfall_url, card_image_url, art_crop_url, updated_at
  )
  select artist_row.id, ${sql(row['Scryfall ID'])}, ${sql(row.Name)}, ${sql(scryfallUrl(row))},
    ${sql(row['Card Image URL'])}, ${sql(row['Art Crop URL'])}, now()
  from artist_row
  on conflict (scryfall_id) do update set
    artist_id = excluded.artist_id,
    card_name = excluded.card_name,
    scryfall_url = excluded.scryfall_url,
    card_image_url = excluded.card_image_url,
    art_crop_url = excluded.art_crop_url,
    updated_at = now()
  returning id
), printing_upsert as (
  insert into public.artist_card_printings (
    card_id, source_row_id, set_code, set_name, collector_number, foil, rarity,
    market_price_usd, market_price_source_field, scryfall_usd, scryfall_usd_foil,
    scryfall_usd_etched, scryfall_eur, scryfall_eur_foil, scryfall_mtgo_tix,
    price_as_of, price_notes, printing_type, special_treatments, updated_at
  )
  select card_upsert.id, ${sql(rowId)}, ${sql(row['Set code'])}, ${sql(row['Set name'])},
    ${sql(row['Collector number'])}, ${sql(row.Foil)}, ${sql(row.Rarity)},
    ${sqlNumber(row['Market Price USD'])}, ${sql(row['Market Price Source Field'])},
    ${sqlNumber(row['Scryfall USD'])}, ${sqlNumber(row['Scryfall USD Foil'])}, ${sqlNumber(row['Scryfall USD Etched'])},
    ${sqlNumber(row['Scryfall EUR'])}, ${sqlNumber(row['Scryfall EUR Foil'])}, ${sqlNumber(row['Scryfall MTGO TIX'])},
    ${sql(row['Price As Of'])}, ${sql(row['Price Notes'])}, ${sql(row['Printing Type'])},
    ${sqlTextArray(row['Special Treatment'])}, now()
  from card_upsert
  on conflict (source_row_id) do update set
    card_id = excluded.card_id,
    set_code = excluded.set_code,
    set_name = excluded.set_name,
    collector_number = excluded.collector_number,
    foil = excluded.foil,
    rarity = excluded.rarity,
    market_price_usd = excluded.market_price_usd,
    market_price_source_field = excluded.market_price_source_field,
    scryfall_usd = excluded.scryfall_usd,
    scryfall_usd_foil = excluded.scryfall_usd_foil,
    scryfall_usd_etched = excluded.scryfall_usd_etched,
    scryfall_eur = excluded.scryfall_eur,
    scryfall_eur_foil = excluded.scryfall_eur_foil,
    scryfall_mtgo_tix = excluded.scryfall_mtgo_tix,
    price_as_of = excluded.price_as_of,
    price_notes = excluded.price_notes,
    printing_type = excluded.printing_type,
    special_treatments = excluded.special_treatments,
    updated_at = now()
  returning id
), inventory_upsert as (
  insert into public.artist_collection_inventory (
    owner_id, printing_id, quantity, local_image_filename, local_image_found,
    source_batch_id, source_record_ordinals, source_observed_at, imported_at, provenance_status
  )
  select ${sql(ownerId)}::uuid, id, ${sqlInt(row.Quantity)}, ${sql(row['Image Filename'])}, ${row['Image Filename'] ? 'true' : 'false'},
    ${cardBatchId}, ${ordinalsSql(row)}, null, now(), 'source_linked'
  from printing_upsert
  on conflict (owner_id, printing_id) do update set
    quantity = excluded.quantity,
    local_image_filename = excluded.local_image_filename,
    local_image_found = excluded.local_image_found,
    source_batch_id = excluded.source_batch_id,
    source_record_ordinals = excluded.source_record_ordinals,
    source_observed_at = excluded.source_observed_at,
    imported_at = now(),
    provenance_status = excluded.provenance_status
)
insert into public.artist_card_assessments (
  owner_id, printing_id, source_batch_id, source_record_ordinals, source_assessed_at,
  card_art_category, surreal_abstract_focus, card_art_confidence,
  card_art_description, visual_art_category, visual_match_for_taste, visual_confidence,
  visual_assessment_notes, metadata_vs_visual, card_art_basis, card_art_tags, assessment_source, updated_at
)
select ${sql(ownerId)}::uuid, printing_upsert.id, ${cardBatchId}, ${ordinalsSql(row)}, null,
  ${sql(firstPresent(row['Art Taxonomy v2'], row['Card Art Category']))}, ${sql(firstPresent(row['Abstract/Surreal/Disproportion Fit'], row['Surreal/Abstract Focus']))},
  ${sql(firstPresent(row['Taxonomy v2 Confidence'], row['Card Art Confidence']))}, ${sql(firstPresent(row['Taxonomy v2 Description'], row['Card Art Description']))}, ${sql(row['Visual Art Category'])},
  ${sql(row['Visual Match for Your Taste'])}, ${sql(row['Visual Confidence'])}, ${sql(row['Visual Assessment Notes'])},
  ${sql(row['Metadata vs Visual'])}, ${sql(row['Card Art Basis'])}, ${sqlTextArray(row['Card Art Tags'])},
  'chatgpt_v2_artist_card_taxonomy', now()
from printing_upsert
on conflict (owner_id, printing_id) do update set
  source_batch_id = excluded.source_batch_id,
  source_record_ordinals = excluded.source_record_ordinals,
  source_assessed_at = excluded.source_assessed_at,
  assessed_at = case when
    ${assessmentContent('artist_card_assessments')}
    is distinct from
    ${assessmentContent('excluded')}
    then now() else artist_card_assessments.assessed_at end,
  card_art_category = excluded.card_art_category,
  surreal_abstract_focus = excluded.surreal_abstract_focus,
  card_art_confidence = excluded.card_art_confidence,
  card_art_description = excluded.card_art_description,
  visual_art_category = excluded.visual_art_category,
  visual_match_for_taste = excluded.visual_match_for_taste,
  visual_confidence = excluded.visual_confidence,
  visual_assessment_notes = excluded.visual_assessment_notes,
  metadata_vs_visual = excluded.metadata_vs_visual,
  card_art_basis = excluded.card_art_basis,
  card_art_tags = excluded.card_art_tags,
  assessment_source = excluded.assessment_source,
  updated_at = now();
`)
}

lines.push('commit;')
return {
  sql: `${lines.join('\n')}\n`,
  artistCount: artistsFromCatalog.length,
  printingCount: cardRows.length,
}
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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
const args = process.argv.slice(2)
const reconcileOnly = args[0] === '--reconcile-only'
if (reconcileOnly) args.shift()
if (args.length !== 2 || args[0] !== '--owner') throw new Error('Usage: pnpm artist:seed-sql [--reconcile-only] --owner <owner UUID>')
const seed = (reconcileOnly ? buildArtistInventoryReconciliation : buildArtistCardCatalogSeed)(readText(cardCsvPath), readText(profileCsvPath), {
  ownerId: args[1],
  cardSource: { name: path.basename(cardCsvPath), path: path.relative(repoRoot, cardCsvPath).replaceAll('\\', '/') },
  profileSource: { name: path.basename(profileCsvPath), path: path.relative(repoRoot, profileCsvPath).replaceAll('\\', '/') },
})
const targetPath = reconcileOnly ? path.join(workingDir, 'artist_inventory_reconciliation.sql') : outputPath
fs.writeFileSync(targetPath, seed.sql)
console.log(`Artist/card SQL written: ${path.relative(repoRoot, targetPath)}`)
if (!reconcileOnly) console.log(`Artists in catalog: ${seed.artistCount}`)
console.log('Attendance unchanged: card/profile imports do not write appearances.')
console.log(`Card printings: ${seed.printingCount}`)
}
