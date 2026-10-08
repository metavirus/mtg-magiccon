import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { readFileSync } from 'node:fs'

export const EXHIBITOR_EVENT_KEY = 'magiccon_atlanta_2026'
const columns = 'id,event_key,record,source_hash,checked_at,active'
const enrichment = JSON.parse(readFileSync('monitoring/exhibitor-enrichment.json', 'utf8'))

export function exhibitorEnrichment(record) {
  const reviewed = enrichment[record.id]
  if (!reviewed || reviewed.sourceName !== record.name
    || reviewed.sourceDescriptionSha256 !== createHash('sha256').update(record.description).digest('hex')
    || (reviewed.sourceBooth && reviewed.sourceBooth !== record.booth)) return {}
  return { aliases: reviewed.aliases, visitReason: reviewed.visitReason }
}

export function reviewedExhibitorDirectory(candidate) {
  const directory = candidate.evidence?.current?.exhibitorDirectory
  if (!directory || candidate.evidence?.editorial?.reviewed !== true || !['home', 'noise'].includes(candidate.evidence.editorial.disposition)) return null
  if (candidate.source_id !== 'atlanta-experience-exhibitors' || directory.status !== 'complete'
    || directory.eventId !== '21389' || directory.eventSlug !== 'htwhdatl26shdl10' || directory.categoryId !== '20590'
    || !Array.isArray(directory.exhibitors) || !directory.exhibitors.length || directory.count !== directory.exhibitors.length) throw new Error('Reviewed exhibitor directory identity or coverage invalid')
  const ids = directory.exhibitors.map(record => record.id)
  if (new Set(ids).size !== ids.length || directory.exhibitors.some(record => !/^\d+$/.test(record.id) || !record.name || !Array.isArray(record.specials) || !Array.isArray(record.exclusives) || !record.promotionSource)) throw new Error('Reviewed exhibitor directory records invalid or predate structured promotion capture')
  if (createHash('sha256').update(JSON.stringify(directory.exhibitors)).digest('hex') !== directory.rosterHash) throw new Error('Reviewed exhibitor directory roster hash mismatch')
  return directory
}

export function planExhibitorDirectoryProjection(directory, existing, checkedAt) {
  const observed = Date.parse(checkedAt)
  if (!Number.isFinite(observed)) throw new Error('Exhibitor projection requires a valid observation time')
  if (existing.some(row => row.event_key !== EXHIBITOR_EVENT_KEY || Date.parse(row.checked_at) > observed)) throw new Error('Exhibitor projection would replace another event or newer canonical data')
  const byId = new Map(existing.map(row => [row.id, row]))
  const records = directory.exhibitors.map(record => {
    const prior = byId.get(record.id)?.record
    return {
      id: record.id, event_key: EXHIBITOR_EVENT_KEY,
      record: { ...record,
        ...(!enrichment[record.id] && prior?.name === record.name && prior.aliases ? { aliases: prior.aliases } : {}),
        ...(!enrichment[record.id] && prior?.name === record.name && prior.description === record.description && prior.visitReason ? { visitReason: prior.visitReason } : {}),
        ...exhibitorEnrichment(record),
      },
      source_hash: directory.rosterHash, checked_at: checkedAt, active: true,
    }
  })
  const currentIds = new Set(records.map(row => row.id))
  return [...records, ...existing.filter(row => !currentIds.has(row.id)).map(row => ({ ...row, active: false, source_hash: directory.rosterHash, checked_at: checkedAt }))]
}

export function verifyExhibitorDirectoryProjection(expected, actual) {
  if (expected.length !== actual.length || new Set(actual.map(row => row.id)).size !== actual.length) throw new Error('Exhibitor directory readback count mismatch')
  for (const row of expected) {
    const found = actual.find(item => item.id === row.id)
    if (!found || found.event_key !== row.event_key || found.source_hash !== row.source_hash || found.active !== row.active
      || Date.parse(found.checked_at) !== Date.parse(row.checked_at) || !isDeepStrictEqual(found.record, row.record)) throw new Error(`Exhibitor directory exact readback failed: ${row.id}`)
  }
  return actual
}

export async function projectReviewedExhibitorDirectory(client, candidate, checkedAt) {
  const directory = reviewedExhibitorDirectory(candidate)
  if (!directory) return null
  const existing = await client.from('exhibitor_directory').select(columns, { count: 'exact' }).eq('event_key', EXHIBITOR_EVENT_KEY)
  if (existing.error) throw existing.error
  if (existing.count !== existing.data?.length) throw new Error('Exhibitor directory existing readback truncated')
  const rows = planExhibitorDirectoryProjection(directory, existing.data, checkedAt)
  const written = await client.from('exhibitor_directory').upsert(rows, { onConflict: 'id' })
  if (written.error) throw written.error
  const readback = await client.from('exhibitor_directory').select(columns, { count: 'exact' }).eq('event_key', EXHIBITOR_EVENT_KEY)
  if (readback.error) throw readback.error
  if (readback.count !== readback.data?.length) throw new Error('Exhibitor directory final readback truncated')
  verifyExhibitorDirectoryProjection(rows, readback.data)
  return {
    disposition: 'canonical_update',
    targets: [{ kind: 'exhibitor_directory', identifier: EXHIBITOR_EVENT_KEY }],
    readbacks: [{ system: 'supabase', relation: 'exhibitor_directory', match: { event_key: EXHIBITOR_EVENT_KEY }, observed: { source_hash: directory.rosterHash, active_count: directory.count, exact_records_verified: true } }],
    rationale: 'Reviewed official exhibitor roster and complete structured promotions published with exact canonical readback.',
  }
}
