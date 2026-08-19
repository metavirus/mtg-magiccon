import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { NavIcon, type NavIconName } from './NavIcon'
import { DESIGN_PREVIEW_SLICE } from './lib/designPreview'
import { ticketedPlayExploreEvents } from './data/ticketedPlayExploreEvents'
import { authRedirectUrl, resolveDesignPreviewMode } from './lib/appMode'
import { hashPath, parseExploreRouteState, type ExploreRouteState } from './lib/exploreRouting'
import {
  formatOccurrenceTime,
  readTrustSliceCache,
  writeTrustSliceCache,
  type PlanningState,
  type TrustSlice,
} from './lib/trustSlice'

const assetUrl = (path: string) => new URL(path, window.location.href).toString()
const dismissablePopupSelector = 'details.account-menu, details.mention-inbox, details.inline-assignment'

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
    home: 'No new signal needs attention.',
    calendar: 'Only the dates that shape the trip.',
    plan: 'Compare real anchors and contenders before they become commitments.',
    explore: 'Browse likely contenders without drowning in event text.',
    map: 'Trip-area orientation now; official event map when Atlanta publishes it.',
    wallet: 'Passes, receipts, and Prize Tix without hunting through email.',
    trip: 'Who is staying where, and the one transition worth noticing.',
    artists: 'Confirmed artists will show up here once Atlanta publishes them.',
    notes: 'Mostly human notes, grouped by the object that prompted them.',
    activity: 'Signals, changes, and notes in one review lane.',
  }
  return subtitles[surface]
}

async function loadTrustSlice(ownerId: string): Promise<TrustSlice> {
  if (!supabase) throw new Error('Supabase is not configured.')

  const occurrenceResult = await supabase.from('occurrences').select('*')
    .eq('owner_id', ownerId).eq('title', 'Black Lotus Planechase Unknown').single()
  if (occurrenceResult.error) throw occurrenceResult.error

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
  key: 'chris'
  displayName: PersonName
}

const fallbackCompanionMembers: CompanionMember[] = [
  { key: 'kavi', name: 'Kavi', bubbleLabel: 'Ka', bubbleColor: 'blue', badgeTier: 'black_lotus', blackLotusEntitled: true, relationship: 'owner', authEmail: 'kavigrace@gmail.com', sortOrder: 10 },
  { key: 'chris', name: 'Chris', bubbleLabel: 'C', bubbleColor: 'purple', badgeTier: 'black_lotus', blackLotusEntitled: true, relationship: 'Black Lotus companion', sortOrder: 20 },
  { key: 'juan', name: 'Juan', bubbleLabel: 'J', bubbleColor: 'green', badgeTier: 'premium', blackLotusEntitled: false, relationship: 'partner', sortOrder: 30 },
  { key: 'kyle', name: 'Kyle', bubbleLabel: 'Ky', bubbleColor: 'amber', badgeTier: 'premium', blackLotusEntitled: false, relationship: 'Chris friend', sortOrder: 40 },
]

