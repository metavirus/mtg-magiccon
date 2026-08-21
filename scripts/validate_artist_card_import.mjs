import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const quarantineDir = path.join(repoRoot, 'local-assets', 'artist-card-quarantine')
const workingDir = path.join(repoRoot, 'local-assets', 'artist-card-working')

const files = {
  artistProfiles: path.join(workingDir, 'artist_profiles.normalized.csv'),
  cardCandidates: path.join(workingDir, 'artist_card_candidates.normalized.csv'),
  signingTargets: path.join(workingDir, 'artist_signing_targets.seed.csv'),
  priorityReview: path.join(workingDir, 'priority_review.csv'),
  missingImages: path.join(workingDir, 'missing_image_requests.original_format.csv'),
  missingImageReconciliation: path.join(workingDir, 'missing_image_reconciliation.csv'),
  summary: path.join(workingDir, 'import_summary.json'),
  quarantinedCards: path.join(quarantineDir, 'ManaBox_Collection_Card_Art_Analysis_Visual_Revision.csv'),
  quarantinedArtists: path.join(quarantineDir, 'ManaBox_Artist_Style_Assessment.csv'),
}

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
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
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

  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''))
    rows.push(row)
  }

  const [headers = [], ...body] = rows.filter(item => item.some(value => value.trim().length))
  return body.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

function readCsv(filePath) {
  return parseCsv(fs.readFileSync(filePath, 'utf8'))
}

function fail(message) {
  failures.push(message)
}

const failures = []

for (const [label, filePath] of Object.entries(files)) {
  if (!fs.existsSync(filePath)) fail(`${label} missing: ${path.relative(repoRoot, filePath)}`)
}

const rawCardInOldLocation = path.join(repoRoot, 'local-assets', 'artist-card-images', 'ManaBox_Collection_Card_Art_Analysis_Visual_Revision.csv')
const rawArtistInOldLocation = path.join(repoRoot, 'local-assets', 'artist-card-images', 'ManaBox_Artist_Style_Assessment.csv')
if (fs.existsSync(rawCardInOldLocation) || fs.existsSync(rawArtistInOldLocation)) {
  fail('raw enriched CSV is still in artist-card-images; originals must remain quarantined')
}

if (failures.length === 0) {
  const artists = readCsv(files.artistProfiles)
  const cards = readCsv(files.cardCandidates)
  const targets = readCsv(files.signingTargets)
  const priority = readCsv(files.priorityReview)
  const missingImages = readCsv(files.missingImages)
  const missingImageReconciliation = readCsv(files.missingImageReconciliation)
  const summary = JSON.parse(fs.readFileSync(files.summary, 'utf8'))

  const artistNames = new Set(artists.map(row => row.artist_name.toLowerCase()))
  const cardIds = new Set()

  if (artists.length === 0) fail('artist_profiles.normalized.csv is empty')
  if (cards.length === 0) fail('artist_card_candidates.normalized.csv is empty')
  if (targets.length === 0) fail('artist_signing_targets.seed.csv is empty')
  if (priority.length === 0) fail('priority_review.csv is empty')

  for (const card of cards) {
    if (!artistNames.has(card.artist_name.toLowerCase())) fail(`card candidate has unknown artist: ${card.card_name} / ${card.artist_name}`)
    if (cardIds.has(card.candidate_id)) fail(`duplicate candidate_id: ${card.candidate_id}`)
    cardIds.add(card.candidate_id)
    if (!['yes', 'no'].includes(card.local_image_found)) fail(`invalid local_image_found for ${card.card_name}: ${card.local_image_found}`)
    if (!['not_reviewed', 'maybe', 'bring', 'leave'].includes(card.bring_status)) fail(`invalid bring_status for ${card.card_name}: ${card.bring_status}`)
  }

  for (const target of targets) {
    if (!artistNames.has(target.artist_name.toLowerCase())) fail(`signing target has unknown artist: ${target.artist_name}`)
    if (!['unknown', 'confirmed', 'not_attending'].includes(target.attending_status)) fail(`invalid attending_status for ${target.artist_name}: ${target.attending_status}`)
    if (!['not_reviewed', 'interested', 'priority', 'skip'].includes(target.interest_status)) fail(`invalid interest_status for ${target.artist_name}: ${target.interest_status}`)
  }

  const missingCount = cards.filter(row => row.local_image_found !== 'yes').length
  if (missingCount === 0 && missingImages.length > 0) {
    const reconciliationIds = new Set(
      missingImageReconciliation
        .filter(row => row.actual_file_present_in_zip === 'True')
        .map(row => row['Scryfall ID'])
        .filter(Boolean),
    )
    const unreconciled = missingImages.filter(row => !reconciliationIds.has(row['Scryfall ID']))
    if (unreconciled.length > 0) {
      fail(`historical missing image request rows include ${unreconciled.length} unreconciled Scryfall IDs`)
    }
  } else if (missingImages.length !== missingCount) {
    fail(`missing image request rows (${missingImages.length}) do not match normalized missing-image count (${missingCount})`)
  }
  if (summary.counts?.normalized_card_candidates !== cards.length) fail('summary normalized_card_candidates does not match card CSV row count')
  if (summary.counts?.normalized_artist_profiles !== artists.length) fail('summary normalized_artist_profiles does not match artist CSV row count')
  if (summary.counts?.signing_target_seed_artists !== targets.length) fail('summary signing_target_seed_artists does not match target CSV row count')
}

if (failures.length) {
  console.error('Artist import validation: FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Artist import validation: PASS')
console.log(`Working directory: ${path.relative(repoRoot, workingDir)}`)
console.log('Quarantined originals are source evidence only; normalized outputs are the working input.')
