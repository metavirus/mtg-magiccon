import { useState } from 'react'
import './ExhibitorDirectory.css'

export type Exhibitor = {
  id: string
  name: string
  booth: string
  profileUrl: string
  description: string
  website: string
  storeUrl: string
  imageUrl: string
  aliases: string[]
  visitReason: string
  highlight?: string
}

export type ExhibitorDirectoryProps = {
  exhibitors: Exhibitor[]
  savedIds: string[]
  onToggleSaved: (id: string) => void | Promise<void>
  onOpen: (exhibitor: Exhibitor) => void
  canWrite: boolean
  loading?: boolean
  error?: string
}

const searchable = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()

export function ExhibitorDirectory({ exhibitors, savedIds, onToggleSaved, onOpen, canWrite, loading = false, error = '' }: ExhibitorDirectoryProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'highlights' | 'saved'>('all')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')
  const saved = new Set(savedIds)
  const terms = searchable(query).trim().split(/\s+/).filter(Boolean)
  const visible = exhibitors.filter(exhibitor => {
    if (filter === 'saved' && !saved.has(exhibitor.id)) return false
    if (filter === 'highlights' && !exhibitor.highlight) return false
    const text = searchable([exhibitor.name, exhibitor.booth, exhibitor.highlight ?? '', ...exhibitor.aliases].join(' '))
    return terms.every(term => text.includes(term))
  })
  async function toggle(id: string) {
    if (!canWrite || savingId) return
    setSavingId(id)
    setSaveError('')
    try { await onToggleSaved(id) }
    catch { setSaveError('Could not save that exhibitor. Please try again.') }
    finally { setSavingId(null) }
  }
  return <section className="exhibitor-directory" aria-label="Exhibitors">
    <div className="exhibitor-toolbar">
      <label className="exhibitor-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" aria-label="Find exhibitor or booth" placeholder="Find exhibitor or booth" value={query} onChange={event => setQuery(event.target.value)} />
        {query && <button type="button" aria-label="Clear exhibitor search" onClick={() => setQuery('')}>×</button>}
      </label>
      <div className="trip-tabs exhibitor-filters" role="group" aria-label="Exhibitor filter">
        <button type="button" className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All</button>
        <button type="button" className={filter === 'highlights' ? 'active' : ''} aria-pressed={filter === 'highlights'} onClick={() => setFilter('highlights')}>Highlights</button>
        <button type="button" className={filter === 'saved' ? 'active' : ''} aria-pressed={filter === 'saved'} onClick={() => setFilter('saved')}>Saved</button>
      </div>
    </div>
    <div className="exhibitor-summary"><span>{visible.length} {visible.length === 1 ? 'exhibitor' : 'exhibitors'}</span>{!canWrite && <span>Read-only</span>}</div>
    {loading && <p className="exhibitor-message" role="status">Loading exhibitors…</p>}
    {error && <p className="exhibitor-message" role="alert">{error}</p>}
    {saveError && <p className="exhibitor-message" role="alert">{saveError}</p>}
    <div className="exhibitor-list">
      {visible.map(exhibitor => <article className="exhibitor-row" key={exhibitor.id}>
        <button type="button" className="exhibitor-open" aria-label={`Open ${exhibitor.name} details`} onClick={() => onOpen(exhibitor)}>
          <span className="exhibitor-copy"><strong>{exhibitor.name}</strong><small>{exhibitor.booth ? `Booth ${exhibitor.booth}` : 'Booth not listed'}</small>{exhibitor.highlight && <span className="exhibitor-highlight">{exhibitor.highlight}</span>}</span>
          <span className="exhibitor-chevron" aria-hidden="true">›</span>
        </button>
        <button type="button" className="exhibitor-save" aria-label={`${saved.has(exhibitor.id) ? 'Unsave' : 'Save'} ${exhibitor.name}`} aria-pressed={saved.has(exhibitor.id)} disabled={!canWrite || savingId !== null} onClick={() => void toggle(exhibitor.id)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a1 1 0 0 1 1 1v16l-6-3.4L6 21V5a1 1 0 0 1 1-1Z" /></svg>
        </button>
      </article>)}
    </div>
    {!loading && !error && !visible.length && <p className="exhibitor-message">{query.trim() ? 'No exhibitors match that search.' : filter === 'saved' ? 'No saved exhibitors yet.' : filter === 'highlights' ? 'No reviewed highlights available yet.' : 'No exhibitors available yet.'}</p>}
  </section>
}
