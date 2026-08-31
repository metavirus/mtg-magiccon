import { ReactNode, type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { retryOnceAfterUnauthorized } from './lib/sessionRefreshRetry'
import { NavIcon, type NavIconName } from './NavIcon'
import { CatalogBrowser } from './CatalogBrowser'
import { CatalogImportLab } from './CatalogImportLab'
import { activityDestination, mobileDrawerDestinations, navigationDestination, primaryDestinations, surfaces, type Surface } from './lib/navigation'
import { DESIGN_PREVIEW_SLICE } from './lib/designPreview'
import { ticketedPlayExploreEvents } from './data/ticketedPlayExploreEvents'
import { artistCardCandidates as generatedArtistCardCandidates } from './data/artistCardCandidates'
import { authRedirectUrl, resolveDesignPreviewMode, standaloneAppSearch } from './lib/appMode'
import { hashPath, parseExploreRouteState, type ExploreRouteState } from './lib/exploreRouting'
import { coalesceMonitoringConcepts, findingApprovalLabel, findingCanAuthorize, findingChoices, findingDisplaySummary, findingExecutionDetail, findingIsChoiceResolution, findingIsHomeWorthy, findingIsInformational, findingMayBypassConceptReadModel, findingOfficialResources, findingReviewLabel, monitoringConceptIsHomeWorthy, monitoringConceptIsUserFacing, monitoringConceptResources, monitoringDecisionPatch, monitoringDeferPatch, type MonitoringConceptRow, type MonitoringFindingDecision, type MonitoringFindingRow, type MonitoringOfficialResource } from './lib/monitoringFindings'
import { loadInfoKnowledge, previewInfoFeed, previewInfoTopics, relatedInfoFeed, type InfoFeedEntry, type InfoSource, type InfoTopic } from './lib/infoKnowledge'
import { infoTopicUsesReader, publishedInfoFeed, publishedInfoTopics } from './lib/infoReader'
import { priorEventCatalogs, type InfoCatalog, type InfoCatalogItem } from './lib/infoCatalog'
import { emptyCatalogReadModel, formatCatalogOfferValue, loadCatalogReadModel, setCatalogInterest, type CatalogOffer, type CatalogReadModel } from './lib/catalog'
import { catalogBrowserPreviewModel, catalogBrowserPreviewOwnerId } from './lib/catalogPreview'
import { catalogImportPreviewBatch } from './lib/catalogImportPreview'
import type { CatalogPromotionPlan } from './lib/catalogImport'
import { promoteCatalogPlan } from './lib/catalogPromotion'
import { loadTripFlights, previewTripFlights, tripFlightCalendarProjection, type TripFlight, type TripFlightLeg } from './lib/tripFlights'
import { partitionMentionInboxItems } from './lib/mentionInbox'
import { applyTicketedPlayAvailabilityProjection, partitionExploreAvailability, ticketedPurchasePresentation, type TicketedPlayAvailabilityProjectionRow } from './lib/ticketedPlayAvailabilityProjection'
import { homeSignalAgeBucket, homeSignalIsHotNow, isFeaturedTicketedPlaySale, isTicketedPlaySaleOpen, partitionHomeSignals, ticketedPlaySaleHasOpened, TICKETED_PLAY_SALE_OPENED_AT } from './lib/homeSignalAge'
import { groupNotesByObject, isSyntheticNoteGroupId, noteGroupFactLabel } from './lib/noteActivityGrouping'
import { groupHomeSoldOutEventsByDay, type HomeSoldOutEvent } from './lib/homeSoldOutGrouping'
import { applyPurchaseTransition, canPurchaseEvent } from './lib/eventPurchase'
import { createReconnectRefresh, readOfflineContinuity, writeOfflineContinuityLane } from './lib/offlineContinuity'
import { clearOfflineIdentity, readOfflineIdentity, writeOfflineIdentity } from './lib/offlineIdentity'
import { cacheDeviceAssets } from './lib/deviceAssets'
import { auditReceiptArtifactCache, clearReceiptArtifactCache, downloadReceiptArtifact, primeReceiptArtifactCache, selectReceiptArtifactsForDisplay, type ReceiptArtifact, type ReceiptArtifactRole } from './lib/receiptArtifacts'
import {
  formatOccurrenceTime,
  readTrustSliceCache,
  writeTrustSliceCache,
  type PlanningState,
  type TrustSlice,
} from './lib/trustSlice'

const assetUrl = (path: string) => new URL(path, window.location.href).toString()
const dismissablePopupSelector = 'details.account-menu, details.mention-inbox, details.inline-assignment'

function MobileHeaderViewSlot({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  useEffect(() => { setTarget(document.getElementById('mobile-header-view-slot')) }, [])
  return target ? createPortal(children, target) : null
}

const states: { value: PlanningState; label: string; symbol: string }[] = [
  { value: 'interested', label: 'Interested', symbol: '♡' },
  { value: 'tentative', label: 'Tentative', symbol: '◇' },
  { value: 'committed', label: 'Committed', symbol: '◆' },
]

function surfaceLabel(surface: Surface) {
  const labels: Record<Surface, string> = {
    home: 'QUIET MONITORING',
    calendar: 'CALENDAR',
    plan: 'PLAN',
    explore: 'EXPLORE',
    map: 'MAP',
    info: 'INFO',
    wallet: 'WALLET',
    trip: 'TRIP',
    artists: 'ARTISTS',
    notes: 'NOTES',
    activity: 'ACTIVITY',
  }
  return labels[surface]
}

function surfaceTitle(surface: Surface) {
  const titles: Record<Surface, string> = {
    home: 'Atlanta is quiet.',
    calendar: 'The road to Atlanta.',
    plan: 'Shape the weekend.',
    explore: 'Find the keepers.',
    map: 'Where things are.',
    info: 'Know before you need it.',
    wallet: 'Show, claim, remember.',
    trip: 'One shared night, then a split.',
    artists: 'Who might be worth finding.',
    notes: 'Notes stay where they happened.',
    activity: 'Monitor inbox.',
  }
  return titles[surface]
}

function surfaceSubtitle(surface: Surface) {
  const subtitles: Record<Surface, string> = {
    home: 'Changes and decisions worth seeing.',
    calendar: 'Trip milestones and committed events.',
    plan: "Compare everyone's possible and committed events.",
    explore: 'Events worth comparing.',
    map: 'Omni, downtown hotels, and GWCC Building C.',
    info: 'Official hours, entry, and play guidance.',
    wallet: 'Passes, receipts, and Prize Tix without hunting through email.',
    trip: 'Every stay, address, and roommate in one shared view.',
    artists: 'Official Atlanta artists and your signing shortlist.',
    notes: 'Mostly human notes, grouped by the object that prompted them.',
    activity: 'Signals, changes, and notes in one review lane.',
  }
  return subtitles[surface]
}

async function loadTrustSlice(ownerId: string): Promise<TrustSlice | null> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const occurrenceResult = await supabase.from('occurrences').select('*')
    .eq('owner_id', ownerId).eq('title', 'Black Lotus Planechase Unknown').maybeSingle()
  if (occurrenceResult.error) throw occurrenceResult.error
  if (!occurrenceResult.data) return null

  const [observationResult, decisionResult] = await Promise.all([
    supabase.from('source_observations').select('*')
      .eq('owner_id', ownerId).eq('id', occurrenceResult.data.current_observation_id).single(),
    supabase.from('personal_decisions').select('*')
      .eq('owner_id', ownerId).eq('occurrence_id', occurrenceResult.data.id).single(),
  ])
  if (observationResult.error) throw observationResult.error
  if (decisionResult.error) throw decisionResult.error

  const [sourceResult, itineraryResult] = await Promise.all([
    supabase.from('sources').select('*')
      .eq('owner_id', ownerId).eq('id', observationResult.data.source_id).single(),
    supabase.from('itinerary_entries').select('*')
      .eq('owner_id', ownerId).eq('decision_id', decisionResult.data.id).single(),
  ])
  if (sourceResult.error) throw sourceResult.error
  if (itineraryResult.error) throw itineraryResult.error

  const historyResult = await supabase.from('source_observations').select('*')
    .eq('owner_id', ownerId).eq('source_id', sourceResult.data.id)
    .order('retrieved_at', { ascending: false })
  if (historyResult.error) throw historyResult.error

  return {
    ownerId,
    source: sourceResult.data,
    observation: observationResult.data,
    observationHistory: historyResult.data,
    occurrence: occurrenceResult.data,
    decision: decisionResult.data,
    itinerary: itineraryResult.data,
    savedAt: new Date().toISOString(),
  } as TrustSlice
}

type PersonalNoteRow = {
  id: string
  owner_id: string
  title: string
  body: string
  object_id: string
  object_kind: ObjectDetailKind
  object_title: string
  object_anchor: string | null
  context: string
  visibility: NoteVisibility
  backlink: Surface
  author_label: string
  updated_at: string
}

type NoteMentionInsertRow = {
  note_id: string
  note_owner_id: string
  mentioned_person_key: string
  mentioned_user_id: string | null
  mention_token: string
  updated_at: string
}

type NoteMentionRow = {
  id: string
  note_id: string
  mentioned_person_key: string
  mentioned_user_id: string | null
  mention_token: string
  created_at: string
  dismissed_at: string | null
  last_seen_at: string | null
  personal_notes: PersonalNoteRow | PersonalNoteRow[] | null
}

type UserSelectionRow = {
  owner_id: string
  object_id: string
  object_kind: SelectionObjectKind
  selection_key: string
  selection_value: string
  updated_at: string
}

type UserActivityEventRow = {
  id: string
  object_id: string
  object_kind: SelectionObjectKind
  activity_type: string
  actor_label: string
  summary: string
  details: Record<string, unknown>
  created_at: string
}

type WalletReceiptLine = { event_id?: string; title: string; price: number; quantity?: number; code?: string; order_code?: string; order_url?: string; attendee_person_keys?: string[] }
type WalletReceiptRow = {
  id: string
  receipt_type: 'badge' | 'ticketed_play' | 'store' | 'travel' | 'hotel' | 'other'
  title: string
  vendor: string
  receipt_date: string
  amount: number
  currency: string
  attendee_person_key: string
  attendee_person_keys: string[]
  line_items: WalletReceiptLine[]
  receipt_artifacts: ReceiptArtifact[]
}

type OfflineProofPackStatus = { expected: number; cached: number; loading: boolean }

function useWalletReceipts(currentOwnerId?: string) {
  const [receipts, setReceipts] = useState<WalletReceiptRow[]>(() => {
    if (!currentOwnerId) return []
    const cached = readOfflineContinuity(currentOwnerId)?.lanes.walletReceipts
    return Array.isArray(cached) ? cached as WalletReceiptRow[] : []
  })
  const [proofPack, setProofPack] = useState<OfflineProofPackStatus>({ expected: 0, cached: 0, loading: false })
  useEffect(() => {
    if (!supabase || !currentOwnerId || currentOwnerId.startsWith('preview-')) {
      setReceipts([])
      setProofPack({ expected: 0, cached: 0, loading: false })
      return
    }
    let active = true
    const client = supabase
    const cached = readOfflineContinuity(currentOwnerId)?.lanes.walletReceipts
    if (Array.isArray(cached)) {
      const cachedReceipts = cached as WalletReceiptRow[]
      setReceipts(cachedReceipts)
      const cachedArtifacts = cachedReceipts.flatMap(receipt => receipt.receipt_artifacts)
      void auditReceiptArtifactCache(cachedArtifacts, currentOwnerId).then(status => {
        if (active) setProofPack({ ...status, loading: navigator.onLine && status.cached < status.expected })
      })
    } else {
      setReceipts([])
      setProofPack({ expected: 0, cached: 0, loading: false })
    }
    const refreshReceipts = () => {
      if (!navigator.onLine) return
      void client.from('wallet_receipts')
        .select('id,receipt_type,title,vendor,receipt_date,amount,currency,attendee_person_key,attendee_person_keys,line_items,receipt_artifacts(id,artifact_role,bucket_id,object_path,mime_type,display_label,display_order)')
        .order('receipt_date', { ascending: false })
        .then(({ data, error }) => {
        if (!active) return
        if (error) { console.warn('Wallet receipts could not be loaded; using offline cache when available', error); return }
        const refreshed = ((data ?? []) as WalletReceiptRow[]).map(receipt => ({
          ...receipt,
          attendee_person_keys: receipt.attendee_person_keys?.length ? receipt.attendee_person_keys : [receipt.attendee_person_key],
          receipt_artifacts: [...(receipt.receipt_artifacts ?? [])].sort((left, right) => left.display_order - right.display_order),
        }))
        setReceipts(refreshed)
        try { writeOfflineContinuityLane(currentOwnerId, 'walletReceipts', refreshed) } catch { /* best-effort device continuity */ }
        const completeProofPack = refreshed.flatMap(receipt => receipt.receipt_artifacts)
        setProofPack({ expected: completeProofPack.length, cached: 0, loading: completeProofPack.length > 0 })
        void Promise.allSettled(completeProofPack.map(artifact => primeReceiptArtifactCache(artifact, currentOwnerId))).then(async () => {
          const status = await auditReceiptArtifactCache(completeProofPack, currentOwnerId)
          if (active) setProofPack({ ...status, loading: false })
        })
      })
    }
    const refreshVisibleReceipts = () => {
      if (document.visibilityState === 'visible') refreshReceipts()
    }
    refreshReceipts()
    window.addEventListener('online', refreshReceipts)
    document.addEventListener('visibilitychange', refreshVisibleReceipts)
    return () => {
      active = false
      window.removeEventListener('online', refreshReceipts)
      document.removeEventListener('visibilitychange', refreshVisibleReceipts)
    }
  }, [currentOwnerId])
  return { receipts, proofPack }
}

type CompanionMemberRow = {
  person_key: string
  display_name: PersonName
  bubble_label: string
  bubble_color: string
  badge_tier: 'black_lotus' | 'premium'
  black_lotus_entitled: boolean
  relationship_label: string
  auth_email: string | null
  user_id: string | null
  sort_order: number
}

type CompanionMember = {
  key: string
  name: PersonName
  bubbleLabel: string
  bubbleColor: string
  badgeTier: 'black_lotus' | 'premium'
  blackLotusEntitled: boolean
  relationship: string
  authEmail?: string
  userId?: string
  sortOrder: number
}

type PreviewOwnerDescriptor = {
  key: 'kavi' | 'chris' | 'kyle'
  displayName: PersonName
}

const fallbackCompanionMembers: CompanionMember[] = [
  { key: 'kavi', name: 'Kavi', bubbleLabel: 'Ka', bubbleColor: 'blue', badgeTier: 'black_lotus', blackLotusEntitled: true, relationship: 'owner', authEmail: 'kavigrace@gmail.com', sortOrder: 10 },
  { key: 'chris', name: 'Chris', bubbleLabel: 'C', bubbleColor: 'purple', badgeTier: 'black_lotus', blackLotusEntitled: true, relationship: 'Black Lotus companion', authEmail: 'christophertom2000@gmail.com', sortOrder: 20 },
  { key: 'juan', name: 'Juan', bubbleLabel: 'J', bubbleColor: 'green', badgeTier: 'premium', blackLotusEntitled: false, relationship: 'partner', authEmail: 'jayluv189@gmail.com', sortOrder: 30 },
  { key: 'kyle', name: 'Kyle', bubbleLabel: 'Ky', bubbleColor: 'amber', badgeTier: 'premium', blackLotusEntitled: false, relationship: 'Chris friend', authEmail: 'kylewmandell@gmail.com', sortOrder: 40 },
]

const PREVIEW_OWNER_BY_KEY: Record<PreviewOwnerDescriptor['key'], PreviewOwnerDescriptor> = {
  kavi: {
    key: 'kavi',
    displayName: 'Kavi',
  },
  chris: {
    key: 'chris',
    displayName: 'Chris',
  },
  kyle: {
    key: 'kyle',
    displayName: 'Kyle',
  },
}

function resolvePreviewOwner(search: string): PreviewOwnerDescriptor | null {
  const query = new URLSearchParams(search)
  const requestedKey = query.get('previewOwner')?.toLowerCase() ?? query.get('as')?.toLowerCase()
  if (!requestedKey || !(requestedKey in PREVIEW_OWNER_BY_KEY)) return null
  return PREVIEW_OWNER_BY_KEY[requestedKey as PreviewOwnerDescriptor['key']]
}

function companionRowToMember(row: CompanionMemberRow): CompanionMember {
  return {
    key: row.person_key,
    name: row.display_name,
    bubbleLabel: row.bubble_label,
    bubbleColor: row.bubble_color,
    badgeTier: row.badge_tier,
    blackLotusEntitled: row.black_lotus_entitled,
    relationship: row.relationship_label,
    authEmail: row.auth_email ?? undefined,
    userId: row.user_id ?? undefined,
    sortOrder: row.sort_order,
  }
}

async function loadCompanionMembers(): Promise<CompanionMember[]> {
  if (!supabase) return fallbackCompanionMembers
  const result = await supabase.from('companion_members')
    .select('person_key,display_name,bubble_label,bubble_color,badge_tier,black_lotus_entitled,relationship_label,auth_email,user_id,sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true })
  if (result.error) throw result.error
  return (result.data as CompanionMemberRow[]).map(companionRowToMember)
}

function noteAuthorFromSession(currentSession: Session | null, companions: CompanionMember[] = fallbackCompanionMembers): PersonName {
  const email = currentSession?.user.email?.toLowerCase()
  const linked = companions.find(member => email && member.authEmail?.toLowerCase() === email)
    ?? companions.find(member => currentSession?.user.id && member.userId === currentSession.user.id)
  if (linked) return linked.name
  const haystack = `${currentSession?.user.email ?? ''} ${currentSession?.user.user_metadata?.full_name ?? ''} ${currentSession?.user.user_metadata?.name ?? ''}`.toLowerCase()
  if (haystack.includes('juan')) return 'Juan'
  if (haystack.includes('chris')) return 'Chris'
  if (haystack.includes('kyle')) return 'Kyle'
  return 'Kavi'
}

function currentCompanionFromSession(currentSession: Session | null, companions: CompanionMember[] = fallbackCompanionMembers) {
  const email = currentSession?.user.email?.toLowerCase()
  return companions.find(member => email && member.authEmail?.toLowerCase() === email)
    ?? companions.find(member => currentSession?.user.id && member.userId === currentSession.user.id)
    ?? companions.find(member => member.name === noteAuthorFromSession(currentSession, companions))
}

function normalizeMentionToken(value: string) {
  return value.trim().toLowerCase()
}

function extractNoteMentions(
  body: string,
  companions: CompanionMember[] = fallbackCompanionMembers,
  currentSession: Session | null = null,
): Array<{
  personKey: string
  mentionToken: string
  mentionedUserId: string | null
  member: CompanionMember
}> {
  const aliasMap = new Map<string, CompanionMember>()
  for (const member of companions) {
    for (const alias of [member.bubbleLabel, member.name, member.key]) {
      aliasMap.set(normalizeMentionToken(alias), member)
    }
  }
  const seen = new Set<string>()
  const mentions: Array<{ personKey: string; mentionToken: string; mentionedUserId: string | null; member: CompanionMember }> = []
  for (const match of body.matchAll(/\B@([A-Za-z][A-Za-z0-9_-]{0,31})/g)) {
    const token = match[1]
    const member = aliasMap.get(normalizeMentionToken(token))
    if (!member || seen.has(member.key)) continue
    seen.add(member.key)
    const sessionEmail = currentSession?.user.email?.toLowerCase()
    const mentionedUserId = member.userId
      ?? (sessionEmail && member.authEmail?.toLowerCase() === sessionEmail ? currentSession?.user.id ?? null : null)
    mentions.push({
      personKey: member.key,
      mentionToken: `@${member.name}`,
      mentionedUserId,
      member,
    })
  }
  return mentions
}

function formatContextNoteTime(value: string) {
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function mentionPreviewFromBody(
  body: string,
  companions: CompanionMember[] = fallbackCompanionMembers,
  currentSession: Session | null = null,
) {
  return extractNoteMentions(body, companions, currentSession).map(target => ({
    key: target.personKey,
    label: target.member.name,
    token: target.mentionToken,
    person: target.member.name,
  }))
}

function personalNoteRowToContextNote(row: PersonalNoteRow): ContextNote {
  return {
    id: row.id,
    ownerId: row.owner_id,
    objectId: row.object_id,
    objectKind: row.object_kind,
    objectTitle: row.object_title,
    objectAnchor: row.object_anchor ?? undefined,
    context: row.context,
    title: row.title,
    body: row.body,
    author: (['Kavi', 'Juan', 'Chris', 'Kyle'].includes(row.author_label) ? row.author_label : 'Kavi') as PersonName,
    visibility: row.visibility,
    updatedAt: formatContextNoteTime(row.updated_at),
    updatedAtIso: row.updated_at,
    backlink: row.backlink,
  }
}

async function loadContextNotes(_ownerId: string): Promise<ContextNote[]> {
  if (!supabase) return []
  const client = supabase
  const fetchNotes = () => client.from('personal_notes')
      .select('id,owner_id,title,body,object_id,object_kind,object_title,object_anchor,context,visibility,backlink,author_label,updated_at')
      .order('updated_at', { ascending: false })
  const result = await retryOnceAfterUnauthorized(fetchNotes, () => client.auth.refreshSession())
  if (result.error) throw result.error
  return (result.data as PersonalNoteRow[]).map(personalNoteRowToContextNote)
}

function userSelectionMap(rows: UserSelectionRow[]) {
  return Object.fromEntries(rows.map(row => [selectionKey(row.object_id, row.selection_key), row.selection_value]))
}

async function loadUserSelections(_ownerId: string): Promise<UserSelectionRow[]> {
  if (!supabase) return []
  const client = supabase
  const fetchSelections = () => client.from('user_selections')
      .select('owner_id,object_id,object_kind,selection_key,selection_value,updated_at')
      .order('updated_at', { ascending: false })
  const result = await retryOnceAfterUnauthorized(fetchSelections, () => client.auth.refreshSession())
  if (result.error) throw result.error
  return result.data as UserSelectionRow[]
}

async function loadUserActivityEvents(_ownerId: string): Promise<UserActivityEventRow[]> {
  if (!supabase) return []
  const client = supabase
  const fetchActivity = () => client.from('user_activity_events')
      .select('id,object_id,object_kind,activity_type,actor_label,summary,details,created_at')
      .order('created_at', { ascending: false })
      .limit(200)
  const result = await retryOnceAfterUnauthorized(fetchActivity, () => client.auth.refreshSession())
  if (result.error) throw result.error
  return result.data as UserActivityEventRow[]
}

async function loadMonitoringFindings(): Promise<MonitoringFindingRow[]> {
  if (!supabase) return []
  const result = await supabase.from('monitoring_findings')
    .select('id,fingerprint,source_id,source_label,source_url,destination,title,summary,review_question,evidence,status,decision,first_seen_at,last_seen_at,occurrence_count,decided_by,decided_at,staged_at,action_type,action_payload,execution_status,canonical_target,canonical_result,blocker,error_message,executed_at,deployment_evidence,verification_evidence,retry_count,rollback_payload')
    .order('last_seen_at', { ascending: false })
    .limit(100)
  if (result.error) throw result.error
  return result.data as MonitoringFindingRow[]
}

async function loadMonitoringConcepts(): Promise<MonitoringConceptRow[]> {
  if (!supabase) return []
  const result = await supabase.from('monitoring_concepts')
    .select('concept_key,concept_kind,title,current_summary,attention_state,review_state,latest_resolution,current_state,evidence_count,first_seen_at,last_seen_at,created_at,updated_at')
    .order('last_seen_at', { ascending: false })
    .limit(100)
  if (result.error) throw result.error
  return result.data as MonitoringConceptRow[]
}

async function loadTicketedPlayAvailability(): Promise<TicketedPlayAvailabilityProjectionRow[]> {
  if (!supabase) return []
  const [availabilityResult, codeResult] = await Promise.all([
    supabase.from('ticketed_play_current_availability')
      .select('event_id,source_event_key,availability,observed_at')
      .order('event_id'),
    supabase.from('ticketed_play_public_companion_codes')
      .select('event_id,companion_code,updated_at')
      .order('event_id'),
  ])
  if (availabilityResult.error && codeResult.error) throw availabilityResult.error
  const codeByEventId = new Map((codeResult.data ?? []).map(row => [row.event_id, row]))
  const rows = (availabilityResult.data ?? []).map(row => ({
    ...row,
    companion_code: codeByEventId.get(row.event_id)?.companion_code ?? null,
  })) as TicketedPlayAvailabilityProjectionRow[]
  const availabilityEventIds = new Set(rows.map(row => row.event_id))
  for (const code of codeResult.data ?? []) {
    if (availabilityEventIds.has(code.event_id)) continue
    rows.push({
      event_id: code.event_id,
      source_event_key: code.event_id.replace(/^ticketed-/, ''),
      availability: 'unknown',
      observed_at: code.updated_at,
      companion_code: code.companion_code,
    })
  }
  return rows
}

type MentionInboxItem = {
  id: string
  mentionToken: string
  dismissedAt: string | null
  note: ContextNote
}

function mentionInboxQaRows(): MentionInboxItem[] {
  const note = (id: string, author: PersonName, body: string): ContextNote => ({
    id: `qa-note-${id}`,
    objectId: `qa-object-${id}`,
    objectKind: 'note',
    objectTitle: 'Magic: The Menu with Brian David-Marshall',
    context: 'Event note',
    title: 'Mention QA',
    body,
    author,
    visibility: 'shared',
    updatedAt: 'Today',
    updatedAtIso: '2026-08-24T12:00:00-07:00',
    backlink: 'notes',
  })
  return [
    { id: 'qa-mention-chris', mentionToken: '@Kavi', dismissedAt: null, note: note('chris', 'Chris', 'This looks fun — should we keep it on the shortlist?') },
    { id: 'qa-mention-juan', mentionToken: '@Kavi', dismissedAt: null, note: note('juan', 'Juan', 'I can cover the early session if you want the later one.') },
    { id: 'qa-mention-kyle', mentionToken: '@Kavi', dismissedAt: '2026-08-24T13:00:00-07:00', note: note('kyle', 'Kyle', 'Archived mention used only to verify the collapsed group.') },
  ]
}

async function loadMentionInbox(userId: string): Promise<MentionInboxItem[]> {
  if (!supabase) return []
  const result = await supabase.from('note_mentions')
    .select(`
      id,
      note_id,
      mentioned_person_key,
      mentioned_user_id,
      mention_token,
      created_at,
      dismissed_at,
      last_seen_at,
      personal_notes!inner(
        id,owner_id,title,body,object_id,object_kind,object_title,object_anchor,context,visibility,backlink,author_label,updated_at
      )
    `)
    .eq('mentioned_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (result.error) throw result.error
  return ((result.data ?? []) as NoteMentionRow[])
    .map(row => {
      const note = Array.isArray(row.personal_notes) ? row.personal_notes[0] : row.personal_notes
      return note ? {
        id: row.id,
        mentionToken: row.mention_token,
        dismissedAt: row.dismissed_at,
        note: personalNoteRowToContextNote(note),
      } : null
    })
    .filter((item): item is MentionInboxItem => Boolean(item))
}

function selectionKey(objectId: string, key: string) {
  return `${objectId}::${key}`
}

function isKaviCompanion(companion?: CompanionMember) {
  return companion?.key === 'kavi'
}

function monitoringFindingQaRows(): MonitoringFindingRow[] {
  const qa = new URLSearchParams(window.location.search).get('qa')?.split(',') ?? []
  if (qa.includes('soldout')) {
    const primary: MonitoringFindingRow = {
    id: 'qa-ticketed-soldout', fingerprint: 'c'.repeat(64), source_id: 'atlanta-ticketed-play-inventory', source_label: 'MagicCon Atlanta Ticketed Play registration', source_url: 'https://conventions.leapevent.tech/ed/schedule/htwhdatl26shdl10', destination: 'Home', title: '10 Ticketed Play events are sold out', summary: 'Machine-shaped source summary intentionally replaced by the presentation model.', review_question: 'Informational grouped availability signal.', evidence: { intake_kind: 'ticketed_play_inventory', transition: 'sold_out', events: [
      { day: '2026-11-13', startsAt: '11:30', title: 'Commander Sealed Draft with Commander at Home' },
      { day: '2026-11-13', startsAt: '16:30', title: 'Prismatic Pride Commander Sealed' },
      { day: '2026-11-13', startsAt: '16:30', title: '2HG – Full-Box Sealed' },
      { day: '2026-11-14', startsAt: '11:00', title: 'Grand Melee – Mega Sealed' },
      { day: '2026-11-14', startsAt: '12:00', title: 'Team Trios – Collector Booster Sealed' },
      { day: '2026-11-14', startsAt: '14:00', title: 'Draft – Mystery Booster Commander Edition' },
      { day: '2026-11-14', startsAt: '14:00', title: '2HG – Full-Box Sealed' },
      { day: '2026-11-14', startsAt: '16:30', title: 'Team Trios – Sealed' },
      { day: '2026-11-14', startsAt: '19:00', title: '2HG – Full-Box Sealed' },
      { day: '2026-11-15', startsAt: '12:00', title: 'Team Trios – Full-Box Sealed' },
    ] }, status: 'unread', decision: null, first_seen_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), occurrence_count: 1, decided_by: null, decided_at: null, staged_at: null,
    }
    if (!qa.includes('soldout-multi')) return [primary]
    const firstEvent = (primary.evidence.events as Array<Record<string, unknown>>)[0]
    return [
      primary,
      { ...primary, id: 'qa-ticketed-soldout-later', fingerprint: 'd'.repeat(64), destination: 'Inbox', title: '2 selected Ticketed Play events sold out', last_seen_at: new Date(Date.now() + 1000).toISOString(), evidence: { ...primary.evidence, events: [firstEvent, { day: '2026-11-15', startsAt: '11:30', title: 'Magic: The Menu - Brunch - with Numot the Nummy', sourceEventKey: '944127', people: ['Kavi'] }] } },
      { ...primary, id: 'qa-ticketed-soldout-latest', fingerprint: 'e'.repeat(64), title: '1 Ticketed Play event is sold out', last_seen_at: new Date(Date.now() + 2000).toISOString(), evidence: { ...primary.evidence, events: [{ day: '2026-11-14', startsAt: '12:00', title: 'All Play - Sealed - Reality Fracture', sourceEventKey: '944072', people: [] }] } },
    ]
  }
  if (qa.includes('factual-choice')) return [{
    id: 'qa-factual-choice', fingerprint: 'b'.repeat(64), source_id: 'atlanta-newsletter', source_label: 'MagicCon Atlanta newsletter', source_url: 'https://mcatlanta.mtgfestivals.com/', destination: 'Activity', title: 'Confirm Constructed & Draft Sunday hours', summary: 'The maintained registration-hours fact says 10 AM–3 PM. A hypothetical newer official source says 10 AM–4 PM.', review_question: 'Which Constructed & Draft Sunday registration hours should the maintained guide use?', evidence: {}, status: 'needs_review', decision: null, first_seen_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), occurrence_count: 1, decided_by: null, decided_at: null, staged_at: null,
    action_type: 'resolve_info_topic_article_fact_conflict', action_payload: { target_kind: 'info_topic_article_fact', topic_key: 'on-demand-play', section_key: 'registration-hours', fact_label: 'Constructed & Draft · Sun', choice_options: [
      { choice_key: 'newsletter', label: 'Use 10 AM–4 PM', value: '10 AM–4 PM' },
      { choice_key: 'maintained', label: 'Keep 10 AM–3 PM', value: '10 AM–3 PM' },
    ] }, execution_status: 'not_started', canonical_target: null, canonical_result: null, blocker: null, error_message: null, executed_at: null, deployment_evidence: null, verification_evidence: null, retry_count: 0, rollback_payload: { operation: 'restore_info_topic_article_fact', topic_key: 'on-demand-play', section_key: 'registration-hours', fact_label: 'Constructed & Draft · Sun', value: '10 AM–3 PM' }, selected_choice_key: null,
  }]
  if (!qa.includes('monitoring-findings')) return []
  return [{
    id: 'qa-monitoring-finding', fingerprint: 'a'.repeat(64), source_id: 'atlanta-magic-play', source_label: 'MagicCon Atlanta official pages', source_url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play.html', destination: 'Activity', title: 'Official Magic Play resources are now available', summary: 'Official Atlanta navigation now links directly to ticketed play, on-demand events, Prize Wall details, and the playing guide.', review_question: 'Open the official resources that matter to your planning.', evidence: { presentation_links: [
      { label: 'Ticketed Play Schedule', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play.html' },
      { label: 'On-Demand Events', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/on-demand-events.html' },
      { label: 'Prize Wall', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html' },
      { label: 'Playing Guide', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play.html' },
    ] }, status: 'unread', decision: null, first_seen_at: '2026-08-21T18:57:59.364Z', last_seen_at: '2026-08-21T18:57:59.364Z', occurrence_count: 1, decided_by: null, decided_at: null, staged_at: null, action_type: null, action_payload: null, execution_status: 'not_started', canonical_target: null, canonical_result: null, blocker: null, error_message: null, executed_at: null, deployment_evidence: null, verification_evidence: null, retry_count: 0, rollback_payload: null,
  }]
}

function monitoringConceptQaRows(): MonitoringConceptRow[] {
  const qa = new URLSearchParams(window.location.search).get('qa')?.split(',') ?? []
  if (!qa.includes('monitoring-concepts') && !qa.includes('sale-open')) return []
  const saleOpen = qa.includes('sale-open')
  return [{
    concept_key: 'atlanta:ticketed-play:sales-opening',
    title: 'Ticketed Play sales',
    current_summary: saleOpen ? 'Ticketed Play sales are now open.' : 'Ticketed Play sales open August 25 at 10 AM PT.',
    attention_state: 'material_update',
    review_state: 'unread',
    latest_resolution: 'material_update',
    current_state: { phase: saleOpen ? 'open' : 'announced', milestone_opened_at: saleOpen ? new Date().toISOString() : undefined, sale_date: '2026-08-25', sale_time: '10:00', resources: [{ label: 'Ticketed Play Schedule', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule.html' }] },
    evidence_count: 2,
    first_seen_at: '2026-08-18T17:29:32.154Z',
    last_seen_at: saleOpen ? new Date().toISOString() : '2026-08-21T18:57:59.364Z',
  }]
}

function kaviDefaultExploreState(event: ExploreEvent): ExploreState | null {
  if (event.kind !== 'Ticketed play') return null
  if (event.complexity === 'very-hard' || event.tags.includes('competitive')) return 'hidden'
  return null
}

function applySelectionState(events: ExploreEvent[], selections: Record<string, string>, trustSlice: TrustSlice | null, companion?: CompanionMember) {
  return events.map(event => {
    const selected = selections[selectionKey(`explore-${event.id}`, 'state')]
    const purchased = canPurchaseEvent(event.price) && selections[selectionKey(`explore-${event.id}`, 'purchased')] === 'true'
    const purchaseLocked = purchased && selections[selectionKey(`explore-${event.id}`, 'purchase_locked')] === 'true'
    const personalDefault = isKaviCompanion(companion) ? kaviDefaultExploreState(event) : null
    const fallbackState = isKaviCompanion(companion) ? personalDefault ?? event.state : 'none'
    const state = applyPurchaseTransition(isExploreState(selected) ? selected : fallbackState, purchased).state as ExploreState
    if (event.id === 'bl-planechase' && trustSlice && !selected && isKaviCompanion(companion)) {
      return { ...event, state: trustSlice.decision.planning_state as ExploreState, purchased, purchaseLocked }
    }
    return { ...event, state, purchased, purchaseLocked }
  })
}

function isExploreState(value: unknown): value is ExploreState {
  return ['none', 'interested', 'tentative', 'committed', 'hidden', 'nope'].includes(String(value))
}

export function surfaceFromHash(hash: string): Surface {
  const candidate = hashPath(hash)
  return surfaces.includes(candidate as Surface) ? candidate as Surface : 'home'
}

function hashForSurface(next: Surface) {
  return next === 'home' ? '' : `#${next}`
}

export default function App() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  const appSearch = standaloneAppSearch(window.location.search, standalone)
  if (appSearch !== window.location.search) {
    window.history.replaceState(null, '', `${window.location.pathname}${appSearch}${window.location.hash}`)
  }
  const designPreview = resolveDesignPreviewMode({
    search: appSearch,
    development: import.meta.env.DEV,
    previewBuild: import.meta.env.VITE_DESIGN_PREVIEW === '1',
    storage: window.localStorage,
    standalone,
  })
  const previewOwner = resolvePreviewOwner(appSearch)
  const qaFlags = new URLSearchParams(appSearch).get('qa')?.split(',') ?? []
  const catalogBrowserQaRequested = qaFlags.includes('catalog-browser')
  const isPreviewOwnerMode = Boolean(previewOwner)
  const previewSession = useMemo(() => previewOwner
    ? ({
        user: {
          id: `preview-${previewOwner.key}`,
          email: `${previewOwner.key}-preview@local.invalid`,
          user_metadata: { full_name: previewOwner.displayName },
        },
      } as unknown as Session)
    : null, [previewOwner?.displayName, previewOwner?.key])
  const [session, setSession] = useState<Session | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [offlineIdentity, setOfflineIdentity] = useState(() => readOfflineIdentity())
  const onlineRef = useRef(navigator.onLine)
  const offlineSession = useMemo(() => offlineIdentity
    ? ({ user: { id: offlineIdentity.userId, email: offlineIdentity.email, user_metadata: { full_name: offlineIdentity.displayName } } } as unknown as Session)
    : null, [offlineIdentity])
  const canWrite = !designPreview && !isPreviewOwnerMode && Boolean(session && supabase && online)
  const effectiveSession = isPreviewOwnerMode ? previewSession : session ?? offlineSession
  const effectiveOwnerId = (previewOwner ? `preview-${previewOwner.key}` : effectiveSession?.user.id ?? undefined) as string | undefined
  const [slice, setSlice] = useState<TrustSlice | null>(designPreview || isPreviewOwnerMode ? DESIGN_PREVIEW_SLICE : null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState<'info' | 'error'>('info')
  const [surface, setSurface] = useState<Surface>(() => surfaceFromHash(window.location.hash))
  const [exploreRouteState, setExploreRouteState] = useState<ExploreRouteState>(() => parseExploreRouteState(window.location.hash))
  const [exploreFocusRequest, setExploreFocusRequest] = useState<{ eventId: string; noteId?: string; nonce: number } | null>(null)
  const [planFocusRequest, setPlanFocusRequest] = useState<{ eventId: string; nonce: number } | null>(null)
  const [previousSurface, setPreviousSurface] = useState<Surface | null>(null)
  const [mobileNavMenu, setMobileNavMenu] = useState<'main' | 'events' | 'more' | null>(null)
  const [desktopRailLocked, setDesktopRailLocked] = useState(() => window.innerWidth >= 901)
  const [navNotice, setNavNotice] = useState('')
  const [monitorAlerts, setMonitorAlerts] = useState<MonitoringAlert[]>(monitoringAlerts)
  const [exploreEventState, setExploreEventState] = useState<ExploreEvent[]>(() => purchaseQaEvents(exploreEvents))
  const [objectDetail, setObjectDetail] = useState<ObjectDetail | null>(null)
  const [walletProofRequest, setWalletProofRequest] = useState<{ target: WalletProofTarget; nonce: number } | null>(null)
  const [contextNotesState, setContextNotesState] = useState<ContextNote[]>(designPreview ? contextNotes : [])
  const [mentionInboxState, setMentionInboxState] = useState<MentionInboxItem[]>([])
  const [userSelections, setUserSelections] = useState<Record<string, string>>({})
  const [sharedSelectionRows, setSharedSelectionRows] = useState<UserSelectionRow[]>([])
  const [userActivityRows, setUserActivityRows] = useState<UserActivityEventRow[]>([])
  const [monitoringFindings, setMonitoringFindings] = useState<MonitoringFindingRow[]>([])
  const [monitoringConcepts, setMonitoringConcepts] = useState<MonitoringConceptRow[]>([])
  const [ticketedAvailability, setTicketedAvailability] = useState<TicketedPlayAvailabilityProjectionRow[]>([])
  const displayedExploreEvents = applyTicketedPlayAvailabilityProjection(exploreEventState, ticketedAvailability) as ExploreEvent[]
  const [infoTopics, setInfoTopics] = useState<InfoTopic[]>(previewInfoTopics)
  const [infoFeed, setInfoFeed] = useState<InfoFeedEntry[]>(previewInfoFeed)
  const [catalogReadModel, setCatalogReadModel] = useState<CatalogReadModel>(emptyCatalogReadModel)
  const [catalogInterestSavingOfferId, setCatalogInterestSavingOfferId] = useState<string | null>(null)
  const [catalogPromotionSaving, setCatalogPromotionSaving] = useState(false)
  const [tripFlights, setTripFlights] = useState<TripFlight[]>(previewTripFlights)
  const [continuityReady, setContinuityReady] = useState(false)
  const [continuityFailures, setContinuityFailures] = useState<string[]>([])
  const [alertReview, setAlertReview] = useState<Record<string, AlertReviewState>>({})
  const [companionMembers, setCompanionMembers] = useState<CompanionMember[]>(fallbackCompanionMembers)
  const { receipts: walletReceipts, proofPack: offlineProofPack } = useWalletReceipts(effectiveOwnerId)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [tutorialPromptedOwner, setTutorialPromptedOwner] = useState<string | null>(null)
  const currentCompanion = currentCompanionFromSession(effectiveSession, companionMembers)
  const isKaviOperator = Boolean(effectiveSession && (
    isKaviCompanion(currentCompanion)
    || effectiveSession.user.email?.trim().toLowerCase() === 'kavigrace@gmail.com'
  ))
  const catalogBrowserQa = catalogBrowserQaRequested && isKaviOperator
  const shouldLoadOwnerTrustSlice = isKaviCompanion(currentCompanion)
  // Badge tier is useful trip context, not an authorization boundary. Active
  // companions can plan around every visible event, including Black Lotus.
  const canCommitBlackLotus = true
  const mentionUnreadCount = partitionMentionInboxItems(mentionInboxState).active.length

  useEffect(() => {
    if (designPreview || isPreviewOwnerMode || loading || !continuityReady || !effectiveOwnerId || tutorialPromptedOwner === effectiveOwnerId) return

    const storageKey = `magiccon:onboarding-tour-seen:${effectiveOwnerId}`
    const completedInAccount = userSelections[selectionKey('onboarding-tour', 'completed')] === 'true'
    let seenOnDevice = false
    try {
      seenOnDevice = window.localStorage.getItem(storageKey) === 'true'
      if (completedInAccount) window.localStorage.setItem(storageKey, 'true')
    } catch {
      // Supabase remains the durable source if browser storage is unavailable.
    }

    if (!completedInAccount && !seenOnDevice) {
      try { window.localStorage.setItem(storageKey, 'true') } catch { /* non-blocking UI convenience */ }
      setTutorialOpen(true)
      setUserSelections(current => ({ ...current, [selectionKey('onboarding-tour', 'completed')]: 'true' }))
      if (canWrite && supabase) {
        void supabase.from('user_selections').upsert({
          owner_id: effectiveOwnerId,
          object_id: 'onboarding-tour',
          object_kind: 'general',
          selection_key: 'completed',
          selection_value: 'true',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'owner_id,object_id,selection_key' }).then(({ error }) => {
          if (!error) return
          setMessageTone('error')
          setMessage(`Tour completion could not be saved: ${error.message}`)
        })
      }
    }
    setTutorialPromptedOwner(effectiveOwnerId)
  }, [canWrite, continuityReady, designPreview, effectiveOwnerId, isPreviewOwnerMode, loading, tutorialPromptedOwner, userSelections])

  useEffect(() => {
    const syncDesktopRail = () => setDesktopRailLocked(window.innerWidth >= 901)
    syncDesktopRail()
    window.addEventListener('resize', syncDesktopRail)
    return () => window.removeEventListener('resize', syncDesktopRail)
  }, [])

  useEffect(() => {
    const closeDismissablePopups = (target: EventTarget | null) => {
      const node = target instanceof Node ? target : null
      document.querySelectorAll<HTMLDetailsElement>(dismissablePopupSelector).forEach(details => {
        if (!details.open) return
        if (node && details.contains(node)) return
        details.open = false
      })
    }

    const handlePointerDown = (event: PointerEvent) => closeDismissablePopups(event.target)
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      closeDismissablePopups(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    if (designPreview || isPreviewOwnerMode) {
      setContinuityFailures([])
      setLoading(false)
      return
    }
    if (!supabase) {
      setLoading(false)
      return
    }
    const applySession = (next: Session | null) => {
      setSession(next)
      if (next) {
        const identity = {
          userId: next.user.id,
          email: next.user.email,
          displayName: next.user.user_metadata?.full_name ?? next.user.user_metadata?.name,
        }
        try { writeOfflineIdentity(identity) } catch { /* online auth remains authoritative */ }
        setOfflineIdentity(identity)
      }
      const cached = readTrustSliceCache()
      const nextCompanion = currentCompanionFromSession(next, companionMembers)
      setSlice(next && isKaviCompanion(nextCompanion) && cached?.ownerId === next.user.id ? cached : null)
    }
    void supabase.auth.getSession().then(({ data }) => {
      applySession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => applySession(next))
    return () => data.subscription.unsubscribe()
  }, [companionMembers, designPreview, isPreviewOwnerMode])

  const refresh = useCallback(async (forceOnline = false) => {
    if (designPreview || isPreviewOwnerMode || !effectiveOwnerId || (!onlineRef.current && !forceOnline)) return
    setLoading(true)
    setMessage('')
    setMessageTone('info')
    try {
      if (!shouldLoadOwnerTrustSlice) {
        // The legacy Black Lotus trust slice is Kavi-owner scoped. It proves the
        // old evidence path, but it must never gate companion access to visible
        // Black Lotus planning context.
        setSlice(null)
        return
      }
      const next = await loadTrustSlice(effectiveOwnerId)
      if (next) writeTrustSliceCache(next)
      setSlice(next)
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : 'The current view could not be refreshed.')
    } finally {
      setLoading(false)
    }
  }, [designPreview, isPreviewOwnerMode, effectiveOwnerId, shouldLoadOwnerTrustSlice])

  useEffect(() => { void refresh() }, [refresh])

  const refreshUserContinuity = useCallback(async (forceOnline = false) => {
    setContinuityReady(false)
    if (designPreview || isPreviewOwnerMode) {
      setMessage('')
      setContextNotesState(designPreview ? contextNotes : [])
      setMentionInboxState(new URLSearchParams(window.location.search).get('qa') === 'mention-inbox' ? mentionInboxQaRows() : [])
      setAlertReview({})
      setUserSelections({})
      setSharedSelectionRows([])
      setUserActivityRows([])
      setMonitoringFindings(isKaviCompanion(currentCompanionFromSession(effectiveSession, companionMembers)) ? monitoringFindingQaRows() : [])
      setMonitoringConcepts(monitoringConceptQaRows())
      setTicketedAvailability((new URLSearchParams(window.location.search).get('qa')?.split(',') ?? []).includes('ticketed-availability') ? [
        { event_id: 'ticketed-944015', source_event_key: '944015', availability: 'sold_out', observed_at: '2026-08-25T20:00:00Z', companion_code: null },
        { event_id: 'ticketed-944083', source_event_key: '944083', availability: 'sold_out', observed_at: '2026-08-25T20:00:00Z', companion_code: null },
      ] : [])
      setTripFlights(previewTripFlights)
      setCatalogReadModel(catalogBrowserQa ? catalogBrowserPreviewModel : emptyCatalogReadModel)
      setExploreEventState(purchaseQaEvents(applySelectionState(exploreEvents, {}, null, currentCompanionFromSession(effectiveSession, companionMembers))))
      setContinuityReady(true)
      return
    }
    if (!effectiveOwnerId || (!onlineRef.current && !forceOnline)) {
      setContinuityFailures([])
      if (!effectiveOwnerId) {
        setContextNotesState([])
        setMentionInboxState([])
        setAlertReview({})
        setUserSelections({})
        setSharedSelectionRows([])
        setUserActivityRows([])
        setMonitoringFindings([])
        setMonitoringConcepts([])
        setTicketedAvailability([])
        setInfoTopics(previewInfoTopics)
        setInfoFeed(previewInfoFeed)
        setCatalogReadModel(emptyCatalogReadModel)
        setTripFlights(previewTripFlights)
        setExploreEventState(purchaseQaEvents(exploreEvents))
        setContinuityReady(true)
        return
      }
      const cached = effectiveOwnerId ? readOfflineContinuity(effectiveOwnerId) : null
      if (cached) {
        const lanes = cached.lanes
        if (lanes.notes) setContextNotesState(lanes.notes as ContextNote[])
        if (lanes.mentions) setMentionInboxState(lanes.mentions as MentionInboxItem[])
        if (lanes.activity) setUserActivityRows(lanes.activity as UserActivityEventRow[])
        if (lanes.monitorAlerts) setMonitorAlerts(lanes.monitorAlerts as MonitoringAlert[])
        if (lanes.findings) setMonitoringFindings(lanes.findings as MonitoringFindingRow[])
        if (lanes.concepts) setMonitoringConcepts(lanes.concepts as MonitoringConceptRow[])
        if (lanes.info) {
          const info = lanes.info as { topics: InfoTopic[]; feed: InfoFeedEntry[] }
          setInfoTopics(info.topics)
          setInfoFeed(info.feed)
        }
        if (lanes.catalog) setCatalogReadModel(lanes.catalog as CatalogReadModel)
        if (lanes.flights) setTripFlights(lanes.flights as TripFlight[])
        if (lanes.ticketedAvailability) setTicketedAvailability(lanes.ticketedAvailability as TicketedPlayAvailabilityProjectionRow[])
        if (lanes.selections) {
          const rows = lanes.selections as UserSelectionRow[]
          setSharedSelectionRows(rows)
          const selections = userSelectionMap(rows.filter(row => row.owner_id === effectiveOwnerId))
          setUserSelections(selections)
          setAlertReview(Object.fromEntries(Object.entries(selections)
            .filter(([key, value]) => key.endsWith('::review_state') && ['needs-review', 'reviewed', 'archived'].includes(value))
            .map(([key, value]) => [key.replace(/^alert-/, '').replace(/::review_state$/, ''), value as AlertReviewState])))
          setExploreEventState(applySelectionState(exploreEvents, selections, slice, currentCompanionFromSession(effectiveSession, companionMembers)))
        }
      }
      setContinuityReady(true)
      return
    }
    const [notesResult, mentionsResult, selectionsResult, activityResult, findingsResult, conceptsResult, infoResult, flightsResult, ticketedAvailabilityResult, catalogResult] = await Promise.allSettled([
        loadContextNotes(effectiveOwnerId),
        loadMentionInbox(effectiveOwnerId),
        loadUserSelections(effectiveOwnerId),
        loadUserActivityEvents(effectiveOwnerId),
        isKaviCompanion(currentCompanionFromSession(effectiveSession, companionMembers)) ? loadMonitoringFindings() : Promise.resolve([]),
        isKaviCompanion(currentCompanionFromSession(effectiveSession, companionMembers)) ? loadMonitoringConcepts() : Promise.resolve([]),
        loadInfoKnowledge(),
        supabase ? loadTripFlights(supabase) : Promise.resolve(previewTripFlights),
        loadTicketedPlayAvailability(),
        supabase ? loadCatalogReadModel(supabase, 'magiccon_atlanta_2026') : Promise.resolve(emptyCatalogReadModel),
      ])
    const failures: string[] = []
    const cacheLane = (lane: Parameters<typeof writeOfflineContinuityLane>[1], value: unknown) => {
      try { writeOfflineContinuityLane(effectiveOwnerId, lane, value) } catch { /* read-only cache is best effort */ }
    }
    if (notesResult.status === 'fulfilled') { setContextNotesState(notesResult.value); cacheLane('notes', notesResult.value) }
    else failures.push('notes')
    if (mentionsResult.status === 'fulfilled') { setMentionInboxState(mentionsResult.value); cacheLane('mentions', mentionsResult.value) }
    else failures.push('mentions')
    if (activityResult.status === 'fulfilled') { setUserActivityRows(activityResult.value); cacheLane('activity', activityResult.value) }
    else failures.push('activity')
    if (findingsResult.status === 'fulfilled') { setMonitoringFindings(findingsResult.value); cacheLane('findings', findingsResult.value) }
    else failures.push('monitoring findings')
    if (conceptsResult.status === 'fulfilled') {
      const qaConcepts = monitoringConceptQaRows()
      const qaKeys = new Set(qaConcepts.map(row => row.concept_key))
      const concepts = [...conceptsResult.value.filter(row => !qaKeys.has(row.concept_key)), ...qaConcepts]
      setMonitoringConcepts(concepts)
      cacheLane('concepts', concepts)
    }
    else failures.push('monitoring concepts')
    if (infoResult.status === 'fulfilled') { setInfoTopics(infoResult.value.topics); setInfoFeed(infoResult.value.feed); cacheLane('info', infoResult.value) }
    else failures.push('Info knowledge')
    if (flightsResult.status === 'fulfilled') {
      const flights = flightsResult.value.length ? flightsResult.value : previewTripFlights
      setTripFlights(flights)
      cacheLane('flights', flights)
    }
    else failures.push('Trip flights')
    if (ticketedAvailabilityResult.status === 'fulfilled') {
      setTicketedAvailability(ticketedAvailabilityResult.value)
      cacheLane('ticketedAvailability', ticketedAvailabilityResult.value)
    } else failures.push('Ticketed Play availability')
    if (catalogResult.status === 'fulfilled') {
      setCatalogReadModel(catalogResult.value)
      cacheLane('catalog', catalogResult.value)
      void cacheDeviceAssets(catalogResult.value.offers.map(offer => offer.presentationUrl))
    } else failures.push('catalogs')
    if (selectionsResult.status === 'fulfilled') {
      cacheLane('selections', selectionsResult.value)
      setSharedSelectionRows(selectionsResult.value)
      const selections = userSelectionMap(selectionsResult.value.filter(row => row.owner_id === effectiveOwnerId))
      setUserSelections(selections)
      setAlertReview(Object.fromEntries(Object.entries(selections)
        .filter(([key, value]) => key.endsWith('::review_state') && ['needs-review', 'reviewed', 'archived'].includes(value))
        .map(([key, value]) => [key.replace(/^alert-/, '').replace(/::review_state$/, ''), value as AlertReviewState])))
      setExploreEventState(applySelectionState(exploreEvents, selections, slice, currentCompanionFromSession(effectiveSession, companionMembers)))
    } else failures.push('selections')
    setContinuityFailures(failures)
    const globalFailures = failures.filter(resource => resource !== 'notes')
    if (globalFailures.length) {
      console.warn('Continuity refresh partially failed', failures)
      setMessageTone(globalFailures.length === 1 && globalFailures[0] === 'selections' ? 'info' : 'error')
      setMessage(globalFailures.length === 1 && globalFailures[0] === 'selections'
        ? 'Selections are taking a moment to sync. Notes, signals, and other account data are still available.'
        : `${globalFailures.join(', ')} could not be refreshed. Other account data is still available.`)
    } else {
      if (failures.length) console.warn('Continuity refresh partially failed', failures)
      setMessage('')
    }
    setContinuityReady(true)
  }, [catalogBrowserQa, companionMembers, designPreview, isPreviewOwnerMode, effectiveOwnerId, slice, effectiveSession])

  useEffect(() => { void refreshUserContinuity() }, [refreshUserContinuity])

  const toggleCatalogInterest = useCallback(async (offer: CatalogOffer, interested: boolean) => {
    const ownerId = catalogBrowserQa ? catalogBrowserPreviewOwnerId : effectiveOwnerId
    if (!ownerId) return
    setCatalogInterestSavingOfferId(offer.offer_id)
    try {
      if (catalogBrowserQa) {
        setCatalogReadModel(current => ({
          ...current,
          offers: current.offers.map(item => item.offer_id !== offer.offer_id ? item : {
            ...item,
            interests: [
              ...item.interests.filter(interest => interest.ownerId !== ownerId),
              {
                ownerId,
                personKey: 'kavi',
                displayName: 'Kavi',
                bubbleLabel: 'Ka',
                bubbleColor: 'blue',
                interested,
                note: null,
                updatedAt: new Date().toISOString(),
              },
            ],
          }),
        }))
        return
      }
      if (!canWrite || !supabase) {
        setMessageTone('info')
        setMessage('Reconnect to update your shopping list.')
        return
      }
      await setCatalogInterest(supabase, { ownerId, offerId: offer.offer_id, interested })
      const refreshed = await loadCatalogReadModel(supabase, 'magiccon_atlanta_2026')
      setCatalogReadModel(refreshed)
      writeOfflineContinuityLane(ownerId, 'catalog', refreshed)
      void cacheDeviceAssets(refreshed.offers.map(item => item.presentationUrl))
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? `Shopping list could not be updated: ${error.message}` : 'Shopping list could not be updated.')
    } finally {
      setCatalogInterestSavingOfferId(null)
    }
  }, [canWrite, catalogBrowserQa, effectiveOwnerId])

  const promoteReviewedCatalog = useCallback(async (plan: CatalogPromotionPlan) => {
    if (!canWrite || !supabase || !effectiveOwnerId || !effectiveSession || !isKaviCompanion(currentCompanion)) {
      throw new Error('An online Kavi operator session is required for canonical promotion.')
    }
    setCatalogPromotionSaving(true)
    try {
      const readback = await promoteCatalogPlan(supabase, plan)
      const refreshed = await loadCatalogReadModel(supabase, 'magiccon_atlanta_2026')
      setCatalogReadModel(refreshed)
      writeOfflineContinuityLane(effectiveOwnerId, 'catalog', refreshed)
      void cacheDeviceAssets(refreshed.offers.map(item => item.presentationUrl))
      setMessageTone('info')
      setMessage(`${readback.promoted_count} catalog item${readback.promoted_count === 1 ? '' : 's'} promoted with exact readback.`)
    } finally {
      setCatalogPromotionSaving(false)
    }
  }, [canWrite, currentCompanion, effectiveOwnerId, effectiveSession])

  const refreshCompanions = useCallback(async (forceOnline = false) => {
    if (designPreview || isPreviewOwnerMode || !effectiveOwnerId) {
      setCompanionMembers(fallbackCompanionMembers)
      return
    }
    if (!onlineRef.current && !forceOnline) {
      const cached = readOfflineContinuity(effectiveOwnerId)?.lanes.companions
      setCompanionMembers(Array.isArray(cached) ? cached as CompanionMember[] : fallbackCompanionMembers)
      return
    }
    await loadCompanionMembers().then(members => {
      setCompanionMembers(members)
      try { writeOfflineContinuityLane(effectiveOwnerId, 'companions', members) } catch { /* best-effort device continuity */ }
    }).catch(error => {
      setMessageTone('error')
      setMessage(error instanceof Error ? `Companion roster could not be refreshed: ${error.message}` : 'Companion roster could not be refreshed.')
      const cached = readOfflineContinuity(effectiveOwnerId)?.lanes.companions
      setCompanionMembers(Array.isArray(cached) ? cached as CompanionMember[] : fallbackCompanionMembers)
    })
  }, [designPreview, isPreviewOwnerMode, effectiveOwnerId])

  useEffect(() => { void refreshCompanions() }, [refreshCompanions])

  useEffect(() => {
    if (!session || !effectiveOwnerId || !online || designPreview || isPreviewOwnerMode) return
    void Promise.all([loadArtistCatalogFromSupabase(), loadArtistSigningInterestMap(effectiveOwnerId)]).then(([catalog, signingInterests]) => {
      try { writeOfflineContinuityLane(effectiveOwnerId, 'artistCatalog', catalog) } catch { /* best-effort device continuity */ }
      try { writeOfflineContinuityLane(effectiveOwnerId, 'artistSigningInterests', signingInterests) } catch { /* best-effort device continuity */ }
      void cacheDeviceAssets([
        ...catalog.artists.map(artist => artist.thumbnailUrl),
        ...catalog.cards.flatMap(card => [card.artCropUrl, card.cardImageUrl]),
      ])
    }).catch(error => console.warn('Artist device pack could not be refreshed', error))
  }, [designPreview, effectiveOwnerId, isPreviewOwnerMode, online, session])

  useEffect(() => {
    const reconnect = createReconnectRefresh(async () => {
      await Promise.allSettled([refresh(true), refreshUserContinuity(true), refreshCompanions(true)])
    })
    const handleOnline = () => {
      onlineRef.current = true
      setOnline(true)
      void reconnect(true)
    }
    const handleOffline = () => {
      onlineRef.current = false
      setOnline(false)
      void reconnect(false)
    }
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      onlineRef.current = true
      setOnline(true)
      void reconnect(true)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refresh, refreshCompanions, refreshUserContinuity])

  useEffect(() => {
    let active = true
    const cachedAlerts = effectiveOwnerId ? readOfflineContinuity(effectiveOwnerId)?.lanes.monitorAlerts : null
    if (Array.isArray(cachedAlerts)) setMonitorAlerts(cachedAlerts as MonitoringAlert[])
    if (!navigator.onLine) return () => { active = false }
    void fetch(`${import.meta.env.BASE_URL}monitoring-intake.json`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (!active || !payload || !Array.isArray(payload.alerts)) return
        const incoming = payload.alerts.filter(isMonitoringAlert)
        const mergedById = new Map(monitoringAlerts.map(alert => [alert.id, alert]))
        for (const alert of incoming) mergedById.set(alert.id, alert)
        const merged = [...mergedById.values()]
        setMonitorAlerts(merged)
        if (effectiveOwnerId) {
          try { writeOfflineContinuityLane(effectiveOwnerId, 'monitorAlerts', merged) } catch { /* best-effort device continuity */ }
        }
      })
      .catch(() => {
        // The intake file is optional. If it is missing or malformed, keep the
        // built-in fixture alerts so local design review never goes blank.
      })
    return () => { active = false }
  }, [effectiveOwnerId])

  useEffect(() => {
    const handleLocationChange = () => {
      setMobileNavMenu(null)
      setNavNotice('')
      const nextSurface = surfaceFromHash(window.location.hash)
      if (nextSurface !== 'explore') setExploreFocusRequest(null)
      setSurface(nextSurface)
      setExploreRouteState(parseExploreRouteState(window.location.hash))
    }
    window.addEventListener('hashchange', handleLocationChange)
    window.addEventListener('popstate', handleLocationChange)
    return () => {
      window.removeEventListener('hashchange', handleLocationChange)
      window.removeEventListener('popstate', handleLocationChange)
    }
  }, [])

  async function signInWithGoogle() {
    if (!supabase) return
    setMessageTone('info')
    setMessage('Opening Google sign-in…')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: authRedirectUrl(window.location),
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    })
    if (error) {
      setMessageTone('error')
      setMessage(error.message)
    }
  }

  async function changeState(requested: PlanningState) {
    if (!slice || saving) return
    const previous = slice.decision.planning_state
    const next: PlanningState = previous === requested ? 'none' : requested
    const updatedAt = new Date().toISOString()

    if (designPreview) {
      setSlice({
        ...slice,
        decision: { ...slice.decision, planning_state: next, updated_at: updatedAt },
        itinerary: { ...slice.itinerary, active: next !== 'none', updated_at: updatedAt },
      })
      return
    }

    if (!supabase || !online) return
    setSaving(true)
    setMessage('')
    setMessageTone('info')

    try {
      const decisionResult = await supabase.from('personal_decisions')
        .update({ planning_state: next, updated_at: updatedAt })
        .eq('id', slice.decision.id)
        .eq('updated_at', slice.decision.updated_at)
        .select('id')
        .maybeSingle()
      if (decisionResult.error) throw decisionResult.error
      if (!decisionResult.data) throw new Error('This decision changed elsewhere. Refresh before trying again.')

      const itineraryResult = await supabase.from('itinerary_entries')
        .update({ active: next !== 'none', updated_at: updatedAt })
        .eq('id', slice.itinerary.id)
        .eq('updated_at', slice.itinerary.updated_at)
        .select('id')
        .maybeSingle()
      if (itineraryResult.error || !itineraryResult.data) {
        await supabase.from('personal_decisions')
          .update({ planning_state: previous, updated_at: slice.decision.updated_at })
          .eq('id', slice.decision.id)
          .eq('updated_at', updatedAt)
        throw itineraryResult.error ?? new Error('The Plan placement changed elsewhere. Nothing was cached.')
      }

      await refresh()
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : 'The state change was not saved.')
    } finally {
      setSaving(false)
    }
  }

  if (!supabase) return <SetupCard />
  if (loading && !session && !slice) return <div className="boot">Opening your field guide…</div>
  if (!effectiveSession && !designPreview) return <Login onGoogleSignIn={() => void signInWithGoogle()} message={message} messageTone={messageTone} />

  const daysToAtlanta = Math.max(0, Math.ceil((new Date('2026-11-13T00:00:00-08:00').getTime() - Date.now()) / 86_400_000))
  const displaySlice: TrustSlice = slice ?? {
    ...DESIGN_PREVIEW_SLICE,
    ownerId: effectiveOwnerId ?? DESIGN_PREVIEW_SLICE.ownerId,
    decision: { ...DESIGN_PREVIEW_SLICE.decision, planning_state: 'none' },
    itinerary: { ...DESIGN_PREVIEW_SLICE.itinerary, active: false },
  }
  const lastChecked = slice ? new Date(slice.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'not yet'
  const openDestination = (name: string, next?: Surface) => {
    setMobileNavMenu(null)
    if (next) {
      if (next !== 'explore') setExploreFocusRequest(null)
      if (next !== surface) setPreviousSurface(surface)
      setSurface(next)
      setNavNotice('')
      const nextHash = hashForSurface(next)
      if (window.location.hash !== nextHash) window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setNavNotice(`${name} is mapped into the shell; its working surface comes in a later review tranche.`)
  }
  const goBack = () => {
    if (!previousSurface) return
    const destination = previousSurface
    if (destination !== 'explore') setExploreFocusRequest(null)
    setPreviousSurface(surface)
    setSurface(destination)
    setNavNotice('')
    const nextHash = hashForSurface(destination)
    if (window.location.hash !== nextHash) window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openObjectDetail = (detail: ObjectDetail) => setObjectDetail(detail)
  const openPlanEventContext = (eventId: string) => {
    closeObjectDetail()
    setPlanFocusRequest({ eventId, nonce: Date.now() })
    openDestination('Plan', 'plan')
  }
  const openActivityItem = (item: ActivityItem) => {
    if (item.destination === 'Inbox') {
      openObjectDetail(item.objectDetail)
      return
    }
    if (item.objectDetail.id.startsWith('note-group-')) {
      openObjectDetail(item.objectDetail)
      return
    }
    if (item.objectDetail.id.startsWith('explore-')) {
      const eventId = item.objectDetail.id.replace(/^explore-/, '')
      if (item.sourceKind === 'note') {
        setExploreFocusRequest({ eventId, noteId: item.objectDetail.focusedNoteId, nonce: Date.now() })
        openDestination('Explore', 'explore')
      } else if (item.status === 'committed') openPlanEventContext(eventId)
      else {
        setExploreFocusRequest({ eventId, nonce: Date.now() })
        openDestination('Explore', 'explore')
      }
      return
    }
    if (item.objectDetail.id.startsWith('activity-burst-')) {
      openObjectDetail(item.objectDetail)
      return
    }
    if (item.sourceKind === 'note' && item.objectDetail.kind === 'note') {
      openDestination('Notes', 'notes')
      return
    }
    if (!['Home', 'Activity'].includes(item.destination)) {
      openDestination(item.destination, item.destination.toLowerCase() as Surface)
      return
    }
    openObjectDetail(item.objectDetail)
  }
  const openMentionNote = (note: ContextNote) => {
    const receiptTarget = receiptTargetFromNote(note)
    closeObjectDetail()
    if (receiptTarget) {
      setWalletProofRequest({ target: receiptTarget, nonce: Date.now() })
      openDestination('Wallet', 'wallet')
      return
    }
    if (note.objectKind === 'event' || note.objectId.startsWith('explore-')) {
      const legacyEventId = note.objectId.replace(/^explore-/, '')
      const event = displayedExploreEvents.find(candidate => candidate.id === legacyEventId || candidate.title === note.objectTitle || displayEventTitle(candidate) === note.objectTitle)
      if (event) {
        setExploreFocusRequest({ eventId: event.id, noteId: note.id, nonce: Date.now() })
        openDestination('Explore', 'explore')
        return
      }
    }
    const detail = noteSourceObjectDetail(note)
    if (detail.kind === 'note') {
      openDestination('Notes', 'notes')
      return
    }
    const destination = surfaceFromNoteBacklink(note)
    openDestination(surfaceTitle(destination), destination)
    setObjectDetail(detail)
  }
  const setMentionDismissed = async (mentionId: string, dismissed: boolean) => {
    const previous = mentionInboxState.find(item => item.id === mentionId)?.dismissedAt ?? null
    const dismissedAt = dismissed ? new Date().toISOString() : null
    setMentionInboxState(current => current.map(item => item.id === mentionId ? { ...item, dismissedAt } : item))
    if (!canWrite || !supabase || !effectiveOwnerId) return

    const result = await supabase.from('note_mentions')
      .update({ dismissed_at: dismissedAt, updated_at: new Date().toISOString() })
      .eq('id', mentionId)
      .eq('mentioned_user_id', effectiveOwnerId)
      .select('id')
      .maybeSingle()
    if (result.error || !result.data) {
      setMentionInboxState(current => current.map(item => item.id === mentionId ? { ...item, dismissedAt: previous } : item))
      setMessageTone('error')
      setMessage(`Mention could not be ${dismissed ? 'dismissed' : 'restored'}. ${result.error?.message ?? 'Please refresh and try again.'}`)
    }
  }
  const closeObjectDetail = () => setObjectDetail(null)
  const upsertUserSelection = async (objectId: string, objectKind: SelectionObjectKind, key: string, value: string) => {
    const mapKey = selectionKey(objectId, key)
    setUserSelections(current => ({ ...current, [mapKey]: value }))
    if (!canWrite || !supabase || !effectiveOwnerId) return
    const ownerId = effectiveOwnerId
    const now = new Date().toISOString()
    const { error } = await supabase.from('user_selections').upsert({
      owner_id: ownerId,
      object_id: objectId,
      object_kind: objectKind,
      selection_key: key,
      selection_value: value,
      updated_at: now,
    }, { onConflict: 'owner_id,object_id,selection_key' })
    if (error) {
      setMessageTone('error')
      setMessage(error.message)
      void refreshUserContinuity()
    }
  }

  const recordUserActivity = async (input: {
    objectId: string
    objectKind: SelectionObjectKind
    activityType: string
    summary: string
    details?: Record<string, unknown>
    actorLabel?: PersonName
  }) => {
    if (!canWrite || !supabase || !effectiveOwnerId) return
    const ownerId = effectiveOwnerId
    const createdAt = new Date().toISOString()
    const optimisticId = `local-activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const optimistic: UserActivityEventRow = {
      id: optimisticId,
      object_id: input.objectId,
      object_kind: input.objectKind,
      activity_type: input.activityType,
      actor_label: input.actorLabel ?? noteAuthorFromSession(effectiveSession, companionMembers),
      summary: input.summary,
      details: input.details ?? {},
      created_at: createdAt,
    }
    setUserActivityRows(current => [optimistic, ...current])
    const result = await supabase.from('user_activity_events')
      .insert({
        owner_id: ownerId,
        object_id: optimistic.object_id,
        object_kind: optimistic.object_kind,
        activity_type: optimistic.activity_type,
        actor_label: optimistic.actor_label,
        summary: optimistic.summary,
        details: optimistic.details,
        created_at: optimistic.created_at,
      })
      .select('id,object_id,object_kind,activity_type,actor_label,summary,details,created_at')
      .single()
    if (result.error) {
      setMessageTone('error')
      setMessage(result.error.message)
      setUserActivityRows(current => current.filter(row => row.id !== optimisticId))
      return
    }
    setUserActivityRows(current => [result.data as UserActivityEventRow, ...current.filter(row => row.id !== optimisticId)])
  }

  const addContextNote = (input: AddContextNoteInput) => {
    const now = new Date()
    const ownerId = effectiveOwnerId
    if (!ownerId) return
    const note: ContextNote = {
      id: `note-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      ownerId,
      objectId: input.objectId,
      objectKind: input.objectKind,
      objectTitle: input.objectTitle,
      objectAnchor: input.objectAnchor,
      context: input.context,
      title: input.title || input.objectTitle,
      body: input.body,
      author: input.author ?? noteAuthorFromSession(effectiveSession, companionMembers),
      visibility: input.visibility,
      updatedAt: now.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      updatedAtIso: now.toISOString(),
      backlink: input.backlink,
    }
    setContextNotesState(current => [note, ...current])
    if (!canWrite || !supabase) return
    const client = supabase
    const saveNote = async () => {
      try {
        const mentionTargets = extractNoteMentions(note.body, companionMembers, effectiveSession)
        const { data, error } = await client.from('personal_notes').insert({
          owner_id: ownerId,
          title: note.title,
          body: note.body,
          object_id: note.objectId,
          object_kind: note.objectKind,
          object_title: note.objectTitle,
          object_anchor: note.objectAnchor ?? null,
          context: note.context,
          visibility: note.visibility,
          backlink: note.backlink,
          author_label: note.author,
          updated_at: now.toISOString(),
        }).select('id,owner_id,title,body,object_id,object_kind,object_title,object_anchor,context,visibility,backlink,author_label,updated_at')
          .single()
        if (error) throw error
        const saved = personalNoteRowToContextNote(data as PersonalNoteRow)
        if (mentionTargets.length) {
          const mentionRows: NoteMentionInsertRow[] = mentionTargets.map(target => ({
            note_id: saved.id,
            note_owner_id: ownerId,
            mentioned_person_key: target.personKey,
            mentioned_user_id: target.mentionedUserId,
            mention_token: target.mentionToken,
            updated_at: now.toISOString(),
          }))
          const { error: mentionError } = await client.from('note_mentions').upsert(mentionRows, { onConflict: 'note_id,mentioned_person_key' })
          if (mentionError) {
            setMessageTone('error')
            setMessage(`Note saved, but mentions were not recorded: ${mentionError.message}`)
          } else {
            const mentions = await loadMentionInbox(ownerId)
            setMentionInboxState(mentions)
          }
        }
        setContextNotesState(current => current.map(item => item.id === note.id ? saved : item))
      } catch (error) {
        setMessageTone('error')
        setMessage(error instanceof Error ? error.message : 'The note was not saved.')
        setContextNotesState(current => current.filter(item => item.id !== note.id))
      }
    }
    void saveNote()
  }
  const deleteContextNote = (id: string) => {
    const previous = contextNotesState
    setContextNotesState(current => current.filter(note => note.id !== id))
    if (!canWrite || !supabase || !effectiveOwnerId) return
    const ownerId = effectiveOwnerId
    void supabase.from('personal_notes').delete().eq('id', id).eq('owner_id', ownerId).then(({ error }) => {
      if (!error) return
      setMessageTone('error')
      setMessage(error.message)
      setContextNotesState(previous)
    })
  }
  const setAlertReviewState = (id: string, state: AlertReviewState) => {
    setAlertReview(current => ({ ...current, [id]: state }))
    void upsertUserSelection(`alert-${id}`, 'alert', 'review_state', state)
  }
  const navigateFromObjectDetail = (destination: Surface) => {
    closeObjectDetail()
    openDestination(surfaceTitle(destination), destination)
  }
  const updateExploreEvent = (id: string, state: ExploreState) => {
    const currentEvent = displayedExploreEvents.find(event => event.id === id)
    if (currentEvent?.purchased) return
    const previousState = currentEvent?.state ?? 'none'
    const nextState: ExploreState = currentEvent?.state === state ? 'none' : state
    setExploreEventState(current => current.map(event => event.id === id ? { ...event, state: nextState } : event))
    void upsertUserSelection(`explore-${id}`, 'event', 'state', nextState)
    if (currentEvent && previousState !== nextState) {
      void recordUserActivity({
        objectId: `explore-${id}`,
        objectKind: 'event',
        activityType: 'event_state_changed',
        summary: `${noteAuthorFromSession(effectiveSession, companionMembers)} marked ${currentEvent.title} ${nextState}.`,
        details: {
          event_id: id,
          event_title: currentEvent.title,
          previous_state: previousState,
          state: nextState,
        },
      })
    }
  }

  const updateEventPurchase = (id: string, purchased: boolean) => {
    const currentEvent = displayedExploreEvents.find(event => event.id === id)
    if (!currentEvent || !canPurchaseEvent(currentEvent.price) || currentEvent.purchaseLocked) return
    const transition = applyPurchaseTransition(currentEvent.state, purchased)
    setExploreEventState(current => current.map(event => event.id === id ? { ...event, state: transition.state as ExploreState, purchased } : event))
    void upsertUserSelection(`explore-${id}`, 'event', 'purchased', String(purchased))
    if (purchased && currentEvent.state !== 'committed') void upsertUserSelection(`explore-${id}`, 'event', 'state', 'committed')
  }

  const generatedActivity = clusterActivityEvents(userActivityRows)
    .map(cluster => activityFromEventCluster(cluster, displayedExploreEvents, userSelections, currentCompanion?.name ?? 'Kavi'))
    .filter((item): item is ActivityItem => item !== null)
  const noteActivity = contextNotesToActivity(contextNotesState, userSelections)
  const monitorActivity: ActivityItem[] = monitorAlerts.map(alert => ({
    id: alert.id,
    sourceKind: 'monitor',
    kind: alert.kind,
    severity: alert.severity,
    destination: alert.destination,
    attention: alert.attention,
    title: alert.title,
    summary: alert.summary,
    object: alert.object,
    source: alert.source,
    checkedAt: alert.checkedAt,
    checkedAtIso: new Date(alert.checkedAt).toISOString(),
    status: alert.status,
    rationale: alert.rationale,
    nextAction: alert.nextAction,
    reviewState: alertReview[alert.id] ?? defaultAlertReviewState(alert),
    objectDetail: alertToObjectDetail(alert),
    conceptKey: alert.conceptKey,
  }))
  const effectiveMonitoringConcepts = [...monitoringConcepts]
  if (ticketedPlaySaleHasOpened()) {
    const conceptIndex = effectiveMonitoringConcepts.findIndex(concept => concept.concept_key === 'atlanta:ticketed-play:sales-opening')
    const currentConcept = effectiveMonitoringConcepts[conceptIndex]
    if (currentConcept?.current_state.phase !== 'open') {
      const openedConcept: MonitoringConceptRow = {
        concept_key: 'atlanta:ticketed-play:sales-opening',
        title: 'Ticketed Play sales',
        current_summary: 'Ticketed Play sales are now open.',
        attention_state: 'milestone_transition',
        review_state: currentConcept?.review_state ?? 'unread',
        latest_resolution: 'Sales open',
        current_state: {
          ...(currentConcept?.current_state ?? {}),
          phase: 'open',
          milestone_opened_at: TICKETED_PLAY_SALE_OPENED_AT,
          clock_derived: true,
          resources: [{ label: 'Ticketed Play Schedule', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule.html' }],
        },
        evidence_count: currentConcept?.evidence_count ?? 1,
        first_seen_at: currentConcept?.first_seen_at ?? TICKETED_PLAY_SALE_OPENED_AT,
        last_seen_at: TICKETED_PLAY_SALE_OPENED_AT,
      }
      if (conceptIndex >= 0) effectiveMonitoringConcepts[conceptIndex] = openedConcept
      else effectiveMonitoringConcepts.push(openedConcept)
    }
  }
  const conceptActivity: ActivityItem[] = effectiveMonitoringConcepts.filter(monitoringConceptIsUserFacing).map(concept => {
    const resources = monitoringConceptResources(concept)
    const sourceLabel = typeof concept.current_state.source_label === 'string' ? concept.current_state.source_label : 'Official source'
    const sourceUrl = typeof concept.current_state.source_url === 'string' ? concept.current_state.source_url : ''
    const persistedReview = alertReview[`concept-${concept.concept_key}`]
    const reviewState: AlertReviewState = persistedReview ?? (concept.review_state === 'archived' ? 'archived' : concept.review_state === 'read' ? 'reviewed' : 'needs-review')
    const needsAttention = monitoringConceptIsHomeWorthy(concept)
    return {
      id: `concept-${concept.concept_key}`,
      conceptKey: concept.concept_key,
      sourceKind: 'monitor', kind: 'site', severity: needsAttention ? 'hot' : 'notice', destination: 'Activity',
      attention: needsAttention ? 'Needs attention' : 'Worth knowing', title: concept.title, summary: concept.current_summary,
      object: sourceLabel, source: sourceLabel, checkedAt: new Date(concept.last_seen_at).toLocaleString(), checkedAtIso: concept.last_seen_at,
      status: concept.latest_resolution ?? concept.attention_state, rationale: concept.current_summary,
      nextAction: 'Open the concept for its current evidence and provenance.', reviewState,
      objectDetail: {
        id: `monitoring-concept-${concept.concept_key}`, kind: 'alert', eyebrow: 'Monitoring concept', title: concept.title,
        summary: concept.current_summary,
        facts: [
          { label: 'Status', value: concept.latest_resolution ?? concept.attention_state },
          { label: 'Evidence', value: `${concept.evidence_count} retained observation${concept.evidence_count === 1 ? '' : 's'}` },
          { label: 'Last seen', value: new Date(concept.last_seen_at).toLocaleString() },
        ],
        links: resources,
        source: sourceUrl ? { label: sourceLabel, value: sourceUrl } : undefined,
        backlinks: [{ label: 'Activity', destination: 'activity' }],
      },
      monitoringConcept: concept,
      officialResources: resources,
    }
  })
  const findingActivity: ActivityItem[] = monitoringFindings.map(finding => {
    const resources = findingOfficialResources(finding)
    const informational = findingIsInformational(finding)
    const ticketedInventory = finding.evidence.intake_kind === 'ticketed_play_inventory'
    const ticketedInbox = ticketedInventory && finding.destination === 'Inbox'
    const ticketedEvents = ticketedInventory && Array.isArray(finding.evidence.events)
      ? finding.evidence.events.flatMap(raw => {
          if (!raw || typeof raw !== 'object') return []
          const event = raw as { title?: unknown; day?: unknown; startsAt?: unknown; people?: unknown }
          if (typeof event.title !== 'string' || typeof event.day !== 'string' || typeof event.startsAt !== 'string') return []
          if (!/^\d{4}-\d{2}-\d{2}$/.test(event.day) || !/^\d{2}:\d{2}$/.test(event.startsAt)) return []
          return [{ title: event.title, day: event.day, startsAt: event.startsAt, people: Array.isArray(event.people) ? event.people.filter(person => typeof person === 'string') : [] }]
        })
      : []
    const ticketedDayGroups = groupHomeSoldOutEventsByDay([ticketedEvents])
    const ticketedOverlap = ticketedEvents.some(event => event.people.length > 0)
    const ticketedSummary = ticketedInventory && ticketedEvents.length
      ? `${ticketedEvents.length} events sold out across ${ticketedDayGroups.map(group => formatTicketedDay(group.day, false)).join(', ')}.${ticketedOverlap ? ' One or more overlap saved plans.' : " None overlap anyone's saved plans."}`
      : findingDisplaySummary(finding)
    return {
    id: `finding-${finding.id}`,
    sourceKind: 'monitor',
    kind: 'site',
    severity: ticketedInbox || (ticketedInventory && homeSignalIsHotNow(finding.last_seen_at)) ? 'hot' : ticketedInventory ? 'notice' : findingIsHomeWorthy(finding) || finding.destination === 'Home' ? 'hot' : 'notice',
    destination: finding.destination,
    attention: ticketedInbox ? 'Selected event sold out' : ticketedInventory ? 'Ticketed Play availability' : informational ? 'New official resources' : 'Kavi decision needed',
    title: finding.title,
    summary: ticketedSummary,
    object: finding.source_label,
    source: finding.source_label,
    checkedAt: new Date(finding.last_seen_at).toLocaleString(),
    checkedAtIso: finding.last_seen_at,
    status: findingReviewLabel(finding),
    rationale: ticketedInventory ? 'The official registration inventory changed. Personal and shared selections were used only to route this alert; no selection was changed.' : informational ? 'These first-party links make the new play information directly useful without changing any canonical event or plan.' : 'The surveyor retained source evidence for a bounded canonical decision.',
    nextAction: ticketedInbox ? 'Review the affected selected event, then dismiss this alert when it is handled.' : ticketedInventory ? 'Review the grouped sold-out events.' : informational ? 'Open the relevant official resource, then mark this read or archive it.' : findingExecutionDetail(finding),
    reviewState: ['archived', 'dismissed', 'deferred'].includes(finding.status) ? 'archived' : ['read', 'completed'].includes(finding.status) ? 'reviewed' : 'needs-review',
    objectDetail: {
      id: `monitoring-finding-${finding.id}`,
      kind: 'alert',
      eyebrow: ticketedInventory ? 'Ticketed Play update' : 'Surveyor finding',
      kindLabel: ticketedInventory ? 'Sold out' : undefined,
      title: finding.title,
      summary: ticketedSummary,
      facts: ticketedInventory ? [
        { label: 'Events', value: String(ticketedEvents.length) },
        { label: 'Days', value: ticketedDayGroups.map(group => formatTicketedDay(group.day, false)).join(', ') },
      ] : [
        { label: informational ? 'Status' : 'Decision', value: findingReviewLabel(finding) },
        { label: 'First seen', value: new Date(finding.first_seen_at).toLocaleString() },
        { label: 'Last seen', value: new Date(finding.last_seen_at).toLocaleString() },
        { label: 'Repeated', value: `${finding.occurrence_count} observation${finding.occurrence_count === 1 ? '' : 's'}` },
        ...(finding.executed_at ? [{ label: 'Executed', value: new Date(finding.executed_at).toLocaleString() }] : []),
      ],
      soldOutEvents: ticketedInventory ? ticketedEvents : undefined,
      source: { label: finding.source_label, value: finding.source_url },
      links: resources,
      rationale: ticketedInventory ? 'These events are no longer purchasable. The grouped list keeps the change visible without flooding Home with one alert per event.' : informational ? 'Use the labeled official resources below; no app data changes are waiting for approval.' : findingExecutionDetail(finding),
      backlinks: [{ label: 'Activity', destination: 'activity' }],
    },
    monitoringFinding: finding,
    officialResources: resources,
  }})
  // Raw source-diff findings are internal evidence. Only a genuinely mapped
  // canonical action may bypass the concept read model during rollout.
  const actionableFindingActivity = findingActivity.filter(item => item.monitoringFinding && findingMayBypassConceptReadModel(item.monitoringFinding))
  const monitoringActivity = coalesceMonitoringConcepts(conceptActivity, [...actionableFindingActivity, ...monitorActivity])
  const activityItems = [...generatedActivity, ...noteActivity, ...monitoringActivity].filter(shouldShowActivityItem).sort((a, b) => {
    const severityRank = { hot: 0, notice: 1, quiet: 2 } as const
    const reviewRank = { 'needs-review': 0, reviewed: 1, archived: 2 } as const
    const reviewDelta = reviewRank[a.reviewState] - reviewRank[b.reviewState]
    if (reviewDelta !== 0) return reviewDelta
    const severityDelta = severityRank[a.severity] - severityRank[b.severity]
    if (severityDelta !== 0) return severityDelta
    return new Date(b.checkedAtIso).getTime() - new Date(a.checkedAtIso).getTime()
  })
  const setActivityReviewState = (item: ActivityItem, state: AlertReviewState) => {
    if (item.monitoringConcept) {
      if (item.monitoringConcept.current_state.clock_derived) {
        setAlertReviewState(item.id, state)
        return
      }
      const qaSaleOpen = (new URLSearchParams(window.location.search).get('qa')?.split(',') ?? []).includes('sale-open')
        && item.monitoringConcept.concept_key === 'atlanta:ticketed-play:sales-opening'
      if (qaSaleOpen) {
        setMonitoringConcepts(current => current.map(row => row.concept_key === item.monitoringConcept!.concept_key ? { ...row, review_state: state === 'archived' ? 'archived' : state === 'reviewed' ? 'read' : 'unread' } : row))
        return
      }
      if (!supabase) return
      const reviewState = state === 'reviewed' ? 'read' : state === 'archived' ? 'archived' : 'unread'
      setMonitoringConcepts(current => current.map(row => row.concept_key === item.monitoringConcept!.concept_key ? { ...row, review_state: reviewState } : row))
      void supabase.from('monitoring_concepts').update({ review_state: reviewState, updated_at: new Date().toISOString() }).eq('concept_key', item.monitoringConcept.concept_key).select().single().then(result => {
        if (result.error) {
          setMessageTone('error')
          setMessage(`Concept review state could not be saved: ${result.error.message}`)
          void refreshUserContinuity()
        }
      })
      return
    }
    if (item.monitoringFinding) {
      if (!findingIsInformational(item.monitoringFinding) || !supabase) return
      const findingStatus = state === 'reviewed' ? 'read' : state === 'archived' ? 'archived' : 'unread'
      setMonitoringFindings(current => current.map(row => row.id === item.monitoringFinding!.id ? { ...row, status: findingStatus } : row))
      void supabase.from('monitoring_findings').update({ status: findingStatus, updated_at: new Date().toISOString() }).eq('id', item.monitoringFinding.id).select().single().then(result => {
        if (result.error) {
          setMessageTone('error')
          setMessage(`Review state could not be saved: ${result.error.message}`)
          void refreshUserContinuity()
        }
      })
      return
    }
    if (item.sourceKind === 'monitor') {
      setAlertReviewState(item.id, state)
      return
    }
    void upsertUserSelection(`activity-${item.id}`, 'activity', 'review_state', state)
  }
  const decideMonitoringFinding = async (finding: MonitoringFindingRow, decision: MonitoringFindingDecision) => {
    if (!canWrite || !supabase || !effectiveOwnerId || !isKaviCompanion(currentCompanion)) return
    if (decision === 'yes') {
      if (!findingCanAuthorize(finding)) {
        setMessageTone('error')
        setMessage('This finding needs a bounded action mapping before it can be approved.')
        return
      }
      setMonitoringFindings(current => current.map(row => row.id === finding.id ? { ...row, execution_status: 'executing', error_message: null } : row))
      const execution = await supabase.rpc('execute_official_links_monitoring_action', { p_finding_id: finding.id })
      if (execution.error) {
        setMonitoringFindings(current => current.map(row => row.id === finding.id ? { ...row, execution_status: 'failed', error_message: execution.error.message } : row))
        setMessageTone('error')
        setMessage(`Approved action could not be completed: ${execution.error.message}`)
        return
      }
      const [findingsResult, activityResult] = await Promise.allSettled([loadMonitoringFindings(), loadUserActivityEvents(effectiveOwnerId)])
      if (findingsResult.status === 'fulfilled') setMonitoringFindings(findingsResult.value)
      if (activityResult.status === 'fulfilled') setUserActivityRows(activityResult.value)
      if (findingsResult.status === 'rejected' || activityResult.status === 'rejected') {
        setMessageTone('error')
        setMessage('The action completed, but its readback could not be refreshed. Refresh Activity before retrying.')
        return
      }
      setMessageTone('info')
      setMessage('Reviewed official links published and verified.')
      return
    }
    const patch = monitoringDecisionPatch(decision, effectiveOwnerId, finding)
    const result = await supabase.from('monitoring_findings').update(patch).eq('id', finding.id).eq('status', 'needs_review').select().single()
    if (result.error) {
      setMessageTone('error')
      setMessage(`Monitoring decision could not be saved: ${result.error.message}`)
      return
    }
    setMonitoringFindings(current => current.map(row => row.id === finding.id ? result.data as MonitoringFindingRow : row))
  }
  const chooseMonitoringFinding = async (finding: MonitoringFindingRow, choiceKey: string) => {
    if (!canWrite || !supabase || !effectiveOwnerId || !isKaviCompanion(currentCompanion) || !findingIsChoiceResolution(finding)) return
    const execution = await supabase.rpc('resolve_monitoring_factual_choice', { p_finding_id: finding.id, p_choice_key: choiceKey })
    if (execution.error) {
      setMessageTone('error')
      setMessage(`The factual choice could not be applied: ${execution.error.message}`)
      return
    }
    const [findingsResult, activityResult] = await Promise.allSettled([loadMonitoringFindings(), loadUserActivityEvents(effectiveOwnerId)])
    if (findingsResult.status === 'fulfilled') setMonitoringFindings(findingsResult.value)
    if (activityResult.status === 'fulfilled') setUserActivityRows(activityResult.value)
  }
  const deferMonitoringFinding = async (finding: MonitoringFindingRow) => {
    if (!canWrite || !supabase || !findingIsChoiceResolution(finding)) return
    const result = await supabase.from('monitoring_findings').update(monitoringDeferPatch()).eq('id', finding.id).in('status', ['needs_review', 'deferred']).select().single()
    if (result.error) {
      setMessageTone('error')
      setMessage(`The decision could not be deferred: ${result.error.message}`)
      return
    }
    setMonitoringFindings(current => current.map(row => row.id === finding.id ? result.data as MonitoringFindingRow : row))
  }
  const homeHeaderSignals = surface === 'home' ? homeWorthKnowingItems(activityItems, Date.now(), currentCompanion?.name ?? 'Kavi') : []
  const homeHeaderHotCount = homeHeaderSignals.filter(item => item.severity === 'hot').length
  const saleInboxSignal = activityItems.find(item => item.monitoringFinding?.destination === 'Inbox')
    ?? activityItems.find(item => isFeaturedTicketedPlaySale(item, Date.now()))
  const shiverSignal = saleInboxSignal?.reviewState === 'needs-review' ? saleInboxSignal : undefined
  const headerLabel = surface === 'home' && homeHeaderHotCount ? 'ACTIVE WATCH' : surfaceLabel(surface)
  const headerTitle = surface === 'home' ? 'Atlanta here we come!' : surfaceTitle(surface)
  const headerSubtitle = surface === 'home' && homeHeaderHotCount ? 'New MagicCon signal is ready to review.' : surfaceSubtitle(surface)
  const homeDestination = navigationDestination('home')
  const mapDestination = navigationDestination('map')
  const infoDestination = navigationDestination('info')
  const mobileDrawerItems = mobileNavMenu === 'events'
    ? mobileDrawerDestinations('events')
    : mobileNavMenu === 'more'
      ? mobileDrawerDestinations('more')
      : primaryDestinations

  return <div className="app-shell" style={desktopRailLocked ? { display: 'block', minHeight: '100vh' } : undefined}>
    <aside className="rail" data-tour-target="main-navigation" style={desktopRailLocked ? {
      position: 'fixed',
      zIndex: 40,
      top: 0,
      left: 0,
      bottom: 0,
      width: '164px',
      height: '100vh',
      maxHeight: 'none',
      overflowY: 'auto',
      overflowX: 'hidden',
    } : undefined}>
      <button className="brand" type="button" onClick={() => openDestination('Home', 'home')} aria-label="MagicCon Atlanta home">
        <img src={assetUrl('magiccon-atlanta-peach.png')} alt="" />
      </button>
      <nav className="desktop-primary-nav" aria-label="Primary navigation">
        {primaryDestinations.map(destination => <button
          key={destination.name}
          type="button"
          data-tour-target={`nav-${destination.surface}`}
          className={destination.surface === surface ? 'active' : destination.surface ? '' : 'upcoming'}
          aria-current={destination.surface === surface ? 'page' : undefined}
          onClick={() => openDestination(destination.name, destination.surface)}
          title={destination.surface ? destination.name : `${destination.name} · later tranche`}
        ><span aria-hidden="true"><NavIcon name={destination.icon} /></span>{destination.name}</button>)}
      </nav>
      <nav className="mobile-primary-nav" aria-label="Mobile primary navigation">
        <button className={surface === homeDestination.surface ? 'active' : ''} type="button" onClick={() => openDestination(homeDestination.name, homeDestination.surface)}><span aria-hidden="true"><NavIcon name={homeDestination.icon} /></span>{homeDestination.name}</button>
        <button className={['calendar', 'plan', 'explore'].includes(surface) ? 'active' : ''} type="button" aria-expanded={mobileNavMenu === 'events'} onClick={() => setMobileNavMenu(menu => menu === 'events' ? null : 'events')}><span aria-hidden="true"><NavIcon name="calendar" /></span>Events</button>
        <button className={surface === mapDestination.surface ? 'active' : ''} type="button" data-tour-target="nav-map" onClick={() => openDestination(mapDestination.name, mapDestination.surface)}><span aria-hidden="true"><NavIcon name={mapDestination.icon} /></span>{mapDestination.name}</button>
        <button className={surface === infoDestination.surface ? 'active' : ''} type="button" onClick={() => openDestination(infoDestination.name, infoDestination.surface)}><span aria-hidden="true"><NavIcon name={infoDestination.icon} /></span>{infoDestination.name}</button>
        <button className={['wallet', 'trip', 'artists', 'notes', 'activity'].includes(surface) ? 'active' : ''} type="button" aria-expanded={mobileNavMenu === 'more'} onClick={() => setMobileNavMenu(menu => menu === 'more' ? null : 'more')}><span className="more-dots" aria-hidden="true">•••</span>More</button>
      </nav>
      <div className="rail-bottom">
        <button className={`activity-link ${surface === 'activity' ? 'active' : ''}`} type="button" onClick={() => openDestination('Activity', 'activity')}><span aria-hidden="true"><NavIcon name="activity" /></span>Activity{mentionUnreadCount > 0 && <b className="nav-count-badge">{mentionUnreadCount > 9 ? '9+' : mentionUnreadCount}</b>}</button>
        <span className="rail-last-checked">Last checked<br /><strong>{lastChecked}</strong></span>
      </div>
    </aside>

    {mobileNavMenu && <div className={`mobile-nav-drawer-backdrop menu-${mobileNavMenu}`} onMouseDown={event => { if (event.target === event.currentTarget) setMobileNavMenu(null) }}>
      <section className="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label={mobileNavMenu === 'main' ? 'Main navigation' : mobileNavMenu === 'events' ? 'Event destinations' : 'More destinations'}>
        {mobileNavMenu === 'main'
          ? <header className="mobile-drawer-brand">
            <button className="mobile-drawer-brand-logo" type="button" onClick={() => openDestination('Home', 'home')} aria-label="MagicCon Atlanta home">
              <img src={assetUrl('magiccon-atlanta-peach.png')} alt="" />
            </button>
            <button type="button" onClick={() => setMobileNavMenu(null)} aria-label="Close navigation drawer">×</button>
          </header>
          : <header><span className="eyebrow">{mobileNavMenu === 'events' ? 'EVENTS' : 'MORE'}</span><button type="button" onClick={() => setMobileNavMenu(null)} aria-label="Close navigation drawer">×</button></header>}
        <div className={mobileNavMenu === 'main' ? 'mobile-drawer-nav mobile-drawer-nav-main' : undefined}>
          {mobileDrawerItems.map(destination => mobileNavMenu === 'main'
            ? <button key={destination.surface} type="button" data-tour-target={`mobile-nav-${destination.surface}`} className={surface === destination.surface ? 'active' : ''} aria-current={surface === destination.surface ? 'page' : undefined} onClick={() => openDestination(destination.name, destination.surface)}>
              <span aria-hidden="true"><NavIcon name={destination.icon} /></span>{destination.name}
            </button>
            : <button key={destination.surface} type="button" className={surface === destination.surface ? 'active' : ''} aria-current={surface === destination.surface ? 'page' : undefined} onClick={() => openDestination(destination.name, destination.surface)}>
              <span aria-hidden="true"><NavIcon name={destination.icon} /></span><strong>{destination.name}</strong><small>{destination.mobileNote ?? ''}</small><b aria-hidden="true">›</b>
            </button>)}
        </div>
        {mobileNavMenu === 'main' && <footer className="mobile-drawer-foot">
          <button className={`mobile-drawer-activity ${surface === activityDestination.surface ? 'active' : ''}`} data-tour-target="mobile-nav-activity" type="button" onClick={() => openDestination(activityDestination.name, activityDestination.surface)}>
            <span aria-hidden="true"><NavIcon name={activityDestination.icon} /></span>{activityDestination.name}
            {mentionUnreadCount > 0 && <b className="nav-count-badge">{mentionUnreadCount > 9 ? '9+' : mentionUnreadCount}</b>}
          </button>
          <small>Last checked<br /><strong>{lastChecked}</strong></small>
        </footer>}
      </section>
    </div>}

    <main className={`surface-main surface-${surface}`} style={desktopRailLocked ? {
      display: 'block',
      width: 'auto',
      maxWidth: 'none',
      margin: '0 0 0 164px',
      padding: '24px clamp(22px, 2.4vw, 46px) 30px',
    } : undefined}>
      <header className={`hero ${['explore', 'plan', 'calendar'].includes(surface) ? 'hero-has-funnel' : ''} ${['map', 'trip', 'artists'].includes(surface) ? 'hero-has-view-switch' : ''}`}>
        <div>
          <div className="hero-context">
            <button className="back-caret desktop-back-caret" type="button" onClick={goBack} disabled={!previousSurface} aria-label="Back to previous view"><span aria-hidden="true">‹</span></button>
            <button className="back-caret mobile-menu-caret" data-tour-target="mobile-menu" type="button" onClick={() => setMobileNavMenu('main')} aria-label="Open main navigation" aria-expanded={mobileNavMenu === 'main'}><span aria-hidden="true">☰</span></button>
            <span className="kicker">{headerLabel}</span>
          </div>
          <h1>{headerTitle}</h1>
          <p>{headerSubtitle}</p>
        </div>
        <div className="header-status">
          <div className="header-actions">
            {message && messageTone === 'error' && <details className="global-alert-control">
              <summary aria-label="Account refresh alert" title="Account refresh alert">!</summary>
              <div className="global-alert-popover" role="status">
                <span className="eyebrow">SYNC ALERT</span>
                <p>{message}</p>
              </div>
            </details>}
            <MentionInbox
              items={mentionInboxState}
              alert={saleInboxSignal}
              onOpenMention={openMentionNote}
              onOpenAlert={() => { if (saleInboxSignal) openActivityItem(saleInboxSignal) }}
              onDismissAlert={item => setActivityReviewState(item, 'archived')}
              onRestoreAlert={item => setActivityReviewState(item, 'needs-review')}
              onDismissMention={item => { void setMentionDismissed(item.id, true) }}
              onRestoreMention={item => { void setMentionDismissed(item.id, false) }}
            />
            <AccountMenu
              email={effectiveSession?.user.email ?? 'kavigrace@gmail.com'}
              online={Boolean(session) && online}
              preview={designPreview || isPreviewOwnerMode}
              proofPack={offlineProofPack}
              onOpenTutorial={() => setTutorialOpen(true)}
              onSignOut={() => {
                if (effectiveOwnerId) void clearReceiptArtifactCache(effectiveOwnerId)
                clearOfflineIdentity()
                setOfflineIdentity(null)
                void supabase?.auth.signOut({ scope: 'local' })
              }}
            />
            <span className="countdown-chip"><strong>{daysToAtlanta}</strong><span>days to Atlanta</span></span>
          </div>
          <div id="mobile-header-view-slot" className="mobile-header-view-slot" />
          {surface === 'explore' && <FunnelNav current="explore" onOpenExplore={() => openDestination('Explore', 'explore')} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenCalendar={() => openDestination('Calendar', 'calendar')} />}
          {surface === 'plan' && <FunnelNav current="plan" onOpenExplore={() => openDestination('Explore', 'explore')} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenCalendar={() => openDestination('Calendar', 'calendar')} />}
          {surface === 'calendar' && <FunnelNav current="calendar" onOpenExplore={() => openDestination('Explore', 'explore')} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenCalendar={() => openDestination('Calendar', 'calendar')} />}
        </div>
      </header>

      {((message && messageTone !== 'error') || navNotice) && <p role="status" className={message ? `alert ${messageTone}` : 'nav-notice'}>{message || navNotice}</p>}
      <>
        {surface === 'home' && <HomeSurface slice={displaySlice} activityItems={activityItems} currentPerson={currentCompanion?.name ?? 'Kavi'} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenItem={openActivityItem} onOpenObject={openObjectDetail} onOpenActivity={() => openDestination('Activity', 'activity')} />}
        {surface === 'calendar' && <CalendarSurface slice={displaySlice} events={displayedExploreEvents} flights={tripFlights} selectionRows={sharedSelectionRows} companions={companionMembers} notes={contextNotesState} currentOwnerId={effectiveOwnerId} currentPerson={currentCompanion?.name ?? 'Kavi'} onAddNote={addContextNote} onDeleteNote={deleteContextNote} onUpdateEvent={updateExploreEvent} onPurchase={updateEventPurchase} onOpenExplore={() => openDestination('Explore', 'explore')} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenPlanEvent={openPlanEventContext} onOpenTrip={() => openDestination('Trip', 'trip')} onChangeState={state => void changeState(state)} online={online} saving={saving} canCommitBlackLotus={canCommitBlackLotus} />}
        {surface === 'explore' && <ExploreSurface events={displayedExploreEvents} routeState={exploreRouteState} focusRequest={exploreFocusRequest} notes={contextNotesState} currentOwnerId={effectiveOwnerId} currentPerson={currentCompanion?.name ?? 'Kavi'} onAddNote={addContextNote} onDeleteNote={deleteContextNote} onUpdateEvent={updateExploreEvent} onPurchase={updateEventPurchase} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenCalendar={() => openDestination('Calendar', 'calendar')} />}
        {surface === 'map' && <MapSurface onOpenTrip={() => openDestination('Trip', 'trip')} />}
        {surface === 'info' && <InfoSurface topics={infoTopics} feed={infoFeed} catalogReadModel={catalogReadModel} currentOwnerId={catalogBrowserQa ? catalogBrowserPreviewOwnerId : effectiveOwnerId} canEditCatalogInterest={catalogBrowserQa || canWrite} canUseCatalogImport={isKaviOperator} canPromoteCatalog={canWrite && isKaviOperator} catalogInterestSavingOfferId={catalogInterestSavingOfferId} catalogPromotionSaving={catalogPromotionSaving} onPromoteCatalog={promoteReviewedCatalog} onToggleCatalogInterest={toggleCatalogInterest} onOpenObject={openObjectDetail} />}
        {surface === 'wallet' && qaFlags.includes('receipt-proof-ingest') && isKaviOperator && <ReceiptProofIngestLab />}
        {surface === 'wallet' && <WalletSurface receipts={walletReceipts} onOpenObject={openObjectDetail} onOpenTrip={() => openDestination('Trip', 'trip')} notes={contextNotesState} currentOwnerId={effectiveOwnerId} onAddNote={addContextNote} onDeleteNote={deleteContextNote} prizeTixValue={(currentCompanion?.name === 'Juan' ? sharedSelectionRows.find(row => row.owner_id === companionMembers.find(member => member.key === 'kavi')?.userId && row.object_id === 'wallet-prize-tix' && row.selection_key === 'balance')?.selection_value : undefined) ?? userSelections[selectionKey('wallet-prize-tix', 'balance')]} proofRequest={walletProofRequest} onPrizeTixChange={(value, delta) => {
          if (currentCompanion?.name === 'Juan') {
            const kaviOwnerId = companionMembers.find(member => member.key === 'kavi')?.userId
            if (canWrite && supabase && kaviOwnerId) {
              void supabase.from('user_selections').upsert({ owner_id: kaviOwnerId, object_id: 'wallet-prize-tix', object_kind: 'wallet', selection_key: 'balance', selection_value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'owner_id,object_id,selection_key' }).then(({ error }) => {
                if (error) { setMessageTone('error'); setMessage(`Prize Tix could not be saved: ${error.message}`) }
              })
            }
          } else void upsertUserSelection('wallet-prize-tix', 'wallet', 'balance', String(value))
          if (!delta) return
          void recordUserActivity({
            objectId: 'wallet-prize-tix',
            objectKind: 'wallet',
            activityType: 'prize_tix_adjusted',
            summary: `${noteAuthorFromSession(effectiveSession, companionMembers)} ${delta > 0 ? 'added' : 'spent'} ${Math.abs(delta)} Prize Tix.`,
            details: {
              delta,
              next_balance: value,
            },
          })
        }} />}
        {surface === 'trip' && <TripSurface onOpenObject={openObjectDetail} flights={tripFlights} />}
        {surface === 'artists' && <ArtistsSurface currentPerson={currentCompanion?.name ?? 'Kavi'} currentOwnerId={effectiveOwnerId} canWrite={canWrite} onOpenObject={openObjectDetail} onOpenActivity={() => openDestination('Activity', 'activity')} />}
        {surface === 'notes' && <NotesSurface notes={contextNotesState} currentOwnerId={effectiveOwnerId} onDeleteNote={deleteContextNote} onOpenNote={openMentionNote} refreshFailed={continuityFailures.includes('notes')} onRetry={() => void refreshUserContinuity()} />}
        {surface === 'plan' && <PlanSurface events={displayedExploreEvents} selectionRows={sharedSelectionRows} companions={companionMembers} slice={displaySlice} focusRequest={planFocusRequest} notes={contextNotesState} currentOwnerId={effectiveOwnerId} currentPerson={currentCompanion?.name ?? 'Kavi'} onAddNote={addContextNote} onDeleteNote={deleteContextNote} onUpdateEvent={updateExploreEvent} onPurchase={updateEventPurchase} onChangeSliceState={state => void changeState(state)} onOpenExplore={() => openDestination('Explore', 'explore')} onOpenCalendar={() => openDestination('Calendar', 'calendar')} online={online} saving={saving} canCommitBlackLotus={canCommitBlackLotus} />}

        {surface === 'activity' && <ActivitySurface slice={displaySlice} activityItems={activityItems} notes={contextNotesState} onReviewChange={setActivityReviewState} onFindingDecision={decideMonitoringFinding} onFindingChoice={chooseMonitoringFinding} onFindingDefer={deferMonitoringFinding} onOpenItem={openActivityItem} onOpenNote={openMentionNote} />}
      </>

    </main>
      <ObjectDetailLayer detail={objectDetail} notes={contextNotesState} currentOwnerId={effectiveOwnerId} catalogOwnerId={catalogBrowserQa ? catalogBrowserPreviewOwnerId : effectiveOwnerId} catalogReadModel={catalogReadModel} canEditCatalogInterest={catalogBrowserQa || canWrite} catalogInterestSavingOfferId={catalogInterestSavingOfferId} onToggleCatalogInterest={toggleCatalogInterest} onAddNote={addContextNote} onDeleteNote={deleteContextNote} onClose={closeObjectDetail} onNavigate={navigateFromObjectDetail} onOpenObject={openObjectDetail} />
      {tutorialOpen && <OnboardingTutorial surface={surface} onNavigate={next => openDestination(surfaceTitle(next), next)} onMobileMenuChange={setMobileNavMenu} onClose={() => {
        setTutorialOpen(false)
        void upsertUserSelection('onboarding-tour', 'general', 'completed', 'true')
      }} />}
  </div>
}

type ForecastId = 'ticketed-play' | 'artists' | 'black-lotus-store' | 'show-catalog'
type CalendarDetail = ForecastId | 'arrival' | 'preview' | 'friday' | 'event' | 'airport' | 'sunday' | 'bl-thursday' | 'bl-friday' | 'bl-sunday'
type WalletProofTarget = 'black-lotus' | 'juan-premium'

function trustSliceToObjectDetail(slice: TrustSlice): ObjectDetail {
  return {
    id: `event-${slice.occurrence.id}`,
    kind: 'event',
    eyebrow: 'Black Lotus event',
    title: slice.occurrence.title,
    summary: 'Known included Black Lotus occurrence. Keep it visible as a planning anchor, but do not let it silently become a hard block until you commit.',
    facts: [
      { label: 'When', value: formatOccurrenceTime(slice) },
      { label: 'Location', value: slice.occurrence.location_state === 'to_be_announced' ? 'To be announced' : slice.occurrence.location_label ?? 'To be announced' },
      { label: 'State', value: slice.decision.planning_state },
      { label: 'Prep', value: slice.occurrence.preparation_note ?? 'No prep note captured' },
    ],
    source: { label: slice.source.publisher_name, value: slice.source.canonical_url },
    rationale: 'This is publisher truth plus your current personal planning state. The detail layer keeps those separate from any later onsite observation.',
    actions: [{ label: 'View Plan', destination: 'plan' }, { label: 'Open Activity', destination: 'activity' }],
    backlinks: [{ label: 'Calendar', destination: 'calendar' }, { label: 'Home', destination: 'home' }],
  }
}

function alertToObjectDetail(alert: MonitoringAlert): ObjectDetail {
  const destination = alert.destination.toLowerCase() as Surface
  const destinationKinds: Partial<Record<Surface, ObjectDetailKind>> = {
    calendar: 'event',
    explore: 'event',
    map: 'place',
    wallet: 'receipt',
    trip: 'place',
    artists: 'artist',
    notes: 'note',
  }
  const kind = destinationKinds[destination] ?? 'alert'
  const destinationLabel = alert.destination === 'Home' || alert.destination === 'Activity'
    ? 'Review signal'
    : `Open ${alert.destination}`
  const attentionLabel = alert.severity === 'hot'
    ? 'Breakthrough'
    : alert.severity === 'notice'
      ? 'Review'
      : 'Quiet'
  return {
    id: `alert-${alert.id}`,
    kind,
    eyebrow: `${alert.kind} · ${attentionLabel}`,
    title: alert.title,
    summary: alert.summary,
    facts: [
      { label: 'Object', value: alert.object },
      { label: 'Checked', value: alert.checkedAt },
      { label: 'Status', value: alert.status },
      { label: 'Destination', value: alert.destination },
    ],
    source: { label: 'Observed source', value: alert.source },
    rationale: alert.rationale,
    note: alert.nextAction,
    actions: [{ label: destinationLabel, destination }],
    backlinks: [{ label: 'Activity', destination: 'activity' }],
  }
}

function exploreEventToObjectDetail(event: ExploreEvent): ObjectDetail {
  return {
    id: `explore-${event.id}`,
    kind: 'event',
    eyebrow: `${event.kind} · ${event.state === 'none' ? 'unmarked' : event.state}`,
    title: displayEventTitle(event),
    summary: event.fit,
    facts: [
      { label: 'When', value: `${event.day} · ${event.time}` },
      { label: 'Price', value: event.price },
      { label: 'Duration', value: event.window },
      { label: 'Format', value: event.format },
    ],
    source: event.sourceNote ? { label: 'Source note', value: event.sourceNote } : undefined,
    rationale: event.complexityWhy,
    note: event.planEffect,
    actions: [{ label: 'Compare in Plan', destination: 'plan' }, { label: 'Back to Explore', destination: 'explore' }],
    backlinks: [{ label: 'Explore', destination: 'explore' }],
  }
}

function renderLinkedText(text: string): ReactNode {
  const urlPattern = /https?:\/\/[^\s<]+/g
  const parts: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  while ((match = urlPattern.exec(text)) !== null) {
    const rawUrl = match[0]
    const start = match.index
    let displayUrl = rawUrl
    let trailing = ''
    while (/[),.!?]$/.test(displayUrl)) {
      trailing = displayUrl.slice(-1) + trailing
      displayUrl = displayUrl.slice(0, -1)
    }
    if (start > cursor) parts.push(text.slice(cursor, start))
    parts.push(<a key={`${displayUrl}-${start}`} className="inline-text-link" href={displayUrl} target="_blank" rel="noreferrer" aria-label={`Open link: ${displayUrl}`} title={displayUrl}>🔗</a>)
    if (trailing) parts.push(trailing)
    cursor = start + rawUrl.length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts.length ? parts : text
}

const promotedMoreDetailLabels = new Set(['prize tix', 'product', 'rounds'])
const wideEventDetailLabels = new Set(['prize tix', 'product'])

const roundNumberWords: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
}

function shouldPromoteEventDetail(label: string) {
  return promotedMoreDetailLabels.has(label.trim().toLowerCase())
}

function isWideEventDetail(label: string) {
  return wideEventDetailLabels.has(label.trim().toLowerCase())
}

function compactRounds(value: string) {
  const parentheticalCount = value.match(/\((\d+)\)/)?.[1]
  const wordCount = value.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i)?.[1].toLowerCase()
  const numericCount = value.match(/\b(\d+)\s+(?:swiss\s+|best[- ]of[- ](?:one|three|1|3)\s+|single[- ]elimination\s+)?rounds?\b/i)?.[1]
  const count = parentheticalCount ?? (wordCount ? roundNumberWords[wordCount] : numericCount)
  const minutes = value.match(/\b(\d+)\s*[- ]?minutes?\b/i)?.[1]
  const prefix = /\b(?:up to|max(?:imum)? of)\b/i.test(value) ? 'up to ' : ''
  const facts = [count ? `${prefix}${count}` : undefined, minutes ? `${minutes} mins/round` : /\buntimed\b/i.test(value) ? 'untimed' : undefined].filter(Boolean)
  return facts.length ? facts.join(', ') : value
}

function eventDecisionFacts(event: ExploreEvent) {
  const baseFacts = (event.decisionFacts ?? []).map(fact => event.availability === 'sold-out' && fact.label.trim().toLowerCase() === 'status'
    ? { ...fact, value: 'Sold out' }
    : fact)
  const baseLabels = new Set(baseFacts.map(fact => fact.label.trim().toLowerCase()))
  const promotionOrder = new Map([['rounds', 0], ['prize tix', 1], ['product', 2]])
  const promotedFacts = (event.moreDetails ?? [])
    .filter(item => shouldPromoteEventDetail(item.label) && !baseLabels.has(item.label.trim().toLowerCase()))
    .sort((left, right) => (promotionOrder.get(left.label.trim().toLowerCase()) ?? 99) - (promotionOrder.get(right.label.trim().toLowerCase()) ?? 99))
    .map(item => {
      const label = item.label.trim().toLowerCase()
      return { label: item.label, value: label === 'rounds' ? compactRounds(item.value) : item.value, icon: label === 'prize tix' ? 'ticket' as const : undefined }
    })
  return [...baseFacts, ...promotedFacts]
}

function eventMoreDetails(event: ExploreEvent) {
  return (event.moreDetails ?? []).filter(item => !shouldPromoteEventDetail(item.label))
}

function noteToObjectDetail(note: ContextNote): ObjectDetail {
  return {
    id: note.objectId,
    kind: note.objectKind,
    eyebrow: note.context,
    title: note.objectTitle,
    summary: `Note from ${note.author}: ${note.body}`,
    focusedNoteId: note.id,
    objectAnchor: note.objectAnchor,
    facts: [
      { label: 'Author', value: note.author },
      { label: 'Visibility', value: note.visibility },
      { label: 'Updated', value: note.updatedAt },
      { label: 'Backlink', value: note.backlink },
      ...(note.objectAnchor ? [{ label: 'Anchor', value: note.objectAnchor }] : []),
    ],
    note: note.body,
    backlinks: [{ label: note.backlink, destination: note.backlink.toLowerCase() as Surface }, { label: 'Notes', destination: 'notes' }],
  }
}

function focusDetailOnNote(detail: ObjectDetail, note: ContextNote): ObjectDetail {
  return {
    ...detail,
    focusedNoteId: note.id,
    objectAnchor: note.objectAnchor ?? detail.objectAnchor,
  }
}

function receiptSourceDetail(note: ContextNote): ObjectDetail | null {
  if (note.objectId === 'wallet-black-lotus-order') return focusDetailOnNote({
    id: 'wallet-black-lotus-order',
    kind: 'receipt',
    eyebrow: 'Wallet · Black Lotus order',
    title: 'Kavi + Chris badge proof',
    summary: 'Showable Black Lotus order proof captured from the Leap email, including the QR and original receipt.',
    facts: [
      { label: 'Badge holders', value: 'Kavi + Chris' },
      { label: 'Badges', value: '2 × Black Lotus VIP Early Bird' },
      { label: 'Showable QR', value: 'Captured' },
      { label: 'Original', value: 'Full email receipt captured' },
    ],
    source: { label: 'Source', value: 'MagicCon: Atlanta 2026 Order Confirmation from Leap Conventions' },
    rationale: 'This is the source receipt/proof item. Notes opened from mentions should land here, not in a separate note wrapper.',
    actions: [{ label: 'Open Wallet', destination: 'wallet' }],
    backlinks: [{ label: 'Wallet', destination: 'wallet' }],
  }, note)

  if (note.objectId === 'wallet-juan-premium-order') return focusDetailOnNote({
    id: 'wallet-juan-premium-order',
    kind: 'receipt',
    eyebrow: 'Wallet · Juan Premium order',
    title: 'Juan badge proof',
    summary: 'Showable Juan Premium Weekend badge proof captured from the Leap email, including the QR and original receipt.',
    facts: [
      { label: 'Badge holder', value: 'Juan' },
      { label: 'Badge', value: 'Premium Weekend Early Bird' },
      { label: 'Showable QR', value: 'Captured' },
      { label: 'Original', value: 'Full email receipt captured' },
    ],
    source: { label: 'Source', value: 'MagicCon: Atlanta 2026 Order Confirmation from Leap Conventions' },
    rationale: 'This is the source receipt/proof item. Notes opened from mentions should land here, not in a separate note wrapper.',
    actions: [{ label: 'Open Wallet', destination: 'wallet' }],
    backlinks: [{ label: 'Wallet', destination: 'wallet' }],
  }, note)

  return null
}

function receiptTargetFromNote(note: ContextNote): WalletProofTarget | null {
  if (note.objectId === 'wallet-black-lotus-order') return 'black-lotus'
  if (note.objectId === 'wallet-juan-premium-order') return 'juan-premium'
  return null
}

function surfaceFromNoteBacklink(note: ContextNote): Surface {
  if (note.objectId.startsWith('wallet-')) return 'wallet'
  if (note.objectId.startsWith('explore-')) return 'explore'
  if (note.objectId.startsWith('hotel-') || note.objectId.startsWith('trip-')) return 'trip'
  const backlink = note.backlink.toLowerCase()
  if (backlink === 'home' || backlink === 'calendar' || backlink === 'plan' || backlink === 'explore' || backlink === 'map' || backlink === 'wallet' || backlink === 'trip' || backlink === 'artists' || backlink === 'notes' || backlink === 'activity') return backlink
  return 'notes'
}

function noteSourceObjectDetail(note: ContextNote): ObjectDetail {
  if (note.objectId.startsWith('explore-')) {
    const eventId = note.objectId.replace(/^explore-/, '')
    const event = exploreEventCandidates.find(candidate => candidate.id === eventId)
    if (event) return focusDetailOnNote(exploreEventToObjectDetail(event), note)
  }

  if (note.objectId === 'hotel-courtyard') return focusDetailOnNote(tripHotelDetail('courtyard'), note)
  if (note.objectId === 'hotel-omni') return focusDetailOnNote(tripHotelDetail('omni'), note)
  if (note.objectId === 'hotel-chris' || note.objectId === 'hotel-hilton') return focusDetailOnNote(tripHotelDetail('hilton'), note)
  if (note.objectId === 'trip-luggage-thursday') return focusDetailOnNote(tripTransitionDetail(), note)
  if (note.objectId === 'atlanta-operational-logistics') return focusDetailOnNote(logisticsToObjectDetail(), note)

  const receiptDetail = receiptSourceDetail(note)
  if (receiptDetail) return receiptDetail

  return noteToObjectDetail(note)
}

function logisticsToObjectDetail(): ObjectDetail {
  return {
    id: 'atlanta-operational-logistics',
    kind: 'place',
    eyebrow: 'Publisher logistics',
    title: 'Will Call and show hours',
    summary: 'Registration, show floor, and play-area hours extracted from the Atlanta order confirmation.',
    facts: [
      { label: 'Will Call Thu', value: '12 PM-6 PM' },
      { label: 'Will Call Fri/Sat', value: '8:30 AM-7 PM' },
      { label: 'Will Call Sun', value: '8:30 AM-6 PM' },
      { label: 'Show floor Fri/Sat', value: '10 AM-7 PM' },
      { label: 'Show floor Sun', value: '10 AM-6 PM' },
      { label: 'Play area', value: 'Fri/Sat until 11:59 PM' },
    ],
    source: { label: 'Source', value: 'MagicCon: Atlanta 2026 Order Confirmation from Leap Conventions, received June 16, 2026' },
    rationale: 'This is operational context, not a receipt. It should be reachable from planning and trip context, while the original proof stays in Wallet.',
    backlinks: [{ label: 'Wallet', destination: 'wallet' }, { label: 'Calendar', destination: 'calendar' }],
    actions: [{ label: 'Open Wallet proof', destination: 'wallet' }, { label: 'Open Calendar', destination: 'calendar' }],
  }
}

type ArtistSeed = {
  id: string
  title: string
  status: string
  signal: string
  summary: string
  attendance: string
  bioUrl?: string
  thumbnailUrl?: string
  thumbnailAlt?: string
  thumbnailCaption?: string
  facts: Array<{ label: string; value: string }>
  signatureTargets?: Array<{ name: string; note: string }>
}

type ArtistCardCandidate = {
  id: string
  artistId?: string
  cardId?: string
  printingId?: string
  cardName: string
  artistName: string
  setCode: string
  setName: string
  collectorNumber: string
  foil: string
  rarity: string
  quantity: number
  marketPrice: string
  priceAsOf: string
  printingType: string
  specialTreatment?: string
  visualStyle: string
  abstractSurrealFocus: string
  tasteMatch: string
  taxonomyConfidence: string
  reviewForTaste: string
  styleNotes: string
  styleTags?: readonly string[]
  artCropUrl: string
  cardImageUrl: string
  scryfallUrl: string
}

const scryfallArtistSearchUrl = (artistName: string) =>
  `https://scryfall.com/search?as=grid&order=name&q=${encodeURIComponent(`(game:paper) artist:"${artistName}" prefer:best`)}`

const artistSeeds: ArtistSeed[] = [
  {
    id: 'cynthia-sheppard',
    title: 'Cynthia Sheppard',
    status: 'Official Atlanta Art of Magic guest',
    signal: 'Confirmed artist',
    summary: 'Cynthia Sheppard is listed on the official MagicCon: Atlanta guest page as an Art of Magic artist appearing all days. This should become a signing-candidate row once your curated card list is available.',
    attendance: 'All days',
    bioUrl: 'https://mcatlanta.mtgfestivals.com/en-us/guests/guest-profile.html?gtID=378578&guest-name=Cynthia-Sheppard',
    thumbnailUrl: `${import.meta.env.BASE_URL}artist-cynthia-sheppard.jpg`,
    thumbnailAlt: 'Cynthia Sheppard will be at MagicCon: Atlanta',
    thumbnailCaption: 'Official MagicCon guest photo',
    facts: [
      { label: 'Guest type', value: 'Art of Magic' },
      { label: 'Appearing', value: 'All days' },
      { label: 'Source', value: 'Official Atlanta guest directory' },
      { label: 'Next data', value: 'Match against curated card list' },
    ],
    signatureTargets: [
      { name: 'Curated card list pending', note: 'Add owned-card matches here.' },
    ],
  },
  {
    id: 'mark-poole',
    title: 'Mark Poole',
    status: 'Official Atlanta Art of Magic guest',
    signal: 'Confirmed artist',
    summary: 'Mark Poole is listed on the official MagicCon: Atlanta guest page as an Art of Magic artist appearing all days. This is likely a high-value signing row once the owned-card shortlist lands.',
    attendance: 'All days',
    bioUrl: 'https://mcatlanta.mtgfestivals.com/en-us/guests/guest-profile.html?gtID=378577&guest-name=Mark-Poole',
    thumbnailUrl: `${import.meta.env.BASE_URL}artist-mark-poole.jpg`,
    thumbnailAlt: 'Mark Poole will be at MagicCon: Atlanta',
    thumbnailCaption: 'Official MagicCon guest photo',
    facts: [
      { label: 'Guest type', value: 'Art of Magic' },
      { label: 'Appearing', value: 'All days' },
      { label: 'Source', value: 'Official Atlanta guest directory' },
      { label: 'Next data', value: 'Prioritize cards worth carrying' },
    ],
    signatureTargets: [
      { name: 'Curated card list pending', note: 'Likely needs a short “bring these” rail.' },
    ],
  },
  {
    id: 'serena-malyon',
    title: 'Serena Malyon',
    status: 'Official Atlanta Art of Magic guest',
    signal: 'Confirmed artist',
    summary: 'Serena Malyon is listed on the official MagicCon: Atlanta guest page as an Art of Magic artist appearing all days. Keep her row ready for card matching and signature planning.',
    attendance: 'All days',
    bioUrl: 'https://mcatlanta.mtgfestivals.com/en-us/guests/guest-profile.html?gtID=378595&guest-name=Serena-Malyon',
    thumbnailUrl: `${import.meta.env.BASE_URL}artist-serena-malyon.jpg`,
    thumbnailAlt: 'Serena Malyon will be at MagicCon: Atlanta',
    thumbnailCaption: 'Official MagicCon guest photo',
    facts: [
      { label: 'Guest type', value: 'Art of Magic' },
      { label: 'Appearing', value: 'All days' },
      { label: 'Source', value: 'Official Atlanta guest directory' },
      { label: 'Next data', value: 'Match against curated card list' },
    ],
    signatureTargets: [
      { name: 'Curated card list pending', note: 'Add owned-card matches here.' },
    ],
  },
  {
    id: 'rebecca-guay',
    title: 'Rebecca Guay',
    status: 'Likely artist watchlist seed',
    signal: 'Watch for Atlanta',
    summary: 'Rebecca Guay remains a useful planning seed because she is a high-value signature target if she appears, but she is not currently listed on the official Atlanta guest page.',
    attendance: 'Unconfirmed',
    thumbnailUrl: `${import.meta.env.BASE_URL}artist-rebecca-guay.png`,
    thumbnailAlt: 'Rebecca Guay portrait',
    thumbnailCaption: 'Planning image supplied by Kavi; Atlanta attendance remains unconfirmed.',
    facts: [
      { label: 'Guest type', value: 'Artist watchlist' },
      { label: 'Appearing', value: 'Unconfirmed for Atlanta' },
      { label: 'Source', value: 'Historical / planning seed' },
      { label: 'Next data', value: 'Keep only if card list makes her worth tracking' },
    ],
    signatureTargets: [
      { name: 'Curated card list pending', note: 'Match owned cards before deciding whether this stays prominent.' },
    ],
  },
]

const artistCardCandidates: ArtistCardCandidate[] = [...generatedArtistCardCandidates]

const normalizeArtistName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const fallbackArtistSeedByName = new Map(artistSeeds.map(seed => [normalizeArtistName(seed.title), seed]))

type ArtistCatalogRow = {
  id: string
  canonical_name: string
  display_name: string
  profile_image_url: string | null
  scryfall_search_url: string | null
  predominant_style: string | null
  abstract_surreal_tendency: string | null
  style_description: string | null
  sample_mtg_cards: string | null
}

type ArtistAppearanceCatalogRow = {
  artist_id: string
  attending_status: 'confirmed' | 'unconfirmed' | 'unknown' | 'not_attending'
  appearance_days: string | null
  official_profile_url: string | null
  source_note: string | null
  priority_reason: string | null
}

type ArtistCardCatalogRow = {
  id: string
  artist_id: string
  card_name: string
  scryfall_url: string | null
  card_image_url: string | null
  art_crop_url: string | null
}

type ArtistPrintingCatalogRow = {
  id: string
  card_id: string
  set_code: string | null
  set_name: string | null
  collector_number: string | null
  foil: string | null
  rarity: string | null
  quantity: number | null
  market_price_usd: number | string | null
  price_as_of: string | null
  printing_type: string | null
  special_treatments: string[] | null
}

type ArtistAssessmentCatalogRow = {
  printing_id: string
  card_art_category: string | null
  surreal_abstract_focus: string | null
  card_art_confidence: string | null
  card_art_description: string | null
  visual_art_category: string | null
  visual_match_for_taste: string | null
  visual_confidence: string | null
  visual_assessment_notes: string | null
  card_art_tags: string[] | null
  review_rank: number | null
}

type ArtistSigningInterestStatus = 'maybe' | 'want_signed'

type ArtistSigningInterestRow = {
  artist_id: string
  card_id: string | null
  printing_id: string | null
  interest_status: 'not_reviewed' | ArtistSigningInterestStatus | 'skip'
}

async function loadArtistSigningInterestMap(ownerId: string): Promise<Record<string, ArtistSigningInterestStatus>> {
  if (!supabase) return {}
  const { data, error } = await supabase.from('artist_signing_interests')
    .select('artist_id,card_id,printing_id,interest_status')
    .eq('owner_id', ownerId)
  if (error) throw error
  const next: Record<string, ArtistSigningInterestStatus> = {}
  for (const row of (data ?? []) as ArtistSigningInterestRow[]) {
    if (!row.printing_id) continue
    if (row.interest_status === 'maybe' || row.interest_status === 'want_signed') next[row.printing_id] = row.interest_status
  }
  return next
}

const artistSigningQaPicks: Array<{ artistName: string; cardNames: string[]; status: ArtistSigningInterestStatus }> = [
  { artistName: 'Serena Malyon', cardNames: ['Soul Immolation', 'Beyond the Quiet'], status: 'want_signed' },
  { artistName: 'Rebecca Guay', cardNames: ['Abundance', 'Seedtime'], status: 'maybe' },
  { artistName: 'Cynthia Sheppard', cardNames: ['Akroma, Angel of Wrath'], status: 'maybe' },
  { artistName: 'Mark Poole', cardNames: ['Counterspell'], status: 'maybe' },
]

function buildPreviewSigningInterest(cards: ArtistCardCandidate[]): Record<string, ArtistSigningInterestStatus> {
  const next: Record<string, ArtistSigningInterestStatus> = {}
  for (const pick of artistSigningQaPicks) {
    const artistCards = cards.filter(card => normalizeArtistName(card.artistName) === normalizeArtistName(pick.artistName))
    if (!artistCards.length) continue
    const exactCards = pick.cardNames
      .map(name => artistCards.find(card => card.cardName.toLowerCase() === name.toLowerCase()))
      .filter((card): card is ArtistCardCandidate => Boolean(card))
    const seededCards = exactCards.length ? exactCards : artistCards.slice(0, 2)
    for (const card of seededCards.slice(0, 2)) {
      next[card.printingId ?? card.id] = pick.status
    }
  }
  return next
}

async function loadAllSupabaseRows<T>(table: string, select = '*', pageSize = 1000): Promise<T[]> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const result = await supabase.from(table).select(select).range(from, to)
    if (result.error) throw result.error
    rows.push(...((result.data ?? []) as T[]))
    if (!result.data || result.data.length < pageSize) break
  }
  return rows
}

function catalogArtistToSeed(artist: ArtistCatalogRow, appearance?: ArtistAppearanceCatalogRow): ArtistSeed {
  const confirmed = appearance?.attending_status === 'confirmed'
  const unconfirmed = appearance?.attending_status === 'unconfirmed'
  const title = artist.display_name || artist.canonical_name
  const fallbackSeed = fallbackArtistSeedByName.get(normalizeArtistName(title))
  const attendance = appearance?.appearance_days || (confirmed ? 'All days' : 'Unconfirmed')
  const status = confirmed
    ? 'Official Atlanta Art of Magic guest'
    : unconfirmed
      ? 'Likely artist watchlist seed'
      : 'Artist catalog entry'
  const signal = confirmed ? 'Confirmed artist' : 'Watch for Atlanta'
  const summary = appearance?.priority_reason
    || artist.style_description
    || `${title} is in the canonical signing catalog${confirmed ? ' and is currently listed for MagicCon: Atlanta.' : '.'}`
  const thumbnailUrl = fallbackSeed?.thumbnailUrl || artist.profile_image_url || undefined
  const thumbnailCaption = fallbackSeed?.thumbnailUrl
    ? fallbackSeed.thumbnailCaption
    : artist.profile_image_url
      ? confirmed ? 'Official MagicCon guest photo' : 'Planning image; Atlanta attendance remains unconfirmed.'
      : confirmed ? 'Official MagicCon guest photo' : 'Planning image; Atlanta attendance remains unconfirmed.'

  return {
    id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    title,
    status,
    signal,
    summary,
    attendance,
    bioUrl: appearance?.official_profile_url ?? fallbackSeed?.bioUrl ?? undefined,
    thumbnailUrl,
    thumbnailAlt: fallbackSeed?.thumbnailAlt ?? `${title} artist portrait`,
    thumbnailCaption,
    facts: [
      { label: 'Guest type', value: confirmed ? 'Art of Magic' : 'Artist watchlist' },
      { label: 'Appearing', value: attendance },
      { label: 'Source', value: appearance?.source_note ?? 'Canonical artist catalog' },
      { label: 'Style', value: artist.predominant_style ?? 'Style pending' },
    ],
    signatureTargets: [
      { name: 'Card matches', note: artist.sample_mtg_cards || 'Use the Cards view to review owned candidates.' },
    ],
  }
}

function mapCatalogCardsToCandidates(
  printings: ArtistPrintingCatalogRow[],
  cards: ArtistCardCatalogRow[],
  artists: ArtistCatalogRow[],
  assessments: ArtistAssessmentCatalogRow[],
): ArtistCardCandidate[] {
  const cardsById = new Map(cards.map(card => [card.id, card]))
  const artistsById = new Map(artists.map(artist => [artist.id, artist]))
  const assessmentsByPrinting = new Map(assessments.map(assessment => [assessment.printing_id, assessment]))
  const assessmentScore = (assessment: ArtistAssessmentCatalogRow | undefined) => {
    if (!assessment) return 0
    return (assessment.card_art_description ? 6 : 0)
      + (assessment.visual_assessment_notes ? 4 : 0)
      + (assessment.card_art_category ? 3 : 0)
      + (assessment.visual_art_category ? 2 : 0)
      + (assessment.review_rank ? Math.max(0, 6 - assessment.review_rank) : 0)
  }
  const assessmentsByCard = new Map<string, ArtistAssessmentCatalogRow>()
  assessments.forEach(assessment => {
    const printing = printings.find(candidate => candidate.id === assessment.printing_id)
    if (!printing) return
    const existing = assessmentsByCard.get(printing.card_id)
    if (!existing || assessmentScore(assessment) > assessmentScore(existing)) {
      assessmentsByCard.set(printing.card_id, assessment)
    }
  })
  const seenCardIds = new Set<string>()
  const priceValue = (printing: ArtistPrintingCatalogRow) => {
    const market = typeof printing.market_price_usd === 'number'
      ? printing.market_price_usd
      : Number.parseFloat(String(printing.market_price_usd ?? ''))
    return Number.isFinite(market) ? market : -1
  }
  const orderedPrintings = [...printings].sort((a, b) => priceValue(b) - priceValue(a))

  return orderedPrintings.flatMap(printing => {
    const card = cardsById.get(printing.card_id)
    if (!card || seenCardIds.has(card.id)) return []
    seenCardIds.add(card.id)
    const artist = artistsById.get(card.artist_id)
    const assessment = assessmentsByPrinting.get(printing.id) ?? assessmentsByCard.get(card.id)
    const artistName = artist?.display_name || artist?.canonical_name || 'Unknown artist'
    const market = typeof printing.market_price_usd === 'number'
      ? printing.market_price_usd
      : Number.parseFloat(String(printing.market_price_usd ?? ''))
    const specialTreatment = (printing.special_treatments ?? []).filter(Boolean).join('; ')
    const visualStyle = assessment?.card_art_category
      || assessment?.visual_art_category
      || artist?.predominant_style
      || 'Style pending'
    const abstractSurrealFocus = assessment?.surreal_abstract_focus
      || artist?.abstract_surreal_tendency
      || 'Unknown'
    const styleNotes = assessment?.card_art_description
      || assessment?.visual_assessment_notes
      || artist?.style_description
      || 'Assessment pending.'
    const tasteMatch = assessment?.visual_match_for_taste
      || (assessment?.review_rank && assessment.review_rank <= 2 ? 'Strong candidate' : 'Review')

    return [{
      id: printing.id,
      artistId: card.artist_id,
      cardId: card.id,
      printingId: printing.id,
      cardName: card.card_name,
      artistName,
      setCode: printing.set_code ?? '',
      setName: printing.set_name ?? '',
      collectorNumber: printing.collector_number ?? '',
      foil: printing.foil ?? 'normal',
      rarity: printing.rarity ?? '',
      quantity: printing.quantity ?? 1,
      marketPrice: Number.isFinite(market) ? `$${market.toFixed(2)}` : 'Price unknown',
      priceAsOf: printing.price_as_of ?? 'Canonical catalog',
      printingType: printing.printing_type ?? 'Unknown',
      specialTreatment: specialTreatment || undefined,
      visualStyle,
      abstractSurrealFocus,
      tasteMatch,
      taxonomyConfidence: assessment?.card_art_confidence || assessment?.visual_confidence || 'Unknown',
      reviewForTaste: assessment?.review_rank && assessment.review_rank <= 3 ? 'Yes' : 'No',
      styleNotes,
      styleTags: assessment?.card_art_tags?.filter(Boolean) ?? [],
      artCropUrl: card.art_crop_url || card.card_image_url || '',
      cardImageUrl: card.card_image_url || card.art_crop_url || '',
      scryfallUrl: card.scryfall_url || scryfallArtistSearchUrl(artistName),
    }]
  })
}

let artistCatalogRequest: Promise<{ artists: ArtistSeed[]; cards: ArtistCardCandidate[] }> | null = null

async function loadArtistCatalogFromSupabase(): Promise<{ artists: ArtistSeed[]; cards: ArtistCardCandidate[] }> {
  if (artistCatalogRequest) return artistCatalogRequest
  artistCatalogRequest = Promise.all([
    loadAllSupabaseRows<ArtistCatalogRow>('artists'),
    loadAllSupabaseRows<ArtistAppearanceCatalogRow>('artist_appearances'),
    loadAllSupabaseRows<ArtistCardCatalogRow>('artist_cards'),
    loadAllSupabaseRows<ArtistPrintingCatalogRow>('artist_card_printings'),
    loadAllSupabaseRows<ArtistAssessmentCatalogRow>('artist_card_assessments'),
  ]).then(([artists, appearances, cards, printings, assessments]) => {
  const appearancesByArtist = new Map(appearances.map(appearance => [appearance.artist_id, appearance]))
  const appearanceArtistIds = new Set(appearances.map(appearance => appearance.artist_id))
  const appearanceSeeds = artists
    .filter(artist => appearanceArtistIds.has(artist.id))
    .sort((a, b) => {
      const aStatus = appearancesByArtist.get(a.id)?.attending_status === 'confirmed' ? 0 : 1
      const bStatus = appearancesByArtist.get(b.id)?.attending_status === 'confirmed' ? 0 : 1
      return aStatus - bStatus || a.display_name.localeCompare(b.display_name)
    })
    .map(artist => catalogArtistToSeed(artist, appearancesByArtist.get(artist.id)))
  const scopedCards = cards.filter(card => appearanceArtistIds.has(card.artist_id))
  const scopedCardIds = new Set(scopedCards.map(card => card.id))
  const scopedPrintings = printings.filter(printing => scopedCardIds.has(printing.card_id))
  const scopedPrintingIds = new Set(scopedPrintings.map(printing => printing.id))
  const scopedAssessments = assessments.filter(assessment => scopedPrintingIds.has(assessment.printing_id))

    return {
      artists: appearanceSeeds.length ? appearanceSeeds : artistSeeds,
      cards: appearanceArtistIds.size
        ? mapCatalogCardsToCandidates(scopedPrintings, scopedCards, artists, scopedAssessments)
        : mapCatalogCardsToCandidates(printings, cards, artists, assessments),
    }
  }).catch(error => {
    artistCatalogRequest = null
    throw error
  })
  return artistCatalogRequest
}

function artistSeedToObjectDetail(seed: ArtistSeed): ObjectDetail {
  const scryfallUrl = scryfallArtistSearchUrl(seed.title)
  return {
    id: `artist-${seed.id}`,
    kind: 'artist',
    eyebrow: seed.signal,
    title: seed.title,
    summary: seed.summary,
    image: seed.thumbnailUrl ? { src: seed.thumbnailUrl, alt: seed.thumbnailAlt ?? seed.title, caption: seed.thumbnailCaption } : undefined,
    facts: seed.facts,
    source: { label: 'Source status', value: seed.bioUrl ? `${seed.status}: ${seed.bioUrl}\nScryfall: ${scryfallUrl}` : `${seed.status}\nScryfall: ${scryfallUrl}` },
    rationale: 'This keeps artist planning tied to official Atlanta facts, then leaves room for your curated card database to decide what is worth carrying for signatures.',
    note: seed.signatureTargets?.map(target => `${target.name}: ${target.note}`).join('\n'),
    actions: [{ label: 'Open Artists', destination: 'artists' }, { label: 'Review source signals', destination: 'activity' }],
    backlinks: [{ label: 'Artists', destination: 'artists' }, { label: 'Activity', destination: 'activity' }],
  }
}

function InfoReaderContent({ detail }: { detail: NonNullable<ObjectDetail['reader']> }) {
  return <div className="info-reader-content">
    {detail.sections.map(section => <section key={section.key} className="info-reader-section">
      <h3>{section.title}</h3>
      {section.summary && <p>{section.summary}</p>}
      {section.facts?.length ? <dl className="info-reader-facts">{section.facts.map(fact => <div key={`${section.key}-${fact.label}-${fact.value}`}><dt>{fact.label}</dt><dd><strong>{fact.value}</strong>{fact.qualifier && <small>{fact.qualifier}</small>}</dd></div>)}</dl> : null}
      {section.bullets?.length ? <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul> : null}
    </section>)}
    {detail.unknowns.length > 0 && <section className="info-reader-section info-reader-unknowns"><h3>What is still unknown</h3><ul>{detail.unknowns.map(item => <li key={item}>{item}</li>)}</ul></section>}
    {detail.contradictions.length > 0 && <section className="info-reader-section info-reader-unknowns"><h3>What does not line up yet</h3><ul>{detail.contradictions.map(item => <li key={item.summary}>{item.summary}</li>)}</ul></section>}
    {detail.recentChanges.length > 0 && <section className="info-reader-section info-reader-changes"><h3>Latest meaningful change</h3>{detail.recentChanges.map(change => <article key={`${change.title}-${change.publishedAt}`}><div><strong>{change.title}</strong><time>{new Date(change.publishedAt).toLocaleDateString()}</time></div><p>{change.summary}</p></article>)}</section>}
  </div>
}

function InfoReaderEvidence({ sources }: { sources: InfoSource[] }) {
  if (!sources.length) return null
  return <section className="info-reader-evidence"><h3>Official evidence</h3>{sources.map(source => <article key={source.key ?? source.label}>
    <div><strong>{source.label}</strong>{source.publisher && <span>{source.publisher}</span>}</div>
    {(source.publishedAt || source.retrievedAt || source.detail) && <small>{source.publishedAt ? `Published ${new Date(source.publishedAt).toLocaleDateString()}` : source.retrievedAt ? `Retrieved ${new Date(source.retrievedAt).toLocaleDateString()}` : source.detail}</small>}
    {source.url && <a href={source.url} target="_blank" rel="noreferrer">View original source <span aria-hidden="true">↗</span></a>}
  </article>)}</section>
}

function ObjectDetailLayer({ detail, notes, currentOwnerId, catalogOwnerId, catalogReadModel, canEditCatalogInterest, catalogInterestSavingOfferId, onToggleCatalogInterest, onAddNote, onDeleteNote, onClose, onNavigate, onOpenObject }: { detail: ObjectDetail | null; notes: ContextNote[]; currentOwnerId?: string; catalogOwnerId?: string; catalogReadModel: CatalogReadModel; canEditCatalogInterest: boolean; catalogInterestSavingOfferId: string | null; onToggleCatalogInterest: (offer: CatalogOffer, interested: boolean) => void; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; onClose: () => void; onNavigate: (destination: Surface) => void; onOpenObject: (detail: ObjectDetail) => void }) {
  useEffect(() => {
    if (!detail) return
    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousRootOverflow
    }
  }, [detail])
  if (!detail) return null
  const catalogOffer = detail.catalogOfferId ? catalogReadModel.offers.find(offer => offer.offer_id === detail.catalogOfferId) : undefined
  const catalogInterest = catalogOffer?.interests.find(interest => interest.ownerId === catalogOwnerId)?.interested === true
  const catalogInterestSaving = catalogOffer?.offer_id === catalogInterestSavingOfferId
  const soldOutListSpansDays = new Set(detail.soldOutEvents?.map(event => event.day)).size > 1
  return <div className={`object-detail-backdrop ${detail.reader ? 'info-reader-backdrop' : ''}`} onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <aside className={`object-detail object-detail-${detail.kind} ${detail.reader ? 'object-detail-reader' : ''}`} role="dialog" aria-modal="true" aria-labelledby="object-detail-title">
      <button className={`detail-close persistent-detail-close ${detail.reader ? 'reader-close-sticky' : 'object-detail-close'}`} type="button" onClick={onClose} aria-label={detail.reader ? 'Close article' : 'Close detail'}>×</button>
      <header className="object-detail-head">
        <div className="object-detail-topline">
          <span className="eyebrow">{detail.eyebrow}</span>
          <span className="object-detail-top-actions">
            {detail.people?.length ? <PersonBubbles people={detail.people} /> : null}
            {catalogOffer && catalogOwnerId ? <button type="button" className={`object-detail-interest${catalogInterest ? ' active' : ''}`} aria-label={catalogInterestSaving ? 'Saving shopping list' : catalogInterest ? 'Remove from shopping list' : 'Save to shopping list'} aria-pressed={catalogInterest} disabled={!canEditCatalogInterest || catalogInterestSaving} onClick={() => onToggleCatalogInterest(catalogOffer, !catalogInterest)}><ActionIcon name="bookmark" /></button> : null}
            <span className="object-kind-chip">{detail.kindLabel ?? detailKindLabel(detail.kind)}</span>
          </span>
        </div>
        <h2 id="object-detail-title">{detail.title}</h2>
        <p>{detail.summary}</p>
      </header>
      {detail.reader ? <InfoReaderContent detail={detail.reader} /> : <>{detail.image && <section className="object-detail-section object-detail-image-section">
        <div className={`object-detail-image-card${detail.image.tone === 'product' ? ' product-image-card' : ''}`}>
          <img src={detail.image.src} alt={detail.image.alt} loading="lazy" />
          {detail.image.caption && <span>{detail.image.caption}</span>}
        </div>
      </section>}
      {detail.facts && <section className="object-detail-section">
        <h3>Key facts</h3>
        <div className="object-fact-grid">{detail.facts.map(fact => {
          const value = fact.label === 'Your list' && catalogOffer ? (catalogInterest ? 'Saved' : 'Not saved') : fact.value
          return fact.detail
            ? <button key={`${fact.label}-${fact.value}`} type="button" className="object-fact object-fact-link" onClick={() => onOpenObject(fact.detail!)}><span>{fact.label}</span><strong>{value}</strong><b aria-hidden="true">›</b></button>
            : <div key={`${fact.label}-${fact.value}`} className="object-fact"><span>{fact.label}</span><strong>{value}</strong></div>
        })}</div>
      </section>}
      {detail.soldOutEvents?.length ? <section className="object-detail-section sold-out-events-section">
        <h3>Sold-out events</h3>
        <ol className="sold-out-event-list">
          {detail.soldOutEvents.map(event => <li key={event.sourceEventKey || event.eventId || `${event.day}-${event.startsAt}-${event.title}`} className="sold-out-event-row">
            <time dateTime={`${event.day}T${event.startsAt}`}>{formatTicketedTime(event.startsAt)}</time>
            <div><strong>{event.title}</strong>{soldOutListSpansDays && <small>{formatTicketedDay(event.day, true)}</small>}</div>
            {event.people.length > 0 && <PersonBubbles people={event.people as PersonName[]} />}
          </li>)}
        </ol>
      </section> : null}
      {detail.rationale && <section className="object-detail-section">
        <h3>{detail.rationaleLabel ?? 'Why it matters'}</h3>
        <p>{renderLinkedText(detail.rationale)}</p>
      </section>}
      {detail.links && detail.links.length > 0 && <section className="object-detail-section">
        <h3>Official resources</h3>
        <nav className="object-resource-links" aria-label="Official resources">
          {detail.links.map(link => <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">{link.label}<span aria-hidden="true"> ↗</span></a>)}
        </nav>
      </section>}
      {detail.note && <section className="object-detail-section object-note-section">
        <h3>{detail.noteLabel ?? 'Note / next action'}</h3>
        <p>{renderLinkedText(detail.note)}</p>
      </section>}
      {detail.source && <section className="object-detail-section">
        <h3>Source / provenance</h3>
        <p><strong>{detail.source.label}</strong><br />{renderLinkedText(detail.source.value)}</p>
      </section>}</>}
      {!isSyntheticNoteGroupId(detail.id) && <ObjectNotes
        notes={notes}
        currentOwnerId={currentOwnerId}
        onAddNote={onAddNote}
        onDeleteNote={onDeleteNote}
        objectId={detail.id}
        objectKind={detail.kind}
        objectTitle={detail.title}
        objectAnchor={detail.objectAnchor}
        focusedNoteId={detail.focusedNoteId}
        context={`${detail.kindLabel ?? detailKindLabel(detail.kind)} · ${detail.title}`}
        backlink={detail.backlinks?.[0]?.destination ?? 'notes'}
        compact
      />}
      {detail.reader && <InfoReaderEvidence sources={detail.reader.sources} />}
      {detail.kind !== 'artist' && (detail.actions || detail.backlinks) && <footer className="object-detail-actions">
        {detail.actions?.map(action => <button key={action.label} type="button" onClick={() => action.destination ? onNavigate(action.destination) : undefined}>{action.label}</button>)}
        {detail.backlinks?.map(link => <button key={link.label} type="button" className="secondary" onClick={() => onNavigate(link.destination)}>{link.label}</button>)}
      </footer>}
    </aside>
  </div>
}

function detailKindLabel(kind: ObjectDetailKind) {
  const labels: Record<ObjectDetailKind, string> = {
    event: 'Event',
    alert: 'Signal',
    receipt: 'Proof',
    place: 'Place',
    hotel: 'Place',
    artist: 'Artist',
    note: 'Note',
  }
  return labels[kind]
}
type CalendarFilter = 'all' | 'convention' | 'travel'
type ExploreType = 'all' | 'play' | 'info' | 'social' | 'other'
type ExploreState = 'none' | 'interested' | 'tentative' | 'committed' | 'hidden' | 'nope'
type ComplexityLevel = 'easy' | 'focused' | 'demanding' | 'very-hard' | 'unknown' | 'inconclusive'
type ActionIconName = 'bookmark' | 'diamond' | 'lock' | 'unlock' | 'check' | 'ticket' | 'eyeOff' | 'sign' | 'heart'
type EventKindIconName = 'lotus' | 'panel' | 'competitive' | 'ticketed' | 'play' | 'info' | 'social'
type MilestoneIconName = 'badges' | 'ticketed-play' | 'artists' | 'black-lotus-store' | 'show-catalog'
type WalletTab = 'home' | 'play' | 'store' | 'other'
type AlertKind = 'site' | 'email' | 'newsletter' | 'manual'
type AlertSeverity = 'hot' | 'notice' | 'quiet'
type AlertReviewState = 'needs-review' | 'reviewed' | 'archived'
type ActivityStream = 'hot' | 'events' | 'changes' | 'sources' | 'personal' | 'archived' | 'all'
type ActivitySourceKind = 'monitor' | 'selection' | 'activity-log' | 'note'
type ObjectDetailKind = 'event' | 'alert' | 'receipt' | 'place' | 'hotel' | 'artist' | 'note'
type NotePersonFilter = 'all' | PersonName
type NoteTypeFilter = 'all' | 'wallet' | 'trip' | 'events' | 'other'
type ObjectDetail = {
  id: string
  kind: ObjectDetailKind
  kindLabel?: string
  eyebrow: string
  title: string
  summary: string
  reader?: {
    sections: Array<{ key: string; title: string; summary?: string; facts?: Array<{ label: string; value: string; qualifier?: string }>; bullets?: string[] }>
    unknowns: string[]
    contradictions: Array<{ summary: string; sourceKeys: string[] }>
    recentChanges: Array<{ title: string; summary: string; publishedAt: string }>
    sources: InfoSource[]
  }
  image?: { src: string; alt: string; caption?: string; tone?: 'product' }
  people?: PersonName[]
  focusedNoteId?: string
  objectAnchor?: string
  facts?: Array<{ label: string; value: string; detail?: ObjectDetail }>
  soldOutEvents?: HomeSoldOutEvent[]
  source?: { label: string; value: string }
  links?: MonitoringOfficialResource[]
  rationale?: string
  rationaleLabel?: string
  actions?: Array<{ label: string; destination?: Surface }>
  note?: string
  noteLabel?: string
  backlinks?: Array<{ label: string; destination: Surface }>
  catalogOfferId?: string
}
type NoteVisibility = 'private' | 'shared'
type AddContextNoteInput = {
  objectId: string
  objectKind: ObjectDetailKind
  objectTitle: string
  objectAnchor?: string
  context: string
  title?: string
  body: string
  author?: PersonName
  visibility: NoteVisibility
  backlink: Surface
}
type MonitoringAlert = {
  id: string
  kind: AlertKind
  severity: AlertSeverity
  destination: 'Home' | 'Activity' | 'Inbox' | 'Wallet' | 'Trip' | 'Explore' | 'Calendar' | 'Map' | 'Artists' | 'Notes'
  attention: string
  title: string
  summary: string
  object: string
  source: string
  checkedAt: string
  status: string
  rationale: string
  nextAction: string
  conceptKey?: string
}

type ActivityItem = {
  id: string
  sourceKind: ActivitySourceKind
  kind: AlertKind
  severity: AlertSeverity
  destination: MonitoringAlert['destination']
  attention: string
  title: string
  summary: string
  object: string
  source: string
  checkedAt: string
  checkedAtIso: string
  status: string
  rationale: string
  nextAction: string
  reviewState: AlertReviewState
  objectDetail: ObjectDetail
  actor?: PersonName
  actors?: PersonName[]
  monitoringFinding?: MonitoringFindingRow
  monitoringConcept?: MonitoringConceptRow
  officialResources?: MonitoringOfficialResource[]
  conceptKey?: string
}

function personNameFromLabel(label: string): PersonName | undefined {
  return (['Kavi', 'Chris', 'Juan', 'Kyle'] as PersonName[]).find(person => person.toLowerCase() === label.trim().toLowerCase())
}

function defaultAlertReviewState(alert: MonitoringAlert): AlertReviewState {
  return alert.severity === 'quiet' ? 'reviewed' : 'needs-review'
}

function contextNotesToActivity(notes: ContextNote[], selections: Record<string, string>): ActivityItem[] {
  const clusters = groupNotesByObject(notes)
  return clusters.map(cluster => {
    const latest = cluster.notes[0]
    const reviewSelection = selections[selectionKey(`activity-note-${cluster.id}`, 'review_state')]
    const recent = Date.now() - new Date(latest.updatedAtIso).getTime() <= 72 * 60 * 60 * 1000
    const reviewState: AlertReviewState = ['needs-review', 'reviewed', 'archived'].includes(reviewSelection)
      ? reviewSelection as AlertReviewState
      : recent ? 'needs-review' : 'reviewed'
    const multi = cluster.notes.length > 1
    const authors = [...new Set(cluster.notes.map(note => note.author))]
    const notePreview = cluster.notes.slice(0, 2).map(note => `${note.author}: ${note.body}`).join(' · ')
    const remainingNoteCount = cluster.notes.length - 2
    const sourceDetail = noteSourceObjectDetail(latest)
    return {
      id: `note-${cluster.id}`,
      actor: latest.author,
      actors: authors,
      sourceKind: 'note' as const,
      kind: 'manual' as const,
      severity: 'notice' as const,
      destination: 'Home' as const,
      attention: multi ? 'Notes added' : latest.visibility === 'shared' ? 'Shared note' : 'New note',
      title: multi ? `${cluster.notes.length} notes on ${latest.objectTitle}` : `${latest.author}: ${latest.body}`,
      summary: multi ? `${notePreview}${remainingNoteCount > 0 ? ` · +${remainingNoteCount} more` : ''}` : `${latest.objectTitle} · ${latest.context}`,
      object: latest.objectTitle,
      source: `${latest.author} note`,
      checkedAt: latest.updatedAt,
      checkedAtIso: latest.updatedAtIso,
      status: latest.visibility,
      rationale: multi ? 'Notes about the same item are grouped into one conversation so Home stays compact.' : 'A recent contextual note is useful collaboration context without being a Hot interruption.',
      nextAction: 'Open the attached object for the full note and context.',
      reviewState,
      objectDetail: multi ? {
        id: `note-group-${cluster.id}`,
        kind: 'note',
        eyebrow: 'GROUPED NOTES',
        title: `${cluster.notes.length} notes on ${latest.objectTitle}`,
        summary: `Conversation with ${authors.join(', ')}. Open an individual note for its exact source context.`,
        facts: cluster.notes.map(note => ({
          label: noteGroupFactLabel(note),
          value: note.body,
          detail: noteSourceObjectDetail(note),
        })),
        rationale: 'These notes concern the same item, so Home keeps the conversation together.',
        backlinks: [{ label: 'Notes', destination: 'notes' as const }, ...(sourceDetail.backlinks ?? [])],
      } : sourceDetail,
    }
  })
}

function homeWorthKnowingItems(items: ActivityItem[], now = Date.now(), currentPerson: PersonName = 'Kavi') {
  const eligibleItems = items
    .filter(item => item.reviewState === 'needs-review')
    .filter(item => {
      if (item.monitoringFinding?.destination === 'Inbox') return false
      if (item.sourceKind === 'activity-log' && item.objectDetail.id === 'wallet-prize-tix') return false
      if (item.severity !== 'hot' && item.destination !== 'Home' && item.sourceKind !== 'note') return false
      const checkedAt = new Date(item.checkedAtIso).getTime()
      if (!Number.isFinite(checkedAt)) return true
      return homeSignalAgeBucket(item.checkedAtIso, now) !== null
    })
  const seenSelectionActors = new Set<string>()
  const collapsedItems = [...eligibleItems]
    .sort((a, b) => new Date(b.checkedAtIso).getTime() - new Date(a.checkedAtIso).getTime())
    .filter(item => {
      if (!item.source.endsWith('selection burst')) return true
      const actorKey = item.actor ?? item.source
      if (seenSelectionActors.has(actorKey)) return false
      seenSelectionActors.add(actorKey)
      return true
    })
  return collapsedItems
    .sort((a, b) => {
      const severityScore = (b.severity === 'hot' ? 2 : 0) - (a.severity === 'hot' ? 2 : 0)
      if (severityScore) return severityScore
      const companionScore = (b.actor !== currentPerson ? 1 : 0) - (a.actor !== currentPerson ? 1 : 0)
      if (companionScore) return companionScore
      const noteScore = (b.sourceKind === 'note' ? 1 : 0) - (a.sourceKind === 'note' ? 1 : 0)
      if (noteScore) return noteScore
      return new Date(b.checkedAtIso).getTime() - new Date(a.checkedAtIso).getTime()
    })
}

function isBeforeToday(iso: string, now = new Date()) {
  const checkedAt = new Date(iso).getTime()
  if (!Number.isFinite(checkedAt)) return false
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  return checkedAt < startOfToday.getTime()
}

function isEventActivityItem(item: ActivityItem) {
  return item.objectDetail.kind === 'event'
    || item.destination === 'Explore'
    || item.destination === 'Calendar'
    || item.source.toLowerCase().includes('selection')
    || item.object.toLowerCase().includes('event')
}

function shouldShowActivityItem(item: ActivityItem) {
  if (item.sourceKind === 'activity-log' && item.objectDetail.id === 'wallet-prize-tix') return false
  const selectionActivity = item.sourceKind === 'selection'
    || (item.sourceKind === 'activity-log' && item.source.toLowerCase().includes('selection'))
  if (selectionActivity && isBeforeToday(item.checkedAtIso)) return false
  return true
}

function isChangeLikeAlert(alert: MonitoringAlert) {
  const haystack = `${alert.title} ${alert.summary} ${alert.attention} ${alert.status} ${alert.nextAction}`.toLowerCase()
  return alert.severity === 'hot'
    || haystack.includes('change')
    || haystack.includes('changed')
    || haystack.includes('appears')
    || haystack.includes('unlocks')
    || haystack.includes('goes live')
}

function selectionStateToSeverity(state: ExploreState): AlertSeverity {
  if (state === 'committed') return 'hot'
  if (state === 'interested' || state === 'tentative') return 'notice'
  return 'quiet'
}

function selectionStateAttention(state: ExploreState) {
  if (state === 'committed') return 'Hard block'
  if (state === 'tentative') return 'Tentative'
  if (state === 'interested') return 'Interested'
  if (state === 'hidden') return 'Hidden'
  if (state === 'nope') return 'Not for me'
  return 'Selection'
}

function selectionStateSummary(state: ExploreState, event: ExploreEvent) {
  if (state === 'committed') return `${event.title} is now treated as a real commitment.`
  if (state === 'tentative') return `${event.title} moved into the active contender set.`
  if (state === 'interested') return `${event.title} was marked worth watching.`
  if (state === 'hidden') return `${event.title} was hidden from the working list.`
  if (state === 'nope') return `${event.title} was emphatically dropped.`
  return `${event.title} changed.`
}

function selectionStateNextAction(state: ExploreState) {
  if (state === 'committed') return 'Keep this near the top until it is read or dismissed.'
  if (state === 'tentative') return 'Use Plan or Calendar to compare it against nearby contenders.'
  if (state === 'interested') return 'Useful for clustering, but it does not need to crowd Home unless more changes follow.'
  if (state === 'hidden') return 'Recover it from Hidden if it becomes relevant again.'
  if (state === 'nope') return 'Keep it out of the main flow unless someone explicitly reopens it.'
  return 'Review and decide whether it belongs in the active planning lane.'
}

function activityDetailJson(value: unknown) {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function clusterActivityEvents(rows: UserActivityEventRow[]) {
  type Cluster = {
    id: string
    activityType: string
    objectId: string
    objectKind: SelectionObjectKind
    actorLabel: string
    rows: UserActivityEventRow[]
  }
  const clusters: Cluster[] = []
  for (const row of rows) {
    const created = new Date(row.created_at).getTime()
    const existing = clusters[clusters.length - 1]
    if (existing) {
      const previous = existing.rows[existing.rows.length - 1]
      const previousCreated = new Date(previous.created_at).getTime()
      const withinBurst = Math.abs(created - previousCreated) <= 10 * 60 * 1000
      const withinSelectionSession = Math.abs(created - previousCreated) <= 3 * 60 * 60 * 1000
      const samePrizeTixBurst = row.activity_type === 'prize_tix_adjusted'
        && existing.activityType === 'prize_tix_adjusted'
        && row.object_id === existing.objectId
        && withinBurst
      const sameEventChoiceBurst = row.activity_type === 'event_state_changed'
        && existing.activityType === 'event_state_changed'
        && row.actor_label === existing.actorLabel
        && withinSelectionSession
      if (samePrizeTixBurst || sameEventChoiceBurst) {
        existing.rows.push(row)
        continue
      }
    }
    clusters.push({
      id: row.id,
      activityType: row.activity_type,
      objectId: row.object_id,
      objectKind: row.object_kind,
      actorLabel: row.actor_label,
      rows: [row],
    })
  }
  return clusters
}

function prizeTixActivityFromCluster(cluster: ReturnType<typeof clusterActivityEvents>[number], selections: Record<string, string>): ActivityItem | null {
  const rows = [...cluster.rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const deltas = rows.map(row => Number(activityDetailJson(row.details).delta ?? 0)).filter(delta => Number.isFinite(delta))
  const net = deltas.reduce((sum, delta) => sum + delta, 0)
  if (!net) return null
  const latest = rows[rows.length - 1]
  const currentBalance = Number(selections[selectionKey('wallet-prize-tix', 'balance')] ?? activityDetailJson(latest.details).next_balance ?? 0)
  const severity: AlertSeverity = 'notice'
  const reviewSelection = selections[selectionKey(`activity-${cluster.id}`, 'review_state')]
  const reviewState: AlertReviewState = ['needs-review', 'reviewed', 'archived'].includes(reviewSelection)
    ? reviewSelection as AlertReviewState
    : 'reviewed'
  const direction = net > 0 ? 'added' : 'spent'
  const amount = Math.abs(net).toLocaleString()
  return {
    id: cluster.id,
    actor: personNameFromLabel(cluster.actorLabel),
    sourceKind: 'activity-log',
    kind: 'manual',
    severity,
    destination: 'Wallet',
    attention: net > 0 ? 'Prize Tix added' : 'Prize Tix spent',
    title: `${cluster.actorLabel} ${direction} ${amount} Prize Tix.`,
    summary: `${rows.length > 1 ? `${rows.length} quick taps collapsed into ` : ''}${direction} ${amount}; balance now ${currentBalance.toLocaleString()}.`,
    object: 'Prize Tix',
    source: `${cluster.actorLabel} wallet change`,
    checkedAt: formatContextNoteTime(latest.created_at),
    checkedAtIso: latest.created_at,
    status: net > 0 ? 'added' : 'spent',
    rationale: 'Wallet balance stays canonical in Supabase; Activity summarizes burst changes instead of logging every tap.',
    nextAction: 'Keep this in Activity history for balance reconciliation.',
    reviewState,
    objectDetail: {
      id: 'wallet-prize-tix',
      kind: 'receipt',
      eyebrow: 'WALLET ACTIVITY',
      title: 'Prize Tix balance',
      summary: `${cluster.actorLabel} ${direction} ${amount} Prize Tix.`,
      facts: [
        { label: 'Net change', value: `${net > 0 ? '+' : '-'}${amount}` },
        { label: 'Current balance', value: currentBalance.toLocaleString() },
        { label: 'Burst size', value: `${rows.length} update${rows.length === 1 ? '' : 's'}` },
      ],
      rationale: 'Burst grouping keeps rapid counter taps from spamming Activity and Home.',
      backlinks: [{ label: 'Wallet', destination: 'wallet' }],
    },
  }
}

function eventSelectionActivityFromCluster(
  cluster: ReturnType<typeof clusterActivityEvents>[number],
  events: ExploreEvent[],
  selections: Record<string, string>,
  currentPerson: PersonName,
): ActivityItem | null {
  const rows = [...cluster.rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const latest = rows[0]
  const reviewSelection = selections[selectionKey(`activity-${cluster.id}`, 'review_state')]
  const latestRowsByEvent = new Map<string, UserActivityEventRow>()
  for (const row of rows) {
    const details = activityDetailJson(row.details)
    const eventId = String(details.event_id ?? row.object_id.replace(/^explore-/, ''))
    if (!latestRowsByEvent.has(eventId)) latestRowsByEvent.set(eventId, row)
  }
  const items = [...latestRowsByEvent.entries()].map(([eventId, row]) => {
    const details = activityDetailJson(row.details)
    const event = events.find(candidate => candidate.id === eventId)
    const state = String(details.state ?? 'none')
    return event && isExploreState(state) ? { event, state } : null
  }).filter((item): item is { event: ExploreEvent; state: ExploreState } => item !== null)
  if (!items.length) return null
  const committedCount = items.filter(item => item.state === 'committed').length
  const tentativeCount = items.filter(item => item.state === 'tentative').length
  const interestedCount = items.filter(item => item.state === 'interested').length
  const hiddenCount = items.filter(item => item.state === 'hidden').length
  const nopeCount = items.filter(item => item.state === 'nope').length
  const clearedCount = items.filter(item => item.state === 'none').length
  // A companion changing the shared contender set is inherently time-sensitive
  // planning context. Home already collapses these to the latest burst per user,
  // so every remaining event-pick summary should use the Hot treatment.
  const severity: AlertSeverity = 'hot'
  const isAnotherPerson = cluster.actorLabel.trim().toLowerCase() !== currentPerson.toLowerCase()
  const reviewState: AlertReviewState = ['needs-review', 'reviewed', 'archived'].includes(reviewSelection)
    ? reviewSelection as AlertReviewState
    : severity === 'hot' || isAnotherPerson
      ? 'needs-review'
      : 'reviewed'
  const parts = [
    interestedCount ? `${interestedCount} interested` : '',
    tentativeCount ? `${tentativeCount} tentative` : '',
    committedCount ? `${committedCount} committed` : '',
    hiddenCount ? `${hiddenCount} hidden` : '',
    nopeCount ? `${nopeCount} not-for-me` : '',
    clearedCount ? `${clearedCount} cleared` : '',
  ].filter(Boolean)
  const focusEvent = items[0].event
  const title = items.length === 1
    ? items[0].state === 'none'
      ? `${cluster.actorLabel} cleared their pick for ${focusEvent.title}.`
      : `${cluster.actorLabel} marked ${focusEvent.title} ${items[0].state}.`
    : `${cluster.actorLabel} updated ${items.length} event picks.`
  return {
    id: cluster.id,
    actor: personNameFromLabel(cluster.actorLabel),
    sourceKind: 'activity-log',
    kind: 'manual',
    severity,
    destination: 'Home',
    attention: committedCount > 0 ? 'Committed choice' : isAnotherPerson ? 'Companion picks changed' : 'Event picks changed',
    title,
    summary: items.length === 1
      ? selectionStateSummary(items[0].state, focusEvent)
      : parts.join(' · '),
    object: items.length === 1 ? focusEvent.title : `${items.length} event selections`,
    source: `${cluster.actorLabel} selection burst`,
    checkedAt: formatContextNoteTime(latest.created_at),
    checkedAtIso: latest.created_at,
    status: items.length === 1 ? items[0].state : 'grouped',
    rationale: items.length === 1 ? focusEvent.fit : 'Rapid event-pick updates are grouped by person, with only the newest state for each event retained.',
    nextAction: committedCount > 0
      ? 'Keep committed items hot until they are explicitly read or dismissed.'
      : 'Expand in Explore or Plan if the burst changed the contender set in a meaningful way.',
    reviewState,
    objectDetail: items.length === 1
      ? exploreEventToObjectDetail({ ...focusEvent, state: items[0].state })
      : {
          id: `activity-burst-${cluster.id}`,
          kind: 'event',
          eyebrow: 'SELECTION BURST',
          title: `${cluster.actorLabel} updated ${items.length} event picks`,
          summary: parts.join(' · '),
          facts: items.map(item => ({
            label: item.state,
            value: item.event.title,
            detail: exploreEventToObjectDetail({ ...item.event, state: item.state }),
          })),
          rationale: 'Grouped because several event-state changes landed in the same session; repeated changes to one event resolve to its newest state.',
          backlinks: [{ label: 'Explore', destination: 'explore' }, { label: 'Plan', destination: 'plan' }],
        },
  }
}

function activityFromEventCluster(
  cluster: ReturnType<typeof clusterActivityEvents>[number],
  events: ExploreEvent[],
  selections: Record<string, string>,
  currentPerson: PersonName,
): ActivityItem | null {
  if (cluster.activityType === 'prize_tix_adjusted') return prizeTixActivityFromCluster(cluster, selections)
  if (cluster.activityType === 'event_state_changed') return eventSelectionActivityFromCluster(cluster, events, selections, currentPerson)
  return null
}

function selectionActivityFromRow(
  row: UserSelectionRow,
  events: ExploreEvent[],
  selections: Record<string, string>,
  session: Session | null,
): ActivityItem | null {
  if (row.selection_key !== 'state' || !row.object_id.startsWith('explore-')) return null
  if (!isExploreState(row.selection_value) || row.selection_value === 'none') return null
  const eventId = row.object_id.replace(/^explore-/, '')
  const event = events.find(candidate => candidate.id === eventId)
  if (!event) return null
  const state = row.selection_value
  const reviewSelection = selections[selectionKey(`activity-selection-${eventId}`, 'review_state')]
  const severity = selectionStateToSeverity(state)
  const reviewState: AlertReviewState = ['needs-review', 'reviewed', 'archived'].includes(reviewSelection)
    ? reviewSelection as AlertReviewState
    : state === 'committed'
      ? 'needs-review'
      : 'reviewed'
  const author = noteAuthorFromSession(session)
  return {
    id: `selection-${eventId}`,
    actor: author,
    sourceKind: 'selection',
    kind: 'manual',
    severity,
    destination: state === 'committed' ? 'Home' : 'Activity',
    attention: selectionStateAttention(state),
    title: `${author} marked ${event.title} ${state}.`,
    summary: selectionStateSummary(state, event),
    object: event.title,
    source: `${author} selection`,
    checkedAt: formatContextNoteTime(row.updated_at),
    checkedAtIso: row.updated_at,
    status: state,
    rationale: event.fit,
    nextAction: selectionStateNextAction(state),
    reviewState,
    objectDetail: exploreEventToObjectDetail({ ...event, state }),
  }
}

function isMonitoringAlert(value: unknown): value is MonitoringAlert {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Record<keyof MonitoringAlert, unknown>>
  return typeof candidate.id === 'string'
    && ['site', 'email', 'newsletter', 'manual'].includes(String(candidate.kind))
    && ['hot', 'notice', 'quiet'].includes(String(candidate.severity))
    && ['Home', 'Activity', 'Wallet', 'Trip', 'Explore', 'Calendar', 'Map', 'Artists', 'Notes'].includes(String(candidate.destination))
    && typeof candidate.title === 'string'
    && typeof candidate.summary === 'string'
    && typeof candidate.source === 'string'
    && typeof candidate.checkedAt === 'string'
}
type ContextNote = {
  id: string
  ownerId?: string
  objectId: string
  objectKind: ObjectDetailKind
  objectTitle: string
  objectAnchor?: string
  context: string
  title: string
  body: string
  author: PersonName
  visibility: NoteVisibility
  updatedAt: string
  updatedAtIso: string
  backlink: Surface
}
type SelectionObjectKind = ObjectDetailKind | 'wallet' | 'trip' | 'map' | 'activity' | 'general'
type ExploreEvent = {
  id: string
  title: string
  day: 'Thu' | 'Fri' | 'Sat' | 'Sun'
  time: string
  window: string
  price: string
  kind: string
  type: ExploreType
  format: string
  tags: string[]
  state: ExploreState
  availability: 'open' | 'sold-out' | 'changed'
  complexity: ComplexityLevel
  complexityWhy: string
  fit: string
  detail: string
  officialUrl?: string
  formatHelp?: string
  decisionFacts?: Array<{ label: string; value: string; icon?: 'ticket' }>
  moreDetails?: Array<{ label: string; value: string }>
  sourceNote?: string
  planEffect: string
  purchased?: boolean
  purchaseLocked?: boolean
  companionCode?: string
}

const monitoringAlerts: MonitoringAlert[] = [
  {
    id: 'ticketed-play-watch',
    conceptKey: 'atlanta:ticketed-play:sales-opening',
    kind: 'newsletter',
    severity: 'hot',
    destination: 'Home',
    attention: 'Milestone signal',
    title: 'Ticketed Play schedule is published',
    summary: 'The official schedule page exists now. Purchasing opens August 25 at 10 AM PT, and event inventory hydration is the next watch.',
    object: 'Milestone · Ticketed play',
    source: 'MagicCon news + ticketed-play page',
    checkedAt: 'Aug 4, 8:28 AM',
    status: 'official schedule published',
    rationale: 'Publishing the Ticketed Play schedule page is the first planning-phase milestone; the next actionable milestone is purchasing opening on Aug 25.',
    nextAction: 'Watch Aug 25 for purchase availability and hydrate real ticketed-play inventory once event listings are available.',
  },
  {
    id: 'black-lotus-page-change',
    kind: 'site',
    severity: 'hot',
    destination: 'Home',
    attention: 'Watched-page change',
    title: 'Black Lotus page change lands as a high-signal item',
    summary: 'A change to the Black Lotus VIP page should preserve the new wording and link back to the affected BL object.',
    object: 'Black Lotus · VIP page',
    source: 'mcatlanta.mtgfestivals.com',
    checkedAt: 'Aug 4, 8:29 AM',
    status: 'route ready',
    rationale: 'Black Lotus details are scarce, personally relevant, and likely worth reviewing even if the change later proves minor.',
    nextAction: 'Show on Home until reviewed; keep both old and new observations in Activity and the object evidence drawer.',
  },
  {
    id: 'newsletter-watch',
    kind: 'newsletter',
    severity: 'notice',
    destination: 'Activity',
    attention: 'Source history',
    title: 'MagicCon news feed checked',
    summary: 'No Atlanta-specific artist, store, or ticketed-play post was detected in the readiness watch set.',
    object: 'News · MagicCon',
    source: 'MagicCon news',
    checkedAt: 'Aug 4, 8:02 AM',
    status: 'no actionable change',
    rationale: 'News will be rare, so the app should preserve the check while keeping Home calm.',
    nextAction: 'Keep in Activity; do not clutter the default surface.',
  },
  {
    id: 'receipt-import-route',
    kind: 'email',
    severity: 'quiet',
    destination: 'Wallet',
    attention: 'Proof captured',
    title: 'Email receipt import lands in Wallet',
    summary: 'MagicCon receipt artifacts should preserve the original and extract line items without becoming a Home alert.',
    object: 'Wallet · Receipts',
    source: 'Gmail · MagicCon / store receipt',
    checkedAt: 'Aug 4, 8:30 AM',
    status: 'route ready',
    rationale: 'Receipts are valuable because they are annoying to find onsite, but most are retrieval objects rather than news.',
    nextAction: 'Attach original image/PDF, extracted lines, assignments, and backlinks to Play, Store, Other, or Trip as appropriate.',
  },
  {
    id: 'delta-change-route',
    kind: 'email',
    severity: 'notice',
    destination: 'Trip',
    attention: 'Consequential only',
    title: 'Travel change stays under Trip unless it matters now',
    summary: 'A changed flight time should annotate the flight object and Calendar; only meaningful disruption reaches Home.',
    object: 'Trip · Flights · HOGFBX',
    source: 'Gmail · Delta',
    checkedAt: 'Aug 4, 8:31 AM',
    status: 'route ready',
    rationale: 'Trip should be a pleasant reference and change surface, not a booking-management system.',
    nextAction: 'If departure/arrival changes, update Trip and Calendar; escalate to Home only if it affects lodging, event arrival, or airport departure timing.',
  },
  {
    id: 'artist-list-route',
    kind: 'site',
    severity: 'hot',
    destination: 'Artists',
    attention: 'Artist roster live',
    title: '3 Art of Magic artists are confirmed',
    summary: 'Cynthia Sheppard, Mark Poole, and Serena Malyon are listed for Atlanta; Rebecca Guay is tracked separately as an unconfirmed watchlist seed.',
    object: 'Artists · Art of Magic',
    source: 'Official MagicCon Atlanta guests page',
    checkedAt: 'Aug 19, 2026, 7:10 PM',
    status: 'official roster started',
    rationale: 'The first confirmed Atlanta Art of Magic names are a real planning signal because they unlock signature/card matching and artist interest tracking.',
    nextAction: 'Open Artists, keep the confirmed three visible, and add curated card matches when the card list lands.',
  },
  {
    id: 'venue-map-route',
    kind: 'site',
    severity: 'notice',
    destination: 'Map',
    attention: 'Context unlock',
    title: 'Official map lands in Map, then backlinks outward',
    summary: 'Official 2026 floor artifacts should attach to Map and become useful through room, booth, vendor, Wallet, and event backlinks.',
    object: 'Map · Event map',
    source: 'MagicCon map page',
    checkedAt: 'Aug 4, 8:33 AM',
    status: 'future route',
    rationale: 'The map is valuable when it helps answer “where do I go next?” rather than simply reproducing a giant image.',
    nextAction: 'Keep first official map as a Home signal; put detailed extraction and OCR candidates in Map/Activity for review.',
  },
].filter(alert => alert.id === 'artist-list-route') as MonitoringAlert[]

const contextNotes: ContextNote[] = ([
  {
    id: 'luggage-thursday',
    objectId: 'hotel-omni',
    objectKind: 'hotel',
    objectTitle: 'Omni Atlanta Hotel at Centennial Park',
    context: 'Trip · Omni',
    title: 'Thursday luggage handoff',
    body: 'Kavi and Chris are at Black Lotus First Look before Omni check-in. Decide whether Juan can handle bags or whether we stash luggage first.',
    author: 'Kavi',
    visibility: 'shared',
    updatedAt: 'Aug 4',
    updatedAtIso: '2026-08-04T12:00:00-07:00',
    backlink: 'trip',
  },
  {
    id: 'wallet-store-assignment',
    objectId: 'wallet-store-receipt',
    objectKind: 'receipt',
    objectTitle: 'Store receipt assignments',
    objectAnchor: 'Line items',
    context: 'Wallet · Store receipt',
    title: 'Store receipt assignments',
    body: 'Use quick K/J/C chips for known people; custom names stay as plain text because they are not app people.',
    author: 'Kavi',
    visibility: 'private',
    updatedAt: 'Aug 4',
    updatedAtIso: '2026-08-04T12:00:00-07:00',
    backlink: 'wallet',
  },
  {
    id: 'bl-planechase',
    objectId: 'explore-bl-planechase',
    objectKind: 'event',
    objectTitle: 'Planechase Unknown',
    context: 'Plan · Black Lotus',
    title: 'Planechase reference',
    body: 'Likely to be something I check repeatedly before the event; keep this easy to find even before ticketed play appears.',
    author: 'Kavi',
    visibility: 'private',
    updatedAt: 'Aug 3',
    updatedAtIso: '2026-08-03T12:00:00-07:00',
    backlink: 'plan',
  },
] satisfies ContextNote[]).filter(() => false)

const milestoneForecasts: Array<{ id: ForecastId; icon: MilestoneIconName; title: string; window: string; calendarDate: string; month: 'AUG' | 'OCT'; confidence: string; rationale: string }> = [
  {
    id: 'ticketed-play', icon: 'ticketed-play', title: 'Ticketed play purchasing', window: 'Aug 25 · 10 AM PT', calendarDate: '25', month: 'AUG', confidence: 'official next',
    rationale: 'The Ticketed Play schedule page has been published. The next logical milestone is purchasing opening Aug 25 at 10:00 AM PT, followed by hydrating real event inventory once listings are available.',
  },
  {
    id: 'artists', icon: 'artists', title: 'Artist directory', window: 'Oct 9–16', calendarDate: '9–16', month: 'OCT', confidence: 'wide estimate',
    rationale: 'Recent MagicCon artist lineups have become planning-ready during the final several weeks before the show. Atlanta artist applications closed Aug 2, so an early-to-mid October directory is a reasonable but lower-confidence window.',
  },
  {
    id: 'black-lotus-store', icon: 'black-lotus-store', title: 'Black Lotus store', window: 'Oct 30–Nov 3', calendarDate: '30–3', month: 'OCT', confidence: 'two-event clue',
    rationale: 'The 2026 Black Lotus online store opened 10 days before Las Vegas and 14 days before Amsterdam. The same 10–14 day offset points to Oct 30–Nov 3 for Atlanta.',
  },
  {
    id: 'show-catalog', icon: 'show-catalog', title: 'Show catalog', window: 'Oct 29–Nov 6', calendarDate: '29–6', month: 'OCT', confidence: 'wide estimate',
    rationale: 'Vegas published its merch preview 15 days before opening, while Amsterdam’s full catalog was available by the final week. Atlanta is therefore more honestly shown as a late-October to early-November window.',
  },
]

const exploreEventCandidates: ExploreEvent[] = [
  {
    id: 'bl-progressive-sealed',
    title: 'BL Progressive Sealed League',
    day: 'Thu',
    time: '12 PM start',
    window: 'Weekend-long league',
    price: 'included',
    kind: 'Black Lotus',
    type: 'play',
    format: 'Progressive sealed league',
    tags: ['official atlanta', 'included', 'league', 'pickup'],
    state: 'tentative',
    availability: 'open',
    complexity: 'focused',
    complexityWhy: 'Sealed deckbuilding plus daily games creates some ongoing attention, but the league structure is flexible and included with Black Lotus.',
    fit: 'Real Atlanta Black Lotus anchor: product pickup and daily league play are exactly the kind of included benefit worth keeping visible.',
    detail: 'Pick up 4 Reality Fracture play boosters starting Thursday, build a 40-card deck, play at least 2 games each day Friday through Sunday, and earn additional Collector Boosters through Sunday.',
    formatHelp: 'A progressive sealed league starts with a small sealed pool and adds product over time. Here, daily play unlocks extra Reality Fracture Collector Boosters.',
    decisionFacts: [
      { label: 'Access', value: 'Black Lotus included' },
      { label: 'Starts', value: 'Thu 12 PM pickup/play' },
      { label: 'Daily ask', value: '2 games Fri-Sun' },
      { label: 'Final claim', value: 'Sun 5 PM' },
    ],
    moreDetails: [
      { label: 'Reward path', value: 'Playing 6 games by Sunday earns three total Collector Boosters. Final booster-prize claim is Sunday at 5:00 PM.' },
      { label: 'Location', value: 'Event locations will be announced closer to the event.' },
    ],
    sourceNote: 'Official Atlanta Black Lotus VIP page, retrieved Aug 8, 2026. Schedule subject to change.',
    planEffect: 'Keep as an included weekend thread, not a hard fixed block except for pickup and final claim timing.',
  },
  {
    id: 'bl-first-look-thursday',
    title: 'BL First Look Thursday',
    day: 'Thu',
    time: '1-8 PM',
    window: 'Program block',
    price: 'included',
    kind: 'Black Lotus',
    type: 'info',
    format: 'First Look / panels',
    tags: ['official atlanta', 'included', 'first look', 'tbd'],
    state: 'interested',
    availability: 'changed',
    complexity: 'easy',
    complexityWhy: 'Mostly informational/social programming; several content slots are explicitly TBD, so the effort is attention rather than rules complexity.',
    fit: 'High relevance because this is the whole reason Thursday exists for Black Lotus, but several schedule slots are still TBD.',
    detail: 'Behind the Card Frame & First Look runs 1:00-8:00 PM, with TBD content slots at 2:00, 3:00, and 5:30, a Planechase-card design session at 4:15, and Paint & Sip at 6:30.',
    decisionFacts: [
      { label: 'Known block', value: '1:00-8:00 PM' },
      { label: 'TBD slots', value: '2:00, 3:00, 5:30' },
      { label: 'Known activity', value: 'Design Unknown Planechase Card' },
    ],
    moreDetails: [
      { label: 'Lounge opens', value: '12:00 PM Welcome to MagicCon First Look Thursday.' },
      { label: 'Location', value: 'Event locations will be announced closer to the event.' },
    ],
    sourceNote: 'Official Atlanta Black Lotus VIP page, retrieved Aug 8, 2026. Schedule subject to change.',
    planEffect: 'Thursday is a BL-only day; keep this as a known program shell and monitor for TBD slot replacements.',
  },
  {
    id: 'bl-thursday-tbd-2',
    title: 'Black Lotus Content TBD — 2 PM',
    day: 'Thu',
    time: '2-2:45 PM',
    window: '45 minutes',
    price: 'included',
    kind: 'Black Lotus',
    type: 'info',
    format: 'Content TBD',
    tags: ['official atlanta', 'included', 'first look', 'tbd'],
    state: 'none',
    availability: 'changed',
    complexity: 'easy',
    complexityWhy: 'The official schedule reserves this time but has not announced its content.',
    fit: 'A real reserved Black Lotus slot whose subject is still pending.',
    detail: 'The official Thursday Black Lotus schedule currently lists this 45-minute slot as “Content TBD.”',
    decisionFacts: [{ label: 'Access', value: 'Black Lotus included' }, { label: 'Status', value: 'Content not announced' }],
    sourceNote: 'Official Atlanta Black Lotus VIP page, reviewed Aug 19, 2026. Schedule subject to change.',
    planEffect: 'Keep visible as a placeholder until the official program names the session.',
  },
  {
    id: 'bl-thursday-tbd-3',
    title: 'Black Lotus Content TBD — 3 PM',
    day: 'Thu',
    time: '3-3:45 PM',
    window: '45 minutes',
    price: 'included',
    kind: 'Black Lotus',
    type: 'info',
    format: 'Content TBD',
    tags: ['official atlanta', 'included', 'first look', 'tbd'],
    state: 'none',
    availability: 'changed',
    complexity: 'easy',
    complexityWhy: 'The official schedule reserves this time but has not announced its content.',
    fit: 'A real reserved Black Lotus slot whose subject is still pending.',
    detail: 'The official Thursday Black Lotus schedule currently lists this 45-minute slot as “Content TBD.”',
    decisionFacts: [{ label: 'Access', value: 'Black Lotus included' }, { label: 'Status', value: 'Content not announced' }],
    sourceNote: 'Official Atlanta Black Lotus VIP page, reviewed Aug 19, 2026. Schedule subject to change.',
    planEffect: 'Keep visible as a placeholder until the official program names the session.',
  },
  {
    id: 'bl-thursday-tbd-530',
    title: 'Black Lotus Content TBD — 5:30 PM',
    day: 'Thu',
    time: '5:30-6:15 PM',
    window: '45 minutes',
    price: 'included',
    kind: 'Black Lotus',
    type: 'info',
    format: 'Content TBD',
    tags: ['official atlanta', 'included', 'first look', 'tbd'],
    state: 'none',
    availability: 'changed',
    complexity: 'easy',
    complexityWhy: 'The official schedule reserves this time but has not announced its content.',
    fit: 'A real reserved Black Lotus slot whose subject is still pending.',
    detail: 'The official Thursday Black Lotus schedule currently lists this 45-minute slot as “Content TBD.”',
    decisionFacts: [{ label: 'Access', value: 'Black Lotus included' }, { label: 'Status', value: 'Content not announced' }],
    sourceNote: 'Official Atlanta Black Lotus VIP page, reviewed Aug 19, 2026. Schedule subject to change.',
    planEffect: 'Keep visible as a placeholder until the official program names the session.',
  },
  {
    id: 'bl-design-planechase',
    title: 'Design the Unknown Planechase Card',
    day: 'Thu',
    time: '4:15-5:15 PM',
    window: '1 hour',
    price: 'included',
    kind: 'Black Lotus',
    type: 'info',
    format: 'Interactive design session',
    tags: ['official atlanta', 'included', 'planechase', 'design'],
    state: 'none',
    availability: 'open',
    complexity: 'easy',
    complexityWhy: 'A bounded interactive session with no deck or purchase requirement.',
    fit: 'A distinctive hour inside the Thursday program block, especially if designing an Unknown plane sounds more interesting than the surrounding TBD sessions.',
    detail: 'A dedicated Black Lotus session for collaboratively designing an Unknown Planechase card during First Look Thursday.',
    decisionFacts: [{ label: 'Access', value: 'Black Lotus included' }, { label: 'Duration', value: '1 hour' }],
    sourceNote: 'Official Atlanta Black Lotus VIP page, retrieved Aug 8, 2026. Schedule subject to change.',
    planEffect: 'A precise one-hour contender inside the broader First Look shell; it should replace, not duplicate, that portion of the block if committed.',
  },
  {
    id: 'bl-paint-sip',
    title: 'Black Lotus Paint & Sip',
    day: 'Thu',
    time: '6:30-7:30 PM',
    window: '1 hour',
    price: 'included',
    kind: 'Black Lotus',
    type: 'social',
    format: 'Paint & Sip',
    tags: ['official atlanta', 'included', 'social', 'creative'],
    state: 'none',
    availability: 'open',
    complexity: 'easy',
    complexityWhy: 'A contained creative/social hour with no play-format preparation.',
    fit: 'A low-pressure creative option before the evening reception, worth comparing with downtime and the rest of the First Look block.',
    detail: 'An included Black Lotus Paint & Sip session during the Thursday First Look program.',
    decisionFacts: [{ label: 'Access', value: 'Black Lotus included' }, { label: 'Duration', value: '1 hour' }],
    sourceNote: 'Official Atlanta Black Lotus VIP page, retrieved Aug 8, 2026. Schedule subject to change.',
    planEffect: 'A soft one-hour social block before the reception; committing should carve it out of the broader Thursday shell.',
  },
  {
    id: 'bl-welcome-reception',
    title: 'BL Welcome Reception + First Look',
    day: 'Thu',
    time: '8-11 PM',
    window: '3 hours',
    price: 'included',
    kind: 'Black Lotus',
    type: 'social',
    format: 'Reception',
    tags: ['official atlanta', 'included', 'social', 'guests'],
    state: 'interested',
    availability: 'open',
    complexity: 'easy',
    complexityWhy: 'Social mixer, light food, no-host bar; no rules or deck prep.',
    fit: 'Worth keeping visible because it is a social opportunity with Wizards staff/special guests after the First Look block.',
    detail: 'Casual mixer with Wizards of the Coast members and special guests. Light food provided and a no-host bar.',
    decisionFacts: [
      { label: 'Time', value: 'Thu 8:00-11:00 PM' },
      { label: 'Food', value: 'Light food provided' },
      { label: 'Bar', value: 'No-host bar' },
    ],
    moreDetails: [{ label: 'Location', value: 'Event locations will be announced closer to the event.' }],
    sourceNote: 'Official Atlanta Black Lotus VIP page, retrieved Aug 8, 2026. Schedule subject to change.',
    planEffect: 'Late social anchor after Thursday programming; useful for energy planning, not a contention problem yet.',
  },
  {
    id: 'bl-friday-play-event',
    title: 'BL Friday Play Event with Special Guests',
    day: 'Fri',
    time: '2-6 PM',
    window: '4 hours',
    price: 'included',
    kind: 'Black Lotus',
    type: 'play',
    format: 'TBD play event',
    tags: ['official atlanta', 'included', 'tbd', 'special guests'],
    state: 'interested',
    availability: 'changed',
    complexity: 'unknown',
    complexityWhy: 'The official page says the event is under construction; not enough rules detail exists yet to assess difficulty.',
    fit: 'Real Atlanta BL slot, but the content is not settled. This is exactly the kind of thing the monitor should watch.',
    detail: 'Officially listed as “PLAY EVENT* with Special Guests,” with a note that the event is under construction and being workshopped based on Black Lotus feedback.',
    decisionFacts: [
      { label: 'Time', value: 'Fri 2:00-6:00 PM' },
      { label: 'Rules', value: 'TBD / under construction' },
      { label: 'Access', value: 'Black Lotus' },
    ],
    moreDetails: [
      { label: 'Official caveat', value: 'Stay tuned and check back here for updates.' },
      { label: 'Location', value: 'Event locations will be announced closer to the event.' },
    ],
    sourceNote: 'Official Atlanta Black Lotus VIP page, retrieved Aug 8, 2026. Schedule subject to change.',
    planEffect: 'Hold as a meaningful Friday contender, but do not over-rank until the official format is published.',
  },
  {
    id: 'bl-planechase',
    title: 'BL Planechase Unknown',
    day: 'Sat',
    time: '11:30-3',
    window: 'Included',
    price: 'included',
    kind: 'Black Lotus',
    type: 'play',
    format: 'Planechase Unknown',
    tags: ['included', 'unusual', 'shared'],
    state: 'tentative',
    availability: 'open',
    complexity: 'focused',
    complexityWhy: 'Unusual rules and mystery structure deserve attention, but included Black Lotus events are lower financial risk.',
    fit: 'Distinctive Black Lotus anchor. Chris can attend; Juan probably cannot.',
    detail: 'Keep this surfaced because it is included, unusual, and likely to be referenced repeatedly before the event.',
    formatHelp: 'Planechase uses a shared planar card that changes the table rules. “Unknown” signals an intentionally surprising event structure whose complete twists are not explained in advance.',
    decisionFacts: [
      { label: 'Access', value: 'Black Lotus included event' },
      { label: 'Prep', value: 'Bring a Commander deck' },
      { label: 'Duration', value: '11:30 AM–3 PM' },
    ],
    moreDetails: [
      { label: 'Location', value: 'To be announced closer to the convention.' },
      { label: 'Eligibility', value: 'Black Lotus access is required; Chris can attend and Juan cannot.' },
    ],
    sourceNote: 'Official Atlanta Black Lotus page, retrieved Aug 3, 2026.',
    planEffect: 'Stays in Plan as a strong Black Lotus contender until a better Saturday shape appears.',
  },
  {
    id: 'bl-mystery-booster-drafts',
    title: 'BL Mystery Booster 2 Drafts',
    day: 'Sun',
    time: '1-5 PM',
    window: 'On-demand drafts',
    price: 'included',
    kind: 'Black Lotus',
    type: 'play',
    format: 'Mystery Booster 2 draft',
    tags: ['official atlanta', 'included', 'draft', 'wizards guests'],
    state: 'interested',
    availability: 'open',
    complexity: 'focused',
    complexityWhy: 'Drafting Mystery Booster 2 asks for real card-reading bandwidth, but there are no pairings or prizes and drafts fire casually.',
    fit: 'Potentially fun because it is chaotic and included, with the option to play against Wizards for extra boosters.',
    detail: 'Drafts fire whenever 8 players gather starting at 1:00 PM Sunday. Limit 2 per person. Last draft fires at 4:00 PM regardless of participants. No pairings or prizes.',
    formatHelp: 'Draft means selecting cards from packs and building a deck on the spot. Mystery Booster products add novelty and many unfamiliar cards.',
    decisionFacts: [
      { label: 'Fires', value: '8 players gathered' },
      { label: 'Limit', value: '2 drafts/person' },
      { label: 'Last fire', value: 'Sun 4:00 PM' },
      { label: 'Prizes', value: 'No pairings/prizes' },
    ],
    moreDetails: [{ label: 'Opportunity', value: 'Play against Wizards for a chance at extra boosters.' }],
    sourceNote: 'Official Atlanta Black Lotus VIP page, retrieved Aug 8, 2026. Schedule subject to change.',
    planEffect: 'Flexible Sunday play window; useful to keep near the airport-leaving calculation but not a fixed commitment yet.',
  },
  {
    id: 'bl-feedback-session',
    title: 'BL Meet & Greet / Feedback Session',
    day: 'Sun',
    time: '3-4 PM',
    window: '1 hour',
    price: 'included',
    kind: 'Black Lotus',
    type: 'social',
    format: 'Meet & greet',
    tags: ['official atlanta', 'included', 'feedback', 'wizards'],
    state: 'interested',
    availability: 'open',
    complexity: 'easy',
    complexityWhy: 'Conversation session rather than gameplay; low prep unless there is something specific you want to ask.',
    fit: 'Could be useful as a low-effort final-day touchpoint with the event team, especially if Thursday/Friday programming changes.',
    detail: 'Meet & Greet / Feedback Session with Wizards of the Coast Event Team.',
    decisionFacts: [
      { label: 'Time', value: 'Sun 3:00-4:00 PM' },
      { label: 'Type', value: 'Feedback/social' },
      { label: 'Access', value: 'Black Lotus' },
    ],
    sourceNote: 'Official Atlanta Black Lotus VIP page, retrieved Aug 8, 2026. Schedule subject to change.',
    planEffect: 'Small Sunday anchor that may overlap with drafts; easy to choose later.',
  },
]

const exploreEvents = [
  ...exploreEventCandidates.filter(event => event.sourceNote?.startsWith('Official Atlanta')),
  ...(ticketedPlayExploreEvents as ExploreEvent[]),
]

function purchaseQaEvents(events: ExploreEvent[]) {
  const qaModes = new URLSearchParams(window.location.search).get('qa')?.split(',') ?? []
  if (!qaModes.includes('purchased-event')) return events
  const paidId = qaModes.includes('ticketed-availability') ? 'ticketed-944015' : events.find(event => canPurchaseEvent(event.price))?.id
  return events.map(event => event.id === paidId ? { ...event, state: 'committed' as const, purchased: true } : event)
}

function purchaseQaEventId(events: ExploreEvent[]) {
  const qaModes = new URLSearchParams(window.location.search).get('qa')?.split(',') ?? []
  if (!qaModes.includes('purchased-event')) return null
  return qaModes.includes('ticketed-availability') ? 'ticketed-944015' : events.find(event => canPurchaseEvent(event.price))?.id ?? null
}

function FunnelNav({ current, onOpenExplore, onOpenPlan, onOpenCalendar }: { current: 'explore' | 'plan' | 'calendar'; onOpenExplore: () => void; onOpenPlan?: () => void; onOpenCalendar: () => void }) {
  return <nav className="funnel-nav" aria-label="Explore, plan, calendar flow">
    <button type="button" data-tour-target="nav-explore" className={current === 'explore' ? 'active' : ''} aria-current={current === 'explore' ? 'page' : undefined} onClick={onOpenExplore}>Explore</button>
    <button type="button" data-tour-target="nav-plan" className={current === 'plan' ? 'active' : ''} aria-current={current === 'plan' ? 'page' : undefined} onClick={onOpenPlan}>Plan</button>
    <button type="button" data-tour-target="nav-calendar" className={current === 'calendar' ? 'active' : ''} aria-current={current === 'calendar' ? 'page' : undefined} onClick={onOpenCalendar}>Calendar</button>
  </nav>
}

type PlanView = 'list' | 'agenda'
type PlanParticipantState = 'interested' | 'tentative' | 'committed'
type PlanParticipant = { person: PersonName; state: PlanParticipantState; purchased?: boolean }
type AgendaPlacement = { event: ExploreEvent; start: number; end: number; lane: number; lanes: number }

const planPeople: PersonName[] = ['Kavi', 'Chris', 'Juan', 'Kyle']

function peopleVisibilityKey(currentOwnerId: string | undefined, currentPerson: PersonName) {
  return `magiccon-visible-people-v2:${currentOwnerId ?? currentPerson.toLowerCase()}`
}

function readPeopleVisibility(currentOwnerId: string | undefined, currentPerson: PersonName) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(peopleVisibilityKey(currentOwnerId, currentPerson)) ?? 'null')
    if (!Array.isArray(stored)) return [...planPeople]
    const visible = planPeople.filter(person => stored.includes(person))
    return visible.length > 0 ? visible : [...planPeople]
  } catch {
    return [...planPeople]
  }
}

function writePeopleVisibility(currentOwnerId: string | undefined, currentPerson: PersonName, people: PersonName[]) {
  window.localStorage.setItem(peopleVisibilityKey(currentOwnerId, currentPerson), JSON.stringify(people))
}

function planParticipants(event: ExploreEvent, currentPerson: PersonName, selectionRows: UserSelectionRow[], companions: CompanionMember[]): PlanParticipant[] {
  const participants: PlanParticipant[] = []
  selectionRows
    .filter(row => row.object_id === `explore-${event.id}` && row.selection_key === 'state' && ['interested', 'tentative', 'committed'].includes(row.selection_value))
    .forEach(row => {
      const person = companions.find(member => member.userId === row.owner_id)?.name
      const purchased = canPurchaseEvent(event.price) && selectionRows.some(candidate => candidate.owner_id === row.owner_id && candidate.object_id === row.object_id && candidate.selection_key === 'purchased' && candidate.selection_value === 'true')
      if (person && person !== currentPerson && !participants.some(participant => participant.person === person)) participants.push({ person, state: purchased ? 'committed' : row.selection_value as PlanParticipantState, purchased })
    })
  if (['interested', 'tentative', 'committed'].includes(event.state)) {
    participants.push({ person: currentPerson, state: event.state as PlanParticipantState, purchased: event.purchased })
  }
  return participants
}

function parseAgendaInterval(event: ExploreEvent): { start: number; end: number } | null {
  const match = event.time.replace(/[–—]/g, '-').match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
  if (!match) return null
  let startHour = Number(match[1])
  const startMinute = Number(match[2] ?? 0)
  const endHourRaw = Number(match[4])
  const endMinute = Number(match[5] ?? 0)
  const endMeridiem = match[6].toUpperCase()
  let startMeridiem = match[3]?.toUpperCase()
  if (!startMeridiem) startMeridiem = endMeridiem === 'PM' && startHour > endHourRaw ? 'AM' : endMeridiem
  if (startHour === 12) startHour = 0
  if (startMeridiem === 'PM') startHour += 12
  let endHour = endHourRaw === 12 ? 0 : endHourRaw
  if (endMeridiem === 'PM') endHour += 12
  const start = startHour + startMinute / 60
  let end = endHour + endMinute / 60
  if (end <= start) end += 12
  return { start, end }
}

function planTimeLines(time: string) {
  const parts = time.replace(/[–—]/g, '-').split(/\s*-\s*/, 2)
  return { start: parts[0], end: parts[1] }
}

function isFlexiblePlanEvent(event: ExploreEvent) {
  return event.id === 'bl-progressive-sealed'
    || event.id === 'bl-mystery-booster-drafts'
    || /mage tower league/i.test(`${event.title} ${event.format}`)
    || /start/i.test(event.time)
    || /on-demand/i.test(event.window)
}

function isNonBlockingPlanEvent(event: ExploreEvent) {
  return isFlexiblePlanEvent(event)
    || event.tags.some(tag => tag.toLowerCase() === 'league')
    || /\bleague\b/i.test(`${event.title} ${event.format} ${event.window}`)
}

function placeAgendaEvents(events: ExploreEvent[]): AgendaPlacement[] {
  const timed = events.flatMap(event => {
    const interval = isFlexiblePlanEvent(event) ? null : parseAgendaInterval(event)
    return interval ? [{ event, ...interval }] : []
  }).sort((a, b) => a.start - b.start || a.end - b.end)
  const placed: AgendaPlacement[] = []
  let index = 0
  while (index < timed.length) {
    const group = [timed[index]]
    let groupEnd = timed[index].end
    let cursor = index + 1
    while (cursor < timed.length && timed[cursor].start < groupEnd) {
      group.push(timed[cursor])
      groupEnd = Math.max(groupEnd, timed[cursor].end)
      cursor += 1
    }
    const laneEnds: number[] = []
    const assigned = group.map(item => {
      let lane = laneEnds.findIndex(end => end <= item.start)
      if (lane < 0) lane = laneEnds.length
      laneEnds[lane] = item.end
      return { ...item, lane }
    })
    assigned.forEach(item => placed.push({ ...item, lanes: laneEnds.length }))
    index = cursor
  }
  return placed
}

function formatAgendaHour(hour: number) {
  const normalized = ((hour % 24) + 24) % 24
  if (normalized === 0) return '12 AM'
  if (normalized === 12) return '12 PM'
  return `${normalized > 12 ? normalized - 12 : normalized} ${normalized > 12 ? 'PM' : 'AM'}`
}

function planEventsOverlap(first: ExploreEvent, second: ExploreEvent) {
  if (isNonBlockingPlanEvent(first) || isNonBlockingPlanEvent(second)) return false
  const a = parseAgendaInterval(first)
  const b = parseAgendaInterval(second)
  return Boolean(a && b && a.start < b.end && b.start < a.end)
}

function PlanParticipantBadges({ participants, compact = false, currentPerson }: { participants: PlanParticipant[]; compact?: boolean; currentPerson?: PersonName }) {
  const labels: Record<PersonName, string> = { Kavi: 'Ka', Chris: 'C', Juan: 'J', Kyle: 'Ky' }
  return <span className={`plan-participants ${compact ? 'compact' : ''}`} aria-label={participants.map(participant => `${participant.person} ${participant.purchased ? 'purchased' : participant.state}`).join(', ')}>
    {participants.map(participant => <span key={participant.person} className={`plan-participant ${participant.person.toLowerCase()} state-${participant.state} ${participant.purchased ? 'purchased' : ''} ${participant.person === currentPerson ? 'is-current' : ''}`} title={`${participant.person === currentPerson ? 'You' : participant.person} · ${participant.purchased ? 'Purchased' : eventStageLabel(participant.state)}`}>
      <span className="person-bubble">{labels[participant.person]}</span>
      {participant.purchased ? <ActionIcon name="lock" /> : <PlanningStateIcon state={participant.state} />}
    </span>)}
  </span>
}

function PlanSurface({ events, selectionRows, companions, slice, focusRequest, notes, currentOwnerId, currentPerson, onAddNote, onDeleteNote, onUpdateEvent, onPurchase, onChangeSliceState, onOpenExplore, onOpenCalendar, online, saving, canCommitBlackLotus }: {
  events: ExploreEvent[]
  selectionRows: UserSelectionRow[]
  companions: CompanionMember[]
  slice: TrustSlice
  focusRequest: { eventId: string; nonce: number } | null
  notes: ContextNote[]
  currentOwnerId?: string
  currentPerson: PersonName
  onAddNote: (input: AddContextNoteInput) => void
  onDeleteNote: (id: string) => void
  onUpdateEvent: (id: string, state: ExploreState) => void
  onPurchase: (id: string, purchased: boolean) => void
  onChangeSliceState: (state: PlanningState) => void
  onOpenExplore: () => void
  onOpenCalendar: () => void
  online: boolean
  saving: boolean
  canCommitBlackLotus: boolean
}) {
  const days: ExploreEvent['day'][] = ['Thu', 'Fri', 'Sat', 'Sun']
  const [activeDay, setActiveDay] = useState<ExploreEvent['day']>('Fri')
  const [selectedPeople, setSelectedPeople] = useState<PersonName[]>(() => readPeopleVisibility(currentOwnerId, currentPerson))
  const [planView, setPlanView] = useState<PlanView>(() => window.localStorage.getItem('magiccon-plan-view') === 'agenda' ? 'agenda' : 'list')
  const [selectedId, setSelectedId] = useState<string | null>(() => purchaseQaEventId(events))
  const [detailOpen, setDetailOpen] = useState(() => Boolean(purchaseQaEventId(events)))
  const [collapsedPlanGroups, setCollapsedPlanGroups] = useState<string[]>([])
  const workbarRef = useRef<HTMLDivElement | null>(null)
  const workbarStartRef = useRef(0)
  const [workbarPinned, setWorkbarPinned] = useState(false)
  const [workbarHeight, setWorkbarHeight] = useState(0)
  const candidateEvents = events
  const participantMap = new Map(candidateEvents.map(event => [event.id, planParticipants(event, currentPerson, selectionRows, companions)]))
  const planEvents = candidateEvents.filter(event => event.id !== 'bl-first-look-thursday' && (participantMap.get(event.id) ?? []).length > 0)
  const visiblePlanEvents = planEvents.filter(event => (participantMap.get(event.id) ?? []).some(participant => selectedPeople.includes(participant.person)))
  const dayEvents = visiblePlanEvents.filter(event => event.day === activeDay)
  const selected = selectedId ? planEvents.find(event => event.id === selectedId) ?? null : null
  const strongestState = (event: ExploreEvent): PlanParticipantState => {
    const states = (participantMap.get(event.id) ?? []).filter(participant => selectedPeople.includes(participant.person)).map(participant => participant.state)
    return states.includes('committed') ? 'committed' : states.includes('tentative') ? 'tentative' : 'interested'
  }
  const planGroups = [
    { key: 'committed', label: 'Committed anchors', items: dayEvents.filter(event => strongestState(event) === 'committed') },
    { key: 'tentative', label: 'Tentative contenders', items: dayEvents.filter(event => strongestState(event) === 'tentative') },
    { key: 'interested', label: 'Interesting maybes', items: dayEvents.filter(event => strongestState(event) === 'interested') },
  ].filter(group => group.items.length > 0)
  const flexibleEvents = dayEvents.filter(isFlexiblePlanEvent)
  const agendaPlacements = placeAgendaEvents(dayEvents)
  const agendaStart = agendaPlacements.length ? Math.max(8, Math.floor(Math.min(...agendaPlacements.map(item => item.start)))) : 9
  const agendaEnd = agendaPlacements.length ? Math.min(25, Math.ceil(Math.max(...agendaPlacements.map(item => item.end)))) : 18
  const agendaHourHeight = 64
  const agendaHeight = Math.max(280, (agendaEnd - agendaStart) * agendaHourHeight)
  const agendaHours = Array.from({ length: agendaEnd - agendaStart + 1 }, (_, index) => agendaStart + index)
  const agendaOperatingBoundary = activeDay === 'Fri' || activeDay === 'Sat'
    ? { opens: '10:00 AM', closes: '11:59 PM' }
    : activeDay === 'Sun' ? { opens: '10:00 AM', closes: '6:00 PM' } : null
  const conflictPairs = agendaPlacements.flatMap((first, index) => agendaPlacements.slice(index + 1).filter(second => planEventsOverlap(first.event, second.event)).map(second => [first.event.id, second.event.id] as const))
  const conflictIds = new Set(conflictPairs.flat())
  const sharedCount = dayEvents.filter(event => (participantMap.get(event.id) ?? []).filter(participant => selectedPeople.includes(participant.person)).length > 1).length
  const togglePlanGroup = (key: string) => setCollapsedPlanGroups(groups => groups.includes(key) ? groups.filter(item => item !== key) : [...groups, key])

  useEffect(() => {
    setSelectedPeople(readPeopleVisibility(currentOwnerId, currentPerson))
  }, [currentOwnerId, currentPerson])

  const togglePerson = (person: PersonName) => setSelectedPeople(current => {
    const next = current.includes(person) ? current.length === 1 ? current : current.filter(item => item !== person) : [...current, person]
    writePeopleVisibility(currentOwnerId, currentPerson, next)
    return next
  })

  const changePlanView = (view: PlanView) => {
    setPlanView(view)
    window.localStorage.setItem('magiccon-plan-view', view)
    setSelectedId(null)
    setDetailOpen(false)
  }

  const setState = (event: ExploreEvent, state: ExploreState) => {
    onUpdateEvent(event.id, state)
  }

  const openPlanEvent = (event: ExploreEvent) => {
    if (selectedId === event.id && detailOpen) {
      setSelectedId(null)
      setDetailOpen(false)
      return
    }
    setSelectedId(event.id)
    setDetailOpen(true)
  }

  useEffect(() => {
    if (!focusRequest) return
    const event = candidateEvents.find(candidate => candidate.id === focusRequest.eventId)
    if (!event) return
    setPlanView('list')
    window.localStorage.setItem('magiccon-plan-view', 'list')
    setActiveDay(event.day)
    setSelectedPeople(current => current.includes(currentPerson) ? current : [currentPerson, ...current])
    setSelectedId(event.id)
    setDetailOpen(true)
    window.setTimeout(() => document.querySelector<HTMLElement>(`.plan-row[data-event-id="${CSS.escape(event.id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0)
  }, [focusRequest])

  useEffect(() => {
    const updateWorkbarPin = () => {
      const workbar = workbarRef.current
      if (!workbar) return
      setWorkbarHeight(workbar.offsetHeight)
      if (!workbar.classList.contains('pinned')) workbarStartRef.current = workbar.getBoundingClientRect().top + window.scrollY
      setWorkbarPinned(window.scrollY > workbarStartRef.current)
    }
    updateWorkbarPin()
    window.addEventListener('scroll', updateWorkbarPin, { passive: true })
    window.addEventListener('resize', updateWorkbarPin)
    return () => {
      window.removeEventListener('scroll', updateWorkbarPin)
      window.removeEventListener('resize', updateWorkbarPin)
    }
  }, [])

  return <section className="plan-lite">
    <div ref={workbarRef} className={`surface-workbar plan-workbar ${workbarPinned ? 'pinned' : ''}`} data-tour-target="plan-controls">
    <div className="plan-control-row">
      <div className="plan-view-toggle map-tabs" role="tablist" aria-label="Plan view">
        <button type="button" role="tab" aria-selected={planView === 'list'} className={planView === 'list' ? 'active' : ''} onClick={() => changePlanView('list')}>List</button>
        <button type="button" role="tab" aria-selected={planView === 'agenda'} className={planView === 'agenda' ? 'active' : ''} onClick={() => changePlanView('agenda')}>Agenda</button>
      </div>
      <nav className="plan-day-tabs" aria-label="Convention planning days">
        {days.map(day => <button key={day} type="button" className={activeDay === day ? 'active' : ''} onClick={() => { setActiveDay(day); setSelectedId(null); setDetailOpen(false) }}><strong>{day}</strong></button>)}
      </nav>
      <div className="plan-control-right">
        <div className="plan-people-filter" aria-label="People included in Plan">
          {planPeople.map(person => <button key={person} type="button" className={selectedPeople.includes(person) ? `active ${person.toLowerCase()}` : person.toLowerCase()} aria-pressed={selectedPeople.includes(person)} title={person} onClick={() => togglePerson(person)}><span className="person-bubble">{person === 'Kavi' ? 'Ka' : person === 'Kyle' ? 'Ky' : person[0]}</span><span className="person-filter-name">{person}</span></button>)}
        </div>
      </div>
    </div>
    </div>
    {workbarPinned && <div className="workbar-spacer" style={{ height: workbarHeight }} aria-hidden="true" />}

    <div className={`plan-lite-layout ${selected ? 'has-detail' : ''}`}>
      <div className="plan-day-board">
        <div className="plan-day-heading"><div><strong>{activeDay}</strong><span>{dayEvents.length} possibilities · {sharedCount} together · {conflictIds.size} in contention</span></div><small>{dayEvents.filter(event => !isNonBlockingPlanEvent(event) && (participantMap.get(event.id) ?? []).some(participant => participant.purchased || participant.state === 'committed')).length} firm blocks</small></div>
        {planView === 'list' && planGroups.map(group => {
          const collapsed = collapsedPlanGroups.includes(group.key)
          return <section className={`plan-row-group group-${group.key}`} key={group.key}>
            <button className="funnel-group-header" type="button" aria-expanded={!collapsed} onClick={() => togglePlanGroup(group.key)}>
              <span><strong>{group.label}</strong></span>
              <em>{group.items.length}</em>
              <b aria-hidden="true">⌄</b>
            </button>
            {!collapsed && group.items.map(event => {
              const participants = (participantMap.get(event.id) ?? []).filter(participant => selectedPeople.includes(participant.person))
              const purchased = participants.some(participant => participant.purchased)
              const kindIcon: EventKindIconName = event.type === 'play' ? 'play' : event.type === 'info' ? 'info' : event.type === 'social' ? 'social' : event.kind === 'Competitive' ? 'competitive' : 'ticketed'
              return <article key={event.id} data-event-id={event.id} className={`plan-row type-${event.type} state-${strongestState(event)} ${participants.length > 1 ? 'shared' : ''} ${purchased ? 'purchased' : ''} ${conflictIds.has(event.id) ? 'conflict' : ''} ${selected?.id === event.id ? 'selected' : ''}`}>
              <button className="plan-row-main" type="button" onClick={() => openPlanEvent(event)}>
                <span className={`plan-kind type-${event.type}`} aria-label={eventKindLabel(event)} data-kind-label={eventKindLabel(event)}><span className="plan-kind-icon"><EventKindIcon name={kindIcon} /></span>{event.kind === 'Black Lotus' && <span className="plan-source-mark" title="Black Lotus"><EventKindIcon name="lotus" /></span>}</span>
                <span className="plan-time-chip">{event.day}<b>{planTimeLines(event.time).start}{planTimeLines(event.time).end && <span>–{planTimeLines(event.time).end}</span>}</b></span>
                <span className="plan-row-copy"><strong>{displayEventTitle(event)}</strong><small>{event.time} · {event.window}</small><PlanParticipantBadges participants={participants} compact currentPerson={currentPerson} /></span>
                {participants.length > 1 ? <span className="plan-row-signal together">Together</span> : planPressure(event) && <span className="plan-row-signal">{planPressure(event)}</span>}
              </button>
              <PurchaseControl event={event} onPurchase={purchased => onPurchase(event.id, purchased)} />
              <div className="plan-state-controls" aria-label={`${event.title} planning state`}>
                {([['interested', 'Interested'], ['tentative', 'Tentative'], ['committed', 'Committed']] as const).map(([state, label]) => {
                  const disabled = Boolean(event.purchased) || (event.id === 'bl-planechase' ? !online || saving : false)
                  const title = event.purchased ? 'Set by Purchased. Undo purchase to change commitment.' : label
                  return <button key={state} type="button" className={`decision-state-${state}`} aria-label={title} title={title} aria-pressed={event.state === state} disabled={disabled} onClick={() => setState(event, state)}><b aria-hidden="true"><PlanningStateIcon state={state} /></b><span>{label}</span></button>
                })}
              </div>
            </article>})}
          </section>
        })}
        {planView === 'agenda' && <div className="plan-agenda">
          {agendaOperatingBoundary && <div className="agenda-boundary agenda-boundary-open"><time>{agendaOperatingBoundary.opens}</time><span>Show floor opens</span></div>}
          {flexibleEvents.length > 0 && <section className="agenda-flexible-strip"><span>Flexible</span><div>{flexibleEvents.map(event => <button key={event.id} type="button" onClick={() => openPlanEvent(event)} className={selected?.id === event.id ? 'selected' : ''}><strong>{displayEventTitle(event)}</strong><PlanParticipantBadges participants={(participantMap.get(event.id) ?? []).filter(participant => selectedPeople.includes(participant.person))} compact currentPerson={currentPerson} /></button>)}</div></section>}
          {agendaPlacements.length > 0 && <div className="agenda-timeline" style={{ height: agendaHeight }}>
            <div className="agenda-time-axis" aria-hidden="true">{agendaHours.map(hour => <span key={hour} style={{ top: (hour - agendaStart) * agendaHourHeight }}>{formatAgendaHour(hour)}</span>)}</div>
            <div className="agenda-track">{agendaHours.map(hour => <i key={hour} style={{ top: (hour - agendaStart) * agendaHourHeight }} />)}
              {agendaPlacements.map(placement => {
                const participants = (participantMap.get(placement.event.id) ?? []).filter(participant => selectedPeople.includes(participant.person))
                const mine = participants.some(participant => participant.person === currentPerson)
                const shared = mine && participants.some(participant => participant.person !== currentPerson)
                const othersOnly = !mine
                const conflict = conflictIds.has(placement.event.id)
                const nonBlocking = isNonBlockingPlanEvent(placement.event)
                const ownerClass = participants.length === 1 ? `owner-${participants[0].person.toLowerCase()}` : 'owner-shared'
                const participantClasses = participants.map(participant => `has-${participant.person.toLowerCase()}`).join(' ')
                const short = placement.end - placement.start <= 1.5
                return <button key={placement.event.id} type="button" className={`agenda-event state-${strongestState(placement.event)} ${ownerClass} ${participantClasses} ${short ? 'short' : ''} ${mine ? 'mine' : ''} ${shared ? 'shared' : ''} ${othersOnly ? 'others-only' : ''} ${nonBlocking ? 'non-blocking' : ''} ${conflict ? 'conflict' : ''} ${selected?.id === placement.event.id ? 'selected' : ''}`} style={{ top: (placement.start - agendaStart) * agendaHourHeight + 4, height: Math.max(48, (placement.end - placement.start) * agendaHourHeight - 8), left: `calc(${placement.lane / placement.lanes * 100}% + ${placement.lane ? 4 : 0}px)`, width: `calc(${100 / placement.lanes}% - ${placement.lane ? 4 : 0}px)` }} onClick={() => openPlanEvent(placement.event)}>
                  <span className="agenda-event-copy"><strong>{displayEventTitle(placement.event)}</strong><small>{placement.event.time}</small>{placement.event.availability === 'sold-out' && <span className="availability-marker">Sold out</span>}</span>
                  {placement.event.purchased && <span className="agenda-purchase-lock" title="Purchased" aria-label="Purchased"><ActionIcon name="lock" /></span>}
                  <PlanParticipantBadges participants={participants} compact currentPerson={currentPerson} />
                  {placement.event.kind === 'Black Lotus' && <span className={`agenda-source-mark ${shared || conflict ? 'above-label' : ''}`} title="Black Lotus" aria-label="Black Lotus"><EventKindIcon name="lotus" /></span>}
                  {shared && <em>Together</em>}
                  {conflict && <span className="agenda-conflict">Conflict</span>}
                </button>
              })}
            </div>
          </div>}
          {agendaOperatingBoundary && <div className="agenda-boundary agenda-boundary-close"><time>{agendaOperatingBoundary.closes}</time><span>Gaming closes</span></div>}
        </div>}
        {dayEvents.length === 0 && <div className="plan-empty"><strong>No active contenders yet.</strong><span>Mark something Interested or Tentative in Explore.</span><button type="button" onClick={onOpenExplore}>Browse Explore</button></div>}
      </div>

      {selected && <aside className="plan-inspector event-detail-panel" data-open={detailOpen} aria-label={`${selected.title} planning detail`}>
        <header className="event-detail-heading">
          <div className="plan-inspector-head"><span>{selected.kind}</span><div className="detail-head-actions"><span className={`event-stage stage-${selected.state}`}>{eventStageLabel(selected.state)}</span><button className="detail-close plan-detail-close" type="button" onClick={() => { setSelectedId(null); setDetailOpen(false) }} aria-label="Close event detail">×</button></div></div>
          <h3>{displayEventTitle(selected)}</h3>
          <div className="plan-inspector-facts"><span>{selected.day} · {selected.time}</span>{!canPurchaseEvent(selected.price) && <span><EventPriceLabel event={selected} /></span>}<span>{selected.format}</span></div>
          <EventDetailActions event={selected} onPurchase={purchased => onPurchase(selected.id, purchased)} />
        </header>
        <section className="plan-who"><small>WHO'S IN</small><PlanParticipantBadges participants={participantMap.get(selected.id) ?? []} currentPerson={currentPerson} /></section>
        <EventStateRail event={selected} context="plan" onState={state => setState(selected, state)} canCommit disabled={!online || saving} />
        <div className="detail-intel event-context-block"><span aria-hidden="true">✧</span><p><small>OFFICIAL DESCRIPTION</small>{renderLinkedText(selected.detail)}</p></div>
        <section className="detail-section decision-section">
          <div className="format-heading"><strong>{selected.format}</strong>{selected.formatHelp && <details className="format-help"><summary aria-label={`Explain ${selected.format}`}>?</summary><p>{selected.formatHelp}</p></details>}</div>
          {eventDecisionFacts(selected).length > 0 && <div className="decision-facts" aria-label="Event at a glance">{eventDecisionFacts(selected).map(fact => <div key={fact.label} className={isWideEventDetail(fact.label) ? 'decision-fact-wide' : undefined}><span>{fact.icon === 'ticket' && <TicketMiniIcon />}{fact.label}</span><strong>{fact.value}</strong></div>)}</div>}
          <p className="complexity-note"><span aria-hidden="true"><FlameGlyph /> Assessment:</span> {selected.complexityWhy}</p>
        </section>
        <section className="detail-section plan-summary"><strong>Plan effect</strong><p>{selected.planEffect}</p></section>
        {selected.availability === 'changed' && <div className="plan-watch"><span aria-hidden="true">✧</span><p><strong>Worth watching</strong>{selected.complexityWhy}</p></div>}
        <ObjectNotes notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} objectId={`explore-${selected.id}`} objectKind="event" objectTitle={displayEventTitle(selected)} context={`Event · ${displayEventTitle(selected)}`} backlink="plan" compact />
        {(eventMoreDetails(selected).length > 0 || selected.sourceNote) && <details className="detail-more">
          <summary><span>More details</span></summary>
          <div className="detail-more-body">
            {eventMoreDetails(selected).map(item => <div className="more-row" key={item.label}><span>{item.label}</span><p>{renderLinkedText(item.value)}</p></div>)}
            {selected.sourceNote && <div className="more-row source-row"><span>Source</span><p>{renderLinkedText(selected.sourceNote)}</p></div>}
          </div>
        </details>}
      </aside>}
    </div>
  </section>
}

function planDayContext(day: ExploreEvent['day']) {
  if (day === 'Thu') return 'Black Lotus early access · Kavi + Chris'
  if (day === 'Fri') return 'First full convention day'
  if (day === 'Sat') return 'Core convention day'
  return 'Final day · airport buffer matters'
}

function exploreDayContext(day: ExploreEvent['day']) {
  if (day === 'Thu') return 'early access and first-look decisions'
  if (day === 'Fri') return 'first full convention day'
  if (day === 'Sat') return 'core weekend anchors'
  return 'final-day and travel-sensitive options'
}

function planPressure(event: ExploreEvent) {
  if (event.state === 'committed') return 'Hard block'
  if (event.id === 'bl-progressive-sealed') return ''
  if (event.id === 'bl-friday-play-event') return 'Details pending'
  if (event.id === 'bl-mystery-booster-drafts') return 'On demand'
  if (event.id === 'bl-feedback-session') return 'Soft overlap'
  if (event.availability === 'changed') return 'Watch change'
  if (event.state === 'tentative') return 'Real contender'
  return 'In consideration'
}

function displayEventTitle(event: Pick<ExploreEvent, 'kind' | 'title'>) {
  if (event.kind === 'Black Lotus') return event.title.replace(/^(BL|Black Lotus)\s+/i, '')
  return event.title
}

function eventKindLabel(event: Pick<ExploreEvent, 'kind'>) {
  if (event.kind === 'Black Lotus') return 'Black Lotus'
  if (event.kind === 'Ticketed play') return 'Ticketed play'
  return event.kind
}

function exploreRouteGroupLabel(group?: ExploreRouteState['group']) {
  if (group === 'high_signal') return 'High-signal ticketed play'
  if (group === 'all_ticketed_play') return 'All ticketed play'
  if (group === 'sold_out') return 'Sold-out ticketed play'
  if (group === 'watched') return 'Watched ticketed play'
  if (group === 'social_fit') return 'Social-fit ticketed play'
  if (group === 'conflicts') return 'Ticketed play conflicts'
  return ''
}

export function partitionExploreContenders<T extends { state: ExploreState }>(events: T[]) {
  const contenders: T[] = []
  const remainder: T[] = []
  events.forEach(event => {
    if (event.state === 'interested' || event.state === 'tentative') contenders.push(event)
    else remainder.push(event)
  })
  return { contenders, remainder }
}

function ExploreSurface({ events, routeState, focusRequest, notes, currentOwnerId, currentPerson, onAddNote, onDeleteNote, onUpdateEvent, onPurchase, onOpenPlan, onOpenCalendar }: { events: ExploreEvent[]; routeState: ExploreRouteState; focusRequest: { eventId: string; noteId?: string; nonce: number } | null; notes: ContextNote[]; currentOwnerId?: string; currentPerson: PersonName; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; onUpdateEvent: (id: string, state: ExploreState) => void; onPurchase: (id: string, purchased: boolean) => void; onOpenPlan: () => void; onOpenCalendar: () => void }) {
  const [day, setDay] = useState<'all' | ExploreEvent['day']>('all')
  const [eventType, setEventType] = useState<ExploreType>('all')
  const [selectedId, setSelectedId] = useState<string | null>(() => purchaseQaEventId(events))
  const [detailOpen, setDetailOpen] = useState(() => Boolean(purchaseQaEventId(events)))
  const [showHidden, setShowHidden] = useState(false)
  const [hiddenExpanded, setHiddenExpanded] = useState(false)
  const [soldOutExpanded, setSoldOutExpanded] = useState(routeState.group === 'sold_out')
  const [collapsedExploreGroups, setCollapsedExploreGroups] = useState<string[]>(() => currentPerson === 'Kyle' ? ['Thu'] : [])
  const exploreIdentityDefaultApplied = useRef(currentPerson === 'Kyle')
  const [query, setQuery] = useState('')
  const eventListRef = useRef<HTMLDivElement | null>(null)
  const workbarRef = useRef<HTMLDivElement | null>(null)
  const workbarStartRef = useRef(0)
  const [detailTop, setDetailTop] = useState(258)
  const [workbarPinned, setWorkbarPinned] = useState(false)
  const [workbarHeight, setWorkbarHeight] = useState(0)
  const routeGroupLabel = exploreRouteGroupLabel(routeState.group)
  const selected = selectedId ? events.find(event => event.id === selectedId) ?? null : null
  const matchesSearchAndDay = (event: ExploreEvent) => {
    const matchesDay = day === 'all' || event.day === day
    const matchesType = eventType === 'all' || event.type === eventType
    const text = `${event.title} ${event.format} ${event.kind} ${event.tags.join(' ')}`.toLowerCase()
    return matchesDay && matchesType && (!query.trim() || text.includes(query.trim().toLowerCase()))
  }
  const visible = events.filter(event => {
    const matchesHidden = showHidden || routeState.group === 'sold_out' ? true : event.state !== 'hidden' && event.state !== 'nope'
    const matchesRouteGroup = routeState.group === 'sold_out' ? event.availability === 'sold-out' : true
    return matchesHidden && matchesRouteGroup && matchesSearchAndDay(event)
  })
  const { active: availabilityActive, soldOut: soldOutMatches } = partitionExploreAvailability(visible)
  const { contenders: exploreContenders, remainder: exploreRemainder } = partitionExploreContenders(availabilityActive)
  const hiddenCount = events.filter(event => event.state === 'hidden' || event.state === 'nope').length
  const hiddenMatches = events.filter(event => (event.state === 'hidden' || event.state === 'nope') && matchesSearchAndDay(event))
  const ticketedVisibleCount = visible.filter(event => event.kind === 'Ticketed play').length
  const hasOtherEvents = events.some(event => event.type === 'other')
  const exploreDays: ExploreEvent['day'][] = ['Thu', 'Fri', 'Sat', 'Sun']
  const exploreDayLabels: Record<ExploreEvent['day'], string> = { Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }
  const exploreGroups = (day === 'all' ? exploreDays : [day])
    .map(groupDay => ({ key: groupDay, label: exploreDayLabels[groupDay], hint: exploreDayContext(groupDay), items: exploreRemainder.filter(event => event.day === groupDay) }))
    .filter(group => group.items.length > 0)
  const toggleExploreGroup = (key: string) => setCollapsedExploreGroups(groups => groups.includes(key) ? groups.filter(item => item !== key) : [...groups, key])

  useEffect(() => {
    if (exploreIdentityDefaultApplied.current || currentPerson !== 'Kyle' || routeState.group || focusRequest) return
    exploreIdentityDefaultApplied.current = true
    setCollapsedExploreGroups(groups => groups.includes('Thu') ? groups : ['Thu', ...groups])
  }, [currentPerson, focusRequest, routeState.group])

  const updateEvent = (id: string, state: ExploreState) => {
    onUpdateEvent(id, state)
  }

  useEffect(() => {
    if (routeState.day) setDay(routeState.day)
    if (routeState.eventType) setEventType(routeState.eventType)
    if (routeState.group) setCollapsedExploreGroups([])
    if (routeState.group === 'sold_out') setSoldOutExpanded(true)
  }, [routeState.day, routeState.eventType, routeState.group, routeState.mode])

  useEffect(() => {
    if (!focusRequest) return
    const event = events.find(candidate => candidate.id === focusRequest.eventId)
    if (!event) return
    setDay(event.day)
    setEventType('all')
    setShowHidden(event.state === 'hidden' || event.state === 'nope')
    if (event.availability === 'sold-out') setSoldOutExpanded(true)
    setCollapsedExploreGroups(groups => groups.filter(group => group !== event.day && group !== 'contenders'))
    setSelectedId(event.id)
    setDetailOpen(true)
    window.setTimeout(() => {
      const row = Array.from(eventListRef.current?.querySelectorAll<HTMLElement>('[data-event-id]') ?? []).find(candidate => candidate.dataset.eventId === event.id)
      row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 0)
  }, [events, focusRequest])

  useEffect(() => {
    const updateDetailTop = () => {
      const list = eventListRef.current
      if (!list || window.innerWidth <= 900) return
      const listPageTop = list.getBoundingClientRect().top + window.scrollY
      setDetailTop(Math.max(12, listPageTop - window.scrollY))
    }
    updateDetailTop()
    window.addEventListener('scroll', updateDetailTop, { passive: true })
    window.addEventListener('resize', updateDetailTop)
    return () => {
      window.removeEventListener('scroll', updateDetailTop)
      window.removeEventListener('resize', updateDetailTop)
    }
  }, [visible.length, showHidden, day, eventType, query])

  useEffect(() => {
    const updateWorkbarPin = () => {
      const workbar = workbarRef.current
      if (!workbar) return
      setWorkbarHeight(workbar.offsetHeight)
      if (!workbar.classList.contains('pinned')) {
        workbarStartRef.current = workbar.getBoundingClientRect().top + window.scrollY
      }
      setWorkbarPinned(window.scrollY > workbarStartRef.current)
    }
    updateWorkbarPin()
    window.addEventListener('scroll', updateWorkbarPin, { passive: true })
    window.addEventListener('resize', updateWorkbarPin)
    return () => {
      window.removeEventListener('scroll', updateWorkbarPin)
      window.removeEventListener('resize', updateWorkbarPin)
    }
  }, [])

  return <section className="explore-surface">
    <div ref={workbarRef} className={`surface-workbar explore-workbar ${workbarPinned ? 'pinned' : ''}`} data-tour-target="explore-controls">
      <div className="explore-toolbar">
        <label className="explore-search"><span aria-hidden="true">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find event, format, guest" /></label>
      </div>

      <div className="explore-list-head">
        <div className="explore-list-filters">
          <div className="explore-days" aria-label="Event days">
            {(['all', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map(value => <button key={value} type="button" className={day === value ? 'active' : ''} onClick={() => setDay(value)}>{value === 'all' ? 'All days' : value}</button>)}
          </div>
          <div className="explore-type-tabs" aria-label="Event types">
            {([
              ['all', 'All types'],
              ['play', 'Play'],
              ['info', 'Info'],
              ['social', 'Social'],
              ['other', 'Other'],
            ] as const).filter(([value]) => value !== 'other' || hasOtherEvents).map(([value, label]) => <button key={value} type="button" className={eventType === value ? 'active' : ''} onClick={() => setEventType(current => current === value && value !== 'all' ? 'all' : value)}>{label}</button>)}
          </div>
          <button className={`explore-hidden-pill ${showHidden ? 'active' : ''}`} type="button" aria-pressed={showHidden} onClick={() => setShowHidden(value => !value)}><EyeOffMini /> Hidden{hiddenCount > 0 ? ` ${hiddenCount}` : ''}</button>
        </div>
      </div>
    </div>
    {workbarPinned && <div className="workbar-spacer" style={{ height: workbarHeight }} aria-hidden="true" />}

    <div className={`explore-layout ${selected ? 'has-detail' : ''}`}>
      <div ref={eventListRef} className="event-list" aria-label="Event results">
        <div className="event-list-summary"><strong>{visible.length}</strong><span>events in view</span></div>
        {routeGroupLabel && <div className="explore-route-chip"><span>{routeGroupLabel}</span></div>}
        {exploreContenders.length > 0 && <section className="explore-row-group explore-contender-group">
          <button className="funnel-group-header" type="button" aria-expanded={!collapsedExploreGroups.includes('contenders')} onClick={() => toggleExploreGroup('contenders')}>
            <span><strong>Your contenders</strong><small>Interested and tentative</small></span>
            <em>{exploreContenders.length}</em>
            <b aria-hidden="true">⌄</b>
          </button>
          {!collapsedExploreGroups.includes('contenders') && exploreContenders.map(event => <ExploreEventRow key={event.id} event={event} selected={selected?.id === event.id} onPurchase={purchased => onPurchase(event.id, purchased)} onSelect={() => {
            if (selectedId === event.id && detailOpen) {
              setSelectedId(null)
              setDetailOpen(false)
              return
            }
            setSelectedId(event.id)
            setDetailOpen(true)
          }} onState={state => updateEvent(event.id, state)} />)}
        </section>}
        {exploreGroups.map(group => {
          const collapsed = collapsedExploreGroups.includes(group.key)
          return <section className="explore-row-group" key={group.key}>
            <button className="funnel-group-header" type="button" aria-expanded={!collapsed} onClick={() => toggleExploreGroup(group.key)}>
              <span><strong>{group.label}</strong><small>{group.hint}</small></span>
              <em>{group.items.length}</em>
              <b aria-hidden="true">⌄</b>
            </button>
            {!collapsed && group.items.map(event => <ExploreEventRow key={event.id} event={event} selected={selected?.id === event.id} onPurchase={purchased => onPurchase(event.id, purchased)} onSelect={() => {
              if (selectedId === event.id && detailOpen) {
                setSelectedId(null)
                setDetailOpen(false)
                return
              }
              setSelectedId(event.id)
              setDetailOpen(true)
            }} onState={state => updateEvent(event.id, state)} />)}
          </section>
        })}
        {soldOutMatches.length > 0 && <section className={`hidden-drawer sold-out-drawer ${soldOutExpanded ? 'expanded' : ''}`} aria-label="Sold out events">
          <button type="button" className="hidden-toggle" aria-expanded={soldOutExpanded} onClick={() => setSoldOutExpanded(value => !value)}>
            <span>Sold out</span>
            <small>{soldOutMatches.length} matching · current registration status</small>
            <b aria-hidden="true">⌄</b>
          </button>
          {soldOutExpanded && <div className="hidden-drawer-list">
            {soldOutMatches.map(event => <ExploreEventRow key={event.id} event={event} selected={selected?.id === event.id} onPurchase={purchased => onPurchase(event.id, purchased)} onSelect={() => {
              if (selectedId === event.id && detailOpen) { setSelectedId(null); setDetailOpen(false); return }
              setSelectedId(event.id); setDetailOpen(true)
            }} onState={state => updateEvent(event.id, state)} />)}
          </div>}
        </section>}
        {visible.length === 0 && <div className="event-empty">No events match this view. Try All or clear search.</div>}
        {!showHidden && routeState.group !== 'sold_out' && hiddenCount > 0 && <section className={`hidden-drawer ${hiddenExpanded ? 'expanded' : ''}`} aria-label="Hidden and not-for-me events">
          <button type="button" className="hidden-toggle" onClick={() => setHiddenExpanded(value => !value)}>
            <span><EyeOffMini /> Hidden / not for me</span>
            <small>{hiddenMatches.length} matching · recoverable</small>
            <b aria-hidden="true">⌄</b>
          </button>
          {hiddenExpanded && <div className="hidden-drawer-list">
            {hiddenMatches.map(event => <ExploreEventRow key={event.id} event={event} selected={selected?.id === event.id} onPurchase={purchased => onPurchase(event.id, purchased)} onSelect={() => {
              if (selectedId === event.id && detailOpen) {
                setSelectedId(null)
                setDetailOpen(false)
                return
              }
              setSelectedId(event.id)
              setDetailOpen(true)
            }} onState={state => updateEvent(event.id, state)} />)}
          </div>}
        </section>}
      </div>

      {selected && <div className="explore-detail-slot" style={{ top: workbarPinned ? workbarHeight + 12 : detailTop }}>
        <ExploreDetail event={selected} onPurchase={purchased => onPurchase(selected.id, purchased)} focusedNoteId={focusRequest?.eventId === selected.id ? focusRequest.noteId : undefined} notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} open={detailOpen} onClose={() => { setSelectedId(null); setDetailOpen(false) }} onState={state => updateEvent(selected.id, state)} onOpenPlan={onOpenPlan} />
      </div>}
    </div>
  </section>
}

function ExploreEventRow({ event, selected, onSelect, onState, onPurchase }: { event: ExploreEvent; selected: boolean; onSelect: () => void; onState: (state: ExploreState) => void; onPurchase: (purchased: boolean) => void }) {
  const kindIcon: EventKindIconName = event.type === 'play' ? 'play' : event.type === 'info' ? 'info' : event.type === 'social' ? 'social' : event.kind === 'Competitive' ? 'competitive' : 'ticketed'
  const blackLotus = event.kind === 'Black Lotus'
  const priceTone = getPriceTone(event.price)
  const [showCommitHint, setShowCommitHint] = useState(false)
  useEffect(() => {
    if (!showCommitHint) return
    const timer = window.setTimeout(() => setShowCommitHint(false), 2200)
    return () => window.clearTimeout(timer)
  }, [showCommitHint])
  return <article className={`explore-event ${selected ? 'selected' : ''} state-${event.state} type-${event.type} complexity-${event.complexity}`} data-event-id={event.id} data-availability={event.availability} onClick={clickEvent => {
    if ((clickEvent.target as HTMLElement).closest('button, a, input, textarea, select')) return
    onSelect()
  }}>
    <button className="explore-event-main" type="button" onClick={onSelect}>
      <span className="event-type-icon" aria-label={`${event.type} event`} data-kind-label={`${event.type} event`}><EventKindIcon name={kindIcon} /></span>
      <span className="event-title-block">
        <strong>{displayEventTitle(event)}</strong>
        <small>{event.day} · {event.time}</small>
      </span>
      <span className="event-scan">
        {canPurchaseEvent(event.price) ? <PurchaseControl event={event} onPurchase={onPurchase} /> : <span className={`event-price price-${priceTone}`}><EventPriceLabel event={event} icon /></span>}
      </span>
    </button>
    <div className="explore-hide-action"><IconAction label="Hide from this list" icon="eyeOff" pressed={event.state === 'hidden'} onClick={() => onState('hidden')} /></div>
    {blackLotus && <span className="event-source-mark" title="Black Lotus" aria-label="Black Lotus"><EventKindIcon name="lotus" /></span>}
    <div className="explore-event-meta">
      <span>{event.format}</span>
      {event.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}
    </div>
    <p>{event.fit}</p>
    <div className="explore-actions" aria-label={`${event.title} actions`}>
      <IconAction label="Interested" icon="bookmark" pressed={event.state === 'interested'} onClick={() => onState('interested')} />
      <IconAction label="Tentative" icon="diamond" pressed={event.state === 'tentative'} onClick={() => onState('tentative')} />
      <IconAction label={event.state === 'committed' ? 'Committed — manage in Plan' : 'Commit from Plan'} icon="check" pressed={event.state === 'committed'} onClick={() => setShowCommitHint(true)} />
      {showCommitHint && <span className="commit-route-hint" role="status">{event.state === 'committed' ? 'This event is committed. Manage it in Plan.' : 'Choose Interested or Tentative first, then commit it in Plan.'}</span>}
    </div>
  </article>
}

function formatEventPrice(price: string) {
  if (price.toLowerCase() === 'included') return 'Included'
  if (price.toLowerCase() === 'free') return 'Free'
  return price
}

function EventPriceLabel({ event, icon = false }: { event: ExploreEvent; icon?: boolean }) {
  const blackLotusIncluded = event.kind === 'Black Lotus' && event.price.toLowerCase() === 'included'
  return <>{blackLotusIncluded
    ? <span className="included-lotus-icon" aria-label="Black Lotus included"><EventKindIcon name="lotus" /></span>
    : icon && <DetailFactIcon name="price" />}{formatEventPrice(event.price)}</>
}

function getPriceTone(price: string) {
  const lower = price.toLowerCase()
  if (lower === 'included' || lower === 'free') return 'free'
  const amount = Number(price.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(amount)) return 'free'
  if (amount < 100) return 'low'
  if (amount <= 200) return 'mid'
  return 'high'
}

function ExploreDetail({ event, focusedNoteId, notes, currentOwnerId, onAddNote, onDeleteNote, open, onClose, onState, onPurchase, onOpenPlan }: { event: ExploreEvent; focusedNoteId?: string; notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; open: boolean; onClose: () => void; onState: (state: ExploreState) => void; onPurchase: (purchased: boolean) => void; onOpenPlan: () => void }) {
  const planEnabled = event.state === 'interested' || event.state === 'tentative'
  return <aside className="explore-detail event-detail-panel" data-open={open} aria-label={`${event.title} detail`}>
    <header className="detail-title-group event-detail-heading">
      <div className="detail-head">
        <span className={`detail-kind ${event.kind === 'Black Lotus' ? 'lotus' : ''}`}>{event.kind}</span>
        <span className="detail-head-actions">
          {planEnabled && <button className="detail-plan-link detail-plan-link-header" type="button" onClick={onOpenPlan}>Compare in Plan <span aria-hidden="true">›</span></button>}
          <span className={`event-stage stage-${event.state}`}>{eventStageLabel(event.state)}</span>
          <button className="detail-close explore-close" type="button" onClick={onClose} aria-label="Close event detail">×</button>
        </span>
      </div>
      <h2>{displayEventTitle(event)}</h2>
      <div className="detail-facts">
        <span><DetailFactIcon name="time" />{event.day} · {event.time}</span>
        {!canPurchaseEvent(event.price) && <span><EventPriceLabel event={event} icon /></span>}
        <span><DetailFactIcon name="duration" />{event.window}</span>
      </div>
      <EventDetailActions event={event} onPurchase={onPurchase} />
      <EventStateRail event={event} context="explore" onState={onState} />
    </header>
    <div className="detail-intel event-context-block"><span aria-hidden="true">✧</span><p><small>OFFICIAL DESCRIPTION</small>{renderLinkedText(event.detail)}</p></div>
    <section className="detail-section decision-section">
      <div className="format-heading"><strong>{event.format}</strong>{event.formatHelp && <details className="format-help"><summary aria-label={`Explain ${event.format}`}>?</summary><p>{event.formatHelp}</p></details>}</div>
      {eventDecisionFacts(event).length > 0 && <div className="decision-facts" aria-label="Event at a glance">{eventDecisionFacts(event).map(fact => <div key={fact.label} className={isWideEventDetail(fact.label) ? 'decision-fact-wide' : undefined}><span>{fact.icon === 'ticket' && <TicketMiniIcon />}{fact.label}</span><strong>{fact.value}</strong></div>)}</div>}
      <p className="complexity-note"><span aria-hidden="true"><FlameGlyph /> Assessment:</span> {event.complexityWhy}</p>
    </section>
    <section className="detail-section plan-summary">
      <strong>Plan effect</strong>
      <p>{event.planEffect}</p>
    </section>
    <ObjectNotes notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} objectId={`explore-${event.id}`} objectKind="event" objectTitle={displayEventTitle(event)} focusedNoteId={focusedNoteId} context={`Event · ${displayEventTitle(event)}`} backlink="explore" compact />
    {(eventMoreDetails(event).length > 0 || event.sourceNote) && <details className="detail-more">
      <summary><span>More details</span></summary>
      <div className="detail-more-body">
        {eventMoreDetails(event).map(item => <div className="more-row" key={item.label}><span>{item.label}</span><p>{renderLinkedText(item.value)}</p></div>)}
        {event.sourceNote && <div className="more-row source-row"><span>Source</span><p>{renderLinkedText(event.sourceNote)}</p></div>}
      </div>
    </details>}
  </aside>
}

function eventStageLabel(state: ExploreState) {
  if (state === 'interested') return 'Interested'
  if (state === 'tentative') return 'Tentative'
  if (state === 'committed') return 'Committed'
  if (state === 'hidden') return 'Hidden'
  if (state === 'nope') return 'Not for me'
  return 'Discovering'
}

function EventStateRail({ event, context, onState, disabled = false, canCommit = true }: { event: ExploreEvent; context: 'explore' | 'plan' | 'calendar'; onState: (state: ExploreState) => void; disabled?: boolean; canCommit?: boolean }) {
  const [showCommitHint, setShowCommitHint] = useState(false)
  useEffect(() => {
    if (!showCommitHint) return
    const timer = window.setTimeout(() => setShowCommitHint(false), 2200)
    return () => window.clearTimeout(timer)
  }, [showCommitHint])
  return <div className="event-state-rail" aria-label={`${event.title} funnel state`}>
    {([['interested', 'Interested'], ['tentative', 'Tentative'], ['committed', 'Committed']] as const).map(([state, label]) => {
      const commitElsewhere = context === 'explore' && state === 'committed'
      const isDisabled = disabled || Boolean(event.purchased) || (state === 'committed' && !canCommit)
      const title = event.purchased ? 'Set by Purchased. Undo purchase to change commitment.' : commitElsewhere ? 'Commit from Plan after comparing the schedule' : state === 'committed' && !canCommit ? 'Only Kavi and Chris can commit Black Lotus events.' : label
      return <button key={state} type="button" className={`decision-state-${state}`} aria-pressed={event.state === state} disabled={isDisabled} title={title} onClick={() => commitElsewhere ? setShowCommitHint(true) : onState(state)}><b aria-hidden="true"><PlanningStateIcon state={state} /></b><span>{label}</span></button>
    })}
    {showCommitHint && <span className="commit-route-hint" role="status">{event.state === 'interested' || event.state === 'tentative' ? 'This event is in Plan. Commit it there after comparing.' : 'Choose Interested or Tentative first to move this event into Plan.'}</span>}
  </div>
}

function PlanningStateIcon({ state }: { state: 'interested' | 'tentative' | 'committed' }) {
  return <ActionIcon name={state === 'interested' ? 'bookmark' : state === 'tentative' ? 'diamond' : 'check'} />
}

function DetailFactIcon({ name }: { name: 'time' | 'price' | 'duration' }) {
  const paths = {
    time: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3.2 2" /></>,
    price: <><circle cx="12" cy="12" r="8.5" /><path d="M15 8.7c-.7-.8-1.7-1.2-3-1.2-1.7 0-2.8.8-2.8 2s1.1 1.8 2.8 2.2 2.8.8 2.8 2.2-1.1 2.1-2.8 2.1c-1.4 0-2.6-.5-3.3-1.4M12 5.8v12.4" /></>,
    duration: <><path d="M7 4h10M7 20h10M8 4c0 4 1.7 5.3 4 7 2.3-1.7 4-3 4-7M8 20c0-4 1.7-5.3 4-7 2.3 1.7 4 3 4 7" /></>,
  }
  return <svg className="detail-fact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function OfficialEventLink({ event }: { event: ExploreEvent }) {
  if (!event.officialUrl) return null
  return <a className="official-event-link" href={event.officialUrl} target="_blank" rel="noreferrer"><PaperclipIcon /><span>Official event details</span><span aria-hidden="true">↗</span></a>
}

function EventDetailActions({ event, onPurchase }: { event: ExploreEvent; onPurchase: (purchased: boolean) => void }) {
  return <div className="event-detail-actions">
    <OfficialEventLink event={event} />
    <PurchaseControl event={event} onPurchase={onPurchase} detail />
  </div>
}

function PaperclipIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9.5 12.5 5.7-5.7a3 3 0 0 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7.1-7.1l8.1-8.1" /><path d="m7.4 14.6 7.8-7.8" /></svg>
}

function TicketMiniIcon() {
  return <svg className="ticket-mini-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M12 7v2M12 11v2M12 15v2" /></svg>
}

function PurchaseControl({ event, onPurchase, detail = false }: { event: ExploreEvent; onPurchase: (purchased: boolean) => void; detail?: boolean }) {
  const [confirming, setConfirming] = useState(false)
  const controlRef = useRef<HTMLSpanElement | null>(null)
  const [confirmPosition, setConfirmPosition] = useState({ left: 16, top: 16 })
  useEffect(() => {
    if (!confirming) return
    const positionConfirmation = () => {
      const rect = controlRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = 176
      const height = 40
      const gap = 4
      setConfirmPosition({
        left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width)),
        top: rect.bottom + gap + height <= window.innerHeight ? rect.bottom + gap : Math.max(8, rect.top - height - gap),
      })
    }
    positionConfirmation()
    window.addEventListener('scroll', positionConfirmation, true)
    window.addEventListener('resize', positionConfirmation)
    return () => {
      window.removeEventListener('scroll', positionConfirmation, true)
      window.removeEventListener('resize', positionConfirmation)
    }
  }, [confirming])
  if (!canPurchaseEvent(event.price)) return null
  if (ticketedPurchasePresentation(event) === 'sold_out') return <span className={`event-price sold-out-status ${detail ? 'purchase-control-detail' : ''}`}>Sold out</span>
  return <span ref={controlRef} className={`purchase-control ${detail ? 'purchase-control-detail' : ''} ${event.purchased ? 'is-purchased' : ''}`} onClick={click => click.stopPropagation()}>
    <button type="button" disabled={event.purchaseLocked} aria-label={event.purchaseLocked ? `${event.title} purchase permanently locked` : event.purchased ? `Undo purchase for ${event.title}` : `Mark ${event.title} purchased`} aria-pressed={Boolean(event.purchased)} title={event.purchaseLocked ? 'Purchased · permanently locked' : event.purchased ? 'Undo purchase' : 'Mark purchased'} onClick={() => event.purchased ? onPurchase(false) : setConfirming(true)}>
      <ActionIcon name="ticket" /><span>{formatEventPrice(event.price)}</span><ActionIcon name={event.purchased ? 'lock' : 'unlock'} />
    </button>
    {event.availability === 'sold-out' && <span className="availability-marker">Sold out</span>}
    {confirming && createPortal(<span className="purchase-confirm purchase-confirm-portal" style={confirmPosition} role="group" aria-label="Confirm purchase"><span>Mark purchased?</span><button type="button" onClick={() => { onPurchase(true); setConfirming(false) }}>Yes</button><button type="button" onClick={() => setConfirming(false)}>No</button></span>, document.body)}
  </span>
}

function IconAction({ label, icon, pressed, onClick }: { label: string; icon: ActionIconName; pressed: boolean; onClick: () => void }) {
  return <button type="button" className={`icon-action-${icon}`} aria-label={label} aria-pressed={pressed} title={label} onClick={onClick}><ActionIcon name={icon} /></button>
}

function ActionIcon({ name }: { name: ActionIconName }) {
  const paths: Record<ActionIconName, ReactNode> = {
    bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v16l-6-3.4L6 21V5a1 1 0 0 1 1-1Z" />,
    diamond: <path d="M12 3 21 12 12 21 3 12Z" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    unlock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M16 10V7a4 4 0 0 0-7.5-2" /></>,
    check: <path d="m4 12 5 5L20 6" />,
    ticket: <><path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M12 7v2M12 11v2M12 15v2" /></>,
    eyeOff: <><path d="M3 3l18 18" /><path d="M9.8 9.8A3 3 0 0 0 14.2 14.2" /><path d="M6.5 6.9C4.7 8 3.2 9.7 2 12c2.2 4.1 5.5 6.1 10 6.1 1.4 0 2.7-.2 3.8-.7" /><path d="M10.8 5.9c.4 0 .8-.1 1.2-.1 4.5 0 7.8 2 10 6.1-.5 1-1.1 1.9-1.8 2.7" /></>,
    sign: <><path d="M14.5 3.5 20.5 9.5 11.5 18.5 5.5 20.5 7.5 14.5 14.5 3.5Z" /><path d="M13 5 19 11" /><path d="M7.5 14.5 11.5 18.5" /><path d="M9.5 16.5 8.2 17.8" /></>,
    heart: <path d="M20.8 8.6c0 5.1-8.8 10.4-8.8 10.4S3.2 13.7 3.2 8.6A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.8 1.9Z" />,
  }
  return <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function EventKindIcon({ name }: { name: EventKindIconName }) {
  const paths: Record<EventKindIconName, ReactNode> = {
    lotus: <><path d="M12 4c1.9 2 2.8 4.1 2.7 6.3 2.1-.9 4.2-.9 6.3.1-1.7 3.8-4.6 5.9-8.7 6.1h-.6c-4.1-.2-7-2.3-8.7-6.1 2.1-1 4.2-1 6.3-.1C9.2 8.1 10.1 6 12 4Z" /><path d="M12 16.4V20" /></>,
    panel: <><path d="M5 19l3.8-1 9.4-9.4a2.1 2.1 0 0 0-3-3L5.8 15 5 19Z" /><path d="M13.7 6.1l4.2 4.2" /></>,
    competitive: <><path d="M12 3l7.5 4v5.2c0 4.1-2.7 7.2-7.5 8.8-4.8-1.6-7.5-4.7-7.5-8.8V7L12 3Z" /><path d="M12 8v5" /><path d="M12 16h.01" /></>,
    ticketed: <><path d="M4 7.5A2.5 2.5 0 0 0 6.5 5h11A2.5 2.5 0 0 0 20 7.5v9A2.5 2.5 0 0 0 17.5 19h-11A2.5 2.5 0 0 0 4 16.5v-9Z" /><path d="M8 9h8" /><path d="M8 12h8" /><path d="M8 15h5" /></>,
    play: <><rect x="5" y="6" width="11" height="14" rx="2" /><path d="m9 6 1-2h9v13l-3 1" /><path d="M8 10h5M8 14h5" /></>,
    info: <><circle cx="12" cy="12" r="8" /><path d="M12 11v5M12 8h.01" /></>,
    social: <><circle cx="9" cy="9" r="3" /><circle cx="16.5" cy="10.5" r="2.5" /><path d="M4 19c.6-3.2 2.3-4.8 5-4.8s4.4 1.6 5 4.8M14 15c2.8 0 4.5 1.3 5 4" /></>,
  }
  return <svg className="event-kind-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function MilestoneIcon({ name }: { name: MilestoneIconName }) {
  const paths: Record<MilestoneIconName, ReactNode> = {
    badges: <><rect x="6" y="5" width="12" height="16" rx="2" /><path d="M9 5V3h6v2" /><path d="M9 11h6" /><path d="M9 15h4" /></>,
    'ticketed-play': <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="M8 14h.01M12 14h.01M16 14h.01" /></>,
    artists: <><path d="M4 20l4.5-1 9-9a2.2 2.2 0 0 0-3.1-3.1l-9 9Z" /><path d="m13.5 8 2.5 2.5" /></>,
    'black-lotus-store': <><path d="M7 20h10l1-9H6Z" /><path d="M9 11a3 3 0 0 1 6 0" /><path d="M12 8c-1.8 1.5-2.7 3-2.7 4.6 0 1.8 1.2 3.1 2.7 3.9 1.5-.8 2.7-2.1 2.7-3.9 0-1.6-.9-3.1-2.7-4.6Z" /></>,
    'show-catalog': <><path d="M6 4h12v16H6Z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  }
  return <svg className="milestone-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.05" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function EyeOffMini() {
  return <svg className="mini-inline-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18" /><path d="M6.5 6.9C4.7 8 3.2 9.7 2 12c2.2 4.1 5.5 6.1 10 6.1 1.4 0 2.7-.2 3.8-.7" /><path d="M10.8 5.9c.4 0 .8-.1 1.2-.1 4.5 0 7.8 2 10 6.1-.5 1-1.1 1.9-1.8 2.7" /></svg>
}

function FlameGlyph() {
  return <svg className="flame-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13.6 3.5c.5 3.4-2.8 4.6-2.8 7.3 0 1.1.7 2 1.8 2.3.2-1.8 1.2-3 2.8-4 2.1 1.6 3.4 3.6 3.4 6A6.7 6.7 0 0 1 12 21a6.7 6.7 0 0 1-6.8-5.9c0-3.2 2.1-5.4 4-7.2 1.4-1.4 2.8-2.6 4.4-4.4Z" /></svg>
}

function ComplexityPill({ level }: { level: ComplexityLevel }) {
  const labels: Record<ComplexityLevel, string> = { easy: 'Easy', focused: 'Focused', demanding: 'Demanding', 'very-hard': 'Hard', unknown: 'Unknown', inconclusive: 'Inconclusive' }
  const values: Record<ComplexityLevel, number> = { easy: 1, focused: 3, demanding: 4, 'very-hard': 5, unknown: 0, inconclusive: 0 }
  const value = values[level]
  return <span className={`complexity-pill ${level}`} aria-label={`Complexity: ${labels[level]}`} title={`Complexity: ${labels[level]}`}>
    <FlameGlyph />
    <span className="temp-bars" aria-hidden="true">{[1, 2, 3, 4, 5].map(item => <i key={item} className={value >= item ? 'filled' : ''} />)}</span>
  </span>
}

function ObjectNotes({ notes, currentOwnerId, onAddNote, onDeleteNote, objectId, objectKind, objectTitle, objectAnchor, focusedNoteId, context, backlink, compact, companions, currentSession }: {
  notes: ContextNote[]
  currentOwnerId?: string
  onAddNote: (input: AddContextNoteInput) => void
  onDeleteNote: (id: string) => void
  objectId: string
  objectKind: ObjectDetailKind
  objectTitle: string
  objectAnchor?: string
  focusedNoteId?: string
  context: string
  backlink: Surface
  compact?: boolean
  companions?: CompanionMember[]
  currentSession?: Session | null
}) {
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<NoteVisibility>('shared')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const focusedNoteRef = useRef<HTMLElement | null>(null)
  const mentionPreview = mentionPreviewFromBody(body, companions ?? fallbackCompanionMembers, currentSession ?? null)
  const objectNotes = notes
    .filter(note => note.objectId === objectId && (!objectAnchor || note.objectAnchor === objectAnchor))
    .sort((a, b) => (a.id === focusedNoteId ? -1 : b.id === focusedNoteId ? 1 : 0))
  useEffect(() => {
    if (!focusedNoteId) return
    const timer = window.setTimeout(() => focusedNoteRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
    return () => window.clearTimeout(timer)
  }, [focusedNoteId, objectId])
  const submit = () => {
    const trimmed = body.trim()
    if (!trimmed) return
    onAddNote({ objectId, objectKind, objectTitle, objectAnchor, context, body: trimmed, visibility, backlink })
    setBody('')
    setVisibility('shared')
  }

  return <section className={`object-notes ${compact ? 'compact' : ''}`} aria-label={`Notes for ${objectTitle}`}>
    <header>
      <div><span className="eyebrow">NOTES</span><h3>{objectNotes.length ? `${objectNotes.length} contextual ${objectNotes.length === 1 ? 'note' : 'notes'}` : 'Add a note'}</h3></div>
      {objectNotes.length > 0 && <span className="note-author-cluster"><PersonBubbles people={[...new Set(objectNotes.map(note => note.author))]} /></span>}
    </header>
    {objectNotes.length > 0 && <div className="note-thread">
      {objectNotes.map(note => <article key={note.id} ref={note.id === focusedNoteId ? focusedNoteRef : undefined} className={`note-item ${note.id === focusedNoteId ? 'focused' : ''}`}>
        <PersonBubbles people={[note.author]} />
        <div><p>{note.body}</p><small>{note.author} · {note.updatedAt} · {note.visibility}{note.objectAnchor ? ` · ${note.objectAnchor}` : ''}</small></div>
        {note.ownerId === currentOwnerId && <button type="button" className="note-delete" aria-label={`Delete note from ${note.author}`} onClick={() => setConfirmDeleteId(note.id)}>×</button>}
        {note.ownerId === currentOwnerId && confirmDeleteId === note.id && <div className="note-delete-confirm" role="alert">
          <span>Delete?</span>
          <button type="button" onClick={() => { onDeleteNote(note.id); setConfirmDeleteId(null) }}>Yes</button>
          <button type="button" onClick={() => setConfirmDeleteId(null)}>No</button>
        </div>}
      </article>)}
    </div>}
    <div className="note-composer">
      <textarea value={body} onChange={event => setBody(event.target.value)} rows={compact ? 2 : 3} placeholder={`Note on ${objectTitle}`} />
      <small className="note-mention-hint">Use @Kavi, @Chris, @Juan, or @Kyle to mention a companion.</small>
      {mentionPreview.length > 0 && <div className="note-mention-preview" aria-label="Recognized mentions">
        <span>Will notify</span>
        {mentionPreview.map(item => <strong key={item.key}><PersonBubbles people={[item.person]} />{item.token}</strong>)}
      </div>}
      <div className="note-composer-actions">
        <label className="note-private-inline">
          <span>Private only me</span>
          <input type="checkbox" checked={visibility === 'private'} onChange={event => setVisibility(event.target.checked ? 'private' : 'shared')} />
        </label>
        <button type="button" className="note-save" onClick={submit} disabled={!body.trim()}>Save note</button>
      </div>
    </div>
  </section>
}

function noteType(note: ContextNote): NoteTypeFilter {
  if (note.backlink === 'wallet' || note.objectKind === 'receipt') return 'wallet'
  if (note.backlink === 'trip' || note.objectKind === 'hotel' || note.objectKind === 'place') return 'trip'
  if (['calendar', 'plan', 'explore'].includes(note.backlink) || note.objectKind === 'event') return 'events'
  return 'other'
}

function NotesFilterBar({
  notes,
  personFilter,
  typeFilter,
  onPersonFilter,
  onTypeFilter,
}: {
  notes: ContextNote[]
  personFilter: NotePersonFilter
  typeFilter: NoteTypeFilter
  onPersonFilter: (filter: NotePersonFilter) => void
  onTypeFilter: (filter: NoteTypeFilter) => void
}) {
  const people = [...new Set(notes.map(note => note.author))]
  const types: Array<{ value: NoteTypeFilter; label: string; count: number }> = [
    { value: 'all', label: 'All types', count: notes.length },
    { value: 'wallet', label: 'Wallet', count: notes.filter(note => noteType(note) === 'wallet').length },
    { value: 'trip', label: 'Trip', count: notes.filter(note => noteType(note) === 'trip').length },
    { value: 'events', label: 'Events', count: notes.filter(note => noteType(note) === 'events').length },
    { value: 'other', label: 'Other', count: notes.filter(note => noteType(note) === 'other').length },
  ]
  return <div className="notes-filter-bar" aria-label="Note filters">
    <div className="notes-filter-group people">
      <span>People</span>
      <button type="button" className={personFilter === 'all' ? 'active text' : 'text'} onClick={() => onPersonFilter('all')}>All {notes.length}</button>
      {people.map(person => <button key={person} type="button" className={personFilter === person ? 'active bubble-button' : 'bubble-button'} onClick={() => onPersonFilter(person)} aria-label={`Show ${person}'s notes`}>
        <PersonBubbles people={[person]} />
        <small>{notes.filter(note => note.author === person).length}</small>
      </button>)}
    </div>
    <div className="notes-filter-group types">
      <span>Type</span>
      {types.map(type => <button key={type.value} type="button" className={typeFilter === type.value ? 'active text' : 'text'} onClick={() => onTypeFilter(type.value)} disabled={type.count === 0 && type.value !== 'all'}>{type.label} {type.count}</button>)}
    </div>
  </div>
}

function TravelerDots({ people }: { people: Array<'Kavi' | 'Juan' | 'Chris' | 'Kyle'> }) {
  return <span className="traveler-dots" aria-label={people.join(', ')}>{people.map(person => <span key={person} className={`traveler-dot ${person.toLowerCase()}`} title={person}>{person === 'Kyle' ? 'Ky' : person[0]}</span>)}</span>
}

function MapSurface({ onOpenTrip }: { onOpenTrip: () => void }) {
  return <section className="map-shell" aria-label="Map">
    <div className="map-surface map-surface-orientation">
      <article className="map-card trip-area-card">
        <span className="eyebrow">ORIENTATION NOW</span>
        <h2>Omni to Building C, visually.</h2>
        <p>The Omni sits east of the campus, and Building C is the west-side target.</p>
        <div className="campus-photo-map" aria-label="Aerial-style Omni to GWCC Building C orientation map">
          <img src="./gwcc-campus-reference.png" alt="Aerial view showing the Omni hotel on the east side of Georgia World Congress Center and Building C on the west side." />
          <button type="button" className="campus-label omni-label" onClick={onOpenTrip}>
            <strong>Omni</strong>
            <small>hotel base</small>
          </button>
          <span className="campus-label building-c-label">
            <strong>GWCC Building C</strong>
            <small>MagicCon target</small>
          </span>
          <span className="campus-label building-b-label">
            <strong>Building B</strong>
            <small>middle campus</small>
          </span>
          <span className="campus-label route-label">
            <strong>Walk west</strong>
            <small>hotel → venue</small>
          </span>
        </div>
        <div className="map-quick-facts">
          <span><strong>Venue</strong>GWCC Building C</span>
          <span><strong>Hotel base</strong>Omni at Centennial Park</span>
          <span><strong>Useful cue</strong>Building C sits farther west, toward Mercedes-Benz Stadium / Northside Dr.</span>
        </div>
      </article>
    </div>
  </section>
}

function infoSources(sources: InfoSource[]) {
  return sources.filter((source): source is InfoSource & { url: string } => Boolean(source.url)).map(source => ({ label: source.label, url: source.url }))
}

function infoTopicDetail(topic: InfoTopic, feed: InfoFeedEntry[]): ObjectDetail {
  if (infoTopicUsesReader(topic) && topic.article) return {
    id: `info-topic-${topic.id}`,
    kind: 'alert',
    kindLabel: 'Guide',
    eyebrow: 'MAINTAINED INFO',
    title: topic.title,
    summary: topic.article.lede,
    reader: {
      sections: topic.article.sections,
      unknowns: topic.article.unknowns,
      contradictions: topic.article.contradictions,
      recentChanges: topic.article.recent_changes,
      sources: topic.sources,
    },
  }
  const related = relatedInfoFeed(topic.topic_key, feed)
  return {
    id: `info-topic-${topic.id}`,
    kind: 'alert',
    kindLabel: 'Info',
    eyebrow: 'QUICK ANSWER',
    title: topic.title,
    summary: topic.concise_answer,
    facts: topic.facts,
    links: infoSources(topic.sources),
    rationale: related.length ? related.map(entry => `${entry.title}: ${entry.summary}`).join('\n') : undefined,
    rationaleLabel: 'Recent changes',
    source: { label: `Updated ${new Date(topic.updated_at).toLocaleDateString()}`, value: topic.sources.map(source => `${source.label}${source.detail ? ` · ${source.detail}` : ''}`).join('\n') || 'Maintained trip reference' },
    backlinks: [{ label: 'Info', destination: 'info' }],
  }
}

function infoFact(topic: InfoTopic | undefined, label: string) {
  const normalizedLabel = label.toLowerCase()
  return topic?.facts.find(fact => fact.label.toLowerCase() === normalizedLabel || fact.label.toLowerCase().includes(normalizedLabel))?.value
}

function infoCatalogItemDetail(catalog: InfoCatalog, item: InfoCatalogItem): ObjectDetail {
  return {
    id: `catalog-${catalog.id}-${item.id}`,
    kind: 'alert',
    kindLabel: 'Catalog item',
    eyebrow: catalog.precedentEvent.toUpperCase(),
    title: item.name,
    summary: item.note ?? `${item.category} shown only to prove the future catalog layout. This is not Atlanta inventory.`,
    facts: [
      { label: item.value.includes('Tix') ? 'Prize Tix' : 'Price', value: item.value },
      { label: 'Catalog', value: catalog.title },
      { label: 'Availability', value: item.availability === 'precedent' ? 'Prior-event precedent' : 'Awaiting Atlanta' },
    ],
    links: [{ label: catalog.sourceLabel, url: catalog.sourceUrl }],
    source: { label: 'QA-only precedent', value: 'This preview must never be treated as current Atlanta inventory.' },
    backlinks: [{ label: 'Info', destination: 'info' }],
  }
}

function catalogOfferDetail(offer: CatalogOffer, currentOwnerId?: string): ObjectDetail {
  const currentInterest = offer.interests.find(interest => interest.ownerId === currentOwnerId)?.interested === true
  const interested = offer.interests
    .filter(interest => interest.interested && interest.personKey)
    .map(interest => interest.displayName ?? interest.personKey)
    .filter((person): person is PersonName => typeof person === 'string' && ['Kavi', 'Juan', 'Chris', 'Kyle'].includes(person))
  const value = formatCatalogOfferValue(offer)
  const availability = offer.soldOut ? 'Sold out' : offer.availability === 'unknown' ? 'Status pending' : offer.availability.replaceAll('_', ' ')
  return {
    id: `catalog-offer-${offer.offer_id}`,
    catalogOfferId: offer.offer_id,
    kind: 'alert',
    kindLabel: 'Catalog item',
    eyebrow: offer.category.toUpperCase(),
    title: offer.product_name,
    summary: offer.description ?? offer.variant_label ?? `${offer.catalog_title} catalog item.`,
    image: offer.presentationUrl ? { src: offer.presentationUrl, alt: offer.product_name, tone: 'product' } : undefined,
    people: interested,
    facts: [
      { label: offer.family === 'prize_wall' || offer.prize_ticket_cost !== null ? 'Prize Tix' : 'Price', value },
      { label: 'Availability', value: availability },
      { label: 'Catalog', value: offer.catalog_title },
      ...(offer.variant_label ? [{ label: 'Variant', value: offer.variant_label }] : []),
      ...(currentOwnerId ? [{ label: 'Your list', value: currentInterest ? 'Saved' : 'Not saved' }] : []),
    ],
    links: offer.presentation_source_url ? [{ label: offer.presentation_source_provider ?? offer.observed_source_name, url: offer.presentation_source_url }] : undefined,
    source: { label: offer.observed_source_name, value: offer.presentation_source_url ? 'Canonical catalog record with retained presentation-image provenance.' : 'Canonical catalog record with retained source capture.' },
    backlinks: [{ label: 'Catalogs', destination: 'info' }],
  }
}

function InfoGuide({ topics, feed, onOpenObject }: { topics: InfoTopic[]; feed: InfoFeedEntry[]; onOpenObject: (detail: ObjectDetail) => void }) {
  const byKey = new Map(topics.map(topic => [topic.topic_key, topic]))
  const hours = byKey.get('hours')
  const willCall = byKey.get('will-call')
  const ticketedPlay = byKey.get('ticketed-play')
  const onDemand = byKey.get('on-demand-play')
  const prizeTix = byKey.get('prize-tix')
  const coreKeys = new Set(['hours', 'will-call', 'ticketed-play', 'on-demand-play', 'prize-tix'])
  const additionalTopics = topics.filter(topic => !coreKeys.has(topic.topic_key))
  const updatedTimes = topics.map(topic => new Date(topic.updated_at).getTime()).filter(Number.isFinite)
  const lastUpdated = updatedTimes.length ? new Date(Math.max(...updatedTimes)).toLocaleDateString() : null
  const sourceCount = new Set(topics.flatMap(topic => topic.sources.map(source => source.url ?? `${source.label}:${source.detail ?? ''}`))).size
  const openTopic = (topic: InfoTopic | undefined) => { if (topic) onOpenObject(infoTopicDetail(topic, feed)) }
  const floorDays = ['Friday', 'Saturday', 'Sunday'].map(day => ({ day, value: infoFact(hours, day) })).filter((row): row is { day: string; value: string } => Boolean(row.value))
  const magicPlayHours = infoFact(hours, 'magic play') ?? infoFact(hours, 'play area')

  return <section className="info-guide" role="tabpanel" aria-label="Guide">
    {hours && <section className="info-weekend-overview" aria-labelledby="info-weekend-heading">
      <div className="info-guide-heading"><div><span className="eyebrow">AT A GLANCE</span><h2 id="info-weekend-heading">Weekend hours</h2></div><span>Show floor</span></div>
      <div className="info-day-strip">{floorDays.map(row => <span key={row.day}><small>{row.day}</small><strong>{row.value}</strong></span>)}</div>
      {magicPlayHours && <p className="info-late-hours"><NavIcon name="activity" /><span><strong>Magic Play runs later.</strong> {magicPlayHours}</span></p>}
      <button type="button" className="info-guide-link" onClick={() => openTopic(hours)}>Open show-hours guide <span aria-hidden="true">→</span></button>
    </section>}

    <div className="info-guide-columns">
      {willCall && <section className="info-entry-guide" aria-labelledby="info-entry-heading">
        <div className="info-guide-heading"><div><span className="eyebrow">ARRIVAL</span><h2 id="info-entry-heading">Getting in</h2></div><span>Registration &amp; Will Call</span></div>
        <div className="info-entry-schedule">{willCall.facts.slice(0, 4).map(fact => <span key={`${willCall.topic_key}-${fact.label}`}><small>{fact.label}</small><strong>{fact.value}</strong></span>)}</div>
        <button type="button" className="info-guide-link" onClick={() => openTopic(willCall)}>Badge and entry details <span aria-hidden="true">→</span></button>
      </section>}

      {(ticketedPlay || onDemand || prizeTix) && <section className="info-play-guide" aria-labelledby="info-play-heading">
        <div className="info-guide-heading"><div><span className="eyebrow">PLAYING MAGIC</span><h2 id="info-play-heading">Three useful answers</h2></div></div>
        <div className="info-play-steps">
          {ticketedPlay && <article><span className="info-step-number">1</span><div><h3>Ticketed Play</h3><p>{ticketedPlay.concise_answer}</p><button type="button" onClick={() => openTopic(ticketedPlay)}>Full guide</button></div><strong>{infoFact(ticketedPlay, 'sales status') ?? infoFact(ticketedPlay, 'sales open') ?? 'Schedule ahead'}</strong></article>}
          {onDemand && <article><span className="info-step-number">2</span><div><h3>On-Demand Play</h3><p>{onDemand.concise_answer}</p><button type="button" onClick={() => openTopic(onDemand)}>How it works</button></div><strong>{[infoFact(onDemand, 'voucher increment'), infoFact(onDemand, 'maximum per visit')].filter(Boolean).join(' · ')}</strong></article>}
          {prizeTix && <article><span className="info-step-number">3</span><div><h3>Prize Tix</h3><p>{prizeTix.concise_answer}</p><button type="button" onClick={() => openTopic(prizeTix)}>Redemption guide</button></div><strong>{infoFact(prizeTix, 'sunday deadline') ?? infoFact(prizeTix, 'sunday line cutoff') ?? infoFact(prizeTix, 'redeem at') ?? 'Prize Wall'}</strong></article>}
        </div>
      </section>}
    </div>

    {additionalTopics.length > 0 && <section className="info-more-guide" aria-labelledby="info-more-heading">
      <div className="info-guide-heading"><div><span className="eyebrow">MORE TO KNOW</span><h2 id="info-more-heading">Weekend reference</h2></div></div>
      <div>{additionalTopics.map(topic => <button type="button" key={topic.topic_key} onClick={() => openTopic(topic)}><span><strong>{topic.title}</strong><small>{topic.concise_answer}</small></span><b>Open guide</b></button>)}</div>
    </section>}

    <footer className="info-guide-provenance"><strong>Maintained from official MagicCon sources</strong><span>{lastUpdated ? `Last factual update ${lastUpdated}` : 'Source-backed reference'}{sourceCount ? ` · ${sourceCount} source${sourceCount === 1 ? '' : 's'}` : ''}</span></footer>
  </section>
}

function CatalogMatchReview() {
  const [decision, setDecision] = useState<'use-image' | 'not-same' | null>(null)
  return <article className="catalog-match-review" aria-labelledby="catalog-match-review-title">
    <header className="catalog-match-review-head">
      <div><span className="eyebrow">IMAGE MATCH</span><strong>Needs your answer</strong></div>
      <span>1 of 1</span>
    </header>
    <div className="catalog-match-review-body">
      <div className="catalog-match-comparison" aria-label="Source evidence and proposed catalog image">
        <figure className="catalog-match-evidence">
          <span><img referrerPolicy="no-referrer" src="https://preview.redd.it/the-magiccon-atlanta-shop-menu-v0-pw91blv8dirf1.jpg?width=1080&amp;crop=smart&amp;auto=webp&amp;s=f8d5b869ada24c08c77c462e6f458aea99f85a1d" alt="Geometric Rune Coffee Mug on the photographed Atlanta 2025 accessories board" /></span>
          <figcaption>Board photo · Atlanta 2025</figcaption>
        </figure>
        <span className="catalog-match-arrow" aria-hidden="true">→</span>
        <figure className="catalog-match-candidate">
          <span><img src="https://mcvegas.mtgfestivals.com/content/dam/sitebuilder/rna/mtgfestivals/mcvegas/2026/images/merch/mc-vegas-26-Geometric-Rune-Mug.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129174/mc-vegas-26-Geometric-Rune-Mug.jpg" alt="Clean official product image proposed for the Geometric Rune Coffee Mug" /></span>
          <figcaption>Proposed image · MagicCon</figcaption>
        </figure>
      </div>
      <div className="catalog-match-copy">
        <span className="eyebrow">POSSIBLE CROSS-EVENT MATCH</span>
        <h3 id="catalog-match-review-title">Is this the right Geometric Rune Coffee Mug?</h3>
        <p>The Atlanta board and the official Vegas catalog show the same rune artwork and mug shape. The source names differ slightly.</p>
        <div className="catalog-match-cues" aria-label="Matching cues">
          <span><b>Atlanta board</b> “Coffee Mug” · $25</span>
          <span><b>Proposed source</b> “Mug” · $25</span>
          <strong>Different event catalog—confirm the product, not Atlanta availability.</strong>
        </div>
      </div>
    </div>
    <footer className={`catalog-match-actions${decision ? ' resolved' : ''}`} aria-live="polite">
      {decision
        ? <><div className="catalog-match-resolution"><span aria-hidden="true">✓</span><div><small>QA ANSWER SAVED LOCALLY</small><strong>{decision === 'use-image' ? 'Use this image for the catalog item' : 'Not the same item'}</strong></div></div><button type="button" onClick={() => setDecision(null)}>Change answer</button></>
        : <><button type="button" onClick={() => setDecision('not-same')}>Not the same item</button><button type="button" className="primary" onClick={() => setDecision('use-image')}>Use this image</button></>}
    </footer>
  </article>
}

function InfoCatalogsPreview({ onOpenObject, showMatchReview = false, catalogReadModel, currentOwnerId, canEditCatalogInterest, catalogInterestSavingOfferId, onToggleCatalogInterest, catalogBrowserQa }: { onOpenObject: (detail: ObjectDetail) => void; showMatchReview?: boolean; catalogReadModel: CatalogReadModel; currentOwnerId?: string; canEditCatalogInterest: boolean; catalogInterestSavingOfferId: string | null; onToggleCatalogInterest: (offer: CatalogOffer, interested: boolean) => void; catalogBrowserQa: boolean }) {
  const [catalogId, setCatalogId] = useState<InfoCatalog['id']>('show-store')
  const catalog = priorEventCatalogs.find(item => item.id === catalogId) ?? priorEventCatalogs[0]
  const hasCurrentCatalog = catalogReadModel.status === 'ready' && catalogReadModel.offers.length > 0
  return <section className="info-catalog-preview" role="tabpanel" aria-label="Catalogs preview">
    {(catalogBrowserQa || !hasCurrentCatalog) && <aside className="info-catalog-warning"><span className="eyebrow">QA PREVIEW</span><strong>Prior-event products—not Atlanta inventory.</strong><p>This surface stays hidden in the real app until an official Atlanta catalog is captured and verified.</p></aside>}
    {showMatchReview && <CatalogMatchReview />}
    {hasCurrentCatalog
      ? <CatalogBrowser model={catalogReadModel} currentOwnerId={currentOwnerId} canEditInterest={canEditCatalogInterest} savingOfferId={catalogInterestSavingOfferId} onToggleInterest={onToggleCatalogInterest} onOpenOffer={offer => onOpenObject(catalogOfferDetail(offer, currentOwnerId))} />
      : <><div className="info-catalog-selector" role="tablist" aria-label="Catalog preview">
      {priorEventCatalogs.map(item => <button type="button" role="tab" aria-selected={catalog.id === item.id} className={catalog.id === item.id ? 'active' : ''} key={item.id} onClick={() => setCatalogId(item.id)}>{item.id === 'black-lotus' ? 'Black Lotus' : item.title}</button>)}
    </div>
    <header className="info-catalog-heading"><div><span className="eyebrow">{catalog.precedentEvent.toUpperCase()}</span><h2>{catalog.title}</h2><p>{catalog.description}</p></div><a href={catalog.sourceUrl} target="_blank" rel="noreferrer">View precedent source ↗</a></header>
    <div className={`info-catalog-grid catalog-${catalog.id}`}>{catalog.items.map(item => <button type="button" className="info-catalog-item" key={item.id} onClick={() => onOpenObject(infoCatalogItemDetail(catalog, item))}>
      <span className="info-catalog-visual" aria-hidden="true"><b>{item.category.slice(0, 2).toUpperCase()}</b></span>
      <span className="info-catalog-copy"><small>{item.category}</small><strong>{item.name}</strong>{item.note && <span>{item.note}</span>}</span>
      <b>{item.value}</b>
    </button>)}</div></>}
  </section>
}

function InfoSurface({ topics, feed, catalogReadModel, currentOwnerId, canEditCatalogInterest, canUseCatalogImport, canPromoteCatalog, catalogInterestSavingOfferId, catalogPromotionSaving, onPromoteCatalog, onToggleCatalogInterest, onOpenObject }: { topics: InfoTopic[]; feed: InfoFeedEntry[]; catalogReadModel: CatalogReadModel; currentOwnerId?: string; canEditCatalogInterest: boolean; canUseCatalogImport: boolean; canPromoteCatalog: boolean; catalogInterestSavingOfferId: string | null; catalogPromotionSaving: boolean; onPromoteCatalog: (plan: CatalogPromotionPlan) => Promise<void>; onToggleCatalogInterest: (offer: CatalogOffer, interested: boolean) => void; onOpenObject: (detail: ObjectDetail) => void }) {
  const qaFlags = new URLSearchParams(window.location.search).get('qa')?.split(',') ?? []
  const catalogMatchReviewEnabled = canUseCatalogImport && qaFlags.includes('catalog-match-review')
  const catalogBrowserQa = canUseCatalogImport && qaFlags.includes('catalog-browser')
  const catalogImportQa = canUseCatalogImport && qaFlags.includes('catalog-import-lab')
  const catalogsEnabled = catalogReadModel.offers.length > 0 || canUseCatalogImport
  const [mode, setMode] = useState<'guide' | 'catalogs' | 'import'>(catalogImportQa && canUseCatalogImport ? 'import' : catalogMatchReviewEnabled || catalogBrowserQa ? 'catalogs' : 'guide')
  const visibleTopics = publishedInfoTopics(topics).map(topic => topic.topic_key === 'ticketed-play' && ticketedPlaySaleHasOpened()
    ? {
        ...topic,
        concise_answer: 'Ticketed Play sales are open; a MagicCon Atlanta badge is required, and sales close one hour before each event.',
        facts: [
          { label: 'Sales status', value: 'Open' },
          { label: 'Sales close', value: 'One hour before start' },
          ...topic.facts.filter(fact => !['Sales open', 'Sales close'].includes(fact.label)),
        ],
      }
    : topic)
  const visibleFeed = publishedInfoFeed(feed, topics)
  return <section className="info-surface" aria-label="Info">
    <div className="trip-tabs" role="tablist" aria-label="Info view">
      <button type="button" role="tab" aria-selected={mode === 'guide'} className={mode === 'guide' ? 'active' : ''} onClick={() => setMode('guide')}>Guide</button>
      {catalogsEnabled && <button type="button" role="tab" aria-selected={mode === 'catalogs'} className={mode === 'catalogs' ? 'active' : ''} onClick={() => setMode('catalogs')}>Catalogs</button>}
      {canUseCatalogImport && <button type="button" role="tab" aria-selected={mode === 'import'} className={mode === 'import' ? 'active' : ''} onClick={() => setMode('import')}>Import</button>}
    </div>
    {mode === 'guide' && <InfoGuide topics={visibleTopics} feed={visibleFeed} onOpenObject={onOpenObject} />}
    {mode === 'catalogs' && catalogsEnabled && <InfoCatalogsPreview onOpenObject={onOpenObject} showMatchReview={catalogMatchReviewEnabled} catalogReadModel={catalogReadModel} currentOwnerId={currentOwnerId} canEditCatalogInterest={canEditCatalogInterest} catalogInterestSavingOfferId={catalogInterestSavingOfferId} onToggleCatalogInterest={onToggleCatalogInterest} catalogBrowserQa={catalogBrowserQa} />}
    {mode === 'import' && canUseCatalogImport && <CatalogImportLab initialBatch={catalogImportPreviewBatch} canPromote={canPromoteCatalog} promoting={catalogPromotionSaving} onPromote={onPromoteCatalog} />}
  </section>
}

function WalletSurface({ receipts, onOpenObject, onOpenTrip, notes, currentOwnerId, onAddNote, onDeleteNote, prizeTixValue, proofRequest, onPrizeTixChange }: { receipts: WalletReceiptRow[]; onOpenObject: (detail: ObjectDetail) => void; onOpenTrip: () => void; notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; prizeTixValue?: string; proofRequest: { target: WalletProofTarget; nonce: number } | null; onPrizeTixChange: (value: number, delta: number) => void }) {
  const [tab, setTab] = useState<WalletTab>('home')
  const [tix, setTix] = useState(() => {
    const parsed = Number(prizeTixValue)
    return Number.isFinite(parsed) ? parsed : 0
  })
  const [modal, setModal] = useState<{ title: string; eyebrow: string; body: ReactNode; people?: PersonName[] } | null>(null)
  const playReceipts = receipts.filter(receipt => receipt.receipt_type === 'ticketed_play')
  const badgeReceipts = receipts.filter(receipt => receipt.receipt_type === 'badge')
  const blackLotusReceipt = badgeReceipts.find(receipt => receipt.attendee_person_keys.includes('kavi') && receipt.attendee_person_keys.includes('chris')) ?? null
  const chrisBlackLotusReceipt = badgeReceipts.find(receipt => receipt.attendee_person_keys.includes('chris') && !receipt.attendee_person_keys.includes('kavi')) ?? null
  const juanPremiumReceipt = badgeReceipts.find(receipt => receipt.attendee_person_keys.includes('juan')) ?? null
  const openModal = (eyebrow: string, title: string, body: ReactNode, people?: PersonName[]) => setModal({ eyebrow, title, body, people })
  const openBlackLotusProof = () => openModal('BLACK LOTUS ORDER', 'Kavi + Chris badge proof', <BlackLotusProofDetail receipt={blackLotusReceipt} notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} />, ['Kavi', 'Chris'])
  const openChrisBlackLotusProof = () => openModal('BLACK LOTUS TRANSFER', 'Chris Black Lotus badge proof', <ChrisBlackLotusTransferDetail originalReceipt={blackLotusReceipt} transferReceipt={chrisBlackLotusReceipt} notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} />, ['Chris'])
  const openJuanProof = () => openModal('PREMIUM WEEKEND ORDER', 'Juan badge proof', <JuanPremiumProofDetail receipt={juanPremiumReceipt} notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} />, ['Juan'])
  useEffect(() => {
    const parsed = Number(prizeTixValue)
    if (Number.isFinite(parsed)) setTix(parsed)
  }, [prizeTixValue])
  useEffect(() => {
    if (!proofRequest) return
    if (proofRequest.target === 'black-lotus') openBlackLotusProof()
    if (proofRequest.target === 'juan-premium') openJuanProof()
  }, [proofRequest?.nonce])
  const adjustTix = (delta: number) => setTix(value => {
    const next = Math.max(0, value + delta)
    onPrizeTixChange(next, next - value)
    return next
  })

  return <section className="wallet-surface" aria-label="Wallet">
    <div className="wallet-toolbar">
      <div className="wallet-tabs" role="tablist" aria-label="Wallet section">
        {([
          ['home', 'Home'],
          ['play', 'Play'],
          ['store', 'Store'],
          ['other', 'Other'],
        ] as Array<[WalletTab, string]>).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}
      </div>
      <div className="wallet-tix-counter" aria-label={`${tix.toLocaleString()} Prize Tix`}>
        <TicketMiniIcon />
        <span className="wallet-tix-label">Prize Tix</span>
        <button type="button" aria-label="Subtract 100 Prize Tix" onClick={() => adjustTix(-100)}>−</button>
        <strong>{tix.toLocaleString()}</strong>
        <button type="button" aria-label="Add 100 Prize Tix" onClick={() => adjustTix(100)}>+</button>
      </div>
    </div>
    {tab === 'home' && <WalletHomeTab openBlackLotusProof={openBlackLotusProof} openChrisBlackLotusProof={openChrisBlackLotusProof} openJuanProof={openJuanProof} onOpenObject={onOpenObject} />}
    {tab === 'play' && <WalletPlayTab receipts={playReceipts} currentOwnerId={currentOwnerId} openModal={openModal} />}
    {tab === 'store' && <WalletStoreEmpty />}
    {tab === 'other' && <WalletOtherTab openModal={openModal} onOpenTrip={onOpenTrip} />}
    {modal && <WalletModal {...modal} onClose={() => setModal(null)} />}
  </section>
}

function WalletModal({ eyebrow, title, body, people, onClose }: { eyebrow: string; title: string; body: ReactNode; people?: PersonName[]; onClose: () => void }) {
  return <aside className="wallet-modal" role="dialog" aria-modal="true" aria-label={title}>
    <button className="detail-close persistent-detail-close" type="button" onClick={onClose} aria-label="Close Wallet detail">×</button>
    <div className="wallet-modal-head">
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>
      {people?.length ? <PersonBubbles people={people} /> : null}
    </div>
    <div className="wallet-modal-body">{body}</div>
  </aside>
}

function ProofPreview({ kind, code, note }: { kind: 'qr' | 'receipt' | 'code'; code?: string; note: string }) {
  return <div className={`proof-preview ${kind}`}>
    {kind === 'qr' && <div className="qr-fixture" aria-label="Order QR"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>}
    {kind === 'receipt' && <div className="receipt-image-fixture"><span>Original receipt</span><i /><i /><i /><strong>Email render</strong></div>}
    {kind === 'code' && <div className="code-fixture"><span>Event code</span><strong>{code ?? 'ABC123'}</strong></div>}
    <p>{note}</p>
  </div>
}

function ReceiptProofIngestLab() {
  const [payload, setPayload] = useState('')
  const [status, setStatus] = useState('Ready for one receipt proof payload.')
  const [busy, setBusy] = useState(false)

  const upload = async () => {
    if (!supabase || !payload.trim()) return
    setBusy(true)
    setStatus('Uploading and verifying…')
    try {
      const parsed = JSON.parse(payload)
      const { data, error } = await supabase.functions.invoke('receipt-proof-ingest', { body: parsed })
      if (error) throw error
      if (!['applied', 'already_applied'].includes(data?.status)) throw new Error(data?.error ?? 'Receipt proof intake did not complete.')
      setStatus(`${data.status}: ${data.objectPath}`)
      setPayload('')
    } catch (error) {
      setStatus(`Upload failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  return <section className="receipt-proof-ingest-lab" aria-label="Receipt proof ingest">
    <strong>Receipt proof ingest</strong>
    <textarea aria-label="Receipt proof payload" value={payload} onChange={event => setPayload(event.target.value)} />
    <button type="button" disabled={busy || !payload.trim()} onClick={() => void upload()}>{busy ? 'Uploading…' : 'Upload proof'}</button>
    <p role="status">{status}</p>
  </section>
}

function PrivateReceiptArtifacts({ receipt, roles, title, currentOwnerId }: { receipt: WalletReceiptRow | null; roles: ReceiptArtifactRole[]; title: string; currentOwnerId?: string }) {
  const artifacts = useMemo(
    () => selectReceiptArtifactsForDisplay(receipt?.receipt_artifacts ?? [], roles),
    [receipt, roles.join('|')],
  )
  const [downloads, setDownloads] = useState<Array<{ artifact: ReceiptArtifact; url: string }>>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    let active = true
    let objectUrls: string[] = []
    setDownloads([])
    if (!artifacts.length) { setStatus('idle'); return }
    setStatus('loading')
    void Promise.all(artifacts.map(async artifact => ({ artifact, url: await downloadReceiptArtifact(artifact, currentOwnerId) })))
      .then(items => {
        objectUrls = items.map(item => item.url)
        if (!active) { objectUrls.forEach(url => URL.revokeObjectURL(url)); return }
        setDownloads(items)
        setStatus('idle')
      })
      .catch(error => {
        console.warn('Private receipt artifact could not be loaded', error)
        if (active) setStatus('error')
      })
    return () => {
      active = false
      objectUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [artifacts.map(artifact => artifact.id).join('|'), currentOwnerId])

  if (!receipt) return <p className="original-receipt-note">Private proof is unavailable in preview mode. Sign in to retrieve it.</p>
  if (!artifacts.length) return <p className="original-receipt-note">This private proof has not been migrated yet.</p>
  if (status === 'loading') return <p className="original-receipt-note">Loading private proof…</p>
  if (status === 'error') return <p className="original-receipt-note">Private proof could not be loaded. Check your session and try again.</p>
  return <div className="original-proof-stack full-email" aria-label={title}>
    {downloads.map(({ artifact, url }) => <figure key={artifact.id}>
      {artifact.mime_type.startsWith('image/')
        ? <img src={url} alt={artifact.display_label} />
        : <iframe title={artifact.display_label} src={url} sandbox="" />}
      <figcaption>{artifact.display_label}</figcaption>
    </figure>)}
  </div>
}

function WalletHomeTab({ openBlackLotusProof, openChrisBlackLotusProof, openJuanProof, onOpenObject }: { openBlackLotusProof: () => void; openChrisBlackLotusProof: () => void; openJuanProof: () => void; onOpenObject: (detail: ObjectDetail) => void }) {
  return <div className="wallet-home-command">
    <section className="wallet-hero-card wallet-hero-card-no-actions">
      <div className="wallet-hero-copy">
        <div className="wallet-hero-topline"><span className="eyebrow">BADGES</span></div>
        <h2>Atlanta passes</h2>
        <p>Black Lotus order proof is captured from the Leap email, including the showable order QR.</p>
      </div>
      <div className="wallet-badge-fan" aria-label="Primary badge cards">
        <button className="mini-pass lotus-pass" type="button" onClick={openBlackLotusProof}>
          <span><EventKindIcon name="lotus" /></span>
          <strong>Kavi</strong>
          <small>Black Lotus</small>
          <PersonBubbles people={['Kavi']} />
        </button>
        <button className="mini-pass lotus-pass" type="button" onClick={openChrisBlackLotusProof}>
          <span><EventKindIcon name="lotus" /></span>
          <strong>Chris</strong>
          <small>Black Lotus · transferred Aug 25</small>
          <PersonBubbles people={['Chris']} />
        </button>
        <button className="mini-pass premium-pass" type="button" onClick={openJuanProof}>
          <span><NavIcon name="wallet" /></span>
          <strong>Juan</strong>
          <small>Premium</small>
          <PersonBubbles people={['Juan']} />
        </button>
      </div>
    </section>
    <section className="receipt-list wallet-home-receipts" aria-label="Badge receipts">
      <button className="receipt-card wallet-receipt-button" type="button" onClick={openBlackLotusProof}>
        <div className="receipt-head"><span className="receipt-icon"><EventKindIcon name="lotus" /></span><div><span className="eyebrow">BADGE RECEIPT</span><h2>Black Lotus badge order</h2><p>2 × Black Lotus VIP Early Bird · Kavi + Chris</p></div><span className="receipt-people-total"><PersonBubbles people={['Kavi', 'Chris']} /><strong>$2,025.26</strong></span></div>
      </button>
      <button className="receipt-card wallet-receipt-button" type="button" onClick={openJuanProof}>
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="wallet" /></span><div><span className="eyebrow">BADGE RECEIPT</span><h2>Juan Premium Weekend</h2><p>Premium Weekend Early Bird · Juan</p></div><span className="receipt-people-total"><PersonBubbles people={['Juan']} /><strong>$191.42</strong></span></div>
      </button>
    </section>
  </div>
}

function ChrisBlackLotusTransferDetail({ originalReceipt, transferReceipt, notes, currentOwnerId, onAddNote, onDeleteNote }: { originalReceipt: WalletReceiptRow | null; transferReceipt: WalletReceiptRow | null; notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void }) {
  const [mode, setMode] = useState<'info' | 'original' | 'transfer'>('info')
  const orderProof = receiptOrderProof(transferReceipt)

  return <div className="proof-detail">
    <div className="proof-mode-tabs" role="tablist" aria-label="Chris Black Lotus transfer proof view">
      <button type="button" role="tab" aria-selected={mode === 'info'} className={mode === 'info' ? 'active' : ''} onClick={() => setMode('info')}>Info</button>
      <button type="button" role="tab" aria-selected={mode === 'original'} className={mode === 'original' ? 'active' : ''} onClick={() => setMode('original')}>Original</button>
      <button type="button" role="tab" aria-selected={mode === 'transfer'} className={mode === 'transfer' ? 'active' : ''} onClick={() => setMode('transfer')}>Transfer</button>
    </div>
    {mode === 'info' ? transferReceipt ? <>
      <div className="proof-status-grid">
        <span><b>1</b><small>Black Lotus VIP Early Bird badge</small></span>
        <span><b>Transferred</b><small>to Chris · Aug 25, 2026</small></span>
      </div>
      <div className="proof-info-list">
        <div><span>Attendee</span><strong>Chris Tom</strong></div>
        <div><span>Order proof</span><strong>Original Black Lotus purchase receipt captured</strong></div>
        <div><span>Transfer proof</span><strong>Available under Transfer</strong></div>
        <div><span>Will Call</span><strong>Bring this confirmation email and photo ID</strong></div>
        <div><span>Original</span><strong>{originalReceipt ? 'Private original is available' : 'Private original has not been migrated'}</strong></div>
      </div>
      <ObjectNotes notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} objectId="wallet-chris-black-lotus-transfer" objectKind="receipt" objectTitle="Chris Black Lotus transfer confirmation" context="Wallet · Chris Black Lotus transfer" backlink="wallet" compact />
    </> : <p className="original-receipt-note">Private proof is unavailable in preview mode. Sign in to retrieve it.</p> : mode === 'original' ? <>
      <p className="original-receipt-note">Original Black Lotus purchase email for the two-badge order.</p>
      <PrivateReceiptArtifacts receipt={originalReceipt} roles={['original']} title="Original Black Lotus purchase email" currentOwnerId={currentOwnerId} />
    </> : transferReceipt ? <>
      <PrivateReceiptArtifacts receipt={transferReceipt} roles={['transfer']} title="Showable Chris Black Lotus transfer proof" currentOwnerId={currentOwnerId} />
      {orderProof.code && <div className="proof-code-line"><span>Order code</span><code>{orderProof.code}</code></div>}
    </> : <p className="original-receipt-note">Private proof is unavailable in preview mode. Sign in to retrieve it.</p>}
    {transferReceipt && orderProof.url && <div className="proof-links"><a href={orderProof.url} target="_blank" rel="noreferrer">Open Chris's Leap order</a></div>}
  </div>
}

function BlackLotusProofDetail({ receipt, notes, currentOwnerId, onAddNote, onDeleteNote }: { receipt: WalletReceiptRow | null; notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void }) {
  const [mode, setMode] = useState<'info' | 'original'>('info')
  const orderProof = receiptOrderProof(receipt)

  return <div className="proof-detail">
    <div className="proof-mode-tabs" role="tablist" aria-label="Badge proof view">
      <button type="button" role="tab" aria-selected={mode === 'info'} className={mode === 'info' ? 'active' : ''} onClick={() => setMode('info')}>Info</button>
      <button type="button" role="tab" aria-selected={mode === 'original'} className={mode === 'original' ? 'active' : ''} onClick={() => setMode('original')}>Original</button>
    </div>
    {mode === 'info'
      ? receipt ? <>
        <div className="proof-status-grid">
          <span><b>2</b><small>Black Lotus VIP Early Bird badges</small></span>
          <span><b>$2,025.26</b><small>order total</small></span>
        </div>
        <div className="proof-info-list">
          <div><span>Order proof</span><strong>QR code captured from Leap email</strong></div>
          <div><span>Chris badge</span><strong>Transferred to Chris Tom · Aug 25, 2026</strong></div>
          <div><span>Will Call</span><strong>Thu 12-6 · Fri/Sat 8:30-7 · Sun 8:30-6</strong></div>
          <div><span>Show floor</span><strong>Fri/Sat 10-7 · Sun 10-6</strong></div>
        </div>
        <div className="proof-qr-card" aria-label="Showable order QR">
          <PrivateReceiptArtifacts receipt={receipt} roles={['qr']} title="Black Lotus order QR" currentOwnerId={currentOwnerId} />
          {orderProof.code && <div className="proof-code-line"><span>Order code</span><code>{orderProof.code}</code></div>}
        </div>
        <p>Info is the fast-use view: extracted logistics plus the QR. Use Original when someone needs the whole receipt.</p>
        <ObjectNotes notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} objectId="wallet-black-lotus-order" objectKind="receipt" objectTitle="Kavi + Chris badge proof" context="Wallet · Black Lotus order" backlink="wallet" compact />
      </> : <p className="original-receipt-note">Private proof is unavailable in preview mode. Sign in to retrieve it.</p>
      : <>
        <p className="original-receipt-note">Full Gmail receipt render. This is intentionally the whole email, not a cropped proof slice.</p>
        <PrivateReceiptArtifacts receipt={receipt} roles={['original']} title="Original Black Lotus order receipt" currentOwnerId={currentOwnerId} />
      </>}
    {receipt && orderProof.url && <div className="proof-links">
      <a href={orderProof.url} target="_blank" rel="noreferrer">Open Leap order</a>
    </div>}
  </div>
}

function JuanPremiumProofDetail({ receipt, notes, currentOwnerId, onAddNote, onDeleteNote }: { receipt: WalletReceiptRow | null; notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void }) {
  const [mode, setMode] = useState<'info' | 'original'>('info')
  const orderProof = receiptOrderProof(receipt)

  return <div className="proof-detail">
    <div className="proof-mode-tabs" role="tablist" aria-label="Badge proof view">
      <button type="button" role="tab" aria-selected={mode === 'info'} className={mode === 'info' ? 'active' : ''} onClick={() => setMode('info')}>Info</button>
      <button type="button" role="tab" aria-selected={mode === 'original'} className={mode === 'original' ? 'active' : ''} onClick={() => setMode('original')}>Original</button>
    </div>
    {mode === 'info'
      ? receipt ? <>
        <div className="proof-status-grid">
          <span><b>1</b><small>Premium Weekend Early Bird badge</small></span>
          <span><b>$191.42</b><small>order total</small></span>
        </div>
        <div className="proof-info-list">
          <div><span>Order proof</span><strong>Confirmation email code + rendered Leap QR</strong></div>
          <div><span>Product</span><strong>Premium Weekend badge + included promo/booster bundle</strong></div>
          <div><span>Will Call</span><strong>Thu 12-6 · Fri/Sat 8:30-7 · Sun 8:30-6</strong></div>
          <div><span>Show floor</span><strong>Fri/Sat 10-7 · Sun 10-6</strong></div>
        </div>
        <div className="proof-qr-card" aria-label="Showable Juan Premium order QR">
          <PrivateReceiptArtifacts receipt={receipt} roles={['qr']} title="Juan Premium order QR" currentOwnerId={currentOwnerId} />
          {orderProof.code && <div className="proof-code-line"><span>Order code</span><code>{orderProof.code}</code></div>}
        </div>
        <ObjectNotes notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} objectId="wallet-juan-premium-order" objectKind="receipt" objectTitle="Juan badge proof" context="Wallet · Juan Premium order" backlink="wallet" compact />
      </> : <p className="original-receipt-note">Private proof is unavailable in preview mode. Sign in to retrieve it.</p>
      : <div className="original-html-frame">
        <p className="original-receipt-note">Full Gmail print view with account, sender, recipient, timestamp, subject, and complete receipt body.</p>
        <PrivateReceiptArtifacts receipt={receipt} roles={['original']} title="Juan Premium original receipt" currentOwnerId={currentOwnerId} />
      </div>}
    {receipt && orderProof.url && <div className="proof-links">
      <a href={orderProof.url} target="_blank" rel="noreferrer">Open Leap order</a>
    </div>}
  </div>
}

type PersonName = 'Kavi' | 'Juan' | 'Chris' | 'Kyle'

function PersonBubbles({ people }: { people: PersonName[] }) {
  const labels: Record<PersonName, string> = { Kavi: 'Ka', Juan: 'J', Chris: 'C', Kyle: 'Ky' }
  return <span className="person-bubbles" aria-label={people.join(', ')}>
    {people.map(person => <span key={person} className={`person-bubble ${person.toLowerCase()}`} title={person}>{labels[person]}</span>)}
  </span>
}

function receiptPerson(key: string): PersonName {
  return key === 'chris' ? 'Chris' : key === 'juan' ? 'Juan' : key === 'kyle' ? 'Kyle' : 'Kavi'
}

function receiptPeople(receipt: WalletReceiptRow): PersonName[] {
  return (receipt.attendee_person_keys?.length ? receipt.attendee_person_keys : [receipt.attendee_person_key]).map(receiptPerson)
}

function receiptOrderProof(receipt: WalletReceiptRow | null) {
  const line = receipt?.line_items.find(item => item.order_code || item.order_url)
  return { code: line?.order_code, url: line?.order_url }
}

function TicketedReceiptDetail({ receipt, currentOwnerId }: { receipt: WalletReceiptRow; currentOwnerId?: string }) {
  const [mode, setMode] = useState<'info' | 'original'>('info')
  return <div className="proof-detail">
    <div className="proof-mode-tabs" role="tablist" aria-label="Ticketed play receipt view">
      <button type="button" role="tab" aria-selected={mode === 'info'} className={mode === 'info' ? 'active' : ''} onClick={() => setMode('info')}>Info</button>
      <button type="button" role="tab" aria-selected={mode === 'original'} className={mode === 'original' ? 'active' : ''} onClick={() => setMode('original')}>Original</button>
    </div>
    {mode === 'info' ? <>
      <div className="proof-info-list">
        <div><span>Attendees</span><strong>{receiptPeople(receipt).join(' + ')}</strong></div>
        <div><span>Order</span><strong>{receipt.vendor} · {new Date(receipt.receipt_date).toLocaleString()}</strong></div>
        <div><span>Total</span><strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: receipt.currency }).format(Number(receipt.amount))}</strong></div>
      </div>
      <div className="receipt-lines">{receipt.line_items.map(line => <div className="receipt-line-row" key={line.event_id}><span>{line.quantity && line.quantity > 1 ? `${line.quantity}× ` : ''}{line.title}</span><b>${line.price.toFixed(2)}{line.quantity && line.quantity > 1 ? ' each' : ''}</b>{line.code && <small>{line.code}</small>}</div>)}</div>
    </> : <>
      <p className="original-receipt-note">Full source email captured during receipt ingestion.</p>
      <PrivateReceiptArtifacts receipt={receipt} roles={['original']} title={`${receipt.title} original receipt`} currentOwnerId={currentOwnerId} />
    </>}
  </div>
}

function WalletPlayTab({ receipts, currentOwnerId, openModal }: { receipts: WalletReceiptRow[]; currentOwnerId?: string; openModal: (eyebrow: string, title: string, body: ReactNode, people?: PersonName[]) => void }) {
  return <div className="wallet-layout">
    <section className="receipt-list" aria-label="Ticketed play receipts">
      {receipts.length ? receipts.map(receipt => <button key={receipt.id} className="receipt-card wallet-receipt-button" type="button" onClick={() => openModal('TICKETED PLAY RECEIPT', receipt.title, <TicketedReceiptDetail receipt={receipt} currentOwnerId={currentOwnerId} />, receiptPeople(receipt))}>
        <div className="receipt-head"><span className="receipt-icon"><EventKindIcon name="ticketed" /></span><div><span className="eyebrow">TICKETED PLAY</span><h2>{receipt.title}</h2><ul className="receipt-card-lines">{receipt.line_items.map(line => <li key={line.event_id}>{line.quantity && line.quantity > 1 ? `${line.quantity}× ` : ''}{line.title}</li>)}</ul><p>{receipt.line_items.length} purchased {receipt.line_items.length === 1 ? 'event' : 'events'} · {receipt.vendor}</p></div><span className="receipt-people-total"><PersonBubbles people={receiptPeople(receipt)} /><strong>${Number(receipt.amount).toFixed(2)}</strong></span></div>
      </button>) : <article className="receipt-card future-store">
        <div className="receipt-head"><span className="receipt-icon"><EventKindIcon name="ticketed" /></span><div><span className="eyebrow">TICKETED PLAY</span><h2>No paid play receipts yet</h2><p>Purchased event receipts will appear here.</p></div></div>
      </article>}
    </section>
  </div>
}

function WalletStoreEmpty() {
  return <div className="wallet-layout">
    <section className="receipt-list" aria-label="Store receipts">
      <article className="receipt-card future-store">
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="wallet" /></span><div><span className="eyebrow">STORE</span><h2>No Atlanta store receipts yet</h2><p>Purchases and extracted line items will appear here.</p></div></div>
      </article>
    </section>
  </div>
}

function WalletOtherTab({ openModal, onOpenTrip }: { openModal: (eyebrow: string, title: string, body: ReactNode) => void; onOpenTrip: () => void }) {
  return <div className="wallet-layout">
    <section className="receipt-list" aria-label="Other wallet references">
      <article className="receipt-card">
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="trip" /></span><div><span className="eyebrow">DELTA RECEIPT</span><h2>Flights · Kavi + Juan</h2><p>Confirmation HOGFBX · SNA ⇄ ATL</p></div><PersonBubbles people={['Kavi', 'Juan']} /></div>
        <div className="receipt-lines"><button type="button" onClick={() => openModal('FLIGHT DETAIL', 'DL 1521', <p>SNA to ATL · Nov 11 · 12:20 PM–7:34 PM · confirmation HOGFBX.</p>)}><span>DL 1521 · Nov 11 · SNA to ATL</span><b>7:34 PM</b></button><button type="button" onClick={() => openModal('FLIGHT DETAIL', 'DL 1602', <p>ATL to SNA · Nov 15 · 8:35 PM–10:29 PM · confirmation HOGFBX.</p>)}><span>DL 1602 · Nov 15 · ATL to SNA</span><b>8:35 PM</b></button></div>
        <div className="receipt-actions"><button type="button" onClick={onOpenTrip}>Open Trip</button></div>
      </article>
      <article className="receipt-card">
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="trip" /></span><div><span className="eyebrow">HOTEL RECEIPTS</span><h2>Atlanta lodging</h2><p>Shared proof for every traveler</p></div><PersonBubbles people={['Kavi', 'Juan', 'Chris', 'Kyle']} /></div>
        <div className="receipt-lines">
          <button type="button" onClick={() => openModal('HOTEL DETAIL', 'Courtyard', <p>Courtyard by Marriott Atlanta Downtown · Nov 11–12 · Kavi, Juan, Chris.</p>)}><span>Courtyard · Nov 11-12</span><b>K/J/C</b></button>
          <button type="button" onClick={() => openModal('HOTEL DETAIL', 'Omni', <p>Omni Atlanta Hotel at Centennial Park · Nov 12–15 · Kavi and Juan.</p>)}><span>Omni · Nov 12-15</span><b>K/J</b></button>
          <button type="button" onClick={() => openModal('HOTEL RECEIPT', 'Hilton Atlanta · Chris + Kyle', <div className="proof-detail"><div className="proof-info-list"><div><span>Stay</span><strong>Nov 12–16 · 4 nights</strong></div><div><span>Guests</span><strong>Chris + Kyle · 2 adults</strong></div><div><span>Room</span><strong>2 double beds</strong></div><div><span>Reserved by</span><strong>Kyle Mandell</strong></div><div><span>Hotel</span><strong>255 Courtland Street NE, Atlanta, GA 30303</strong></div><div><span>Source proof</span><strong>Gmail · “magiccon hotel receipt” · Aug 19</strong></div></div><p>The original receipt image remains attached to Kyle's source email; Wallet keeps the extracted proof easy to find.</p></div>)}><span>Hilton · Nov 12-16</span><b>C/Ky</b></button>
        </div>
        <div className="receipt-actions"><button type="button" onClick={onOpenTrip}>Open Trip</button></div>
      </article>
    </section>
  </div>
}

function TripSurface({ onOpenObject, flights }: { onOpenObject: (detail: ObjectDetail) => void; flights: TripFlight[] }) {
  const [tab, setTab] = useState<'hotels' | 'flights'>(() => new URLSearchParams(window.location.search).get('tripView') === 'flights' ? 'flights' : 'hotels')
  const viewTabs = (mobile = false) => <div className={`trip-tabs${mobile ? ' mobile-surface-view-tabs' : ''}`} role="tablist" aria-label="Trip section">
    <button type="button" role="tab" aria-selected={tab === 'hotels'} className={tab === 'hotels' ? 'active' : ''} onClick={() => setTab('hotels')}>Hotels</button>
    <button type="button" role="tab" aria-selected={tab === 'flights'} className={tab === 'flights' ? 'active' : ''} onClick={() => setTab('flights')}>Flights</button>
  </div>

  return <section className="trip-surface" aria-label="Atlanta trip overview">
    <div className="surface-view-tabs-desktop">{viewTabs()}</div>
    <MobileHeaderViewSlot>{viewTabs(true)}</MobileHeaderViewSlot>

    {tab === 'hotels' ? <HotelsTripTab onOpenObject={onOpenObject} /> : <FlightsTripTab flights={flights} />}
  </section>
}

function tripHotelDetail(kind: 'courtyard' | 'omni' | 'hilton'): ObjectDetail {
  if (kind === 'courtyard') return {
    id: 'hotel-courtyard',
    kind: 'hotel',
    eyebrow: 'Hotel · Nov 11-12',
    title: 'Courtyard by Marriott Atlanta Downtown',
    summary: 'Shared arrival-night hotel for Kavi, Juan, and Chris.',
    facts: [
      { label: 'Address', value: '133 Carnegie Way, Atlanta, GA 30303' },
      { label: 'People', value: 'Kavi + Juan + Chris' },
      { label: 'Nights', value: 'Nov 11-12' },
    ],
    source: { label: 'Gmail receipt + official property page', value: 'Courtyard by Marriott Atlanta Downtown' },
    rationale: 'Useful as a quick arrival-night reference and shared-room context; booking proof should live in Wallet once captured.',
    actions: [{ label: 'Open Trip', destination: 'trip' }, { label: 'Open Wallet', destination: 'wallet' }],
    backlinks: [{ label: 'Calendar', destination: 'calendar' }],
  }
  if (kind === 'hilton') return {
    id: 'hotel-hilton',
    kind: 'hotel',
    eyebrow: 'Hotel · Nov 12-16',
    title: 'Hilton Atlanta',
    summary: 'Convention stay for Chris and Kyle, reserved under Kyle Mandell.',
    facts: [
      { label: 'Address', value: '255 Courtland Street NE, Atlanta, GA 30303' },
      { label: 'People', value: 'Chris + Kyle' },
      { label: 'Stay', value: 'Nov 12-16 · 4 nights' },
      { label: 'Room', value: '2 adults · 2 double beds' },
      { label: 'Check-in', value: '4 PM' },
      { label: 'Check-out', value: '11 AM' },
    ],
    source: { label: 'Gmail receipt', value: 'Hilton Atlanta reservation for Kyle Mandell' },
    rationale: 'Everyone can see the shared lodging plan; the traveler bubbles identify occupants rather than restricting access.',
    actions: [{ label: 'Open Trip', destination: 'trip' }, { label: 'Open Wallet', destination: 'wallet' }],
    backlinks: [{ label: 'Calendar', destination: 'calendar' }],
  }
  return {
    id: 'hotel-omni',
    kind: 'hotel',
    eyebrow: 'Hotel · Nov 12-15',
    title: 'Omni Atlanta Hotel at Centennial Park',
    summary: 'Convention hotel for Kavi and Juan. Keep reservation proof in Wallet; Trip should stay focused on pleasant, usable logistics.',
    facts: [
      { label: 'Address', value: '190 Marietta St NW, Atlanta, GA 30303' },
      { label: 'People', value: 'Kavi + Juan' },
      { label: 'Check-in', value: '4 PM' },
      { label: 'Check-out', value: '11 AM' },
    ],
    source: { label: 'Booking email + official property page', value: 'Omni Atlanta Hotel at Centennial Park' },
    rationale: 'The useful value-add is quick address/map access and awareness of who is staying there, not rebuilding a hotel booking app.',
    actions: [{ label: 'Open Trip', destination: 'trip' }, { label: 'Open Wallet proof', destination: 'wallet' }],
    backlinks: [{ label: 'Calendar', destination: 'calendar' }],
  }
}

function tripTransitionDetail(): ObjectDetail {
  return {
    id: 'trip-luggage-thursday',
    kind: 'place',
    eyebrow: 'Trip handoff · Nov 12',
    title: 'Thursday luggage handoff',
    summary: 'Courtyard checkout, Black Lotus First Look, and Omni check-in create the one trip transition worth settling.',
    facts: [
      { label: 'People', value: 'Kavi + Juan + Chris' },
      { label: 'Risk', value: 'Bags between checkout and Omni check-in' },
      { label: 'Omni check-in', value: '4 PM' },
    ],
    rationale: 'This is exactly the right level of travel value-add: not a travel app, just a small operational wrinkle worth remembering.',
    actions: [{ label: 'Open Trip', destination: 'trip' }],
    backlinks: [{ label: 'Calendar', destination: 'calendar' }],
  }
}

function HotelsTripTab({ onOpenObject }: { onOpenObject: (detail: ObjectDetail) => void }) {
  return <>
    <div className="trip-layout trip-layout-hotels">
      <section className="trip-flow-card" aria-labelledby="lodging-flow-title">
        <div className="trip-section-head"><div><span className="eyebrow">SHARED LODGING</span><h2 id="lodging-flow-title">Where everyone is staying</h2><p>One arrival night, then two convention bases.</p></div><TravelerDots people={['Kavi', 'Juan', 'Chris', 'Kyle']} /></div>
        <div className="trip-flow">
          <button type="button" className="trip-stop shared-stop object-card-button" onClick={() => onOpenObject(tripHotelDetail('courtyard'))}>
            <time><strong>11</strong><span>WED</span></time>
            <div className="trip-stop-icon"><NavIcon name="trip" /></div>
            <div><small>SHARED ARRIVAL NIGHT</small><h3>Courtyard Atlanta Downtown</h3><p>One room · one night</p></div>
            <TravelerDots people={['Kavi', 'Juan', 'Chris']} />
          </button>
          <div className="trip-connector"><span>Thursday hotel split</span></div>
          <div className="trip-branches" aria-label="Thursday hotel split">
            <button type="button" className="trip-branch omni-branch object-card-button" onClick={() => onOpenObject(tripHotelDetail('omni'))}><span className="branch-line" aria-hidden="true" /><div><small>NOV 12-15 · 3 NIGHTS</small><h3>Omni at Centennial Park</h3><p>Kavi and Juan · convention hotel</p></div><TravelerDots people={['Kavi', 'Juan']} /></button>
            <button type="button" className="trip-branch hilton-branch object-card-button" onClick={() => onOpenObject(tripHotelDetail('hilton'))}><span className="branch-line" aria-hidden="true" /><div><small>NOV 12-16 · 4 NIGHTS</small><h3>Hilton Atlanta</h3><p>Chris and Kyle · two double beds</p></div><TravelerDots people={['Chris', 'Kyle']} /></button>
          </div>
        </div>
      </section>

    </div>

    <div className="hotel-grid" aria-label="Confirmed hotel details">
      <article className="hotel-card courtyard-card object-card-button" role="button" tabIndex={0} onClick={() => onOpenObject(tripHotelDetail('courtyard'))} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onOpenObject(tripHotelDetail('courtyard')) }}>
        <div className="hotel-card-head"><span className="hotel-icon"><NavIcon name="trip" /></span><TravelerDots people={['Kavi', 'Juan', 'Chris']} /></div>
        <span className="eyebrow">NOV 11-12 · 1 NIGHT</span>
        <h2>Courtyard by Marriott Atlanta Downtown</h2>
        <p className="hotel-address">133 Carnegie Way, Atlanta, GA 30303</p>
        <div className="hotel-facts"><span>Shared arrival night</span><span>3 travelers</span><span>Confirmation in Wallet later</span></div>
        <div className="hotel-links"><a href="https://www.google.com/maps/search/?api=1&query=Courtyard%20by%20Marriott%20Atlanta%20Downtown" target="_blank" rel="noreferrer"><NavIcon name="map" />Maps ↗</a><a href="https://www.marriott.com/en-us/hotels/atldo-courtyard-atlanta-downtown/overview/" target="_blank" rel="noreferrer">Official hotel ↗</a></div>
      </article>
      <article className="hotel-card omni-card object-card-button" role="button" tabIndex={0} onClick={() => onOpenObject(tripHotelDetail('omni'))} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onOpenObject(tripHotelDetail('omni')) }}>
        <div className="hotel-card-head"><span className="hotel-icon"><NavIcon name="trip" /></span><TravelerDots people={['Kavi', 'Juan']} /></div>
        <span className="eyebrow">NOV 12-15 · 3 NIGHTS</span>
        <h2>Omni Atlanta Hotel at Centennial Park</h2>
        <p className="hotel-address">190 Marietta St NW, Atlanta, GA 30303</p>
        <div className="hotel-facts"><span>Check-in 4 PM</span><span>Check-out 11 AM</span><span>Connected to GWCC</span></div>
        <div className="hotel-links"><a href="https://www.google.com/maps/search/?api=1&query=Omni%20Atlanta%20Hotel%20at%20Centennial%20Park" target="_blank" rel="noreferrer"><NavIcon name="map" />Maps ↗</a><a href="https://www.omnihotels.com/hotels/atlanta-centennial-park" target="_blank" rel="noreferrer">Official hotel ↗</a></div>
      </article>
      <article className="hotel-card hilton-card object-card-button" role="button" tabIndex={0} onClick={() => onOpenObject(tripHotelDetail('hilton'))} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onOpenObject(tripHotelDetail('hilton')) }}>
        <div className="hotel-card-head"><span className="hotel-icon"><NavIcon name="trip" /></span><TravelerDots people={['Chris', 'Kyle']} /></div>
        <span className="eyebrow">NOV 12-16 · 4 NIGHTS</span>
        <h2>Hilton Atlanta</h2>
        <p className="hotel-address">255 Courtland Street NE, Atlanta, GA 30303</p>
        <div className="hotel-facts"><span>Check-in 4 PM</span><span>Check-out 11 AM</span><span>2 double beds</span><span>Reserved by Kyle</span></div>
        <div className="hotel-links"><a href="https://www.google.com/maps/search/?api=1&query=Hilton%20Atlanta%20255%20Courtland%20Street%20NE%20Atlanta%20GA%2030303" target="_blank" rel="noreferrer"><NavIcon name="map" />Maps ↗</a><button type="button" onClick={event => { event.stopPropagation(); onOpenObject(tripHotelDetail('hilton')) }}>Receipt details</button></div>
      </article>
    </div>
    <p className="trip-source-note">All travelers can see the complete lodging plan. Occupant bubbles show who is staying where; receipt details remain in the shared trip record.</p>
  </>
}

function flightAirportTime(value: string, airport: string) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: airport === 'ATL' ? 'America/New_York' : 'America/Los_Angeles' }).format(new Date(value))
}

function flightDateParts(leg: TripFlightLeg) {
  const values = new Intl.DateTimeFormat('en-US', { day: 'numeric', weekday: 'short', timeZone: leg.departure_airport === 'ATL' ? 'America/New_York' : 'America/Los_Angeles' }).formatToParts(new Date(leg.departure_at))
  return { day: values.find(part => part.type === 'day')?.value ?? '', weekday: (values.find(part => part.type === 'weekday')?.value ?? '').toUpperCase() }
}

function FlightsTripTab({ flights }: { flights: TripFlight[] }) {
  const flight = flights[0] ?? previewTripFlights[0]
  return <div className="flight-grid" aria-label="Flight details">
    <section className="flight-card">
      <div className="flight-card-head">
        <span className="flight-icon"><NavIcon name="trip" /></span>
        <div><span className="eyebrow">{flight.carrier.toUpperCase()}</span><h2>Orange County / Atlanta</h2></div>
        <TravelerDots people={['Kavi', 'Juan']} />
      </div>
      <div className="flight-confirmation"><span>Confirmation</span><strong>{flight.confirmation_code}</strong></div>
      <div className="flight-legs" aria-label="Delta itinerary legs">
        {flight.legs.map(leg => {
          const date = flightDateParts(leg)
          return <article key={leg.leg_key}>
            <time><strong>{date.day}</strong><span>{date.weekday}</span></time>
            <div><small>{leg.flight_number}</small><h3>{leg.departure_airport} to {leg.arrival_airport}</h3><p>{flightAirportTime(leg.departure_at, leg.departure_airport)} - {flightAirportTime(leg.arrival_at, leg.arrival_airport)}</p></div>
          </article>
        })}
      </div>
      <div className="flight-facts"><span>Kavi and Juan</span><span>Main Classic</span><span>Receipt in Gmail</span></div>
    </section>

    <aside className="trip-insight flight-ai">
      <span className="insight-icon"><NavIcon name="activity" /></span>
      <div><span className="eyebrow">QUIET CHECK</span><h2>No travel action needed</h2><p>The flight window matches the hotel plan: arrive before the shared Courtyard night, depart after Sunday events and Omni check-out. Only a Delta change or cancellation email should interrupt this quiet state.</p></div>
    </aside>
  </div>
}

function ArtistsSurface({ currentPerson, currentOwnerId, canWrite, onOpenObject, onOpenActivity }: { currentPerson: PersonName; currentOwnerId?: string; canWrite: boolean; onOpenObject: (detail: ObjectDetail) => void; onOpenActivity: () => void }) {
  const [view, setView] = useState<'artists' | 'cards'>('artists')
  const [artistFilter, setArtistFilter] = useState<'all' | string>('all')
  const [styleFilter, setStyleFilter] = useState<string>('all')
  const [signingFilter, setSigningFilter] = useState<'all' | 'selected' | 'maybe' | 'want_signed'>('all')
  const [cardGroupBy, setCardGroupBy] = useState<'artist' | 'style' | 'price'>('artist')
  const [cardSearch, setCardSearch] = useState('')
  const [selectedArtist, setSelectedArtist] = useState<ArtistSeed | null>(null)
  const [previewCard, setPreviewCard] = useState<ArtistCardCandidate | null>(null)
  const [signingInterest, setSigningInterest] = useState<Record<string, ArtistSigningInterestStatus>>(() => {
    if (!currentOwnerId) return {}
    const cached = readOfflineContinuity(currentOwnerId)?.lanes.artistSigningInterests
    return cached && typeof cached === 'object' ? cached as Record<string, ArtistSigningInterestStatus> : {}
  })
  const [signingInterestError, setSigningInterestError] = useState<string | null>(null)
  const [collapsedCardGroups, setCollapsedCardGroups] = useState<Record<string, boolean>>({})
  const [catalogState, setCatalogState] = useState<{
    source: 'fallback' | 'offline' | 'supabase'
    artists: ArtistSeed[]
    cards: ArtistCardCandidate[]
    error?: string
  }>(() => {
    const cached = currentOwnerId ? readOfflineContinuity(currentOwnerId)?.lanes.artistCatalog : null
    if (cached && typeof cached === 'object') {
      const catalog = cached as { artists?: ArtistSeed[]; cards?: ArtistCardCandidate[] }
      if (Array.isArray(catalog.artists) && Array.isArray(catalog.cards)) return { source: 'offline', artists: catalog.artists, cards: catalog.cards }
    }
    return { source: 'fallback', artists: artistSeeds, cards: artistCardCandidates }
  })
  const localQaModes = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return new Set(
      (params.get('qa') ?? params.get('uiQa') ?? '')
        .split(',')
        .map(mode => mode.trim().toLowerCase())
        .filter(Boolean),
    )
  }, [])
  const shouldSeedSigningQa = localQaModes.has('artist-signing') || localQaModes.has('signed-artists')
  const previewSigningInterest = useMemo(
    () => shouldSeedSigningQa ? buildPreviewSigningInterest(catalogState.cards) : {},
    [catalogState.cards, shouldSeedSigningQa],
  )
  useEffect(() => {
    let cancelled = false
    if (!navigator.onLine) return () => { cancelled = true }
    loadArtistCatalogFromSupabase()
      .then(catalog => {
        if (!cancelled && catalog.cards.length) {
          setCatalogState({ source: 'supabase', artists: catalog.artists, cards: catalog.cards })
          if (currentOwnerId) {
            try { writeOfflineContinuityLane(currentOwnerId, 'artistCatalog', catalog) } catch { /* best-effort device continuity */ }
          }
          void cacheDeviceAssets([
            ...catalog.artists.map(artist => artist.thumbnailUrl),
            ...catalog.cards.flatMap(card => [card.artCropUrl, card.cardImageUrl]),
          ])
        }
      })
      .catch(error => {
        if (!cancelled) {
          const cached = currentOwnerId ? readOfflineContinuity(currentOwnerId)?.lanes.artistCatalog : null
          if (cached && typeof cached === 'object') {
            const catalog = cached as { artists?: ArtistSeed[]; cards?: ArtistCardCandidate[] }
            if (Array.isArray(catalog.artists) && Array.isArray(catalog.cards)) {
              setCatalogState({ source: 'offline', artists: catalog.artists, cards: catalog.cards })
              return
            }
          }
          setCatalogState({
            source: 'fallback',
            artists: artistSeeds,
            cards: artistCardCandidates,
            error: error instanceof Error ? error.message : 'Artist catalog could not be refreshed.',
          })
        }
    })
    return () => { cancelled = true }
  }, [currentOwnerId])
  useEffect(() => {
    let cancelled = false
    if (!supabase || !currentOwnerId || currentOwnerId.startsWith('preview-')) {
      setSigningInterest(previewSigningInterest)
      setSigningInterestError(null)
      return () => { cancelled = true }
    }
    if (!navigator.onLine) {
      const cached = readOfflineContinuity(currentOwnerId)?.lanes.artistSigningInterests
      if (cached && typeof cached === 'object') setSigningInterest(cached as Record<string, ArtistSigningInterestStatus>)
      return () => { cancelled = true }
    }
    loadArtistSigningInterestMap(currentOwnerId)
      .then(next => {
        if (cancelled) return
        setSigningInterest(next)
        try { writeOfflineContinuityLane(currentOwnerId, 'artistSigningInterests', next) } catch { /* best-effort device continuity */ }
        setSigningInterestError(null)
      })
      .catch(error => {
        if (!cancelled) setSigningInterestError(error instanceof Error ? error.message : 'Signing interests could not be refreshed.')
      })
    return () => { cancelled = true }
  }, [currentOwnerId, previewSigningInterest])
  const pocArtistSeeds = catalogState.artists
  const pocArtistNameSet = new Set(pocArtistSeeds.map(seed => normalizeArtistName(seed.title)))
  const activeArtistCardCandidates = catalogState.cards.filter(card => pocArtistNameSet.has(normalizeArtistName(card.artistName)))
  const officialArtistSeeds = pocArtistSeeds.filter(seed => seed.signal === 'Confirmed artist')
  const confirmedArtistCount = officialArtistSeeds.length
  const watchlistArtistCount = pocArtistSeeds.length - confirmedArtistCount
  const canUseCards = currentPerson === 'Kavi'
  const canonicalCardStyle = (style: string) => {
    const normalized = style.trim().replace(/\s+/g, ' ')
    if (!normalized) return 'Other / unclear'
    const lower = normalized.toLowerCase()
    if (lower.includes('abstract') || lower.includes('surreal') || lower.includes('symbolic') || lower.includes('geometric')) return 'Abstract / surreal'
    if (lower.includes('stylized') || lower.includes('atmospheric') || lower.includes('landscape') || lower.includes('environment') || lower.includes('impressionistic') || lower.includes('painterly')) return 'Stylized / atmospheric'
    if (lower.includes('representational') || lower.includes('realist') || lower.includes('naturalistic') || lower.includes('fantasy') || lower.includes('illustration')) return 'Representational'
    return 'Other / unclear'
  }
  const cardHasAbstractFit = (card: ArtistCardCandidate) => {
    const style = canonicalCardStyle(card.visualStyle).toLowerCase()
    const fit = card.abstractSurrealFocus.toLowerCase()
    return fit === 'strong'
      || fit === 'possible'
      || style.includes('abstract')
      || style.includes('surreal')
  }
  const styleGroupForCard = (card: ArtistCardCandidate) => {
    return canonicalCardStyle(card.visualStyle)
  }
  const cardStyleFilterOptions = Array.from(new Set(activeArtistCardCandidates.map(styleGroupForCard))).sort((a, b) => a.localeCompare(b))
  const normalizedCardSearch = cardSearch.trim().toLowerCase()
  const signingKeyForCard = (card: ArtistCardCandidate) => card.printingId ?? card.id
  const visibleArtistSeeds = pocArtistSeeds.filter(seed => {
    if (!normalizedCardSearch) return true
    const searchable = [
      seed.title,
      seed.signal,
      seed.status,
      seed.attendance,
      seed.summary,
      ...(seed.facts ?? []).map(fact => `${fact.label} ${fact.value}`),
    ].join(' ').toLowerCase()
    return searchable.includes(normalizedCardSearch)
  })
  const visibleCards = activeArtistCardCandidates.filter(card => {
    if (artistFilter !== 'all' && normalizeArtistName(card.artistName) !== normalizeArtistName(artistFilter)) return false
    const signingStatus = signingInterest[signingKeyForCard(card)]
    if (signingFilter === 'selected' && !signingStatus) return false
    if (signingFilter === 'maybe' && signingStatus !== 'maybe') return false
    if (signingFilter === 'want_signed' && signingStatus !== 'want_signed') return false
    if (styleFilter.startsWith('group:') && styleGroupForCard(card) !== styleFilter.slice(6)) return false
    if (normalizedCardSearch) {
      const searchable = [
        card.cardName,
        card.artistName,
        card.setCode,
        card.setName,
        card.collectorNumber,
        styleGroupForCard(card),
        card.specialTreatment,
        card.styleNotes,
        card.printingType,
        card.rarity,
      ].join(' ').toLowerCase()
      if (!searchable.includes(normalizedCardSearch)) return false
    }
    return true
  })
  const priceTierForCard = (card: ArtistCardCandidate) => {
    const price = Number.parseFloat(card.marketPrice.replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(price)) return 'Price unknown'
    if (price < 10) return 'Below $10'
    if (price <= 20) return '$10–20'
    return '$20+'
  }
  const cardGroupLabel = (card: ArtistCardCandidate) => {
    if (cardGroupBy === 'artist') return card.artistName
    if (cardGroupBy === 'style') return styleGroupForCard(card)
    return priceTierForCard(card)
  }
  const cardGroupKey = (label: string) => `${cardGroupBy}:${label}`
  const toggleCardGroup = (label: string) => setCollapsedCardGroups(current => {
    const key = cardGroupKey(label)
    return { ...current, [key]: !current[key] }
  })
  const selectedSigningCardsByArtist = useMemo(() => {
    const summary: Record<string, ArtistCardCandidate[]> = {}
    for (const card of activeArtistCardCandidates) {
      const status = signingInterest[signingKeyForCard(card)]
      if (!status) continue
      const artistKey = normalizeArtistName(card.artistName)
      summary[artistKey] = [...(summary[artistKey] ?? []), card]
    }
    return summary
  }, [activeArtistCardCandidates, signingInterest])
  const selectedSigningCount = Object.keys(signingInterest).length
  const openCardsForArtist = (artistName: string) => {
    if (!canUseCards) return
    setSelectedArtist(null)
    setPreviewCard(null)
    setView('cards')
    setArtistFilter(artistName)
    setSigningFilter('all')
    setCardGroupBy('artist')
    setCardSearch('')
    setCollapsedCardGroups({})
  }
  const openSelectedCardsForArtist = (artistName: string, card?: ArtistCardCandidate) => {
    if (!canUseCards) return
    setSelectedArtist(null)
    setView('cards')
    setArtistFilter(artistName)
    setSigningFilter('selected')
    setCardGroupBy('artist')
    setCardSearch('')
    setCollapsedCardGroups({})
    if (card) setPreviewCard(card)
  }
  const toggleSigningInterest = async (card: ArtistCardCandidate, status: ArtistSigningInterestStatus) => {
    if (!canUseCards) return
    const key = signingKeyForCard(card)
    const priorStatus = signingInterest[key]
    const nextStatus = priorStatus === status ? undefined : status
    setSigningInterest(current => {
      const next = { ...current }
      if (nextStatus) next[key] = nextStatus
      else delete next[key]
      if (currentOwnerId && !currentOwnerId.startsWith('preview-')) {
        try { writeOfflineContinuityLane(currentOwnerId, 'artistSigningInterests', next) } catch { /* best-effort device continuity */ }
      }
      return next
    })

    if (!canWrite || !supabase || !currentOwnerId || currentOwnerId.startsWith('preview-')) return
    if (!card.artistId || !card.cardId || !card.printingId) {
      setSigningInterestError('This card is missing canonical catalog ids, so the signing pick was not saved.')
      return
    }

    const restorePrior = () => setSigningInterest(current => {
      const next = { ...current }
      if (priorStatus) next[key] = priorStatus
      else delete next[key]
      if (currentOwnerId && !currentOwnerId.startsWith('preview-')) {
        try { writeOfflineContinuityLane(currentOwnerId, 'artistSigningInterests', next) } catch { /* best-effort device continuity */ }
      }
      return next
    })

    if (!nextStatus) {
      const { error } = await supabase
        .from('artist_signing_interests')
        .delete()
        .eq('owner_id', currentOwnerId)
        .eq('printing_id', card.printingId)
      if (error) {
        restorePrior()
        setSigningInterestError(error.message)
      } else {
        setSigningInterestError(null)
      }
      return
    }

    const now = new Date().toISOString()
    const updateResult = await supabase
      .from('artist_signing_interests')
      .update({ interest_status: nextStatus, updated_at: now })
      .eq('owner_id', currentOwnerId)
      .eq('printing_id', card.printingId)
      .select('id')
    if (updateResult.error) {
      restorePrior()
      setSigningInterestError(updateResult.error.message)
      return
    }
    if (!updateResult.data?.length) {
      const insertResult = await supabase.from('artist_signing_interests').insert({
        owner_id: currentOwnerId,
        artist_id: card.artistId,
        card_id: card.cardId,
        printing_id: card.printingId,
        interest_status: nextStatus,
        updated_at: now,
      })
      if (insertResult.error) {
        restorePrior()
        setSigningInterestError(insertResult.error.message)
        return
      }
    }
    setSigningInterestError(null)
  }
  const groupedVisibleCards = visibleCards.reduce<Array<{ label: string; cards: ArtistCardCandidate[] }>>((groups, card) => {
    const label = cardGroupLabel(card)
    const existing = groups.find(group => group.label === label)
    if (existing) existing.cards.push(card)
    else groups.push({ label, cards: [card] })
    return groups
  }, [])
  const viewTabs = (mobile = false) => <div className={`artist-view-tabs plan-view-toggle map-tabs${mobile ? ' mobile-surface-view-tabs' : ''}`} role="tablist" aria-label="Artist planning views">
    <button type="button" className={view === 'artists' ? 'active' : ''} onClick={() => setView('artists')}>Artists</button>
    <button type="button" className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}>Cards</button>
  </div>
  return <section className="artists-surface" aria-label="Artists">
    {canUseCards && <div className="artist-top-tools">
      <div className="surface-view-tabs-desktop">{viewTabs()}</div>
      <MobileHeaderViewSlot>{viewTabs(true)}</MobileHeaderViewSlot>
      <label className="artist-card-search">
        <span aria-hidden="true">⌕</span>
        <input value={cardSearch} onChange={event => setCardSearch(event.target.value)} placeholder={view === 'cards' ? 'Find card, artist, style' : 'Find artist'} />
        {cardSearch && <button type="button" className="artist-card-search-clear" aria-label="Clear card search" onClick={() => setCardSearch('')}>×</button>}
      </label>
    </div>}
    {(view === 'artists' || !canUseCards) && <section className="artists-status-card">
      <div className="artist-status-icon" aria-hidden="true"><NavIcon name="artists" /></div>
      <div>
        <span className="eyebrow">ATLANTA 2026</span>
        <h2>{confirmedArtistCount} confirmed Art of Magic artists{watchlistArtistCount ? ` + ${watchlistArtistCount} watchlist seed` : ''}.</h2>
        <p>The official guest page now lists Cynthia Sheppard, Mark Poole, and Serena Malyon for all days. Rebecca Guay is included as an unconfirmed planning seed, not as an Atlanta-confirmed guest.</p>
      </div>
      <div className="artist-status-actions">
        <a href="https://mcatlanta.mtgfestivals.com/en-us/guests.html" target="_blank" rel="noreferrer">Official guests ↗</a>
        <button type="button" onClick={onOpenActivity}>Open Activity</button>
      </div>
    </section>}
    {view === 'artists' || !canUseCards ? <div className="artists-layout">
        <section className="artist-seed-list" aria-label="MagicCon artists and watchlist seeds">
          {visibleArtistSeeds.map(seed => {
            const artistSigningKey = normalizeArtistName(seed.title)
            const selectedSigningCards = canUseCards ? selectedSigningCardsByArtist[artistSigningKey] ?? [] : []
            const selectedSigningCardsScrollable = selectedSigningCards.length > 3
            return <article key={seed.id} className={`artist-seed-card featured ${selectedSigningCards.length ? 'has-selected-cards' : ''} ${seed.signal !== 'Confirmed artist' ? 'watchlist' : ''}`}>
              <div
                role="button"
                tabIndex={0}
                className="artist-seed-main"
                onClick={() => setSelectedArtist(seed)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedArtist(seed)
                  }
                }}
              >
                <span className="artist-seed-mark"><NavIcon name="artists" /></span>
                <span>
                  <small>{seed.signal}</small>
                  <strong>{seed.title}</strong>
                  <em>
                    {seed.status} · {seed.attendance}
                    <a className="artist-scryfall-link" href={scryfallArtistSearchUrl(seed.title)} target="_blank" rel="noreferrer" aria-label={`Open ${seed.title} cards on Scryfall`} title={`Scryfall cards by ${seed.title}`} onClick={event => event.stopPropagation()}>
                      <span aria-hidden="true">🔗</span>
                      <span>Scryfall</span>
                    </a>
                  </em>
                </span>
              </div>
              {selectedSigningCards.length > 0 && <div className={`artist-selected-card-strip-shell ${selectedSigningCardsScrollable ? 'can-scroll' : ''}`} aria-label={`${seed.title} selected signing cards`}>
                {selectedSigningCardsScrollable && <button type="button" className="artist-selected-card-scroll prev" aria-label={`Scroll ${seed.title} selected cards left`} onClick={event => {
                  event.stopPropagation()
                  event.currentTarget.parentElement?.querySelector<HTMLElement>('.artist-selected-card-strip')?.scrollBy({ left: -116, behavior: 'smooth' })
                }}>‹</button>}
                <div className="artist-selected-card-strip">
                  {selectedSigningCards.map(card => {
                    const status = signingInterest[signingKeyForCard(card)]
                    return <button key={signingKeyForCard(card)} type="button" className={`artist-selected-card-thumb ${status === 'want_signed' ? 'sure' : 'maybe'}`} title={`${card.cardName} · ${status === 'want_signed' ? 'for sure' : 'hearted'}`} onClick={event => {
                      event.stopPropagation()
                      openSelectedCardsForArtist(seed.title, card)
                    }}>
                      <img src={card.cardImageUrl || card.artCropUrl} alt={card.cardName} loading="lazy" />
                      <span><ActionIcon name={status === 'want_signed' ? 'sign' : 'heart'} /></span>
                    </button>
                  })}
                </div>
                {selectedSigningCardsScrollable && <button type="button" className="artist-selected-card-scroll next" aria-label={`Scroll ${seed.title} selected cards right`} onClick={event => {
                  event.stopPropagation()
                  event.currentTarget.parentElement?.querySelector<HTMLElement>('.artist-selected-card-strip')?.scrollBy({ left: 116, behavior: 'smooth' })
                }}>›</button>}
              </div>}
              {seed.thumbnailUrl && <button type="button" className="artist-seed-thumb artist-seed-thumb-button" onClick={() => setSelectedArtist(seed)} aria-label={`Open ${seed.title} details`}><img src={seed.thumbnailUrl} alt="" loading="lazy" /></button>}
            </article>
          })}
        </section>
      </div>
      : <section className="artist-cards-workbench" aria-label="Kavi card signing workbench">
        <div className="artist-cards-head">
          <div>
            <span className="eyebrow">KAVI CARD WORKBENCH</span>
            <h2>{visibleCards.length} {signingFilter === 'all' ? 'candidate' : 'selected'} cards for POC artists.</h2>
          </div>
          <div className="artist-card-filters" aria-label="Card filters">
            <label className="artist-group-select">
              <span>Group by</span>
              <select value={cardGroupBy} onChange={event => setCardGroupBy(event.target.value as 'artist' | 'style' | 'price')}>
                <option value="artist">Artist</option>
                <option value="style">Style</option>
                <option value="price">Price tier</option>
              </select>
            </label>
            <select value={artistFilter} onChange={event => setArtistFilter(event.target.value)}>
              <option value="all">All artists</option>
              {pocArtistSeeds.map(seed => <option key={seed.id} value={seed.title}>{seed.title}</option>)}
            </select>
            <select value={styleFilter} onChange={event => setStyleFilter(event.target.value)}>
              <option value="all">All styles</option>
              {cardStyleFilterOptions.map(style => <option key={style} value={`group:${style}`}>{style}</option>)}
            </select>
            <button
              type="button"
              className="artist-card-selected-toggle"
              aria-label={signingFilter === 'all' ? 'Show only hearted or signed cards' : 'Show all cards'}
              title={signingFilter === 'all' ? `Show ${selectedSigningCount} hearted or signed cards` : 'Show all cards'}
              aria-pressed={signingFilter !== 'all'}
              onClick={() => setSigningFilter(signingFilter === 'all' ? 'selected' : 'all')}
            >
              <ActionIcon name="heart" />
              {selectedSigningCount > 0 && <span>{selectedSigningCount}</span>}
            </button>
          </div>
        </div>
        <div className="artist-card-groups">
          {groupedVisibleCards.map(group => {
            const collapsed = Boolean(collapsedCardGroups[cardGroupKey(group.label)])
            return <section key={group.label} className={`artist-card-group ${collapsed ? 'collapsed' : ''}`} aria-label={`${group.label} cards`}>
            <button type="button" className="artist-card-group-head" aria-expanded={!collapsed} onClick={() => toggleCardGroup(group.label)}>
              <h3>{group.label}</h3>
              <em>
                <span>{group.cards.length}</span>
                <b aria-hidden="true">{collapsed ? '⌄' : '⌃'}</b>
              </em>
            </button>
            {!collapsed && <div className="artist-card-visual-grid">
              {group.cards.map(card => <button key={card.id} type="button" className={`artist-card-candidate ${card.tasteMatch.toLowerCase().includes('strong') ? 'taste-strong' : ''}`} onClick={() => setPreviewCard(card)}>
                <span className="artist-card-art"><img src={card.artCropUrl} alt={`${card.cardName} art by ${card.artistName}`} loading="lazy" /></span>
                <span className="artist-card-copy">
                  <small>{card.artistName}</small>
                  <strong>{card.cardName}</strong>
                  <em>{card.setCode} #{card.collectorNumber} · {card.foil} · qty {card.quantity}</em>
                  <span className="artist-card-tags">
                    <i>{styleGroupForCard(card)}</i>
                    {card.abstractSurrealFocus !== 'Low' && <i>{card.abstractSurrealFocus} fit</i>}
                    <i>{card.marketPrice}</i>
                    {card.specialTreatment && <i>{card.specialTreatment}</i>}
                    {card.tasteMatch.toLowerCase().includes('strong') && <i>taste match</i>}
                    {card.reviewForTaste === 'Yes' && !card.tasteMatch.toLowerCase().includes('strong') && <i>review</i>}
                    {signingInterest[signingKeyForCard(card)] === 'maybe' && <i>hearted</i>}
                    {signingInterest[signingKeyForCard(card)] === 'want_signed' && <i>for sure</i>}
                  </span>
                  <span className="artist-card-note">{card.styleNotes}</span>
                </span>
              </button>)}
            </div>}
          </section>})}
        </div>
      </section>}
    {canUseCards && previewCard && <div className="artist-card-popover-backdrop" role="dialog" aria-modal="true" aria-label={`${previewCard.cardName} card art preview`} onMouseDown={event => {
      if (event.target === event.currentTarget) setPreviewCard(null)
    }}>
      <div className="artist-card-popover">
        <button type="button" className="detail-close persistent-detail-close artist-card-popover-close" aria-label="Close card preview" onClick={() => setPreviewCard(null)}>×</button>
        <div className="artist-card-popover-art">
          <img src={previewCard.cardImageUrl} alt={`${previewCard.cardName} card art by ${previewCard.artistName}`} />
        </div>
        <div className="artist-card-popover-copy">
          <div className="artist-card-popover-topline">
            <span className="eyebrow">Card details</span>
            <span className="artist-card-popover-topline-actions">
              <a href={previewCard.scryfallUrl} target="_blank" rel="noreferrer" aria-label={`Open ${previewCard.cardName} on Scryfall`}>🔗 Scryfall</a>
            </span>
          </div>
          <h3>{previewCard.cardName}</h3>
          <p>{previewCard.artistName} · {previewCard.setName} · {previewCard.setCode} #{previewCard.collectorNumber}</p>
          <dl className="artist-card-detail-grid">
            <div><dt>Market</dt><dd>{previewCard.marketPrice}</dd></div>
            <div><dt>Owned</dt><dd>{previewCard.quantity}</dd></div>
            <div><dt>Foil</dt><dd>{previewCard.foil}</dd></div>
            <div><dt>Rarity</dt><dd>{previewCard.rarity}</dd></div>
            <div><dt>Art fit</dt><dd>{previewCard.abstractSurrealFocus}</dd></div>
            <div><dt>Confidence</dt><dd>{previewCard.taxonomyConfidence}</dd></div>
          </dl>
          <div className="artist-card-tags">
            <i>{styleGroupForCard(previewCard)}</i>
            {previewCard.specialTreatment && <i>{previewCard.specialTreatment}</i>}
            {previewCard.reviewForTaste === 'Yes' && <i>review for taste</i>}
          </div>
          <p>{previewCard.styleNotes}</p>
          <small>{previewCard.priceAsOf}</small>
          {signingInterestError && <small className="artist-card-sync-error">Signing pick could not be saved: {signingInterestError}</small>}
          <span className="artist-signing-actions" aria-label="Signing interest">
            <button type="button" className="maybe" aria-label="Heart for possible signing" title="Heart" aria-pressed={signingInterest[signingKeyForCard(previewCard)] === 'maybe'} onClick={() => void toggleSigningInterest(previewCard, 'maybe')}>
              <ActionIcon name="heart" />
            </button>
            <button type="button" className="sure" aria-label="For sure for signing" title="For sure" aria-pressed={signingInterest[signingKeyForCard(previewCard)] === 'want_signed'} onClick={() => void toggleSigningInterest(previewCard, 'want_signed')}>
              <ActionIcon name="sign" />
            </button>
          </span>
        </div>
      </div>
    </div>}
    {selectedArtist && <div className="artist-detail-popover-backdrop" role="dialog" aria-modal="true" aria-label={`${selectedArtist.title} artist details`} onMouseDown={event => {
      if (event.target === event.currentTarget) setSelectedArtist(null)
    }}>
      <div className="artist-detail-popover">
        <button type="button" className="detail-close persistent-detail-close artist-detail-popover-close" aria-label="Close artist details" onClick={() => setSelectedArtist(null)}>×</button>
        <div className="artist-detail-popover-head">
          <span className="eyebrow">{selectedArtist.signal}</span>
        </div>
        <div className="artist-detail-popover-body">
          {selectedArtist.thumbnailUrl && <img className="artist-detail-popover-image" src={selectedArtist.thumbnailUrl} alt="" />}
          <div className="artist-detail-popover-copy">
            <h3>{selectedArtist.title}</h3>
            <p>{selectedArtist.summary}</p>
            <dl>
              <div><dt>Status</dt><dd>{selectedArtist.status}</dd></div>
              <div><dt>Attendance</dt><dd>{selectedArtist.attendance}</dd></div>
              {selectedArtist.facts?.slice(0, 3).map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
            </dl>
            <div className="artist-detail-popover-links">
              <a href={scryfallArtistSearchUrl(selectedArtist.title)} target="_blank" rel="noreferrer" aria-label={`Open ${selectedArtist.title} cards on Scryfall`}>🔗 Scryfall</a>
            {selectedArtist.bioUrl && <a href={selectedArtist.bioUrl} target="_blank" rel="noreferrer" aria-label={`Open official ${selectedArtist.title} source`}>🔗 Official source</a>}
            </div>
            {canUseCards && <button type="button" className="artist-go-cards-button" onClick={() => openCardsForArtist(selectedArtist.title)}>
              Go to Cards
              <span>show only {selectedArtist.title}</span>
            </button>}
          </div>
        </div>
      </div>
    </div>}
  </section>
}

function CalendarDayHeader({ day, date, label }: { day: string; date: string; label: string }) {
  return <div className="calendar-day-header">
    <span>{day}</span>
    <strong>{date}</strong>
    <em>{label}</em>
  </div>
}

function AgendaMarker({
  time,
  label,
  detail,
  onOpen,
}: {
  time: string
  label: string
  detail?: string
  onOpen?: () => void
}) {
  const content = <>
    <span className="marker-time">{time}</span>
    <span className="marker-copy">{label}</span>
    {detail && <span className="marker-detail">{detail}</span>}
  </>
  return onOpen
    ? <button type="button" className="agenda-marker" onClick={onOpen}>{content}</button>
    : <div className="agenda-marker">{content}</div>
}

function CalendarSurface({ slice, events, flights, selectionRows, companions, notes, currentOwnerId, currentPerson, onAddNote, onDeleteNote, onUpdateEvent, onPurchase, onOpenExplore, onOpenPlan, onOpenPlanEvent, onOpenTrip, onChangeState, online, saving, canCommitBlackLotus }: { slice: TrustSlice; events: ExploreEvent[]; flights: TripFlight[]; selectionRows: UserSelectionRow[]; companions: CompanionMember[]; notes: ContextNote[]; currentOwnerId?: string; currentPerson: PersonName; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; onUpdateEvent: (id: string, state: ExploreState) => void; onPurchase: (id: string, purchased: boolean) => void; onOpenExplore: () => void; onOpenPlan: () => void; onOpenPlanEvent: (id: string) => void; onOpenTrip: () => void; onChangeState: (state: PlanningState) => void; online: boolean; saving: boolean; canCommitBlackLotus: boolean }) {
  const [mode, setMode] = useState<'upcoming' | 'past'>('upcoming')
  const [filter, setFilter] = useState<CalendarFilter>('all')
  const [detail, setDetail] = useState<CalendarDetail | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => purchaseQaEventId(events))
  const [selectedPeople, setSelectedPeople] = useState<PersonName[]>(() => readPeopleVisibility(currentOwnerId, currentPerson))
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const toolbarStartRef = useRef(0)
  const [toolbarPinned, setToolbarPinned] = useState(false)
  const [toolbarHeight, setToolbarHeight] = useState(0)
  const flightProjection = tripFlightCalendarProjection(flights)
  const outboundDepartureTime = flightAirportTime(flightProjection.outbound.departure_at, flightProjection.outbound.departure_airport)
  const outboundArrivalTime = flightAirportTime(flightProjection.outbound.arrival_at, flightProjection.outbound.arrival_airport)
  const returnDepartureTime = flightAirportTime(flightProjection.returnLeg.departure_at, flightProjection.returnLeg.departure_airport)
  const returnArrivalTime = flightAirportTime(flightProjection.returnLeg.arrival_at, flightProjection.returnLeg.arrival_airport)
  const candidateEvents = events
  const participantMap = new Map(candidateEvents.map(event => [event.id, planParticipants(event, currentPerson, selectionRows, companions)]))
  const committedEvents = candidateEvents.filter(event => event.id !== 'bl-first-look-thursday' && (participantMap.get(event.id) ?? []).some(participant => selectedPeople.includes(participant.person) && participant.state === 'committed'))
  const selectedEvent = candidateEvents.find(event => event.id === selectedEventId) ?? null
  const openEvent = (id: string) => {
    setDetail(null)
    if (selectedEventId === id) {
      setSelectedEventId(null)
      return
    }
    setSelectedEventId(id)
  }
  const updateCalendarEvent = (event: ExploreEvent, state: ExploreState) => {
    onUpdateEvent(event.id, state)
  }
  const showTravel = filter === 'all' || filter === 'travel'
  const showConvention = filter === 'all' || filter === 'convention'
  const thursdaySelected = committedEvents.filter(event => event.day === 'Thu')
  const fridaySelected = committedEvents.filter(event => event.day === 'Fri')
  const saturdaySelected = committedEvents.filter(event => event.day === 'Sat')
  const sundaySelected = committedEvents.filter(event => event.day === 'Sun')
  const showThursday = showConvention && thursdaySelected.length > 0
  const showFriday = showConvention && fridaySelected.length > 0
  const showSaturday = showConvention && saturdaySelected.length > 0
  const showSunday = showConvention && sundaySelected.length > 0
  const hasCommittedEvent = (id: string) => committedEvents.some(event => event.id === id)
  useEffect(() => {
    setSelectedPeople(readPeopleVisibility(currentOwnerId, currentPerson))
  }, [currentOwnerId, currentPerson])
  const togglePerson = (person: PersonName) => setSelectedPeople(current => {
    const next = current.includes(person) ? current.length === 1 ? current : current.filter(item => item !== person) : [...current, person]
    writePeopleVisibility(currentOwnerId, currentPerson, next)
    return next
  })
  const renderCommittedEvent = (event: ExploreEvent) => {
    const participants = (participantMap.get(event.id) ?? []).filter(participant => selectedPeople.includes(participant.person) && participant.state === 'committed')
    const blackLotus = event.kind === 'Black Lotus'
    const icon: EventKindIconName = event.type === 'play' ? 'play' : event.type === 'info' ? 'info' : event.type === 'social' ? 'social' : 'ticketed'
    const dayNumber = event.day === 'Thu' ? '12' : event.day === 'Fri' ? '13' : event.day === 'Sat' ? '14' : '15'
    return <button key={event.id} className={`agenda-row agenda-action convention-event-row ${blackLotus ? 'lotus-row' : 'convention-row'}`} type="button" onClick={() => openEvent(event.id)}>
      <div className="agenda-date"><strong>{dayNumber}</strong><span>{event.day.toUpperCase()}</span><em>{event.time}</em></div>
      <div className={`agenda-icon type-${event.type}`}><EventKindIcon name={icon} /></div>
      <div className="agenda-copy"><span className="agenda-kind">{blackLotus ? `Black Lotus · ${event.type}` : `${event.type} event`}</span><h2>{displayEventTitle(event)}</h2><p>{event.fit}</p></div>
      {blackLotus && <span className="calendar-source-badge" title="Black Lotus" aria-label="Black Lotus"><EventKindIcon name="lotus" /></span>}
      <span className="agenda-signals"><PlanParticipantBadges participants={participants} currentPerson={currentPerson} compact /></span>
    </button>
  }

  useEffect(() => {
    const updateToolbarPin = () => {
      const toolbar = toolbarRef.current
      if (!toolbar) return
      setToolbarHeight(toolbar.offsetHeight)
      if (!toolbar.classList.contains('pinned')) {
        toolbarStartRef.current = toolbar.getBoundingClientRect().top + window.scrollY
      }
      setToolbarPinned(window.scrollY > toolbarStartRef.current)
    }
    updateToolbarPin()
    window.addEventListener('scroll', updateToolbarPin, { passive: true })
    window.addEventListener('resize', updateToolbarPin)
    return () => {
      window.removeEventListener('scroll', updateToolbarPin)
      window.removeEventListener('resize', updateToolbarPin)
    }
  }, [])

  return <section className="calendar-surface" aria-label="Meaningful dates">
    <div ref={toolbarRef} className={`calendar-toolbar surface-workbar calendar-workbar ${toolbarPinned ? 'pinned' : ''}`} data-tour-target="calendar-controls">
      <div className="calendar-modes" aria-label="Calendar period">
        <button type="button" className={mode === 'upcoming' ? 'active' : ''} onClick={() => { setMode('upcoming'); setDetail(null) }}>Upcoming</button>
        <button type="button" className={mode === 'past' ? 'active' : ''} onClick={() => { setMode('past'); setDetail(null) }}>Past</button>
      </div>
      {mode === 'upcoming' && <div className="calendar-filter" aria-label="Calendar type filter">
        {(['all', 'convention', 'travel'] as CalendarFilter[]).map(value => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value === 'convention' ? 'Convention' : 'Travel'}</button>)}
      </div>}
      {mode === 'upcoming' && <div className="plan-people-filter calendar-people-filter" aria-label="People included in Calendar">
        {planPeople.map(person => <button key={person} type="button" className={selectedPeople.includes(person) ? `active ${person.toLowerCase()}` : person.toLowerCase()} aria-pressed={selectedPeople.includes(person)} title={person} onClick={() => togglePerson(person)}><span className="person-bubble">{person === 'Kavi' ? 'Ka' : person === 'Kyle' ? 'Ky' : person[0]}</span><span className="person-filter-name">{person}</span></button>)}
      </div>}
    </div>
    {toolbarPinned && <div className="workbar-spacer" style={{ height: toolbarHeight }} aria-hidden="true" />}

    {mode === 'past' ? <div className="past-calendar">
      <div className="calendar-month"><span>COMPLETED</span><strong>Milestones</strong></div>
      <a className="agenda-row agenda-action completed-row" href="https://mcatlanta.mtgfestivals.com/en-us/badges/buy-badges.html" target="_blank" rel="noreferrer">
        <span className="agenda-date"><strong>✓</strong><span>DONE</span></span>
        <span className="agenda-icon"><NavIcon name="wallet" /></span>
        <span className="agenda-copy"><span className="agenda-kind">Completed milestone</span><strong className="agenda-title">Badges went on sale</strong><span className="agenda-summary">Official badge purchasing remains open.</span></span>
        <span className="agenda-destination external"><NavIcon name="wallet" />Official ↗</span>
      </a>
      <a className="agenda-row agenda-action completed-row" href="https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule.html" target="_blank" rel="noreferrer">
        <span className="agenda-date milestone-date-tile"><span>AUG</span><strong>4</strong><em>DONE</em></span>
        <span className="agenda-icon"><MilestoneIcon name="ticketed-play" /></span>
        <span className="agenda-copy"><span className="agenda-kind">Completed milestone</span><strong className="agenda-title">Ticketed Play events posted</strong><span className="agenda-summary">The official Atlanta schedule and event listings are available.</span></span>
        <span className="agenda-destination external"><NavIcon name="calendar" />Schedule ↗</span>
      </a>
      <a className="agenda-row agenda-action completed-row" href="https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule.html" target="_blank" rel="noreferrer">
        <span className="agenda-date milestone-date-tile"><span>AUG</span><strong>25</strong><em>10 AM PT</em></span>
        <span className="agenda-icon"><MilestoneIcon name="ticketed-play" /></span>
        <span className="agenda-copy"><span className="agenda-kind">Completed milestone</span><strong className="agenda-title">Ticketed Play purchasing opened</strong><span className="agenda-summary">Sales are live; purchased events now appear as locked calendar commitments.</span></span>
        <span className="agenda-destination external"><NavIcon name="calendar" />Purchase ↗</span>
      </a>
    </div> : <>

    <div className="calendar-month"><span>OCT</span><strong>Likely information drops</strong></div>
    {milestoneForecasts.slice(1).map(forecast => <button key={forecast.id} className={`agenda-row agenda-action milestone-row forecast-${forecast.id}`} type="button" onClick={() => setDetail(forecast.id)}>
      <div className="agenda-date milestone-date-tile"><span>{forecast.month}</span><strong>{forecast.calendarDate}</strong><em>FORECAST</em></div>
      <div className="agenda-icon forecast-symbol" aria-hidden="true"><MilestoneIcon name={forecast.icon} /></div>
      <div className="agenda-copy"><div><span className="agenda-kind">Milestone forecast</span><span className="soft-chip">{forecast.confidence}</span></div><h2>{forecast.title}</h2><p>{forecast.window} · based on recent MagicCon timing.</p></div>
      <span className="agenda-destination"><NavIcon name="notes" />Details</span>
    </button>)}

    <div className="calendar-gap"><span>then travel</span></div>
    <div className="calendar-month"><span>NOV</span><strong>Atlanta trip</strong></div>

    {showTravel && <button className="agenda-row agenda-action travel-row" type="button" onClick={onOpenTrip}>
      <div className="agenda-date"><strong>11</strong><span>WED</span><em>{outboundArrivalTime}</em></div>
      <div className="agenda-icon"><NavIcon name="trip" /></div>
      <div className="agenda-copy"><span className="agenda-kind">Flight + hotel</span><h2>Arrive ATL · Courtyard night</h2><p>{flightProjection.outbound.flight_number} lands {outboundArrivalTime}; Courtyard by Marriott Atlanta Downtown, one night.</p></div>
      <span className="agenda-destination"><NavIcon name="trip" />Trip</span>
    </button>}

    {(showTravel || showThursday) && <CalendarDayHeader day="THU" date="November 12" label={showThursday ? 'Committed events' : 'Thursday transition'} />}
    {showConvention && hasCommittedEvent('bl-progressive-sealed') && <AgendaMarker time="12:00 PM" label="Progressive Sealed pickup/play begins" detail="Committed league continues through Sunday" onOpen={() => openEvent('bl-progressive-sealed')} />}
    {showTravel && <AgendaMarker time="4:00 PM" label="Omni check-in begins" detail="Kavi + Juan hotel shift; luggage plan may matter" onOpen={() => setDetail('preview')} />}
    {showConvention && thursdaySelected.map(renderCommittedEvent)}

    {showConvention && <div className="calendar-month compact"><span>NOV 13–15</span><strong>MagicCon weekend</strong></div>}

    {showConvention && <CalendarDayHeader day="FRI" date="November 13" label={showFriday ? 'Committed events' : 'Convention day 1'} />}
    {showConvention && <AgendaMarker time="8:30 AM" label="Black Lotus lounge opens" onOpen={() => setDetail('bl-friday')} />}
    {showConvention && <AgendaMarker time="8:30 AM" label="Online store pre-order pickup begins" detail="Pickup window runs until 5 PM" onOpen={() => setDetail('bl-friday')} />}
    {showConvention && <AgendaMarker time="9:45 AM" label="Priority entry to the show floor" onOpen={() => setDetail('bl-friday')} />}
    {showConvention && <AgendaMarker time="10:00 AM" label="Show floor opens" detail="Friday show-floor hours run 10 AM–7 PM" />}
    {showConvention && fridaySelected.map(renderCommittedEvent)}
    {showConvention && <AgendaMarker time="7:00 PM" label="Show floor closes" detail="Gaming remains open until 11:59 PM" />}
    {showConvention && <AgendaMarker time="11:59 PM" label="Gaming closes" detail="End of Friday play-area hours" />}
    {showConvention && <CalendarDayHeader day="SAT" date="November 14" label={showSaturday ? 'Committed events' : 'Convention day 2'} />}
    {showConvention && <AgendaMarker time="10:00 AM" label="Show floor opens" detail="Saturday show-floor hours run 10 AM-7 PM" />}
    {showConvention && saturdaySelected.map(renderCommittedEvent)}
    {showConvention && <AgendaMarker time="7:00 PM" label="Show floor closes" detail="Gaming remains open until 11:59 PM" />}
    {showConvention && <AgendaMarker time="11:59 PM" label="Gaming closes" detail="End of Saturday play-area hours" />}

    {showConvention && <CalendarDayHeader day="SUN" date="November 15" label={showSunday ? 'Committed events' : 'Final day'} />}
    {showConvention && <AgendaMarker time="8:30 AM" label="Black Lotus lounge opens" onOpen={() => setDetail('bl-sunday')} />}
    {showConvention && <AgendaMarker time="9:45 AM" label="Priority entry to the show floor" onOpen={() => setDetail('bl-sunday')} />}
    {showConvention && <AgendaMarker time="10:00 AM" label="Show floor opens" detail="Sunday show-floor hours run 10 AM–6 PM" />}
    {showConvention && sundaySelected.map(renderCommittedEvent)}
    {showConvention && <AgendaMarker time="4:00 PM" label="Last Mystery Booster 2 draft fires" onOpen={() => setDetail('bl-sunday')} />}
    {showConvention && hasCommittedEvent('bl-progressive-sealed') && <AgendaMarker time="5:00 PM" label="Final chance to claim Progressive Sealed booster prizes" onOpen={() => openEvent('bl-progressive-sealed')} />}
    {showConvention && <AgendaMarker time="6:00 PM" label="Black Lotus lounge closes" onOpen={() => setDetail('bl-sunday')} />}
    {showConvention && <AgendaMarker time="6:00 PM" label="Gaming closes" detail="End of Sunday convention hours" />}

    {showTravel && <button className="agenda-row agenda-action travel-row airport-row" type="button" onClick={() => setDetail('airport')}>
      <div className="agenda-date"><strong>15</strong><span>SUN</span><em>TBD</em></div>
      <div className="agenda-icon"><NavIcon name="trip" /></div>
      <div className="agenda-copy"><span className="agenda-kind">Travel reminder</span><h2>Leave for ATL airport</h2><p>Keep visible before {flightProjection.returnLeg.flight_number}; set the exact time once the Sunday plan and travel buffer are final.</p></div>
      <span className="agenda-signals"><TravelerDots people={['Kavi', 'Juan']} /></span>
      <span className="agenda-destination"><NavIcon name="trip" />Trip</span>
    </button>}

    {showTravel && <button className="agenda-row agenda-action travel-row" type="button" onClick={onOpenTrip}>
      <div className="agenda-date"><strong>15</strong><span>SUN</span><em>{returnDepartureTime}</em></div>
      <div className="agenda-icon"><NavIcon name="trip" /></div>
      <div className="agenda-copy"><span className="agenda-kind">Checkout + flight</span><h2>Omni check-out · fly home</h2><p>Omni check-out 11 AM; {flightProjection.returnLeg.flight_number} departs ATL {returnDepartureTime}.</p></div>
      <span className="agenda-destination"><NavIcon name="trip" />Trip</span>
    </button>}
    </>}

    {detail && <CalendarDetailSheet detail={detail} slice={slice} flights={flights} onClose={() => setDetail(null)} onOpenPlan={onOpenPlan} onOpenTrip={onOpenTrip} onChangeState={onChangeState} online={online} saving={saving} canCommitBlackLotus={canCommitBlackLotus} />}
    {selectedEvent && <CalendarEventDetail event={selectedEvent} onPurchase={purchased => onPurchase(selectedEvent.id, purchased)} notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} onClose={() => setSelectedEventId(null)} onState={state => updateCalendarEvent(selectedEvent, state)} onOpenPlan={() => onOpenPlanEvent(selectedEvent.id)} online={online} saving={saving} canCommit />}
  </section>
}

function CalendarEventDetail({ event, notes, currentOwnerId, onAddNote, onDeleteNote, onClose, onState, onPurchase, onOpenPlan, online, saving, canCommit }: { event: ExploreEvent; notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; onClose: () => void; onState: (state: ExploreState) => void; onPurchase: (purchased: boolean) => void; onOpenPlan: () => void; online: boolean; saving: boolean; canCommit: boolean }) {
  const [copied, setCopied] = useState(false)
  const copyCode = async () => {
    if (!event.companionCode) return
    await navigator.clipboard.writeText(event.companionCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }
  return <aside className="calendar-detail-sheet calendar-event-detail event-detail-panel" aria-label={`${event.title} calendar detail`}>
    <button className="detail-close persistent-detail-close" type="button" onClick={onClose} aria-label="Close event detail">×</button>
    <header className="event-detail-heading">
      <div className="detail-head"><span className={`detail-kind ${event.kind === 'Black Lotus' ? 'lotus' : ''}`}>{event.kind}</span><span className="detail-head-actions"><span className={`event-stage stage-${event.state}`}>{eventStageLabel(event.state)}</span></span></div>
      <h2>{displayEventTitle(event)}</h2>
      <div className="detail-facts"><span><DetailFactIcon name="time" />{event.day} · {event.time}</span>{!canPurchaseEvent(event.price) && <span><EventPriceLabel event={event} icon /></span>}<span><DetailFactIcon name="duration" />{event.window}</span></div>
      <EventDetailActions event={event} onPurchase={onPurchase} />
    </header>
    <EventStateRail event={event} context="calendar" onState={onState} disabled={!online || saving} canCommit={canCommit} />
    {event.companionCode && <section className="companion-code-panel" aria-label="Magic Companion event code">
      <div><span>COMPANION CODE</span><strong>{event.companionCode}</strong><small>{copied ? 'Copied' : 'Tap to copy, then join the event in Companion.'}</small></div>
      <button type="button" onClick={() => void copyCode()}>{copied ? 'Copied' : 'Copy code'}</button>
      <a href="https://magic.wizards.com/products/companion-app" target="_blank" rel="noreferrer">Open Companion</a>
    </section>}
    <div className="detail-intel event-context-block"><span aria-hidden="true">✦</span><p><small>PLAN EFFECT</small>{event.planEffect}</p></div>
    <section className="detail-section"><strong>{event.format}</strong><p>{renderLinkedText(event.detail)}</p></section>
    {eventDecisionFacts(event).length > 0 && <div className="decision-facts" aria-label="Event logistics">{eventDecisionFacts(event).map(fact => <div key={fact.label} className={isWideEventDetail(fact.label) ? 'decision-fact-wide' : undefined}><span>{fact.icon === 'ticket' && <TicketMiniIcon />}{fact.label}</span><strong>{fact.value}</strong></div>)}</div>}
    <div className="plan-provenance"><span>{event.sourceNote?.includes('Official Atlanta') ? 'Official Atlanta source' : 'Source context'}</span><small>{renderLinkedText(event.sourceNote ?? 'Source context captured for this item.')}</small></div>
    <ObjectNotes notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} objectId={`explore-${event.id}`} objectKind="event" objectTitle={displayEventTitle(event)} context={`Event · ${displayEventTitle(event)}`} backlink="calendar" compact />
    <button className="detail-plan-link" type="button" onClick={onOpenPlan}>Open in Plan <span aria-hidden="true">›</span></button>
  </aside>
}

function CalendarDetailSheet({ detail, slice, flights, onClose, onOpenPlan, onOpenTrip, onChangeState, online, saving, canCommitBlackLotus }: { detail: CalendarDetail; slice: TrustSlice; flights: TripFlight[]; onClose: () => void; onOpenPlan: () => void; onOpenTrip: () => void; onChangeState: (state: PlanningState) => void; online: boolean; saving: boolean; canCommitBlackLotus: boolean }) {
  const forecast = milestoneForecasts.find(item => item.id === detail)
  const flightProjection = tripFlightCalendarProjection(flights)
  const outboundDepartureTime = flightAirportTime(flightProjection.outbound.departure_at, flightProjection.outbound.departure_airport)
  const outboundArrivalTime = flightAirportTime(flightProjection.outbound.arrival_at, flightProjection.outbound.arrival_airport)
  const returnDepartureTime = flightAirportTime(flightProjection.returnLeg.departure_at, flightProjection.returnLeg.departure_airport)
  const returnArrivalTime = flightAirportTime(flightProjection.returnLeg.arrival_at, flightProjection.returnLeg.arrival_airport)
  const content = forecast
    ? { eyebrow: `FORECAST · ${forecast.window.toUpperCase()}`, title: forecast.title, copy: forecast.rationale }
    : detail === 'arrival'
      ? { eyebrow: 'TRIP · NOV 11', title: 'Arrival and Courtyard night', copy: `Kavi and Juan fly ${flightProjection.outbound.flight_number} from SNA to ATL, ${outboundDepartureTime}-${outboundArrivalTime}, confirmation ${flightProjection.flight.confirmation_code}. The first hotel anchor is Courtyard by Marriott Atlanta Downtown for Kavi, Juan, and Chris.` }
      : detail === 'preview'
        ? { eyebrow: 'BLACK LOTUS · NOV 12', title: 'First Look and Omni check-in', copy: 'Kavi and Chris have the Black Lotus First Look day. Courtyard ends before Omni check-in at 4 PM, so luggage handling is the only practical transition note currently worth keeping visible.' }
        : detail === 'bl-thursday'
          ? { eyebrow: 'OFFICIAL BLACK LOTUS · NOV 12', title: 'Thursday early-access schedule', copy: 'Published BL schedule: lounge opens at 12 PM; Progressive Sealed league pickup/play begins at 12 PM; Behind the Card Frame & First Look runs 1-8 PM with several TBD content slots; Design the Unknown Planechase Card is 4:15-5:15; Paint & Sip is 6:30-7:30; Welcome Reception + First Look runs 8-11 PM. Locations are still TBD and the schedule is subject to change.' }
        : detail === 'friday'
          ? { eyebrow: 'CONVENTION · NOV 13', title: 'Friday', copy: 'No committed or purchased events are captured yet.' }
          : detail === 'bl-friday'
            ? { eyebrow: 'OFFICIAL BLACK LOTUS · NOV 13', title: 'Friday Black Lotus schedule', copy: 'Published BL schedule: lounge opens 8:30 AM; beverage service 8:30-11; online store pre-order pickup 8:30-5; priority show-floor entry 9:45; play event with special guests 2-6 PM. The play event is explicitly under construction, so this is a meaningful watch item rather than a fully defined event.' }
          : detail === 'airport'
            ? { eyebrow: 'TRIP · NOV 15', title: 'Leave for ATL airport', copy: `The reminder is restored, but its time is intentionally unset. It should account for the final Sunday plan, bags, airport buffer, and local travel conditions before ${flightProjection.returnLeg.flight_number} departs at ${returnDepartureTime}.` }
          : detail === 'sunday'
            ? { eyebrow: 'TRIP · NOV 15', title: 'Closing day and flight home', copy: `Omni check-out is 11 AM. Kavi and Juan fly ${flightProjection.returnLeg.flight_number} from ATL to SNA, ${returnDepartureTime}-${returnArrivalTime}, confirmation ${flightProjection.flight.confirmation_code}. The leave-for-airport reminder stays visible until its exact time is set from the final Sunday plan.` }
            : detail === 'bl-sunday'
              ? { eyebrow: 'OFFICIAL BLACK LOTUS · NOV 15', title: 'Sunday Black Lotus schedule', copy: 'Published BL schedule: lounge opens 8:30 AM; beverage service 8:30-11; priority show-floor entry 9:45; Mystery Booster 2 drafts fire 1-5 PM, limited to 2 per person, with the last draft firing at 4 PM; Meet & Greet / Feedback Session with the Wizards event team is 3-4 PM; lounge closes at 6 PM.' }
            : { eyebrow: 'BLACK LOTUS · NOV 14', title: slice.occurrence.title.replace('Black Lotus ', ''), copy: '11:30 AM–3:00 PM · included Black Lotus event.' }

  return <aside className="calendar-detail-sheet" aria-label={`${content.title} details`}>
    <button className="detail-close persistent-detail-close calendar-detail-close" type="button" onClick={onClose} aria-label="Close details">×</button>
    <div className="calendar-detail-head">
      <span className="eyebrow">{content.eyebrow}</span>
    </div>
    <h2>{content.title}</h2>
    <p>{content.copy}</p>
    {detail === 'event' && <>
      <div className="calendar-state-panel" aria-label="Planning state">
        {states.map(state => {
          const disabled = !online || saving || (state.value === 'committed' && !canCommitBlackLotus)
          const title = state.value === 'committed' && !canCommitBlackLotus
            ? 'Only Kavi and Chris can commit Black Lotus events.'
            : state.label
          return <button key={state.value} type="button" aria-pressed={slice.decision.planning_state === state.value} disabled={disabled} aria-label={title} title={title} onClick={() => onChangeState(state.value)}><b>{state.symbol}</b><span>{state.label}</span></button>
        })}
      </div>
      {!canCommitBlackLotus && <p className="calendar-state-note">Black Lotus stays visible to everyone, but only Kavi and Chris can commit it.</p>}
      <button className="calendar-remove" type="button" disabled={!online || saving} onClick={() => onChangeState('none')}>{slice.decision.planning_state === 'committed' ? 'Undo commitment' : 'Remove from Plan'}</button>
      <button className="detail-plan-link" type="button" onClick={onOpenPlan}>Compare in Plan <span aria-hidden="true">›</span></button>
    </>}
    {(detail === 'arrival' || detail === 'preview' || detail === 'airport' || detail === 'sunday') && <button className="detail-plan-link" type="button" onClick={onOpenTrip}>View Trip details <span aria-hidden="true">›</span></button>}
    {(detail === 'friday' || detail === 'bl-thursday' || detail === 'bl-friday' || detail === 'bl-sunday') && <button className="detail-plan-link" type="button" onClick={onOpenPlan}>Compare in Plan <span aria-hidden="true">›</span></button>}
  </aside>
}

function homeSoldOutEvents(item: ActivityItem): HomeSoldOutEvent[] {
  const finding = item.monitoringFinding
  if (!finding || finding.destination !== 'Home' || finding.evidence.intake_kind !== 'ticketed_play_inventory' || finding.evidence.transition !== 'sold_out' || !Array.isArray(finding.evidence.events)) return []
  return finding.evidence.events.flatMap(raw => {
    if (!raw || typeof raw !== 'object') return []
    const event = raw as Record<string, unknown>
    if (typeof event.title !== 'string' || typeof event.day !== 'string' || typeof event.startsAt !== 'string') return []
    return [{
      title: event.title,
      day: event.day,
      startsAt: event.startsAt,
      people: Array.isArray(event.people) ? event.people.filter((person): person is string => typeof person === 'string') : [],
      sourceEventKey: typeof event.sourceEventKey === 'string' ? event.sourceEventKey : undefined,
      eventId: typeof event.eventId === 'string' ? event.eventId : undefined,
    }]
  })
}

function groupHomeSoldOutSignals(items: ActivityItem[]) {
  const soldOutSignals = items.filter(item => homeSoldOutEvents(item).length > 0)
  if (soldOutSignals.length === 0) return items

  const dayGroups = groupHomeSoldOutEventsByDay(soldOutSignals.map(homeSoldOutEvents))
  const latest = [...soldOutSignals].sort((left, right) => new Date(right.checkedAtIso).getTime() - new Date(left.checkedAtIso).getTime())[0]
  const grouped = dayGroups.map(({ day, events }) => {
    const dayLabel = formatTicketedDay(day, false)
    const dayLongLabel = formatTicketedDay(day, true)
    const overlapCount = events.filter(event => event.people.length > 0).length
    const title = `${events.length} ${dayLabel} Ticketed Play ${events.length === 1 ? 'event is' : 'events are'} sold out`
    const timeRange = events.length === 1
      ? formatTicketedTime(events[0].startsAt)
      : `${formatTicketedTime(events[0].startsAt)}–${formatTicketedTime(events.at(-1)!.startsAt)}`
    const summary = `${timeRange} · ${overlapCount ? `${overlapCount} saved ${overlapCount === 1 ? 'plan' : 'plans'} affected` : 'No saved plans affected'}`
    return {
      ...latest,
      id: `home-ticketed-play-sold-out-${day}`,
      title,
      summary,
      severity: soldOutSignals.some(item => item.severity === 'hot') ? 'hot' as const : 'notice' as const,
      reviewState: soldOutSignals.some(item => item.reviewState === 'needs-review') ? 'needs-review' as const : latest.reviewState,
      objectDetail: {
        ...latest.objectDetail,
        id: `home-ticketed-play-sold-out-${day}-detail`,
        title: `${dayLabel} sold-out Ticketed Play`,
        summary: `${events.length} sold-out ${events.length === 1 ? 'event' : 'events'} on ${dayLongLabel}.`,
        facts: [
          { label: 'Events', value: String(events.length) },
          { label: 'Saved plans affected', value: String(overlapCount) },
        ],
        soldOutEvents: events,
        rationale: 'Sold-out observations are merged across survey runs, deduplicated by event, and grouped by convention day.',
      },
    }
  })
  return [...items.filter(item => !soldOutSignals.includes(item)), ...grouped]
}

function formatTicketedTime(startsAt: string) {
  const [hour = '0', minute = '00'] = startsAt.split(':')
  return new Date(2000, 0, 1, Number(hour), Number(minute)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatTicketedDay(day: string, includeDate: boolean) {
  return new Date(`${day}T12:00:00`).toLocaleDateString([], includeDate
    ? { weekday: 'long', month: 'long', day: 'numeric' }
    : { weekday: 'long' })
}

function HomeSurface({ slice, activityItems, currentPerson, onOpenPlan, onOpenItem, onOpenObject, onOpenActivity }: { slice: TrustSlice; activityItems: ActivityItem[]; currentPerson: PersonName; onOpenPlan: () => void; onOpenItem: (item: ActivityItem) => void; onOpenObject: (detail: ObjectDetail) => void; onOpenActivity: () => void }) {
  const [showTicketedPlayMilestone, setShowTicketedPlayMilestone] = useState(false)
  const now = Date.now()
  const homeSignals = groupHomeSoldOutSignals(homeWorthKnowingItems(activityItems, now, currentPerson))
  const featuredSale = activityItems.find(item => isFeaturedTicketedPlaySale(item, now))
  const ticketedPlaySaleIsOpen = activityItems.some(isTicketedPlaySaleOpen)
  const ordinarySignals = homeSignals.filter(item => item.id !== featuredSale?.id)
  const { hotNow: hotSignals, recent: recentSignals, earlier: earlierSignals } = partitionHomeSignals(ordinarySignals, now)
  const featuredAlreadyCounted = Boolean(featuredSale && homeSignals.some(item => item.id === featuredSale.id))
  const visibleSignalCount = homeSignals.length + (featuredSale && !featuredAlreadyCounted ? 1 : 0)
  const hotCount = hotSignals.length + (featuredSale?.severity === 'hot' && !featuredAlreadyCounted ? 1 : 0)
  const saleUrl = featuredSale?.officialResources?.find(resource => /ticketed.play|schedule/i.test(`${resource.label} ${resource.url}`))?.url
  return <div className="home-surface">
    <div className="home-main-row">
      <section className={`home-activity-lane ${hotCount ? 'has-hot' : ''}`} aria-labelledby="home-activity-heading" data-tour-target="home-signals">
        <div className="home-lane-head">
          <div><span className="eyebrow">WORTH KNOWING</span><h2 id="home-activity-heading">{visibleSignalCount ? `${visibleSignalCount} useful item${visibleSignalCount === 1 ? '' : 's'}` : 'All quiet'}</h2></div>
          <button type="button" onClick={onOpenActivity}>Full Activity</button>
        </div>
        <div className="timely-home" aria-label="Worth Knowing signals">
          {featuredSale && (saleUrl
            ? <a className="home-featured-sale" href={saleUrl} target="_blank" rel="noreferrer">
                <span className="home-featured-sale-icon"><MilestoneIcon name="ticketed-play" /></span>
                <span><small>ON SALE NOW</small><strong>Ticketed Play is up for sale!</strong><em>Open the official Ticketed Play page to purchase events.</em></span>
                <b aria-hidden="true">↗</b>
              </a>
            : <button type="button" className="home-featured-sale" onClick={() => onOpenItem(featuredSale)}>
                <span className="home-featured-sale-icon"><MilestoneIcon name="ticketed-play" /></span>
                <span><small>ON SALE NOW</small><strong>Ticketed Play is up for sale!</strong><em>Open Ticketed Play details.</em></span>
                <b aria-hidden="true">›</b>
              </button>)}
          {([['Hot now', hotSignals], ['Recent', recentSignals], ['Earlier', earlierSignals]] as const).map(([label, signals]) => signals.length > 0 && <section className="home-signal-age-group" key={label} aria-label={`${label} Worth Knowing items`}>
            <h3>{label}</h3>
            {signals.map(item => <button type="button" key={item.id} className={`signal-chip-card ${item.severity}`} onClick={() => onOpenItem(item)}>
              <span>{item.sourceKind === 'note' ? <NavIcon name="notes" /> : <AlertKindIcon kind={item.kind} />}</span>
              <div><strong>{item.title}</strong><small>{item.summary}</small></div>
              {(item.actors?.length || item.actor) && <PersonBubbles people={item.actors ?? [item.actor!]} />}
            </button>)}
          </section>)}
          {!homeSignals.length && <button type="button" className="signal-chip-card quiet" onClick={onOpenActivity}>
            <span><MilestoneIcon name="badges" /></span>
            <div><strong>No open items</strong><small>Monitoring is quiet and recent collaboration is caught up.</small></div>
          </button>}
        </div>
      </section>

      <div className="home-right-rail">
        {ticketedPlaySaleIsOpen
          ? <div className="next-milestone home-top-forecast">
              <div className="milestone-symbol" aria-hidden="true"><MilestoneIcon name="artists" /></div>
              <div><span className="eyebrow">NEXT EXPECTED</span><h2>The full artist directory is next.</h2><p>Three Art of Magic guests are listed; the broader Atlanta artist directory is still expected.</p></div>
              <span className="milestone-date"><small>Estimate</small><strong>Oct</strong></span>
            </div>
          : <button className="next-milestone home-top-forecast" type="button" onClick={() => setShowTicketedPlayMilestone(true)}>
              <div className="milestone-symbol" aria-hidden="true"><MilestoneIcon name="ticketed-play" /></div>
              <div><span className="eyebrow">NEXT EXPECTED</span><h2>Ticketed play purchasing is next.</h2><p>The schedule page is published. Now the next milestone is buying ticketed play on August 25 at 10 AM PT.</p></div>
              <span className="milestone-date"><small>Official</small><strong>Aug 25</strong></span>
            </button>}

        <section className="runway planning-runway home-runway-only" aria-labelledby="planning-runway-heading">
          <div className="runway-heading"><div><span className="eyebrow">MILESTONE RUNWAY</span><h3 id="planning-runway-heading">What we are waiting for</h3></div><span>{ticketedPlaySaleIsOpen ? '3 known · 2 waiting' : '2 known · 3 waiting'}</span></div>
          <ol>
            <li className="complete"><span className="runway-icon"><MilestoneIcon name="badges" /></span><div><strong>Badges on sale</strong><small>Live now</small></div></li>
            {ticketedPlaySaleIsOpen && <li className="complete"><span className="runway-icon"><MilestoneIcon name="ticketed-play" /></span><div><strong>Ticketed play purchasing</strong><small>Sales open</small></div></li>}
            {(ticketedPlaySaleIsOpen ? milestoneForecasts.slice(1) : milestoneForecasts).map((forecast, index) => <li key={forecast.id} className={index === 0 ? 'current' : ''}>
              <span className="runway-icon"><MilestoneIcon name={forecast.icon} /></span>
              <details className="runway-forecast">
                <summary><strong>{forecast.title}</strong><small><b>{forecast.window}</b> · {forecast.confidence}</small></summary>
                <p>{forecast.rationale}</p>
              </details>
            </li>)}
          </ol>
        </section>
      </div>
      {showTicketedPlayMilestone && <div className="milestone-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowTicketedPlayMilestone(false) }}>
        <aside className="calendar-detail-sheet milestone-detail-sheet" role="dialog" aria-modal="true" aria-label="Ticketed play purchasing milestone">
          <div className="calendar-detail-head"><span className="eyebrow">NEXT EXPECTED · AUG 25</span><button className="detail-close" type="button" onClick={() => setShowTicketedPlayMilestone(false)} aria-label="Close milestone details">×</button></div>
          <h2>Ticketed play purchasing opens next.</h2>
          <p>The official schedule is already published. Purchasing is expected to open August 25 at 10 AM PT.</p>
          <div className="milestone-not-now"><strong>NOT OPEN YET</strong><span>No action is needed until purchasing opens.</span></div>
          <p>When sales open, purchased events will become firm calendar blocks. Until then, Explore and Plan remain the right places to compare the schedule.</p>
        </aside>
      </div>}
    </div>
  </div>
}

function NotesSurface({ notes, currentOwnerId, onDeleteNote, onOpenNote, refreshFailed, onRetry }: { notes: ContextNote[]; currentOwnerId?: string; onDeleteNote: (id: string) => void; onOpenNote: (note: ContextNote) => void; refreshFailed: boolean; onRetry: () => void }) {
  const [personFilter, setPersonFilter] = useState<NotePersonFilter>('all')
  const [typeFilter, setTypeFilter] = useState<NoteTypeFilter>('all')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const filtered = notes.filter(note => {
    const personMatch = personFilter === 'all' || note.author === personFilter
    const typeMatch = typeFilter === 'all' || noteType(note) === typeFilter
    return personMatch && typeMatch
  })
  const grouped = filtered.reduce<Record<string, ContextNote[]>>((acc, note) => {
    const key = note.context
    acc[key] = [...(acc[key] ?? []), note]
    return acc
  }, {})

  return <section className="notes-surface" aria-label="Notes">
    {refreshFailed && <p className="notes-sync-notice">Showing the last available notes. <button type="button" onClick={onRetry}>Try again</button></p>}
    <NotesFilterBar notes={notes} personFilter={personFilter} typeFilter={typeFilter} onPersonFilter={setPersonFilter} onTypeFilter={setTypeFilter} />
    {notes.length === 0 && <div className="notes-compose">
      <div><span className="eyebrow">UNIVERSAL NOTES</span><h2>No notes yet.</h2><p>Notes added from events, receipts, trip items, places, and alerts collect here.</p></div>
    </div>}
    {filtered.length === 0 ? <div className="notes-empty"><strong>{notes.length ? 'No notes in this filter.' : 'Add a note from any object detail.'}</strong><span>Receipts, events, trip places, and Activity findings all use the same note layer.</span></div> : <div className="notes-index">
      {Object.entries(grouped).map(([context, contextItems]) => <section className="notes-context-group" key={context}>
        <header><div><span className="eyebrow">{contextItems[0].objectKind}</span><h3>{context}</h3></div><PersonBubbles people={[...new Set(contextItems.map(note => note.author))]} /></header>
        {contextItems.map(note => <article key={note.id} className="note-index-row">
          <button type="button" className="note-index-open" onClick={() => onOpenNote(note)}>
            <PersonBubbles people={[note.author]} />
            <span><strong>{note.body}</strong><small>{note.title} · {note.objectTitle}</small><em>{note.updatedAt} · {note.visibility}{note.objectAnchor ? ` · ${note.objectAnchor}` : ''}</em></span>
            <b aria-hidden="true">›</b>
          </button>
          {note.ownerId === currentOwnerId && <button type="button" className="note-delete" aria-label={`Delete note ${note.title}`} onClick={() => setConfirmDeleteId(note.id)}>×</button>}
          {note.ownerId === currentOwnerId && confirmDeleteId === note.id && <div className="note-delete-confirm index-confirm" role="alert">
            <span>Delete?</span>
            <button type="button" onClick={() => { onDeleteNote(note.id); setConfirmDeleteId(null) }}>Yes</button>
            <button type="button" onClick={() => setConfirmDeleteId(null)}>No</button>
          </div>}
        </article>)}
      </section>)}
    </div>}
  </section>
}

function ActivitySurface({ slice, activityItems: incomingItems, notes, onReviewChange, onFindingDecision, onFindingChoice, onFindingDefer, onOpenItem, onOpenNote }: { slice: TrustSlice; activityItems: ActivityItem[]; notes: ContextNote[]; onReviewChange: (item: ActivityItem, state: AlertReviewState) => void; onFindingDecision: (finding: MonitoringFindingRow, decision: MonitoringFindingDecision) => void; onFindingChoice: (finding: MonitoringFindingRow, choiceKey: string) => void; onFindingDefer: (finding: MonitoringFindingRow) => void; onOpenItem: (item: ActivityItem) => void; onOpenNote: (note: ContextNote) => void }) {
  const [stream, setStream] = useState<ActivityStream>('hot')
  const hotCount = incomingItems.filter(item => item.reviewState === 'needs-review' && item.severity === 'hot').length
  const eventCount = incomingItems.filter(item => item.reviewState !== 'archived' && isEventActivityItem(item)).length
  const sourceCount = incomingItems.filter(item => item.reviewState !== 'archived' && item.sourceKind === 'monitor' && item.kind !== 'manual').length
  const changeCount = incomingItems.filter(item => item.reviewState !== 'archived' && (item.sourceKind === 'selection' || item.sourceKind === 'activity-log' || (item.sourceKind === 'monitor' && isChangeLikeAlert(item as MonitoringAlert)))).length
  const activeAlertCount = incomingItems.filter(item => item.reviewState !== 'archived').length
  const streamDefs: Array<{ value: ActivityStream; label: string; icon: ReactNode; count: number }> = [
    { value: 'hot', label: 'Hot', icon: <span className="activity-fire" aria-hidden="true">🔥</span>, count: hotCount },
    { value: 'events', label: 'Events', icon: <NavIcon name="calendar" />, count: eventCount },
    { value: 'changes', label: 'Changes', icon: <AlertKindIcon kind="newsletter" />, count: changeCount },
    { value: 'sources', label: 'Sources', icon: <AlertKindIcon kind="email" />, count: sourceCount },
    { value: 'personal', label: 'Notes', icon: <NavIcon name="notes" />, count: notes.length },
    { value: 'archived', label: 'Archive', icon: <NavIcon name="activity" />, count: incomingItems.filter(item => item.reviewState === 'archived').length },
    { value: 'all', label: 'All', icon: <NavIcon name="activity" />, count: activeAlertCount },
  ]
  const alerts = incomingItems.filter(item => {
    const state = item.reviewState
    if (stream === 'all') return state !== 'archived'
    if (stream === 'hot') return state === 'needs-review' && item.severity === 'hot'
    if (stream === 'archived') return state === 'archived'
    if (state === 'archived') return false
    if (stream === 'events') return isEventActivityItem(item)
    if (stream === 'changes') return item.sourceKind === 'selection' || item.sourceKind === 'activity-log' || (item.sourceKind === 'monitor' && isChangeLikeAlert(item as MonitoringAlert))
    if (stream === 'sources') return item.sourceKind === 'monitor' && item.kind !== 'manual'
    return false
  })
  const visibleNotes = stream === 'personal' ? notes : []

  return <section className="activity-surface" aria-label="Activity and alert intake">
    <section className="activity-inbox-head">
      <div>
        <span className="eyebrow">REVIEW INBOX</span>
        <h2>{hotCount ? `${hotCount} hot finding${hotCount === 1 ? '' : 's'}` : 'Nothing hot right now.'}</h2>
        <p>Hot is the default lane for signals worth attention. Changes, sources, notes, and the full history stay one tap away.</p>
      </div>
      <span className={hotCount ? 'review-count active hot' : 'review-count'}>{hotCount}</span>
    </section>
    <div className="activity-tabs" aria-label="Activity stream filters">
      {streamDefs.map(item => <button key={item.value} type="button" aria-pressed={stream === item.value} className={stream === item.value ? 'active' : ''} onClick={() => setStream(item.value)}>
        <span className="activity-tab-icon">{item.icon}</span>
        <span>{item.label}</span>
        <b>{item.count}</b>
      </button>)}
    </div>
    <div className={`activity-layout ${incomingItems.length === 0 ? 'solo' : ''}`}>
      <div className="activity-feed">
        {visibleNotes.map(note => <article key={note.id} className="activity-card personal">
          <span className="activity-icon"><NavIcon name="notes" /></span>
          <div><span className="eyebrow">{note.visibility === 'shared' ? 'SHARED NOTE' : 'MY NOTE'}</span><button className="activity-title-link" type="button" onClick={() => onOpenNote(note)}>{note.title}</button><p>{renderLinkedText(note.body)}</p><small>{note.author} · {note.updatedAt} · {note.context}</small><button className="activity-open-object" type="button" onClick={() => onOpenNote(note)}>Details</button></div>
        </article>)}
        {alerts.map(alert => <AlertCard key={alert.id} alert={alert} onReviewChange={onReviewChange} onFindingDecision={onFindingDecision} onFindingChoice={onFindingChoice} onFindingDefer={onFindingDefer} onOpenItem={onOpenItem} />)}
        {stream === 'personal' && notes.length === 0 && <div className="activity-empty"><strong>No notes yet.</strong><span>Add a note from a receipt, event, trip item, or object detail.</span></div>}
        {stream === 'all' && visibleNotes.length === 0 && alerts.length === 0 && <div className="activity-empty"><strong>Nothing active right now.</strong><span>When something changes, it will show up here.</span></div>}
        {alerts.length === 0 && stream !== 'personal' && stream !== 'all' && <div className="activity-empty"><strong>{stream === 'hot' ? 'Nothing hot right now.' : 'No items here.'}</strong><span>{stream === 'archived' ? 'Archived findings stay available here.' : stream === 'hot' ? 'Useful calm: routine checks and quieter context stay out of this lane.' : 'Nothing needs attention in this view.'}</span></div>}
      </div>
      {incomingItems.length > 0 && <aside className="activity-rail" aria-label="Activity context">
        {incomingItems.length > 0 && <button className="activity-route-card" type="button" onClick={() => onOpenItem(incomingItems.find(alert => alert.id === 'black-lotus-elevated-watch') ?? incomingItems[0])}>
          <span className="activity-route-icon"><AlertKindIcon kind="site" /></span>
          <span><strong>Highest watch</strong><small>Hot monitoring and hard commitments float to the top first.</small></span>
        </button>}
        <details className="activity-context-card">
          <summary>What lands here</summary>
          <p>Exact source, retrieval time, useful wording, AI summary, rationale, suggested destination, and review state.</p>
        </details>
        <details className="activity-context-card">
          <summary>Source details</summary>
          <blockquote>{renderLinkedText(slice.observation.exact_wording)}</blockquote>
          <dl>
            <div><dt>Publisher</dt><dd>{slice.source.publisher_name}</dd></div>
            <div><dt>Retrieved</dt><dd>{new Date(slice.observation.retrieved_at).toLocaleString()}</dd></div>
            <div><dt>Status</dt><dd>{slice.observation.observation_status}</dd></div>
          </dl>
        </details>
      </aside>}
    </div>
  </section>
}

function AlertCard({ alert, onReviewChange, onFindingDecision, onFindingChoice, onFindingDefer, onOpenItem }: { alert: ActivityItem; onReviewChange: (item: ActivityItem, state: AlertReviewState) => void; onFindingDecision: (finding: MonitoringFindingRow, decision: MonitoringFindingDecision) => void; onFindingChoice: (finding: MonitoringFindingRow, choiceKey: string) => void; onFindingDefer: (finding: MonitoringFindingRow) => void; onOpenItem: (item: ActivityItem) => void }) {
  const choices = alert.monitoringFinding ? findingChoices(alert.monitoringFinding) : []
  return <article className={`activity-card alert-${alert.severity} review-${alert.reviewState}`}>
    <span className={`activity-icon ${alert.actor ? 'activity-person-icon' : ''}`}>
      {alert.actor
        ? <span className={`person-bubble ${alert.actor.toLowerCase()}`} title={alert.actor}>{alert.actor === 'Kavi' ? 'Ka' : alert.actor === 'Kyle' ? 'Ky' : alert.actor[0]}</span>
        : <AlertKindIcon kind={alert.kind} />}
    </span>
    <div>
      <div className="activity-card-head"><span className="eyebrow">{alert.kind}</span><small>{alert.checkedAt}</small></div>
      <button className="activity-title-link" type="button" onClick={() => onOpenItem(alert)}>{alert.title}</button>
      <p>{renderLinkedText(alert.summary)}</p>
      <div className="activity-meta">
        <span className={`review-badge ${alert.reviewState}`}>{alert.monitoringFinding ? alert.status : alert.reviewState.replace('-', ' ')}</span>
        <span>{alert.destination}</span><span>{alert.object}</span>
        {!/^https?:\/\//i.test(alert.source) && alert.source !== alert.object && <span>{alert.source}</span>}
      </div>
      {alert.officialResources && alert.officialResources.length > 0 && <nav className="finding-resource-links" aria-label="Official resources">
        {alert.officialResources.map(resource => <a key={`${resource.label}-${resource.url}`} href={resource.url} target="_blank" rel="noreferrer">{resource.label}<span aria-hidden="true"> ↗</span></a>)}
      </nav>}
      {alert.monitoringFinding && !findingIsInformational(alert.monitoringFinding) && <p className={`finding-execution-state execution-${alert.monitoringFinding.execution_status ?? alert.monitoringFinding.status}`}>{findingExecutionDetail(alert.monitoringFinding)}</p>}
      <details>
        <summary>Why this matters</summary>
        <p>{renderLinkedText(alert.rationale)}</p>
        <p>{renderLinkedText(alert.nextAction)}</p>
      </details>
      <div className="activity-review-actions">
        <button type="button" onClick={() => onOpenItem(alert)}>{alert.officialResources?.length ? 'Details' : 'Open object'}</button>
        {alert.monitoringFinding && findingIsChoiceResolution(alert.monitoringFinding) && ['needs_review', 'deferred'].includes(alert.monitoringFinding.status) && <>
          {choices.map(choice => <button key={choice.choice_key} type="button" className="finding-yes" onClick={() => onFindingChoice(alert.monitoringFinding!, choice.choice_key)}>{choice.label}</button>)}
          <button type="button" className="finding-no" onClick={() => onFindingDefer(alert.monitoringFinding!)}>Not now</button>
        </>}
        {alert.monitoringFinding && findingIsInformational(alert.monitoringFinding) && alert.reviewState !== 'reviewed' && <button type="button" onClick={() => onReviewChange(alert, 'reviewed')}>Mark read</button>}
        {alert.monitoringFinding && findingIsInformational(alert.monitoringFinding) && alert.reviewState !== 'archived' && <button type="button" onClick={() => onReviewChange(alert, 'archived')}>Archive</button>}
        {alert.monitoringFinding && findingIsInformational(alert.monitoringFinding) && alert.reviewState !== 'needs-review' && <button type="button" onClick={() => onReviewChange(alert, 'needs-review')}>Reopen</button>}
        {alert.monitoringFinding && !findingIsChoiceResolution(alert.monitoringFinding) && ['needs_review', 'authorized'].includes(alert.monitoringFinding.status) && ['not_started', 'failed', 'blocked'].includes(alert.monitoringFinding.execution_status ?? 'not_started') && findingCanAuthorize(alert.monitoringFinding) && <>
          <button type="button" className="finding-yes" onClick={() => onFindingDecision(alert.monitoringFinding!, 'yes')}>{['failed', 'blocked'].includes(alert.monitoringFinding.execution_status ?? '') ? `Retry · ${findingApprovalLabel(alert.monitoringFinding)}` : findingApprovalLabel(alert.monitoringFinding)}</button>
          {alert.monitoringFinding.status === 'needs_review' && <button type="button" className="finding-no" onClick={() => onFindingDecision(alert.monitoringFinding!, 'no')}>Dismiss</button>}
        </>}
        {alert.monitoringFinding?.status === 'needs_review' && !findingCanAuthorize(alert.monitoringFinding) && <span className="finding-action-blocked">Action mapping required</span>}
        {!alert.monitoringFinding && alert.reviewState !== 'reviewed' && <button type="button" onClick={() => onReviewChange(alert, 'reviewed')}>Mark read</button>}
        {!alert.monitoringFinding && alert.reviewState !== 'archived' && <button type="button" onClick={() => onReviewChange(alert, 'archived')}>Ignore</button>}
        {!alert.monitoringFinding && alert.reviewState !== 'needs-review' && <button type="button" onClick={() => onReviewChange(alert, 'needs-review')}>Reopen</button>}
      </div>
    </div>
  </article>
}

function AlertKindIcon({ kind }: { kind: AlertKind }) {
  const paths: Record<AlertKind, ReactNode> = {
    site: <><path d="M4 5h16v14H4Z" /><path d="M4 9h16" /><path d="M8 13h3M8 16h6" /></>,
    email: <><rect x="4" y="6" width="16" height="12" rx="2" /><path d="m4 8 8 6 8-6" /></>,
    newsletter: <><path d="M6 4h12v16H6Z" /><path d="M9 8h6M9 11h6M9 15h3" /></>,
    manual: <><path d="M5 19l4-1 9-9a2 2 0 0 0-3-3l-9 9Z" /><path d="m13 7 4 4" /></>,
  }
  return <svg className="alert-kind-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>
}

function AccountMenu({ email, online, preview, proofPack, onOpenTutorial, onSignOut }: { email: string; online: boolean; preview: boolean; proofPack: OfflineProofPackStatus; onOpenTutorial: () => void; onSignOut: () => void }) {
  const initial = email.trim().charAt(0).toUpperCase() || 'K'

  return <details className="account-menu" data-tour-target="account-chip">
    <summary aria-label="Account menu">
      <span className="account-initial">{initial}</span>
      <span className={`account-presence ${online ? 'online' : ''}`} aria-label={online ? 'Online' : 'Offline'} />
    </summary>
    <div className="account-popover">
      <span>{email}</span>
      {!preview && <span className={`offline-pack-status ${proofPack.loading || proofPack.cached < proofPack.expected ? 'pending' : 'ready'}`}>
        {proofPack.loading
          ? `Saving offline proof · ${proofPack.cached}/${proofPack.expected}`
          : proofPack.cached < proofPack.expected
            ? `Offline proof incomplete · ${proofPack.cached}/${proofPack.expected}`
            : `Offline proof ready · ${proofPack.cached}/${proofPack.expected}`}
      </span>}
      <button type="button" onClick={event => {
        const menu = event.currentTarget.closest('details')
        if (menu instanceof HTMLDetailsElement) menu.open = false
        onOpenTutorial()
      }}>Replay quick tour</button>
      {preview
        ? <button type="button" disabled>Preview mode</button>
        : <button type="button" onClick={onSignOut}>Sign out</button>}
    </div>
  </details>
}

const tutorialSteps = [
  {
    kicker: 'WELCOME',
    title: 'Your shared MagicCon field guide',
    copy: 'This app keeps the useful signals, plans, logistics, and notes for the four of you in one place.',
    icon: 'home' as NavIconName,
    surface: 'home' as Surface,
    target: 'home-signals',
    placement: 'right',
  },
  {
    kicker: 'HOME',
    title: 'Start with what changed',
    copy: 'Worth knowing collects the latest useful signals without flooding the page. The right side keeps the next milestone and the runway in view.',
    icon: 'home' as NavIconName,
    surface: 'home' as Surface,
    target: 'home-signals',
    placement: 'right',
  },
  {
    kicker: 'EXPLORE',
    title: 'Find possibilities first',
    copy: 'Explore is the wide end of the funnel. Filter the real event list, open details, and mark things Interested or Tentative without committing your calendar.',
    icon: 'explore' as NavIconName,
    surface: 'explore' as Surface,
    target: 'nav-explore',
    placement: 'right',
  },
  {
    kicker: 'PLAN',
    title: 'Compare the group',
    copy: 'Plan layers everyone’s colored bubbles onto List or Agenda. Add people to expose shared interests, overlaps, and time conflicts before anyone locks things in.',
    icon: 'plan' as NavIconName,
    surface: 'plan' as Surface,
    target: 'nav-plan',
    placement: 'right',
  },
  {
    kicker: 'CALENDAR',
    title: 'See firm commitments',
    copy: 'Calendar is the narrow end: committed events, meaningful convention times, and travel anchors. Its people filters let you compare firm schedules.',
    icon: 'calendar' as NavIconName,
    surface: 'calendar' as Surface,
    target: 'nav-calendar',
    placement: 'right',
  },
  {
    kicker: 'THE REST',
    title: 'Everything else stays close',
    copy: 'Map & Info holds venue basics, Wallet keeps passes and proof, Trip holds travel, and Artists and Notes collect the remaining useful context.',
    icon: 'map' as NavIconName,
    surface: 'home' as Surface,
    target: 'nav-map',
    placement: 'right',
  },
  {
    kicker: 'YOU ARE READY',
    title: 'The tour only starts automatically once',
    copy: 'If you ever want it again, open your user chip here and choose Replay quick tour.',
    icon: 'home' as NavIconName,
    surface: 'home' as Surface,
    target: 'account-chip',
    placement: 'bottom-right',
  },
]

const mobileTutorialSteps = [
  { kicker: 'WELCOME', title: 'Start here', copy: 'Open this menu anytime to move around MagicCon.', icon: 'home' as NavIconName, surface: 'home' as Surface, target: 'mobile-menu', placement: 'right' },
  { kicker: 'HOME', title: 'What changed', copy: 'Home keeps the latest useful signals and milestones together.', icon: 'home' as NavIconName, surface: 'home' as Surface, target: 'mobile-nav-home', placement: 'right' },
  { kicker: 'EXPLORE', title: 'Find possibilities', copy: 'Browse the full event field and mark what catches your eye.', icon: 'explore' as NavIconName, surface: 'home' as Surface, target: 'mobile-nav-explore', placement: 'right' },
  { kicker: 'PLAN', title: 'Compare the group', copy: 'Layer everyone’s picks and spot overlap or conflicts.', icon: 'plan' as NavIconName, surface: 'home' as Surface, target: 'mobile-nav-plan', placement: 'right' },
  { kicker: 'CALENDAR', title: 'Firm commitments', copy: 'See committed events, convention times, and travel anchors.', icon: 'calendar' as NavIconName, surface: 'home' as Surface, target: 'mobile-nav-calendar', placement: 'right' },
  { kicker: 'MAP & INFO', title: 'Venue basics', copy: 'Keep maps, hours, and useful on-site information close.', icon: 'map' as NavIconName, surface: 'home' as Surface, target: 'mobile-nav-map', placement: 'right' },
  { kicker: 'WALLET', title: 'Passes and proof', copy: 'Store the practical purchase and badge details you may need.', icon: 'wallet' as NavIconName, surface: 'home' as Surface, target: 'mobile-nav-wallet', placement: 'right' },
  { kicker: 'TRIP', title: 'Travel together', copy: 'Flights, hotel details, and travel notes live here.', icon: 'trip' as NavIconName, surface: 'home' as Surface, target: 'mobile-nav-trip', placement: 'right' },
  { kicker: 'ARTISTS', title: 'Find the guests', copy: 'Keep the artist list and useful signing context nearby.', icon: 'artists' as NavIconName, surface: 'home' as Surface, target: 'mobile-nav-artists', placement: 'right' },
  { kicker: 'NOTES', title: 'Context stays attached', copy: 'Shared notes remain connected to the thing you were discussing.', icon: 'notes' as NavIconName, surface: 'home' as Surface, target: 'mobile-nav-notes', placement: 'right' },
  { kicker: 'ACTIVITY', title: 'See the full history', copy: 'Review everyone’s shared changes, selections, and notes.', icon: 'activity' as NavIconName, surface: 'home' as Surface, target: 'mobile-nav-activity', placement: 'right' },
  { kicker: 'YOU ARE READY', title: 'Replay it anytime', copy: 'Open your user chip and choose Replay quick tour.', icon: 'home' as NavIconName, surface: 'home' as Surface, target: 'account-chip', placement: 'bottom-right' },
]

function OnboardingTutorial({ surface, onNavigate, onMobileMenuChange, onClose }: { surface: Surface; onNavigate: (surface: Surface) => void; onMobileMenuChange: (menu: 'main' | 'events' | 'more' | null) => void; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches)
  const [connector, setConnector] = useState<{ left: number; top: number; width: number; angle: number } | null>(null)
  const cardRef = useRef<HTMLElement | null>(null)
  const steps = mobile ? mobileTutorialSteps : tutorialSteps
  const current = steps[Math.min(step, steps.length - 1)]
  const last = step === steps.length - 1

  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)')
    const updateMode = () => { setMobile(media.matches); setStep(0) }
    media.addEventListener('change', updateMode)
    return () => media.removeEventListener('change', updateMode)
  }, [])

  useEffect(() => {
    if (surface !== current.surface) onNavigate(current.surface)
    if (mobile) onMobileMenuChange(current.target === 'mobile-menu' || current.target === 'account-chip' ? null : 'main')
    setConnector(null)
    let target: HTMLElement | undefined
    let resizeObserver: ResizeObserver | undefined
    let animationFrame = 0

    const updateConnector = () => {
      if (!target || !cardRef.current) return
      const targetRect = target.getBoundingClientRect()
      const cardRect = cardRef.current.getBoundingClientRect()
      const targetCenterX = targetRect.left + targetRect.width / 2
      const targetCenterY = targetRect.top + targetRect.height / 2
      const cardCenterX = cardRect.left + cardRect.width / 2
      const cardCenterY = cardRect.top + cardRect.height / 2
      const edgePoint = (rect: DOMRect, towardX: number, towardY: number) => {
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const deltaX = towardX - centerX
        const deltaY = towardY - centerY
        const scaleX = deltaX === 0 ? Number.POSITIVE_INFINITY : (rect.width / 2) / Math.abs(deltaX)
        const scaleY = deltaY === 0 ? Number.POSITIVE_INFINITY : (rect.height / 2) / Math.abs(deltaY)
        const scale = Math.min(scaleX, scaleY)
        return { x: centerX + deltaX * scale, y: centerY + deltaY * scale }
      }
      const start = edgePoint(cardRect, targetCenterX, targetCenterY)
      const targetEdge = edgePoint(targetRect, cardCenterX, cardCenterY)
      const targetVectorX = cardCenterX - targetCenterX
      const targetVectorY = cardCenterY - targetCenterY
      const targetDistance = Math.hypot(targetVectorX, targetVectorY) || 1
      const outlineReach = mobile ? 4 : 8
      const end = {
        x: targetEdge.x + (targetVectorX / targetDistance) * outlineReach,
        y: targetEdge.y + (targetVectorY / targetDistance) * outlineReach,
      }
      setConnector({
        left: start.x,
        top: start.y,
        width: Math.hypot(end.x - start.x, end.y - start.y),
        angle: Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI,
      })
    }

    const scheduleConnectorUpdate = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(updateConnector)
    }

    const timer = window.setTimeout(() => {
      const targets = [...document.querySelectorAll<HTMLElement>(`[data-tour-target="${current.target}"]`)]
      target = targets.find(node => node.getClientRects().length > 0)
      target?.classList.add('tutorial-highlight')
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      scheduleConnectorUpdate()
      window.addEventListener('resize', scheduleConnectorUpdate)
      window.addEventListener('scroll', scheduleConnectorUpdate, true)
      if (target && cardRef.current && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(scheduleConnectorUpdate)
        resizeObserver.observe(target)
        resizeObserver.observe(cardRef.current)
      }
    }, 180)
    return () => {
      window.clearTimeout(timer)
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', scheduleConnectorUpdate)
      window.removeEventListener('scroll', scheduleConnectorUpdate, true)
      resizeObserver?.disconnect()
      setConnector(null)
      document.querySelectorAll('.tutorial-highlight').forEach(node => node.classList.remove('tutorial-highlight'))
    }
  }, [step, mobile])

  return <div className={`tutorial-overlay ${mobile ? 'tutorial-mobile' : 'tutorial-desktop'} placement-${current.placement}`} role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
    {connector && <span className="tutorial-connector" aria-hidden="true" style={{ left: connector.left, top: connector.top, width: connector.width, transform: `rotate(${connector.angle}deg)` }} />}
    <section className="tutorial-card" key={step} ref={cardRef}>
      <button className="tutorial-close" type="button" onClick={onClose} aria-label="Close quick tour">×</button>
      <div className="tutorial-icon"><NavIcon name={current.icon} /></div>
      <span className="eyebrow">{current.kicker}</span>
      <h2 id="tutorial-title">{current.title}</h2>
      <p>{current.copy}</p>
      <div className="tutorial-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((_, index) => <span key={index} className={index === step ? 'active' : index < step ? 'done' : ''} />)}
      </div>
      <footer>
        <button type="button" className="tutorial-back" disabled={step === 0} onClick={() => setStep(value => Math.max(0, value - 1))}>Back</button>
        <small>{step + 1} of {steps.length}</small>
        <button type="button" className="tutorial-next" onClick={() => last ? onClose() : setStep(value => value + 1)}>{last ? 'Start exploring' : 'Next'}</button>
      </footer>
    </section>
  </div>
}

function MentionInbox({
  items,
  alert,
  onOpenMention,
  onOpenAlert,
  onDismissAlert,
  onRestoreAlert,
  onDismissMention,
  onRestoreMention,
}: {
  items: MentionInboxItem[]
  alert?: ActivityItem
  onOpenMention: (note: ContextNote) => void
  onOpenAlert: () => void
  onDismissAlert: (item: ActivityItem) => void
  onRestoreAlert: (item: ActivityItem) => void
  onDismissMention: (item: MentionInboxItem) => void
  onRestoreMention: (item: MentionInboxItem) => void
}) {
  const { active, dismissed } = partitionMentionInboxItems(items)
  const alertDismissed = alert?.reviewState === 'archived'
  const activeAlert = alert && !alertDismissed ? alert : undefined
  const ticketedSelloutAlert = alert?.monitoringFinding?.destination === 'Inbox'
  const unread = active.length + (activeAlert ? 1 : 0)
  const dismissedCount = dismissed.length + (alertDismissed ? 1 : 0)

  const mentionButton = (item: MentionInboxItem) => <button
    type="button"
    className="mention-item"
    onClick={event => {
      const root = event.currentTarget.closest('details.mention-inbox')
      if (root instanceof HTMLDetailsElement) root.open = false
      onOpenMention(item.note)
    }}
  >
    <PersonBubbles people={[item.note.author]} />
    <span>
      <strong>{item.note.author} mentioned you as {item.mentionToken}</strong>
      <small>{item.note.objectTitle}{item.note.objectAnchor ? ` · ${item.note.objectAnchor}` : ''}</small>
      <em>{item.note.body}</em>
    </span>
    <i aria-hidden="true">›</i>
  </button>

  const openAlertButton = (event: MouseEvent<HTMLButtonElement>) => {
    const root = event.currentTarget.closest('details.mention-inbox')
    if (root instanceof HTMLDetailsElement) root.open = false
    onOpenAlert()
  }

  return <details className={`mention-inbox ${activeAlert ? 'has-urgent' : ''}`}>
    <summary aria-label={`Mentions${unread ? `, ${unread} unread` : ''}`}>
      <svg className="mention-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="m4 8 8 6 8-6" />
      </svg>
      {activeAlert && <span className="mention-shiver-bell" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg></span>}
      {unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}
    </summary>
    <div className="mention-popover">
      <header>
        <span className="eyebrow">MENTIONS</span>
        <strong>{unread ? `${unread} for you` : 'Nothing waiting'}</strong>
      </header>
      {activeAlert && <div className="mention-row mention-alert-row">
        <button type="button" className="mention-item mention-alert-item" onClick={openAlertButton}>
          <span className="mention-alert-icon"><MilestoneIcon name="ticketed-play" /></span>
          <span><strong>{ticketedSelloutAlert ? alert?.title : 'Ticketed Play is up for sale!'}</strong><small>{ticketedSelloutAlert ? alert?.summary : 'Sales are open now.'}</small><em>{ticketedSelloutAlert ? 'A selected event sold out. Open the alert for the retained source evidence.' : 'Open the signal for purchasing details.'}</em></span>
          <i aria-hidden="true">›</i>
        </button>
        <button className="mention-dismiss" type="button" aria-label="Dismiss Ticketed Play sale alert" title="Dismiss" onClick={() => onDismissAlert(activeAlert)}>×</button>
      </div>}
      {active.length
        ? <div className="mention-list">
          {active.map(item => <div className="mention-row" key={item.id}>
            {mentionButton(item)}
            <button className="mention-dismiss" type="button" aria-label={`Dismiss mention from ${item.note.author}`} title="Dismiss" onClick={() => onDismissMention(item)}>×</button>
          </div>)}
        </div>
        : <p className="mention-empty">No @mentions yet. Shared notes that name you will land here.</p>}
      {dismissedCount > 0 && <details className="mention-dismissed">
        <summary>Dismissed <b>{dismissedCount}</b></summary>
        <div className="mention-list">
          {alertDismissed && alert && <div className="mention-row dismissed mention-alert-row">
            <button type="button" className="mention-item mention-alert-item" onClick={openAlertButton}>
              <span className="mention-alert-icon"><MilestoneIcon name="ticketed-play" /></span>
              <span><strong>{ticketedSelloutAlert ? alert.title : 'Ticketed Play is up for sale!'}</strong><small>{ticketedSelloutAlert ? alert.summary : 'Sales are open now.'}</small><em>Dismissed alert</em></span>
              <i aria-hidden="true">›</i>
            </button>
            <button className="mention-restore" type="button" aria-label="Restore Ticketed Play sale alert" onClick={() => onRestoreAlert(alert)}>Restore</button>
          </div>}
          {dismissed.map(item => <div className="mention-row dismissed" key={item.id}>
            {mentionButton(item)}
            <button className="mention-restore" type="button" aria-label={`Restore mention from ${item.note.author}`} onClick={() => onRestoreMention(item)}>Restore</button>
          </div>)}
        </div>
      </details>}
    </div>
  </details>
}

function SetupCard() {
  return <div className="center-card"><span className="kicker">LOCAL SETUP</span><h1>Project connection needed.</h1><p>Add the canonical Supabase URL and publishable key to <code>.env.local</code>.</p></div>
}

function Login({ onGoogleSignIn, message, messageTone }: { onGoogleSignIn: () => void; message: string; messageTone: 'info' | 'error' }) {
  return <div className="login-shell"><section className="login-card" aria-label="Sign in">
    <img src={assetUrl('magiccon-atlanta-peach.png')} alt="MagicCon Atlanta" />
    <span className="kicker">PRIVATE FIELD GUIDE</span><h1>Welcome back.</h1>
    <p className="login-intro">Sign in to open your private MagicCon field guide.</p>
    <button type="button" className="oauth-button" onClick={onGoogleSignIn}><span aria-hidden="true">G</span>Continue with Google</button>
    {message && <p role="status" className={`login-message ${messageTone}`}>{message}</p>}
  </section></div>
}
