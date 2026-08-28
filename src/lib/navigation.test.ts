import { describe, expect, it } from 'vitest'
import { activityDestination, mobileDrawerDestinations, navigationDestinations, primaryDestinations } from './navigation'

describe('navigation model', () => {
  it('keeps desktop and mobile navigation on one ordered destination source', () => {
    expect(primaryDestinations.map(destination => destination.name)).toEqual([
      'Home', 'Explore', 'Plan', 'Calendar', 'Map', 'Info', 'Wallet', 'Trip', 'Artists', 'Notes',
    ])
    expect(mobileDrawerDestinations('events').map(destination => destination.name)).toEqual(['Explore', 'Plan', 'Calendar'])
    expect(mobileDrawerDestinations('more').map(destination => destination.name)).toEqual(['Wallet', 'Trip', 'Artists', 'Notes', 'Activity'])
    expect(activityDestination.desktopPlacement).toBe('footer')
    expect(new Set(navigationDestinations.map(destination => destination.surface)).size).toBe(navigationDestinations.length)
  })

  it('gives every drawer destination a useful compact note', () => {
    expect([...mobileDrawerDestinations('events'), ...mobileDrawerDestinations('more')]
      .every(destination => Boolean(destination.mobileNote))).toBe(true)
  })
})
