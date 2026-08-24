import { describe, expect, it } from 'vitest'
import { homeSignalAgeBucket } from './homeSignalAge'

const now = new Date('2026-08-24T12:00:00Z').getTime()

describe('Home Worth Knowing age buckets', () => {
  it('labels the past three days Recent and days four through fourteen Earlier', () => {
    expect(homeSignalAgeBucket('2026-08-22T12:00:00Z', now)).toBe('recent')
    expect(homeSignalAgeBucket('2026-08-20T12:00:00Z', now)).toBe('earlier')
    expect(homeSignalAgeBucket('2026-08-10T12:00:00Z', now)).toBe('earlier')
  })

  it('excludes older and invalid timestamps', () => {
    expect(homeSignalAgeBucket('2026-08-09T11:59:59Z', now)).toBeNull()
    expect(homeSignalAgeBucket('unknown', now)).toBeNull()
  })
})
