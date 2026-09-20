// A first fetch is a catch, not a reviewed baseline. Match both content and links
// so a reviewed placeholder cannot silently authorize newly published content.
export function sourceOnboardingReview(source, current) {
  const review = source.initialReview
  if (!review || review.contentHash !== current.contentHash || review.contentLinkHash !== current.contentLinkHash) return null
  if (!review.reviewedAt || !review.reason?.trim() || !['home', 'noise'].includes(review.disposition)) throw new Error(`Invalid initial review for ${source.id}`)
  if (review.disposition === 'home' && (!review.title?.trim() || !review.summary?.trim())) throw new Error(`Initial Home review needs title and summary: ${source.id}`)
  const { contentHash: _contentHash, contentLinkHash: _contentLinkHash, ...decision } = review
  return decision
}
