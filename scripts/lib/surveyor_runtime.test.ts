import { describe, expect, it } from 'vitest'
import { runSurveyorRuntime } from './surveyor_runtime.mjs'
import { completeSurveyorClosureManifest } from './surveyor_closure_contract.mjs'

const report = { checkedAt: '2026-10-07T10:00:00Z', coverageStatus: 'complete', changes: [] }
const complete = completeSurveyorClosureManifest(report, new Map())
const editorial = { status: 'blocked', catches: [{ disposition: 'pending_editorial', readbacks: [{ match: { fingerprint: 'exact-old-fingerprint' } }] }] }
function harness(pending: any = null, stages: any[] = [complete]) {
  const calls: string[] = []
  const saved: any[] = []
  const ops = {
    loadPending: async () => pending,
    readReplay: async () => report,
    discover: async () => { calls.push('discover'); return report },
    stage: async () => { calls.push('stage'); return stages.shift() },
    validatePendingEditorial: async () => {},
    savePending: async (value: any) => { saved.push(value) },
    writeReceipt: async (value: any) => { saved.push(value) },
    saveRecovery: async () => { calls.push('recovery') },
    verify: async () => { calls.push('verify') },
    alert: async () => { calls.push('alert') },
    accept: async () => { calls.push('accept') },
    saveCheckpoint: async () => { calls.push('checkpoint'); return {} },
    clearPending: async () => { calls.push('clear') },
  }
  return { ops, calls, saved }
}
const retained = { operationalStatus: 'awaiting_editorial', report, manifest: editorial,
  firstHeldAt: '2026-10-07T00:00:00Z', originalRunId: 'original', fingerprints: ['original-fingerprint'] }
describe('daily surveyor runtime', () => {
  it('restages retained editorial before fresh discovery and accepts only fresh closure', async () => {
    const h = harness(retained, [complete, complete])
    const result = await runSurveyorRuntime({ ops: h.ops, now: '2026-10-07T11:00:00Z', runId: 'new' })
    expect(h.calls).toEqual(['stage', 'recovery', 'discover', 'stage', 'verify', 'alert', 'accept', 'checkpoint', 'clear'])
    expect(result.readyForCache).toBe(true)
    expect(result.recovered.originalRunId).toBe('original')
  })
  it('stages fresh findings while an older exact editorial report remains unresolved', async () => {
    const h = harness(retained, [editorial, complete])
    const result = await runSurveyorRuntime({ ops: h.ops, now: '2026-10-08T00:00:01Z', runId: 'new' })
    expect(h.calls).toEqual(['stage', 'discover', 'stage'])
    expect(result).toMatchObject({ operationalStatus: 'awaiting_editorial', firstHeldAt: retained.firstHeldAt,
      originalRunId: 'original', fingerprints: ['original-fingerprint'], exitCode: 1, readyForCache: false, retainedEditorialReports: 1 })
    expect(h.saved[0].editorialBacklog[0]).toMatchObject({ report, manifest: editorial })
  })
  it('keeps retained evidence across a fresh coverage failure and an unsuccessful replay', async () => {
    const fresh = { ...report, coverageStatus: 'partial', checkedAt: '2026-10-07T12:00:00Z' }
    const h = harness(retained)
    h.ops.discover = async () => fresh
    h.ops.stage = async (current: any) => {
      if (current === report) throw Object.assign(new Error('sensitive diagnostic'), { code: 'CHILD_EXIT_1' })
      return completeSurveyorClosureManifest(current, new Map())
    }
    const result = await runSurveyorRuntime({ ops: h.ops, now: fresh.checkedAt, runId: 'new' })
    expect(result).toMatchObject({ operationalStatus: 'awaiting_repair', retainedEditorialReports: 1, readyForCache: false })
    expect(h.saved[0].editorialBacklog[0]).toMatchObject({ report, retryErrorCode: 'CHILD_EXIT_1' })
    expect(JSON.stringify(h.saved)).not.toContain('sensitive diagnostic')
  })
  it('keeps a single report when fresh discovery sees the same unresolved fingerprint', async () => {
    const h = harness(retained, [editorial, editorial])
    const result = await runSurveyorRuntime({ ops: h.ops, now: '2026-10-07T12:00:00Z', runId: 'new' })
    expect(result).toMatchObject({ operationalStatus: 'awaiting_editorial', retainedEditorialReports: 0, firstHeldAt: retained.firstHeldAt })
    expect(h.saved[0].manifest).toEqual(editorial)
  })
  it('incomplete coverage holds even with no catches and retries freshness without resetting age', async () => {
    const h = harness({ ...retained, operationalStatus: 'awaiting_repair', manifest: complete })
    h.ops.discover = async () => { h.calls.push('discover'); return { ...report, coverageStatus: 'partial' } }
    h.ops.stage = async (current: any) => { h.calls.push('stage'); return completeSurveyorClosureManifest(current, new Map()) }
    const result = await runSurveyorRuntime({ ops: h.ops, now: '2026-10-07T12:00:00Z', runId: 'new' })
    expect(h.calls).toEqual(['discover', 'stage'])
    expect(result).toMatchObject({ operationalStatus: 'awaiting_repair', exitCode: 0, firstHeldAt: retained.firstHeldAt, readyForCache: false })
  })
  it('child execution errors fail instead of being classified as editorial', async () => {
    const h = harness()
    h.ops.stage = async () => { throw new Error('sensitive diagnostic') }
    const result = await runSurveyorRuntime({ ops: h.ops, runId: 'new' })
    expect(result).toMatchObject({ operationalStatus: 'failed', failedStage: 'stage', exitCode: 1, readyForCache: false })
    expect(JSON.stringify(result)).not.toContain('sensitive diagnostic')
    expect(h.calls).not.toContain('accept')
  })
  it('replay verifies retained evidence but cannot advance or cache a baseline', async () => {
    const h = harness()
    const result = await runSurveyorRuntime({ ops: h.ops, runId: 'new', replayRunId: 'original' })
    expect(h.calls).toEqual(['stage'])
    expect(result).toMatchObject({ operationalStatus: 'replay_verified', readyForCache: false, exitCode: 0 })
  })
})
