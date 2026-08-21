import { describe, expect, it, vi } from 'vitest'
import { executeMonitoringAction, routeMonitoringFinding } from '../../scripts/lib/monitoring_action_router.mjs'

const finding = {
  fingerprint: 'fdb94a0f97f2e47396b20694c33bf0110d38eff17e6253476e99c5358fb2f187',
  status: 'authorized',
  decision: 'yes',
  destination: 'Activity',
  evidence: {
    monitorCheckedAt: '2026-08-21T18:00:00.000Z',
    sourceIds: ['atlanta-info', 'atlanta-official-home'],
    linkDelta: {
      added: [
        'Ticketed Play Schedule -> https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play.html',
        'Prize Wall -> https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html',
      ],
      removed: [],
    },
  },
}

describe('monitoring action router', () => {
  it('routes the reviewed official-links finding without claiming canonical facts', () => {
    const first = routeMonitoringFinding(finding)
    const second = routeMonitoringFinding({
      ...finding,
      evidence: {
        ...finding.evidence,
        sourceIds: [...finding.evidence.sourceIds].reverse(),
        linkDelta: { ...finding.evidence.linkDelta, added: [...finding.evidence.linkDelta.added].reverse() },
      },
    })
    expect(first).toMatchObject({ action_type: 'publish_official_links_alert', execution_status: 'queued', canonical_target: { kind: 'activity_reviewed_source_alerts', destination: 'Activity' } })
    expect(first.action_payload).toMatchObject({ truth_class: 'reviewed_source_observation', canonical_fact_mutation: false })
    expect(first.action_fingerprint).toBe(second.action_fingerprint)
  })

  it.each([
    ['unapproved', { status: 'needs_review', decision: null }],
    ['removed link', { evidence: { ...finding.evidence, linkDelta: { ...finding.evidence.linkDelta, removed: ['old'] } } }],
    ['external host', { evidence: { ...finding.evidence, linkDelta: { added: ['Play -> https://example.com/magic-play'], removed: [] } } }],
  ])('fails closed for %s', (_label, patch) => {
    const plan = routeMonitoringFinding({ ...finding, ...patch })
    expect(plan.execution_status).toBe('blocked')
    expect(plan.blocker).toBeTruthy()
  })

  it('routes an exact official-links class to Activity even when the review card appeared on Home', () => {
    expect(routeMonitoringFinding({ ...finding, destination: 'Home' })).toMatchObject({
      execution_status: 'queued',
      action_payload: { destination: 'Activity' },
    })
  })

  it('requires matching idempotent readback evidence from the publisher', async () => {
    const plan = routeMonitoringFinding(finding)
    const publisher = vi.fn().mockResolvedValue({ published: true, idempotencyKey: 'wrong', readbackVerified: true })
    await expect(executeMonitoringAction(plan, publisher)).resolves.toMatchObject({ execution_status: 'failed' })
  })

  it('records proportional publish and verification evidence', async () => {
    const plan = routeMonitoringFinding(finding)
    const publisher = vi.fn().mockImplementation(({ idempotencyKey }) => Promise.resolve({
      published: true,
      idempotencyKey,
      readbackVerified: true,
      executedAt: '2026-08-21T20:00:00.000Z',
      canonicalResult: { alert_id: 'alert-1' },
      deploymentEvidence: { deploy_id: 'pages-1' },
      verificationEvidence: { route: 'activity', alert_id: 'alert-1' },
    }))
    await expect(executeMonitoringAction(plan, publisher)).resolves.toMatchObject({ execution_status: 'completed', canonical_result: { alert_id: 'alert-1' } })
    expect(publisher).toHaveBeenCalledTimes(1)
  })
})
