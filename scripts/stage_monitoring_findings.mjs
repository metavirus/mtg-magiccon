import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { buildMonitoringCandidateRows } from './lib/build_monitoring_candidates.mjs'
import { CONCEPT_RULE_VERSION, extractMonitoringConcepts, factualChoiceFindingForResolution, reconcileMonitoringObservation } from './lib/monitoring_concept_reconciler.mjs'
import { monitoringConceptBaselineFromInfo, projectRegisteredFactResolution, projectResolutionToInfo, verifyRegisteredFactReadback } from './lib/monitoring_info_projection.mjs'
import { ticketedPlayAvailabilityProjectionRows } from './lib/ticketed_play_availability_projection.mjs'
import { assertSupportedSurveyorCatches, completeSurveyorClosureManifest, pendingSurveyorClosureManifest, surveyorCatchDescriptors } from './lib/surveyor_closure_contract.mjs'

const reportPath = process.argv[2]
if (!reportPath) throw new Error('Usage: pnpm monitor:stage <monitor-report.json>')
const closureArgument = process.argv.slice(3).find(argument => !argument.startsWith('--'))
const closurePath = closureArgument ?? path.join(path.dirname(reportPath), 'closure-manifest.json')
const report = JSON.parse(await fs.readFile(reportPath, 'utf8'))
await fs.writeFile(closurePath, `${JSON.stringify(pendingSurveyorClosureManifest(report), null, 2)}\n`, 'utf8')
assertSupportedSurveyorCatches(report)

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!supabaseUrl || !secretKey) {
  if (process.argv.includes('--allow-missing')) {
    console.log('Monitoring findings: SKIP (SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SECRET_KEY are required)')
    process.exit(0)
  }
  throw new Error('Monitoring findings cannot be staged: configure the GitHub Actions secret SUPABASE_SECRET_KEY with a modern server-only key for pavjsexxbueuzhzgemgy.')
}
if (!supabaseUrl.includes('pavjsexxbueuzhzgemgy.supabase.co')) throw new Error('Refusing to stage findings outside canonical project pavjsexxbueuzhzgemgy.')
if (!secretKey.startsWith('sb_secret_')) throw new Error('SUPABASE_SECRET_KEY must be a modern server-only secret key.')

const changes = Array.isArray(report.changes) ? report.changes : []

const fetchWithClockSkewRetry = async (input, init) => {
  let response
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(input, init)
    if (response.status !== 401 || !/JWT issued at future/i.test(await response.clone().text())) return response
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  return response
}
const client = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: fetchWithClockSkewRetry },
})
const availabilityProjection = ticketedPlayAvailabilityProjectionRows(report.ticketedPlay?.inventory)
let availabilityReadback = []
if (availabilityProjection.length) {
  const availabilityWrite = await client.from('ticketed_play_current_availability').upsert(
    availabilityProjection.map(row => ({ ...row, updated_at: report.checkedAt })),
    { onConflict: 'event_id' },
  ).select('event_id,source_event_key,availability,observed_at,updated_at')
  if (availabilityWrite.error) throw availabilityWrite.error
  availabilityReadback = availabilityWrite.data ?? []
}
if (!changes.length) {
  const manifest = completeSurveyorClosureManifest(report, new Map())
  await fs.writeFile(closurePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`Monitoring findings: PASS (no source changes to stage; ${availabilityProjection.length} current Ticketed Play availability row(s) projected)`)
  process.exit(0)
}
const hasTicketedInventory = changes.some(change => change.intakeKind === 'ticketed_play_inventory')
let routingContext = {}
if (hasTicketedInventory) {
  const [selectionsResult, companionsResult] = await Promise.all([
    client.from('user_selections').select('owner_id,object_id,object_kind,selection_key,selection_value').eq('object_kind', 'event').in('selection_key', ['state', 'purchased', 'purchase_locked']),
    client.from('companion_members').select('user_id,display_name').eq('active', true).not('user_id', 'is', null),
  ])
  if (selectionsResult.error) throw selectionsResult.error
  if (companionsResult.error) throw companionsResult.error
  routingContext = { selectionRows: selectionsResult.data ?? [], companions: companionsResult.data ?? [] }
}
const candidateRows = buildMonitoringCandidateRows(report, routingContext)
const fingerprints = candidateRows.map(row => row.fingerprint)
const existingResult = fingerprints.length
  ? await client.from('monitoring_findings').select('fingerprint,occurrence_count,status').in('fingerprint', fingerprints)
  : { data: [], error: null }
