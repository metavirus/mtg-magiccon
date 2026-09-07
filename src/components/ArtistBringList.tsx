import { useState } from 'react'
import './ArtistBringList.css'

export type BringCard = { key: string; name: string; artist: string; image: string; printing: string }
export const bringObjectId = (key: string) => `artist-bring:${key}`
export function ArtistBringList({ cards, selections, readOnly, onChange, onOpen }: {
  cards: BringCard[]; selections: Record<string, string>; readOnly: boolean
  onChange: (objectId: string, key: 'packed' | 'signed', value: string) => Promise<void>
  onOpen: (key: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const groups = new Map<string, BringCard[]>()
  for (const card of cards) groups.set(card.artist, [...(groups.get(card.artist) ?? []), card])
  async function change(card: BringCard, key: 'packed' | 'signed', checked: boolean) {
    if (readOnly || saving) return
    setSaving(true)
    setError('')
    try { await onChange(bringObjectId(card.key), key, String(checked)) }
    catch { setError('Could not save that check. Please try again.') }
    finally { setSaving(false) }
  }
  return <details className="artist-bring-list" open>
    <summary>Cards to bring <span>{cards.length}</span></summary>
    {!cards.length ? <p>Mark a card “For sure” to add it here.</p> : <>
      {readOnly && <p>Saved checklist · read-only.</p>}
      {[...groups].sort(([a], [b]) => a.localeCompare(b)).map(([artist, entries]) => <section key={artist} aria-label={artist}>
        <h3>{artist}</h3>
        {entries.map(card => <div className="artist-bring-row" key={card.key}>
          <button className="artist-bring-card" type="button" onClick={() => onOpen(card.key)}>
            {card.image && <img src={card.image} alt="" />}
            <span><strong>{card.name}</strong><small>{card.printing}</small></span>
          </button>
          <div className="artist-bring-checks">
            {(['packed', 'signed'] as const).map(key => <label key={key}>
              <input type="checkbox" checked={selections[`${bringObjectId(card.key)}::${key}`] === 'true'}
                disabled={readOnly || saving} aria-label={`${key === 'packed' ? 'Packed' : 'Signed'}: ${card.name} (${card.printing})`}
                onChange={event => void change(card, key, event.target.checked)} />
              {key === 'packed' ? 'Packed' : 'Signed'}
            </label>)}
          </div>
        </div>)}
      </section>)}
    </>}
    {error && <p role="alert">{error}</p>}
  </details>
}
