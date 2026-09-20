export function privateCoverageReceipt(previous, attempt, queryIds) {
  if (!Number.isFinite(Date.parse(attempt.checkedAt))) throw new Error('Coverage receipt needs checkedAt.')
  if (!['available', 'unavailable'].includes(attempt.capability)) throw new Error('Coverage receipt needs capability status.')
  if (!['checked', 'partial', 'not_checked'].includes(attempt.status)) throw new Error('Invalid private coverage status.')
  if (attempt.status !== 'checked' && !attempt.reason?.trim()) throw new Error('Incomplete coverage needs a reason.')
  const results = attempt.queries ?? []
  if (new Set(results.map(q => q.id)).size !== results.length || results.some(q => !queryIds.includes(q.id))) throw new Error('Unknown or duplicate Gmail query ID.')
  for (const q of results) {
    if (!Number.isFinite(Date.parse(q.after)) || !Number.isFinite(Date.parse(q.checkedThrough)) || Date.parse(q.after) >= Date.parse(q.checkedThrough) || Date.parse(q.checkedThrough) > Date.parse(attempt.checkedAt)) throw new Error('Query needs a valid search window.')
    if (!Number.isInteger(q.matchCount) || q.matchCount < 0 || typeof q.paginationComplete !== 'boolean') throw new Error('Query needs count and pagination evidence.')
    if (previous?.lastSuccessfulSearchThrough && (Date.parse(q.after) > Date.parse(previous.lastSuccessfulSearchThrough) || Date.parse(q.checkedThrough) < Date.parse(previous.lastSuccessfulSearchThrough))) throw new Error('Search window must overlap the durable checkpoint and cannot move backwards.')
  }
  const complete = attempt.capability === 'available' && queryIds.every(id => results.some(q => q.id === id && q.paginationComplete))
  if (attempt.status === 'checked' && !complete) throw new Error('Checked requires every canonical query and complete pagination.')
  if (attempt.status === 'not_checked' && results.length) throw new Error('An attempted search is partial, not not_checked.')
  const unresolved = new Map((previous?.unresolvedCandidates ?? []).map(c => [c.key, c]))
  for (const key of attempt.resolvedCandidateKeys ?? []) unresolved.delete(key)
  for (const candidate of attempt.unresolvedCandidates ?? []) {
    if (!/^[a-f0-9]{64}$/.test(candidate.key) || !candidate.reason?.trim()) throw new Error('Candidate needs a SHA-256 private reference and unresolved reason.')
    unresolved.set(candidate.key, { key: candidate.key, reason: candidate.reason })
  }
  const checkedThrough = attempt.status === 'checked' ? new Date(Math.min(...results.map(q => Date.parse(q.checkedThrough)))).toISOString() : null
  return {
    version: 1,
    lastAttempt: {
      checkedAt: attempt.checkedAt, status: attempt.status, capability: attempt.capability,
      reason: attempt.reason ?? null,
      queries: results.map(q => ({ id: q.id, after: q.after, checkedThrough: q.checkedThrough, matchCount: q.matchCount, paginationComplete: q.paginationComplete })),
    },
    lastSuccessfulSearchThrough: checkedThrough ?? previous?.lastSuccessfulSearchThrough ?? null,
    lastSuccessfulSearch: checkedThrough ? { checkedAt: attempt.checkedAt, checkedThrough, queries: results.map(q => ({ id: q.id, after: q.after, checkedThrough: q.checkedThrough, matchCount: q.matchCount, paginationComplete: q.paginationComplete })) } : previous?.lastSuccessfulSearch ?? null,
    unresolvedCandidates: [...unresolved.values()],
    // Search freshness is not publication, flight application or receipt proof.
    consequenceCoverage: unresolved.size ? 'not_covered' : 'no_unresolved_candidates_recorded',
  }
}
