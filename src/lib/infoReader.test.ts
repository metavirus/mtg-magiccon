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

  it('collapses the exact seven-row recurrence to one current card per concept', () => {
    const topics = [
      maintained,
      { ...maintained, id: 'ode', topic_key: 'on-demand-play', title: 'On-Demand Play' },
      { ...maintained, id: 'ticketed', topic_key: 'ticketed-play', title: 'Ticketed Play' },
    ]
    const row = (entry_key: string, topic_key: string, published_at: string, feed_status: InfoFeedEntry['feed_status'] = 'current', title = entry_key): InfoFeedEntry => ({ id: entry_key, entry_key, concept_key: topic_key, topic_key, title, summary: title, published_at, sources: [], feed_status })
    const seven = [
      row('concept-current:prize-tix', 'prize-tix', '2026-08-22T00:00:00Z'),
      row('concept-current:on-demand-play', 'on-demand-play', '2026-08-22T00:00:00Z'),
      row('concept-current:ticketed-play', 'ticketed-play', '2026-08-22T00:00:00Z'),
      row('atlanta-magic-play-resources', 'ticketed-play', '2026-08-21T19:58:21Z', 'internal', 'Official Magic Play resources linked'),
      row('atlanta-ticketed-play-aug-25-sale', 'ticketed-play', '2026-08-18T17:29:32Z', 'superseded'),
      row('atlanta-on-demand-logistics', 'on-demand-play', '2026-08-18T17:29:32Z', 'superseded'),
      row('atlanta-prize-wall-logistics', 'prize-tix', '2026-08-18T17:29:32Z', 'superseded'),
    ]
    expect(publishedInfoFeed(seven, topics).map(entry => entry.topic_key)).toEqual(['on-demand-play', 'prize-tix', 'ticketed-play'])
    expect(publishedInfoFeed([...seven].reverse(), topics).map(entry => entry.entry_key)).toEqual(publishedInfoFeed(seven, topics).map(entry => entry.entry_key))
    expect(publishedInfoFeed(seven, topics).some(entry => entry.title.includes('resources linked'))).toBe(false)
  })
})
