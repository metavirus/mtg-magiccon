import { describe, expect, it } from 'vitest'
import { canReadPersonalCalendarEvent, validatePersonalCalendarEvent, type PersonalCalendarEvent } from './personalCalendar'

const event: PersonalCalendarEvent = { id: 'event', owner_id: 'owner', title: 'Dinner', event_date: '2026-11-13', start_time: '18:00', end_time: '19:00', visibility: 'private', invited_user_ids: ['guest'], updated_at: '' }
describe('personal calendar boundaries', () => {
  it('keeps private events owner/invitation only and requires an active companion for sharing', () => {
    expect(canReadPersonalCalendarEvent(event, 'owner', false)).toBe(true)
    expect(canReadPersonalCalendarEvent(event, 'guest', true)).toBe(true)
    expect(canReadPersonalCalendarEvent(event, 'guest', false)).toBe(false)
    expect(canReadPersonalCalendarEvent(event, 'other', true)).toBe(false)
    expect(canReadPersonalCalendarEvent({ ...event, visibility: 'shared' }, 'other', true)).toBe(true)
    expect(canReadPersonalCalendarEvent({ ...event, visibility: 'shared' }, undefined, true)).toBe(false)
  })
  it('rejects malformed and normalized invalid dates without throwing', () => {
    for (const date of ['', '2026-99-13', '2026-02-30', 'not a date']) expect(validatePersonalCalendarEvent({ ...event, event_date: date })).toBe('Choose a valid date.')
    expect(validatePersonalCalendarEvent(event)).toBeNull()
  })
  it('rejects empty titles and end times at/before start, including mixed DB/input precision', () => {
    expect(validatePersonalCalendarEvent({ ...event, title: '  ' })).toMatch(/title/)
    for (const end_time of ['17:59', '18:00', '18:00:00']) expect(validatePersonalCalendarEvent({ ...event, end_time })).toMatch(/after start/)
    expect(validatePersonalCalendarEvent({ ...event, start_time: '24:00' })).toMatch(/start and end/)
  })
})