if (existingResult.error) throw existingResult.error
const existingCounts = new Map((existingResult.data ?? []).map(row => [row.fingerprint, row.occurrence_count]))
const existingStatuses = new Map((existingResult.data ?? []).map(row => [row.fingerprint, row.status]))
const rows = candidateRows.map(row => ({
  ...row,
  ...(existingStatuses.has(row.fingerprint) ? { status: existingStatuses.get(row.fingerprint) } : {}),
  occurrence_count: (existingCounts.get(row.fingerprint) ?? 0) + 1,
}))
const findingResult = rows.length
  ? await client.from('monitoring_findings').upsert(rows, { onConflict: 'fingerprint' }).select('id,fingerprint,status,destination')
  : { data: [], error: null }
if (findingResult.error) throw findingResult.error

const dispositionRank = { ignored_noise: 0, retained_evidence: 1, routed_signal: 2, canonical_update: 3 }
const candidateOutcomes = new Map()
function recordCandidateOutcome(fingerprint, outcome) {
  const previous = candidateOutcomes.get(fingerprint)
  candidateOutcomes.set(fingerprint, {
    disposition: outcome.final || !previous || dispositionRank[outcome.disposition] > dispositionRank[previous.disposition] ? outcome.disposition : previous.disposition,
    targets: [...(previous?.targets ?? []), ...(outcome.targets ?? [])],
    readbacks: [...(previous?.readbacks ?? []), ...(outcome.readbacks ?? [])],
    rationale: outcome.rationale ?? previous?.rationale,
  })
}
for (const finding of findingResult.data ?? []) recordCandidateOutcome(finding.fingerprint, {
  disposition: 'retained_evidence',
  targets: [{ kind: finding.destination === 'Inbox' ? 'inbox' : finding.destination === 'Home' ? 'home' : 'activity', identifier: finding.id }],
  readbacks: [{ system: 'supabase', relation: 'monitoring_findings', match: { fingerprint: finding.fingerprint }, observed: finding }],
  rationale: 'The changed source is retained as deduplicated evidence on an existing intake surface.',
})

const ownerResult = await client.from('companion_members').select('user_id').eq('person_key', 'kavi').eq('active', true).not('user_id', 'is', null)
if (ownerResult.error) throw ownerResult.error
if (ownerResult.data?.length !== 1) throw new Error(`Monitoring concept staging requires exactly one active linked Kavi owner; found ${ownerResult.data?.length ?? 0}.`)
const ownerId = ownerResult.data[0].user_id
const findingIds = new Map((findingResult.data ?? []).map(row => [row.fingerprint, row.id]))
const observations = candidateRows.map(row => ({
  fingerprint: row.fingerprint,
  findingId: findingIds.get(row.fingerprint),
  sourceId: row.source_id,
  sourceLabel: row.source_label,
  sourceUrl: row.source_url,
  observedAt: row.last_seen_at,
  title: row.title,
  summary: row.evidence.semanticSummary ?? row.summary,
  text: [row.evidence.current?.title, row.evidence.current?.textSample].filter(Boolean).join(' '),
  links: row.evidence.presentation_links ?? row.evidence.linkDelta?.added ?? [],
}))
const extractedByFingerprint = new Map(observations.map(observation => [observation.fingerprint, extractMonitoringConcepts(observation)]))
const allExtracted = [...extractedByFingerprint.values()].flat()
const conceptKeys = [...new Set(allExtracted.map(concept => concept.concept_key))]
const conceptResult = conceptKeys.length
  ? await client.from('monitoring_concepts').select('*').eq('owner_id', ownerId).in('concept_key', conceptKeys)
  : { data: [], error: null }
