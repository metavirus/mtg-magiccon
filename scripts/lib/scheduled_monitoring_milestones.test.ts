import { describe, expect, it } from 'vitest'
import { dueMonitoringMilestoneChanges } from './scheduled_monitoring_milestones.mjs'

const milestone = { id: 'sale-open', label: 'Ticketed Play sales milestone', opensAt: '2026-08-25T10:00:00-07:00', semanticSummary: 'Ticketed Play sales are now open. Sale date August 25 at 10 AM PT.' }

describe('scheduled monitoring milestones', () => {
  it('stays quiet before the deadline and emits once after it', () => {
    expect(dueMonitoringMilestoneChanges([milestone], {}, '2026-08-25T09:59:59-07:00').changes).toHaveLength(0)
    const due = dueMonitoringMilestoneChanges([milestone], {}, '2026-08-25T10:15:00-07:00')
    expect(due.changes).toHaveLength(1)
    expect(due.changes[0]).toMatchObject({ destination: 'Home', semanticSummary: expect.stringContaining('now open') })
    expect(dueMonitoringMilestoneChanges([milestone], due.reached, '2026-08-26T10:15:00-07:00').changes).toHaveLength(0)
  })
})
