import { describe, expect, it } from 'vitest'
import { previewInfoFeed, previewInfoTopics, relatedInfoFeed } from './infoKnowledge'

describe('Info knowledge', () => {
  it('answers show hours immediately from maintained facts', () => {
    expect(previewInfoTopics.find(topic => topic.topic_key === 'hours')?.concise_answer).toContain('10 AM–7 PM')
  })
  it('keeps feed entries related without duplicating topics', () => {
    expect(relatedInfoFeed('ticketed-play', previewInfoFeed)).toHaveLength(1)
    expect(new Set(previewInfoTopics.map(topic => topic.topic_key)).size).toBe(previewInfoTopics.length)
  })
})
