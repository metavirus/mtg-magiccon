import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { NavIcon } from '../NavIcon'
import { supabase } from '../lib/supabase'
import { saveOfflineLane } from '../lib/offlineLaneCache'
import { personalCalendarFields, personalCalendarObjectId, personalCalendarTime, validatePersonalCalendarEvent, type PersonalCalendarDraft, type PersonalCalendarEvent } from '../lib/personalCalendar'

type Companion = { userId?: string; name: string; bubbleLabel: string; key: string }
type Controller = { rows: PersonalCalendarEvent[]; renderRow: (event: PersonalCalendarEvent) => ReactNode; add: () => void }
type Props = { rows: PersonalCalendarEvent[]; onRowsChange: (rows: PersonalCalendarEvent[]) => void; children: (controller: Controller) => ReactNode; ownerId?: string; canWrite: boolean; online: boolean; mode: 'upcoming' | 'past'; companions: Companion[]; renderNotes: (event: PersonalCalendarEvent, readers: Companion[]) => ReactNode }
const emptyDraft = (): PersonalCalendarDraft => ({ title: '', event_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }), start_time: '12:00', end_time: '13:00', visibility: 'private', invited_user_ids: [] })

export function PersonalCalendar({ rows, onRowsChange: setRows, children, ownerId, canWrite, online, mode, companions, renderNotes }: Props) {
  const [selection, setSelection] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<PersonalCalendarDraft>(emptyDraft)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const newId = useRef(crypto.randomUUID())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const ownerRef = useRef(ownerId)
  ownerRef.current = ownerId
  const dialogRef = useRef<HTMLElement>(null)
  const selected = rows.find(row => row.id === selection)
  const open = selection !== null
  const writable = Boolean(ownerId && online && canWrite)
  const close = () => { if (!busy) { setSelection(null); setEditing(false); setConfirmDelete(false); setError('') } }
  useEffect(() => { setSelection(null); setError('') }, [ownerId])
  useEffect(() => {
    const requested = () => {
      const id = new URLSearchParams(window.location.search).get('calendarEvent')
      if (id && rows.some(row => row.id === id)) { setSelection(id); setEditing(false); const url = new URL(window.location.href); url.searchParams.delete('calendarEvent'); window.history.replaceState(null, '', url) }
    }
    requested()
    window.addEventListener('magiccon-open-personal-calendar', requested)
    return () => window.removeEventListener('magiccon-open-personal-calendar', requested)
  }, [rows])
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const previous = document.activeElement as HTMLElement | null
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) setSelection(null)
      if (event.key !== 'Tab') return
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]') ?? [])]
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); previous?.focus() }
  }, [open, busy])
  const save = async () => {
    if (!writable || !supabase || !ownerId || busy) return
    const validation = validatePersonalCalendarEvent(draft)
    if (validation) { setError(validation); return }
    const currentOwner = ownerId
    setBusy(true); setError('')
    const payload = { ...draft, title: draft.title.trim(), updated_at: new Date().toISOString() }
    try {
      const result = selected
        ? await supabase.from('personal_calendar_events').update(payload).eq('id', selected.id).eq('owner_id', currentOwner).select(personalCalendarFields).single()
        : await supabase.from('personal_calendar_events').upsert({ ...payload, id: newId.current, owner_id: currentOwner }, { onConflict: 'id' }).select(personalCalendarFields).single()
      if (result.error) throw result.error
      if (ownerRef.current !== currentOwner) return
      const saved = result.data as PersonalCalendarEvent
      const next = [...rows.filter(row => row.id !== saved.id), saved].sort((a, b) => (a.event_date + a.start_time).localeCompare(b.event_date + b.start_time))
      setRows(next); saveOfflineLane(currentOwner, 'personalCalendar', next); setSelection(saved.id); setEditing(false)
    } catch { if (ownerRef.current === currentOwner) setError('Event could not be saved. Check your connection and try again.') }
    finally { setBusy(false) }
  }
  const remove = async () => {
    if (!writable || !supabase || !ownerId || !selected || busy) return
    const currentOwner = ownerId
    setBusy(true); setError('')
    try {
      const result = await supabase.from('personal_calendar_events').delete().eq('id', selected.id).eq('owner_id', currentOwner).select('id').single()
      if (result.error) throw result.error
      if (ownerRef.current !== currentOwner) return
      const next = rows.filter(row => row.id !== selected.id)
      setRows(next); saveOfflineLane(currentOwner, 'personalCalendar', next); setSelection(null); setConfirmDelete(false)
    } catch { if (ownerRef.current === currentOwner) setError('Event could not be removed. Try again.') }
    finally { setBusy(false) }
  }
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const visible = rows.filter(row => mode === 'past' ? row.event_date < today : row.event_date >= today)
  const readers = selected ? companions.filter(person => selected.visibility === 'shared' || person.userId === selected.owner_id || Boolean(person.userId && selected.invited_user_ids.includes(person.userId))) : []
  const renderRow = (row: PersonalCalendarEvent) => <button type="button" className="agenda-row agenda-action convention-row" key={row.id} onClick={() => { setSelection(row.id); setEditing(false); setError('') }}>
      <span className="agenda-date"><strong>{Number(row.event_date.slice(8))}</strong><span>{new Date(`${row.event_date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</span><em>{personalCalendarTime(row.start_time)}</em></span>
      <span className="agenda-icon"><NavIcon name="calendar" /></span>
      <span className="agenda-copy"><span className="agenda-kind">{row.visibility === 'shared' ? 'Shared' : 'Private'} event</span><strong className="agenda-title">{row.title}</strong><span className="agenda-summary">{personalCalendarTime(row.start_time)}–{personalCalendarTime(row.end_time)} ET</span></span>
      <span className="agenda-destination"><NavIcon name="notes" />Details</span>
    </button>
  return <>
    {children({ rows: visible, renderRow, add: () => { newId.current = crypto.randomUUID(); setDraft(emptyDraft()); setSelection('new'); setEditing(true); setError('') } })}
    {error && !open && <p role="alert">{error}</p>}
    {open && createPortal(<div className="object-detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close() }}>
      <aside ref={dialogRef} className="object-detail object-detail-event personal-calendar-dialog" role="dialog" aria-modal="true" aria-labelledby="personal-calendar-title">
        <button className="detail-close persistent-detail-close object-detail-close" type="button" aria-label="Close event" onClick={close} disabled={busy}>×</button>
        <header className="object-detail-head"><span className="eyebrow">CALENDAR</span><h2 id="personal-calendar-title">{selection === 'new' ? 'Add event' : selected?.title}</h2></header>
        {error && <p role="alert">{error}</p>}
        {editing ? <form className="personal-calendar-form" onSubmit={event => { event.preventDefault(); void save() }}>
          <label>Title<input autoFocus required maxLength={160} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} disabled={!writable || busy} /></label>
          <label>Date<input type="date" required value={draft.event_date} onChange={event => setDraft({ ...draft, event_date: event.target.value })} disabled={!writable || busy} /></label>
          <div className="personal-calendar-times"><label>Start (ET)<input type="time" required value={draft.start_time.slice(0, 5)} onChange={event => setDraft({ ...draft, start_time: event.target.value })} disabled={!writable || busy} /></label><label>End (ET)<input type="time" required value={draft.end_time.slice(0, 5)} onChange={event => setDraft({ ...draft, end_time: event.target.value })} disabled={!writable || busy} /></label></div>
          <label>Visibility<select value={draft.visibility} onChange={event => setDraft({ ...draft, visibility: event.target.value as 'private' | 'shared' })} disabled={!writable || busy}><option value="private">Private</option><option value="shared">Shared with trip companions</option></select></label>
          <fieldset disabled={!writable || busy}><legend>Add people</legend><div className="personal-calendar-people">{companions.filter(person => person.userId && person.userId !== ownerId).map(person => <button key={person.key} type="button" className={draft.invited_user_ids.includes(person.userId!) ? `active ${person.key}` : person.key} aria-pressed={draft.invited_user_ids.includes(person.userId!)} onClick={() => setDraft({ ...draft, invited_user_ids: draft.invited_user_ids.includes(person.userId!) ? draft.invited_user_ids.filter(id => id !== person.userId) : [...draft.invited_user_ids, person.userId!] })}><span className="person-bubble">{person.bubbleLabel}</span><span>{person.name}</span></button>)}</div></fieldset>
          <div className="object-detail-actions"><button className="note-save" type="submit" disabled={!writable || busy}>{busy ? 'Saving…' : 'Save event'}</button><button type="button" onClick={() => selected ? setEditing(false) : close()} disabled={busy}>Cancel</button></div>
        </form> : selected && <>
          <section className="object-detail-section"><p>{new Date(`${selected.event_date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })} · {personalCalendarTime(selected.start_time)}–{personalCalendarTime(selected.end_time)} ET</p><p>{selected.visibility === 'shared' ? 'Shared with trip companions' : selected.invited_user_ids.length ? 'Private · invited people can view' : 'Private · only you'}</p>{selected.invited_user_ids.length > 0 && <p>Invited: {companions.filter(person => person.userId && selected.invited_user_ids.includes(person.userId)).map(person => person.name).join(', ')}</p>}</section>
          {selected.owner_id === ownerId && <div className="object-detail-actions"><button type="button" className="detail-plan-link" disabled={!writable} onClick={() => { setDraft(selected); setEditing(true); setConfirmDelete(false) }}>Edit event</button><button type="button" disabled={!writable || busy} onClick={() => setConfirmDelete(true)}>Remove event</button>{confirmDelete && <span role="alert">Remove this event? <button type="button" disabled={busy} onClick={() => void remove()}>Remove</button><button type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>Keep</button></span>}</div>}
          <div data-object-id={personalCalendarObjectId(selected.id)}>{renderNotes(selected, readers)}</div>
        </>}
      </aside>
    </div>, document.body)}
  </>
}
