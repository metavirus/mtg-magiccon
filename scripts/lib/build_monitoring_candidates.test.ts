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

describe('interesting announcement routing', () => {
  it('routes a first-party Atlanta announcement to Home as a normal unread card', () => {
    const rows = buildMonitoringCandidateRows({
      checkedAt: '2026-09-06T18:00:00Z',
      changes: [{
        id: 'newsletter:spell-slayers',
        label: 'Spell Slayers are coming to Atlanta',
        url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/atlanta-spell-slayers.html',
        priority: 'canonical',
        destination: 'Activity',
        intakeKind: 'first_party_newsletter',
        discoveredFrom: 'global-magiccon-news',
        semanticSummary: 'Bosco and Irene the Alien are coming to MagicCon Atlanta.',
        current: { status: 200, title: 'Spell Slayers are coming to Atlanta', textHash: 'new', linkHash: '', textSample: 'Bosco and Irene the Alien are coming to MagicCon Atlanta.' },
        previous: null,
        linkDelta: { added: [], removed: [] },
      }],
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      destination: 'Home',
      status: 'unread',
      title: 'Spell Slayers are coming to Atlanta',
      evidence: { home_signal_kind: 'interesting_announcement', intake_kind: 'first_party_newsletter' },
    })
  })
})
