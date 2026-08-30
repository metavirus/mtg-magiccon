import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildCatalogPromotionPlan,
  catalogPresentationRoute,
  type CatalogAvailability,
  type CatalogImageMatchStatus,
  type CatalogImportBatch,
  type CatalogItemReviewDecision,
  type CatalogPhotoIntakeItem,
  type CatalogPhotoIntakeReviewManifest,
  type CatalogPromotionPlan,
} from './lib/catalogImport'

type TerminalDecision = CatalogItemReviewDecision['decision']
type MediaChoice = 'card' | 'thumb' | 'evidence' | 'external'

interface ItemDraft {
  productName: string
  category: string
  canonicalKey: string
  offerKey: string
  identityStatus: 'exact_product' | 'exact_variant' | 'ambiguous' | 'unmatched'
  valueKind: 'price' | 'prize_tix'
  value: string
  currency: string
  availability: CatalogAvailability
  eventDay: string
  observedAt: string
  mediaChoice: MediaChoice
  mediaMatch: CatalogImageMatchStatus
  externalUrl: string
  sourceProvider: string
  sourceUrl: string
  rejectReason: string
}

const availabilityOptions: CatalogAvailability[] = ['available', 'limited', 'sold_out', 'restocking', 'unavailable', 'unknown']
const keyify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 110) || 'unresolved-item'
const imageUrl = (value?: string) => value && (/^(https?:|blob:|data:image)/.test(value) || value.startsWith('/__local_catalog_intake/')) ? value : null
const sourceKey = (item: CatalogPhotoIntakeItem, index: number) => item.source_item_key?.trim() || `unkeyed-item-${index + 1}`
const normalizeAssetPath = (value: string) => value.replaceAll('\\', '/').replace(/^\.\//, '').replace(/^\//, '')
const directoryInputProps = { webkitdirectory: '', directory: '' } as Record<string, string>
const intakeCacheDatabase = 'magiccon-catalog-import-lab'
const intakeCacheStore = 'processed-intakes'

interface CachedIntakeFile {
  relativePath: string
  name: string
  type: string
  lastModified: number
  blob: Blob
}

interface CachedIntake {
  key: 'latest'
  label: string
  files: CachedIntakeFile[]
}

function openIntakeCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(intakeCacheDatabase, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(intakeCacheStore, { keyPath: 'key' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function retainIntakeLocally(files: File[], label: string) {
  if (!('indexedDB' in window)) return
  const database = await openIntakeCache()
  try {
    const transaction = database.transaction(intakeCacheStore, 'readwrite')
    transaction.objectStore(intakeCacheStore).put({
      key: 'latest',
      label,
      files: files.map(file => ({
        relativePath: file.webkitRelativePath || file.name,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        blob: file,
      })),
    } satisfies CachedIntake)
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

async function restoreRetainedIntake(): Promise<CachedIntake | null> {
  if (!('indexedDB' in window)) return null
  const database = await openIntakeCache()
  try {
    const transaction = database.transaction(intakeCacheStore, 'readonly')
    const request = transaction.objectStore(intakeCacheStore).get('latest')
    return await new Promise<CachedIntake | null>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as CachedIntake | undefined) ?? null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

function initialDraft(item: CatalogPhotoIntakeItem, decision: CatalogItemReviewDecision | undefined, manifest: CatalogPhotoIntakeReviewManifest): ItemDraft {
  const approved = decision?.decision === 'approve' ? decision : null
  const media = approved?.presentationMedia.decision === 'approved' ? approved.presentationMedia : null
  const priceMinor = approved?.value.kind === 'price' ? approved.value.amountMinor : item.price_minor
  const tix = approved?.value.kind === 'prize_tix' ? approved.value.cost : item.prize_ticket_cost
  const isPrizeWall = manifest.catalog?.family === 'prize_wall'
  const name = approved?.productName ?? item.name ?? ''
  const observedDay = approved?.availability.eventDay ?? manifest.source?.observed_on ?? ''
  const sourceHasExactPresentation = Boolean(item.presentation?.source_url && (item.presentation.match_status === 'exact_product' || item.presentation.match_status === 'exact_variant'))
  const weakBoardCropNeedsSearch = catalogPresentationRoute(item) === 'search_required'
  return {
    productName: name,
    category: approved?.category ?? manifest.catalog?.section ?? '',
    canonicalKey: approved?.canonicalKey ?? keyify(name),
    offerKey: approved?.offerKey ?? `${keyify(name)}-offer`,
    identityStatus: approved?.identityStatus ?? (item.presentation?.match_status === 'exact_variant' ? 'exact_variant' : item.presentation?.match_status === 'exact_product' ? 'exact_product' : 'ambiguous'),
    valueKind: isPrizeWall ? 'prize_tix' : approved?.value.kind ?? (tix != null ? 'prize_tix' : 'price'),
    value: String(isPrizeWall ? tix ?? '' : approved?.value.kind === 'price' ? approved.value.amountMinor / 100 : approved?.value.kind === 'prize_tix' ? approved.value.cost : tix ?? (priceMinor != null ? priceMinor / 100 : '')),
    currency: approved?.value.kind === 'price' ? approved.value.currency : item.currency ?? 'USD',
    availability: approved?.availability.status ?? 'unknown',
    eventDay: observedDay,
    observedAt: approved?.availability.observedAt ?? (observedDay ? `${observedDay}T12:00:00-04:00` : ''),
    mediaChoice: media?.source ?? (sourceHasExactPresentation || weakBoardCropNeedsSearch ? 'external' : item.media?.card ? 'card' : item.media?.thumb ? 'thumb' : item.media?.evidence ? 'evidence' : 'external'),
    mediaMatch: media?.matchStatus ?? (sourceHasExactPresentation ? item.presentation?.match_status : 'unreviewed') ?? 'unreviewed',
    externalUrl: media?.source === 'external' ? media.externalUrl ?? '' : sourceHasExactPresentation ? item.presentation?.source_url ?? '' : '',
    sourceProvider: media?.source === 'external' ? media.sourceProvider ?? '' : item.presentation?.source_provider ?? '',
    sourceUrl: media?.source === 'external' ? media.sourceUrl ?? '' : item.presentation?.source_url ?? '',
    rejectReason: decision?.decision === 'reject' ? decision.reason : '',
  }
}

function draftsFor(batch: CatalogImportBatch) {
  return Object.fromEntries((batch.manifest.items ?? []).map((item, index) => {
    const key = sourceKey(item, index)
    return [key, initialDraft(item, batch.decisions.find(decision => decision.sourceItemKey === key), batch.manifest)]
  }))
}

function batchFromManifest(manifest: CatalogPhotoIntakeReviewManifest, fileName: string): CatalogImportBatch {
  const stem = fileName.replace(/\.[^.]+$/, '')
  const catalogKey = manifest.catalog?.catalog_key ?? stem
  return {
    batchKey: keyify(`${catalogKey}-${manifest.source?.observed_on ?? 'undated'}`),
    manifest,
    decisions: (manifest.items ?? []).map((item, index) => ({
      sourceItemKey: sourceKey(item, index),
      decision: 'pending',
      identityStatus: item.presentation?.match_status === 'exact_product' || item.presentation?.match_status === 'exact_variant' ? item.presentation.match_status : 'ambiguous',
      reviewedBy: 'operator-kavi',
      reviewedAt: new Date().toISOString(),
    })),
  }
}

function decisionLabel(decision: TerminalDecision) {
  if (decision === 'approve') return 'Approved'
  if (decision === 'reject') return 'Rejected'
  return 'Needs review'
}

function DiagramStandIn({ item }: { item: CatalogPhotoIntakeItem }) {
  const category = item.name?.toLowerCase().includes('patch') ? 'PATCH' : 'ITEM'
  return <span className="catalog-diagram-standin" aria-label={`Photo pending stand-in for ${item.name ?? 'catalog item'}`}><b>{category}</b><strong>{item.name ?? 'Catalog item'}</strong><small>PHOTO PENDING</small></span>
}

function firstPendingKey(batch: CatalogImportBatch) {
  const items = batch.manifest.items ?? []
  const index = items.findIndex((item, itemIndex) => {
    const key = sourceKey(item, itemIndex)
    return batch.decisions.find(decision => decision.sourceItemKey === key)?.decision === 'pending'
  })
  return index >= 0 ? sourceKey(items[index], index) : null
}

export function CatalogImportLab({ initialBatch, canPromote, promoting, onPromote }: { initialBatch: CatalogImportBatch; canPromote: boolean; promoting: boolean; onPromote: (plan: CatalogPromotionPlan) => Promise<void> }) {
  const [batch, setBatch] = useState(initialBatch)
  const [drafts, setDrafts] = useState(() => draftsFor(initialBatch))
  const [loadedLabel, setLoadedLabel] = useState(initialBatch.manifest.catalog?.fixture_only ? `Historical QA sample · ${initialBatch.manifest.items?.length ?? 0} items` : 'Review manifest')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [promotionArmed, setPromotionArmed] = useState(false)
  const [promotionResult, setPromotionResult] = useState<string | null>(null)
  const [localMediaUrls, setLocalMediaUrls] = useState<Record<string, string>>({})
  const [openItemKey, setOpenItemKey] = useState<string | null>(() => firstPendingKey(initialBatch))
  const [candidateCursorByItem, setCandidateCursorByItem] = useState<Record<string, number>>({})
  const objectUrls = useRef<string[]>([])
  const selectionVersion = useRef(0)
  const result = useMemo(() => buildCatalogPromotionPlan(batch), [batch])
  const items = batch.manifest.items ?? []
  const issueCountByItem = useMemo(() => {
    const counts = new Map<string, number>()
    if (result.status === 'blocked') result.issues.forEach(issue => {
      if (issue.sourceItemKey) counts.set(issue.sourceItemKey, (counts.get(issue.sourceItemKey) ?? 0) + 1)
    })
    return counts
  }, [result])

  const counts = batch.decisions.reduce((summary, decision) => ({ ...summary, [decision.decision]: summary[decision.decision] + 1 }), { approve: 0, reject: 0, pending: 0 })

  useEffect(() => () => objectUrls.current.forEach(url => URL.revokeObjectURL(url)), [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (import.meta.env.DEV) {
        try {
          const response = await fetch('/__local_catalog_intake/review-manifest.json', { cache: 'no-store' })
          if (response.ok) {
            const manifest = await response.json() as CatalogPhotoIntakeReviewManifest
            if (manifest.schema_version === 1 && Array.isArray(manifest.items) && !cancelled) {
              const next = batchFromManifest(manifest, 'review-manifest.json')
              const urls: Record<string, string> = {}
              manifest.items.forEach((item, index) => {
                const key = sourceKey(item, index)
                ;(['evidence', 'card', 'thumb'] as const).forEach(role => {
                  const mediaPath = item.media?.[role]
                  if (!mediaPath) return
                  const encodedPath = normalizeAssetPath(mediaPath).split('/').map(encodeURIComponent).join('/')
                  urls[`${key}:${role}`] = `/__local_catalog_intake/${encodedPath}`
                })
              })
              setBatch(next)
              setDrafts(draftsFor(next))
              replaceLocalMediaUrls(urls)
              setLoadedLabel(`${manifest.catalog?.title ?? 'Local catalog intake'} · ${manifest.items.length} items`)
              setOpenItemKey(firstPendingKey(next))
              setLoadError(null)
              return
            }
          }
        } catch {
          // A missing local intake is a normal fallback for contributors who
          // have not run the operator-side photo pipeline.
        }
      }
      const cached = await restoreRetainedIntake()
      if (cancelled || selectionVersion.current !== 0 || !cached?.files.length) return
      const files = cached.files.map(entry => new File([entry.blob], entry.name, { type: entry.type, lastModified: entry.lastModified }))
      void loadSelection(files, cached.label, cached.files.map(entry => entry.relativePath))
    })().catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  function updateDraft(key: string, patch: Partial<ItemDraft>) {
    setDrafts(current => ({ ...current, [key]: { ...current[key], ...patch } }))
  }

  function setDecision(item: CatalogPhotoIntakeItem, index: number, terminal: TerminalDecision) {
    const key = sourceKey(item, index)
    const draft = drafts[key]
    const base = { sourceItemKey: key, reviewedBy: 'operator-kavi', reviewedAt: new Date().toISOString() }
    let decision: CatalogItemReviewDecision
    if (terminal === 'pending') {
      decision = { ...base, decision: 'pending', identityStatus: draft.identityStatus }
    } else if (terminal === 'reject') {
      decision = { ...base, decision: 'reject', reason: draft.rejectReason, identityStatus: draft.identityStatus }
    } else {
      const manifestMediaExists = draft.mediaChoice !== 'external' && Boolean(item.media?.[draft.mediaChoice] && item.hashes?.[`${draft.mediaChoice}_sha256` as keyof NonNullable<CatalogPhotoIntakeItem['hashes']>])
      const mediaApproved = (draft.mediaMatch === 'exact_product' || draft.mediaMatch === 'exact_variant') && (draft.mediaChoice === 'external' ? Boolean(draft.externalUrl && draft.sourceProvider && draft.sourceUrl) : manifestMediaExists)
      const amount = Number(draft.value)
      decision = {
        ...base,
        decision: 'approve',
        identityStatus: draft.identityStatus,
        canonicalKey: draft.canonicalKey,
        offerKey: draft.offerKey,
        productName: draft.productName,
        category: draft.category,
        value: draft.valueKind === 'price'
          ? { kind: 'price', amountMinor: Number.isFinite(amount) ? Math.round(amount * 100) : -1, currency: draft.currency }
          : { kind: 'prize_tix', cost: Number.isFinite(amount) ? Math.round(amount) : -1 },
        presentationMedia: mediaApproved ? {
          decision: 'approved',
          quality: item.presentation_quality ?? 'thumbnail_only',
          matchStatus: draft.mediaMatch as 'exact_product' | 'exact_variant',
          mediaRole: draft.mediaChoice === 'external' ? 'product_image' : 'product_crop',
          source: draft.mediaChoice,
          ...(draft.mediaChoice === 'external' ? { externalUrl: draft.externalUrl, sourceProvider: draft.sourceProvider, sourceUrl: draft.sourceUrl } : {}),
        } : { decision: 'pending', quality: item.presentation_quality ?? 'unacceptable', matchStatus: draft.mediaMatch },
        availability: { status: draft.availability, observedAt: draft.observedAt, eventDay: draft.eventDay, ...(draft.availability === 'sold_out' ? { quantitySeen: 0 } : {}) },
      }
    }
    setBatch(current => ({ ...current, decisions: [...current.decisions.filter(entry => entry.sourceItemKey !== key), decision] }))
    if (terminal === 'pending') {
      setOpenItemKey(key)
    } else {
      const next = items.map((candidate, candidateIndex) => sourceKey(candidate, candidateIndex)).find(candidateKey => candidateKey !== key && batch.decisions.find(entry => entry.sourceItemKey === candidateKey)?.decision === 'pending')
      setOpenItemKey(next ?? null)
    }
  }

  function replaceLocalMediaUrls(next: Record<string, string>) {
    objectUrls.current.forEach(url => URL.revokeObjectURL(url))
    objectUrls.current = Object.values(next)
    setLocalMediaUrls(next)
  }

  async function loadSelection(files: File[], label: string, retainedPaths?: string[]) {
    try {
      const manifestFile = files.find(file => file.name.toLowerCase() === 'review-manifest.json')
        ?? files.find(file => file.name.toLowerCase().endsWith('.json'))
      if (!manifestFile) throw new Error('Choose an intake folder containing review-manifest.json.')
      const parsed = JSON.parse(await manifestFile.text()) as CatalogPhotoIntakeReviewManifest
      if (parsed.schema_version !== 1 || !Array.isArray(parsed.items)) throw new Error('Choose a schema-version 1 review-manifest JSON file.')
      const filesByPath = new Map<string, File>()
      files.forEach((file, index) => {
        const fullPath = normalizeAssetPath(retainedPaths?.[index] || file.webkitRelativePath || file.name)
        const segments = fullPath.split('/')
        const withoutRoot = segments.length > 1 ? segments.slice(1).join('/') : fullPath
        filesByPath.set(fullPath, file)
        filesByPath.set(withoutRoot, file)
        filesByPath.set(file.name, file)
      })
      const urls: Record<string, string> = {}
      ;(parsed.items ?? []).forEach((item, index) => {
        const key = sourceKey(item, index)
        ;(['evidence', 'card', 'thumb'] as const).forEach(role => {
          const path = item.media?.[role]
          if (!path) return
          const normalized = normalizeAssetPath(path)
          const asset = filesByPath.get(normalized) ?? [...filesByPath.entries()].find(([candidate]) => candidate.endsWith(`/${normalized}`))?.[1]
          if (asset) urls[`${key}:${role}`] = URL.createObjectURL(asset)
        })
      })
      const next = batchFromManifest(parsed, manifestFile.name)
      setBatch(next)
      setDrafts(draftsFor(next))
      replaceLocalMediaUrls(urls)
      setLoadedLabel(`${parsed.catalog?.title ?? label} · ${parsed.items.length} items`)
      setOpenItemKey(firstPendingKey(next))
      const referencedMedia = (parsed.items ?? []).flatMap(item => Object.values(item.media ?? {})).filter(Boolean).length
      setLoadError(referencedMedia > 0 && Object.keys(urls).length === 0 ? 'Manifest loaded, but its image files were not selected. Load the processed intake folder to review the evidence.' : null)
      setPromotionArmed(false)
      setPromotionResult(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'This file could not be read as a review manifest.')
    }
  }

  async function promote(plan: CatalogPromotionPlan) {
    try {
      await onPromote(plan)
      setPromotionArmed(false)
      setPromotionResult(`${plan.promotions.length} reviewed item${plan.promotions.length === 1 ? '' : 's'} applied with exact readback.`)
    } catch (error) {
      setPromotionResult(error instanceof Error ? error.message : 'The reviewed batch was not applied.')
    }
  }

  return <section className="catalog-import-lab" aria-labelledby="catalog-import-title">
    <header className="catalog-import-heading">
      <div><span className="eyebrow">KAVI OPERATOR VIEW</span><h2 id="catalog-import-title">Catalog Import Lab</h2><p>Review source evidence locally before an explicit canonical promotion.</p></div>
      <span className={`catalog-import-gate ${result.status}`}>{result.status === 'ready' ? 'Plan ready' : 'Blocked'}</span>
    </header>

    <div className="catalog-import-intake">
      <div><strong>{loadedLabel}</strong><span>{batch.manifest.catalog?.fixture_only && Object.keys(localMediaUrls).length === 0 ? 'Decision-state sample only · load the processed folder for complete evidence' : batch.manifest.source?.source_label ?? 'Source identity missing'}</span></div>
      <div className="catalog-import-loaders">
        <label className="catalog-import-file primary"><span>Load another folder</span><input type="file" multiple {...directoryInputProps} onChange={event => { const files = [...(event.currentTarget.files ?? [])]; if (files.length) { const label = files[0]?.webkitRelativePath.split('/')[0] || 'Processed intake folder'; selectionVersion.current += 1; void retainIntakeLocally(files, label); void loadSelection(files, label) } event.currentTarget.value = '' }} /></label>
        <label className="catalog-import-file"><span>Load manifest</span><input type="file" accept="application/json,.json" onChange={event => { const file = event.currentTarget.files?.[0]; if (file) void loadSelection([file], file.name); event.currentTarget.value = '' }} /></label>
      </div>
    </div>
    {loadError && <p className="catalog-import-error" role="alert">{loadError}</p>}

    <div className="catalog-import-summary" aria-label="Review summary">
      <span><strong>{items.length}</strong> items</span><span><strong>{counts.approve}</strong> approved</span><span><strong>{counts.reject}</strong> rejected</span><span><strong>{counts.pending}</strong> pending</span>
    </div>

    <div className="catalog-import-items">
      {items.map((item, index) => {
        const key = sourceKey(item, index)
        const decision = batch.decisions.find(entry => entry.sourceItemKey === key) ?? { decision: 'pending' as const }
        const draft = drafts[key]
        // Review questions must remain visually usable even when an official
        // catalog hot-link is unavailable. Prefer the ingested presentation
        // derivative; the external URL remains canonical promotion provenance.
        const localImage = (role: 'evidence' | 'card' | 'thumb') => localMediaUrls[`${key}:${role}`] ?? imageUrl(item.media?.[role])
        const candidates = item.presentation_candidates ?? []
        const selectedCandidate = candidates.find(candidate => draft.mediaChoice === 'external' && draft.externalUrl === candidate.image_url)
        const candidateCursor = Math.min(candidateCursorByItem[key] ?? 0, Math.max(candidates.length - 1, 0))
        const displayedCandidate = candidates[candidateCursor] ?? selectedCandidate
        const displayedIsOutline = displayedCandidate?.candidate_kind === 'ai_outline'
        const displayedIsAi = displayedCandidate?.candidate_kind === 'ai_reconstruction' || displayedIsOutline
        const displayedIsStandIn = displayedCandidate?.candidate_kind === 'diagram_standin'
        const evidencePreview = localImage('evidence')
        const ingestedExactPresentation = Boolean(
          item.presentation?.source_url === draft.externalUrl
          && (item.presentation?.match_status === 'exact_product' || item.presentation?.match_status === 'exact_variant'),
        )
        const selectedPreview = draft.mediaChoice === 'external'
          ? (ingestedExactPresentation ? localImage('card') : null) ?? imageUrl(draft.externalUrl)
          : localImage(draft.mediaChoice)
        const displayedPreview = displayedCandidate && !displayedIsStandIn ? imageUrl(displayedCandidate.image_url) : selectedPreview
        const preview = selectedPreview ?? localImage('card') ?? localImage('thumb') ?? evidencePreview
        const requiresImageSearch = draft.mediaChoice === 'external' && !displayedPreview && !displayedIsStandIn
        const itemIssues = issueCountByItem.get(key) ?? 0
        const isPrizeWall = batch.manifest.catalog?.family === 'prize_wall'
        return <details className={`catalog-import-item decision-${decision.decision}`} key={key} open={openItemKey === key} onToggle={event => {
          if (event.currentTarget.open) setOpenItemKey(key)
          else if (openItemKey === key) setOpenItemKey(null)
        }}>
          <summary>
            <span className="catalog-import-thumb">{preview ? <img src={preview} alt="" /> : <span>{(item.name ?? 'Item').slice(0, 2).toUpperCase()}</span>}</span>
            <span className="catalog-import-item-copy"><small>{item.source_item_key ?? 'Source key missing'}</small><strong>{item.name || 'Unnamed source item'}</strong><span>{isPrizeWall ? (item.prize_ticket_cost != null ? `${item.prize_ticket_cost.toLocaleString()} Prize Tix` : 'Prize Tix pending') : item.display_price ?? 'Price pending'}</span></span>
            <span className={`catalog-import-decision ${decision.decision}${requiresImageSearch ? ' search-required' : ''}`}>{requiresImageSearch ? 'Image search required' : decisionLabel(decision.decision)}{itemIssues ? ` · ${itemIssues}` : ''}</span>
          </summary>
          <div className="catalog-import-editor">
            <div className="catalog-import-media-review" aria-label={`Image review for ${item.name ?? key}`}>
              <figure><span>{evidencePreview ? <img src={evidencePreview} alt={`Source evidence for ${item.name ?? key}`} /> : <small>{batch.manifest.catalog?.fixture_only ? 'Evidence crop is not packaged in this sample' : 'Evidence image not loaded'}</small>}</span><figcaption><b>Source evidence</b><small>Offer identity and displayed facts</small></figcaption></figure>
              <span className="catalog-import-media-arrow" aria-hidden="true">→</span>
              <figure className={`${requiresImageSearch ? 'search-required' : ''}${displayedIsAi ? ' ai-reconstruction' : ''}${displayedIsStandIn ? ' diagram-standin' : ''}`}>
                <span>
                  {displayedIsAi && <em>{displayedIsOutline ? 'AI-TRACED OUTLINE' : 'AI RECONSTRUCTION'}</em>}
                  {displayedIsStandIn ? <DiagramStandIn item={item} /> : displayedPreview ? <img src={displayedPreview} alt={`Presentation option for ${item.name ?? key}`} /> : <small>Exact online image search required</small>}
                  {candidates.length > 1 && <><button type="button" className="catalog-candidate-arrow previous" aria-label="Previous image option" onClick={() => setCandidateCursorByItem(current => ({ ...current, [key]: (candidateCursor - 1 + candidates.length) % candidates.length }))}>‹</button><button type="button" className="catalog-candidate-arrow next" aria-label="Next image option" onClick={() => setCandidateCursorByItem(current => ({ ...current, [key]: (candidateCursor + 1) % candidates.length }))}>›</button></>}
                  {displayedCandidate && <button type="button" className={`catalog-candidate-use${selectedCandidate?.candidate_key === displayedCandidate.candidate_key ? ' selected' : ''}`} onClick={() => updateDraft(key, { mediaChoice: 'external', externalUrl: displayedCandidate.image_url, sourceProvider: displayedCandidate.source_provider, sourceUrl: displayedCandidate.source_page_url, mediaMatch: displayedCandidate.match_status ?? 'unreviewed' })}>{selectedCandidate?.candidate_key === displayedCandidate.candidate_key ? 'Selected' : 'Use this'}</button>}
                </span>
                <figcaption><b>Presentation · {candidates.length ? `${candidateCursor + 1} of ${candidates.length}` : displayedPreview ? 'Selected image' : 'No image yet'}</b><small>{displayedIsOutline ? 'Approximate silhouette only' : displayedIsAi ? 'Unverified visual hypothesis' : displayedIsStandIn ? 'Neutral temporary stand-in' : requiresImageSearch ? 'Search queue' : draft.mediaMatch.replace('_', ' ')}</small></figcaption>
              </figure>
            </div>
            <details className="catalog-import-advanced"><summary>Item details and review fields</summary><div><div className="catalog-import-fields">
              <label><span>Canonical name</span><input value={draft.productName} onChange={event => updateDraft(key, { productName: event.target.value })} /></label>
              <label><span>Category</span><input value={draft.category} onChange={event => updateDraft(key, { category: event.target.value })} /></label>
              <label><span>Identity</span><select value={draft.identityStatus} onChange={event => updateDraft(key, { identityStatus: event.target.value as ItemDraft['identityStatus'] })}><option value="exact_product">Exact product</option><option value="exact_variant">Exact variant</option><option value="ambiguous">Ambiguous</option><option value="unmatched">Unmatched</option></select></label>
              <label><span>Value</span><span className="catalog-import-value"><select value={isPrizeWall ? 'prize_tix' : draft.valueKind} disabled={isPrizeWall} onChange={event => updateDraft(key, { valueKind: event.target.value as ItemDraft['valueKind'] })}>{!isPrizeWall && <option value="price">Price</option>}<option value="prize_tix">Prize Tix</option></select><input inputMode="numeric" value={draft.value} onChange={event => updateDraft(key, { value: event.target.value })} /></span></label>
              <label><span>Availability</span><select value={draft.availability} onChange={event => updateDraft(key, { availability: event.target.value as CatalogAvailability })}>{availabilityOptions.map(option => <option value={option} key={option}>{option.replace('_', ' ')}</option>)}</select></label>
              <label><span>Event day</span><input type="date" value={draft.eventDay} onChange={event => updateDraft(key, { eventDay: event.target.value, observedAt: event.target.value ? `${event.target.value}T12:00:00-04:00` : '' })} /></label>
              <label><span>Presentation media</span><select value={draft.mediaChoice} onChange={event => updateDraft(key, { mediaChoice: event.target.value as MediaChoice })}><option value="card">Cleaned crop</option><option value="thumb">Thumbnail crop</option><option value="evidence">Source evidence</option><option value="external">Exact online image</option></select></label>
              <label><span>Media match</span><select value={draft.mediaMatch} onChange={event => updateDraft(key, { mediaMatch: event.target.value as CatalogImageMatchStatus })}><option value="exact_product">Exact product</option><option value="exact_variant">Exact variant</option><option value="representative">Representative</option><option value="unmatched">Unmatched</option><option value="unreviewed">Unreviewed</option></select></label>
            </div>
            {draft.mediaChoice === 'external' && <div className="catalog-import-external">
              <label><span>Exact image URL</span><input type="url" value={draft.externalUrl} onChange={event => updateDraft(key, { externalUrl: event.target.value })} /></label>
              <label><span>Provider</span><input value={draft.sourceProvider} onChange={event => updateDraft(key, { sourceProvider: event.target.value })} /></label>
              <label><span>Source page</span><input type="url" value={draft.sourceUrl} onChange={event => updateDraft(key, { sourceUrl: event.target.value })} /></label>
            </div>}
            <label className="catalog-import-reject-reason"><span>Rejection reason</span><textarea rows={2} value={draft.rejectReason} onChange={event => updateDraft(key, { rejectReason: event.target.value })} placeholder="Required only when rejecting evidence" /></label>
            </div></details>
            <div className="catalog-import-actions" role="group" aria-label={`Decision for ${item.name ?? key}`}>
              <button type="button" className={decision.decision === 'approve' ? 'active approve' : ''} onClick={() => setDecision(item, index, 'approve')}>Approve</button>
              <button type="button" className={decision.decision === 'pending' ? 'active pending' : ''} onClick={() => setDecision(item, index, 'pending')}>Needs review</button>
              <button type="button" className={decision.decision === 'reject' ? 'active reject' : ''} disabled={!draft.rejectReason.trim()} onClick={() => setDecision(item, index, 'reject')}>Reject</button>
            </div>
          </div>
        </details>
      })}
    </div>

    <aside className={`catalog-import-plan ${result.status}`} aria-live="polite">
      <div><span className="eyebrow">PROMOTION BOUNDARY</span><strong>{result.status === 'ready' ? `${result.plan.promotions.length} reviewed items form a valid plan` : `${result.issues.length} blocker${result.issues.length === 1 ? '' : 's'} prevent promotion`}</strong></div>
      {result.status === 'blocked' && <details className="catalog-import-blockers"><summary>Review blocker details</summary><ul>{result.issues.slice(0, 6).map((issue, index) => <li key={`${issue.sourceItemKey ?? 'batch'}-${issue.code}-${index}`}><span>{issue.sourceItemKey ?? 'Batch'}</span>{issue.message}</li>)}</ul>{result.issues.length > 6 && <p>+ {result.issues.length - 6} more blockers</p>}</details>}
      {result.status === 'ready' && <div className="catalog-import-promote">
        {!promotionArmed
          ? <button type="button" disabled={!canPromote || promoting} onClick={() => setPromotionArmed(true)}>{canPromote ? 'Promote reviewed batch' : 'Authenticated operator required'}</button>
          : <><p>This atomically publishes the reviewed catalog facts and append-only evidence observations.</p><span><button type="button" className="confirm" disabled={promoting} onClick={() => void promote(result.plan)}>{promoting ? 'Applying…' : 'Confirm canonical promotion'}</button><button type="button" disabled={promoting} onClick={() => setPromotionArmed(false)}>Cancel</button></span></>}
      </div>}
      {promotionResult && <p className="catalog-import-promotion-result" role="status">{promotionResult}</p>}
      {result.status === 'blocked' && <p>No canonical write is possible until every blocker is cleared.</p>}
    </aside>
  </section>
}
