import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ArtistsSurface, mapCatalogCardsToCandidates } from '../App'
import { artistCardCandidates } from '../data/artistCardCandidates'
import { readOfflineContinuity, writeOfflineContinuityLane } from './offlineContinuity'

const db = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: db }))
const sampleArtists = [{ id: 'cynthia-sheppard', title: 'Cynthia Sheppard', signal: 'Confirmed artist', status: 'Confirmed', attendance: 'All days', facts: [], signatureTargets: [] }]
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks() })

describe('printing identity and signing safety', () => {
  it('pins desktop art and copy to the same grid row and keeps actions in content flow', () => {
    const css = readFileSync('src/density.css', 'utf8')
    expect(css).toContain('.artist-card-popover-art{grid-column:1;grid-row:1;')
    expect(css).toContain('.artist-card-popover-copy{grid-column:2;grid-row:1;')
    expect(css).toContain('.artist-card-popover-copy>.artist-signing-actions{position:static;')
  })
  it('isolates the card close control from generic sticky layout and restores focus on Escape', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    window.history.replaceState(null, '', '/#artists')
    writeOfflineContinuityLane('owner', 'artistCatalog', { artists: sampleArtists, cards: [...artistCardCandidates] })
    render(<ArtistsSurface currentPerson="Kavi" currentOwnerId="owner" canWrite={false} onOpenObject={() => {}} onOpenActivity={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cards' }))
    const opener = screen.getByRole('button', { name: new RegExp(`^${artistCardCandidates[0].cardName} art by`) })
    opener.focus()
    fireEvent.click(opener)
    const close = screen.getByRole('button', { name: 'Close card preview' })
    expect(close.classList.contains('persistent-detail-close')).toBe(false)
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(close, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Close card preview' })).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
  it('keeps foil and normal independently addressable when price order changes', () => {
    const base = { card_id: 'card', set_code: 'SET', set_name: 'Set', collector_number: '1', rarity: 'rare', quantity: 1, price_as_of: null, printing_type: null, special_treatments: null }
    const printings = [{ ...base, id: 'normal', foil: 'normal', market_price_usd: 2 }, { ...base, id: 'foil', foil: 'foil', market_price_usd: 5 }]
    const cards = [{ id: 'card', artist_id: 'artist', card_name: 'Test', scryfall_url: null, card_image_url: null, art_crop_url: null }]
    const first = mapCatalogCardsToCandidates(printings, cards, [], [])
    const refreshed = mapCatalogCardsToCandidates(printings.map(row => ({ ...row, market_price_usd: row.id === 'normal' ? 10 : 1 })), cards, [], [])
    expect(first.map(card => card.printingId).sort()).toEqual(['foil', 'normal'])
    expect(refreshed.map(card => card.printingId).sort()).toEqual(['foil', 'normal'])
  })

  it('leaves the cached choice unchanged and disables actions offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    window.history.replaceState(null, '', '/#artists')
    const card = artistCardCandidates[0]
    writeOfflineContinuityLane('owner', 'artistCatalog', { artists: sampleArtists, cards: [card] })
    writeOfflineContinuityLane('owner', 'artistSigningInterests', { [card.id]: 'maybe' })
    render(<ArtistsSurface currentPerson="Kavi" currentOwnerId="owner" canWrite={false} onOpenObject={() => {}} onOpenActivity={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cards' }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${card.cardName} art by`) }))
    const action = screen.getByRole('button', { name: 'For sure for signing' }) as HTMLButtonElement
    expect(action.closest('fieldset')?.disabled).toBe(true)
    fireEvent.click(action)
    expect(readOfflineContinuity('owner')?.lanes.artistSigningInterests).toEqual({ [card.id]: 'maybe' })
    expect(screen.getByText('Read-only · reconnect to change signing choices.')).toBeTruthy()
  })

  it('does not change the cache while saving or after a rejected save', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    window.history.replaceState(null, '', '/#artists')
    const card = { ...artistCardCandidates[0], artistId: 'artist', cardId: 'card', printingId: 'printing' }
    writeOfflineContinuityLane('owner', 'artistCatalog', { artists: [{ id: 'artist', title: card.artistName, signal: 'Confirmed artist', status: 'Confirmed', attendance: 'All days', facts: [], signatureTargets: [] }], cards: [card] })
    writeOfflineContinuityLane('owner', 'artistSigningInterests', { printing: 'maybe' })
    const props = { currentPerson: 'Kavi' as const, currentOwnerId: 'owner', onOpenObject: () => {}, onOpenActivity: () => {} }
    const view = render(<ArtistsSurface {...props} canWrite={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cards' }))
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${card.cardName} art by`) }))
    online.mockReturnValue(true)
    view.rerender(<ArtistsSurface {...props} canWrite />)
    let finish!: (value: unknown) => void
    const request = new Promise(resolve => { finish = resolve })
    const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(() => request) }
    query.update.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    db.from.mockReturnValue(query)
    fireEvent.click(screen.getByRole('button', { name: 'For sure for signing' }))
    expect(screen.getByText('Saving signing choice…')).toBeTruthy()
    expect(readOfflineContinuity('owner')?.lanes.artistSigningInterests).toEqual({ printing: 'maybe' })
    finish({ error: { message: 'Rejected' }, data: null })
    await waitFor(() => expect(screen.getByText(/Signing pick could not be saved: Rejected/)).toBeTruthy())
    expect(readOfflineContinuity('owner')?.lanes.artistSigningInterests).toEqual({ printing: 'maybe' })
  })
})
