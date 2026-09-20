import { describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { privateCoverageReceipt } from './private_monitoring_coverage.mjs'
const ids = ['canonical', 'trip', 'receipt']
const checkedAt = '2026-09-20T03:00:00Z'
const attempt = { checkedAt, status: 'checked', capability: 'available', queries: ids.map(id => ({ id, after: '2026-09-01T00:00:00Z', checkedThrough: checkedAt, matchCount: 0, paginationComplete: true })) }
describe('durable private search coverage', () => {
  it('writes and reads the real CLI receipt in an isolated temporary workspace', () => {
    const temporary = mkdtempSync(path.join(tmpdir(), 'magiccon-private-coverage-test-'))
    try {
      mkdirSync(path.join(temporary, 'monitoring'))
      writeFileSync(path.join(temporary, 'monitoring/gmail-watch-queries.json'), JSON.stringify({ queries: ids.map(id => ({ id })) }))
      writeFileSync(path.join(temporary, 'attempt.json'), JSON.stringify(attempt))
      const script = path.resolve('scripts/record_private_monitoring_coverage.mjs')
      execFileSync(process.execPath, [script, 'attempt.json'], { cwd: temporary })
      const receipt = JSON.parse(readFileSync(path.join(temporary, '.monitoring-state/private/gmail-coverage.local.json'), 'utf8'))
      expect(receipt.lastAttempt.status).toBe('checked')
      expect(receipt.lastSuccessfulSearch.queries).toHaveLength(3)
      writeFileSync(path.join(temporary, 'attempt.json'), JSON.stringify({ checkedAt, status: 'not_checked', capability: 'unavailable', reason: 'connector_unavailable' }))
      execFileSync(process.execPath, [script, 'attempt.json'], { cwd: temporary })
      const skipped = JSON.parse(readFileSync(path.join(temporary, '.monitoring-state/private/gmail-coverage.local.json'), 'utf8'))
      expect(skipped.lastSuccessfulSearch).toEqual(receipt.lastSuccessfulSearch)
    } finally { rmSync(temporary, { recursive: true, force: true }) }
  })
  it('requires all three queries and complete pagination even for zero matches', () => {
    expect(privateCoverageReceipt(null, attempt, ids).lastSuccessfulSearchThrough).toBe('2026-09-20T03:00:00.000Z')
    expect(() => privateCoverageReceipt(null, { ...attempt, queries: attempt.queries.slice(0, 1) }, ids)).toThrow(/every canonical/)
    expect(() => privateCoverageReceipt(null, { ...attempt, queries: attempt.queries.map(q => ({ ...q, paginationComplete: false })) }, ids)).toThrow(/pagination/)
  })
  it('keeps the last success and unresolved candidates when skipped or partial', () => {
    const key = 'a'.repeat(64)
    const previous = privateCoverageReceipt(null, { ...attempt, unresolvedCandidates: [{ key, reason: 'manual_payload_review_required' }] }, ids)
    const skipped = privateCoverageReceipt(previous, { checkedAt, status: 'not_checked', capability: 'unavailable', reason: 'connector_unavailable' }, ids)
    expect(skipped.lastSuccessfulSearchThrough).toBe(previous.lastSuccessfulSearchThrough)
    expect(skipped.unresolvedCandidates).toEqual(previous.unresolvedCandidates)
    expect(skipped.consequenceCoverage).toBe('not_covered')
    expect(privateCoverageReceipt(skipped, attempt, ids).unresolvedCandidates).toEqual(previous.unresolvedCandidates)
  })
  it('drops raw message fields and resolves only explicitly named candidates', () => {
    const key = 'b'.repeat(64)
    const previous = privateCoverageReceipt(null, { ...attempt, body: 'private body', unresolvedCandidates: [{ key, reason: 'manual_payload_review_required', subject: 'private' }] }, ids)
    expect(JSON.stringify(previous)).not.toContain('private body')
    expect(JSON.stringify(previous)).not.toContain('subject')
    expect(privateCoverageReceipt(previous, { ...attempt, resolvedCandidateKeys: [key] }, ids).unresolvedCandidates).toEqual([])
  })
})
