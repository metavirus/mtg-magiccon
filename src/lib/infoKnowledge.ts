import { supabase } from './supabase'
import { officialInfoArticles } from '../../scripts/data/official_info_articles.mjs'

export type InfoSource = { key?: string; label: string; url?: string; detail?: string; publisher?: string; retrievedAt?: string; publishedAt?: string; evidenceKind?: 'official_page' | 'official_order'; contentHash?: string; capturedAt?: string }
export type InfoFact = { label: string; value: string; qualifier?: string }
export type InfoArticleSection = { key: string; title: string; summary?: string; facts?: InfoFact[]; bullets?: string[] }
export type InfoArticle = { lede: string; sections: InfoArticleSection[]; unknowns: string[]; contradictions: Array<{ summary: string; sourceKeys: string[] }>; recent_changes: Array<{ title: string; summary: string; publishedAt: string }> }
export type InfoTopic = { id: string; topic_key: string; title: string; concise_answer: string; facts: InfoFact[]; sources: InfoSource[]; article_status?: 'incomplete' | 'maintained'; article?: InfoArticle; updated_at: string }
export type InfoFeedEntry = { id: string; entry_key: string; topic_key: string | null; title: string; summary: string; published_at: string; sources: InfoSource[] }

const previewTopicSeeds: InfoTopic[] = [
  { id: 'hours', topic_key: 'hours', title: 'Show hours', concise_answer: 'The show floor is open 10 AM–7 PM Friday and Saturday, and 10 AM–6 PM Sunday.', facts: [{ label: 'Friday', value: '10 AM–7 PM' }, { label: 'Saturday', value: '10 AM–7 PM' }, { label: 'Sunday', value: '10 AM–6 PM' }, { label: 'Play area', value: 'Friday and Saturday until 11:59 PM' }], sources: [{ label: 'MagicCon: Atlanta 2026 Order Confirmation', detail: 'Received June 16, 2026' }], updated_at: '2026-06-16T00:00:00Z' },
  { id: 'will-call', topic_key: 'will-call', title: 'Will Call', concise_answer: 'Thursday 12–6 PM; Friday and Saturday 8:30 AM–7 PM; Sunday 8:30 AM–6 PM.', facts: [{ label: 'Thursday', value: '12 PM–6 PM' }, { label: 'Friday', value: '8:30 AM–7 PM' }, { label: 'Saturday', value: '8:30 AM–7 PM' }, { label: 'Sunday', value: '8:30 AM–6 PM' }], sources: [{ label: 'MagicCon: Atlanta 2026 Order Confirmation', detail: 'Received June 16, 2026' }], updated_at: '2026-06-16T00:00:00Z' },
  { id: 'ticketed-play', topic_key: 'ticketed-play', title: 'Ticketed Play', concise_answer: 'Sales open August 25 at 10 AM PT; event sales close one hour before each event starts.', facts: [{ label: 'Sales open', value: 'August 25 at 10 AM PT' }, { label: 'Sales close', value: 'One hour before each event starts' }], sources: [{ label: 'Official Ticketed Play Schedule', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule.html' }], updated_at: '2026-08-18T17:29:32.154Z' },
  { id: 'on-demand-play', topic_key: 'on-demand-play', title: 'On-Demand Play', concise_answer: 'Vouchers are sold in $5 increments, up to $100 per visit; registration hours are on the official page.', facts: [{ label: 'Voucher increments', value: '$5' }, { label: 'Maximum per visit', value: '$100' }], sources: [{ label: 'Official On-Demand Events', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/on-demand-events.html' }], updated_at: '2026-08-18T17:29:32.154Z' },
  { id: 'prize-tix', topic_key: 'prize-tix', title: 'Prize Tix', concise_answer: 'Prize Tix earned from play can be redeemed at the Prize Wall; specific awards remain with event listings.', facts: [{ label: 'Redeem at', value: 'Prize Wall' }, { label: 'Award amounts', value: 'See each event listing' }], sources: [{ label: 'Official Prizes, Prize Tix & Prize Wall', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html' }], updated_at: '2026-08-18T17:29:32.154Z' },
]
export const previewInfoTopics: InfoTopic[] = previewTopicSeeds.map(topic => ({ ...topic, ...(officialInfoArticles.find(article => article.topic_key === topic.topic_key) ?? {}) }))

export const previewInfoFeed: InfoFeedEntry[] = [
  { id: 'sale', entry_key: 'atlanta-ticketed-play-aug-25-sale', topic_key: 'ticketed-play', title: 'Ticketed Play sale timing published', summary: 'Sales open August 25 at 10 AM PT; event sales close one hour before each event starts.', published_at: '2026-08-18T17:29:32.154Z', sources: [] },
  { id: 'ode', entry_key: 'atlanta-on-demand-logistics', topic_key: 'on-demand-play', title: 'On-Demand Play logistics published', summary: 'Vouchers are sold in $5 increments, up to $100 per visit.', published_at: '2026-08-18T17:29:32.154Z', sources: [] },
  { id: 'prize', entry_key: 'atlanta-prize-wall-logistics', topic_key: 'prize-tix', title: 'Prize Wall guidance published', summary: 'The official Prize Wall page explains Prize Tix redemption.', published_at: '2026-08-18T17:29:32.154Z', sources: [] },
]

export async function loadInfoKnowledge() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const [topics, feed] = await Promise.all([
    supabase.from('info_topics').select('*').order('title'),
    supabase.from('info_feed_entries').select('*').order('published_at', { ascending: false }),
  ])
  if (topics.error) throw topics.error
  if (feed.error) throw feed.error
  return { topics: (topics.data ?? []) as InfoTopic[], feed: (feed.data ?? []) as InfoFeedEntry[] }
}

export function relatedInfoFeed(topicKey: string, feed: InfoFeedEntry[]) {
  return feed.filter(entry => entry.topic_key === topicKey)
}

export function partitionInfoTopics(topics: InfoTopic[], quickKeys = ['hours', 'will-call', 'ticketed-play']) {
  const quickKeySet = new Set(quickKeys)
  return {
    quick: quickKeys.map(key => topics.find(topic => topic.topic_key === key)).filter((topic): topic is InfoTopic => Boolean(topic)),
    more: topics.filter(topic => !quickKeySet.has(topic.topic_key)),
  }
}

export function infoTopicForFeed(entry: InfoFeedEntry, topics: InfoTopic[]) {
  return entry.topic_key ? topics.find(topic => topic.topic_key === entry.topic_key) : undefined
}
