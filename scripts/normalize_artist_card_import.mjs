import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const sourceDir = path.join(repoRoot, 'local-assets', 'artist-card-images')
const quarantineDir = path.join(repoRoot, 'local-assets', 'artist-card-quarantine')
const outputDir = path.join(repoRoot, 'local-assets', 'artist-card-working')

const v2CardCsvPath = path.join(outputDir, 'ManaBox_Collection_Art_Taxonomy_v2_with_Prices.csv')
const cardCsvPath = fs.existsSync(v2CardCsvPath)
  ? v2CardCsvPath
  : path.join(quarantineDir, 'ManaBox_Collection_Card_Art_Analysis_Visual_Revision.csv')
const artistCsvPath = path.join(quarantineDir, 'ManaBox_Artist_Style_Assessment.csv')

function parseCsv(text) {
  const { headers, rows } = parseCsvDocument(text)
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function parseCsvDocument(text) {
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
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''))
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''))
    rows.push(row)
  }

  const [headers = [], ...body] = rows.filter(item => item.some(value => value.trim().length))
  return {
    headers,
    rows: body,
  }
}

function csvEscape(value) {
  const text = value == null ? '' : String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function writeCsv(filePath, rows, columns) {
  const text = [
    columns.join(','),
    ...rows.map(row => columns.map(column => csvEscape(row[column])).join(',')),
  ].join('\n')
  fs.writeFileSync(filePath, `${text}\n`)
}

function normalizeToken(value) {
  return (value ?? '').trim()
}

function normalizeEnum(value) {
  return normalizeToken(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown'
}

function matchRank(value) {
  const normalized = normalizeEnum(value)
  if (normalized.includes('strong')) return 3
  if (normalized.includes('possible')) return 2
  if (normalized === 'yes') return 2
  if (normalized === 'low' || normalized === 'no') return 0
  return 1
}

function styleRank(row) {
  const canonicalStyle = `${row.art_taxonomy_v2 ?? row.card_style_category ?? row.visual_style_category ?? ''}`.toLowerCase()
  return Math.max(
    matchRank(row.taste_match),
    matchRank(row.taxonomy_v2_fit),
    matchRank(row.abstract_surreal_focus),
    matchRank(canonicalStyle.includes('abstract') || canonicalStyle.includes('surreal') ? 'possible' : 'no'),
  )
}

function splitList(value) {
  return normalizeToken(value).split(';').map(item => item.trim()).filter(Boolean).join('; ')
}

function splitFilenames(value) {
  return normalizeToken(value).split(';').map(item => item.trim()).filter(Boolean)
}

function stableCardId(row) {
  return [
    row['Scryfall ID'],
    row['Set code'],
    row['Collector number'],
    row['Foil'],
  ].map(normalizeEnum).join('__')
}

function maybeNumber(value) {
  const number = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(number) ? number : 0
}

function main() {
  for (const requiredPath of [cardCsvPath, artistCsvPath]) {
    if (!fs.existsSync(requiredPath)) throw new Error(`Missing source file: ${requiredPath}`)
  }
  fs.mkdirSync(outputDir, { recursive: true })

  const cardCsvText = fs.readFileSync(cardCsvPath, 'utf8')
  const cardDocument = parseCsvDocument(cardCsvText)
  const cardRows = cardDocument.rows.map(values => Object.fromEntries(cardDocument.headers.map((header, index) => [header, values[index] ?? ''])))
  const artistRows = parseCsv(fs.readFileSync(artistCsvPath, 'utf8'))
  const imageFiles = new Set(fs.readdirSync(path.join(sourceDir, 'original')).filter(name => /\.(jpe?g|png|webp)$/i.test(name)))

  const artistProfiles = artistRows.map(row => ({
    artist_name: normalizeToken(row.Artist),
    collection_card_count: maybeNumber(row['Collection Rows']),
    unique_collection_printings: maybeNumber(row['Unique Collection Printings']),
    mtg_catalog_printings_found: maybeNumber(row['MTG Catalog Printings Found']),
    earliest_mtg_credit_year: normalizeToken(row['Earliest MTG Credit Year']),
    latest_mtg_credit_year: normalizeToken(row['Latest MTG Credit Year']),
    predominant_style: normalizeToken(row['Predominant Style Assessment']),
    abstract_surreal_tendency: normalizeToken(row['Abstract/Surreal Tendency']),
    style_confidence: normalizeToken(row['Style Confidence']),
    style_description: normalizeToken(row['Style Description']),
    collection_visual_strong_matches: maybeNumber(row['Collection Visual Strong Matches']),
    collection_visual_possible_matches: maybeNumber(row['Collection Visual Possible Matches']),
    representative_abstract_surreal_cards: normalizeToken(row['Representative Abstract/Surreal Cards in Collection']),
    historical_style_signals: normalizeToken(row['Historical Style Signals']),
    sample_mtg_cards: normalizeToken(row['Sample MTG Cards']),
    attending_status: 'unknown',
    priority_reason: '',
    signing_interest_status: 'not_reviewed',
    signing_notes: '',
  })).filter(row => row.artist_name)

  const artistProfileByName = new Map(artistProfiles.map(row => [row.artist_name.toLowerCase(), row]))

  const cardIdCounts = new Map()
  const cardCandidates = cardRows.map(row => {
    const artistProfile = artistProfileByName.get(normalizeToken(row.Artist).toLowerCase())
    const imageFilename = normalizeToken(row['Image Filename'])
    const imageNames = splitFilenames(imageFilename)
    const imageFound = imageNames.length > 0 && imageNames.every(name => imageFiles.has(name))
    const baseCandidateId = stableCardId(row)
    const priorCount = cardIdCounts.get(baseCandidateId) ?? 0
    cardIdCounts.set(baseCandidateId, priorCount + 1)
    const candidateId = priorCount === 0 ? baseCandidateId : `${baseCandidateId}__copy_${priorCount + 1}`
    return {
      candidate_id: candidateId,
      card_name: normalizeToken(row.Name),
      artist_name: normalizeToken(row.Artist),
      set_code: normalizeToken(row['Set code']),
      set_name: normalizeToken(row['Set name']),
      collector_number: normalizeToken(row['Collector number']),
      foil: normalizeToken(row.Foil),
      rarity: normalizeToken(row.Rarity),
      quantity: maybeNumber(row.Quantity),
      scryfall_id: normalizeToken(row['Scryfall ID']),
      printing_type: normalizeToken(row['Printing Type']),
      special_treatment: splitList(row['Special Treatment']),
      art_taxonomy_v2: normalizeToken(row['Art Taxonomy v2']),
      taxonomy_v2_fit: normalizeToken(row['Abstract/Surreal/Disproportion Fit']),
      taxonomy_v2_confidence: normalizeToken(row['Taxonomy v2 Confidence']),
      taxonomy_v2_description: normalizeToken(row['Taxonomy v2 Description']),
      review_for_user_taste: normalizeToken(row['Review for User Taste']),
      card_style_category: normalizeToken(row['Card Art Category']),
      visual_style_category: normalizeToken(row['Visual Art Category']),
      taste_match: normalizeToken(row['Visual Match for Your Taste']),
      abstract_surreal_focus: normalizeToken(row['Surreal/Abstract Focus']),
      card_art_confidence: normalizeToken(row['Card Art Confidence']),
      visual_confidence: normalizeToken(row['Visual Confidence']),
      style_notes: [row['Card Art Description'], row['Visual Assessment Notes']]
        .map(normalizeToken)
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index)
        .join(' '),
      card_art_basis: normalizeToken(row['Card Art Basis']),
      card_art_tags: normalizeToken(row['Card Art Tags']),
      card_image_url: normalizeToken(row['Card Image URL']).replace(/\s+/g, ''),
      art_crop_url: normalizeToken(row['Art Crop URL']).replace(/\s+/g, ''),
      local_image_filename: imageFilename,
      local_image_count: imageNames.length,
      local_image_found: imageFound ? 'yes' : 'no',
      artist_abstract_surreal_tendency: artistProfile?.abstract_surreal_tendency ?? '',
      artist_style_summary: artistProfile?.predominant_style ?? '',
      review_rank: styleRank({
        taste_match: row['Visual Match for Your Taste'],
        taxonomy_v2_fit: row['Abstract/Surreal/Disproportion Fit'],
        art_taxonomy_v2: row['Art Taxonomy v2'],
        card_style_category: row['Card Art Category'],
        abstract_surreal_focus: row['Surreal/Abstract Focus'],
        visual_style_category: row['Visual Art Category'],
      }),
      bring_status: 'not_reviewed',
      bring_reason: '',
    }
  }).filter(row => row.card_name && row.artist_name)

  const targetArtists = artistProfiles
    .filter(row => matchRank(row.abstract_surreal_tendency) >= 2 || row.collection_visual_strong_matches > 0 || row.collection_visual_possible_matches > 0)
    .map(row => {
      const cards = cardCandidates
        .filter(card => card.artist_name.toLowerCase() === row.artist_name.toLowerCase())
        .sort((a, b) => b.review_rank - a.review_rank || b.quantity - a.quantity)
        .slice(0, 8)
      return {
        artist_name: row.artist_name,
        attending_status: row.attending_status,
        interest_status: 'not_reviewed',
        target_cards_count: cards.length,
        top_card_names: cards.map(card => card.card_name).join('; '),
        priority_reason: [
          row.abstract_surreal_tendency && `${row.abstract_surreal_tendency} abstract/surreal tendency`,
          row.collection_visual_strong_matches ? `${row.collection_visual_strong_matches} strong collection match(es)` : '',
          row.collection_visual_possible_matches ? `${row.collection_visual_possible_matches} possible collection match(es)` : '',
        ].filter(Boolean).join('; '),
        signing_notes: '',
      }
    })
    .sort((a, b) => b.target_cards_count - a.target_cards_count || a.artist_name.localeCompare(b.artist_name))

  const priorityReview = cardCandidates
    .filter(row => row.review_rank >= 2 || matchRank(row.artist_abstract_surreal_tendency) >= 2)
    .sort((a, b) => b.review_rank - a.review_rank || a.artist_name.localeCompare(b.artist_name) || a.card_name.localeCompare(b.card_name))
    .slice(0, 500)

  const artistColumns = [
    'artist_name',
    'collection_card_count',
    'unique_collection_printings',
    'mtg_catalog_printings_found',
    'earliest_mtg_credit_year',
    'latest_mtg_credit_year',
    'predominant_style',
    'abstract_surreal_tendency',
    'style_confidence',
    'style_description',
    'collection_visual_strong_matches',
    'collection_visual_possible_matches',
    'representative_abstract_surreal_cards',
    'historical_style_signals',
    'sample_mtg_cards',
    'attending_status',
    'priority_reason',
    'signing_interest_status',
    'signing_notes',
  ]
  const cardColumns = [
    'candidate_id',
    'card_name',
    'artist_name',
    'set_code',
    'set_name',
    'collector_number',
    'foil',
    'rarity',
    'quantity',
    'scryfall_id',
    'printing_type',
    'special_treatment',
    'art_taxonomy_v2',
    'taxonomy_v2_fit',
    'taxonomy_v2_confidence',
    'taxonomy_v2_description',
    'review_for_user_taste',
    'card_style_category',
    'visual_style_category',
    'taste_match',
    'abstract_surreal_focus',
    'card_art_confidence',
    'visual_confidence',
    'style_notes',
    'card_art_basis',
    'card_art_tags',
    'card_image_url',
    'art_crop_url',
    'local_image_filename',
    'local_image_count',
    'local_image_found',
    'artist_abstract_surreal_tendency',
    'artist_style_summary',
    'review_rank',
    'bring_status',
    'bring_reason',
  ]
  const targetColumns = ['artist_name', 'attending_status', 'interest_status', 'target_cards_count', 'top_card_names', 'priority_reason', 'signing_notes']

  writeCsv(path.join(outputDir, 'artist_profiles.normalized.csv'), artistProfiles, artistColumns)
  writeCsv(path.join(outputDir, 'artist_card_candidates.normalized.csv'), cardCandidates, cardColumns)
  writeCsv(path.join(outputDir, 'artist_signing_targets.seed.csv'), targetArtists, targetColumns)
  writeCsv(path.join(outputDir, 'priority_review.csv'), priorityReview, cardColumns)

  const missingImageRows = cardRows.filter(row => {
    const imageNames = splitFilenames(row['Image Filename'])
    return imageNames.length > 0 && !imageNames.every(name => imageFiles.has(name))
  })
  writeCsv(path.join(outputDir, 'missing_image_requests.original_format.csv'), missingImageRows, cardDocument.headers)

  const summary = {
    generated_at: new Date().toISOString(),
    source_files: {
      cards: path.relative(repoRoot, cardCsvPath),
      artists: path.relative(repoRoot, artistCsvPath),
    },
    output_dir: path.relative(repoRoot, outputDir),
    quarantine_dir: path.relative(repoRoot, quarantineDir),
    counts: {
      source_card_rows: cardRows.length,
      normalized_card_candidates: cardCandidates.length,
      source_artist_rows: artistRows.length,
      normalized_artist_profiles: artistProfiles.length,
      image_files: imageFiles.size,
      card_rows_missing_local_image: cardCandidates.filter(row => row.local_image_found !== 'yes').length,
      missing_image_request_rows: missingImageRows.length,
      signing_target_seed_artists: targetArtists.length,
      priority_review_rows: priorityReview.length,
      strong_visual_matches: cardCandidates.filter(row => row.taste_match === 'Strong Match').length,
      possible_visual_matches: cardCandidates.filter(row => row.taste_match === 'Possible Match').length,
      abstract_or_surreal_cards: cardCandidates.filter(row => /abstract|surreal/i.test(row.art_taxonomy_v2 || row.card_style_category || row.visual_style_category)).length,
    },
    notes: [
      'Generated outputs are local-only and ignored by Git through local-assets/.',
      'Original enriched CSVs are quarantined under local-assets/artist-card-quarantine and should not be app inputs.',
      'The normalized files preserve rich assessment prose while collapsing redundant source columns.',
      'attending_status, signing_interest_status, and bring_status are placeholders for later app workflow.',
    ],
  }
  fs.writeFileSync(path.join(outputDir, 'import_summary.json'), `${JSON.stringify(summary, null, 2)}\n`)

  console.log(JSON.stringify(summary, null, 2))
}

main()