const PREVIEW_OWNER_BY_KEY: Record<PreviewOwnerDescriptor['key'], PreviewOwnerDescriptor> = {
  chris: {
    key: 'chris',
    displayName: 'Chris',
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
  const result = await supabase.from('personal_notes')
    .select('id,owner_id,title,body,object_id,object_kind,object_title,object_anchor,context,visibility,backlink,author_label,updated_at')
    .order('updated_at', { ascending: false })
  if (result.error) throw result.error
  return (result.data as PersonalNoteRow[]).map(personalNoteRowToContextNote)
}

function userSelectionMap(rows: UserSelectionRow[]) {
  return Object.fromEntries(rows.map(row => [selectionKey(row.object_id, row.selection_key), row.selection_value]))
}

async function loadUserSelections(_ownerId: string): Promise<UserSelectionRow[]> {
  if (!supabase) return []
  const result = await supabase.from('user_selections')
    .select('owner_id,object_id,object_kind,selection_key,selection_value,updated_at')
    .order('updated_at', { ascending: false })
  if (result.error) throw result.error
  return result.data as UserSelectionRow[]
}

async function loadUserActivityEvents(_ownerId: string): Promise<UserActivityEventRow[]> {
  if (!supabase) return []
  const result = await supabase.from('user_activity_events')
    .select('id,object_id,object_kind,activity_type,actor_label,summary,details,created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (result.error) throw result.error
  return result.data as UserActivityEventRow[]
}

type MentionInboxItem = {
  id: string
  mentionToken: string
  note: ContextNote
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
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(25)
  if (result.error) throw result.error
  return ((result.data ?? []) as NoteMentionRow[])
    .map(row => {
      const note = Array.isArray(row.personal_notes) ? row.personal_notes[0] : row.personal_notes
      return note ? {
        id: row.id,
        mentionToken: row.mention_token,
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

function kaviDefaultExploreState(event: ExploreEvent): ExploreState | null {
  if (event.kind !== 'Ticketed play') return null
  if (event.complexity === 'very-hard' || event.tags.includes('competitive')) return 'hidden'
  return null
}

function applySelectionState(events: ExploreEvent[], selections: Record<string, string>, trustSlice: TrustSlice | null, companion?: CompanionMember) {
  return events.map(event => {
    const selected = selections[selectionKey(`explore-${event.id}`, 'state')]
    const personalDefault = isKaviCompanion(companion) ? kaviDefaultExploreState(event) : null
    const state = isExploreState(selected) ? selected : personalDefault ?? event.state
    if (event.id === 'bl-planechase' && trustSlice && !selected) {
      return { ...event, state: trustSlice.decision.planning_state as ExploreState }
    }
    return { ...event, state }
  })
}

function isExploreState(value: unknown): value is ExploreState {
  return ['none', 'interested', 'tentative', 'committed', 'hidden', 'nope'].includes(String(value))
}

type Surface = 'home' | 'calendar' | 'plan' | 'explore' | 'map' | 'wallet' | 'trip' | 'artists' | 'notes' | 'activity'

const surfaces: Surface[] = ['home', 'calendar', 'plan', 'explore', 'map', 'wallet', 'trip', 'artists', 'notes', 'activity']

export function surfaceFromHash(hash: string): Surface {
  const candidate = hashPath(hash)
  return surfaces.includes(candidate as Surface) ? candidate as Surface : 'home'
}

function hashForSurface(next: Surface) {
  return next === 'home' ? '' : `#${next}`
}

const destinations = [
  { name: 'Home', icon: 'home' as NavIconName, surface: 'home' as Surface },
  { name: 'Explore', icon: 'explore' as NavIconName, surface: 'explore' as Surface },
  { name: 'Plan', icon: 'plan' as NavIconName, surface: 'plan' as Surface },
  { name: 'Calendar', icon: 'calendar' as NavIconName, surface: 'calendar' as Surface },
  { name: 'Map & Info', icon: 'map' as NavIconName, surface: 'map' as Surface },
  { name: 'Wallet', icon: 'wallet' as NavIconName, surface: 'wallet' as Surface },
  { name: 'Trip', icon: 'trip' as NavIconName, surface: 'trip' as Surface },
  { name: 'Artists', icon: 'artists' as NavIconName, surface: 'artists' as Surface },
  { name: 'Notes', icon: 'notes' as NavIconName, surface: 'notes' as Surface },
]

export default function App() {
  const designPreview = resolveDesignPreviewMode({
    search: window.location.search,
    development: import.meta.env.DEV,
    previewBuild: import.meta.env.VITE_DESIGN_PREVIEW === '1',
    storage: window.localStorage,
  })
  const previewOwner = resolvePreviewOwner(window.location.search)
  const isPreviewOwnerMode = Boolean(previewOwner)
  const previewSession = previewOwner
    ? ({
        user: {
          id: `preview-${previewOwner.key}`,
          email: `${previewOwner.key}-preview@local.invalid`,
          user_metadata: { full_name: previewOwner.displayName },
        },
      } as unknown as Session)
    : null
  const [session, setSession] = useState<Session | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const canWrite = !designPreview && !isPreviewOwnerMode && Boolean(session && supabase && online)
  const effectiveOwnerId = (previewOwner ? `preview-${previewOwner.key}` : session?.user.id ?? undefined) as string | undefined
  const effectiveSession = isPreviewOwnerMode ? previewSession : session
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
  const [exploreEventState, setExploreEventState] = useState<ExploreEvent[]>(exploreEvents)
  const [objectDetail, setObjectDetail] = useState<ObjectDetail | null>(null)
  const [walletProofRequest, setWalletProofRequest] = useState<{ target: WalletProofTarget; nonce: number } | null>(null)
  const [contextNotesState, setContextNotesState] = useState<ContextNote[]>(designPreview ? contextNotes : [])
  const [mentionInboxState, setMentionInboxState] = useState<MentionInboxItem[]>([])
  const [userSelections, setUserSelections] = useState<Record<string, string>>({})
  const [sharedSelectionRows, setSharedSelectionRows] = useState<UserSelectionRow[]>([])
  const [userActivityRows, setUserActivityRows] = useState<UserActivityEventRow[]>([])
  const [alertReview, setAlertReview] = useState<Record<string, AlertReviewState>>({})
  const [companionMembers, setCompanionMembers] = useState<CompanionMember[]>(fallbackCompanionMembers)
  const currentCompanion = currentCompanionFromSession(effectiveSession, companionMembers)
  const canCommitBlackLotus = Boolean(currentCompanion?.blackLotusEntitled)
  const mentionUnreadCount = mentionInboxState.length

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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
      setLoading(false)
      return
    }
    if (!supabase) {
      setLoading(false)
      return
    }
    const applySession = (next: Session | null) => {
      setSession(next)
      const cached = readTrustSliceCache()
      setSlice(next && cached?.ownerId === next.user.id ? cached : null)
    }
    void supabase.auth.getSession().then(({ data }) => {
      applySession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => applySession(next))
    return () => data.subscription.unsubscribe()
  }, [designPreview, isPreviewOwnerMode])

  const refresh = useCallback(async () => {
    if (designPreview || isPreviewOwnerMode || !effectiveOwnerId || !online) return
    setLoading(true)
    setMessage('')
    setMessageTone('info')
    try {
      const next = await loadTrustSlice(effectiveOwnerId)
      writeTrustSliceCache(next)
      setSlice(next)
    } catch (error) {
      setMessageTone('error')
      setMessage(error instanceof Error ? error.message : 'The current view could not be refreshed.')
    } finally {
      setLoading(false)
    }
  }, [designPreview, isPreviewOwnerMode, online, effectiveOwnerId])

  useEffect(() => { void refresh() }, [refresh])

  const refreshUserContinuity = useCallback(async () => {
    if (designPreview || isPreviewOwnerMode) {
      setContextNotesState(designPreview ? contextNotes : [])
      setMentionInboxState([])
      setAlertReview({})
      setUserSelections({})
      setSharedSelectionRows([])
      setUserActivityRows([])
      setExploreEventState(exploreEvents)
      return
    }
    if (!effectiveOwnerId || !online) {
      setContextNotesState([])
      setMentionInboxState([])
      setAlertReview({})
      setUserSelections({})
      setSharedSelectionRows([])
      setUserActivityRows([])
      setExploreEventState(exploreEvents)
      return
    }
    const [notesResult, mentionsResult, selectionsResult, activityResult] = await Promise.allSettled([
        loadContextNotes(effectiveOwnerId),
        loadMentionInbox(effectiveOwnerId),
        loadUserSelections(effectiveOwnerId),
        loadUserActivityEvents(effectiveOwnerId),
      ])
    const failures: string[] = []
    if (notesResult.status === 'fulfilled') setContextNotesState(notesResult.value)
    else failures.push('notes')
    if (mentionsResult.status === 'fulfilled') setMentionInboxState(mentionsResult.value)
    else failures.push('mentions')
    if (activityResult.status === 'fulfilled') setUserActivityRows(activityResult.value)
    else failures.push('activity')
    if (selectionsResult.status === 'fulfilled') {
      setSharedSelectionRows(selectionsResult.value)
      const selections = userSelectionMap(selectionsResult.value.filter(row => row.owner_id === effectiveOwnerId))
      setUserSelections(selections)
      setAlertReview(Object.fromEntries(Object.entries(selections)
        .filter(([key, value]) => key.endsWith('::review_state') && ['needs-review', 'reviewed', 'archived'].includes(value))
        .map(([key, value]) => [key.replace(/^alert-/, '').replace(/::review_state$/, ''), value as AlertReviewState])))
      setExploreEventState(applySelectionState(exploreEvents, selections, slice, currentCompanionFromSession(effectiveSession, companionMembers)))
    } else failures.push('selections')
    if (failures.length) {
      setMessageTone('error')
      setMessage(`${failures.join(', ')} could not be refreshed. Other account data is still available.`)
    } else setMessage('')
  }, [companionMembers, designPreview, isPreviewOwnerMode, online, effectiveOwnerId, slice, effectiveSession])

  useEffect(() => { void refreshUserContinuity() }, [refreshUserContinuity])

  useEffect(() => {
    if (designPreview || isPreviewOwnerMode || !effectiveOwnerId || !online) {
      setCompanionMembers(fallbackCompanionMembers)
      return
    }
    void loadCompanionMembers().then(setCompanionMembers).catch(error => {
      setMessageTone('error')
      setMessage(error instanceof Error ? `Companion roster could not be refreshed: ${error.message}` : 'Companion roster could not be refreshed.')
      setCompanionMembers(fallbackCompanionMembers)
    })
  }, [designPreview, isPreviewOwnerMode, online, effectiveOwnerId])

  useEffect(() => {
    let active = true
    void fetch(`${import.meta.env.BASE_URL}monitoring-intake.json`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (!active || !payload || !Array.isArray(payload.alerts)) return
        const incoming = payload.alerts.filter(isMonitoringAlert)
        setMonitorAlerts(incoming)
      })
      .catch(() => {
        // The intake file is optional. If it is missing or malformed, keep the
        // built-in fixture alerts so local design review never goes blank.
      })
    return () => { active = false }
  }, [])

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
    if (requested === 'committed' && !canCommitBlackLotus) {
      setMessageTone('info')
      setMessage('Black Lotus events stay visible to everyone, but only Kavi and Chris can commit them.')
      return
    }
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
      openDestination('Explore', 'explore')
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
      const event = exploreEventState.find(candidate => candidate.id === legacyEventId || candidate.title === note.objectTitle || displayEventTitle(candidate) === note.objectTitle)
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
    const currentEvent = exploreEventState.find(event => event.id === id)
    const previousState = currentEvent?.state ?? 'none'
    const nextState: ExploreState = currentEvent?.state === state ? 'none' : state
    if (currentEvent?.kind === 'Black Lotus' && nextState === 'committed' && !canCommitBlackLotus) {
      setMessageTone('info')
      setMessage('Black Lotus events stay visible to everyone, but only Kavi and Chris can commit them.')
      return
    }
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
    if (id === 'bl-planechase' && ['none', 'interested', 'tentative', 'committed'].includes(nextState)) {
      void changeState(nextState as PlanningState)
    }
  }

  const generatedActivity = clusterActivityEvents(userActivityRows)
    .map(cluster => activityFromEventCluster(cluster, exploreEventState, userSelections, currentCompanion?.name ?? 'Kavi'))
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
  }))
  const activityItems = [...generatedActivity, ...noteActivity, ...monitorActivity].filter(shouldShowActivityItem).sort((a, b) => {
    const severityRank = { hot: 0, notice: 1, quiet: 2 } as const
    const reviewRank = { 'needs-review': 0, reviewed: 1, archived: 2 } as const
    const reviewDelta = reviewRank[a.reviewState] - reviewRank[b.reviewState]
    if (reviewDelta !== 0) return reviewDelta
    const severityDelta = severityRank[a.severity] - severityRank[b.severity]
    if (severityDelta !== 0) return severityDelta
    return new Date(b.checkedAtIso).getTime() - new Date(a.checkedAtIso).getTime()
  })
  const setActivityReviewState = (item: ActivityItem, state: AlertReviewState) => {
    if (item.sourceKind === 'monitor') {
      setAlertReviewState(item.id, state)
      return
    }
    void upsertUserSelection(`activity-${item.id}`, 'activity', 'review_state', state)
  }
  const homeHeaderSignals = surface === 'home' ? homeWorthKnowingItems(activityItems, Date.now(), currentCompanion?.name ?? 'Kavi') : []
  const homeHeaderHotCount = homeHeaderSignals.filter(item => item.severity === 'hot').length
  const headerLabel = surface === 'home' && homeHeaderHotCount ? 'ACTIVE WATCH' : surfaceLabel(surface)
  const headerTitle = surface === 'home' ? 'Atlanta here we come!' : surfaceTitle(surface)
  const headerSubtitle = surface === 'home' && homeHeaderHotCount ? 'New MagicCon signal is ready to review.' : surfaceSubtitle(surface)

  return <div className="app-shell" style={desktopRailLocked ? { display: 'block', minHeight: '100vh' } : undefined}>
    <aside className="rail" style={desktopRailLocked ? {
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
        {destinations.map(destination => <button
          key={destination.name}
          type="button"
          className={destination.surface === surface ? 'active' : destination.surface ? '' : 'upcoming'}
          aria-current={destination.surface === surface ? 'page' : undefined}
          onClick={() => openDestination(destination.name, destination.surface)}
          title={destination.surface ? destination.name : `${destination.name} · later tranche`}
        ><span aria-hidden="true"><NavIcon name={destination.icon} /></span>{destination.name}</button>)}
      </nav>
      <nav className="mobile-primary-nav" aria-label="Mobile primary navigation">
        <button className={surface === 'home' ? 'active' : ''} type="button" onClick={() => openDestination('Home', 'home')}><span aria-hidden="true"><NavIcon name="home" /></span>Home</button>
        <button className={['calendar', 'plan', 'explore'].includes(surface) ? 'active' : ''} type="button" aria-expanded={mobileNavMenu === 'events'} onClick={() => setMobileNavMenu(menu => menu === 'events' ? null : 'events')}><span aria-hidden="true"><NavIcon name="calendar" /></span>Events</button>
        <button className={surface === 'map' ? 'active' : ''} type="button" onClick={() => openDestination('Map', 'map')}><span aria-hidden="true"><NavIcon name="map" /></span>Map</button>
        <button className={surface === 'wallet' ? 'active' : ''} type="button" onClick={() => openDestination('Wallet', 'wallet')}><span aria-hidden="true"><NavIcon name="wallet" /></span>Wallet</button>
        <button className={['trip', 'artists', 'notes', 'activity'].includes(surface) ? 'active' : ''} type="button" aria-expanded={mobileNavMenu === 'more'} onClick={() => setMobileNavMenu(menu => menu === 'more' ? null : 'more')}><span className="more-dots" aria-hidden="true">•••</span>More</button>
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
          {(mobileNavMenu === 'main' ? destinations : mobileNavMenu === 'events' ? destinations
            .filter(destination => ['explore', 'plan', 'calendar'].includes(destination.surface))
            .map(destination => ({
              ...destination,
              note: destination.surface === 'explore' ? 'Discover' : destination.surface === 'plan' ? 'Compare' : 'Agenda',
            })) : [
            { name: 'Trip', note: 'Hotels & flights', icon: 'trip' as NavIconName, surface: 'trip' as Surface },
            { name: 'Artists', note: 'Historical seeds', icon: 'artists' as NavIconName, surface: 'artists' as Surface },
            { name: 'Notes', note: 'In context', icon: 'notes' as NavIconName, surface: 'notes' as Surface },
            { name: 'Activity', note: 'Signals & changes', icon: 'activity' as NavIconName, surface: 'activity' as Surface },
          ]).map(destination => mobileNavMenu === 'main'
            ? <button key={destination.surface} type="button" className={surface === destination.surface ? 'active' : ''} aria-current={surface === destination.surface ? 'page' : undefined} onClick={() => openDestination(destination.name, destination.surface)}>
              <span aria-hidden="true"><NavIcon name={destination.icon} /></span>{destination.name}
            </button>
            : <button key={destination.surface} type="button" className={surface === destination.surface ? 'active' : ''} aria-current={surface === destination.surface ? 'page' : undefined} onClick={() => openDestination(destination.name, destination.surface)}>
              <span aria-hidden="true"><NavIcon name={destination.icon} /></span><strong>{destination.name}</strong><small>{(destination as { note?: string }).note ?? ''}</small><b aria-hidden="true">›</b>
            </button>)}
        </div>
        {mobileNavMenu === 'main' && <footer className="mobile-drawer-foot">
          <button className={`mobile-drawer-activity ${surface === 'activity' ? 'active' : ''}`} type="button" onClick={() => openDestination('Activity', 'activity')}>
            <span aria-hidden="true"><NavIcon name="activity" /></span>Activity
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
      <header className={`hero ${['explore', 'plan', 'calendar'].includes(surface) ? 'hero-has-funnel' : ''}`}>
        <div>
          <div className="hero-context">
            <button className="back-caret desktop-back-caret" type="button" onClick={goBack} disabled={!previousSurface} aria-label="Back to previous view"><span aria-hidden="true">‹</span></button>
            <button className="back-caret mobile-menu-caret" type="button" onClick={() => setMobileNavMenu('main')} aria-label="Open main navigation" aria-expanded={mobileNavMenu === 'main'}><span aria-hidden="true">☰</span></button>
            <span className="kicker">{headerLabel}</span>
          </div>
          <h1>{headerTitle}</h1>
          <p>{headerSubtitle}</p>
        </div>
        <div className="header-status">
          <div className="header-actions">
            <MentionInbox
              items={mentionInboxState}
              onOpenMention={openMentionNote}
            />
            <AccountMenu
              email={effectiveSession?.user.email ?? 'kavigrace@gmail.com'}
              online={Boolean(effectiveSession) && online}
              preview={designPreview || isPreviewOwnerMode}
            />
            <span className="countdown-chip"><strong>{daysToAtlanta}</strong><span>days to Atlanta</span></span>
          </div>
          {surface === 'explore' && <FunnelNav current="explore" onOpenExplore={() => openDestination('Explore', 'explore')} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenCalendar={() => openDestination('Calendar', 'calendar')} />}
          {surface === 'plan' && <FunnelNav current="plan" onOpenExplore={() => openDestination('Explore', 'explore')} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenCalendar={() => openDestination('Calendar', 'calendar')} />}
          {surface === 'calendar' && <FunnelNav current="calendar" onOpenExplore={() => openDestination('Explore', 'explore')} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenCalendar={() => openDestination('Calendar', 'calendar')} />}
        </div>
      </header>

      {(message || navNotice) && <p role="status" className={message ? `alert ${messageTone}` : 'nav-notice'}>{message || navNotice}</p>}
      {!slice ? <section className="panel empty"><h2>No saved Black Lotus view</h2><p>{online ? 'Refresh the canonical source slice.' : 'Reconnect once to save the critical view for offline reading.'}</p><button onClick={() => void refresh()} disabled={!online || loading}>Refresh</button></section> : <>
        {surface === 'home' && <HomeSurface slice={slice} activityItems={activityItems} currentPerson={currentCompanion?.name ?? 'Kavi'} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenItem={openActivityItem} onOpenObject={openObjectDetail} onOpenActivity={() => openDestination('Activity', 'activity')} />}
        {surface === 'calendar' && <CalendarSurface slice={slice} events={exploreEventState} selectionRows={sharedSelectionRows} companions={companionMembers} notes={contextNotesState} currentOwnerId={effectiveOwnerId} currentPerson={currentCompanion?.name ?? 'Kavi'} onAddNote={addContextNote} onDeleteNote={deleteContextNote} onUpdateEvent={updateExploreEvent} onOpenExplore={() => openDestination('Explore', 'explore')} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenPlanEvent={openPlanEventContext} onOpenTrip={() => openDestination('Trip', 'trip')} onChangeState={state => void changeState(state)} online={online} saving={saving} canCommitBlackLotus={canCommitBlackLotus} />}
        {surface === 'explore' && <ExploreSurface events={exploreEventState} routeState={exploreRouteState} focusRequest={exploreFocusRequest} notes={contextNotesState} currentOwnerId={effectiveOwnerId} onAddNote={addContextNote} onDeleteNote={deleteContextNote} onUpdateEvent={updateExploreEvent} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenCalendar={() => openDestination('Calendar', 'calendar')} />}
        {surface === 'map' && <MapSurface onOpenTrip={() => openDestination('Trip', 'trip')} />}
        {surface === 'wallet' && <WalletSurface onOpenObject={openObjectDetail} onOpenTrip={() => openDestination('Trip', 'trip')} notes={contextNotesState} currentOwnerId={effectiveOwnerId} onAddNote={addContextNote} onDeleteNote={deleteContextNote} prizeTixValue={userSelections[selectionKey('wallet-prize-tix', 'balance')]} proofRequest={walletProofRequest} onPrizeTixChange={(value, delta) => {
          void upsertUserSelection('wallet-prize-tix', 'wallet', 'balance', String(value))
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
        {surface === 'trip' && <TripSurface onOpenObject={openObjectDetail} />}
        {surface === 'artists' && <ArtistsSurface onOpenObject={openObjectDetail} onOpenActivity={() => openDestination('Activity', 'activity')} />}
        {surface === 'notes' && <NotesSurface notes={contextNotesState} currentOwnerId={effectiveOwnerId} onDeleteNote={deleteContextNote} onOpenNote={openMentionNote} />}
        {surface === 'plan' && <PlanSurface events={exploreEventState} selectionRows={sharedSelectionRows} companions={companionMembers} slice={slice} focusRequest={planFocusRequest} notes={contextNotesState} currentOwnerId={effectiveOwnerId} currentPerson={currentCompanion?.name ?? 'Kavi'} onAddNote={addContextNote} onDeleteNote={deleteContextNote} onUpdateEvent={updateExploreEvent} onChangeSliceState={state => void changeState(state)} onOpenExplore={() => openDestination('Explore', 'explore')} onOpenCalendar={() => openDestination('Calendar', 'calendar')} online={online} saving={saving} canCommitBlackLotus={canCommitBlackLotus} />}

        {surface === 'activity' && <ActivitySurface slice={slice} activityItems={activityItems} notes={contextNotesState} onReviewChange={setActivityReviewState} onOpenItem={openActivityItem} onOpenNote={openMentionNote} />}
      </>}

    </main>
      <ObjectDetailLayer detail={objectDetail} notes={contextNotesState} currentOwnerId={effectiveOwnerId} onAddNote={addContextNote} onDeleteNote={deleteContextNote} onClose={closeObjectDetail} onNavigate={navigateFromObjectDetail} onOpenObject={openObjectDetail} />
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
    parts.push(<a key={`${displayUrl}-${start}`} className="inline-text-link" href={displayUrl} target="_blank" rel="noreferrer">{displayUrl}</a>)
    if (trailing) parts.push(trailing)
    cursor = start + rawUrl.length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts.length ? parts : text
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
  if (note.objectId === 'hotel-chris') return focusDetailOnNote(tripHotelDetail('chris'), note)
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
  thumbnailUrl?: string
  thumbnailAlt?: string
  thumbnailCaption?: string
  facts: Array<{ label: string; value: string }>
}

const artistSeeds: ArtistSeed[] = [
  {
    id: 'rebecca-guay',
    title: 'Rebecca Guay',
    status: 'Historical Vegas feature; not Atlanta-confirmed',
    signal: 'Prior MagicCon featured artist',
    summary: 'Rebecca Guay was one of the featured Art of Magic artists for MagicCon: Las Vegas 2026. Her work is described by MagicCon as romantic, ethereal, fluid, delicate, and colorfully muted — exactly the kind of artist where a short card-signing shortlist could be useful once Atlanta artists are confirmed.',
    thumbnailUrl: 'https://mtg.wtf/cards_hq/por/195.png',
    thumbnailAlt: 'Wood Elves illustrated by Rebecca Guay',
    thumbnailCaption: 'Wood Elves · Portal',
    facts: [
      { label: 'Atlanta status', value: 'Not confirmed' },
      { label: 'Prior event', value: 'MagicCon Las Vegas 2026' },
      { label: 'Known cards', value: 'Angelic Renewal, Regenerate, Stoneforge Mystic, Serra the Benevolent' },
      { label: 'Use now', value: 'Good test case for artist/card matching' },
    ],
  },
]

function artistSeedToObjectDetail(seed: ArtistSeed): ObjectDetail {
  return {
    id: `artist-${seed.id}`,
    kind: 'artist',
    eyebrow: seed.signal,
    title: seed.title,
    summary: seed.summary,
    image: seed.thumbnailUrl ? { src: seed.thumbnailUrl, alt: seed.thumbnailAlt ?? seed.title, caption: seed.thumbnailCaption } : undefined,
    facts: seed.facts,
    source: { label: 'Source status', value: seed.status },
    rationale: 'This keeps artist planning useful without treating old MagicCon appearances as Atlanta 2026 facts.',
    actions: [{ label: 'Open Artists', destination: 'artists' }, { label: 'Review source signals', destination: 'activity' }],
    backlinks: [{ label: 'Artists', destination: 'artists' }, { label: 'Activity', destination: 'activity' }],
  }
}

function ObjectDetailLayer({ detail, notes, currentOwnerId, onAddNote, onDeleteNote, onClose, onNavigate, onOpenObject }: { detail: ObjectDetail | null; notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; onClose: () => void; onNavigate: (destination: Surface) => void; onOpenObject: (detail: ObjectDetail) => void }) {
  if (!detail) return null
  return <div className="object-detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <aside className={`object-detail object-detail-${detail.kind}`} role="dialog" aria-modal="true" aria-labelledby="object-detail-title">
      <button className="detail-close object-detail-close" type="button" onClick={onClose} aria-label="Close detail">×</button>
      <header className="object-detail-head">
        <div className="object-detail-topline">
          <span className="eyebrow">{detail.eyebrow}</span>
          <span className="object-kind-chip">{detailKindLabel(detail.kind)}</span>
        </div>
        <h2 id="object-detail-title">{detail.title}</h2>
        <p>{detail.summary}</p>
      </header>
      {detail.image && <section className="object-detail-section object-detail-image-section">
        <div className="object-detail-image-card">
          <img src={detail.image.src} alt={detail.image.alt} loading="lazy" />
          {detail.image.caption && <span>{detail.image.caption}</span>}
        </div>
      </section>}
      {detail.facts && <section className="object-detail-section">
        <h3>Key facts</h3>
        <div className="object-fact-grid">{detail.facts.map(fact => fact.detail
          ? <button key={`${fact.label}-${fact.value}`} type="button" className="object-fact object-fact-link" onClick={() => onOpenObject(fact.detail!)}><span>{fact.label}</span><strong>{fact.value}</strong><b aria-hidden="true">›</b></button>
          : <div key={`${fact.label}-${fact.value}`} className="object-fact"><span>{fact.label}</span><strong>{fact.value}</strong></div>)}</div>
      </section>}
      {detail.rationale && <section className="object-detail-section">
        <h3>Why it matters</h3>
        <p>{renderLinkedText(detail.rationale)}</p>
      </section>}
      {detail.note && <section className="object-detail-section object-note-section">
        <h3>Note / next action</h3>
        <p>{renderLinkedText(detail.note)}</p>
      </section>}
      {detail.source && <section className="object-detail-section">
        <h3>Source / provenance</h3>
        <p><strong>{detail.source.label}</strong><br />{renderLinkedText(detail.source.value)}</p>
      </section>}
      <ObjectNotes
        notes={notes}
        currentOwnerId={currentOwnerId}
        onAddNote={onAddNote}
        onDeleteNote={onDeleteNote}
        objectId={detail.id}
        objectKind={detail.kind}
        objectTitle={detail.title}
        objectAnchor={detail.objectAnchor}
        focusedNoteId={detail.focusedNoteId}
        context={`${detailKindLabel(detail.kind)} · ${detail.title}`}
        backlink={detail.backlinks?.[0]?.destination ?? 'notes'}
        compact
      />
      {(detail.actions || detail.backlinks) && <footer className="object-detail-actions">
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
type ActionIconName = 'bookmark' | 'diamond' | 'lock' | 'eyeOff'
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
  eyebrow: string
  title: string
  summary: string
  image?: { src: string; alt: string; caption?: string }
  focusedNoteId?: string
  objectAnchor?: string
  facts?: Array<{ label: string; value: string; detail?: ObjectDetail }>
  source?: { label: string; value: string }
  rationale?: string
  actions?: Array<{ label: string; destination?: Surface }>
  note?: string
  backlinks?: Array<{ label: string; destination: Surface }>
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
  destination: 'Home' | 'Activity' | 'Wallet' | 'Trip' | 'Explore' | 'Calendar' | 'Map' | 'Artists' | 'Notes'
  attention: string
  title: string
  summary: string
  object: string
  source: string
  checkedAt: string
  status: string
  rationale: string
  nextAction: string
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
}

function personNameFromLabel(label: string): PersonName | undefined {
  return (['Kavi', 'Chris', 'Juan', 'Kyle'] as PersonName[]).find(person => person.toLowerCase() === label.trim().toLowerCase())
}

function defaultAlertReviewState(alert: MonitoringAlert): AlertReviewState {
  return alert.severity === 'quiet' ? 'reviewed' : 'needs-review'
}

function contextNotesToActivity(notes: ContextNote[], selections: Record<string, string>): ActivityItem[] {
  type NoteCluster = { id: string; author: PersonName; notes: ContextNote[] }
  const clusters: NoteCluster[] = []
  const ordered = [...notes].sort((a, b) => new Date(b.updatedAtIso).getTime() - new Date(a.updatedAtIso).getTime())
  for (const note of ordered) {
    const previous = clusters[clusters.length - 1]
    const previousNote = previous?.notes[previous.notes.length - 1]
    const sameBurst = previous
      && previous.author === note.author
      && Math.abs(new Date(previousNote.updatedAtIso).getTime() - new Date(note.updatedAtIso).getTime()) <= 10 * 60 * 1000
    if (sameBurst) previous.notes.push(note)
    else clusters.push({ id: note.id, author: note.author, notes: [note] })
  }
  return clusters.map(cluster => {
    const latest = cluster.notes[0]
    const reviewSelection = selections[selectionKey(`activity-note-${cluster.id}`, 'review_state')]
    const recent = Date.now() - new Date(latest.updatedAtIso).getTime() <= 72 * 60 * 60 * 1000
    const reviewState: AlertReviewState = ['needs-review', 'reviewed', 'archived'].includes(reviewSelection)
      ? reviewSelection as AlertReviewState
      : recent ? 'needs-review' : 'reviewed'
    const multi = cluster.notes.length > 1
    const sourceDetail = noteSourceObjectDetail(latest)
    return {
      id: `note-${cluster.id}`,
      actor: cluster.author,
      sourceKind: 'note' as const,
      kind: 'manual' as const,
      severity: 'notice' as const,
      destination: 'Home' as const,
      attention: multi ? 'Notes added' : latest.visibility === 'shared' ? 'Shared note' : 'New note',
      title: multi ? `${cluster.author} added ${cluster.notes.length} notes.` : `${cluster.author}: ${latest.body}`,
      summary: multi ? cluster.notes.map(note => note.body).join(' · ') : `${latest.objectTitle} · ${latest.context}`,
      object: multi ? `${cluster.notes.length} notes` : latest.objectTitle,
      source: `${cluster.author} note`,
      checkedAt: latest.updatedAt,
      checkedAtIso: latest.updatedAtIso,
      status: latest.visibility,
      rationale: multi ? 'Notes added in one short burst are grouped to keep Home useful.' : 'A recent contextual note is useful collaboration context without being a Hot interruption.',
      nextAction: 'Open the attached object for the full note and context.',
      reviewState,
      objectDetail: multi ? {
        ...sourceDetail,
        summary: `${sourceDetail.summary} ${cluster.notes.length} recent notes are grouped in Notes.`,
        facts: [
          ...(sourceDetail.facts ?? []),
          { label: 'Grouped notes', value: `${cluster.notes.length} notes`, detail: noteToObjectDetail(latest) },
        ],
        backlinks: [{ label: 'Notes', destination: 'notes' as const }, ...(sourceDetail.backlinks ?? [])],
      } : sourceDetail,
    }
  })
}

function homeWorthKnowingItems(items: ActivityItem[], now = Date.now(), currentPerson: PersonName = 'Kavi') {
  return items
    .filter(item => item.reviewState === 'needs-review')
    .filter(item => {
      if (item.sourceKind === 'activity-log' && item.objectDetail.id === 'wallet-prize-tix') return false
      if (item.severity !== 'hot' && item.destination !== 'Home' && item.sourceKind !== 'note') return false
      const checkedAt = new Date(item.checkedAtIso).getTime()
      if (!Number.isFinite(checkedAt)) return true
      const maxAgeDays = item.severity === 'hot' || item.attention === 'Companion picks changed' ? 7 : item.sourceKind === 'note' ? 4 : 3
      return now - checkedAt <= maxAgeDays * 24 * 60 * 60 * 1000
    })
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
  const severity: AlertSeverity = committedCount > 0 ? 'hot' : 'notice'
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
    destination: committedCount > 0 || isAnotherPerson ? 'Home' : 'Activity',
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
          facts: items.slice(0, 6).map(item => ({
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
}

const monitoringAlerts: MonitoringAlert[] = [
  {
    id: 'ticketed-play-watch',
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
    severity: 'notice',
    destination: 'Artists',
    attention: 'Opportunity discovery',
    title: 'Artist list appears as a signature-planning opportunity',
    summary: 'The first artist directory should surface as a milestone and then become browsable by artist/card/signature usefulness.',
    object: 'Artists · Directory',
    source: 'MagicCon artists page',
    checkedAt: 'Aug 4, 8:32 AM',
    status: 'future route',
    rationale: 'Artist info is useful only if the app translates it into lazy-friendly opportunities rather than a flat directory.',
    nextAction: 'Show first appearance on Home; later changes stay in Activity unless they match known card/signature interest.',
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
].filter(() => false) as MonitoringAlert[]

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

function FunnelNav({ current, onOpenExplore, onOpenPlan, onOpenCalendar }: { current: 'explore' | 'plan' | 'calendar'; onOpenExplore: () => void; onOpenPlan?: () => void; onOpenCalendar: () => void }) {
  return <nav className="funnel-nav" aria-label="Explore, plan, calendar flow">
    <button type="button" className={current === 'explore' ? 'active' : ''} aria-current={current === 'explore' ? 'page' : undefined} onClick={onOpenExplore}>Explore</button>
    <button type="button" className={current === 'plan' ? 'active' : ''} aria-current={current === 'plan' ? 'page' : undefined} onClick={onOpenPlan}>Plan</button>
    <button type="button" className={current === 'calendar' ? 'active' : ''} aria-current={current === 'calendar' ? 'page' : undefined} onClick={onOpenCalendar}>Calendar</button>
  </nav>
}

type PlanView = 'list' | 'agenda'
type PlanParticipantState = 'interested' | 'tentative' | 'committed'
type PlanParticipant = { person: PersonName; state: PlanParticipantState; purchased?: boolean }
type AgendaPlacement = { event: ExploreEvent; start: number; end: number; lane: number; lanes: number }

const planPeople: PersonName[] = ['Kavi', 'Chris', 'Juan', 'Kyle']

function planParticipants(event: ExploreEvent, currentPerson: PersonName, selectionRows: UserSelectionRow[], companions: CompanionMember[]): PlanParticipant[] {
  const participants: PlanParticipant[] = []
  selectionRows
    .filter(row => row.object_id === `explore-${event.id}` && row.selection_key === 'state' && ['interested', 'tentative', 'committed'].includes(row.selection_value))
    .forEach(row => {
      const person = companions.find(member => member.userId === row.owner_id)?.name
      if (person && !participants.some(participant => participant.person === person)) participants.push({ person, state: row.selection_value as PlanParticipantState })
    })
  if (!participants.some(participant => participant.person === currentPerson) && ['interested', 'tentative', 'committed'].includes(event.state)) {
    participants.push({ person: currentPerson, state: event.state as PlanParticipantState })
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
  return event.id === 'bl-progressive-sealed' || event.id === 'bl-mystery-booster-drafts' || /start/i.test(event.time) || /on-demand|league window/i.test(event.window)
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
      <PlanningStateIcon state={participant.state} />
    </span>)}
  </span>
}

function PlanSurface({ events, selectionRows, companions, slice, focusRequest, notes, currentOwnerId, currentPerson, onAddNote, onDeleteNote, onUpdateEvent, onChangeSliceState, onOpenExplore, onOpenCalendar, online, saving, canCommitBlackLotus }: {
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
  onChangeSliceState: (state: PlanningState) => void
  onOpenExplore: () => void
  onOpenCalendar: () => void
  online: boolean
  saving: boolean
  canCommitBlackLotus: boolean
}) {
  const days: ExploreEvent['day'][] = ['Thu', 'Fri', 'Sat', 'Sun']
  const [activeDay, setActiveDay] = useState<ExploreEvent['day']>('Thu')
  const [selectedPeople, setSelectedPeople] = useState<PersonName[]>([currentPerson])
  const [planView, setPlanView] = useState<PlanView>(() => window.localStorage.getItem('magiccon-plan-view') === 'agenda' ? 'agenda' : 'list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [collapsedPlanGroups, setCollapsedPlanGroups] = useState<string[]>([])
  const workbarRef = useRef<HTMLDivElement | null>(null)
  const workbarStartRef = useRef(0)
  const [workbarPinned, setWorkbarPinned] = useState(false)
  const [workbarHeight, setWorkbarHeight] = useState(0)
  const candidateEvents = events.map(event => event.id === 'bl-planechase' ? { ...event, state: slice.decision.planning_state as ExploreState } : event)
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
    { key: 'committed', label: 'Committed anchors', hint: 'calendar-bound', items: dayEvents.filter(event => strongestState(event) === 'committed') },
    { key: 'tentative', label: 'Tentative contenders', hint: 'compare against the day', items: dayEvents.filter(event => strongestState(event) === 'tentative') },
    { key: 'interested', label: 'Interesting maybes', hint: 'promoted from Explore', items: dayEvents.filter(event => strongestState(event) === 'interested') },
  ].filter(group => group.items.length > 0)
  const flexibleEvents = dayEvents.filter(isFlexiblePlanEvent)
  const agendaPlacements = placeAgendaEvents(dayEvents)
  const agendaStart = agendaPlacements.length ? Math.max(8, Math.floor(Math.min(...agendaPlacements.map(item => item.start)))) : 9
  const agendaEnd = agendaPlacements.length ? Math.min(25, Math.ceil(Math.max(...agendaPlacements.map(item => item.end)))) : 18
  const agendaHourHeight = 64
  const agendaHeight = Math.max(280, (agendaEnd - agendaStart) * agendaHourHeight)
  const agendaHours = Array.from({ length: agendaEnd - agendaStart + 1 }, (_, index) => agendaStart + index)
  const conflictPairs = agendaPlacements.flatMap((first, index) => agendaPlacements.slice(index + 1).filter(second => planEventsOverlap(first.event, second.event)).map(second => [first.event.id, second.event.id] as const))
  const conflictIds = new Set(conflictPairs.flat())
  const sharedCount = dayEvents.filter(event => (participantMap.get(event.id) ?? []).filter(participant => selectedPeople.includes(participant.person)).length > 1).length
  const togglePlanGroup = (key: string) => setCollapsedPlanGroups(groups => groups.includes(key) ? groups.filter(item => item !== key) : [...groups, key])

  const togglePerson = (person: PersonName) => setSelectedPeople(current => current.includes(person)
    ? current.length === 1 ? current : current.filter(item => item !== person)
    : [...current, person])

  const changePlanView = (view: PlanView) => {
    setPlanView(view)
    window.localStorage.setItem('magiccon-plan-view', view)
    setSelectedId(null)
    setDetailOpen(false)
  }

  const setState = (event: ExploreEvent, state: ExploreState) => {
    if (event.id === 'bl-planechase') onChangeSliceState(state as PlanningState)
    else onUpdateEvent(event.id, state)
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
    <div ref={workbarRef} className={`surface-workbar plan-workbar ${workbarPinned ? 'pinned' : ''}`}>
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
              <span><strong>{group.label}</strong><small>{group.hint}</small></span>
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
              <div className="plan-state-controls" aria-label={`${event.title} planning state`}>
                {([['interested', 'Interested'], ['tentative', 'Tentative'], ['committed', 'Committed']] as const).map(([state, label]) => {
                  const disabled = event.id === 'bl-planechase'
                    ? !online || saving || (state === 'committed' && !canCommitBlackLotus)
                    : false
                  const title = state === 'committed' && event.kind === 'Black Lotus' && !canCommitBlackLotus
                    ? 'Only Kavi and Chris can commit Black Lotus events.'
                    : label
                  return <button key={state} type="button" className={`decision-state-${state}`} aria-label={title} title={title} aria-pressed={event.state === state} disabled={disabled} onClick={() => setState(event, state)}><b aria-hidden="true"><PlanningStateIcon state={state} /></b><span>{label}</span></button>
                })}
              </div>
            </article>})}
          </section>
        })}
        {planView === 'agenda' && <div className="plan-agenda">
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
                  <span className="agenda-event-copy"><strong>{displayEventTitle(placement.event)}</strong><small>{placement.event.time} · {formatEventPrice(placement.event.price)}</small></span>
                  <PlanParticipantBadges participants={participants} compact currentPerson={currentPerson} />
                  {shared && <em>Together</em>}
                  {conflict && <span className="agenda-conflict">Conflict</span>}
                </button>
              })}
            </div>
          </div>}
        </div>}
        {dayEvents.length === 0 && <div className="plan-empty"><strong>No active contenders yet.</strong><span>Mark something Interested or Tentative in Explore.</span><button type="button" onClick={onOpenExplore}>Browse Explore</button></div>}
      </div>

      {selected && <aside className="plan-inspector event-detail-panel" data-open={detailOpen} aria-label={`${selected.title} planning detail`}>
        <header className="event-detail-heading">
          <div className="plan-inspector-head"><span>{selected.kind}</span><div className="detail-head-actions"><span className={`event-stage stage-${selected.state}`}>{eventStageLabel(selected.state)}</span><button className="detail-close plan-detail-close" type="button" onClick={() => { setSelectedId(null); setDetailOpen(false) }} aria-label="Close event detail">×</button></div></div>
          <h3>{displayEventTitle(selected)}</h3>
          <div className="plan-inspector-facts"><span>{selected.day} · {selected.time}</span><span>{formatEventPrice(selected.price)}</span><span>{selected.format}</span></div>
          <OfficialEventLink event={selected} />
        </header>
        <section className="plan-who"><small>WHO'S IN</small><PlanParticipantBadges participants={participantMap.get(selected.id) ?? []} currentPerson={currentPerson} /></section>
        <EventStateRail event={selected} context="plan" onState={state => setState(selected, state)} canCommit={selected.id !== 'bl-planechase' || canCommitBlackLotus} disabled={!online || saving} />
        <div className="detail-intel event-context-block"><span aria-hidden="true">✧</span><p><small>OFFICIAL DESCRIPTION</small>{renderLinkedText(selected.detail)}</p></div>
        <section className="detail-section decision-section">
          <div className="format-heading"><strong>{selected.format}</strong>{selected.formatHelp && <details className="format-help"><summary aria-label={`Explain ${selected.format}`}>?</summary><p>{selected.formatHelp}</p></details>}</div>
          {selected.decisionFacts && <div className="decision-facts" aria-label="Event at a glance">{selected.decisionFacts.map(fact => <div key={fact.label}><span>{fact.icon === 'ticket' && <TicketMiniIcon />}{fact.label}</span><strong>{fact.value}</strong></div>)}</div>}
          <p className="complexity-note"><span aria-hidden="true"><FlameGlyph /> Assessment:</span> {selected.complexityWhy}</p>
        </section>
        <section className="detail-section plan-summary"><strong>Plan effect</strong><p>{selected.planEffect}</p></section>
        {selected.availability === 'changed' && <div className="plan-watch"><span aria-hidden="true">✧</span><p><strong>Worth watching</strong>{selected.complexityWhy}</p></div>}
        {!canCommitBlackLotus && selected.kind === 'Black Lotus' && <div className="plan-watch"><span aria-hidden="true">✦</span><p><strong>Visible to everyone</strong>Only Kavi and Chris can commit Black Lotus events; everyone can still review and mark interest.</p></div>}
        <ObjectNotes notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} objectId={`explore-${selected.id}`} objectKind="event" objectTitle={displayEventTitle(selected)} context={`Event · ${displayEventTitle(selected)}`} backlink="plan" compact />
        {(selected.moreDetails || selected.sourceNote) && <details className="detail-more">
          <summary><span>More details</span><small>Official and operational</small></summary>
          <div className="detail-more-body">
            {selected.moreDetails?.map(item => <div className="more-row" key={item.label}><span>{item.label}</span><p>{renderLinkedText(item.value)}</p></div>)}
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

function ExploreSurface({ events, routeState, focusRequest, notes, currentOwnerId, onAddNote, onDeleteNote, onUpdateEvent, onOpenPlan, onOpenCalendar }: { events: ExploreEvent[]; routeState: ExploreRouteState; focusRequest: { eventId: string; noteId?: string; nonce: number } | null; notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; onUpdateEvent: (id: string, state: ExploreState) => void; onOpenPlan: () => void; onOpenCalendar: () => void }) {
  const [day, setDay] = useState<'all' | ExploreEvent['day']>('all')
  const [eventType, setEventType] = useState<ExploreType>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [hiddenExpanded, setHiddenExpanded] = useState(false)
  const [collapsedExploreGroups, setCollapsedExploreGroups] = useState<string[]>([])
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
    const matchesHidden = showHidden ? true : event.state !== 'hidden' && event.state !== 'nope'
    return matchesHidden && matchesSearchAndDay(event)
  })
  const hiddenCount = events.filter(event => event.state === 'hidden' || event.state === 'nope').length
  const hiddenMatches = events.filter(event => (event.state === 'hidden' || event.state === 'nope') && matchesSearchAndDay(event))
  const ticketedVisibleCount = visible.filter(event => event.kind === 'Ticketed play').length
  const hasOtherEvents = events.some(event => event.type === 'other')
  const exploreDays: ExploreEvent['day'][] = ['Thu', 'Fri', 'Sat', 'Sun']
  const exploreGroups = (day === 'all' ? exploreDays : [day])
    .map(groupDay => ({ key: groupDay, label: `${groupDay} scan`, hint: exploreDayContext(groupDay), items: visible.filter(event => event.day === groupDay) }))
    .filter(group => group.items.length > 0)
  const toggleExploreGroup = (key: string) => setCollapsedExploreGroups(groups => groups.includes(key) ? groups.filter(item => item !== key) : [...groups, key])

  const updateEvent = (id: string, state: ExploreState) => {
    onUpdateEvent(id, state)
  }

  useEffect(() => {
    if (routeState.day) setDay(routeState.day)
    if (routeState.eventType) setEventType(routeState.eventType)
    if (routeState.group) setCollapsedExploreGroups([])
  }, [routeState.day, routeState.eventType, routeState.group, routeState.mode])

  useEffect(() => {
    if (!focusRequest) return
    const event = events.find(candidate => candidate.id === focusRequest.eventId)
    if (!event) return
    setDay(event.day)
    setEventType('all')
    setShowHidden(event.state === 'hidden' || event.state === 'nope')
    setCollapsedExploreGroups(groups => groups.filter(group => group !== event.day))
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
    <div ref={workbarRef} className={`surface-workbar explore-workbar ${workbarPinned ? 'pinned' : ''}`}>
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
        {routeGroupLabel && <div className="explore-route-chip"><span>{routeGroupLabel}</span><small>Opened from a grouped signal; this slice is ready for future ticketed-play drops.</small></div>}
        {exploreGroups.map(group => {
          const collapsed = collapsedExploreGroups.includes(group.key)
          return <section className="explore-row-group" key={group.key}>
            <button className="funnel-group-header" type="button" aria-expanded={!collapsed} onClick={() => toggleExploreGroup(group.key)}>
              <span><strong>{group.label}</strong><small>{group.hint}</small></span>
              <em>{group.items.length}</em>
              <b aria-hidden="true">⌄</b>
            </button>
            {!collapsed && group.items.map(event => <ExploreEventRow key={event.id} event={event} selected={selected?.id === event.id} onSelect={() => {
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
        {visible.length === 0 && <div className="event-empty">No events match this view. Try All or clear search.</div>}
        {!showHidden && hiddenCount > 0 && <section className={`hidden-drawer ${hiddenExpanded ? 'expanded' : ''}`} aria-label="Hidden and not-for-me events">
          <button type="button" className="hidden-toggle" onClick={() => setHiddenExpanded(value => !value)}>
            <span><EyeOffMini /> Hidden / not for me</span>
            <small>{hiddenMatches.length} matching · recoverable</small>
            <b aria-hidden="true">⌄</b>
          </button>
          {hiddenExpanded && <div className="hidden-drawer-list">
            {hiddenMatches.map(event => <ExploreEventRow key={event.id} event={event} selected={selected?.id === event.id} onSelect={() => {
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
        <ExploreDetail event={selected} focusedNoteId={focusRequest?.eventId === selected.id ? focusRequest.noteId : undefined} notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} open={detailOpen} onClose={() => { setSelectedId(null); setDetailOpen(false) }} onState={state => updateEvent(selected.id, state)} onOpenPlan={onOpenPlan} />
      </div>}
    </div>
  </section>
}

function ExploreEventRow({ event, selected, onSelect, onState }: { event: ExploreEvent; selected: boolean; onSelect: () => void; onState: (state: ExploreState) => void }) {
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
        <span className={`event-price price-${priceTone}`}><DetailFactIcon name="price" />{formatEventPrice(event.price)}</span>
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
      <IconAction label={event.state === 'committed' ? 'Committed — manage in Plan' : 'Commit from Plan'} icon="lock" pressed={event.state === 'committed'} onClick={() => setShowCommitHint(true)} />
      {showCommitHint && <span className="commit-route-hint" role="status">{event.state === 'committed' ? 'This event is committed. Manage it in Plan.' : 'Choose Interested or Tentative first, then commit it in Plan.'}</span>}
    </div>
  </article>
}

function formatEventPrice(price: string) {
  if (price.toLowerCase() === 'included') return 'Included'
  if (price.toLowerCase() === 'free') return 'Free'
  return price
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

function ExploreDetail({ event, focusedNoteId, notes, currentOwnerId, onAddNote, onDeleteNote, open, onClose, onState, onOpenPlan }: { event: ExploreEvent; focusedNoteId?: string; notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; open: boolean; onClose: () => void; onState: (state: ExploreState) => void; onOpenPlan: () => void }) {
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
        <span><DetailFactIcon name="price" />{event.price}</span>
        <span><DetailFactIcon name="duration" />{event.window}</span>
      </div>
      <OfficialEventLink event={event} />
      <EventStateRail event={event} context="explore" onState={onState} />
    </header>
    <div className="detail-intel event-context-block"><span aria-hidden="true">✧</span><p><small>OFFICIAL DESCRIPTION</small>{renderLinkedText(event.detail)}</p></div>
    <section className="detail-section decision-section">
      <div className="format-heading"><strong>{event.format}</strong>{event.formatHelp && <details className="format-help"><summary aria-label={`Explain ${event.format}`}>?</summary><p>{event.formatHelp}</p></details>}</div>
      {event.decisionFacts && <div className="decision-facts" aria-label="Event at a glance">{event.decisionFacts.map(fact => <div key={fact.label}><span>{fact.icon === 'ticket' && <TicketMiniIcon />}{fact.label}</span><strong>{fact.value}</strong></div>)}</div>}
      <p className="complexity-note"><span aria-hidden="true"><FlameGlyph /> Assessment:</span> {event.complexityWhy}</p>
    </section>
    <section className="detail-section plan-summary">
      <strong>Plan effect</strong>
      <p>{event.planEffect}</p>
    </section>
    <ObjectNotes notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} objectId={`explore-${event.id}`} objectKind="event" objectTitle={displayEventTitle(event)} focusedNoteId={focusedNoteId} context={`Event · ${displayEventTitle(event)}`} backlink="explore" compact />
    {(event.moreDetails || event.sourceNote) && <details className="detail-more">
      <summary><span>More details</span><small>Official and operational</small></summary>
      <div className="detail-more-body">
        {event.moreDetails?.map(item => <div className="more-row" key={item.label}><span>{item.label}</span><p>{renderLinkedText(item.value)}</p></div>)}
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
      const isDisabled = disabled || (state === 'committed' && !canCommit)
      const title = commitElsewhere ? 'Commit from Plan after comparing the schedule' : state === 'committed' && !canCommit ? 'Only Kavi and Chris can commit Black Lotus events.' : label
      return <button key={state} type="button" className={`decision-state-${state}`} aria-pressed={event.state === state} disabled={isDisabled} title={title} onClick={() => commitElsewhere ? setShowCommitHint(true) : onState(state)}><b aria-hidden="true"><PlanningStateIcon state={state} /></b><span>{label}</span></button>
    })}
    {showCommitHint && <span className="commit-route-hint" role="status">{event.state === 'interested' || event.state === 'tentative' ? 'This event is in Plan. Commit it there after comparing.' : 'Choose Interested or Tentative first to move this event into Plan.'}</span>}
  </div>
}

function PlanningStateIcon({ state }: { state: 'interested' | 'tentative' | 'committed' }) {
  return <ActionIcon name={state === 'interested' ? 'bookmark' : state === 'tentative' ? 'diamond' : 'lock'} />
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
  return <a className="official-event-link" href={event.officialUrl} target="_blank" rel="noreferrer"><PaperclipIcon /><span>Official event details</span><small>Opens MagicCon listing ↗</small></a>
}

function PaperclipIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9.5 12.5 5.7-5.7a3 3 0 0 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7.1-7.1l8.1-8.1" /><path d="m7.4 14.6 7.8-7.8" /></svg>
}

function TicketMiniIcon() {
  return <svg className="ticket-mini-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M12 7v2M12 11v2M12 15v2" /></svg>
}

function IconAction({ label, icon, pressed, onClick }: { label: string; icon: ActionIconName; pressed: boolean; onClick: () => void }) {
  return <button type="button" className={`icon-action-${icon}`} aria-label={label} aria-pressed={pressed} title={label} onClick={onClick}><ActionIcon name={icon} /></button>
}

function ActionIcon({ name }: { name: ActionIconName }) {
  const paths: Record<ActionIconName, ReactNode> = {
    bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v16l-6-3.4L6 21V5a1 1 0 0 1 1-1Z" />,
    diamond: <path d="M12 3 21 12 12 21 3 12Z" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    eyeOff: <><path d="M3 3l18 18" /><path d="M9.8 9.8A3 3 0 0 0 14.2 14.2" /><path d="M6.5 6.9C4.7 8 3.2 9.7 2 12c2.2 4.1 5.5 6.1 10 6.1 1.4 0 2.7-.2 3.8-.7" /><path d="M10.8 5.9c.4 0 .8-.1 1.2-.1 4.5 0 7.8 2 10 6.1-.5 1-1.1 1.9-1.8 2.7" /></>,
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
      {objectNotes.slice(0, compact ? 2 : 5).map(note => <article key={note.id} ref={note.id === focusedNoteId ? focusedNoteRef : undefined} className={`note-item ${note.id === focusedNoteId ? 'focused' : ''}`}>
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

function TravelerDots({ people }: { people: Array<'Kavi' | 'Juan' | 'Chris'> }) {
  return <span className="traveler-dots" aria-label={people.join(', ')}>{people.map(person => <span key={person} className={`traveler-dot ${person.toLowerCase()}`} title={person}>{person[0]}</span>)}</span>
}

function MapSurface({ onOpenTrip }: { onOpenTrip: () => void }) {
  const [tab, setTab] = useState<'map' | 'info'>('map')
  const logistics = logisticsToObjectDetail()

  return <section className="map-shell" aria-label="Map and info">
    <div className="map-tabs" role="tablist" aria-label="Map and info view">
      <button type="button" role="tab" aria-selected={tab === 'map'} className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>Map</button>
      <button type="button" role="tab" aria-selected={tab === 'info'} className={tab === 'info' ? 'active' : ''} onClick={() => setTab('info')}>Info</button>
    </div>

    {tab === 'map' ? <div className="map-surface">
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
      <article className="map-card event-map-card">
        <span className="eyebrow">EVENT MAP LATER</span>
        <h2>Floor map becomes the real tool later.</h2>
        <p>When the official 2026 map appears, this should switch from campus orientation to clickable con-floor navigation.</p>
        <ul>
          <li>Artist Alley, vendors, show store, prize wall, ticketed play, panels, and BL lounge become clickable areas.</li>
          <li>Receipts, event cards, and artist cards can backlink into exact map spots.</li>
          <li>Offline cache matters here because this is an onsite panic surface.</li>
        </ul>
        <div className="map-source-note">Source cues: Atlanta FAQ identifies GWCC Building C; GWCC navigation identifies Building C access/rideshare context.</div>
      </article>
    </div> : <div className="map-surface map-info-surface">
      <article className="map-card map-info-card">
        <span className="eyebrow">ONSITE INFO</span>
        <h2>{logistics.title}</h2>
        <p>{logistics.summary}</p>
        <div className="map-info-grid">
          {logistics.facts?.map(fact => <span key={fact.label}><strong>{fact.label}</strong>{fact.value}</span>)}
        </div>
      </article>
    </div>}
  </section>
}

function WalletSurface({ onOpenObject, onOpenTrip, notes, currentOwnerId, onAddNote, onDeleteNote, prizeTixValue, proofRequest, onPrizeTixChange }: { onOpenObject: (detail: ObjectDetail) => void; onOpenTrip: () => void; notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; prizeTixValue?: string; proofRequest: { target: WalletProofTarget; nonce: number } | null; onPrizeTixChange: (value: number, delta: number) => void }) {
  const [tab, setTab] = useState<WalletTab>('home')
  const [tix, setTix] = useState(() => {
    const parsed = Number(prizeTixValue)
    return Number.isFinite(parsed) ? parsed : 1700
  })
  const [modal, setModal] = useState<{ title: string; eyebrow: string; body: ReactNode; people?: PersonName[] } | null>(null)
  const openModal = (eyebrow: string, title: string, body: ReactNode, people?: PersonName[]) => setModal({ eyebrow, title, body, people })
  const openBlackLotusProof = () => openModal('BLACK LOTUS ORDER', 'Kavi + Chris badge proof', <BlackLotusProofDetail notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} />, ['Kavi', 'Chris'])
  const openJuanProof = () => openModal('PREMIUM WEEKEND ORDER', 'Juan badge proof', <JuanPremiumProofDetail notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} />, ['Juan'])
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
        <button type="button" aria-label="Subtract 100 Prize Tix" onClick={() => adjustTix(-100)}>−</button>
        <strong>{tix.toLocaleString()}</strong>
        <button type="button" aria-label="Add 100 Prize Tix" onClick={() => adjustTix(100)}>+</button>
      </div>
    </div>
    {tab === 'home' && <WalletHomeTab openBlackLotusProof={openBlackLotusProof} openJuanProof={openJuanProof} onOpenObject={onOpenObject} />}
    {tab === 'play' && <WalletPlayTab openModal={openModal} />}
    {tab === 'store' && <WalletStoreEmpty />}
    {tab === 'other' && <WalletOtherTab openModal={openModal} onOpenTrip={onOpenTrip} />}
    {modal && <WalletModal {...modal} onClose={() => setModal(null)} />}
  </section>
}

function WalletModal({ eyebrow, title, body, people, onClose }: { eyebrow: string; title: string; body: ReactNode; people?: PersonName[]; onClose: () => void }) {
  return <aside className="wallet-modal" role="dialog" aria-modal="true" aria-label={title}>
    <button className="detail-close" type="button" onClick={onClose} aria-label="Close Wallet detail">×</button>
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

function WalletHomeTab({ openBlackLotusProof, openJuanProof, onOpenObject }: { openBlackLotusProof: () => void; openJuanProof: () => void; onOpenObject: (detail: ObjectDetail) => void }) {
  return <div className="wallet-home-command">
    <section className="wallet-hero-card">
      <div className="wallet-hero-copy">
        <div className="wallet-hero-topline"><span className="eyebrow">BADGES</span></div>
        <h2>Atlanta passes</h2>
        <p>Black Lotus order proof is captured from the Leap email, including the showable order QR.</p>
      </div>
      <div className="wallet-hero-actions">
        <button className="primary-show" type="button" onClick={openBlackLotusProof}><NavIcon name="wallet" /> Black Lotus proof</button>
      </div>
      <div className="wallet-badge-fan" aria-label="Primary badge cards">
        <button className="mini-pass lotus-pass" type="button" onClick={openBlackLotusProof}>
          <span><EventKindIcon name="lotus" /></span>
          <strong>Kavi</strong>
          <small>Black Lotus</small>
          <PersonBubbles people={['Kavi']} />
        </button>
        <button className="mini-pass lotus-pass" type="button" onClick={openBlackLotusProof}>
          <span><EventKindIcon name="lotus" /></span>
          <strong>Chris</strong>
          <small>Black Lotus</small>
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
        <div className="receipt-head"><span className="receipt-icon"><EventKindIcon name="lotus" /></span><div><span className="eyebrow">BADGE RECEIPT</span><h2>Black Lotus badge order</h2><p>2 × Black Lotus VIP Early Bird · Kavi + Chris</p></div><strong>$2,025.26</strong></div>
      </button>
      <button className="receipt-card wallet-receipt-button" type="button" onClick={openJuanProof}>
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="wallet" /></span><div><span className="eyebrow">BADGE RECEIPT</span><h2>Juan Premium Weekend</h2><p>Premium Weekend Early Bird · Juan</p></div><strong>$191.42</strong></div>
      </button>
    </section>
  </div>
}

function BlackLotusProofDetail({ notes, currentOwnerId, onAddNote, onDeleteNote }: { notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void }) {
  const [mode, setMode] = useState<'info' | 'original'>('info')
  const orderCode = '9gLHU3mJ'

  return <div className="proof-detail">
    <div className="proof-mode-tabs" role="tablist" aria-label="Badge proof view">
      <button type="button" role="tab" aria-selected={mode === 'info'} className={mode === 'info' ? 'active' : ''} onClick={() => setMode('info')}>Info</button>
      <button type="button" role="tab" aria-selected={mode === 'original'} className={mode === 'original' ? 'active' : ''} onClick={() => setMode('original')}>Original</button>
    </div>
    {mode === 'info'
      ? <>
        <div className="proof-status-grid">
          <span><b>2</b><small>Black Lotus VIP Early Bird badges</small></span>
          <span><b>$2,025.26</b><small>order total</small></span>
        </div>
        <div className="proof-info-list">
          <div><span>Order proof</span><strong>QR code captured from Leap email</strong></div>
          <div><span>Will Call</span><strong>Thu 12-6 · Fri/Sat 8:30-7 · Sun 8:30-6</strong></div>
          <div><span>Show floor</span><strong>Fri/Sat 10-7 · Sun 10-6</strong></div>
        </div>
        <div className="proof-qr-card" aria-label="Showable order QR">
          <figure>
            <img src="./black-lotus-order-qr.png" alt="QR code from the MagicCon Atlanta Black Lotus order confirmation email" />
            <figcaption>Show this QR if staff needs the order proof.</figcaption>
          </figure>
          <div className="proof-code-line"><span>Order code</span><code>{orderCode}</code></div>
        </div>
        <p>Info is the fast-use view: extracted logistics plus the QR. Use Original when someone needs the whole receipt.</p>
        <ObjectNotes notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} objectId="wallet-black-lotus-order" objectKind="receipt" objectTitle="Kavi + Chris badge proof" context="Wallet · Black Lotus order" backlink="wallet" compact />
      </>
      : <>
        <p className="original-receipt-note">Full Gmail receipt render. This is intentionally the whole email, not a cropped proof slice.</p>
        <div className="original-proof-stack full-email">
          <figure>
            <img src="./black-lotus-order-original-page-1.png" alt="Original MagicCon Atlanta order confirmation email page 1" />
            <figcaption>Original email page 1 of 5</figcaption>
          </figure>
          <figure>
            <img src="./black-lotus-order-original-page-2.png" alt="Original MagicCon Atlanta order confirmation email page 2" />
            <figcaption>Original email page 2 of 5</figcaption>
          </figure>
          <figure>
            <img src="./black-lotus-order-original-page-3.png" alt="Original MagicCon Atlanta order confirmation email page 3" />
            <figcaption>Original email page 3 of 5</figcaption>
          </figure>
          <figure>
            <img src="./black-lotus-order-original-page-4.png" alt="Original MagicCon Atlanta order confirmation email page 4" />
            <figcaption>Original email page 4 of 5</figcaption>
          </figure>
          <figure>
            <img src="./black-lotus-order-original-page-5.png" alt="Original MagicCon Atlanta order confirmation email page 5" />
            <figcaption>Original email page 5 of 5</figcaption>
          </figure>
        </div>
      </>}
    <div className="proof-links">
      <a href="https://conventions.leapevent.tech/c/htwhdatl26shdl10/70a21c58-17aa-4660-b427-636407a19feb?utm_source=email&utm_medium=transactional&utm_campaign=order-confirmation" target="_blank" rel="noreferrer">Open Leap order</a>
    </div>
  </div>
}

function JuanPremiumProofDetail({ notes, currentOwnerId, onAddNote, onDeleteNote }: { notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void }) {
  const [mode, setMode] = useState<'info' | 'original'>('info')
  const orderCode = 'h7paadIU'

  return <div className="proof-detail">
    <div className="proof-mode-tabs" role="tablist" aria-label="Badge proof view">
      <button type="button" role="tab" aria-selected={mode === 'info'} className={mode === 'info' ? 'active' : ''} onClick={() => setMode('info')}>Info</button>
      <button type="button" role="tab" aria-selected={mode === 'original'} className={mode === 'original' ? 'active' : ''} onClick={() => setMode('original')}>Original</button>
    </div>
    {mode === 'info'
      ? <>
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
          <figure>
            <img src="https://conventions.leapevent.tech/mobile/get_qr/9af95f51-81e1-4ff7-8125-a7e2daccb9be" alt="QR code for Juan's MagicCon Atlanta Premium Weekend order proof" />
            <figcaption>Show this with the confirmation email code if staff needs Juan's order proof.</figcaption>
          </figure>
          <div className="proof-code-line"><span>Order code</span><code>{orderCode}</code></div>
        </div>
        <ObjectNotes notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} objectId="wallet-juan-premium-order" objectKind="receipt" objectTitle="Juan badge proof" context="Wallet · Juan Premium order" backlink="wallet" compact />
      </>
      : <div className="original-html-frame">
        <p className="original-receipt-note">Full Gmail-rendered receipt body captured from Juan's confirmation email.</p>
        <iframe title="Juan Premium Weekend original receipt" src="./juan-premium-order-original.html" sandbox="" />
      </div>}
    <div className="proof-links">
      <a href="https://conventions.leapevent.tech/c/htwhdatl26shdl10/9af95f51-81e1-4ff7-8125-a7e2daccb9be?utm_source=email&utm_medium=transactional&utm_campaign=order-confirmation" target="_blank" rel="noreferrer">Open Leap order</a>
    </div>
  </div>
}

type PersonName = 'Kavi' | 'Juan' | 'Chris' | 'Kyle'

function PersonBubbles({ people }: { people: PersonName[] }) {
  const labels: Record<PersonName, string> = { Kavi: 'Ka', Juan: 'J', Chris: 'C', Kyle: 'Ky' }
  return <span className="person-bubbles" aria-label={people.join(', ')}>
    {people.map(person => <span key={person} className={`person-bubble ${person.toLowerCase()}`} title={person}>{labels[person]}</span>)}
  </span>
}

function WalletPlayTab({ openModal: _openModal }: { openModal: (eyebrow: string, title: string, body: ReactNode) => void }) {
  return <div className="wallet-layout">
    <section className="receipt-list" aria-label="Ticketed play receipts">
      <article className="receipt-card future-store">
        <div className="receipt-head"><span className="receipt-icon"><EventKindIcon name="ticketed" /></span><div><span className="eyebrow">TICKETED PLAY</span><h2>No paid play receipts yet</h2><p>This tab wakes up when ticketed events are purchased.</p></div></div>
      </article>
    </section>
  </div>
}

function WalletStoreTab({ openModal }: { openModal: (eyebrow: string, title: string, body: ReactNode) => void }) {
  const [assignments, setAssignments] = useState<Record<string, string>>({
    sheoldred: 'Kavi',
    urabrask: 'Chris',
    event: 'Assign',
  })
  const saveAssignment = (key: string, value: string) => {
    setAssignments(current => ({ ...current, [key]: value }))
  }
  const assignmentLabel = (value: string) => {
    if (value === 'Assign') return <span className="assignment-bubble">+</span>
    if (['Kavi', 'Juan', 'Chris'].includes(value)) return <span className={`assignment-bubble ${value.toLowerCase()}`}>{value[0]}</span>
    return <span className="assignment-custom-label">{value}</span>
  }
  const assignmentPicker = (key: string) => <details className="inline-assignment" onClick={event => event.stopPropagation()}>
    <summary className={assignments[key] !== 'Assign' ? 'assigned' : ''}>{assignmentLabel(assignments[key])}</summary>
    <span className="assignment-popover">
      {['Kavi', 'Chris', 'Juan'].map(person => <button key={person} type="button" onClick={() => saveAssignment(key, person)}>{person}</button>)}
      <button type="button" onClick={() => saveAssignment(key, 'Kellen')}>Kellen</button>
      <input aria-label="Custom assignment" placeholder="Custom…" onClick={event => event.stopPropagation()} onKeyDown={event => {
        if (event.key !== 'Enter') return
        const value = event.currentTarget.value.trim()
        if (value) saveAssignment(key, value)
      }} />
    </span>
  </details>

  return <div className="wallet-layout wallet-store-legacy" hidden>
    <section className="receipt-list" aria-label="Receipts">
      <article className="receipt-card store-receipt">
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="wallet" /></span><div><span className="eyebrow">SHOW STORE FIXTURE</span><h2>Magic Con · Dragon Shield</h2><p>9 items · assignment notes ready</p></div><strong>$255.00</strong></div>
        <div className="receipt-lines">
          <div className="receipt-line-row" role="button" tabIndex={0} onClick={() => openModal('LINE ITEM', 'Sheoldred exclusive × 3', <AssignmentPreview item="Sheoldred - Exclusive: Vegas 2026" />)}><span>Sheoldred - Exclusive: Vegas 2026 × 3</span><b>$90</b>{assignmentPicker('sheoldred')}</div>
          <div className="receipt-line-row" role="button" tabIndex={0} onClick={() => openModal('LINE ITEM', 'Urabrask exclusive × 3', <AssignmentPreview item="Urabrask - Exclusive: Vegas 2026" />)}><span>Urabrask - Exclusive: Vegas 2026 × 3</span><b>$90</b>{assignmentPicker('urabrask')}</div>
          <div className="receipt-line-row" role="button" tabIndex={0} onClick={() => openModal('LINE ITEM', 'Event exclusive × 3', <AssignmentPreview item="Event Exclusive 2026" />)}><span>Event Exclusive 2026 × 3</span><b>$75</b>{assignmentPicker('event')}</div>
        </div>
        <div className="receipt-note">Assignment note example: “three of these shirts were for Kellen.”</div>
        <div className="receipt-actions"><button type="button" onClick={() => openModal('ORIGINAL STORE RECEIPT', 'Magic Con #39Z8', <ProofPreview kind="receipt" note="Original Square receipt render." />)}>Show original</button><button type="button" onClick={() => openModal('EXTRACTED LINE ITEMS', 'Magic Con #39Z8 line items', <ul><li>Sheoldred exclusive × 3 — $90</li><li>Urabrask exclusive × 3 — $90</li><li>Event Exclusive 2026 × 3 — $75</li></ul>)}>Line items</button><button type="button" onClick={() => openModal('NOTE', 'Receipt note', <p>Three of these shirts were for Kellen.</p>)}>Add note</button></div>
      </article>
      <article className="receipt-card future-store">
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="explore" /></span><div><span className="eyebrow">ATLANTA STORE</span><h2>Catalog links later</h2><p>When the show store catalog appears, receipt items should backlink to product cards.</p></div></div>
      </article>
    </section>
    <aside className="wallet-show-card receipt-preview">
      <span className="eyebrow">ORIGINAL PRESERVED</span>
      <h2>PNG first, PDF if needed.</h2>
      <div className="receipt-image-fixture">
        <span>Receipt image · #39Z8</span>
        <i />
        <i />
        <i />
        <strong>Total $255.00</strong>
      </div>
      <p>The point is quick staff/show reference without losing the exact email/PDF artifact behind the extracted facts.</p>
    </aside>
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

function AssignmentPreview({ item }: { item: string }) {
  return <div className="assignment-preview">
    <p>{item}</p>
    <small>Use the assignment chip on the receipt row to save Kavi, Chris, Juan, Kellen, or a custom name locally for this preview.</small>
  </div>
}

function WalletOtherTab({ openModal, onOpenTrip }: { openModal: (eyebrow: string, title: string, body: ReactNode) => void; onOpenTrip: () => void }) {
  return <div className="wallet-layout">
    <section className="receipt-list" aria-label="Other wallet references">
      <article className="receipt-card">
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="trip" /></span><div><span className="eyebrow">DELTA RECEIPT</span><h2>Flights · Kavi + Juan</h2><p>Confirmation HOGFBX · SNA ⇄ ATL</p></div></div>
        <div className="receipt-lines"><button type="button" onClick={() => openModal('FLIGHT DETAIL', 'DL 1521', <p>SNA to ATL · Nov 11 · 12:20 PM–7:34 PM · confirmation HOGFBX.</p>)}><span>DL 1521 · Nov 11 · SNA to ATL</span><b>7:34 PM</b></button><button type="button" onClick={() => openModal('FLIGHT DETAIL', 'DL 1602', <p>ATL to SNA · Nov 15 · 8:35 PM–10:29 PM · confirmation HOGFBX.</p>)}><span>DL 1602 · Nov 15 · ATL to SNA</span><b>8:35 PM</b></button></div>
        <div className="receipt-actions"><button type="button" onClick={onOpenTrip}>Open Trip</button></div>
      </article>
      <article className="receipt-card">
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="trip" /></span><div><span className="eyebrow">HOTELS</span><h2>Omni + Courtyard</h2><p>Atlanta lodging</p></div></div>
        <div className="receipt-lines"><button type="button" onClick={() => openModal('HOTEL DETAIL', 'Courtyard', <p>Courtyard by Marriott Atlanta Downtown · Nov 11–12 · Kavi, Juan, Chris.</p>)}><span>Courtyard · Nov 11-12</span><b>K/J/C</b></button><button type="button" onClick={() => openModal('HOTEL DETAIL', 'Omni', <p>Omni Atlanta Hotel at Centennial Park · Nov 12–15 · Kavi and Juan.</p>)}><span>Omni · Nov 12-15</span><b>K/J</b></button></div>
        <div className="receipt-actions"><button type="button" onClick={onOpenTrip}>Open Trip</button></div>
      </article>
    </section>
  </div>
}

function TripSurface({ onOpenObject }: { onOpenObject: (detail: ObjectDetail) => void }) {
  const [tab, setTab] = useState<'hotels' | 'flights'>('hotels')

  return <section className="trip-surface" aria-label="Atlanta trip overview">
    <div className="trip-tabs" role="tablist" aria-label="Trip section">
      <button type="button" role="tab" aria-selected={tab === 'hotels'} className={tab === 'hotels' ? 'active' : ''} onClick={() => setTab('hotels')}>Hotels</button>
      <button type="button" role="tab" aria-selected={tab === 'flights'} className={tab === 'flights' ? 'active' : ''} onClick={() => setTab('flights')}>Flights</button>
    </div>

    {tab === 'hotels' ? <HotelsTripTab onOpenObject={onOpenObject} /> : <FlightsTripTab />}
  </section>
}

function tripHotelDetail(kind: 'courtyard' | 'omni' | 'chris'): ObjectDetail {
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
  if (kind === 'chris') return {
    id: 'hotel-chris',
    kind: 'hotel',
    eyebrow: 'Hotel · Thursday onward',
    title: "Chris's hotel",
    summary: 'Chris branches to his own hotel after the Thursday Black Lotus First Look block. Hotel details are still pending.',
    facts: [
      { label: 'People', value: 'Chris' },
      { label: 'Status', value: 'Hotel details pending' },
    ],
    rationale: 'Keep this visible as an intentional missing fact rather than pretending the trip plan is complete.',
    actions: [{ label: 'Open Trip', destination: 'trip' }],
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
    <div className="trip-layout">
      <section className="trip-flow-card" aria-labelledby="lodging-flow-title">
        <div className="trip-section-head"><div><span className="eyebrow">LODGING FLOW</span><h2 id="lodging-flow-title">Wednesday through Sunday</h2></div><TravelerDots people={['Kavi', 'Juan', 'Chris']} /></div>
        <div className="trip-flow">
          <button type="button" className="trip-stop shared-stop object-card-button" onClick={() => onOpenObject(tripHotelDetail('courtyard'))}>
            <time><strong>11</strong><span>WED</span></time>
            <div className="trip-stop-icon"><NavIcon name="trip" /></div>
            <div><small>SHARED ARRIVAL NIGHT</small><h3>Courtyard Atlanta Downtown</h3><p>One room · one night</p></div>
            <TravelerDots people={['Kavi', 'Juan', 'Chris']} />
          </button>
          <div className="trip-connector"><span>hotel change</span></div>
          <button type="button" className="trip-stop lotus-transition object-card-button" onClick={() => onOpenObject(exploreEventToObjectDetail(exploreEventCandidates.find(event => event.id === 'bl-first-look-thursday') ?? exploreEventCandidates[0]))}>
            <time><strong>12</strong><span>THU</span></time>
            <div className="trip-stop-icon lotus-mini"><EventKindIcon name="lotus" /></div>
            <div><small>BLACK LOTUS FIRST LOOK</small><h3>Kavi + Chris attend</h3><p>The lodging paths separate afterward.</p></div>
            <TravelerDots people={['Kavi', 'Chris']} />
          </button>
          <div className="trip-branches" aria-label="Thursday hotel split">
            <button type="button" className="trip-branch omni-branch object-card-button" onClick={() => onOpenObject(tripHotelDetail('omni'))}><span className="branch-line" aria-hidden="true" /><div><small>NOV 12-15 · 3 NIGHTS</small><h3>Omni at Centennial Park</h3><p>Kavi and Juan · convention hotel</p></div><TravelerDots people={['Kavi', 'Juan']} /></button>
            <button type="button" className="trip-branch chris-branch object-card-button" onClick={() => onOpenObject(tripHotelDetail('chris'))}><span className="branch-line" aria-hidden="true" /><div><small>THURSDAY ONWARD</small><h3>Chris's hotel</h3><p>Hotel details pending</p></div><TravelerDots people={['Chris']} /></button>
          </div>
        </div>
      </section>

      <button type="button" className="trip-insight object-card-button" aria-label="Thursday transition insight" onClick={() => onOpenObject(tripTransitionDetail())}>
        <span className="insight-icon"><NavIcon name="wallet" /></span>
        <div><span className="eyebrow">ONE THING WORTH SETTLING</span><h2>Where do the bags go Thursday?</h2><p>The shared Courtyard stay ends before Kavi and Chris finish First Look. Omni check-in begins at 4 PM, so the luggage handoff is the only trip transition that may need a small plan.</p></div>
      </button>
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
    </div>
    <p className="trip-source-note">Hotel addresses and Omni check-in/out times verified from official property pages. Booking details stay private.</p>
  </>
}

function FlightsTripTab() {
  return <div className="flight-grid" aria-label="Flight details">
    <section className="flight-card">
      <div className="flight-card-head">
        <span className="flight-icon"><NavIcon name="trip" /></span>
        <div><span className="eyebrow">DELTA AIR LINES</span><h2>Orange County / Atlanta</h2></div>
        <TravelerDots people={['Kavi', 'Juan']} />
      </div>
      <div className="flight-confirmation"><span>Confirmation</span><strong>HOGFBX</strong></div>
      <div className="flight-legs" aria-label="Delta itinerary legs">
        <article>
          <time><strong>11</strong><span>WED</span></time>
          <div><small>DL 1521</small><h3>SNA to ATL</h3><p>12:20 PM - 7:34 PM</p></div>
        </article>
        <article>
          <time><strong>15</strong><span>SUN</span></time>
          <div><small>DL 1602</small><h3>ATL to SNA</h3><p>8:35 PM - 10:29 PM</p></div>
        </article>
      </div>
      <div className="flight-facts"><span>Kavi and Juan</span><span>Main Classic</span><span>Receipt in Gmail</span></div>
    </section>

    <aside className="trip-insight flight-ai">
      <span className="insight-icon"><NavIcon name="activity" /></span>
      <div><span className="eyebrow">QUIET CHECK</span><h2>No travel action needed</h2><p>The flight window matches the hotel plan: arrive before the shared Courtyard night, depart after Sunday events and Omni check-out. Only a Delta change or cancellation email should interrupt this quiet state.</p></div>
    </aside>
  </div>
}

function ArtistsSurface({ onOpenObject, onOpenActivity }: { onOpenObject: (detail: ObjectDetail) => void; onOpenActivity: () => void }) {
  return <section className="artists-surface" aria-label="Artists">
    <section className="artists-status-card">
      <div className="artist-status-icon" aria-hidden="true"><NavIcon name="artists" /></div>
      <div>
        <span className="eyebrow">ATLANTA 2026</span>
        <h2>No confirmed artist list yet.</h2>
        <p>The official Atlanta artist directory is still unpublished, so this stays a tightly marked holding spot for likely returners.</p>
      </div>
      <button type="button" onClick={onOpenActivity}>Open Activity</button>
    </section>
    <div className="artists-layout">
      <section className="artist-seed-list" aria-label="Historical artist seeds">
        {artistSeeds.map(seed => <button key={seed.id} type="button" className="artist-seed-card featured" onClick={() => onOpenObject(artistSeedToObjectDetail(seed))}>
          <span className="artist-seed-mark"><NavIcon name="artists" /></span>
          <span>
            <small>{seed.signal}</small>
            <strong>{seed.title}</strong>
            <em>{seed.status}</em>
          </span>
          {seed.thumbnailUrl && <span className="artist-seed-thumb" aria-hidden="true"><img src={seed.thumbnailUrl} alt="" loading="lazy" /></span>}
          <b aria-hidden="true">›</b>
        </button>)}
      </section>
      <aside className="artists-intel-card">
        <span className="eyebrow">WHY THIS IS HERE</span>
        <h2>Start with one meaningful artist seed.</h2>
        <p>Rebecca Guay is here as a likely returning artist until Atlanta publishes the official list.</p>
        <dl>
          <div><dt>Status</dt><dd>Historical only</dd></div>
          <div><dt>Next unlock</dt><dd>Official Atlanta artist directory</dd></div>
          <div><dt>Later value</dt><dd>Match against owned cards</dd></div>
        </dl>
      </aside>
    </div>
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

function CalendarSurface({ slice, events, selectionRows, companions, notes, currentOwnerId, currentPerson, onAddNote, onDeleteNote, onUpdateEvent, onOpenExplore, onOpenPlan, onOpenPlanEvent, onOpenTrip, onChangeState, online, saving, canCommitBlackLotus }: { slice: TrustSlice; events: ExploreEvent[]; selectionRows: UserSelectionRow[]; companions: CompanionMember[]; notes: ContextNote[]; currentOwnerId?: string; currentPerson: PersonName; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; onUpdateEvent: (id: string, state: ExploreState) => void; onOpenExplore: () => void; onOpenPlan: () => void; onOpenPlanEvent: (id: string) => void; onOpenTrip: () => void; onChangeState: (state: PlanningState) => void; online: boolean; saving: boolean; canCommitBlackLotus: boolean }) {
  const [mode, setMode] = useState<'upcoming' | 'past'>('upcoming')
  const [filter, setFilter] = useState<CalendarFilter>('all')
  const [detail, setDetail] = useState<CalendarDetail | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedPeople, setSelectedPeople] = useState<PersonName[]>([currentPerson])
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const toolbarStartRef = useRef(0)
  const [toolbarPinned, setToolbarPinned] = useState(false)
  const [toolbarHeight, setToolbarHeight] = useState(0)
  const candidateEvents = events.map(event => event.id === 'bl-planechase' ? { ...event, state: slice.decision.planning_state as ExploreState } : event)
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
    if (event.id === 'bl-planechase') onChangeState(state as PlanningState)
    else onUpdateEvent(event.id, state)
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
  const togglePerson = (person: PersonName) => setSelectedPeople(current => current.includes(person) ? current.length === 1 ? current : current.filter(item => item !== person) : [...current, person])
  const renderCommittedEvent = (event: ExploreEvent) => {
    const participants = (participantMap.get(event.id) ?? []).filter(participant => selectedPeople.includes(participant.person) && participant.state === 'committed')
    const blackLotus = event.kind === 'Black Lotus'
    const icon: EventKindIconName = event.type === 'play' ? 'play' : event.type === 'info' ? 'info' : event.type === 'social' ? 'social' : 'ticketed'
    const dayNumber = event.day === 'Thu' ? '12' : event.day === 'Fri' ? '13' : event.day === 'Sat' ? '14' : '15'
    return <button key={event.id} className={`agenda-row agenda-action convention-event-row ${blackLotus ? 'lotus-row' : 'convention-row'}`} type="button" onClick={() => onOpenPlanEvent(event.id)}>
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
    <div ref={toolbarRef} className={`calendar-toolbar surface-workbar calendar-workbar ${toolbarPinned ? 'pinned' : ''}`}>
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
    </div> : <>

    <div className="calendar-month"><span>AUG</span><strong>Waiting season</strong></div>
    <button className="agenda-row agenda-action milestone-row" type="button" onClick={() => setDetail('ticketed-play')}>
      <div className="agenda-date milestone-date-tile"><span>{milestoneForecasts[0].month}</span><strong>{milestoneForecasts[0].calendarDate}</strong><em>OFFICIAL</em></div>
      <div className="agenda-icon"><NavIcon name="calendar" /></div>
      <div className="agenda-copy"><div><span className="agenda-kind">Next ticketed play milestone</span><span className="soft-chip">{milestoneForecasts[0].confidence}</span></div><h2>Ticketed play purchasing opens</h2><p>{milestoneForecasts[0].window} · schedule page is already published.</p></div>
      <span className="agenda-destination"><NavIcon name="notes" />Details</span>
    </button>

    <div className="calendar-gap"><span>quiet monitoring</span></div>
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
      <div className="agenda-date"><strong>11</strong><span>WED</span><em>7:34 PM</em></div>
      <div className="agenda-icon"><NavIcon name="trip" /></div>
      <div className="agenda-copy"><span className="agenda-kind">Flight + hotel</span><h2>Arrive ATL · Courtyard night</h2><p>DL 1521 lands 7:34 PM; Courtyard by Marriott Atlanta Downtown, one night.</p></div>
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
    {showConvention && fridaySelected.map(renderCommittedEvent)}
    {showConvention && <CalendarDayHeader day="SAT" date="November 14" label={showSaturday ? 'Committed events' : 'Convention day 2'} />}
    {showConvention && <AgendaMarker time="10:00 AM" label="Show floor opens" detail="Saturday show-floor hours run 10 AM-7 PM" />}
    {showConvention && saturdaySelected.map(renderCommittedEvent)}
    {showConvention && <AgendaMarker time="7:00 PM" label="Show floor closes" detail="The play area remains open later" />}
    {showConvention && <AgendaMarker time="11:59 PM" label="Play area closes" detail="End of Saturday play-area hours" />}

    {showConvention && <CalendarDayHeader day="SUN" date="November 15" label={showSunday ? 'Committed events' : 'Final day'} />}
    {showConvention && <AgendaMarker time="8:30 AM" label="Black Lotus lounge opens" onOpen={() => setDetail('bl-sunday')} />}
    {showConvention && <AgendaMarker time="9:45 AM" label="Priority entry to the show floor" onOpen={() => setDetail('bl-sunday')} />}
    {showConvention && sundaySelected.map(renderCommittedEvent)}
    {showConvention && <AgendaMarker time="4:00 PM" label="Last Mystery Booster 2 draft fires" onOpen={() => setDetail('bl-sunday')} />}
    {showConvention && hasCommittedEvent('bl-progressive-sealed') && <AgendaMarker time="5:00 PM" label="Final chance to claim Progressive Sealed booster prizes" onOpen={() => openEvent('bl-progressive-sealed')} />}
    {showConvention && <AgendaMarker time="6:00 PM" label="Black Lotus lounge closes" onOpen={() => setDetail('bl-sunday')} />}

    {showTravel && <button className="agenda-row agenda-action travel-row" type="button" onClick={onOpenTrip}>
      <div className="agenda-date"><strong>15</strong><span>SUN</span><em>8:35 PM</em></div>
      <div className="agenda-icon"><NavIcon name="trip" /></div>
      <div className="agenda-copy"><span className="agenda-kind">Checkout + flight</span><h2>Omni check-out · fly home</h2><p>Omni check-out 11 AM; DL 1602 departs ATL 8:35 PM.</p></div>
      <span className="agenda-destination"><NavIcon name="trip" />Trip</span>
    </button>}
    </>}

    {detail && <CalendarDetailSheet detail={detail} slice={slice} onClose={() => setDetail(null)} onOpenPlan={onOpenPlan} onOpenTrip={onOpenTrip} onChangeState={onChangeState} online={online} saving={saving} canCommitBlackLotus={canCommitBlackLotus} />}
    {selectedEvent && <CalendarEventDetail event={selectedEvent} notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} onClose={() => setSelectedEventId(null)} onState={state => updateCalendarEvent(selectedEvent, state)} onOpenPlan={onOpenPlan} online={online} saving={saving} canCommit={selectedEvent.id !== 'bl-planechase' || canCommitBlackLotus} />}
  </section>
}

function CalendarEventDetail({ event, notes, currentOwnerId, onAddNote, onDeleteNote, onClose, onState, onOpenPlan, online, saving, canCommit }: { event: ExploreEvent; notes: ContextNote[]; currentOwnerId?: string; onAddNote: (input: AddContextNoteInput) => void; onDeleteNote: (id: string) => void; onClose: () => void; onState: (state: ExploreState) => void; onOpenPlan: () => void; online: boolean; saving: boolean; canCommit: boolean }) {
  return <aside className="calendar-detail-sheet calendar-event-detail event-detail-panel" aria-label={`${event.title} calendar detail`}>
    <header className="event-detail-heading">
      <div className="detail-head"><span className={`detail-kind ${event.kind === 'Black Lotus' ? 'lotus' : ''}`}>{event.kind}</span><span className="detail-head-actions"><span className={`event-stage stage-${event.state}`}>{eventStageLabel(event.state)}</span><button className="detail-close" type="button" onClick={onClose} aria-label="Close event detail">×</button></span></div>
      <h2>{displayEventTitle(event)}</h2>
      <div className="detail-facts"><span><DetailFactIcon name="time" />{event.day} · {event.time}</span><span><DetailFactIcon name="price" />{formatEventPrice(event.price)}</span><span><DetailFactIcon name="duration" />{event.window}</span></div>
      <OfficialEventLink event={event} />
    </header>
    <EventStateRail event={event} context="calendar" onState={onState} disabled={!online || saving} canCommit={canCommit} />
    <div className="detail-intel event-context-block"><span aria-hidden="true">✦</span><p><small>WHAT YOU NEED TO KNOW</small>{event.state === 'committed' ? `This is on the calendar for ${event.day} at ${event.time}. ${event.planEffect}` : `This is not a hard calendar commitment yet. ${event.planEffect}`}</p></div>
    <section className="detail-section"><strong>{event.format}</strong><p>{renderLinkedText(event.detail)}</p></section>
    {event.decisionFacts && <div className="decision-facts" aria-label="Event logistics">{event.decisionFacts.map(fact => <div key={fact.label}><span>{fact.label}</span><strong>{fact.value}</strong></div>)}</div>}
    <div className="plan-provenance"><span>{event.sourceNote?.includes('Official Atlanta') ? 'Official Atlanta source' : 'Source context'}</span><small>{renderLinkedText(event.sourceNote ?? 'Source context captured for this item.')}</small></div>
    <ObjectNotes notes={notes} currentOwnerId={currentOwnerId} onAddNote={onAddNote} onDeleteNote={onDeleteNote} objectId={`explore-${event.id}`} objectKind="event" objectTitle={displayEventTitle(event)} context={`Event · ${displayEventTitle(event)}`} backlink="calendar" compact />
    <button className="detail-plan-link" type="button" onClick={onOpenPlan}>Reconsider in Plan <span aria-hidden="true">›</span></button>
  </aside>
}

function CalendarDetailSheet({ detail, slice, onClose, onOpenPlan, onOpenTrip, onChangeState, online, saving, canCommitBlackLotus }: { detail: CalendarDetail; slice: TrustSlice; onClose: () => void; onOpenPlan: () => void; onOpenTrip: () => void; onChangeState: (state: PlanningState) => void; online: boolean; saving: boolean; canCommitBlackLotus: boolean }) {
  const forecast = milestoneForecasts.find(item => item.id === detail)
  const content = forecast
    ? { eyebrow: `FORECAST · ${forecast.window.toUpperCase()}`, title: forecast.title, copy: forecast.rationale }
    : detail === 'arrival'
      ? { eyebrow: 'TRIP · NOV 11', title: 'Arrival and Courtyard night', copy: 'Kavi and Juan fly Delta 1521 from SNA to ATL, 12:20 PM-7:34 PM, confirmation HOGFBX. The first hotel anchor is Courtyard by Marriott Atlanta Downtown for Kavi, Juan, and Chris.' }
      : detail === 'preview'
        ? { eyebrow: 'BLACK LOTUS · NOV 12', title: 'First Look and Omni check-in', copy: 'Kavi and Chris have the Black Lotus First Look day. Courtyard ends before Omni check-in at 4 PM, so luggage handling is the only practical transition note currently worth keeping visible.' }
        : detail === 'bl-thursday'
          ? { eyebrow: 'OFFICIAL BLACK LOTUS · NOV 12', title: 'Thursday early-access schedule', copy: 'Published BL schedule: lounge opens at 12 PM; Progressive Sealed league pickup/play begins at 12 PM; Behind the Card Frame & First Look runs 1-8 PM with several TBD content slots; Design the Unknown Planechase Card is 4:15-5:15; Paint & Sip is 6:30-7:30; Welcome Reception + First Look runs 8-11 PM. Locations are still TBD and the schedule is subject to change.' }
        : detail === 'friday'
          ? { eyebrow: 'CONVENTION · NOV 13', title: 'Friday', copy: 'No committed or purchased events are captured yet.' }
          : detail === 'bl-friday'
            ? { eyebrow: 'OFFICIAL BLACK LOTUS · NOV 13', title: 'Friday Black Lotus schedule', copy: 'Published BL schedule: lounge opens 8:30 AM; beverage service 8:30-11; online store pre-order pickup 8:30-5; priority show-floor entry 9:45; play event with special guests 2-6 PM. The play event is explicitly under construction, so this is a meaningful watch item rather than a fully defined event.' }
          : detail === 'airport'
            ? { eyebrow: 'TRIP · NOV 15', title: 'Leave for ATL airport', copy: 'Departure time is not set yet. It should account for the final Sunday plan, bags, airport buffer, and local travel conditions.' }
          : detail === 'sunday'
            ? { eyebrow: 'TRIP · NOV 15', title: 'Closing day and flight home', copy: 'Omni check-out is 11 AM. Kavi and Juan fly Delta 1602 from ATL to SNA, 8:35 PM-10:29 PM, confirmation HOGFBX. Calendar should eventually derive a low-noise leave-for-airport reminder from the final Sunday plan.' }
            : detail === 'bl-sunday'
              ? { eyebrow: 'OFFICIAL BLACK LOTUS · NOV 15', title: 'Sunday Black Lotus schedule', copy: 'Published BL schedule: lounge opens 8:30 AM; beverage service 8:30-11; priority show-floor entry 9:45; Mystery Booster 2 drafts fire 1-5 PM, limited to 2 per person, with the last draft firing at 4 PM; Meet & Greet / Feedback Session with the Wizards event team is 3-4 PM; lounge closes at 6 PM.' }
            : { eyebrow: 'BLACK LOTUS · NOV 14', title: slice.occurrence.title.replace('Black Lotus ', ''), copy: '11:30 AM–3:00 PM · included Black Lotus event.' }

  return <aside className="calendar-detail-sheet" aria-label={`${content.title} details`}>
    <div className="calendar-detail-head">
      <span className="eyebrow">{content.eyebrow}</span>
      <button className="detail-close calendar-detail-close" type="button" onClick={onClose} aria-label="Close details">×</button>
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

function HomeSurface({ slice, activityItems, currentPerson, onOpenPlan, onOpenItem, onOpenObject, onOpenActivity }: { slice: TrustSlice; activityItems: ActivityItem[]; currentPerson: PersonName; onOpenPlan: () => void; onOpenItem: (item: ActivityItem) => void; onOpenObject: (detail: ObjectDetail) => void; onOpenActivity: () => void }) {
  const [showTicketedPlayMilestone, setShowTicketedPlayMilestone] = useState(false)
  const now = Date.now()
  const homeSignals = homeWorthKnowingItems(activityItems, now, currentPerson)
  const hotCount = homeSignals.filter(item => item.severity === 'hot').length
  return <div className="home-surface">
    <div className="home-main-row">
      <section className={`home-activity-lane ${hotCount ? 'has-hot' : ''}`} aria-labelledby="home-activity-heading">
        <div className="home-lane-head">
          <div><span className="eyebrow">WORTH KNOWING</span><h2 id="home-activity-heading">{homeSignals.length ? `${homeSignals.length} recent item${homeSignals.length === 1 ? '' : 's'}` : 'All quiet'}</h2></div>
          <button type="button" onClick={onOpenActivity}>Full Activity</button>
        </div>
        <p>{hotCount ? `${hotCount} item${hotCount === 1 ? '' : 's'} genuinely need attention; the rest are useful recent context.` : 'Recent notes and useful changes land here without turning routine activity into an alarm.'}</p>
        <div className="timely-home" aria-label="Recent signals">
          {homeSignals.map(item => <button type="button" key={item.id} className={`signal-chip-card ${item.severity}`} onClick={() => onOpenItem(item)}>
            <span>{item.sourceKind === 'note' ? <NavIcon name="notes" /> : <AlertKindIcon kind={item.kind} />}</span>
            <div>{item.severity === 'hot' && <small>HOT NOW</small>}<strong>{item.title}</strong><small>{item.summary}</small></div>
          </button>)}
          {!homeSignals.length && <button type="button" className="signal-chip-card quiet" onClick={onOpenActivity}>
            <span><MilestoneIcon name="badges" /></span>
            <div><strong>No open items</strong><small>Monitoring is quiet and recent collaboration is caught up.</small></div>
          </button>}
        </div>
      </section>

      <div className="home-right-rail">
        <button className="next-milestone home-top-forecast" type="button" onClick={() => setShowTicketedPlayMilestone(true)}>
          <div className="milestone-symbol" aria-hidden="true"><MilestoneIcon name="ticketed-play" /></div>
          <div>
            <span className="eyebrow">NEXT EXPECTED</span>
            <h2>Ticketed play purchasing is next.</h2>
            <p>The schedule page is published. Now the next milestone is buying ticketed play on August 25 at 10 AM PT.</p>
          </div>
          <span className="milestone-date"><small>Official</small><strong>Aug 25</strong></span>
        </button>

        <section className="runway planning-runway home-runway-only" aria-labelledby="planning-runway-heading">
          <div className="runway-heading"><div><span className="eyebrow">MILESTONE RUNWAY</span><h3 id="planning-runway-heading">What we are waiting for</h3></div><span>2 known · 3 waiting</span></div>
          <ol>
            <li className="complete"><span className="runway-icon"><MilestoneIcon name="badges" /></span><div><strong>Badges on sale</strong><small>Live now</small></div></li>
            {milestoneForecasts.map((forecast, index) => <li key={forecast.id} className={index === 0 ? 'current' : ''}>
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

function NotesSurface({ notes, currentOwnerId, onDeleteNote, onOpenNote }: { notes: ContextNote[]; currentOwnerId?: string; onDeleteNote: (id: string) => void; onOpenNote: (note: ContextNote) => void }) {
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

function ActivitySurface({ slice, activityItems: incomingItems, notes, onReviewChange, onOpenItem, onOpenNote }: { slice: TrustSlice; activityItems: ActivityItem[]; notes: ContextNote[]; onReviewChange: (item: ActivityItem, state: AlertReviewState) => void; onOpenItem: (item: ActivityItem) => void; onOpenNote: (note: ContextNote) => void }) {
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
        {alerts.map(alert => <AlertCard key={alert.id} alert={alert} onReviewChange={onReviewChange} onOpenItem={onOpenItem} />)}
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

function AlertCard({ alert, onReviewChange, onOpenItem }: { alert: ActivityItem; onReviewChange: (item: ActivityItem, state: AlertReviewState) => void; onOpenItem: (item: ActivityItem) => void }) {
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
      <div className="activity-meta"><span className={`review-badge ${alert.reviewState}`}>{alert.reviewState.replace('-', ' ')}</span><span>{alert.destination}</span><span>{alert.object}</span><span>{alert.source}</span></div>
      <details>
        <summary>Why this matters</summary>
        <p>{renderLinkedText(alert.rationale)}</p>
        <p>{renderLinkedText(alert.nextAction)}</p>
      </details>
      <div className="activity-review-actions">
        <button type="button" onClick={() => onOpenItem(alert)}>Open object</button>
        {alert.reviewState !== 'reviewed' && <button type="button" onClick={() => onReviewChange(alert, 'reviewed')}>Mark read</button>}
        {alert.reviewState !== 'archived' && <button type="button" onClick={() => onReviewChange(alert, 'archived')}>Ignore</button>}
        {alert.reviewState !== 'needs-review' && <button type="button" onClick={() => onReviewChange(alert, 'needs-review')}>Reopen</button>}
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

function AccountMenu({ email, online, preview }: { email: string; online: boolean; preview: boolean }) {
  const initial = email.trim().charAt(0).toUpperCase() || 'K'

  return <details className="account-menu">
    <summary aria-label="Account menu">
      <span className="account-initial">{initial}</span>
      <span className={`account-presence ${online ? 'online' : ''}`} aria-label={online ? 'Online' : 'Offline'} />
    </summary>
    <div className="account-popover">
      <span>{email}</span>
      {preview
        ? <button type="button" disabled>Preview mode</button>
        : <button type="button" onClick={() => void supabase?.auth.signOut({ scope: 'local' })}>Sign out</button>}
    </div>
  </details>
}

function MentionInbox({ items, onOpenMention }: { items: MentionInboxItem[]; onOpenMention: (note: ContextNote) => void }) {
  const unread = items.length

  return <details className="mention-inbox">
    <summary aria-label={`Mentions${unread ? `, ${unread} unread` : ''}`}>
      <svg className="mention-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="m4 8 8 6 8-6" />
      </svg>
      {unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}
    </summary>
    <div className="mention-popover">
      <header>
        <span className="eyebrow">MENTIONS</span>
        <strong>{unread ? `${unread} for you` : 'Nothing waiting'}</strong>
      </header>
      {items.length
        ? <div className="mention-list">
          {items.map(item => <button
            key={item.id}
            type="button"
            className="mention-item"
            onClick={event => {
              const root = event.currentTarget.closest('details')
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
          </button>)}
        </div>
        : <p className="mention-empty">No @mentions yet. Shared notes that name you will land here.</p>}
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
    <p className="login-intro">Use Google OAuth for a persistent Supabase session. Magic links stay parked so we do not burn email quota during testing.</p>
    <button type="button" className="oauth-button" onClick={onGoogleSignIn}><span aria-hidden="true">G</span>Continue with Google</button>
    <a className="preview-link" href={`${window.location.pathname}?preview=1`}>Open preview mode</a>
    <a className="preview-link" href={`${window.location.pathname}?previewOwner=chris#home`}>Open as Chris</a>
    {message && <p role="status" className={`login-message ${messageTone}`}>{message}</p>}
  </section></div>
}
