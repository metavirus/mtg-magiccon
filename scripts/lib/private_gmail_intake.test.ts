import { describe, expect, it } from 'vitest'
import { planPrivateGmailIntake, summarizePrivateIntake } from './private_gmail_intake.mjs'

const source = {
  system: 'gmail', messageId: 'gmail-123', threadId: 'thread-1', receivedAt: '2026-08-25T18:00:00Z',
  subject: 'Receipt', originalHtml: '<html><body>private proof 4111</body></html>',
}

describe('private Gmail intake', () => {
  it('deduplicates receipts by stable source identity and binds exact ticketed events', () => {
    const result = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source,
      receipt: { receiptType: 'ticketed_play', title: 'MagicCon order', vendor: 'Leap', receiptDate: '2026-08-25T18:00:00Z', amount: 80, currency: 'usd', attendeePersonKey: 'kavi', lineItems: [{ title: 'Sealed', eventId: 'ticketed-944015' }] },
    })
    expect(result.status).toBe('covered')
    if (result.status !== 'covered') return
    expect(result.sourceMessageId).toBe('gmail-123')
    expect(result.operation.eventIds).toEqual(['ticketed-944015'])
    expect(result.operation.receipt.source_message_id).toBe('gmail-123')
  })

  it('fails closed for ambiguous receipt attendee or event binding', () => {
    const ambiguousPerson = planPrivateGmailIntake({ kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source, receipt: { receiptType: 'badge', attendeePersonKey: 'juan' } })
    expect(ambiguousPerson).toMatchObject({ status: 'not_covered', reason: 'attendee_identity_ambiguous' })
    const ambiguousEvent = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source,
      receipt: { receiptType: 'ticketed_play', title: 'Order', vendor: 'Leap', receiptDate: source.receivedAt, amount: 1, currency: 'USD', attendeePersonKey: 'kavi', lineItems: [{ title: 'Unknown event' }] },
    })
    expect(ambiguousEvent).toMatchObject({ status: 'not_covered', reason: 'ticketed_event_binding_ambiguous' })
  })

  it('binds one shared order to multiple known attendees and preserves per-line assignments', () => {
    const result = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source,
      receipt: { receiptType: 'ticketed_play', title: 'Shared order', vendor: 'Leap', receiptDate: source.receivedAt, amount: 200, currency: 'USD', attendeePersonKeys: ['kavi', 'juan'], lineItems: [{ title: 'Sealed', eventId: 'ticketed-944015', price: 100, quantity: 2, code: 'ABC1234', attendeePersonKeys: ['kavi', 'juan'] }] },
    })
    expect(result).toMatchObject({ status: 'covered', operation: { attendeePersonKeys: ['kavi', 'juan'], receipt: { attendee_person_keys: ['kavi', 'juan'] } } })
    expect(summarizePrivateIntake(result)).toMatchObject({ consequence: { attendeeCount: 2, purchaseLockCount: 2 } })
  })

  it('fails closed when a shared line names an attendee outside the receipt or its quantity disagrees', () => {
    const base = { receiptType: 'ticketed_play', title: 'Shared order', vendor: 'Leap', receiptDate: source.receivedAt, amount: 200, currency: 'USD', attendeePersonKeys: ['kavi', 'juan'] }
    expect(planPrivateGmailIntake({ kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source, receipt: { ...base, lineItems: [{ title: 'Sealed', eventId: 'ticketed-944015', attendeePersonKeys: ['kavi', 'chris'] }] } })).toMatchObject({ status: 'not_covered', reason: 'ticketed_line_attendee_binding_ambiguous' })
    expect(planPrivateGmailIntake({ kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source, receipt: { ...base, lineItems: [{ title: 'Sealed', eventId: 'ticketed-944015', quantity: 1 }] } })).toMatchObject({ status: 'not_covered', reason: 'ticketed_line_quantity_mismatch' })
  })

  it('does not expose private original HTML in summaries', () => {
    const result = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source,
      receipt: { receiptType: 'other', title: 'Order', vendor: 'Vendor', receiptDate: source.receivedAt, amount: 1, currency: 'USD', attendeePersonKey: 'kavi', lineItems: [] },
    })
    expect(JSON.stringify(summarizePrivateIntake(result))).not.toContain('private proof')
    expect(JSON.stringify(summarizePrivateIntake(result))).not.toContain('4111')
  })

  it('covers a complete routine flight change and rejects identity ambiguity', () => {
    const flight = {
      kind: 'flight', mailboxOwnerPersonKey: 'kavi', source,
      flight: {
        itineraryKey: 'atlanta-2026-delta-hogfbx', confidence: 0.97,
        matchEvidence: { confirmation_code: 'HOGFBX', carrier: 'Delta Air Lines', travelers: ['kavi', 'juan'], changed_legs_complete: true, cancellation_or_rebooking: false, airline_assigned_replacement: false },
        update: { legs: [{ leg_key: 'outbound', flight_number: 'DL 329', departure_airport: 'SNA', arrival_airport: 'ATL', departure_at: '2026-11-11T22:00:00Z', arrival_at: '2026-11-12T02:16:00Z' }] },
      },
    }
    expect(planPrivateGmailIntake(flight)).toMatchObject({ status: 'covered', kind: 'flight' })
    expect(planPrivateGmailIntake({ ...flight, flight: { ...flight.flight, matchEvidence: { ...flight.flight.matchEvidence, travelers: ['kavi'] } } })).toMatchObject({ status: 'not_covered', reason: 'flight_identity_ambiguous' })
  })

  it('fails closed for an unstable airline replacement', () => {
    const result = planPrivateGmailIntake({
      kind: 'flight', mailboxOwnerPersonKey: 'kavi', source,
      flight: {
        itineraryKey: 'atlanta-2026-delta-hogfbx', confidence: 0.99,
        matchEvidence: { confirmation_code: 'HOGFBX', carrier: 'Delta', travelers: ['kavi', 'juan'], changed_legs_complete: true, cancellation_or_rebooking: true, airline_assigned_replacement: true, user_action_required: false, unresolved_choice: false, same_itinerary: true, same_travelers: true, same_carrier: true, same_dates: false, same_routes: true },
        update: { legs: [{ leg_key: 'outbound', flight_number: 'DL 1', departure_airport: 'SNA', arrival_airport: 'ATL', departure_at: '2026-11-12T22:00:00Z', arrival_at: '2026-11-13T02:00:00Z' }] },
      },
    })
    expect(result).toMatchObject({ status: 'not_covered', reason: 'replacement_stability_ambiguous' })
  })
})
