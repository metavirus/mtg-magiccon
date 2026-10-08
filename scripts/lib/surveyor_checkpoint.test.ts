import { describe, expect, it } from 'vitest'
import { completeSurveyorClosureManifest, surveyorReportDigest } from './surveyor_closure_contract.mjs'
import { validateSurveyorCheckpoint } from './surveyor_checkpoint.mjs'

const statePath = '.monitoring-state/watch-state.local.json'
const report = { checkedAt: '2026-10-08T12:00:00Z', coverageStatus: 'complete', changes: [] }
const manifest = completeSurveyorClosureManifest(report, new Map())
const state = { checkedAt: report.checkedAt, accepted: { source: { textHash: 'reviewed' } }, pending: {} }
const checkpoint = () => ({ schemaVersion: 1, checkedAt: report.checkedAt, report, manifest,
  reportDigest: surveyorReportDigest(report), closureDigest: surveyorReportDigest(manifest),
  files: { [statePath]: { content: state, digest: surveyorReportDigest(state) } } })

describe('accepted baseline recovery', () => {
  it('recovers only verified complete public state after cache loss', () => {
    expect(validateSurveyorCheckpoint(checkpoint(), [statePath]).checkedAt).toBe(report.checkedAt)
  })
  it('rejects changed evidence, damaged files and private/path-traversal payloads', () => {
    expect(() => validateSurveyorCheckpoint({ ...checkpoint(), reportDigest: 'changed' }, [statePath])).toThrow(/digest/)
    expect(() => validateSurveyorCheckpoint({ ...checkpoint(), files: { [statePath]: { content: state, digest: 'bad' } } }, [statePath])).toThrow(/digest/)
    for (const invalid of ['../outside.json', '.monitoring-state/private/gmail.json']) expect(() => validateSurveyorCheckpoint({ ...checkpoint(), files: { [invalid]: { content: state, digest: surveyorReportDigest(state) } } }, [invalid])).toThrow(/public file/)
    const pending = { ...state, pending: { source: { textHash: 'unreviewed' } } }
    expect(() => validateSurveyorCheckpoint({ ...checkpoint(), files: { [statePath]: { content: pending, digest: surveyorReportDigest(pending) } } }, [statePath])).toThrow(/unaccepted/)
  })
})