if (conceptResult.error) throw conceptResult.error
const concepts = new Map((conceptResult.data ?? []).map(concept => [concept.concept_key, concept]))
const infoTopicKeys = [...new Set(allExtracted.filter(claim => claim.concept_kind === 'info_article_fact').map(claim => claim.claim.topic_key))]
const infoTopicResult = infoTopicKeys.length
  ? await client.from('info_topics').select('topic_key,article,sources,updated_at').in('topic_key', infoTopicKeys)
  : { data: [], error: null }
if (infoTopicResult.error) throw infoTopicResult.error
const infoTopics = new Map((infoTopicResult.data ?? []).map(topic => [topic.topic_key, topic]))
for (const extracted of allExtracted) {
  if (concepts.has(extracted.concept_key)) continue
  const baseline = monitoringConceptBaselineFromInfo(extracted, infoTopics.get(extracted.claim?.topic_key))
  if (baseline) concepts.set(extracted.concept_key, baseline)
}
let conceptEvidenceAdded = 0
let infoFeedAdded = 0
let factualChoicesStaged = 0
let infoClosuresVerified = 0
const closureReceiptsByFinding = new Map()

for (const observation of observations) {
  if (!observation.findingId) throw new Error(`Missing staged finding readback for ${observation.fingerprint}.`)
  const sourceRow = candidateRows.find(row => row.fingerprint === observation.fingerprint)
  if (sourceRow?.evidence?.intake_kind === 'ticketed_play_inventory') {
    // Ticketed inventory transitions are already event-normalized and routed.
    // They retain their Home/Inbox lifecycle instead of passing through the
    // generic page-concept noise classifier.
    continue
  }
  const extractedClaims = extractedByFingerprint.get(observation.fingerprint) ?? []
  if (!extractedClaims.length) {
    const retainedInformational = sourceRow.status === 'unread'
    const targetStatus = retainedInformational ? (existingStatuses.get(observation.fingerprint) ?? 'unread') : 'archived'
    const noiseWrite = await client.from('monitoring_findings').update({
      status: targetStatus,
      evidence: { ...sourceRow.evidence, concept_resolution: 'noise', concept_keys: [], concept_rule_version: CONCEPT_RULE_VERSION, concept_rationale: 'No deterministic planning concept or material fact was extracted.' },
    }).eq('id', observation.findingId).select('id,fingerprint,status,destination').single()
    if (noiseWrite.error) throw noiseWrite.error
    recordCandidateOutcome(observation.fingerprint, {
      disposition: retainedInformational ? 'retained_evidence' : 'ignored_noise',
      final: true,
      targets: [{ kind: retainedInformational ? 'activity' : 'noise_archive', identifier: observation.findingId }],
      readbacks: [{ system: 'supabase', relation: 'monitoring_findings', match: { id: observation.findingId }, observed: noiseWrite.data }],
      rationale: retainedInformational ? 'The official link delta remains available as concise source evidence.' : 'Deterministic concept extraction found no maintained fact or planning consequence.',
    })
    continue
  }
  for (const extracted of extractedClaims) {
    const resolution = reconcileMonitoringObservation(observation, concepts.get(extracted.concept_key), extracted)
    const findingEvidenceWrite = await client.from('monitoring_findings').update({
      ...(extractedClaims.some(item => item.concept_kind === 'info_article_fact') && !existingStatuses.has(observation.fingerprint) ? { status: 'archived' } : {}),
      evidence: {
        ...sourceRow.evidence,
        concept_resolution: resolution.resolution,
        concept_key: resolution.concept?.concept_key ?? null,
        concept_keys: extractedClaims.map(item => item.concept_key),
        concept_rule_version: resolution.rule_version,
        concept_rationale: resolution.rationale,
      },
    }).eq('id', observation.findingId).select('id,fingerprint,status,destination').single()
    if (findingEvidenceWrite.error) throw findingEvidenceWrite.error
    recordCandidateOutcome(observation.fingerprint, {
      disposition: 'retained_evidence',
      targets: [{ kind: 'monitoring_concept', identifier: resolution.concept?.concept_key ?? observation.findingId }],
      readbacks: [{ system: 'supabase', relation: 'monitoring_findings', match: { id: observation.findingId }, observed: findingEvidenceWrite.data }],
      rationale: resolution.rationale,
    })
  if (resolution.resolution === 'contradiction' && resolution.concept?.concept_kind === 'info_article_fact') {
    const topicRead = await client.from('info_topics').select('article').eq('topic_key', resolution.concept.current_state.topic_key).single()
    if (topicRead.error) throw topicRead.error
    const choiceRow = factualChoiceFindingForResolution(resolution, observation, topicRead.data.article)
    if (choiceRow) {
      const choiceProjection = projectRegisteredFactResolution(resolution, observation, infoTopics.get(resolution.concept.current_state.topic_key))
      if (choiceProjection?.receipt) choiceRow.evidence = { ...choiceRow.evidence, closure_receipt: choiceProjection.receipt }
      const existingChoice = await client.from('monitoring_findings').select('status,occurrence_count').eq('fingerprint', choiceRow.fingerprint).maybeSingle()
      if (existingChoice.error) throw existingChoice.error
      const choiceWrite = await client.from('monitoring_findings').upsert({
        ...choiceRow,
        occurrence_count: (existingChoice.data?.occurrence_count ?? 0) + 1,
        ...(existingChoice.data ? { status: existingChoice.data.status } : {}),
      }, { onConflict: 'fingerprint' }).select('id,fingerprint,status,action_type,destination').single()
      if (choiceWrite.error) throw choiceWrite.error
      factualChoicesStaged += 1
      recordCandidateOutcome(observation.fingerprint, {
        disposition: 'routed_signal',
        targets: [{ kind: 'activity', identifier: choiceWrite.data.id }],
        readbacks: [{ system: 'supabase', relation: 'monitoring_findings', match: { fingerprint: choiceRow.fingerprint }, observed: choiceWrite.data }],
        rationale: 'A genuine first-party contradiction was routed as one concrete factual choice.',
      })
    }
  }
  const prior = concepts.get(resolution.concept.concept_key)
  const conceptRow = {
    owner_id: ownerId,
    concept_key: resolution.concept.concept_key,
    concept_kind: resolution.concept.concept_kind,
    title: resolution.concept.title,
    latest_resolution: resolution.resolution,
    attention_state: resolution.concept.attention_state,
    current_summary: resolution.concept.current_summary,
    current_state: resolution.concept.current_state,
    first_seen_at: prior?.first_seen_at ?? observation.observedAt,
    last_seen_at: observation.observedAt,
    evidence_count: prior?.evidence_count ?? 1,
    updated_at: observation.observedAt,
  }
  const conceptWrite = await client.from('monitoring_concepts').upsert(conceptRow, { onConflict: 'owner_id,concept_key' }).select().single()
  if (conceptWrite.error) throw conceptWrite.error
  const concept = conceptWrite.data
  recordCandidateOutcome(observation.fingerprint, {
    disposition: 'retained_evidence',
    targets: [{ kind: 'monitoring_concept', identifier: concept.concept_key }],
    readbacks: [{ system: 'supabase', relation: 'monitoring_concepts', match: { id: concept.id }, observed: { id: concept.id, concept_key: concept.concept_key, latest_resolution: concept.latest_resolution, attention_state: concept.attention_state } }],
    rationale: resolution.rationale,
  })
  const evidenceExisting = await client.from('monitoring_concept_evidence').select('id').eq('concept_id', concept.id).eq('finding_id', observation.findingId).maybeSingle()
  if (evidenceExisting.error) throw evidenceExisting.error
  if (!evidenceExisting.data) {
    const evidenceWrite = await client.from('monitoring_concept_evidence').insert({
      owner_id: ownerId,
      concept_id: concept.id,
      finding_id: observation.findingId,
      resolution: resolution.resolution,
      rationale: resolution.rationale,
      extracted_state: resolution.concept.proposed_state ?? resolution.concept.current_state,
      observed_at: observation.observedAt,
    })
    if (evidenceWrite.error) throw evidenceWrite.error
    conceptEvidenceAdded += 1
    if (prior?.id && Number.isFinite(prior.evidence_count)) {
      const countWrite = await client.from('monitoring_concepts').update({ evidence_count: prior.evidence_count + 1 }).eq('id', concept.id)
      if (countWrite.error) throw countWrite.error
      concept.evidence_count = prior.evidence_count + 1
    }
  }
  concepts.set(concept.concept_key, concept)
  const registeredProjection = projectRegisteredFactResolution(resolution, observation, infoTopics.get(resolution.concept.current_state.topic_key))
  if (registeredProjection?.mutation) {
    const mutation = registeredProjection.mutation
    const topicWrite = await client.from('info_topics').update({ article: mutation.article, sources: mutation.sources, updated_at: mutation.updated_at }).eq('topic_key', mutation.topic_key).select('topic_key,article,sources,updated_at').single()
    if (topicWrite.error) throw topicWrite.error
    if (!verifyRegisteredFactReadback(registeredProjection.receipt, topicWrite.data)) throw new Error(`Maintained Info closure readback failed for ${resolution.concept.concept_key}.`)
    recordCandidateOutcome(observation.fingerprint, {
      disposition: 'canonical_update',
      targets: [{ kind: 'info_topic', identifier: mutation.topic_key }],
      readbacks: [{ system: 'supabase', relation: 'info_topics', match: { topic_key: mutation.topic_key }, observed: { topic_key: topicWrite.data.topic_key, updated_at: topicWrite.data.updated_at, receipt: registeredProjection.receipt } }],
      rationale: 'The registered first-party fact updated its maintained Info article and passed exact value readback.',
    })
    infoTopics.set(mutation.topic_key, topicWrite.data)
    const closureReceipts = [...(closureReceiptsByFinding.get(observation.findingId) ?? []), { ...registeredProjection.receipt, readback_verified: true }]
    closureReceiptsByFinding.set(observation.findingId, closureReceipts)
    const closureEvidence = await client.from('monitoring_findings').update({ evidence: { ...sourceRow.evidence, concept_resolution: resolution.resolution, concept_key: resolution.concept.concept_key, concept_keys: extractedClaims.map(item => item.concept_key), concept_rule_version: resolution.rule_version, concept_rationale: resolution.rationale, closure_receipts: closureReceipts } }).eq('id', observation.findingId)
    if (closureEvidence.error) throw closureEvidence.error
    recordCandidateOutcome(observation.fingerprint, {
      disposition: 'canonical_update',
      targets: [{ kind: 'info_topic', identifier: mutation.topic_key }],
      readbacks: [{ system: 'supabase', relation: 'info_topics', match: registeredProjection.receipt.canonical_target, observed: registeredProjection.receipt.readback }],
      rationale: `Maintained Info ${registeredProjection.receipt.disposition === 'canonical_corroborated' ? 'provenance corroborated' : 'fact hydrated'} and read back.`,
    })
    infoClosuresVerified += 1
  }
  const infoProjection = projectResolutionToInfo(resolution, observation)
  if (infoProjection) {
    const feedWrite = await client.from('info_feed_entries').upsert(infoProjection.feed, { onConflict: 'entry_key' }).select('id,entry_key,concept_key,feed_status')
    if (feedWrite.error) throw feedWrite.error
    infoFeedAdded += feedWrite.data?.length ?? 0
    if (infoProjection.topic) {
      const topicWrite = await client.from('info_topics').update({ concise_answer: infoProjection.topic.concise_answer, article_status: infoProjection.topic.article_status, article: infoProjection.topic.article, sources: infoProjection.topic.sources, updated_at: infoProjection.topic.updated_at }).eq('topic_key', infoProjection.topic.topic_key).select('topic_key,article_status,updated_at').single()
      if (topicWrite.error) throw topicWrite.error
      recordCandidateOutcome(observation.fingerprint, {
        disposition: 'canonical_update',
        targets: [{ kind: 'info_topic', identifier: infoProjection.topic.topic_key }],
        readbacks: [{ system: 'supabase', relation: 'info_topics', match: { topic_key: infoProjection.topic.topic_key }, observed: topicWrite.data }],
        rationale: 'The reconciled first-party fact updated its existing maintained Info topic.',
      })
    }
    for (const feed of feedWrite.data ?? []) recordCandidateOutcome(observation.fingerprint, {
      disposition: 'canonical_update',
      targets: [{ kind: 'info_feed', identifier: feed.entry_key }],
      readbacks: [{ system: 'supabase', relation: 'info_feed_entries', match: { entry_key: feed.entry_key }, observed: feed }],
      rationale: 'The reconciled first-party fact reached the maintained Info projection.',
    })
  }
  }
}

