import { describe, expect, it } from 'vitest'
import { supervisionDue, supervisorReceipt, verifySupervisorCoverage } from './supervisor_coverage_receipt.mjs'
import { completeSurveyorClosureManifest } from './surveyor_closure_contract.mjs'

const report = { checkedAt: '2026-10-14T12:00:00Z', coverageStatus: 'complete', changes: [] }
const input = () => ({ report, manifest: completeSurveyorClosureManifest(report, new Map()),
  receipt: { operationalStatus: 'accepted', readyForCache: true, reportCheckedAt: report.checkedAt, runId: '123' },
  run: { databaseId: 123, status: 'completed', conclusion: 'success', jobs: [{ name: 'monitor', conclusion: 'success', steps: ['Run surveyor to terminal outcome','Verify complete coverage and consequences','Retain verified accepted baseline','Save monitoring baseline'].map(name => ({ name, conclusion: 'success' })) }] },
  projectionCoverage: { status: 'complete' }, queryIds: ['a','b','c'], gmail: { lastSuccessfulSearchThrough: report.checkedAt, lastSuccessfulSearch: { queries: ['a','b','c'].map(id => ({ id, paginationComplete: true, checkedThrough: report.checkedAt })) } }, checkedAt: '2026-10-14T14:00:00Z' })

describe('429 cannot manufacture completed supervision', () => {
  it('records exact verified coverage and independently fresh private receipt', () => expect(verifySupervisorCoverage(input())).toMatchObject({ publicStatus: 'complete', privateStatus: 'fresh_receipt_reused' }))
  it('keeps the last completed checkpoint when an attempt fails', () => {
    const prior = supervisorReceipt(null, verifySupervisorCoverage(input()))
    const failed = supervisorReceipt(prior, { checkedAt: '2026-10-14T15:00:00Z', publicStatus: 'unfinished', reason: '429 before supervision completed' })
    expect(failed.lastComplete).toEqual(prior.lastComplete)
    expect(supervisionDue(failed, '2026-10-14T15:01:00Z')).toBe(true)
  })
  it('detects a missed pre-tool turn from the unchanged completion timestamp', () => {
    const prior = supervisorReceipt(null, verifySupervisorCoverage(input()))
    expect(supervisionDue(prior, '2026-10-14T14:59:00Z')).toBe(false)
    expect(supervisionDue(prior, '2026-10-14T15:00:00Z')).toBe(true)
  })
  it.each(['stale','replay','failed step','wrong run','projection'])('refuses %s proof', kind => {
    const data = input()
    if (kind === 'stale') data.checkedAt = '2026-10-15T15:00:00Z'
    if (kind === 'replay') data.receipt.operationalStatus = 'replay_verified'
    if (kind === 'failed step') data.run.jobs[0].steps[3].conclusion = 'failure'
    if (kind === 'wrong run') data.run.databaseId = 456
    if (kind === 'projection') data.projectionCoverage.status = 'partial'
    expect(() => verifySupervisorCoverage(data)).toThrow()
  })
  it('does not claim that expired private coverage was checked', () => {
    const data = input(); data.gmail.lastSuccessfulSearchThrough = '2026-10-12T12:00:00Z'
    const result = verifySupervisorCoverage(data)
    expect(result.privateStatus).toBe('due')
    const ledger = supervisorReceipt(null, result)
    expect(ledger.lastVerifiedPublic).toEqual(result)
    expect(ledger.lastComplete).toBeNull()
  })
})
