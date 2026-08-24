import { describe, expect, it } from 'vitest'
import { partitionMentionInboxItems } from './mentionInbox'

describe('partitionMentionInboxItems', () => {
  it('keeps dismissed mentions recoverable without counting them as active', () => {
    const result = partitionMentionInboxItems([
      { id: 'active', dismissedAt: null },
      { id: 'hidden', dismissedAt: '2026-08-24T12:00:00Z' },
    ])

    expect(result.active.map(item => item.id)).toEqual(['active'])
    expect(result.dismissed.map(item => item.id)).toEqual(['hidden'])
  })
})
