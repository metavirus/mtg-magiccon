import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtistBringList, type BringCard } from './ArtistBringList'

afterEach(cleanup)
const cards: BringCard[] = [{ key: 'printing-foil', name: 'A card', artist: 'An artist', image: '/card.png', printing: 'SET #1 · foil' }]
describe('small artist bring checklist', () => {
  it('keeps packed and signed independent and saves by printing identity', async () => {
    const change = vi.fn().mockResolvedValue(undefined)
    render(<ArtistBringList cards={cards} selections={{ 'artist-bring:printing-foil::packed': 'true' }} readOnly={false} onChange={change} onOpen={vi.fn()} />)
    expect(screen.getByLabelText(/Packed:/)).toBeChecked()
    expect(screen.getByLabelText(/Signed:/)).not.toBeChecked()
    fireEvent.click(screen.getByLabelText(/Signed:/))
    await waitFor(() => expect(change).toHaveBeenCalledWith('artist-bring:printing-foil', 'signed', 'true'))
  })
  it('shows saved checks offline but cannot modify them', () => {
    const change = vi.fn()
    render(<ArtistBringList cards={cards} selections={{ 'artist-bring:printing-foil::signed': 'true' }} readOnly onChange={change} onOpen={vi.fn()} />)
    expect(screen.getByLabelText(/Signed:/)).toBeChecked()
    expect(screen.getByLabelText(/Signed:/)).toBeDisabled()
    expect(change).not.toHaveBeenCalled()
  })
  it('opens the actual card and gives a small honest empty state', () => {
    const open = vi.fn()
    const view = render(<ArtistBringList cards={cards} selections={{}} readOnly={false} onChange={vi.fn()} onOpen={open} />)
    fireEvent.click(screen.getByRole('button', { name: /A card/ }))
    expect(open).toHaveBeenCalledWith('printing-foil')
    view.rerender(<ArtistBringList cards={[]} selections={{}} readOnly onChange={vi.fn()} onOpen={open} />)
    expect(screen.getByText(/Mark a card/)).toBeVisible()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })
  it('reports a rejected save without claiming a checked state', async () => {
    render(<ArtistBringList cards={cards} selections={{}} readOnly={false} onChange={vi.fn().mockRejectedValue(new Error('failed'))} onOpen={vi.fn()} />)
    fireEvent.click(screen.getByLabelText(/Packed:/))
    await waitFor(() => expect(screen.getByRole('alert')).toBeVisible())
    expect(screen.getByLabelText(/Packed:/)).not.toBeChecked()
  })
})
