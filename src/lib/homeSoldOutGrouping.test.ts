import { describe, expect, it } from 'vitest'
import { groupHomeSoldOutEventsByDay, mergeHomeSoldOutEvents } from './homeSoldOutGrouping'

describe('mergeHomeSoldOutEvents', () => {
  it('deduplicates overlapping survey batches and preserves saved-plan people', () => {
    const merged = mergeHomeSoldOutEvents([
      [{ sourceEventKey: '1', title: 'One', day: '2026-11-13', startsAt: '11:00', people: [] }],
      [
        { sourceEventKey: '1', title: 'One', day: '2026-11-13', startsAt: '11:00', people: ['Kavi'] },
        { sourceEventKey: '2', title: 'Two', day: '2026-11-14', startsAt: '12:00', people: [] },
      ],
    ])

    expect(merged.map(event => event.sourceEventKey)).toEqual(['1', '2'])
    expect(merged[0].people).toEqual(['Kavi'])
  })

  it('creates one chronologically ordered group per event day', () => {
    const grouped = groupHomeSoldOutEventsByDay([
      [
        { sourceEventKey: 'sat-late', title: 'Saturday Late', day: '2026-11-14', startsAt: '16:30', people: [] },
        { sourceEventKey: 'fri', title: 'Friday', day: '2026-11-13', startsAt: '11:30', people: [] },
        { sourceEventKey: 'sat-early', title: 'Saturday Early', day: '2026-11-14', startsAt: '11:00', people: [] },
      ],
    ])

    expect(grouped.map(group => group.day)).toEqual(['2026-11-13', '2026-11-14'])
    expect(grouped[1].events.map(event => event.title)).toEqual(['Saturday Early', 'Saturday Late'])
  })
})
