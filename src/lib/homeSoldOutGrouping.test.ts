import { describe, expect, it } from 'vitest'
import { mergeHomeSoldOutEvents } from './homeSoldOutGrouping'

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
})
