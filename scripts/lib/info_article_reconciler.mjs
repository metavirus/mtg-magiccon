function uniqueBy(items, key) {
  return [...new Map(items.map(item => [key(item), item])).values()]
}

export function articleCandidateStatus(candidate) {
  return candidate?.article?.sections?.length > 0 && candidate.sources?.some(source => source.contentHash) ? 'maintained' : 'incomplete'
}

export function reconcileInfoArticle(existing, candidate, resolution = 'new') {
  const status = articleCandidateStatus(candidate)
  if (status === 'incomplete') return { article_status: 'incomplete', publishable: false, topic: existing ?? null, feed: null }
  if (resolution === 'corroboration' && existing) {
    return {
      article_status: existing.article_status,
      publishable: false,
      topic: { ...existing, sources: uniqueBy([...(existing.sources ?? []), ...candidate.sources], source => source.key) },
      feed: null,
    }
  }
  const priorArticle = existing?.article ?? { sections: [], unknowns: [], contradictions: [], recent_changes: [] }
  const article = {
    lede: candidate.article.lede,
    sections: uniqueBy([...priorArticle.sections, ...candidate.article.sections], section => section.key),
    unknowns: uniqueBy([...priorArticle.unknowns, ...candidate.article.unknowns], value => value),
    contradictions: uniqueBy([...priorArticle.contradictions, ...candidate.article.contradictions], value => `${value.summary}:${value.sourceKeys.join(',')}`),
    recent_changes: uniqueBy([...priorArticle.recent_changes, ...candidate.article.recent_changes], value => `${value.title}:${value.publishedAt}`),
  }
  return {
    article_status: 'maintained',
    publishable: true,
    topic: { ...existing, ...candidate, article_status: 'maintained', article, sources: uniqueBy([...(existing?.sources ?? []), ...candidate.sources], source => source.key) },
    feed: resolution === 'new' || resolution === 'material_update' || resolution === 'contradiction' || resolution === 'milestone_transition'
      ? candidate.feed ?? null : null,
  }
}
