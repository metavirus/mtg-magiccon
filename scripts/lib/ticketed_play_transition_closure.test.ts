import { describe, expect, it } from 'vitest'
import { closeTicketedPlayTransitions } from './ticketed_play_transition_closure.mjs'

const availability = (eventId: string) => ({ event_id: eventId, source_event_key: eventId.replace('ticketed-', ''), availability: 'sold_out' })
const retainedProof = (eventId: string) => ({
  targets: [{ kind: 'home', identifier: 'finding-1' }],
  readbacks: [{
    system: 'supabase', relation: 'monitoring_findings', match: { fingerprint: 'one' },
    observed: { id: 'finding-1', evidence: { events: [{ eventId }] } },
  }],
})

describe('Ticketed Play transition closure', () => {
  it('reports a canonical update when every transition has an availability readback', () => {
    const outcome = closeTicketedPlayTransitions({
      sourceId: 'atlanta-ticketed-play-inventory',
      transitions: [{ eventId: 'ticketed-1' }, { eventId: 'ticketed-2' }],
      availabilityReadback: [availability('ticketed-1'), availability('ticketed-2')],
    })
    expect(outcome.disposition).toBe('canonical_update')
    expect(outcome.readbacks[0].match.event_ids).toEqual(['ticketed-1', 'ticketed-2'])
  })

  it('retains an unresolved identity as evidence instead of falsely requiring a canonical row', () => {
    const outcome = closeTicketedPlayTransitions({
      sourceId: 'atlanta-ticketed-play-inventory',
      transitions: [{ eventId: 'ticketed-1' }, { eventId: 'leap-unmapped' }],
      availabilityReadback: [availability('ticketed-1')],
      proofs: [retainedProof('leap-unmapped')],
    })
    expect(outcome.disposition).toBe('retained_evidence')
    expect(outcome.rationale).toContain('1 unresolved identity transition')
    expect(outcome.targets).toContainEqual({ kind: 'home', identifier: 'finding-1' })
  })

  it('still fails closed when a transition has neither canonical nor evidence readback', () => {
    expect(() => closeTicketedPlayTransitions({
      sourceId: 'atlanta-ticketed-play-inventory',
      transitions: [{ eventId: 'ticketed-1' }, { eventId: 'leap-lost' }],
      availabilityReadback: [availability('ticketed-1')],
    })).toThrow('leap-lost')
  })
})
