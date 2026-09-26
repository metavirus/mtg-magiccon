import { readFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { catalogArtistToSeed, CompanionCodePanel, HotelWalletReference } from '../App'

vi.mock('./supabase', () => ({ supabase: null }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const app = readFileSync('src/App.tsx', 'utf8')

describe('September 19 cross-surface usability regressions', () => {
  it('uses one public code panel in Explore, Plan and Calendar', () => {
    for (const [start, end] of [['function ExploreDetail(', 'function eventStageLabel('], ['function PlanSurface(', 'function ExploreSurface('], ['function CalendarEventDetail(', 'function CalendarDetailSheet(']]) {
      const body = app.slice(app.indexOf(start), app.indexOf(end))
      expect(body).toMatch(/<CompanionCodePanel event=\{(?:event|selected)\} \/>/)
    }
    expect(app.match(/aria-label="Magic Companion event code"/g)).toHaveLength(1)
  })

  it('copies a code, keeps unknown codes absent, and reports clipboard failure honestly', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const view = render(<CompanionCodePanel event={{ companionCode: 'PUBLIC1' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Copied'))
    expect(writeText).toHaveBeenCalledWith('PUBLIC1')
    view.rerender(<CompanionCodePanel event={{ companionCode: 'PUBLIC2' }} />)
    writeText.mockRejectedValueOnce(new Error('denied'))
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('manually'))
    view.rerender(<CompanionCodePanel event={{}} />)
    expect(screen.queryByRole('region', { name: 'Magic Companion event code' })).toBeNull()
  })

  it.each(['courtyard', 'omni', 'hilton'] as const)('labels %s as an itinerary reference, not original proof', kind => {
    render(<HotelWalletReference kind={kind} />)
    expect(screen.getByText(/No original receipt is linked/)).toBeTruthy()
    expect(screen.getByText('Address')).toBeTruthy()
    expect(app).toContain("setTab('other')")
    expect(app).toContain('setWalletProofRequest({ target: hotelTarget, nonce: Date.now() })')
  })

  it('never promotes inherited day scope to confirmed attendance', () => {
    const artist = { id: 'test', canonical_name: 'Test Artist', display_name: 'Test Artist' } as Parameters<typeof catalogArtistToSeed>[0]
    const appearance = { attending_status: 'unconfirmed', appearance_days: 'All days' } as Parameters<typeof catalogArtistToSeed>[1]
    const seed = catalogArtistToSeed(artist, appearance)
    expect(seed.attendance).toBe('Unconfirmed')
    expect(seed.facts.find(fact => fact.label === 'Appearing')?.value).toBe('Unconfirmed')
    expect(catalogArtistToSeed(artist, { ...appearance, attending_status: 'confirmed', appearance_days: 'Friday' } as typeof appearance).attendance).toBe('Friday')
    const directory = catalogArtistToSeed(artist, { ...appearance, attending_status: 'confirmed', appearance_days: null, booth: '9151' } as typeof appearance)
    expect(directory.attendance).toBe('Days not published')
    expect(directory.booth).toBe('9151')
    expect(directory.facts[0]).toEqual({ label: 'Booth', value: '9151' })
    expect(app).not.toContain("officialArtistSeeds.map(artist => artist.title).join(', ')")
    expect(app).toContain('Official directory ↗')
    expect(app).not.toContain('The full artist directory is next.')
    expect(app).not.toContain('Three Art of Magic guests are listed')
    expect(app).toContain('Published · 65 artists')
  })

  it('separates cache freshness and historical unread state from survey work', () => {
    expect(app).not.toContain('>Last checked<br />')
    expect(app).toContain('Device refreshed<br />')
    expect(app).toContain("alert.reviewState === 'needs-review' ? 'Unread'")
    expect(app).toContain("['atlanta-magic-play-pages-published', 'atlanta-on-demand-prize-wall-details'].includes(alert.id)) return 'archived'")
    expect(app).toContain("alertReview[alert.id] ?? defaultAlertReviewState(alert)")
  })
})
