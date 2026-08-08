import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { NavIcon, type NavIconName } from './NavIcon'
import { DESIGN_PREVIEW_SLICE } from './lib/designPreview'
import { authRedirectUrl, resolveDesignPreviewMode } from './lib/appMode'
import {
  formatOccurrenceTime,
  readTrustSliceCache,
  writeTrustSliceCache,
  type PlanningState,
  type TrustSlice,
} from './lib/trustSlice'

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

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
    notes: 'NOTES',
    activity: 'ACTIVITY',
  }
  return labels[surface]
}

function surfaceTitle(surface: Surface) {
  const titles: Record<Surface, string> = {
    home: 'Atlanta is quiet.',
    calendar: 'The road to Atlanta.',
    plan: 'One known anchor.',
    explore: 'Find the keepers.',
    map: 'Where things are.',
    wallet: 'Show, claim, remember.',
    trip: 'One shared night, then a split.',
    notes: 'Notes stay where they happened.',
    activity: 'Monitor inbox.',
  }
  return titles[surface]
}

function surfaceSubtitle(surface: Surface) {
  const subtitles: Record<Surface, string> = {
    home: 'No new signal needs attention.',
    calendar: 'Only the dates that shape the trip.',
    plan: 'Bracketed interaction study for the ticketed-play phase.',
    explore: 'A compact intake lane for events worth comparing.',
    map: 'Trip-area orientation now; official event map when Atlanta publishes it.',
    wallet: 'Passes, receipts, and Prize Tix without hunting through email.',
    trip: 'Who is staying where, and the one transition worth noticing.',
    notes: 'Mostly human notes, grouped by the object that prompted them.',
    activity: 'Review what changed, what landed, and what can be ignored.',
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

type Surface = 'home' | 'calendar' | 'plan' | 'explore' | 'map' | 'wallet' | 'trip' | 'notes' | 'activity'

const destinations = [
  { name: 'Home', icon: 'home' as NavIconName, surface: 'home' as Surface },
  { name: 'Calendar', icon: 'calendar' as NavIconName, surface: 'calendar' as Surface },
  { name: 'Plan', icon: 'plan' as NavIconName, surface: 'plan' as Surface },
  { name: 'Explore', icon: 'explore' as NavIconName, surface: 'explore' as Surface },
  { name: 'Map', icon: 'map' as NavIconName, surface: 'map' as Surface },
  { name: 'Wallet', icon: 'wallet' as NavIconName, surface: 'wallet' as Surface },
  { name: 'Trip', icon: 'trip' as NavIconName, surface: 'trip' as Surface },
  { name: 'Notes', icon: 'notes' as NavIconName, surface: 'notes' as Surface },
]

export default function App() {
  const designPreview = resolveDesignPreviewMode({
    search: window.location.search,
    development: import.meta.env.DEV,
    previewBuild: import.meta.env.VITE_DESIGN_PREVIEW === '1',
    storage: window.localStorage,
  })
  const [session, setSession] = useState<Session | null>(null)
  const [slice, setSlice] = useState<TrustSlice | null>(designPreview ? DESIGN_PREVIEW_SLICE : null)
  const [online, setOnline] = useState(navigator.onLine)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [surface, setSurface] = useState<Surface>('home')
  const [previousSurface, setPreviousSurface] = useState<Surface | null>(null)
  const [mobileNavMenu, setMobileNavMenu] = useState<'events' | 'more' | null>(null)
  const [navNotice, setNavNotice] = useState('')
  const [monitorAlerts, setMonitorAlerts] = useState<MonitoringAlert[]>(monitoringAlerts)
  const [objectDetail, setObjectDetail] = useState<ObjectDetail | null>(null)
  const [alertReview, setAlertReview] = useState<Record<string, AlertReviewState>>(() => {
    try {
      const saved = window.localStorage.getItem('magiccon-alert-review-state')
      return saved ? JSON.parse(saved) as Record<string, AlertReviewState> : {}
    } catch {
      return {}
    }
  })

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
    if (designPreview) {
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
  }, [designPreview])

  const refresh = useCallback(async () => {
    if (designPreview || !session || !online) return
    setLoading(true)
    setMessage('')
    try {
      const next = await loadTrustSlice(session.user.id)
      writeTrustSliceCache(next)
      setSlice(next)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The current view could not be refreshed.')
    } finally {
      setLoading(false)
    }
  }, [designPreview, online, session])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (!designPreview) return
    let active = true
    void fetch(`${import.meta.env.BASE_URL}monitoring-intake.json`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (!active || !payload || !Array.isArray(payload.alerts)) return
        const incoming = payload.alerts.filter(isMonitoringAlert)
        if (incoming.length > 0) setMonitorAlerts(incoming)
      })
      .catch(() => {
        // The intake file is optional. If it is missing or malformed, keep the
        // built-in fixture alerts so local design review never goes blank.
      })
    return () => { active = false }
  }, [designPreview])

  useEffect(() => {
    try {
      window.localStorage.setItem('magiccon-alert-review-state', JSON.stringify(alertReview))
    } catch {
      // Local POC review convenience only.
    }
  }, [alertReview])

  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const form = new FormData(event.currentTarget)
    setMessage('Sending your sign-in link…')
    const { error } = await supabase.auth.signInWithOtp({
      email: String(form.get('email')),
      options: {
        emailRedirectTo: authRedirectUrl(window.location),
        shouldCreateUser: false,
      },
    })
    setMessage(error?.message ?? 'Check your email. The link will bring you back here signed in.')
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
      setMessage(error instanceof Error ? error.message : 'The state change was not saved.')
    } finally {
      setSaving(false)
    }
  }

  if (!supabase) return <SetupCard />
  if (loading && !session && !slice) return <div className="boot">Opening your field guide…</div>
  if (!session && !designPreview) return <Login onSubmit={requestMagicLink} message={message} />

  const daysToAtlanta = Math.max(0, Math.ceil((new Date('2026-11-13T00:00:00-08:00').getTime() - Date.now()) / 86_400_000))
  const lastChecked = slice ? new Date(slice.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'not yet'
  const openDestination = (name: string, next?: Surface) => {
    setMobileNavMenu(null)
    if (next) {
      if (next !== surface) setPreviousSurface(surface)
      setSurface(next)
      setNavNotice('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setNavNotice(`${name} is mapped into the shell; its working surface comes in a later review tranche.`)
  }
  const goBack = () => {
    if (!previousSurface) return
    const destination = previousSurface
    setPreviousSurface(surface)
    setSurface(destination)
    setNavNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openObjectDetail = (detail: ObjectDetail) => setObjectDetail(detail)
  const closeObjectDetail = () => setObjectDetail(null)
  const setAlertReviewState = (id: string, state: AlertReviewState) => setAlertReview(current => ({ ...current, [id]: state }))
  const navigateFromObjectDetail = (destination: Surface) => {
    closeObjectDetail()
    openDestination(surfaceTitle(destination), destination)
  }

  return <div className="app-shell">
    <aside className="rail">
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
        <button className={['trip', 'notes', 'activity'].includes(surface) ? 'active' : ''} type="button" aria-expanded={mobileNavMenu === 'more'} onClick={() => setMobileNavMenu(menu => menu === 'more' ? null : 'more')}><span className="more-dots" aria-hidden="true">•••</span>More</button>
      </nav>
      <button className={`activity-link ${surface === 'activity' ? 'active' : ''}`} type="button" onClick={() => openDestination('Activity', 'activity')}><span aria-hidden="true"><NavIcon name="activity" /></span>Activity</button>
    </aside>

    {mobileNavMenu && <div className="mobile-nav-drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setMobileNavMenu(null) }}>
      <section className="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label={mobileNavMenu === 'events' ? 'Event destinations' : 'More destinations'}>
        <header><span className="eyebrow">{mobileNavMenu === 'events' ? 'EVENTS' : 'MORE'}</span><button type="button" onClick={() => setMobileNavMenu(null)} aria-label="Close navigation drawer">×</button></header>
        <div>
          {(mobileNavMenu === 'events' ? [
            { name: 'Explore', note: 'Discover', icon: 'explore' as NavIconName, surface: 'explore' as Surface },
            { name: 'Plan', note: 'Compare', icon: 'plan' as NavIconName, surface: 'plan' as Surface },
            { name: 'Calendar', note: 'Agenda', icon: 'calendar' as NavIconName, surface: 'calendar' as Surface },
          ] : [
            { name: 'Trip', note: 'Hotels & flights', icon: 'trip' as NavIconName, surface: 'trip' as Surface },
            { name: 'Notes', note: 'In context', icon: 'notes' as NavIconName, surface: 'notes' as Surface },
            { name: 'Activity', note: 'Signals & changes', icon: 'activity' as NavIconName, surface: 'activity' as Surface },
          ]).map(destination => <button key={destination.surface} type="button" className={surface === destination.surface ? 'active' : ''} aria-current={surface === destination.surface ? 'page' : undefined} onClick={() => openDestination(destination.name, destination.surface)}>
            <span aria-hidden="true"><NavIcon name={destination.icon} /></span><strong>{destination.name}</strong><small>{destination.note}</small><b aria-hidden="true">›</b>
          </button>)}
        </div>
      </section>
    </div>}

    <main>
      <header className="hero">
        <div>
          <div className="hero-context"><button className="back-caret" type="button" onClick={goBack} disabled={!previousSurface} aria-label="Back to previous view">‹</button><span className="kicker">{surfaceLabel(surface)}</span></div>
          <h1>{surfaceTitle(surface)}</h1>
          <p>{surfaceSubtitle(surface)}</p>
        </div>
        <div className="header-status">
          {designPreview && <span className="preview-label">Design preview · local only</span>}
          <div className="header-actions">
            <AccountMenu email={session?.user.email ?? 'kavigrace@gmail.com'} online={Boolean(session) && online} preview={designPreview} />
            <span className="countdown-chip"><strong>{surface === 'home' ? daysToAtlanta : 'ATL'}</strong><span>{surface === 'home' ? 'days to Atlanta' : designPreview ? 'preview' : online ? 'online' : 'offline'}</span></span>
          </div>
        </div>
      </header>

      {(message || navNotice) && <p role="status" className={message ? 'alert' : 'nav-notice'}>{message || navNotice}</p>}
      {!slice ? <section className="panel empty"><h2>No saved Black Lotus view</h2><p>{online ? 'Refresh the canonical source slice.' : 'Reconnect once to save the critical view for offline reading.'}</p><button onClick={() => void refresh()} disabled={!online || loading}>Refresh</button></section> : <>
        {surface === 'home' && <HomeSurface slice={slice} alerts={monitorAlerts} alertReview={alertReview} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenObject={openObjectDetail} onOpenActivity={() => openDestination('Activity', 'activity')} />}
        {surface === 'calendar' && <CalendarSurface slice={slice} onOpenPlan={() => openDestination('Plan', 'plan')} onOpenTrip={() => openDestination('Trip', 'trip')} onChangeState={state => void changeState(state)} online={online} saving={saving} />}
        {surface === 'explore' && <ExploreSurface onOpenPlan={() => openDestination('Plan', 'plan')} onOpenObject={openObjectDetail} />}
        {surface === 'map' && <MapSurface onOpenTrip={() => openDestination('Trip', 'trip')} />}
        {surface === 'wallet' && <WalletSurface onOpenObject={openObjectDetail} />}
        {surface === 'trip' && <TripSurface onOpenObject={openObjectDetail} />}
        {surface === 'notes' && <NotesSurface onOpenObject={openObjectDetail} />}
        {surface === 'plan' && <><div className="plan-bracket-note"><span>V1.5 STUDY</span><p>Preserved as design evidence. Production planning waits for representative ticketed-play data.</p></div><section className="now-card" data-state={slice.decision.planning_state}>
          <div className="lotus-mark" aria-hidden="true">✦</div>
          <div className="event-copy">
            <div className="chips"><span className="chip lotus">Black Lotus</span><span className="chip published">{slice.occurrence.occurrence_state}</span></div>
            <h2>{slice.occurrence.title}</h2>
            <div className="event-facts">
              <span><b>◷</b>{formatOccurrenceTime(slice)}</span>
              <span><b>⌖</b>{slice.occurrence.location_state === 'to_be_announced' ? 'Location to be announced' : slice.occurrence.location_label}</span>
              <span><b>♙</b>{slice.occurrence.preparation_note}</span>
            </div>
            <p className="intelligence"><span aria-hidden="true">✧</span> Distinctive shared event and included with Black Lotus; keep the afternoon visible while ticketed play develops.</p>
          </div>
          <div className="state-panel" aria-label="Planning state">
            {states.map(state => <button
              key={state.value}
              type="button"
              aria-pressed={slice.decision.planning_state === state.value}
              disabled={!online || saving}
              onClick={() => void changeState(state.value)}
            ><b>{state.symbol}</b><span>{state.label}</span></button>)}
          </div>
          <div className="plan-effect">
            <span className="effect-icon" aria-hidden="true">▦</span>
            <div><span>PLAN EFFECT</span><strong>{slice.itinerary.active ? 'Saturday · 11:30 AM–3:00 PM' : 'Removed from active Plan'}</strong><p>{slice.decision.planning_state === 'interested' ? 'Quietly retained as an option; it does not block another event.' : slice.decision.planning_state === 'tentative' ? 'A real contender, ready for overlap comparison.' : slice.decision.planning_state === 'committed' ? 'Fixed commitment; overlapping fixed commitments become conflicts.' : 'No active planning state.'}</p></div>
          </div>
          {!online && <div className="offline-lock">Read-only offline · reconnect to change state</div>}
        </section></>}

        {surface === 'activity' && <ActivitySurface slice={slice} alerts={monitorAlerts} alertReview={alertReview} onReviewChange={setAlertReviewState} onOpenObject={openObjectDetail} />}
      </>}

      <footer><span>MagicCon Atlanta Companion</span><span>Last checked {lastChecked}</span></footer>
    </main>
    <ObjectDetailLayer detail={objectDetail} onClose={closeObjectDetail} onNavigate={navigateFromObjectDetail} />
  </div>
}

type ForecastId = 'ticketed-play' | 'artists' | 'black-lotus-store' | 'show-catalog'
type CalendarDetail = ForecastId | 'arrival' | 'preview' | 'friday' | 'event' | 'airport' | 'sunday'

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
  return {
    id: `alert-${alert.id}`,
    kind: 'alert',
    eyebrow: `${alert.kind} · ${alert.severity}`,
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
    actions: [{ label: `Open ${alert.destination}`, destination }],
    backlinks: [{ label: 'Activity', destination: 'activity' }],
  }
}

function exploreEventToObjectDetail(event: ExploreEvent): ObjectDetail {
  return {
    id: `explore-${event.id}`,
    kind: 'event',
    eyebrow: `${event.kind} · ${event.state === 'none' ? 'unmarked' : event.state}`,
    title: event.title,
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
    actions: [{ label: 'View Plan study', destination: 'plan' }, { label: 'Back to Explore', destination: 'explore' }],
    backlinks: [{ label: 'Explore', destination: 'explore' }],
  }
}

function noteToObjectDetail(note: ContextNote): ObjectDetail {
  return {
    id: `note-${note.id}`,
    kind: 'note',
    eyebrow: note.context,
    title: note.title,
    summary: note.body,
    facts: [{ label: 'Updated', value: note.updatedAt }, { label: 'Backlink', value: note.backlink }],
    note: 'V1.5 should let this open the exact object where the note was written, not merely the parent tab.',
    backlinks: [{ label: note.backlink, destination: note.backlink.toLowerCase() as Surface }, { label: 'Notes', destination: 'notes' }],
  }
}

function ObjectDetailLayer({ detail, onClose, onNavigate }: { detail: ObjectDetail | null; onClose: () => void; onNavigate: (destination: Surface) => void }) {
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
      {detail.facts && <section className="object-detail-section">
        <h3>Key facts</h3>
        <div className="object-fact-grid">{detail.facts.map(fact => <div key={fact.label} className="object-fact"><span>{fact.label}</span><strong>{fact.value}</strong></div>)}</div>
      </section>}
      {detail.rationale && <section className="object-detail-section">
        <h3>Why it matters</h3>
        <p>{detail.rationale}</p>
      </section>}
      {detail.note && <section className="object-detail-section object-note-section">
        <h3>Note / next action</h3>
        <p>{detail.note}</p>
      </section>}
      {detail.source && <section className="object-detail-section">
        <h3>Source / provenance</h3>
        <p><strong>{detail.source.label}</strong><br />{detail.source.value}</p>
      </section>}
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
    hotel: 'Place',
    note: 'Note',
  }
  return labels[kind]
}
type CalendarFilter = 'all' | 'convention' | 'travel'
type ExploreMode = 'for-you' | 'all' | 'changed' | 'hidden'
type ExploreType = 'all' | 'play' | 'info' | 'social' | 'other'
type ExploreState = 'none' | 'interested' | 'tentative' | 'hidden' | 'nope'
type ComplexityLevel = 'easy' | 'focused' | 'demanding' | 'very-hard' | 'unknown' | 'inconclusive'
type ActionIconName = 'bookmark' | 'diamond' | 'eyeOff' | 'thumbsDown'
type EventKindIconName = 'lotus' | 'panel' | 'competitive' | 'ticketed'
type MilestoneIconName = 'badges' | 'ticketed-play' | 'artists' | 'black-lotus-store' | 'show-catalog'
type WalletTab = 'home' | 'play' | 'store' | 'other'
type AlertKind = 'site' | 'email' | 'newsletter' | 'manual'
type AlertSeverity = 'hot' | 'notice' | 'quiet'
type AlertReviewState = 'needs-review' | 'reviewed' | 'archived'
type ActivityStream = 'needs-review' | 'changes' | 'sources' | 'personal' | 'archived'
type ObjectDetailKind = 'event' | 'alert' | 'receipt' | 'hotel' | 'note'
type ObjectDetail = {
  id: string
  kind: ObjectDetailKind
  eyebrow: string
  title: string
  summary: string
  facts?: Array<{ label: string; value: string }>
  source?: { label: string; value: string }
  rationale?: string
  actions?: Array<{ label: string; destination?: Surface }>
  note?: string
  backlinks?: Array<{ label: string; destination: Surface }>
}
type MonitoringAlert = {
  id: string
  kind: AlertKind
  severity: AlertSeverity
  destination: 'Home' | 'Activity' | 'Wallet' | 'Trip' | 'Explore' | 'Calendar' | 'Map' | 'Notes'
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

function isMonitoringAlert(value: unknown): value is MonitoringAlert {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Record<keyof MonitoringAlert, unknown>>
  return typeof candidate.id === 'string'
    && ['site', 'email', 'newsletter', 'manual'].includes(String(candidate.kind))
    && ['hot', 'notice', 'quiet'].includes(String(candidate.severity))
    && ['Home', 'Activity', 'Wallet', 'Trip', 'Explore', 'Calendar', 'Map', 'Notes'].includes(String(candidate.destination))
    && typeof candidate.title === 'string'
    && typeof candidate.summary === 'string'
    && typeof candidate.source === 'string'
    && typeof candidate.checkedAt === 'string'
}
type ContextNote = {
  id: string
  context: string
  title: string
  body: string
  updatedAt: string
  backlink: string
}
type ExploreEvent = {
  id: string
  title: string
  day: 'Fri' | 'Sat' | 'Sun'
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
    title: 'Ticketed play announcement would open planning mode',
    summary: 'Representative newsletter/site discovery: when ticketed play goes live, Home should announce it and Explore becomes the triage lane.',
    object: 'Milestone · Ticketed play',
    source: 'MagicCon news + ticketed-play page',
    checkedAt: 'Aug 4, 8:28 AM',
    status: 'watch route ready',
    rationale: 'This is the highest-value quiet-period signal because ticketed play changes the app from watch mode into planning mode.',
    nextAction: 'If observed live, show on Home, add a Calendar milestone, and open Explore with Play selected.',
  },
  {
    id: 'black-lotus-page-change',
    kind: 'site',
    severity: 'hot',
    destination: 'Home',
    attention: 'Watched-page change',
    title: 'Black Lotus page change lands as a high-signal item',
    summary: 'Representative official-page discovery: a change to the Black Lotus VIP page should preserve the new wording and link back to the affected BL object.',
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
    summary: 'No Atlanta-specific artist, store, or ticketed-play post was detected in the representative watch set.',
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
    summary: 'Representative Gmail discovery: receipt artifacts should preserve the original and extract line items without becoming a Home alert.',
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
    summary: 'Representative Delta discovery: a changed flight time annotates the flight object and Calendar; only meaningful disruption reaches Home.',
    object: 'Trip · Flights · HOGFBX',
    source: 'Gmail · Delta',
    checkedAt: 'Aug 4, 8:31 AM',
    status: 'route ready',
    rationale: 'Trip should be a pleasant reference and change surface, not a booking.com cosplay incident.',
    nextAction: 'If departure/arrival changes, update Trip and Calendar; escalate to Home only if it affects lodging, event arrival, or airport departure timing.',
  },
  {
    id: 'artist-list-route',
    kind: 'site',
    severity: 'notice',
    destination: 'Explore',
    attention: 'Opportunity discovery',
    title: 'Artist list appears as an Explore opportunity',
    summary: 'Representative official-page discovery: first artist directory should surface as a milestone and then become browsable by artist/card/signature usefulness.',
    object: 'Explore · Artists',
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
    summary: 'Representative map discovery: official 2026 floor artifacts should attach to Map and become useful through room, booth, vendor, Wallet, and event backlinks.',
    object: 'Map · Event map',
    source: 'MagicCon map page',
    checkedAt: 'Aug 4, 8:33 AM',
    status: 'future route',
    rationale: 'The map is valuable when it helps answer “where do I go next?” rather than simply reproducing a giant image.',
    nextAction: 'Keep first official map as a Home signal; put detailed extraction and OCR candidates in Map/Activity for review.',
  },
]

const contextNotes: ContextNote[] = [
  {
    id: 'luggage-thursday',
    context: 'Trip · Omni',
    title: 'Thursday luggage handoff',
    body: 'Kavi and Chris are at Black Lotus First Look before Omni check-in. Decide whether Juan can handle bags or whether we stash luggage first.',
    updatedAt: 'Aug 4',
    backlink: 'Trip',
  },
  {
    id: 'wallet-store-assignment',
    context: 'Wallet · Store receipt',
    title: 'Store receipt assignments',
    body: 'Use quick K/J/C chips for known people; custom names stay as plain text because they are not app people.',
    updatedAt: 'Aug 4',
    backlink: 'Wallet',
  },
  {
    id: 'bl-planechase',
    context: 'Plan · Black Lotus',
    title: 'Planechase reference',
    body: 'Likely to be something I check repeatedly before the event; keep this easy to find even before ticketed play appears.',
    updatedAt: 'Aug 3',
    backlink: 'Plan',
  },
]

const milestoneForecasts: Array<{ id: ForecastId; icon: MilestoneIconName; title: string; window: string; calendarDate: string; month: 'AUG' | 'OCT'; confidence: string; rationale: string }> = [
  {
    id: 'ticketed-play', icon: 'ticketed-play', title: 'Ticketed play', window: 'Aug 18–25', calendarDate: '18–25', month: 'AUG', confidence: 'best guess',
    rationale: 'Vegas 2026 opened ticketed play about 11½ weeks before its convention. Applying that offset to Atlanta points to Aug 18–25. This is a historical forecast, not an Atlanta date.',
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

const exploreEvents: ExploreEvent[] = [
  {
    id: 'commander-cocktails',
    title: 'Commander & Cocktails',
    day: 'Fri',
    time: '5 PM anchor',
    window: 'Flexible league',
    price: '$60',
    kind: 'Ticketed play',
    type: 'social',
    format: 'Commander league',
    tags: ['social', 'flexible', 'past favorite'],
    state: 'interested',
    availability: 'open',
    complexity: 'easy',
    complexityWhy: 'Loose league structure lowers schedule pressure; commander politics matter more than tournament precision.',
    fit: 'Strong fit: social, flexible, and already known to be your kind of event.',
    detail: 'Useful as a weekend-long texture event. Keep it visible, but do not let the listed time block a stronger fixed event.',
    formatHelp: 'A league is a flexible participation structure: the listed time is an anchor, while games may be played elsewhere in the weekend window.',
    decisionFacts: [
      { label: 'Structure', value: 'Flexible league' },
      { label: 'Prep', value: 'Bring a Commander deck' },
      { label: 'Best for', value: 'Social, lower-pressure play' },
    ],
    moreDetails: [
      { label: 'Scheduling', value: 'The Leap time may need to be moved before another overlapping event can be purchased.' },
      { label: 'Operational', value: 'Registration and Companion instructions stay available here when the Atlanta listing is published.' },
    ],
    sourceNote: 'Representative Vegas structure; not an announced Atlanta event.',
    planEffect: 'Promoting it keeps the 5 PM anchor visible without creating a hard conflict.',
  },
  {
    id: 'planar-sealed',
    title: 'Deluxe Planar Sealed - Strixhaven',
    day: 'Fri',
    time: '1-5 PM',
    window: '4 hours',
    price: '$80',
    kind: 'Ticketed play',
    type: 'play',
    format: 'Planar sealed',
    tags: ['novel', 'long', 'nonrefundable'],
    state: 'tentative',
    availability: 'open',
    complexity: 'demanding',
    complexityWhy: 'Sealed deckbuilding plus plane-based novelty creates real mental load; not a qualifier, but it asks for focus.',
    fit: 'Potentially interesting because it is weird; the cost and four-hour block make the commitment meaningful.',
    detail: 'Build from a supplied mixed-booster pool, then play three Swiss rounds. The planar twist adds novelty and more board-state tracking than ordinary Sealed.',
    formatHelp: 'Sealed means building a 40-card deck from product opened at the event. “Planar” adds Planechase-style shared effects, so the rules and board state change during play.',
    decisionFacts: [
      { label: 'Structure', value: '3 Swiss rounds' },
      { label: 'Play window', value: 'About 4–5 hours' },
      { label: 'Supplies', value: 'Pool provided; lands available' },
      { label: 'Prize tix', value: '1,300 win · 600 loss', icon: 'ticket' },
    ],
    moreDetails: [
      { label: 'Product', value: 'Six boosters across Draft, Play, and Collector products in the representative listing.' },
      { label: 'Registration', value: 'Companion code and account instructions belong here rather than in the decision summary.' },
    ],
    sourceNote: 'Representative MagicCon Vegas listing supplied for design; Atlanta details may differ.',
    planEffect: 'Tentative placement would compete with the Black Lotus anchor and a 3 PM loose event.',
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
    id: 'designing-unknown',
    title: 'Designing Unknown with Gavin',
    day: 'Fri',
    time: '3-5 PM',
    window: '2 hours',
    price: 'free',
    kind: 'Panel',
    type: 'info',
    format: 'Design panel',
    tags: ['guest', 'low risk'],
    state: 'none',
    availability: 'open',
    complexity: 'inconclusive',
    complexityWhy: 'Assessment attempted, but this is not a play format; decision value comes from guest relevance and schedule fit.',
    fit: 'Low financial risk and easy to leave, but less distinctive than your strongest contenders.',
    detail: 'A good candidate for opportunistic attendance if the nearby plan has a fuzzy tail.',
    formatHelp: 'A panel is informational rather than a play event. Complexity is intentionally not inferred from a game format.',
    decisionFacts: [
      { label: 'Structure', value: 'Two-hour panel' },
      { label: 'Cost', value: 'Free' },
      { label: 'Exit flexibility', value: 'Easy to leave early' },
    ],
    moreDetails: [
      { label: 'Guest context', value: 'Speaker background and topic detail will be added when the Atlanta listing supplies them.' },
    ],
    sourceNote: 'Representative event used to test mixed play and information listings.',
    planEffect: 'Interested would place a soft visual block after Planar Sealed without treating it like a paid lock.',
  },
  {
    id: 'rcq',
    title: 'Regional Championship Qualifier',
    day: 'Sun',
    time: '9 AM-5 PM',
    window: 'All day',
    price: '$75',
    kind: 'Competitive',
    type: 'play',
    format: 'Qualifier',
    tags: ['competitive', 'decklist', 'cut to top 8'],
    state: 'nope',
    availability: 'open',
    complexity: 'very-hard',
    complexityWhy: 'Qualifier stakes, long play window, expected preparation, and competitive opponent pool make this a personal mismatch.',
    fit: 'Probably not for you: high stakes and high prep load.',
    detail: 'This belongs in the emphatic no drawer unless a specific friend/social reason changes the calculus.',
    planEffect: 'No Plan placement. Keep recoverable but out of the normal browsing field.',
  },
  {
    id: 'precon-battle',
    title: 'Commander Precon Battle',
    day: 'Sat',
    time: '10 AM-noon',
    window: '2 hours',
    price: '$95',
    kind: 'Ticketed play',
    type: 'play',
    format: 'Precon',
    tags: ['open and play', 'low prep'],
    state: 'hidden',
    availability: 'open',
    complexity: 'easy',
    complexityWhy: 'A supplied preconstructed deck makes this open-and-play. Hidden because you usually already have the deck experience.',
    fit: 'Easy, but likely not worth paying for unless the product or friends make it special.',
    detail: 'Recoverable clutter: simple and beginner-friendly, but not a strong owner-centered recommendation.',
    planEffect: 'Hidden events do not enter Plan unless restored.',
  },
]

function ExploreSurface({ onOpenPlan, onOpenObject }: { onOpenPlan: () => void; onOpenObject: (detail: ObjectDetail) => void }) {
  const [events, setEvents] = useState(exploreEvents)
  const [mode, setMode] = useState<ExploreMode>('for-you')
  const [day, setDay] = useState<'all' | ExploreEvent['day']>('all')
  const [eventType, setEventType] = useState<ExploreType>('all')
  const [selectedId, setSelectedId] = useState(exploreEvents[0].id)
  const [detailOpen, setDetailOpen] = useState(false)
  const [hiddenExpanded, setHiddenExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const selected = events.find(event => event.id === selectedId) ?? events[0]
  const matchesSearchAndDay = (event: ExploreEvent) => {
    const matchesDay = day === 'all' || event.day === day
    const matchesType = eventType === 'all' || event.type === eventType
    const text = `${event.title} ${event.format} ${event.kind} ${event.tags.join(' ')}`.toLowerCase()
    return matchesDay && matchesType && (!query.trim() || text.includes(query.trim().toLowerCase()))
  }
  const visible = events.filter(event => {
    const matchesMode = mode === 'hidden'
      ? event.state === 'hidden' || event.state === 'nope'
      : mode === 'changed'
        ? event.availability === 'changed' || event.availability === 'sold-out'
        : mode === 'for-you'
          ? event.state !== 'hidden' && event.state !== 'nope'
          : true
    return matchesMode && matchesSearchAndDay(event)
  })
  const hiddenCount = events.filter(event => event.state === 'hidden' || event.state === 'nope').length
  const hiddenMatches = events.filter(event => (event.state === 'hidden' || event.state === 'nope') && matchesSearchAndDay(event))

  const updateEvent = (id: string, state: ExploreState) => {
    setEvents(current => current.map(event => event.id === id ? { ...event, state: event.state === state ? 'none' : state } : event))
    setSelectedId(id)
    setDetailOpen(true)
  }

  return <section className="explore-surface">
    <div className="explore-toolbar">
      <label className="explore-search"><span aria-hidden="true">⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find event, format, guest" /></label>
      <div className="explore-days" aria-label="Event days">
        {(['all', 'Fri', 'Sat', 'Sun'] as const).map(value => <button key={value} type="button" className={day === value ? 'active' : ''} onClick={() => setDay(value)}>{value === 'all' ? 'All days' : value}</button>)}
      </div>
    </div>

    <div className="explore-list-head">
      <div className="explore-list-filters">
        <div className="explore-tabs" aria-label="Explore views">
          {([
            ['for-you', 'For you'],
            ['all', 'All'],
            ['changed', 'Changed'],
            ['hidden', hiddenCount ? `Hidden ${hiddenCount}` : 'Hidden'],
          ] as const).map(([value, label]) => <button key={value} type="button" className={mode === value ? 'active' : ''} onClick={() => setMode(value)} aria-label={value === 'hidden' ? label : undefined} title={value === 'hidden' ? label : undefined}>{value === 'hidden' ? <EyeOffMini /> : label}</button>)}
        </div>
        <div className="explore-type-tabs" aria-label="Event types">
          {([
            ['all', 'All types'],
            ['play', 'Play'],
            ['info', 'Info'],
            ['social', 'Social'],
            ['other', 'Other'],
          ] as const).map(([value, label]) => <button key={value} type="button" className={eventType === value ? 'active' : ''} onClick={() => setEventType(current => current === value && value !== 'all' ? 'all' : value)}>{label}</button>)}
        </div>
      </div>
    </div>

    <div className="explore-layout">
      <div className="event-list" aria-label="Representative event results">
        <div className="event-list-summary"><strong>{visible.length}</strong><span>shown from 127-event fixture</span></div>
        {visible.map(event => <ExploreEventRow key={event.id} event={event} selected={selected.id === event.id} onSelect={() => { setSelectedId(event.id); setDetailOpen(true) }} onState={state => updateEvent(event.id, state)} />)}
        {visible.length === 0 && <div className="event-empty">Nothing in this slice. Try All or clear search.</div>}
        {mode !== 'hidden' && hiddenCount > 0 && <section className={`hidden-drawer ${hiddenExpanded ? 'expanded' : ''}`} aria-label="Hidden and not-for-me events">
          <button type="button" className="hidden-toggle" onClick={() => setHiddenExpanded(value => !value)}>
            <span><EyeOffMini /> Hidden / not for me</span>
            <small>{hiddenMatches.length} matching · recoverable</small>
            <b aria-hidden="true">⌄</b>
          </button>
          {hiddenExpanded && <div className="hidden-drawer-list">
            {hiddenMatches.map(event => <ExploreEventRow key={event.id} event={event} selected={selected.id === event.id} onSelect={() => { setSelectedId(event.id); setDetailOpen(true) }} onState={state => updateEvent(event.id, state)} />)}
          </div>}
        </section>}
      </div>

      <ExploreDetail event={selected} open={detailOpen} onClose={() => setDetailOpen(false)} onState={state => updateEvent(selected.id, state)} onOpenPlan={onOpenPlan} onOpenObject={onOpenObject} />
    </div>
  </section>
}

function ExploreEventRow({ event, selected, onSelect, onState }: { event: ExploreEvent; selected: boolean; onSelect: () => void; onState: (state: ExploreState) => void }) {
  const kindIcon: EventKindIconName = event.kind === 'Black Lotus' ? 'lotus' : event.kind === 'Panel' ? 'panel' : event.kind === 'Competitive' ? 'competitive' : 'ticketed'
  const priceTone = getPriceTone(event.price)
  return <article className={`explore-event ${selected ? 'selected' : ''} state-${event.state} type-${event.type} complexity-${event.complexity}`} data-availability={event.availability}>
    <button className="explore-event-main" type="button" onClick={onSelect}>
      <span className="event-type-icon" aria-hidden="true"><EventKindIcon name={kindIcon} /></span>
      <span className="event-title-block">
        <strong>{event.title}</strong>
        <small>{event.day} · {event.time}</small>
      </span>
      <span className="event-scan">
        <ComplexityPill level={event.complexity} />
        <span className={`event-price price-${priceTone}`}>{formatEventPrice(event.price)}</span>
      </span>
    </button>
    <div className="explore-event-meta">
      <span>{event.format}</span>
      {event.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}
    </div>
    <p>{event.fit}</p>
    <div className="explore-actions" aria-label={`${event.title} actions`}>
      <IconAction label="Interested" icon="bookmark" pressed={event.state === 'interested'} onClick={() => onState('interested')} />
      <IconAction label="Tentative" icon="diamond" pressed={event.state === 'tentative'} onClick={() => onState('tentative')} />
      <IconAction label="Hide from this list" icon="eyeOff" pressed={event.state === 'hidden'} onClick={() => onState('hidden')} />
      <IconAction label="Not for me" icon="thumbsDown" pressed={event.state === 'nope'} danger onClick={() => onState('nope')} />
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

function ExploreDetail({ event, open, onClose, onState, onOpenPlan, onOpenObject }: { event: ExploreEvent; open: boolean; onClose: () => void; onState: (state: ExploreState) => void; onOpenPlan: () => void; onOpenObject: (detail: ObjectDetail) => void }) {
  const planEnabled = event.state === 'interested' || event.state === 'tentative'
  return <aside className="explore-detail" data-open={open} aria-label={`${event.title} detail`}>
    <button className="detail-close explore-close" type="button" onClick={onClose} aria-label="Close event detail">×</button>
    <header className="detail-title-group">
      <div className="detail-head">
        <span className={`detail-kind ${event.kind === 'Black Lotus' ? 'lotus' : ''}`}>{event.kind}</span>
        <span className={`availability ${event.availability}`}>{event.availability.replace('-', ' ')}</span>
      </div>
      <h2>{event.title}</h2>
      <div className="detail-facts">
        <span><DetailFactIcon name="time" />{event.day} · {event.time}</span>
        <span><DetailFactIcon name="price" />{event.price}</span>
        <span><DetailFactIcon name="duration" />{event.window}</span>
      </div>
    </header>
    <div className="detail-intel"><span aria-hidden="true">✧</span><p>{event.fit}</p></div>
    <section className="detail-section decision-section">
      <div className="format-heading"><strong>{event.format}</strong>{event.formatHelp && <details className="format-help"><summary aria-label={`Explain ${event.format}`}>?</summary><p>{event.formatHelp}</p></details>}</div>
      <p>{event.detail}</p>
      {event.decisionFacts && <div className="decision-facts" aria-label="Event at a glance">{event.decisionFacts.map(fact => <div key={fact.label}><span>{fact.icon === 'ticket' && <TicketMiniIcon />}{fact.label}</span><strong>{fact.value}</strong></div>)}</div>}
      <p className="complexity-note"><span aria-hidden="true"><FlameGlyph /> Assessment:</span> {event.complexityWhy}</p>
    </section>
    <section className="detail-section plan-summary">
      <strong>Plan effect</strong>
      <p>{event.planEffect}</p>
    </section>
    {(event.moreDetails || event.sourceNote) && <details className="detail-more">
      <summary><span>More details</span><small>Official and operational</small></summary>
      <div className="detail-more-body">
        {event.moreDetails?.map(item => <div className="more-row" key={item.label}><span>{item.label}</span><p>{item.value}</p></div>)}
        {event.sourceNote && <div className="more-row source-row"><span>Source</span><p>{event.sourceNote}</p></div>}
      </div>
    </details>}
    <footer className="detail-footer">
      <div className="detail-actions">
        <IconAction label="Interested" icon="bookmark" pressed={event.state === 'interested'} onClick={() => onState('interested')} />
        <IconAction label="Tentative" icon="diamond" pressed={event.state === 'tentative'} onClick={() => onState('tentative')} />
        <IconAction label="Hide from this list" icon="eyeOff" pressed={event.state === 'hidden'} onClick={() => onState('hidden')} />
        <IconAction label="Not for me" icon="thumbsDown" pressed={event.state === 'nope'} danger onClick={() => onState('nope')} />
      </div>
      <button className="detail-plan-link secondary-detail-link" type="button" onClick={() => onOpenObject(exploreEventToObjectDetail(event))}>Open object detail <span aria-hidden="true">›</span></button>
      <button className="detail-plan-link" type="button" disabled={!planEnabled} onClick={onOpenPlan}>View Plan study <span aria-hidden="true">›</span></button>
    </footer>
  </aside>
}

function DetailFactIcon({ name }: { name: 'time' | 'price' | 'duration' }) {
  const paths = {
    time: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3.2 2" /></>,
    price: <><circle cx="12" cy="12" r="8.5" /><path d="M15 8.7c-.7-.8-1.7-1.2-3-1.2-1.7 0-2.8.8-2.8 2s1.1 1.8 2.8 2.2 2.8.8 2.8 2.2-1.1 2.1-2.8 2.1c-1.4 0-2.6-.5-3.3-1.4M12 5.8v12.4" /></>,
    duration: <><path d="M7 4h10M7 20h10M8 4c0 4 1.7 5.3 4 7 2.3-1.7 4-3 4-7M8 20c0-4 1.7-5.3 4-7 2.3 1.7 4 3 4 7" /></>,
  }
  return <svg className="detail-fact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function TicketMiniIcon() {
  return <svg className="ticket-mini-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8a2 2 0 0 0 2-2h12a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H6a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M12 7v2M12 11v2M12 15v2" /></svg>
}

function IconAction({ label, icon, pressed, danger, onClick }: { label: string; icon: ActionIconName; pressed: boolean; danger?: boolean; onClick: () => void }) {
  return <button className={danger ? 'danger' : ''} type="button" aria-label={label} aria-pressed={pressed} title={label} onClick={onClick}><ActionIcon name={icon} /></button>
}

function ActionIcon({ name }: { name: ActionIconName }) {
  const paths: Record<ActionIconName, ReactNode> = {
    bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v16l-6-3.4L6 21V5a1 1 0 0 1 1-1Z" />,
    diamond: <path d="M12 3 21 12 12 21 3 12Z" />,
    eyeOff: <><path d="M3 3l18 18" /><path d="M9.8 9.8A3 3 0 0 0 14.2 14.2" /><path d="M6.5 6.9C4.7 8 3.2 9.7 2 12c2.2 4.1 5.5 6.1 10 6.1 1.4 0 2.7-.2 3.8-.7" /><path d="M10.8 5.9c.4 0 .8-.1 1.2-.1 4.5 0 7.8 2 10 6.1-.5 1-1.1 1.9-1.8 2.7" /></>,
    thumbsDown: <><path d="M10 14v5a2 2 0 0 0 2 2l4-7" /><path d="M18 13V4H7.4a2 2 0 0 0-1.9 1.4L3 12a2 2 0 0 0 1.9 2.6H8" /><path d="M18 4h3v9h-3" /></>,
  }
  return <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function EventKindIcon({ name }: { name: EventKindIconName }) {
  const paths: Record<EventKindIconName, ReactNode> = {
    lotus: <><path d="M12 4c1.9 2 2.8 4.1 2.7 6.3 2.1-.9 4.2-.9 6.3.1-1.7 3.8-4.6 5.9-8.7 6.1h-.6c-4.1-.2-7-2.3-8.7-6.1 2.1-1 4.2-1 6.3-.1C9.2 8.1 10.1 6 12 4Z" /><path d="M12 16.4V20" /></>,
    panel: <><path d="M5 19l3.8-1 9.4-9.4a2.1 2.1 0 0 0-3-3L5.8 15 5 19Z" /><path d="M13.7 6.1l4.2 4.2" /></>,
    competitive: <><path d="M12 3l7.5 4v5.2c0 4.1-2.7 7.2-7.5 8.8-4.8-1.6-7.5-4.7-7.5-8.8V7L12 3Z" /><path d="M12 8v5" /><path d="M12 16h.01" /></>,
    ticketed: <><path d="M4 7.5A2.5 2.5 0 0 0 6.5 5h11A2.5 2.5 0 0 0 20 7.5v9A2.5 2.5 0 0 0 17.5 19h-11A2.5 2.5 0 0 0 4 16.5v-9Z" /><path d="M8 9h8" /><path d="M8 12h8" /><path d="M8 15h5" /></>,
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

function TravelerDots({ people }: { people: Array<'Kavi' | 'Juan' | 'Chris'> }) {
  return <span className="traveler-dots" aria-label={people.join(', ')}>{people.map(person => <span key={person} className={`traveler-dot ${person.toLowerCase()}`} title={person}>{person[0]}</span>)}</span>
}

function MapSurface({ onOpenTrip }: { onOpenTrip: () => void }) {
  return <section className="map-surface" aria-label="Map">
    <article className="map-card trip-area-card">
      <span className="eyebrow">TRIP AREA</span>
      <h2>Hotels and the convention center first.</h2>
      <p>The honest quiet-period map is not a fake show floor. It is the small useful triangle: Courtyard, Omni, and Georgia World Congress Center.</p>
      <div className="area-sketch" aria-label="Simplified Atlanta trip-area sketch">
        <span className="pin courtyard">Courtyard<small>Nov 11</small></span>
        <span className="route-line" />
        <span className="pin gwcc">GWCC<small>MagicCon</small></span>
        <span className="route-line bend" />
        <span className="pin omni">Omni<small>Nov 12-15</small></span>
      </div>
      <button type="button" onClick={onOpenTrip}>Open Trip details ›</button>
    </article>
    <article className="map-card event-map-card">
      <span className="eyebrow">EVENT MAP</span>
      <h2>Waiting for Atlanta 2026 floor evidence.</h2>
      <p>When the official map appears, this becomes the place for room, booth, vendor, artist, Wallet, and event backlinks. Prior Atlanta maps remain inspiration only.</p>
      <ul>
        <li>watch for official floor map publication;</li>
        <li>attach map observations to Activity and Map;</li>
        <li>keep interactive booth routing for v2 unless the evidence is ready.</li>
      </ul>
    </article>
  </section>
}

function WalletSurface({ onOpenObject }: { onOpenObject: (detail: ObjectDetail) => void }) {
  const [tab, setTab] = useState<WalletTab>('home')
  const [tix, setTix] = useState(1700)
  const [modal, setModal] = useState<{ title: string; eyebrow: string; body: ReactNode } | null>(null)
  const openModal = (eyebrow: string, title: string, body: ReactNode) => setModal({ eyebrow, title, body })
  const adjustTix = (delta: number) => setTix(value => Math.max(0, value + delta))

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
    {tab === 'home' && <WalletHomeTab openModal={openModal} onOpenObject={onOpenObject} />}
    {tab === 'play' && <WalletPlayTab openModal={openModal} />}
    {tab === 'store' && <WalletStoreTab openModal={openModal} />}
    {tab === 'other' && <WalletOtherTab openModal={openModal} />}
    {modal && <WalletModal {...modal} onClose={() => setModal(null)} />}
  </section>
}

function WalletModal({ eyebrow, title, body, onClose }: { eyebrow: string; title: string; body: ReactNode; onClose: () => void }) {
  return <aside className="wallet-modal" role="dialog" aria-modal="true" aria-label={title}>
    <button className="detail-close" type="button" onClick={onClose} aria-label="Close Wallet detail">×</button>
    <span className="eyebrow">{eyebrow}</span>
    <h2>{title}</h2>
    <div className="wallet-modal-body">{body}</div>
  </aside>
}

function ProofPreview({ kind, code, note }: { kind: 'qr' | 'receipt' | 'code'; code?: string; note: string }) {
  return <div className={`proof-preview ${kind}`}>
    {kind === 'qr' && <div className="qr-fixture" aria-label="Representative QR placeholder"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>}
    {kind === 'receipt' && <div className="receipt-image-fixture"><span>Original artifact preview</span><i /><i /><i /><strong>PNG now · PDF later</strong></div>}
    {kind === 'code' && <div className="code-fixture"><span>Event code</span><strong>{code ?? 'ABC123'}</strong></div>}
    <p>{note}</p>
  </div>
}

function WalletHomeTab({ openModal, onOpenObject }: { openModal: (eyebrow: string, title: string, body: ReactNode) => void; onOpenObject: (detail: ObjectDetail) => void }) {
  return <div className="wallet-home-command">
    <section className="wallet-hero-card">
      <div className="wallet-hero-copy">
        <div className="wallet-hero-topline">
          <span className="eyebrow">READY TO SHOW</span>
        </div>
        <h2>Proof, ready to show.</h2>
        <p>Badges and original orders stay one tap away.</p>
      </div>
      <div className="wallet-hero-actions">
        <button type="button" className="primary-show" onClick={() => openModal('SHOWABLE PROOF', 'Kavi badge QR', <ProofPreview kind="qr" code="9gLHU3mJ" note="Representative QR surface. The real implementation should show the preserved pass/order QR with minimal chrome." />)}><NavIcon name="wallet" />Show Kavi QR</button>
        <button type="button" onClick={() => openModal('ORIGINAL ORDER', 'Black Lotus order confirmation', <ProofPreview kind="receipt" note="Original emails should be captured as PNG for fast showing, with PDF/source email available one step deeper." />)}>Original order</button>
      </div>
      <div className="wallet-badge-fan" aria-label="Primary badge cards">
        <button type="button" className="mini-pass lotus-pass" onClick={() => openModal('BLACK LOTUS VIP', 'Kavi Grace', <ProofPreview kind="qr" code="9gLHU3mJ" note="Badge proof belongs on Wallet Home because this is the thing most likely to be shown quickly." />)}>
          <span><EventKindIcon name="lotus" /></span>
          <strong>Kavi</strong>
          <small>Black Lotus</small>
        </button>
        <button type="button" className="mini-pass lotus-pass" onClick={() => openModal('BLACK LOTUS VIP', 'Chris Tom', <ProofPreview kind="qr" code="9gLHU3mJ" note="Chris is represented here for owner-managed context; this is not multi-user account behavior." />)}>
          <span><EventKindIcon name="lotus" /></span>
          <strong>Chris</strong>
          <small>Black Lotus</small>
        </button>
        <button type="button" className="mini-pass premium-pass" onClick={() => openModal('PREMIUM WEEKEND', 'Juan Pereyra', <ProofPreview kind="qr" code="h7paadIU" note="Juan's badge proof remains handy from Home, with the full order receipt filed under Other." />)}>
          <span><NavIcon name="wallet" /></span>
          <strong>Juan</strong>
          <small>Premium</small>
        </button>
      </div>
    </section>

    <section className="wallet-quick-grid" aria-label="Wallet quick checks">
      <button type="button" className="quick-proof black-lotus-proof" onClick={() => openModal('BADGE ORDER', 'Black Lotus order', <ProofPreview kind="receipt" note="Two Black Lotus VIP Early Bird badges. Total $2,025.26. QR key 9gLHU3mJ." />)}>
        <span className="wallet-kind"><EventKindIcon name="lotus" />Badge order</span>
        <strong>Black Lotus order</strong>
        <small>Kavi + Chris · QR key saved</small>
      </button>
      <button type="button" className="quick-proof premium-proof" onClick={() => openModal('BADGE ORDER', 'Juan Premium Weekend', <ProofPreview kind="receipt" note="Premium Weekend Early Bird. Total $191.42. QR key h7paadIU." />)}>
        <span className="wallet-kind"><NavIcon name="wallet" />Badge order</span>
        <strong>Juan Premium</strong>
        <small>Forwarded to Juan · original saved</small>
      </button>
      <button type="button" className="quick-proof store-proof" onClick={() => onOpenObject({
        id: 'receipt-39z8',
        kind: 'receipt',
        eyebrow: 'Recent receipt',
        title: 'Magic Con #39Z8',
        summary: 'Representative store receipt: $255, nine items, assignment-ready. This object should eventually hold extracted line items plus exact PNG/PDF proof.',
        facts: [
          { label: 'Total', value: '$255.00' },
          { label: 'Items', value: '9 store items' },
          { label: 'Status', value: 'assignment-ready' },
          { label: 'Artifact', value: 'PNG now · PDF later' },
        ],
        source: { label: 'Gmail receipt', value: 'Receipt from Magic Con #39Z8' },
        rationale: 'Receipts are useful because they answer “what did I buy, who was it for, and can I show the original if needed?” without digging through email.',
        actions: [{ label: 'Open Wallet Store', destination: 'wallet' }, { label: 'Add note', destination: 'notes' }],
        backlinks: [{ label: 'Wallet', destination: 'wallet' }, { label: 'Activity', destination: 'activity' }],
      })}>
        <span className="wallet-kind"><NavIcon name="activity" />Recent receipt</span>
        <strong>Magic Con #39Z8</strong>
        <small>$255 · 9 store items · assignment-ready</small>
      </button>
    </section>

    <aside className="wallet-onsite-strip">
      <span className="eyebrow">ONSITE LOGIC</span>
      <div><b>Need to enter an event?</b><small>Open Play for codes and original ticketed-play receipts.</small></div>
      <div><b>Need pickup proof?</b><small>Open Store or Play depending on what was purchased.</small></div>
      <div><b>Need travel proof?</b><small>Other holds originals; Trip stays pleasant.</small></div>
    </aside>
  </div>
}

function WalletPlayTab({ openModal }: { openModal: (eyebrow: string, title: string, body: ReactNode) => void }) {
  return <div className="wallet-layout">
    <section className="receipt-list" aria-label="Ticketed play receipts">
      <article className="receipt-card future-store">
        <div className="receipt-head"><span className="receipt-icon"><EventKindIcon name="ticketed" /></span><div><span className="eyebrow">TICKETED PLAY</span><h2>No paid play receipts yet</h2><p>This tab wakes up when ticketed events are purchased.</p></div></div>
        <div className="receipt-lines">
          <button type="button" onClick={() => openModal('FUTURE PLAY RECEIPT', 'Event entry receipt', <ProofPreview kind="receipt" note="When ticketed play opens, this row should show the exact purchased-event receipt and line-item proof." />)}><span>Expected later: event entry receipt</span><b>Original</b></button>
          <button type="button" onClick={() => openModal('FUTURE PLAY CODE', 'Companion App code', <ProofPreview kind="code" code="TBD" note="Ticketed-play emails often contain alphanumeric event codes. This should become one-tap show/copy, not buried in email." />)}><span>Expected later: Companion App code</span><b>Code</b></button>
          <button type="button" onClick={() => openModal('FUTURE CLAIM PROOF', 'Included product / pickup proof', <ProofPreview kind="receipt" note="Some play events include products or pickup entitlements; Play should keep those proofs with the event." />)}><span>Expected later: included product / claim proof</span><b>Pickup</b></button>
        </div>
      </article>
      <article className="receipt-card play-fixture">
        <div className="receipt-head"><span className="receipt-icon"><EventKindIcon name="ticketed" /></span><div><span className="eyebrow">REPRESENTATIVE EVENT PROOF</span><h2>Deluxe Planar Sealed</h2><p>Ticketed play receipt pattern · not Atlanta data</p></div><strong>$80</strong></div>
        <div className="receipt-lines">
          <button type="button"><span>Event code for Companion App</span><b>ABC123</b></button>
          <button type="button"><span>Show receipt for included product / pickup</span><b>Proof</b></button>
          <button type="button"><span>Starts Fri 1 PM · show 30 min early</span><b>12:30</b></button>
        </div>
        <div className="receipt-actions"><button type="button" onClick={() => openModal('ORIGINAL PLAY RECEIPT', 'Deluxe Planar Sealed receipt', <ProofPreview kind="receipt" note="Representative original receipt preview. Real Atlanta ticketed-play receipts should be captured exactly." />)}>Show original</button><button type="button" onClick={() => openModal('EVENT CODE', 'Deluxe Planar Sealed code', <ProofPreview kind="code" code="ABC123" note="Representative code surface for Companion App entry or event staff." />)}>Show code</button><button type="button" onClick={() => openModal('EVENT LINK', 'Open event', <p>This should deep-link to the event detail in Explore/Plan once the event exists as a real object.</p>)}>Open event</button></div>
      </article>
      <article className="wallet-proof compact-proof">
        <span className="wallet-kind"><NavIcon name="calendar" />Useful extracted logistics</span>
        <div className="wallet-proof-main"><div><h2>Will Call and show hours</h2><p>Thu 12–6 · Fri/Sat 8:30–7 · Sun 8:30–6. Show floor Fri/Sat 10–7, Sun 10–6.</p></div></div>
      </article>
    </section>
    <aside className="wallet-show-card">
      <span className="eyebrow">PLAY RECEIPT JOB</span>
      <h2>Codes, claims, originals.</h2>
      <p>During the event this is probably the highest-value Wallet subtab: event codes, proof to show staff, original receipt, pickup entitlements, and one tap back to the event.</p>
    </aside>
  </div>
}

function WalletStoreTab({ openModal }: { openModal: (eyebrow: string, title: string, body: ReactNode) => void }) {
  const [assignments, setAssignments] = useState<Record<string, string>>({
    sheoldred: 'Kavi',
    urabrask: 'Chris',
    event: 'Assign',
  })
  useEffect(() => {
    try {
      const saved = localStorage.getItem('magiccon-wallet-store-assignments')
      if (saved) setAssignments(current => ({ ...current, ...JSON.parse(saved) }))
    } catch {
      // POC-only local convenience; ignore unavailable storage.
    }
  }, [])
  const saveAssignment = (key: string, value: string) => {
    setAssignments(current => {
      const next = { ...current, [key]: value }
      try {
        localStorage.setItem('magiccon-wallet-store-assignments', JSON.stringify(next))
      } catch {
        // POC-only local convenience; ignore unavailable storage.
      }
      return next
    })
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

  return <div className="wallet-layout">
    <section className="receipt-list" aria-label="Receipts">
      <article className="receipt-card store-receipt">
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="wallet" /></span><div><span className="eyebrow">SHOW STORE FIXTURE</span><h2>Magic Con · Dragon Shield</h2><p>9 items · assignment notes ready</p></div><strong>$255.00</strong></div>
        <div className="receipt-lines">
          <div className="receipt-line-row" role="button" tabIndex={0} onClick={() => openModal('LINE ITEM', 'Sheoldred exclusive × 3', <AssignmentPreview item="Sheoldred - Exclusive: Vegas 2026" />)}><span>Sheoldred - Exclusive: Vegas 2026 × 3</span><b>$90</b>{assignmentPicker('sheoldred')}</div>
          <div className="receipt-line-row" role="button" tabIndex={0} onClick={() => openModal('LINE ITEM', 'Urabrask exclusive × 3', <AssignmentPreview item="Urabrask - Exclusive: Vegas 2026" />)}><span>Urabrask - Exclusive: Vegas 2026 × 3</span><b>$90</b>{assignmentPicker('urabrask')}</div>
          <div className="receipt-line-row" role="button" tabIndex={0} onClick={() => openModal('LINE ITEM', 'Event exclusive × 3', <AssignmentPreview item="Event Exclusive 2026" />)}><span>Event Exclusive 2026 × 3</span><b>$75</b>{assignmentPicker('event')}</div>
        </div>
        <div className="receipt-note">Assignment note example: “three of these shirts were for Kellen.”</div>
        <div className="receipt-actions"><button type="button" onClick={() => openModal('ORIGINAL STORE RECEIPT', 'Magic Con #39Z8', <ProofPreview kind="receipt" note="Original Square receipt should render as PNG immediately, with PDF/source email still available." />)}>Show original</button><button type="button" onClick={() => openModal('EXTRACTED LINE ITEMS', 'Magic Con #39Z8 line items', <ul><li>Sheoldred exclusive × 3 — $90</li><li>Urabrask exclusive × 3 — $90</li><li>Event Exclusive 2026 × 3 — $75</li></ul>)}>Line items</button><button type="button" onClick={() => openModal('NOTE', 'Receipt note', <p>POC note: “three of these shirts were for Kellen.” Later this becomes a contextual note attached to the receipt.</p>)}>Add note</button></div>
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

function AssignmentPreview({ item }: { item: string }) {
  return <div className="assignment-preview">
    <p>{item}</p>
    <div><button type="button">Kavi</button><button type="button">Chris</button><button type="button">Juan</button><button type="button">Custom…</button></div>
    <small>POC only: this sketches the quick assignment popover. It does not save yet.</small>
  </div>
}

function WalletOtherTab({ openModal }: { openModal: (eyebrow: string, title: string, body: ReactNode) => void }) {
  return <div className="wallet-layout">
    <section className="receipt-list" aria-label="Other wallet references">
      <article className="receipt-card">
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="trip" /></span><div><span className="eyebrow">DELTA RECEIPT</span><h2>Flights · Kavi + Juan</h2><p>Confirmation HOGFBX · SNA ⇄ ATL</p></div></div>
        <div className="receipt-lines"><button type="button" onClick={() => openModal('FLIGHT DETAIL', 'DL 1521', <p>SNA to ATL · Nov 11 · 12:20 PM–7:34 PM · confirmation HOGFBX.</p>)}><span>DL 1521 · Nov 11 · SNA to ATL</span><b>7:34 PM</b></button><button type="button" onClick={() => openModal('FLIGHT DETAIL', 'DL 1602', <p>ATL to SNA · Nov 15 · 8:35 PM–10:29 PM · confirmation HOGFBX.</p>)}><span>DL 1602 · Nov 15 · ATL to SNA</span><b>8:35 PM</b></button></div>
        <div className="receipt-actions"><button type="button" onClick={() => openModal('ORIGINAL DELTA RECEIPT', 'Delta confirmation HOGFBX', <ProofPreview kind="receipt" note="Original Delta email/PDF preview belongs here; Trip owns the pleasant summary." />)}>Show original</button><button type="button" onClick={() => openModal('TRIP BACKLINK', 'Open Trip', <p>This will navigate to the Flights tab in Trip once cross-surface deep links are wired.</p>)}>Open Trip</button></div>
      </article>
      <article className="receipt-card">
        <div className="receipt-head"><span className="receipt-icon"><NavIcon name="trip" /></span><div><span className="eyebrow">HOTEL CONFIRMATIONS</span><h2>Omni + Courtyard</h2><p>Original booking emails belong here; pleasant details live in Trip.</p></div></div>
        <div className="receipt-lines"><button type="button" onClick={() => openModal('HOTEL DETAIL', 'Courtyard', <p>Courtyard by Marriott Atlanta Downtown · Nov 11–12 · Kavi, Juan, Chris.</p>)}><span>Courtyard · Nov 11-12</span><b>K/J/C</b></button><button type="button" onClick={() => openModal('HOTEL DETAIL', 'Omni', <p>Omni Atlanta Hotel at Centennial Park · Nov 12–15 · Kavi and Juan.</p>)}><span>Omni · Nov 12-15</span><b>K/J</b></button></div>
        <div className="receipt-actions"><button type="button" onClick={() => openModal('ORIGINAL HOTEL EMAIL', 'Hotel confirmations', <ProofPreview kind="receipt" note="Original hotel email/PDF previews belong here; sensitive booking values stay hidden until deliberately revealed." />)}>Show original</button><button type="button" onClick={() => openModal('TRIP BACKLINK', 'Open Trip', <p>This will navigate to Hotels in Trip once deep links are wired.</p>)}>Open Trip</button></div>
      </article>
      <article className="receipt-card">
        <div className="receipt-head"><span className="receipt-icon"><EventKindIcon name="lotus" /></span><div><span className="eyebrow">BADGE RECEIPT</span><h2>Black Lotus order</h2><p>2 × Black Lotus VIP Early Bird · transaction pi_3Tizh…</p></div><strong>$2,025.26</strong></div>
        <div className="receipt-lines"><button type="button" onClick={() => openModal('BADGE RECEIPT', 'Kavi Black Lotus VIP', <ProofPreview kind="qr" code="9gLHU3mJ" note="Badge proof is surfaced on Home; Other keeps the financial/original receipt context." />)}><span>Kavi Black Lotus VIP</span><b>Kavi</b></button><button type="button" onClick={() => openModal('BADGE RECEIPT', 'Chris Black Lotus VIP', <ProofPreview kind="qr" code="9gLHU3mJ" note="Same Black Lotus order, assigned to Chris." />)}><span>Chris Black Lotus VIP</span><b>Chris</b></button><button type="button"><span>Shipping</span><b>$15</b></button></div>
        <div className="receipt-actions"><button type="button" onClick={() => openModal('ORIGINAL BLACK LOTUS ORDER', 'Black Lotus order confirmation', <ProofPreview kind="receipt" note="Two Black Lotus VIP Early Bird badges, total $2,025.26, transaction pi_3Tizh…" />)}>Show original</button><button type="button" onClick={() => openModal('LEAP LINK', 'Open Leap order', <p>Future behavior: open the Leap confirmation page or saved source record. For now this is intentionally non-mutating.</p>)}>Open Leap</button></div>
      </article>
    </section>
    <aside className="wallet-show-card">
      <span className="eyebrow">CATCH-ALL</span>
      <h2>Useful proofs without clutter.</h2>
      <p>Other is where booking confirmations, reimbursements, odd entitlements, or one-off proofs can live until a better context emerges.</p>
    </aside>
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

function HotelsTripTab({ onOpenObject }: { onOpenObject: (detail: ObjectDetail) => void }) {
  return <>
    <div className="trip-layout">
      <section className="trip-flow-card" aria-labelledby="lodging-flow-title">
        <div className="trip-section-head"><div><span className="eyebrow">LODGING FLOW</span><h2 id="lodging-flow-title">Wednesday through Sunday</h2></div><TravelerDots people={['Kavi', 'Juan', 'Chris']} /></div>
        <div className="trip-flow">
          <article className="trip-stop shared-stop">
            <time><strong>11</strong><span>WED</span></time>
            <div className="trip-stop-icon"><NavIcon name="trip" /></div>
            <div><small>SHARED ARRIVAL NIGHT</small><h3>Courtyard Atlanta Downtown</h3><p>One room · one night</p></div>
            <TravelerDots people={['Kavi', 'Juan', 'Chris']} />
          </article>
          <div className="trip-connector"><span>hotel change</span></div>
          <article className="trip-stop lotus-transition">
            <time><strong>12</strong><span>THU</span></time>
            <div className="trip-stop-icon lotus-mini"><EventKindIcon name="lotus" /></div>
            <div><small>BLACK LOTUS FIRST LOOK</small><h3>Kavi + Chris attend</h3><p>The lodging paths separate afterward.</p></div>
            <TravelerDots people={['Kavi', 'Chris']} />
          </article>
          <div className="trip-branches" aria-label="Thursday hotel split">
            <article className="trip-branch omni-branch"><span className="branch-line" aria-hidden="true" /><div><small>NOV 12-15 · 3 NIGHTS</small><h3>Omni at Centennial Park</h3><p>Kavi and Juan · convention hotel</p></div><TravelerDots people={['Kavi', 'Juan']} /></article>
            <article className="trip-branch chris-branch"><span className="branch-line" aria-hidden="true" /><div><small>THURSDAY ONWARD</small><h3>Chris's hotel</h3><p>Property details not captured yet</p></div><TravelerDots people={['Chris']} /></article>
          </div>
        </div>
      </section>

      <aside className="trip-insight" aria-label="Thursday transition insight">
        <span className="insight-icon"><NavIcon name="wallet" /></span>
        <div><span className="eyebrow">ONE THING WORTH SETTLING</span><h2>Where do the bags go Thursday?</h2><p>The shared Courtyard stay ends before Kavi and Chris finish First Look. Omni check-in begins at 4 PM, so the luggage handoff is the only trip transition that may need a small plan.</p></div>
      </aside>
    </div>

    <div className="hotel-grid" aria-label="Confirmed hotel details">
      <article className="hotel-card courtyard-card">
        <div className="hotel-card-head"><span className="hotel-icon"><NavIcon name="trip" /></span><TravelerDots people={['Kavi', 'Juan', 'Chris']} /></div>
        <span className="eyebrow">NOV 11-12 · 1 NIGHT</span>
        <h2>Courtyard by Marriott Atlanta Downtown</h2>
        <p className="hotel-address">133 Carnegie Way, Atlanta, GA 30303</p>
        <div className="hotel-facts"><span>Shared arrival night</span><span>3 travelers</span><span>Confirmation in Wallet later</span></div>
        <div className="hotel-links"><a href="https://www.google.com/maps/search/?api=1&query=Courtyard%20by%20Marriott%20Atlanta%20Downtown" target="_blank" rel="noreferrer"><NavIcon name="map" />Maps ↗</a><a href="https://www.marriott.com/en-us/hotels/atldo-courtyard-atlanta-downtown/overview/" target="_blank" rel="noreferrer">Official hotel ↗</a></div>
      </article>
      <article className="hotel-card omni-card object-card-button" role="button" tabIndex={0} onClick={() => onOpenObject({
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
      })} onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') onOpenObject({
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
        })
      }}>
        <div className="hotel-card-head"><span className="hotel-icon"><NavIcon name="trip" /></span><TravelerDots people={['Kavi', 'Juan']} /></div>
        <span className="eyebrow">NOV 12-15 · 3 NIGHTS</span>
        <h2>Omni Atlanta Hotel at Centennial Park</h2>
        <p className="hotel-address">190 Marietta St NW, Atlanta, GA 30303</p>
        <div className="hotel-facts"><span>Check-in 4 PM</span><span>Check-out 11 AM</span><span>Connected to GWCC</span></div>
        <div className="hotel-links"><a href="https://www.google.com/maps/search/?api=1&query=Omni%20Atlanta%20Hotel%20at%20Centennial%20Park" target="_blank" rel="noreferrer"><NavIcon name="map" />Maps ↗</a><a href="https://www.omnihotels.com/hotels/atlanta-centennial-park" target="_blank" rel="noreferrer">Official hotel ↗</a></div>
      </article>
    </div>
    <p className="trip-source-note">Hotel addresses and Omni check-in/out times verified from official property pages. Reservation details remain a local design fixture.</p>
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

function CalendarSurface({ slice, onOpenPlan, onOpenTrip, onChangeState, online, saving }: { slice: TrustSlice; onOpenPlan: () => void; onOpenTrip: () => void; onChangeState: (state: PlanningState) => void; online: boolean; saving: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<'upcoming' | 'past'>('upcoming')
  const [filter, setFilter] = useState<CalendarFilter>('all')
  const [detail, setDetail] = useState<CalendarDetail | null>(null)
  const showTravel = filter === 'all' || filter === 'travel'
  const showConvention = filter === 'all' || filter === 'convention'

  return <section className="calendar-surface" aria-label="Meaningful dates">
    <div className="calendar-toolbar">
      <div className="calendar-modes" aria-label="Calendar period">
        <button type="button" className={mode === 'upcoming' ? 'active' : ''} onClick={() => { setMode('upcoming'); setDetail(null) }}>Upcoming</button>
        <button type="button" className={mode === 'past' ? 'active' : ''} onClick={() => { setMode('past'); setDetail(null) }}>Past</button>
      </div>
      {mode === 'upcoming' && <div className="calendar-filter" aria-label="Calendar type filter">
        {(['all', 'convention', 'travel'] as CalendarFilter[]).map(value => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value === 'convention' ? 'Convention' : 'Travel'}</button>)}
      </div>}
      {mode === 'upcoming' && <nav className="date-jumps" aria-label="Calendar shortcuts">
        <a href="#calendar-now">Now</a>
        <a href="#calendar-trip">Trip begins</a>
        <a href="#calendar-con">Convention</a>
      </nav>}
    </div>

    {mode === 'past' ? <div className="past-calendar">
      <div className="calendar-month"><span>COMPLETED</span><strong>Milestones</strong></div>
      <a className="agenda-row agenda-action completed-row" href="https://mcatlanta.mtgfestivals.com/en-us/badges/buy-badges.html" target="_blank" rel="noreferrer">
        <span className="agenda-date"><strong>✓</strong><span>DONE</span></span>
        <span className="agenda-icon"><NavIcon name="wallet" /></span>
        <span className="agenda-copy"><span className="agenda-kind">Completed milestone</span><strong className="agenda-title">Badges went on sale</strong><span className="agenda-summary">Official badge purchasing remains open.</span></span>
        <span className="agenda-destination external"><NavIcon name="wallet" />Official ↗</span>
      </a>
    </div> : <>

    <div className="calendar-month" id="calendar-now"><span>AUG</span><strong>Waiting season</strong></div>
    <button className="agenda-row agenda-action milestone-row" type="button" onClick={() => setDetail('ticketed-play')}>
      <div className="agenda-date"><strong>{milestoneForecasts[0].calendarDate}</strong><span>FORECAST</span></div>
      <div className="agenda-icon"><NavIcon name="calendar" /></div>
      <div className="agenda-copy"><div><span className="agenda-kind">Milestone forecast</span><span className="soft-chip">{milestoneForecasts[0].confidence}</span></div><h2>Ticketed play may open</h2><p>{milestoneForecasts[0].window} · the event-planning phase begins.</p></div>
      <span className="agenda-destination"><NavIcon name="notes" />Details</span>
    </button>

    <div className="calendar-gap"><span>quiet monitoring</span></div>
    <div className="calendar-month"><span>OCT</span><strong>Likely information drops</strong></div>
    {milestoneForecasts.slice(1).map(forecast => <button key={forecast.id} className={`agenda-row agenda-action milestone-row forecast-${forecast.id}`} type="button" onClick={() => setDetail(forecast.id)}>
      <div className="agenda-date"><strong>{forecast.calendarDate}</strong><span>FORECAST</span></div>
      <div className="agenda-icon forecast-symbol" aria-hidden="true"><MilestoneIcon name={forecast.icon} /></div>
      <div className="agenda-copy"><div><span className="agenda-kind">Milestone forecast</span><span className="soft-chip">{forecast.confidence}</span></div><h2>{forecast.title}</h2><p>{forecast.window} · based on recent MagicCon timing.</p></div>
      <span className="agenda-destination"><NavIcon name="notes" />Details</span>
    </button>)}

    <div className="calendar-gap"><span>then travel</span></div>
    <div className="calendar-month" id="calendar-trip"><span>NOV</span><strong>Atlanta trip</strong></div>

    {showTravel && <button className="agenda-row agenda-action travel-row" type="button" onClick={() => setDetail('arrival')}>
      <div className="agenda-date"><strong>11</strong><span>WED</span><em>7:34 PM</em></div>
      <div className="agenda-icon"><NavIcon name="trip" /></div>
      <div className="agenda-copy"><span className="agenda-kind">Flight + hotel</span><h2>Arrive ATL · Courtyard night</h2><p>DL 1521 lands 7:34 PM; Courtyard by Marriott Atlanta Downtown, one night.</p></div>
      <span className="agenda-signals"><TravelerDots people={['Kavi', 'Juan', 'Chris']} /></span>
      <span className="agenda-destination"><NavIcon name="trip" />Trip</span>
    </button>}

    {showTravel && <button className="agenda-row agenda-action lotus-row" type="button" onClick={() => setDetail('preview')}>
      <div className="agenda-date"><strong>12</strong><span>THU</span><em>4 PM</em></div>
      <div className="agenda-icon lotus-mini">✦</div>
      <div className="agenda-copy"><span className="agenda-kind">Black Lotus + hotel</span><h2>First Look · Omni check-in</h2><p>Chris and Kavi have Black Lotus access; Omni check-in begins at 4 PM.</p></div>
      <span className="agenda-signals"><TravelerDots people={['Kavi', 'Juan', 'Chris']} /></span>
      <span className="agenda-destination"><NavIcon name="notes" />Details</span>
    </button>}

    {showConvention && <div className="calendar-month compact" id="calendar-con"><span>NOV 13–15</span><strong>MagicCon weekend</strong></div>}

    {showConvention && <button className="agenda-row agenda-action convention-row" type="button" onClick={() => setDetail('friday')}>
      <div className="agenda-date"><strong>13</strong><span>FRI</span><em>All day</em></div>
      <div className="agenda-icon"><NavIcon name="plan" /></div>
      <div className="agenda-copy"><span className="agenda-kind">Convention · Day 1</span><h2>Planning surface opens here</h2><p>No committed events captured yet.</p></div>
      <span className="agenda-signals"><TravelerDots people={['Kavi', 'Juan', 'Chris']} /></span>
      <span className="agenda-destination"><NavIcon name="plan" />Plan</span>
    </button>}

    {showConvention && <article className={`agenda-row convention-row expandable ${expanded ? 'expanded' : ''}`}>
      <button className="agenda-row-button" type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>
        <span className="agenda-date"><strong>14</strong><span>SAT</span><em>11:30-3</em></span>
        <span className="agenda-icon"><NavIcon name="plan" /></span>
        <span className="agenda-copy"><span className="agenda-kind">Convention · Day 2</span><strong className="agenda-title">One known Black Lotus anchor</strong><span className="agenda-summary">11:30 AM–3:00 PM · {slice.decision.planning_state}</span></span>
        <span className="agenda-signals"><TravelerDots people={['Kavi', 'Chris']} /></span>
        <span className="agenda-destination"><NavIcon name="calendar" />Day <b aria-hidden="true">⌄</b></span>
      </button>
      {expanded && <div className="day-expansion">
        <div className="mini-time"><span>11:30</span><i /><span>3:00</span></div>
        <button className="mini-event" type="button" onClick={() => setDetail('event')}><span className="anchor-lotus" aria-hidden="true">✦</span><span><small>BLACK LOTUS</small><strong>{slice.occurrence.title.replace('Black Lotus ', '')}</strong><span>{slice.decision.planning_state} option · {slice.decision.planning_state === 'committed' ? 'fixed on the day' : 'does not block the day'}</span></span></button>
        <button type="button" onClick={onOpenPlan}>View Plan study <span aria-hidden="true">›</span></button>
      </div>}
    </article>}

    {showConvention && <button className="agenda-row agenda-action convention-row" type="button" onClick={() => setDetail('sunday')}>
      <div className="agenda-date"><strong>15</strong><span>SUN</span><em>All day</em></div>
      <div className="agenda-icon"><NavIcon name="plan" /></div>
      <div className="agenda-copy"><span className="agenda-kind">Convention · Final day</span><h2>Closing day</h2><p>No committed events captured yet.</p></div>
      <span className="agenda-signals"><TravelerDots people={['Kavi', 'Juan', 'Chris']} /></span>
      <span className="agenda-destination"><NavIcon name="plan" />Plan</span>
    </button>}

    {showTravel && <button className="agenda-row agenda-action travel-row airport-row" type="button" onClick={() => setDetail('airport')}>
      <div className="agenda-date"><strong>15</strong><span>SUN</span><em>TBD</em></div>
      <div className="agenda-icon"><NavIcon name="trip" /></div>
      <div className="agenda-copy"><span className="agenda-kind">Travel reminder</span><h2>Leave for ATL airport</h2><p>Draft reminder before DL 1602; exact time should adjust once Sunday plan is known.</p></div>
      <span className="agenda-signals"><TravelerDots people={['Kavi', 'Juan']} /></span>
      <span className="agenda-destination"><NavIcon name="trip" />Trip</span>
    </button>}

    {showTravel && <button className="agenda-row agenda-action travel-row" type="button" onClick={() => setDetail('sunday')}>
      <div className="agenda-date"><strong>15</strong><span>SUN</span><em>8:35 PM</em></div>
      <div className="agenda-icon"><NavIcon name="trip" /></div>
      <div className="agenda-copy"><span className="agenda-kind">Checkout + flight</span><h2>Omni check-out · fly home</h2><p>Omni check-out 11 AM; DL 1602 departs ATL 8:35 PM.</p></div>
      <span className="agenda-signals"><TravelerDots people={['Kavi', 'Juan']} /></span>
      <span className="agenda-destination"><NavIcon name="trip" />Trip</span>
    </button>}
    </>}

    {detail && <CalendarDetailSheet detail={detail} slice={slice} onClose={() => setDetail(null)} onOpenPlan={onOpenPlan} onOpenTrip={onOpenTrip} onChangeState={onChangeState} online={online} saving={saving} />}
  </section>
}

function CalendarDetailSheet({ detail, slice, onClose, onOpenPlan, onOpenTrip, onChangeState, online, saving }: { detail: CalendarDetail; slice: TrustSlice; onClose: () => void; onOpenPlan: () => void; onOpenTrip: () => void; onChangeState: (state: PlanningState) => void; online: boolean; saving: boolean }) {
  const forecast = milestoneForecasts.find(item => item.id === detail)
  const content = forecast
    ? { eyebrow: `FORECAST · ${forecast.window.toUpperCase()}`, title: forecast.title, copy: forecast.rationale }
    : detail === 'arrival'
      ? { eyebrow: 'TRIP · NOV 11', title: 'Arrival and Courtyard night', copy: 'Kavi and Juan fly Delta 1521 from SNA to ATL, 12:20 PM-7:34 PM, confirmation HOGFBX. The first hotel anchor is Courtyard by Marriott Atlanta Downtown for Kavi, Juan, and Chris.' }
      : detail === 'preview'
        ? { eyebrow: 'BLACK LOTUS · NOV 12', title: 'First Look and Omni check-in', copy: 'Kavi and Chris have the Black Lotus First Look day. Courtyard ends before Omni check-in at 4 PM, so luggage handling is the only practical transition note currently worth keeping visible.' }
        : detail === 'friday'
          ? { eyebrow: 'CONVENTION · NOV 13', title: 'Friday', copy: 'No committed or purchased events are captured yet.' }
          : detail === 'airport'
            ? { eyebrow: 'TRIP · NOV 15', title: 'Leave for ATL airport', copy: 'Placeholder reminder for Kavi and Juan before Delta 1602. Keep it visible, but derive the real departure time later from the final Sunday plan, bags, airport buffer, and local travel conditions rather than hard-coding it now.' }
          : detail === 'sunday'
            ? { eyebrow: 'TRIP · NOV 15', title: 'Closing day and flight home', copy: 'Omni check-out is 11 AM. Kavi and Juan fly Delta 1602 from ATL to SNA, 8:35 PM-10:29 PM, confirmation HOGFBX. Calendar should eventually derive a low-noise leave-for-airport reminder from the final Sunday plan.' }
            : { eyebrow: 'BLACK LOTUS · NOV 14', title: slice.occurrence.title.replace('Black Lotus ', ''), copy: '11:30 AM–3:00 PM · included Black Lotus event.' }

  return <aside className="calendar-detail-sheet" aria-label={`${content.title} details`}>
    <button className="detail-close" type="button" onClick={onClose} aria-label="Close details">×</button>
    <span className="eyebrow">{content.eyebrow}</span>
    <h2>{content.title}</h2>
    <p>{content.copy}</p>
    {detail === 'event' && <>
      <div className="calendar-state-panel" aria-label="Planning state">
        {states.map(state => <button key={state.value} type="button" aria-pressed={slice.decision.planning_state === state.value} disabled={!online || saving} onClick={() => onChangeState(state.value)}><b>{state.symbol}</b><span>{state.label}</span></button>)}
      </div>
      <button className="calendar-remove" type="button" disabled={!online || saving} onClick={() => onChangeState('none')}>{slice.decision.planning_state === 'committed' ? 'Undo commitment' : 'Remove from Plan'}</button>
      <button className="detail-plan-link" type="button" onClick={onOpenPlan}>View Plan study <span aria-hidden="true">›</span></button>
    </>}
    {(detail === 'arrival' || detail === 'preview' || detail === 'airport' || detail === 'sunday') && <button className="detail-plan-link" type="button" onClick={onOpenTrip}>View Trip details <span aria-hidden="true">›</span></button>}
    {detail === 'friday' && <button className="detail-plan-link" type="button" onClick={onOpenPlan}>View day study <span aria-hidden="true">›</span></button>}
  </aside>
}

function HomeSurface({ slice, alerts, alertReview, onOpenPlan, onOpenObject, onOpenActivity }: { slice: TrustSlice; alerts: MonitoringAlert[]; alertReview: Record<string, AlertReviewState>; onOpenPlan: () => void; onOpenObject: (detail: ObjectDetail) => void; onOpenActivity: () => void }) {
  const needsReview = alerts.filter(alert => (alertReview[alert.id] ?? 'needs-review') === 'needs-review')
  const topSignal = needsReview.find(alert => alert.severity === 'hot') ?? needsReview[0]
  const status = topSignal ? 'Review needed' : 'All quiet'
  const statusCopy = topSignal ? 'One monitored finding is worth a look.' : 'No new MagicCon signal needs attention.'
  return <div className="home-surface">
    <section className={`home-attention ${topSignal ? 'needs-review' : 'quiet'}`}>
      <div className="home-status-orb" aria-hidden="true">{topSignal ? <AlertKindIcon kind={topSignal.kind} /> : <MilestoneIcon name="badges" />}</div>
      <div>
        <span className="eyebrow">{topSignal ? 'NEEDS REVIEW' : 'QUIET MONITORING'}</span>
        <h2>{status}</h2>
        <p>{statusCopy}</p>
      </div>
      <div className="home-attention-actions">
        <span>{needsReview.length} open</span>
        <button type="button" onClick={onOpenActivity}>Activity</button>
      </div>
    </section>

    {topSignal && <button type="button" className={`home-priority-card ${topSignal.severity}`} onClick={() => onOpenObject(alertToObjectDetail(topSignal))}>
      <span className="priority-icon"><AlertKindIcon kind={topSignal.kind} /></span>
      <span className="priority-copy">
        <span className="eyebrow">TOP SIGNAL</span>
        <strong>{topSignal.title}</strong>
        <small>{topSignal.summary}</small>
      </span>
      <span className="priority-route">{topSignal.destination}<b aria-hidden="true">›</b></span>
    </button>}

    <section className="next-milestone" onClick={event => {
      const target = event.target as HTMLElement
      if (target.closest('details')) return
      onOpenActivity()
    }}>
      <div className="milestone-symbol" aria-hidden="true"><MilestoneIcon name="ticketed-play" /></div>
      <div>
        <span className="eyebrow">NEXT EXPECTED</span>
        <h2>Ticketed play opens the real planning season.</h2>
        <p>That is when event comparison and time contention become useful.</p>
      </div>
      <details className="timing-clue">
        <summary><span>Best guess</span><strong>mid–late Aug</strong></summary>
        <p>Vegas announced ticketed-play sales on Feb 3 for a Feb 10 opening—about 11½ weeks before its May 1 start. The equivalent Atlanta window is roughly Aug 18–25. This is a forecast, not an Atlanta fact.</p>
      </details>
    </section>

    <div className="home-dashboard">
      <section className="runway" aria-labelledby="runway-heading">
        <div className="runway-heading"><div><span className="eyebrow">MILESTONE RUNWAY</span><h2 id="runway-heading">What we are waiting for</h2></div><span>1 complete · 4 waiting</span></div>
        <ol>
          <li className="complete"><span className="runway-icon"><MilestoneIcon name="badges" /></span><div><strong>Badges on sale</strong><small>Live now</small></div></li>
          {milestoneForecasts.map((forecast, index) => <li key={forecast.id} className={index === 0 ? 'current' : ''}>
            <span className="runway-icon"><MilestoneIcon name={forecast.icon} /></span>
            <details className="runway-forecast">
              <summary><strong>{forecast.title}</strong><small><b>{forecast.window}</b> · forecast</small></summary>
              <p>{forecast.rationale}</p>
            </details>
          </li>)}
        </ol>
      </section>

      <section className="home-context" aria-labelledby="known-heading">
        <div><span className="eyebrow">ALREADY KNOWN</span><h2 id="known-heading">On the plan</h2></div>
        <button className="anchor-row" type="button" onClick={() => onOpenObject(trustSliceToObjectDetail(slice))}>
          <span className="anchor-lotus" aria-hidden="true">✦</span>
          <span className="anchor-date"><small>NOV 14</small><strong>11:30–3</strong></span>
          <span className="anchor-copy"><small>BLACK LOTUS</small><strong>{slice.occurrence.title.replace('Black Lotus ', '')}</strong></span>
          <span className={`anchor-state ${slice.decision.planning_state}`}>{slice.decision.planning_state}</span>
          <span className="anchor-arrow" aria-hidden="true">›</span>
        </button>
        <div className="timely-home">
          <div className="timely-home-head"><span className="eyebrow">TIMELY SIGNALS</span><button type="button" onClick={onOpenActivity}>Review all</button></div>
          {needsReview.filter(alert => alert.id !== topSignal?.id).slice(0, 2).map(alert => <button type="button" key={alert.id} className={`signal-chip-card ${alert.severity}`} onClick={() => onOpenObject(alertToObjectDetail(alert))}>
            <span><AlertKindIcon kind={alert.kind} /></span>
            <div><strong>{alert.title}</strong><small>{alert.destination} · {alert.attention}</small></div>
          </button>)}
          {needsReview.length <= (topSignal ? 1 : 0) && <button type="button" className="signal-chip-card quiet" onClick={onOpenActivity}>
            <span><AlertKindIcon kind="manual" /></span>
            <div><strong>{topSignal ? 'No other open findings' : 'No open monitor findings'}</strong><small>Reviewed and archived items stay recoverable</small></div>
          </button>}
        </div>
      </section>
    </div>
  </div>
}

function NotesSurface({ onOpenObject }: { onOpenObject: (detail: ObjectDetail) => void }) {
  return <section className="notes-surface" aria-label="Notes">
    <div className="notes-compose">
      <span className="eyebrow">QUICK NOTE</span>
      <h2>Add where you are</h2>
      <p>Future note entry should inherit context from the event, receipt, place, or alert you opened it from.</p>
      <button type="button">New note</button>
    </div>
    <div className="notes-list">
      {contextNotes.map(note => <article key={note.id} className="note-card">
        <div><span className="note-context">{note.context}</span><time>{note.updatedAt}</time></div>
        <h2>{note.title}</h2>
        <p>{note.body}</p>
        <button type="button" onClick={() => onOpenObject(noteToObjectDetail(note))}>Open note detail <span aria-hidden="true">›</span></button>
      </article>)}
    </div>
  </section>
}

function ActivitySurface({ slice, alerts: incomingAlerts, alertReview, onReviewChange, onOpenObject }: { slice: TrustSlice; alerts: MonitoringAlert[]; alertReview: Record<string, AlertReviewState>; onReviewChange: (id: string, state: AlertReviewState) => void; onOpenObject: (detail: ObjectDetail) => void }) {
  const [stream, setStream] = useState<ActivityStream>('needs-review')
  const reviewState = (alert: MonitoringAlert) => alertReview[alert.id] ?? 'needs-review'
  const needsReviewCount = incomingAlerts.filter(alert => reviewState(alert) === 'needs-review').length
  const streamDefs: Array<{ value: ActivityStream; label: string; icon: ReactNode; count: number }> = [
    { value: 'needs-review', label: 'Review', icon: <AlertKindIcon kind="site" />, count: needsReviewCount },
    { value: 'changes', label: 'Changes', icon: <AlertKindIcon kind="newsletter" />, count: incomingAlerts.filter(alert => reviewState(alert) !== 'archived' && alert.severity === 'hot').length },
    { value: 'sources', label: 'Sources', icon: <AlertKindIcon kind="email" />, count: incomingAlerts.filter(alert => reviewState(alert) !== 'archived' && alert.kind !== 'manual').length },
    { value: 'personal', label: 'Notes', icon: <NavIcon name="notes" />, count: contextNotes.length },
    { value: 'archived', label: 'Archive', icon: <NavIcon name="activity" />, count: incomingAlerts.filter(alert => reviewState(alert) === 'archived').length },
  ]
  const alerts = incomingAlerts.filter(alert => {
    const state = reviewState(alert)
    if (stream === 'needs-review') return state === 'needs-review'
    if (stream === 'archived') return state === 'archived'
    if (state === 'archived') return false
    if (stream === 'changes') return alert.severity === 'hot'
    if (stream === 'sources') return alert.kind !== 'manual'
    return false
  })

  return <section className="activity-surface" aria-label="Activity and alert intake">
    <section className="activity-inbox-head">
      <div>
        <span className="eyebrow">REVIEW INBOX</span>
        <h2>{needsReviewCount ? `${needsReviewCount} finding${needsReviewCount === 1 ? '' : 's'} need review` : 'Inbox is clear.'}</h2>
        <p>New MagicCon signals land here first. Review what matters, archive what does not, and open the affected object when you need context.</p>
      </div>
      <span className={needsReviewCount ? 'review-count active' : 'review-count'}>{needsReviewCount}</span>
    </section>
    <div className="activity-tabs" role="tablist" aria-label="Activity stream">
      {streamDefs.map(item => <button key={item.value} type="button" role="tab" aria-selected={stream === item.value} className={stream === item.value ? 'active' : ''} onClick={() => setStream(item.value)}>
        <span className="activity-tab-icon">{item.icon}</span>
        <span>{item.label}</span>
        <b>{item.count}</b>
      </button>)}
    </div>
    <div className="activity-layout">
      <div className="activity-feed">
        {stream === 'personal' ? contextNotes.map(note => <article key={note.id} className="activity-card personal">
          <span className="activity-icon"><NavIcon name="notes" /></span>
          <div><span className="eyebrow">PERSONAL NOTE</span><h2>{note.title}</h2><p>{note.body}</p><small>{note.updatedAt} · {note.context}</small><button className="activity-open-object" type="button" onClick={() => onOpenObject(noteToObjectDetail(note))}>Details</button></div>
        </article>) : alerts.map(alert => <AlertCard key={alert.id} alert={alert} reviewState={reviewState(alert)} onReviewChange={onReviewChange} onOpenObject={onOpenObject} />)}
        {alerts.length === 0 && stream !== 'personal' && <div className="activity-empty"><strong>No items here.</strong><span>{stream === 'archived' ? 'Archived findings will remain recoverable here.' : 'Quiet is a valid state.'}</span></div>}
      </div>
      <aside className="activity-rail" aria-label="Activity context">
        <button className="activity-route-card" type="button" onClick={() => onOpenObject(alertToObjectDetail(incomingAlerts.find(alert => alert.id === 'black-lotus-elevated-watch') ?? incomingAlerts[0]))}>
          <span className="activity-route-icon"><AlertKindIcon kind="site" /></span>
          <span><strong>Highest watch</strong><small>Black Lotus page changes route to Home.</small></span>
        </button>
        <details className="activity-context-card">
          <summary>What can land here</summary>
          <p>Exact source, retrieval time, useful wording, AI summary, rationale, suggested destination, and review state.</p>
        </details>
        <details className="activity-context-card">
          <summary>Current proof object</summary>
          <blockquote>{slice.observation.exact_wording}</blockquote>
          <dl>
            <div><dt>Publisher</dt><dd>{slice.source.publisher_name}</dd></div>
            <div><dt>Retrieved</dt><dd>{new Date(slice.observation.retrieved_at).toLocaleString()}</dd></div>
            <div><dt>Status</dt><dd>{slice.observation.observation_status}</dd></div>
          </dl>
        </details>
      </aside>
    </div>
  </section>
}

function AlertCard({ alert, reviewState, onReviewChange, onOpenObject }: { alert: MonitoringAlert; reviewState: AlertReviewState; onReviewChange: (id: string, state: AlertReviewState) => void; onOpenObject: (detail: ObjectDetail) => void }) {
  return <article className={`activity-card alert-${alert.severity} review-${reviewState}`}>
    <span className="activity-icon"><AlertKindIcon kind={alert.kind} /></span>
    <div>
      <div className="activity-card-head"><span className="eyebrow">{alert.kind}</span><small>{alert.checkedAt}</small></div>
      <h2>{alert.title}</h2>
      <p>{alert.summary}</p>
      <div className="activity-meta"><span className={`review-badge ${reviewState}`}>{reviewState.replace('-', ' ')}</span><span>{alert.destination}</span><span>{alert.object}</span><span>{alert.source}</span></div>
      <details>
        <summary>Why this matters</summary>
        <p>{alert.rationale}</p>
        <p>{alert.nextAction}</p>
      </details>
      <div className="activity-review-actions">
        <button type="button" onClick={() => onOpenObject(alertToObjectDetail(alert))}>Open</button>
        {reviewState !== 'reviewed' && <button type="button" onClick={() => onReviewChange(alert.id, 'reviewed')}>Reviewed</button>}
        {reviewState !== 'archived' && <button type="button" onClick={() => onReviewChange(alert.id, 'archived')}>Archive</button>}
        {reviewState !== 'needs-review' && <button type="button" onClick={() => onReviewChange(alert.id, 'needs-review')}>Reopen</button>}
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

function SetupCard() {
  return <div className="center-card"><span className="kicker">LOCAL SETUP</span><h1>Project connection needed.</h1><p>Add the canonical Supabase URL and publishable key to <code>.env.local</code>.</p></div>
}

function Login({ onSubmit, message }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; message: string }) {
  return <div className="login-shell"><form className="login-card" onSubmit={onSubmit}>
    <img src={assetUrl('magiccon-atlanta-peach.png')} alt="MagicCon Atlanta" />
    <span className="kicker">PRIVATE FIELD GUIDE</span><h1>Welcome back.</h1>
    <p className="login-intro">Enter the owner email and we’ll send a one-click sign-in link.</p>
    <label>Email<input name="email" type="email" autoComplete="email" inputMode="email" required /></label>
    <button type="submit">Email me a magic link</button>{message && <p role="status" className="alert">{message}</p>}
  </form></div>
}
