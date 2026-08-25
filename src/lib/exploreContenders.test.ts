import { describe, expect, it } from 'vitest'
import { partitionExploreContenders } from '../App'

describe('Explore contender grouping', () => {
  it('promotes interested and tentative events without duplicating them', () => {
    const events = [
      { id: 'none', state: 'none' as const },
      { id: 'interested', state: 'interested' as const },
      { id: 'tentative', state: 'tentative' as const },
      { id: 'committed', state: 'committed' as const },
    ]

    const partitioned = partitionExploreContenders(events)

    expect(partitioned.contenders.map(event => event.id)).toEqual(['interested', 'tentative'])
    expect(partitioned.remainder.map(event => event.id)).toEqual(['none', 'committed'])
  })
})
