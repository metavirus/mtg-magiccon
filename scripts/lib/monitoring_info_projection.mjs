const TOPIC_BY_CONCEPT = {
  'atlanta:ticketed-play:sales-opening': 'ticketed-play',
  'atlanta:on-demand-play:logistics': 'on-demand-play',
  'atlanta:prize-tix:redemption': 'prize-tix',
}

export function projectResolutionToInfo(resolution, observation) {
  if (!resolution.concept || ['noise', 'corroboration'].includes(resolution.resolution)) return null
  const topicKey = TOPIC_BY_CONCEPT[resolution.concept.concept_key] ?? null
  const sources = observation.sourceUrl ? [{ label: observation.sourceLabel || 'Official source', url: observation.sourceUrl }] : []
  return {
    feed: {
      entry_key: `${resolution.concept.concept_key}:${resolution.resolution}:${observation.fingerprint}`,
      topic_key: topicKey,
      title: resolution.concept.title,
      summary: resolution.concept.current_summary,
      published_at: observation.observedAt,
      sources,
    },
    topic: topicKey ? { topic_key: topicKey, concise_answer: resolution.concept.current_summary, sources, updated_at: observation.observedAt } : null,
  }
}
