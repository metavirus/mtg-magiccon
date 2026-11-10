import { describe, expect, it } from 'vitest'
import { personalBadgeReceipt } from './homePass'

const receipts = [
  { id: 'shared', receipt_type: 'badge', attendee_person_key: 'kavi', attendee_person_keys: ['kavi', 'chris'] },
  { id: 'transfer', receipt_type: 'badge', attendee_person_key: 'chris', attendee_person_keys: ['chris'] },
  { id: 'premium', receipt_type: 'badge', attendee_person_key: 'juan', attendee_person_keys: [] },
  { id: 'play', receipt_type: 'ticketed_play', attendee_person_key: 'kyle', attendee_person_keys: ['kyle'] },
]
describe('personal Home pass', () => {
  it('uses the shared order for Kavi and the individual transfer for Chris', () => {
    expect(personalBadgeReceipt(receipts, 'kavi')?.id).toBe('shared')
    expect(personalBadgeReceipt(receipts, 'chris')?.id).toBe('transfer')
  })
  it('supports the legacy individual attendee field', () => {
    expect(personalBadgeReceipt(receipts, 'juan')?.id).toBe('premium')
  })
  it('never substitutes another person’s badge or a ticketed event', () => {
    expect(personalBadgeReceipt(receipts, 'kyle')).toBeUndefined()
    expect(personalBadgeReceipt(receipts)).toBeUndefined()
  })
})
