import { officialInfoArticles, officialInfoSnapshots, retrievedAt } from './data/official_info_articles.mjs'

const lit = value => `'${String(value).replaceAll("'", "''")}'`
const json = value => `${lit(JSON.stringify(value))}::jsonb`
const lines = ['begin;']
for (const row of officialInfoSnapshots) lines.push(`
insert into public.info_source_snapshots (source_key,title,url,publisher,retrieved_at,http_status,content_hash,evidence)
values (${lit(row.source_key)},${lit(row.title)},${lit(row.url)},${lit(row.publisher)},${lit(row.retrieved_at)}::timestamptz,${row.http_status},${lit(row.content_hash)},${json(row.evidence)})
on conflict (source_key,content_hash) do update set retrieved_at=excluded.retrieved_at,http_status=excluded.http_status,evidence=excluded.evidence;`)
for (const topic of officialInfoArticles) {
  lines.push(`
update public.info_topics set title=${lit(topic.title)},concise_answer=${lit(topic.concise_answer)},facts=${json(topic.facts)},sources=${json(topic.sources)},article_status='maintained',article=${json(topic.article)},updated_at=${lit(topic.updated_at)}::timestamptz where topic_key=${lit(topic.topic_key)};`)
  const change = topic.article.recent_changes.at(-1)
  lines.push(`
insert into public.info_feed_entries (entry_key,topic_key,title,summary,published_at,sources)
values (${lit(`article-maintained:${topic.topic_key}:${retrievedAt}`)},${lit(topic.topic_key)},${lit(change.title)},${lit(change.summary)},${lit(change.publishedAt)}::timestamptz,${json(topic.sources)})
on conflict (entry_key) do nothing;`)
}
lines.push('commit;')
process.stdout.write(lines.join('\n'))
