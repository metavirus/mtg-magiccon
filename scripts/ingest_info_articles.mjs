import { createClient } from '@supabase/supabase-js'
import { officialInfoArticles, officialInfoSnapshots, retrievedAt } from './data/official_info_articles.mjs'
import { reconcileInfoArticle } from './lib/info_article_reconciler.mjs'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!supabaseUrl || !secretKey) throw new Error('Info ingestion requires canonical SUPABASE_URL and server-only SUPABASE_SECRET_KEY.')
if (!supabaseUrl.includes('pavjsexxbueuzhzgemgy.supabase.co') || !secretKey.startsWith('sb_secret_')) throw new Error('Refusing noncanonical or non-secret Info ingestion credentials.')
const client = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

const snapshotWrite = await client.from('info_source_snapshots').upsert(officialInfoSnapshots, { onConflict: 'source_key,content_hash' })
if (snapshotWrite.error) throw snapshotWrite.error
const existing = await client.from('info_topics').select('*').in('topic_key', officialInfoArticles.map(article => article.topic_key))
if (existing.error) throw existing.error
const byKey = new Map((existing.data ?? []).map(topic => [topic.topic_key, topic]))
for (const candidate of officialInfoArticles) {
  const reconciled = reconcileInfoArticle(byKey.get(candidate.topic_key), candidate, 'material_update')
  if (!reconciled.publishable) throw new Error(`Refusing incomplete Info article ${candidate.topic_key}.`)
  const topic = reconciled.topic
  const write = await client.from('info_topics').upsert({ topic_key: topic.topic_key, title: topic.title, concise_answer: topic.concise_answer, facts: topic.facts, sources: topic.sources, article_status: topic.article_status, article: topic.article, updated_at: topic.updated_at }, { onConflict: 'topic_key' })
  if (write.error) throw write.error
  if (candidate.publish_current_feed) {
    const change = topic.article.recent_changes.at(-1)
    const feed = await client.from('info_feed_entries').upsert({ entry_key: `concept-current:${topic.topic_key}`, concept_key: topic.topic_key, topic_key: topic.topic_key, title: change.title, summary: change.summary, published_at: change.publishedAt, sources: topic.sources, feed_status: 'current' }, { onConflict: 'entry_key' })
    if (feed.error) throw feed.error
  }
}
console.log(`Info ingestion: PASS (${officialInfoSnapshots.length} source snapshots; ${officialInfoArticles.length} maintained articles; deterministic upsert)`)
