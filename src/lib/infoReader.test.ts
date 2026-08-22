import { describe, expect, it } from 'vitest'
import { durableInfoFeedTitle, infoTopicUsesReader, isMaintainedInfoArticle, publishedInfoFeed, publishedInfoTopics } from './infoReader'
import type { InfoFeedEntry, InfoTopic } from './infoKnowledge'

const maintained: InfoTopic = {
  id: 'prize', topic_key: 'prize-tix', title: 'Prize Wall & Prize Tix', concise_answer: 'Redeem Prize Tix at the Prize Wall.', facts: [], sources: [], updated_at: '2026-08-18T00:00:00Z', article_status: 'maintained',
  article: { lede: 'Prize Tix are the event reward currency.', sections: [{ key: 'how', title: 'How it works', summary: 'Play, earn, redeem.' }], unknowns: [], contradictions: [], recent_changes: [] },
}

const incomplete: InfoTopic = { ...maintained, id: 'lead', topic_key: 'lead', title: 'Unverified lead', article_status: 'incomplete', article: undefined }
const feed: InfoFeedEntry[] = [{ id: 'change', entry_key: 'change', topic_key: 'prize-tix', title: 'Prize Wall guidance published', summary: 'Official guidance changed.', published_at: '2026-08-18T00:00:00Z', sources: [] }]

describe('Info reader presentation', () => {
  it('opens only supported maintained content as a reader article', () => {
    expect(isMaintainedInfoArticle(maintained)).toBe(true)
    expect(isMaintainedInfoArticle(incomplete)).toBe(false)
  })

  it('keeps immediate retrieval topics in the compact drawer', () => {
    expect(infoTopicUsesReader({ ...maintained, topic_key: 'hours' })).toBe(false)
    expect(infoTopicUsesReader(maintained)).toBe(true)
  })

  it('keeps incomplete discovery internal and out of the finished landing', () => {
    expect(publishedInfoTopics([maintained, incomplete])).toEqual([maintained])
    expect(publishedInfoFeed([{ ...feed[0], topic_key: 'lead' }], [maintained, incomplete])).toEqual([])
  })

  it('uses the durable topic title instead of a publication-event headline', () => {
    expect(durableInfoFeedTitle(feed[0], [maintained])).toBe('Prize Wall & Prize Tix')
  })
})
