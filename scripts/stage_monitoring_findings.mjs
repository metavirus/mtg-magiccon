import fs from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { buildMonitoringCandidateRows } from './lib/build_monitoring_candidates.mjs'
import { extractMonitoringConcept, factualChoiceFindingForResolution, reconcileMonitoringObservation } from './lib/monitoring_concept_reconciler.mjs'
import { projectResolutionToInfo } from './lib/monitoring_info_projection.mjs'

const reportPath = process.argv[2]
if (!reportPath) throw new Error('Usage: pnpm monitor:stage <monitor-report.json>')

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

const report = JSON.parse(await fs.readFile(reportPath, 'utf8'))
const changes = Array.isArray(report.changes) ? report.changes : []
if (!changes.length) {
  console.log('Monitoring findings: PASS (no source changes to stage)')
  process.exit(0)
}

const candidateRows = buildMonitoringCandidateRows(report)

const client = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
const fingerprints = candidateRows.map(row => row.fingerprint)
const existingResult = await client.from('monitoring_findings').select('fingerprint,occurrence_count,status').in('fingerprint', fingerprints)
if (existingResult.error) throw existingResult.error
const existingCounts = new Map((existingResult.data ?? []).map(row => [row.fingerprint, row.occurrence_count]))
const existingStatuses = new Map((existingResult.data ?? []).map(row => [row.fingerprint, row.status]))
const rows = candidateRows.map(row => ({
  ...row,
  ...(existingStatuses.has(row.fingerprint) ? { status: existingStatuses.get(row.fingerprint) } : {}),
  occurrence_count: (existingCounts.get(row.fingerprint) ?? 0) + 1,
}))
const findingResult = await client.from('monitoring_findings').upsert(rows, { onConflict: 'fingerprint' }).select('id,fingerprint')
if (findingResult.error) throw findingResult.error

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
const conceptKeys = [...new Set(observations.map(extractMonitoringConcept).filter(Boolean).map(concept => concept.concept_key))]
const conceptResult = conceptKeys.length
  ? await client.from('monitoring_concepts').select('*').eq('owner_id', ownerId).in('concept_key', conceptKeys)
  : { data: [], error: null }
if (conceptResult.error) throw conceptResult.error
const concepts = new Map((conceptResult.data ?? []).map(concept => [concept.concept_key, concept]))
let conceptEvidenceAdded = 0
let infoFeedAdded = 0
let factualChoicesStaged = 0

for (const observation of observations) {
  if (!observation.findingId) throw new Error(`Missing staged finding readback for ${observation.fingerprint}.`)
  const extracted = extractMonitoringConcept(observation)
  const resolution = reconcileMonitoringObservation(observation, extracted ? concepts.get(extracted.concept_key) : null)
  const sourceRow = candidateRows.find(row => row.fingerprint === observation.fingerprint)
  const findingEvidenceWrite = await client.from('monitoring_findings').update({
    evidence: {
      ...sourceRow.evidence,
      concept_resolution: resolution.resolution,
      concept_key: resolution.concept?.concept_key ?? null,
      concept_rule_version: resolution.rule_version,
      concept_rationale: resolution.rationale,
    },
  }).eq('id', observation.findingId)
  if (findingEvidenceWrite.error) throw findingEvidenceWrite.error
  if (resolution.resolution === 'noise') continue
  if (resolution.resolution === 'contradiction' && resolution.concept?.concept_key === 'atlanta:on-demand-play:registration-hours:constructed-draft:sunday') {
    const topicRead = await client.from('info_topics').select('article').eq('topic_key', 'on-demand-play').single()
    if (topicRead.error) throw topicRead.error
    const choiceRow = factualChoiceFindingForResolution(resolution, observation, topicRead.data.article)
    if (choiceRow) {
      const existingChoice = await client.from('monitoring_findings').select('status,occurrence_count').eq('fingerprint', choiceRow.fingerprint).maybeSingle()
      if (existingChoice.error) throw existingChoice.error
      const choiceWrite = await client.from('monitoring_findings').upsert({
        ...choiceRow,
        occurrence_count: (existingChoice.data?.occurrence_count ?? 0) + 1,
        ...(existingChoice.data ? { status: existingChoice.data.status } : {}),
      }, { onConflict: 'fingerprint' })
      if (choiceWrite.error) throw choiceWrite.error
      factualChoicesStaged += 1
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
    if (prior) {
      const countWrite = await client.from('monitoring_concepts').update({ evidence_count: prior.evidence_count + 1 }).eq('id', concept.id)
      if (countWrite.error) throw countWrite.error
      concept.evidence_count = prior.evidence_count + 1
    }
  }
  concepts.set(concept.concept_key, concept)
  const infoProjection = projectResolutionToInfo(resolution, observation)
  if (infoProjection) {
    const feedWrite = await client.from('info_feed_entries').upsert(infoProjection.feed, { onConflict: 'entry_key' }).select('id')
    if (feedWrite.error) throw feedWrite.error
    infoFeedAdded += feedWrite.data?.length ?? 0
    if (infoProjection.topic) {
      const topicWrite = await client.from('info_topics').update({ concise_answer: infoProjection.topic.concise_answer, article_status: infoProjection.topic.article_status, article: infoProjection.topic.article, sources: infoProjection.topic.sources, updated_at: infoProjection.topic.updated_at }).eq('topic_key', infoProjection.topic.topic_key)
      if (topicWrite.error) throw topicWrite.error
    }
  }
}

console.log(`Monitoring findings: PASS (${changes.length} changed source(s) collapsed to ${rows.length} raw evidence row(s); ${conceptEvidenceAdded} new concept evidence link(s); ${factualChoicesStaged} factual choice${factualChoicesStaged === 1 ? '' : 's'} staged; ${infoFeedAdded} persistent Info feed entr${infoFeedAdded === 1 ? 'y' : 'ies'}; fingerprints and concept keys deduplicated)`)
