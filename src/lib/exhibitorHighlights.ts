import reviews from '../../monitoring/exhibitor-highlights.json'

type OfferEvidence = { id?: string; title: string; description: string; price?: string }
type HighlightSource = { id: string; name: string; booth: string; description: string; specials?: OfferEvidence[]; exclusives?: OfferEvidence[] }
export type HighlightReview = {
  sourceName: string; sourceBooth: string; summary: string; reason: string
  sourceUrl: string; reviewedAt: string
  evidence: { descriptionIncludes: string[]; offers: OfferEvidence[] }
}

// Vendor "featured", "special" and "exclusive" flags never grant prominence.
// Bind the reviewed claim to its relevant source evidence, not unrelated copy.
export function exhibitorHighlight(source: HighlightSource, review: HighlightReview | undefined = (reviews as Record<string, HighlightReview>)[source.id]): string {
  if (!review || source.name !== review.sourceName || source.booth !== review.sourceBooth
    || !review.summary.trim() || (!review.evidence.descriptionIncludes.length && !review.evidence.offers.length)) return ''
  if (!review.evidence.descriptionIncludes.every(excerpt => excerpt && source.description.includes(excerpt))) return ''
  const offers = [...(source.specials ?? []), ...(source.exclusives ?? [])]
  if (!review.evidence.offers.every(evidence => offers.some(offer =>
    offer.id === evidence.id && offer.title === evidence.title && offer.description === evidence.description
    && (offer.price ?? '') === (evidence.price ?? '')))) return ''
  return review.summary
}
