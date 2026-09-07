import { describe, expect, it } from 'vitest'
import { scheduleStart, shareIncludedParticipant, sortScheduledEvents } from './scheduleDisplay'

describe('chronological Calendar display', () => {
  it('sorts Thursday source order without mutating it or hiding flexible pickups', () => {
    const events = ['12 PM start', '2-2:45 PM', '3-3:45 PM', '5:30-6:15 PM', '4:15-5:15 PM', 'TBD'].map(time => ({ time }))
    expect(sortScheduledEvents(events).map(e => e.time)).toEqual(['12 PM start', '2-2:45 PM', '3-3:45 PM', '4:15-5:15 PM', '5:30-6:15 PM', 'TBD'])
    expect(events[3].time).toBe('5:30-6:15 PM')
  })
  it.each([['11:30 AM–3:59 PM', 690], ['11-2 PM', 660], ['12 PM start', 720], ['12 AM–1 AM', 0], ['7 PM—10:25 PM', 1140]])('reads %s', (time, expected) => {
    expect(scheduleStart(String(time))).toBe(expected)
  })
  it('does not invent a time for an ambiguous listing', () => {
    expect(scheduleStart('11:30-3')).toBe(Infinity)
  })
})

describe('personal conflict scope', () => {
  const unknown = [{ person: 'Kavi' }, { person: 'Chris' }]
  const collector = [{ person: 'Kyle' }]
  const hexhaven = [{ person: 'Kavi' }, { person: 'Juan' }]
  const all = ['Kavi', 'Chris', 'Juan', 'Kyle']
  it('does not treat Kyle’s parallel Friday event as a conflict for other travelers', () => {
    expect(shareIncludedParticipant(unknown, collector, all)).toBe(false)
    expect(shareIncludedParticipant(collector, hexhaven, all)).toBe(false)
  })
  it('finds the shared traveler and respects the visible people filter', () => {
    expect(shareIncludedParticipant(unknown, hexhaven, all)).toBe(true)
    expect(shareIncludedParticipant(unknown, hexhaven, ['Chris', 'Juan'])).toBe(false)
    expect(shareIncludedParticipant([], collector, all)).toBe(false)
  })
})
