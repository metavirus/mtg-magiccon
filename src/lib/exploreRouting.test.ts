import { describe, expect, it } from 'vitest'
import { hashPath, parseExploreRouteState } from './exploreRouting'

describe('Explore route parsing', () => {
  it('keeps the stable surface path separate from query-like Explore filter state', () => {
    expect(hashPath('#explore?type=play&group=high_signal')).toBe('explore')
    expect(hashPath('#calendar')).toBe('calendar')
  })

  it('opens grouped Home signals into the Play Explore slice by default', () => {
    expect(parseExploreRouteState('#explore?group=high_signal')).toEqual({
      eventType: 'play',
      mode: 'for-you',
      group: 'high_signal',
    })
    expect(parseExploreRouteState('#explore?group=all_ticketed_play')).toEqual({
      eventType: 'play',
      mode: 'for-you',
      group: 'all_ticketed_play',
    })
  })

  it('routes sold-out signals to changed Play results', () => {
    expect(parseExploreRouteState('#explore?type=play&group=sold_out')).toEqual({
      eventType: 'play',
      mode: 'changed',
      group: 'sold_out',
    })
  })

  it('preserves explicit day and ordinary type filters', () => {
    expect(parseExploreRouteState('#explore?type=social&mode=all&day=Fri')).toEqual({
      eventType: 'social',
      mode: 'all',
      day: 'Fri',
    })
  })
})
