import type { InfoFeedEntry, InfoTopic } from './infoKnowledge'

export function isMaintainedInfoArticle(topic: InfoTopic) {
  return topic.article_status === 'maintained' && Boolean(topic.article?.lede && topic.article.sections.length)
}

export function infoTopicUsesReader(topic: InfoTopic) {
  return isMaintainedInfoArticle(topic) && !['hours', 'will-call'].includes(topic.topic_key)
}

export function publishedInfoTopics(topics: InfoTopic[]) {
  return topics.filter(topic => topic.article_status !== 'incomplete')
}

export function publishedInfoFeed(feed: InfoFeedEntry[], topics: InfoTopic[]) {
  const visibleKeys = new Set(publishedInfoTopics(topics).map(topic => topic.topic_key))
  const current = feed.filter(entry => (entry.feed_status ?? 'current') === 'current' && (!entry.topic_key || visibleKeys.has(entry.topic_key)))
  const byConcept = new Map<string, InfoFeedEntry>()
  for (const entry of [...current].sort((a, b) => b.published_at.localeCompare(a.published_at) || a.entry_key.localeCompare(b.entry_key))) {
    const conceptKey = entry.concept_key ?? entry.topic_key ?? entry.entry_key
    if (!byConcept.has(conceptKey)) byConcept.set(conceptKey, entry)
  }
  return [...byConcept.values()]
}

export function durableInfoFeedTitle(entry: InfoFeedEntry, topics: InfoTopic[]) {
  return entry.topic_key ? topics.find(topic => topic.topic_key === entry.topic_key)?.title ?? entry.title : entry.title
}
