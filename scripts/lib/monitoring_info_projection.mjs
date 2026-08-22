const TOPIC_BY_CONCEPT = {
  'atlanta:ticketed-play:sales-opening': 'ticketed-play',
  'atlanta:on-demand-play:logistics': 'on-demand-play',
  'atlanta:prize-tix:redemption': 'prize-tix',
}

export function projectResolutionToInfo(resolution, observation) {
  if (!resolution.concept || ['noise', 'corroboration'].includes(resolution.resolution)) return null
  if (!observation.infoArticle?.sections?.length || !observation.contentHash) return null
  const topicKey = TOPIC_BY_CONCEPT[resolution.concept.concept_key] ?? null
  const feedConceptKey = topicKey ?? resolution.concept.concept_key
  const sources = observation.sourceUrl ? [{ key: observation.sourceId, label: observation.sourceLabel || 'Official source', url: observation.sourceUrl, publisher: 'Official publisher', retrievedAt: observation.observedAt, evidenceKind: 'official_page' }] : []
  return {
    feed: {
      entry_key: `concept-current:${feedConceptKey}`,
      concept_key: feedConceptKey,
      topic_key: topicKey,
      title: resolution.concept.title,
      summary: resolution.concept.current_summary,
      published_at: observation.observedAt,
      sources,
      feed_status: 'current',
    },
    topic: topicKey ? { topic_key: topicKey, concise_answer: resolution.concept.current_summary, article_status: 'maintained', article: observation.infoArticle, sources, updated_at: observation.observedAt } : null,
  }
}
