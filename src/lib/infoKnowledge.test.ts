import { describe, expect, it } from 'vitest'
import { infoTopicForFeed, partitionInfoTopics, previewInfoFeed, previewInfoTopics, relatedInfoFeed } from './infoKnowledge'

describe('Info knowledge', () => {
  it('answers show hours immediately from maintained facts', () => {
    expect(previewInfoTopics.find(topic => topic.topic_key === 'hours')?.concise_answer).toContain('10 AM–7 PM')
  })
  it('keeps feed entries related without duplicating topics', () => {
    expect(relatedInfoFeed('ticketed-play', previewInfoFeed)).toHaveLength(1)
    expect(new Set(previewInfoTopics.map(topic => topic.topic_key)).size).toBe(previewInfoTopics.length)
  })
  it('keeps quick answers out of the secondary topic collection', () => {
    const { quick, more } = partitionInfoTopics(previewInfoTopics)
    expect(quick.map(topic => topic.topic_key)).toEqual(['hours', 'will-call', 'ticketed-play'])
    expect(more.map(topic => topic.topic_key)).toEqual(['on-demand-play', 'prize-tix'])
    expect(quick.filter(topic => more.includes(topic))).toHaveLength(0)
  })
  it('allows a feed-only update to open without inventing a topic', () => {
    const feedOnly = { ...previewInfoFeed[0], topic_key: null }
    expect(infoTopicForFeed(feedOnly, previewInfoTopics)).toBeUndefined()
  })
})
