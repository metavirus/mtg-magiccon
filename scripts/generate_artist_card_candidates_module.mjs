import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const normalizedPath = path.join(repoRoot, 'local-assets', 'artist-card-working', 'artist_card_candidates.normalized.csv')
const pricePath = path.join(repoRoot, 'local-assets', 'artist-card-working', 'cards with price.csv')
const outputPath = path.join(repoRoot, 'src', 'data', 'artistCardCandidates.ts')

const pocArtists = new Set(['Cynthia Sheppard', 'Mark Poole', 'Serena Malyon', 'Rebecca Guay'])

function parseCsv(text) {
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
    .filter(values => values.some(value => value.trim()))
    .map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function priceKey(row) {
  return [
    row['Scryfall ID'] ?? row.scryfall_id,
    (row['Set code'] ?? row.set_code ?? '').toLowerCase(),
    row['Collector number'] ?? row.collector_number,
    (row.Foil ?? row.foil ?? '').toLowerCase(),
  ].join('|')
}

function money(value) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? `$${parsed.toFixed(2)}` : '—'
}

function splitTags(value) {
  return String(value ?? '')
    .split(';')
    .map(tag => tag.trim())
    .filter(Boolean)
}

const priceRows = parseCsv(fs.readFileSync(pricePath, 'utf8'))
const prices = new Map()
for (const row of priceRows) {
  const key = priceKey(row)
  const marketPrice = Number.parseFloat(row['Market Price USD'])
  const existing = prices.get(key)
  if (!existing || marketPrice > existing.marketPrice) {
    prices.set(key, {
      marketPrice,
      priceAsOf: row['Price As Of']?.replace('2026-08-19 ', 'Aug 19, 2026 · ') || 'Aug 19, 2026 · Scryfall default-cards bulk',
    })
  }
}

const normalizedRows = parseCsv(fs.readFileSync(normalizedPath, 'utf8'))
const candidatesBeforeDedupe = normalizedRows
  .filter(row => pocArtists.has(row.artist_name))
  .sort((a, b) => {
    const byArtist = a.artist_name.localeCompare(b.artist_name)
    if (byArtist) return byArtist
    const aRank = Number.parseInt(a.review_rank || '999', 10)
    const bRank = Number.parseInt(b.review_rank || '999', 10)
    if (aRank !== bRank) return aRank - bRank
    return a.card_name.localeCompare(b.card_name)
  })
  .map(row => {
    const price = prices.get(priceKey(row))
    const reviewRank = Number.parseInt(row.review_rank || '0', 10)
    const reviewForTaste = reviewRank > 0 || !['no', 'not_reviewed'].includes((row.taste_match || '').toLowerCase())
    return {
      id: row.candidate_id,
      cardName: row.card_name,
      artistName: row.artist_name,
      setCode: row.set_code,
      setName: row.set_name,
      collectorNumber: row.collector_number,
      foil: row.foil,
      rarity: row.rarity,
      quantity: Number.parseInt(row.quantity || '1', 10) || 1,
      marketPrice: price ? money(price.marketPrice) : '—',
      priceAsOf: price?.priceAsOf || 'Aug 19, 2026 · Scryfall default-cards bulk',
      printingType: row.printing_type,
      specialTreatment: row.special_treatment,
      visualStyle: row.art_taxonomy_v2 || row.card_style_category || row.visual_style_category || 'Unclassified',
      abstractSurrealFocus: row.taxonomy_v2_fit || row.abstract_surreal_focus || 'No',
      tasteMatch: row.taste_match || 'No',
      taxonomyConfidence: row.taxonomy_v2_confidence || row.visual_confidence || row.card_art_confidence || 'Review',
      reviewForTaste: reviewForTaste ? 'Yes' : 'No',
      styleNotes: row.taxonomy_v2_description || row.style_notes,
      styleTags: splitTags(row.card_art_tags),
      artCropUrl: row.art_crop_url,
      cardImageUrl: row.card_image_url,
      scryfallUrl: `https://scryfall.com/card/${row.set_code.toLowerCase()}/${row.collector_number}/${slugify(row.card_name)}`,
    }
  })

function parseMoney(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function displayIdentity(candidate) {
  return [
    candidate.cardName.toLowerCase(),
    candidate.artistName.toLowerCase(),
    candidate.setCode.toLowerCase(),
    candidate.collectorNumber.toLowerCase(),
    candidate.cardImageUrl || candidate.artCropUrl,
  ].join('|')
}

const candidateGroups = new Map()
for (const candidate of candidatesBeforeDedupe) {
  const key = displayIdentity(candidate)
  const existing = candidateGroups.get(key)
  if (!existing) {
    candidateGroups.set(key, { ...candidate, _foils: new Set([candidate.foil]), _quantity: candidate.quantity })
    continue
  }
  existing._foils.add(candidate.foil)
  existing._quantity += candidate.quantity
  if (parseMoney(candidate.marketPrice) > parseMoney(existing.marketPrice)) {
    existing.marketPrice = candidate.marketPrice
    existing.priceAsOf = candidate.priceAsOf
  }
  if (!existing.specialTreatment && candidate.specialTreatment) existing.specialTreatment = candidate.specialTreatment
  if (candidate.reviewForTaste === 'Yes') existing.reviewForTaste = 'Yes'
  if (candidate.tasteMatch.toLowerCase().includes('strong')) existing.tasteMatch = candidate.tasteMatch
  existing.styleTags = Array.from(new Set([...(existing.styleTags ?? []), ...(candidate.styleTags ?? [])]))
}

const candidates = Array.from(candidateGroups.values()).map(candidate => {
  const foils = Array.from(candidate._foils).filter(Boolean).sort((a, b) => {
    if (a === 'normal') return -1
    if (b === 'normal') return 1
    return a.localeCompare(b)
  })
  const { _foils, _quantity, ...publicCandidate } = candidate
  return {
    ...publicCandidate,
    foil: foils.join(' + '),
    quantity: _quantity,
  }
})

const output = `// Generated by scripts/generate_artist_card_candidates_module.mjs from local artist-card working CSVs.
// Keep this private POC data local until the artist/card surface is approved for public release.

export const artistCardCandidates = ${JSON.stringify(candidates, null, 2)} as const
`

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, output)
console.log(`Wrote ${candidates.length} artist card candidates to ${path.relative(repoRoot, outputPath)}`)
