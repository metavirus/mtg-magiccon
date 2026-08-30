export type CatalogFamily = 'show_store' | 'black_lotus' | 'prize_wall'

export type CatalogCaptureKind = 'official_pdf' | 'official_web' | 'board_photo' | 'manual_entry'

export type CatalogAvailability =
  | 'available'
  | 'limited'
  | 'sold_out'
  | 'restocking'
  | 'unavailable'
  | 'unknown'

export type CatalogImageQuality = 'evidence_only' | 'thumbnail_only' | 'midsize' | 'high_quality' | 'unacceptable'

export type CatalogImageMatchStatus = 'unreviewed' | 'exact_product' | 'exact_variant' | 'representative' | 'unmatched'

export interface CatalogPhotoIntakeItem {
  source_item_key?: string
  name?: string
  display_price?: string
  currency?: string
  price_minor?: number
  prize_ticket_cost?: number
  presentation_quality?: CatalogImageQuality
  presentation?: {
    source_provider?: string
    source_url?: string
    source_sha256?: string
    match_status?: CatalogImageMatchStatus
  } | null
  presentation_candidates?: Array<{
    candidate_key: string
    image_url: string
    source_provider: string
    source_page_url: string
    candidate_kind?: 'sourced_photo' | 'diagram_standin' | 'ai_reconstruction' | 'ai_outline'
    match_status?: CatalogImageMatchStatus
    review_note?: string
  }>
  media?: {
    evidence?: string
    card?: string
    thumb?: string
  }
  hashes?: {
    evidence_sha256?: string
    card_sha256?: string
    thumb_sha256?: string
  }
}

export function catalogPresentationRoute(item: CatalogPhotoIntakeItem): 'candidate_ready' | 'search_required' {
  const exactPresentation = Boolean(
    item.presentation?.source_url
    && (item.presentation.match_status === 'exact_product' || item.presentation.match_status === 'exact_variant'),
  )
  return item.presentation_quality === 'thumbnail_only' && !exactPresentation ? 'search_required' : 'candidate_ready'
}

export interface CatalogPhotoIntakeReviewManifest {
  schema_version?: number
  catalog?: {
    catalog_key?: string
    family?: CatalogFamily
    title?: string
    section?: string
    event_key?: string
    fixture_only?: boolean
  }
  source?: {
    source_kind?: string
    source_url?: string
    source_label?: string
    observed_on?: string
    rights_note?: string
    original_filename?: string
    original_path?: string
    original_sha256?: string
    rectified_sha256?: string
  }
  review_gate?: {
    status?: string
  }
  items?: CatalogPhotoIntakeItem[]
}

export type CatalogOfferValue =
  | { kind: 'price'; amountMinor: number; currency: string; displayLabel?: string }
  | { kind: 'prize_tix'; cost: number; displayLabel?: string }

export interface CatalogAvailabilityReview {
  status: CatalogAvailability
  observedAt: string
  eventDay: string
  quantitySeen?: number | null
  note?: string
}

export type CatalogPresentationMediaReview =
  | {
      decision: 'approved'
      quality: CatalogImageQuality
      matchStatus: CatalogImageMatchStatus
      mediaRole: 'product_crop' | 'product_image'
      source: 'evidence' | 'card' | 'thumb' | 'external'
      externalUrl?: string
      sourceProvider?: string
      sourceUrl?: string
      sha256?: string
      reviewNote?: string
    }
  | {
      decision: 'rejected' | 'pending'
      quality: CatalogImageQuality
      matchStatus: CatalogImageMatchStatus
      reviewNote?: string
    }

interface CatalogItemReviewBase {
  sourceItemKey: string
  reviewedBy: string
  reviewedAt: string
}

export type CatalogItemReviewDecision =
  | (CatalogItemReviewBase & {
      decision: 'approve'
      identityStatus: 'exact_product' | 'exact_variant' | 'ambiguous' | 'unmatched'
      canonicalKey: string
      offerKey: string
      productName: string
      category: string
      variantKey?: string
      variantLabel?: string
      value: CatalogOfferValue
      presentationMedia: CatalogPresentationMediaReview
      availability: CatalogAvailabilityReview
      purchaseLimit?: number
      sortOrder?: number
    })
  | (CatalogItemReviewBase & {
      decision: 'reject'
      reason: string
      identityStatus?: 'exact_product' | 'exact_variant' | 'ambiguous' | 'unmatched'
    })
  | (CatalogItemReviewBase & {
      decision: 'pending'
      identityStatus?: 'exact_product' | 'exact_variant' | 'ambiguous' | 'unmatched'
    })

