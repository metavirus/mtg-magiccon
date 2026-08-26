import { describe, expect, it } from 'vitest'
import { buildMonitoringCandidateRows } from './build_monitoring_candidates.mjs'

describe('ticketed inventory candidate staging', () => {
  it('stages one grouped Home row plus one persistent Inbox row for a selected sellout', () => {
    const event = {
      id: 'ticketed-944015', sourceEventKey: '944015', sourceUrl: 'https://conventions.leapevent.tech/ed/schedule/htwhdatl26shdl10',
      title: 'Commander Sealed Draft with Commander at Home', day: '2026-11-13', startsAt: '11:30', endsAt: '15:25',
      availability: 'sold_out', availabilityEvidence: { kind: 'explicit_text', text: 'SOLD OUT' },
    }
    const report = {
      checkedAt: '2026-08-25T20:00:00Z',
      changes: [{ intakeKind: 'ticketed_play_inventory', transitions: [{ kind: 'availability_transition', sourceEventKey: '944015', eventId: event.id, previousAvailability: 'available', availability: 'sold_out', event }] }],
    }
    const rows = buildMonitoringCandidateRows(report, {
      selectionRows: [{ owner_id: 'kavi-id', object_id: 'explore-ticketed-944015', object_kind: 'event', selection_key: 'state', selection_value: 'interested' }],
      companions: [{ user_id: 'kavi-id', display_name: 'Kavi' }],
    })
    expect(rows.map(row => row.destination)).toEqual(['Home', 'Inbox'])
    expect(rows[0].evidence.events).toHaveLength(1)
    expect(rows[1]).toMatchObject({ status: 'unread', evidence: { persistent_inbox: true, bell: true } })
  })
})