const outcomes = new Map()
for (const descriptor of surveyorCatchDescriptors(report)) {
  const changeIndex = Number(descriptor.catchId.slice(0, descriptor.catchId.indexOf(':')))
  const change = changes[changeIndex]
  const matchingRows = rows.filter(row => row.source_id === descriptor.sourceId || row.evidence?.sourceIds?.includes(descriptor.sourceId))
  const proofs = matchingRows.map(row => candidateOutcomes.get(row.fingerprint)).filter(Boolean)
  if (descriptor.intakeKind === 'ticketed_play_inventory') {
    const transitionKeys = new Set((change.transitions ?? []).map(item => String(item.eventId)))
    const observed = availabilityReadback.filter(item => transitionKeys.has(String(item.event_id)))
    if (observed.length !== transitionKeys.size) throw new Error(`Surveyor closure blocked: Ticketed Play availability readback covered ${observed.length} of ${transitionKeys.size} transition(s).`)
    outcomes.set(descriptor.catchId, {
      disposition: 'canonical_update',
      targets: [{ kind: 'explore_availability', identifier: descriptor.sourceId }, ...proofs.flatMap(proof => proof.targets)],
      readbacks: [{ system: 'supabase', relation: 'ticketed_play_current_availability', match: { event_ids: [...transitionKeys] }, observed }, ...proofs.flatMap(proof => proof.readbacks)],
      rationale: 'Current availability was projected to Explore; useful selection impact was routed on existing Home and Inbox surfaces.',
    })
    continue
  }
  if (proofs.length) {
    const best = proofs.reduce((left, right) => dispositionRank[right.disposition] > dispositionRank[left.disposition] ? right : left)
    outcomes.set(descriptor.catchId, {
      disposition: best.disposition,
      targets: proofs.flatMap(proof => proof.targets),
      readbacks: proofs.flatMap(proof => proof.readbacks),
      rationale: best.rationale,
    })
  }
}
const closureManifest = completeSurveyorClosureManifest(report, outcomes)
await fs.writeFile(closurePath, `${JSON.stringify(closureManifest, null, 2)}\n`, 'utf8')

console.log(`Monitoring findings: PASS (${changes.length} changed source(s) collapsed to ${rows.length} raw evidence row(s); ${conceptEvidenceAdded} new concept evidence link(s); ${factualChoicesStaged} factual choice${factualChoicesStaged === 1 ? '' : 's'} staged; ${infoClosuresVerified} maintained Info closure${infoClosuresVerified === 1 ? '' : 's'} read back; ${infoFeedAdded} persistent Info feed entr${infoFeedAdded === 1 ? 'y' : 'ies'}; fingerprints and concept keys deduplicated)`)
