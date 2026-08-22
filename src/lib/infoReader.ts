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
  return feed.filter(entry => !entry.topic_key || visibleKeys.has(entry.topic_key))
}

export function durableInfoFeedTitle(entry: InfoFeedEntry, topics: InfoTopic[]) {
  return entry.topic_key ? topics.find(topic => topic.topic_key === entry.topic_key)?.title ?? entry.title : entry.title
}
