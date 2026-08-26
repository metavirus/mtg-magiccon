const TOPIC_BY_CONCEPT = {
  'atlanta:ticketed-play:sales-opening': 'ticketed-play',
  'atlanta:on-demand-play:logistics': 'on-demand-play',
  'atlanta:prize-tix:redemption': 'prize-tix',
}

function officialSource(observation) {
  return observation.sourceUrl ? {
    key: observation.sourceId, label: observation.sourceLabel || 'Official source', url: observation.sourceUrl,
    publisher: 'Official publisher', retrievedAt: observation.observedAt, evidenceKind: 'official_page',
  } : null
}

function uniqueSources(sources) {
  return [...new Map(sources.filter(Boolean).map(source => [source.url || source.key, source])).values()]
}

function canonicalFact(topic, claim) {
  const section = topic?.article?.sections?.find(item => item.key === claim.section_key)
  return section?.facts?.find(fact => fact.label === claim.fact_label) ?? null
}

export function monitoringConceptBaselineFromInfo(extracted, topic) {
  if (extracted?.concept_kind !== 'info_article_fact' || topic?.topic_key !== extracted.claim?.topic_key) return null
  const fact = canonicalFact(topic, extracted.claim)
  if (!fact?.value) return null
  return {
    concept_key: extracted.concept_key, concept_kind: extracted.concept_kind, title: extracted.title,
    current_summary: `${extracted.title}: ${fact.value}`, attention_state: 'informational', latest_resolution: 'corroboration',
    current_state: { ...extracted.claim, value: fact.value, provenance: (topic.sources ?? []).flatMap(source => source.url ? [{ source_id: source.key || topic.topic_key, label: source.label || 'Official source', url: source.url, observed_at: source.retrievedAt || source.capturedAt || topic.updated_at }] : []) },
  }
}

export function projectRegisteredFactResolution(resolution, observation, topic) {
  const concept = resolution?.concept
  if (concept?.concept_kind !== 'info_article_fact') return null
  const claim = concept.proposed_state ?? concept.current_state
  if (!claim?.topic_key || topic?.topic_key !== claim.topic_key) return null
  const target = { kind: 'info_topic_article_fact', concept_key: concept.concept_key, topic_key: claim.topic_key, section_key: claim.section_key, fact_label: claim.fact_label }
  if (resolution.resolution === 'contradiction') return { mutation: null, receipt: { catch_id: resolution.observation_fingerprint, disposition: 'user_choice_staged', canonical_target: target, readback: null } }
  if (!['new', 'corroboration'].includes(resolution.resolution)) return null
  const source = officialSource(observation)
  const article = structuredClone(topic.article ?? { lede: '', sections: [], unknowns: [], contradictions: [], recent_changes: [] })
  let section = article.sections.find(item => item.key === claim.section_key)
  if (!section) {
    section = { key: claim.section_key, title: claim.section_key.replace(/-/g, ' '), facts: [] }
    article.sections.push(section)
  }
  section.facts ??= []
  let fact = section.facts.find(item => item.label === claim.fact_label)
  if (!fact) {
    fact = { label: claim.fact_label, value: claim.value }
    section.facts.push(fact)
  }
  const sources = uniqueSources([...(topic.sources ?? []), source])
  const disposition = resolution.resolution === 'corroboration' ? 'canonical_corroborated' : 'canonical_applied'
  return {
    mutation: { topic_key: topic.topic_key, article, sources, updated_at: observation.observedAt },
    receipt: { catch_id: resolution.observation_fingerprint, disposition, canonical_target: target, readback: { value: claim.value, source_url: source?.url ?? null, updated_at: observation.observedAt } },
  }
}

export function verifyRegisteredFactReadback(receipt, topic) {
  const target = receipt?.canonical_target
  const fact = topic?.article?.sections?.find(section => section.key === target?.section_key)?.facts?.find(item => item.label === target?.fact_label)
  const sourceVerified = !receipt?.readback?.source_url || (topic?.sources ?? []).some(source => source.url === receipt.readback.source_url)
  return Boolean(topic?.topic_key === target?.topic_key && fact?.value === receipt?.readback?.value && sourceVerified)
}

export function projectResolutionToInfo(resolution, observation) {
  if (!resolution.concept || ['noise', 'corroboration'].includes(resolution.resolution)) return null
  if (resolution.concept.concept_kind === 'info_article_fact') return null
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