export interface CatalogImportBatch {
  batchKey: string
  manifest: CatalogPhotoIntakeReviewManifest
  decisions: CatalogItemReviewDecision[]
}

export type CatalogImportIssueCode =
  | 'invalid_batch'
  | 'invalid_manifest'
  | 'fixture_catalog'
  | 'missing_catalog_identity'
  | 'missing_source_identity'
  | 'duplicate_source_item'
  | 'duplicate_review'
  | 'missing_review'
  | 'unknown_review_item'
  | 'unresolved_review'
  | 'ambiguous_identity'
  | 'missing_product_identity'
  | 'missing_value'
  | 'invalid_value_for_family'
  | 'missing_media_review'
  | 'invalid_media'
  | 'missing_availability'
  | 'invalid_offer'
  | 'invalid_rejection'

export interface CatalogImportIssue {
  code: CatalogImportIssueCode
  message: string
  sourceItemKey?: string
}

export interface CatalogPromotionItem {
  sourceItemKey: string
  product: {
    canonicalKey: string
    name: string
    category: string
  }
  variant: null | {
    variantKey: string
    label: string
  }
  offer: {
    offerKey: string
    value: CatalogOfferValue
    purchaseLimit: number | null
    sortOrder: number
    published: true
  }
  reviewedObservation: {
    sourceName: string
    sourceRawText: string
    value: CatalogOfferValue
    reviewStatus: 'approved'
    reviewedBy: string
    reviewedAt: string
  }
  presentationMedia: {
    mediaRole: 'product_crop' | 'product_image'
    quality: Exclude<CatalogImageQuality, 'unacceptable'>
    matchStatus: 'exact_product' | 'exact_variant'
    source: 'evidence' | 'card' | 'thumb' | 'external'
    path: string | null
    sha256: string | null
    externalUrl: string | null
    sourceProvider: string | null
    sourceUrl: string | null
    reviewNote: string | null
    reviewStatus: 'approved'
    reviewedBy: string
    reviewedAt: string
  }
  availabilityObservation: {
    availability: CatalogAvailability
    observedAt: string
    eventDay: string
    quantitySeen: number | null
    note: string | null
  }
}

export interface CatalogPromotionPlan {
  schemaVersion: 1
  batchKey: string
  catalog: {
    catalogKey: string
    eventKey: string
    family: CatalogFamily
    title: string
    section: string | null
  }
  sourceCapture: {
    identityKey: string
    captureKind: CatalogCaptureKind
    intakeSourceKind: string
    sourceLabel: string
    sourceUrl: string | null
    sourceSha256: string
    originalFilename: string
    originalPath: string
    observedOn: string
    rightsNote: string | null
  }
  retainedReviews: Array<{
    sourceItemKey: string
    decision: 'approve' | 'reject'
    reason: string | null
    reviewedBy: string
    reviewedAt: string
  }>
  promotions: CatalogPromotionItem[]
}

export type CatalogPromotionPlanResult =
  | { status: 'ready'; plan: CatalogPromotionPlan }
  | { status: 'blocked'; issues: CatalogImportIssue[] }

const SHA256 = /^[0-9a-f]{64}$/
const KEY = /^[a-z0-9][a-z0-9_-]{0,119}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const CURRENCY = /^[A-Z]{3}$/
const HTTPS = /^https:\/\//
const AVAILABILITY = new Set<CatalogAvailability>(['available', 'limited', 'sold_out', 'restocking', 'unavailable', 'unknown'])

const nonBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const validDate = (value: unknown): value is string => {
  if (!nonBlank(value) || !DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

const normalizedInstant = (value: unknown): string | null => {
  if (!nonBlank(value)) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString()
}

const issue = (code: CatalogImportIssueCode, message: string, sourceItemKey?: string): CatalogImportIssue => ({
  code,
  message,
  ...(sourceItemKey ? { sourceItemKey } : {}),
})

function validateValue(value: CatalogOfferValue | undefined): boolean {
  if (!value || typeof value !== 'object') return false
  if (value.kind === 'price') {
    return Number.isInteger(value.amountMinor) && value.amountMinor >= 0 && nonBlank(value.currency) && CURRENCY.test(value.currency)
  }
  if (value.kind === 'prize_tix') return Number.isInteger(value.cost) && value.cost >= 0
  return false
}

function normalizedValue(value: CatalogOfferValue): CatalogOfferValue {
  if (value.kind === 'price') {
    return {
      kind: 'price',
      amountMinor: value.amountMinor,
      currency: value.currency,
      ...(nonBlank(value.displayLabel) ? { displayLabel: value.displayLabel.trim() } : {}),
    }
  }
  return {
    kind: 'prize_tix',
    cost: value.cost,
    ...(nonBlank(value.displayLabel) ? { displayLabel: value.displayLabel.trim() } : {}),
  }
}

function rawItemText(item: CatalogPhotoIntakeItem): string {
  return [item.name, item.display_price ?? (item.prize_ticket_cost != null ? `${item.prize_ticket_cost} Prize Tix` : undefined)]
    .filter(nonBlank)
    .join(' · ')
}

function captureKind(sourceKind: string): CatalogCaptureKind | null {
  if (sourceKind === 'observed_onsite_photo' || sourceKind === 'board_photo') return 'board_photo'
  if (sourceKind === 'official_pdf' || sourceKind === 'official_web' || sourceKind === 'manual_entry') return sourceKind
  return null
}

function selectedManifestMedia(item: CatalogPhotoIntakeItem, source: 'evidence' | 'card' | 'thumb') {
  const path = item.media?.[source]
  const hashKey = `${source}_sha256` as 'evidence_sha256' | 'card_sha256' | 'thumb_sha256'
  const hash = item.hashes?.[hashKey]
  return nonBlank(path) && nonBlank(hash) && SHA256.test(hash) ? { path, hash } : null
}

export function buildCatalogPromotionPlan(batch: CatalogImportBatch): CatalogPromotionPlanResult {
  const issues: CatalogImportIssue[] = []
  if (!nonBlank(batch?.batchKey) || !KEY.test(batch.batchKey)) issues.push(issue('invalid_batch', 'Batch key must be a stable lowercase key.'))

  const manifest = batch?.manifest
  if (!manifest || manifest.schema_version !== 1 || !Array.isArray(manifest.items)) {
    return { status: 'blocked', issues: [...issues, issue('invalid_manifest', 'A schema-version 1 photo intake review manifest is required.')] }
  }

  const catalog = manifest.catalog
  if (!catalog || !nonBlank(catalog.catalog_key) || !KEY.test(catalog.catalog_key) || !nonBlank(catalog.event_key) ||
      !nonBlank(catalog.title) || !catalog.family || !(['show_store', 'black_lotus', 'prize_wall'] as const).includes(catalog.family)) {
    issues.push(issue('missing_catalog_identity', 'Catalog key, event key, family, and title are required.'))
  }
  if (catalog?.fixture_only === true) issues.push(issue('fixture_catalog', 'Fixture-only intake evidence cannot be promoted.'))

  const source = manifest.source
  if (!source || !nonBlank(source.source_kind) || !nonBlank(source.source_label) || !nonBlank(source.original_filename) ||
      !captureKind(source.source_kind) || !nonBlank(source.original_path) || !nonBlank(source.original_sha256) || !SHA256.test(source.original_sha256) ||
      !validDate(source.observed_on) || (nonBlank(source.source_url) && !HTTPS.test(source.source_url))) {
    issues.push(issue('missing_source_identity', 'Exact source kind, label, original file/path, SHA-256, and observed day are required.'))
  }

  const itemByKey = new Map<string, CatalogPhotoIntakeItem>()
  for (const item of manifest.items) {
    if (!nonBlank(item.source_item_key)) {
      issues.push(issue('duplicate_source_item', 'Every manifest item must have a source item key.'))
      continue
    }
    if (itemByKey.has(item.source_item_key)) issues.push(issue('duplicate_source_item', 'Source item key is duplicated.', item.source_item_key))
    else itemByKey.set(item.source_item_key, item)
  }

  const decisionByKey = new Map<string, CatalogItemReviewDecision>()
  if (!Array.isArray(batch.decisions)) issues.push(issue('missing_review', 'Item review decisions are required.'))
  for (const decision of batch.decisions ?? []) {
    if (!nonBlank(decision.sourceItemKey)) {
      issues.push(issue('unknown_review_item', 'A review decision has no source item key.'))
      continue
    }
    if (!itemByKey.has(decision.sourceItemKey)) issues.push(issue('unknown_review_item', 'Review does not match a manifest item.', decision.sourceItemKey))
    if (decisionByKey.has(decision.sourceItemKey)) issues.push(issue('duplicate_review', 'Only one review is allowed per source item.', decision.sourceItemKey))
    else decisionByKey.set(decision.sourceItemKey, decision)
  }

  const promotions: CatalogPromotionItem[] = []
  const retainedReviews: CatalogPromotionPlan['retainedReviews'] = []

  for (const sourceItemKey of [...itemByKey.keys()].sort()) {
    const item = itemByKey.get(sourceItemKey)!
    const decision = decisionByKey.get(sourceItemKey)
    if (!decision) {
      issues.push(issue('missing_review', 'Every manifest item needs an approve or reject decision.', sourceItemKey))
      continue
    }
    const reviewedAt = normalizedInstant(decision.reviewedAt)
    if (!nonBlank(decision.reviewedBy) || !reviewedAt) {
      issues.push(issue('unresolved_review', 'Review identity and timestamp are required.', sourceItemKey))
      continue
    }
    if (decision.decision === 'pending') {
      issues.push(issue('unresolved_review', 'Pending items block batch promotion.', sourceItemKey))
      continue
    }
    if (decision.decision === 'reject') {
      if (!nonBlank(decision.reason)) {
        issues.push(issue('invalid_rejection', 'Rejected items require a reason.', sourceItemKey))
        continue
      }
      retainedReviews.push({ sourceItemKey, decision: 'reject', reason: decision.reason.trim(), reviewedBy: decision.reviewedBy.trim(), reviewedAt })
      continue
    }

    retainedReviews.push({ sourceItemKey, decision: 'approve', reason: null, reviewedBy: decision.reviewedBy.trim(), reviewedAt })
    if (decision.identityStatus !== 'exact_product' && decision.identityStatus !== 'exact_variant') {
      issues.push(issue('ambiguous_identity', 'Approved items must have an exact product or exact variant identity.', sourceItemKey))
    }
    const exactVariant = decision.identityStatus === 'exact_variant'
    if (!nonBlank(decision.canonicalKey) || !KEY.test(decision.canonicalKey) || !nonBlank(decision.offerKey) || !KEY.test(decision.offerKey) ||
        !nonBlank(decision.productName) || !nonBlank(decision.category) ||
        (exactVariant && (!nonBlank(decision.variantKey) || !KEY.test(decision.variantKey) || !nonBlank(decision.variantLabel)))) {
      issues.push(issue('missing_product_identity', 'Approved items require canonical product, offer, name, category, and any exact variant identity.', sourceItemKey))
    }
    if (!validateValue(decision.value)) issues.push(issue('missing_value', 'Approved items require a valid price or Prize Tix value.', sourceItemKey))
    if (catalog?.family === 'prize_wall' && decision.value?.kind !== 'prize_tix') {
      issues.push(issue('invalid_value_for_family', 'Prize Wall items require a Prize Tix cost and cannot use a money price.', sourceItemKey))
    }
    if (!nonBlank(rawItemText(item))) issues.push(issue('missing_source_identity', 'Approved items require retained source text from the manifest.', sourceItemKey))
    if ((decision.purchaseLimit != null && (!Number.isInteger(decision.purchaseLimit) || decision.purchaseLimit <= 0)) ||
        (decision.sortOrder != null && !Number.isInteger(decision.sortOrder))) {
      issues.push(issue('invalid_offer', 'Purchase limit must be positive and sort order must be an integer.', sourceItemKey))
    }

    const media = decision.presentationMedia
    if (!media || media.decision !== 'approved') {
      issues.push(issue('missing_media_review', 'Approved items require approved presentation media.', sourceItemKey))
    } else {
      const exactMatch = media.matchStatus === 'exact_product' || media.matchStatus === 'exact_variant'
      const qualityOk = media.quality !== 'unacceptable'
      const externalOk = media.source !== 'external' || (nonBlank(media.externalUrl) && HTTPS.test(media.externalUrl) && nonBlank(media.sourceProvider) && nonBlank(media.sourceUrl) && HTTPS.test(media.sourceUrl))
      const manifestMedia = media.source === 'external' ? null : selectedManifestMedia(item, media.source)
      const bindingOk = media.matchStatus !== 'exact_variant' || exactVariant
      const roleOk = media.source === 'external' ? media.mediaRole === 'product_image' : media.mediaRole === 'product_crop'
      if (!exactMatch || !qualityOk || !bindingOk || !roleOk || (media.source === 'external' ? !externalOk : !manifestMedia)) {
        issues.push(issue('invalid_media', 'Presentation media must be an exact reviewed match with a verified manifest derivative or complete external provenance.', sourceItemKey))
      }
    }

    const availability = decision.availability
    const availabilityInstant = normalizedInstant(availability?.observedAt)
    if (!availability || !AVAILABILITY.has(availability.status) || !availabilityInstant || !validDate(availability.eventDay) ||
        (availability.quantitySeen != null && (!Number.isInteger(availability.quantitySeen) || availability.quantitySeen < 0)) ||
        (availability.status === 'sold_out' && availability.quantitySeen != null && availability.quantitySeen !== 0)) {
      issues.push(issue('missing_availability', 'Approved items require valid availability, observation time, event-local day, and quantity.', sourceItemKey))
    }

    const itemHasIssues = issues.some(entry => entry.sourceItemKey === sourceItemKey)
    if (itemHasIssues || !media || media.decision !== 'approved' || !availabilityInstant) continue
    const manifestMedia = media.source === 'external' ? null : selectedManifestMedia(item, media.source)
    const value = normalizedValue(decision.value)
    promotions.push({
      sourceItemKey,
      product: { canonicalKey: decision.canonicalKey.trim(), name: decision.productName.trim(), category: decision.category.trim() },
      variant: exactVariant ? { variantKey: decision.variantKey!.trim(), label: decision.variantLabel!.trim() } : null,
      offer: {
        offerKey: decision.offerKey.trim(),
        value,
        purchaseLimit: decision.purchaseLimit ?? null,
        sortOrder: decision.sortOrder ?? 0,
        published: true,
      },
      reviewedObservation: {
        sourceName: nonBlank(item.name) ? item.name.trim() : decision.productName.trim(),
        sourceRawText: rawItemText(item),
        value,
        reviewStatus: 'approved',
        reviewedBy: decision.reviewedBy.trim(),
        reviewedAt,
      },
      presentationMedia: {
        mediaRole: media.mediaRole,
        quality: media.quality as Exclude<CatalogImageQuality, 'unacceptable'>,
        matchStatus: media.matchStatus as 'exact_product' | 'exact_variant',
        source: media.source,
        path: manifestMedia?.path ?? null,
        sha256: media.source === 'external' ? (media.sha256 && SHA256.test(media.sha256) ? media.sha256 : null) : manifestMedia!.hash,
        externalUrl: media.source === 'external' ? media.externalUrl!.trim() : null,
        sourceProvider: media.source === 'external' ? media.sourceProvider!.trim() : null,
        sourceUrl: media.source === 'external' ? media.sourceUrl!.trim() : null,
        reviewNote: nonBlank(media.reviewNote) ? media.reviewNote.trim() : null,
        reviewStatus: 'approved',
        reviewedBy: decision.reviewedBy.trim(),
        reviewedAt,
      },
      availabilityObservation: {
        availability: availability.status,
        observedAt: availabilityInstant,
        eventDay: availability.eventDay,
        quantitySeen: availability.quantitySeen ?? null,
        note: nonBlank(availability.note) ? availability.note.trim() : null,
      },
    })
  }

  if (issues.length > 0) {
    return {
      status: 'blocked',
      issues: issues.sort((a, b) => `${a.sourceItemKey ?? ''}:${a.code}:${a.message}`.localeCompare(`${b.sourceItemKey ?? ''}:${b.code}:${b.message}`)),
    }
  }

  return {
    status: 'ready',
    plan: {
      schemaVersion: 1,
      batchKey: batch.batchKey,
      catalog: {
        catalogKey: catalog!.catalog_key!,
        eventKey: catalog!.event_key!,
        family: catalog!.family!,
        title: catalog!.title!.trim(),
        section: nonBlank(catalog!.section) ? catalog!.section.trim() : null,
      },
      sourceCapture: {
        identityKey: `${catalog!.catalog_key}:${source!.original_sha256}`,
        captureKind: captureKind(source!.source_kind!)!,
        intakeSourceKind: source!.source_kind!.trim(),
        sourceLabel: source!.source_label!.trim(),
        sourceUrl: nonBlank(source!.source_url) ? source!.source_url.trim() : null,
        sourceSha256: source!.original_sha256!,
        originalFilename: source!.original_filename!.trim(),
        originalPath: source!.original_path!.trim(),
        observedOn: source!.observed_on!,
        rightsNote: nonBlank(source!.rights_note) ? source!.rights_note.trim() : null,
      },
      retainedReviews,
      promotions,
    },
  }
}
