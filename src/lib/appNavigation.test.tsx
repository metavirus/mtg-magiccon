import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

vi.mock('./supabase', () => ({ supabase: {} }))

beforeEach(() => {
  window.history.replaceState(null, '', '/?preview=1#home')
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function navigate(name: string) {
  const button = screen.getAllByRole('button', { name }).find(element => element.closest('.desktop-nav'))
    ?? screen.getAllByRole('button', { name })[0]
  fireEvent.click(button)
}

describe('app navigation sequences', () => {
  it('keeps Explore title and purchase actions as separate buttons', () => {
    window.history.replaceState(null, '', '/?preview=1#explore')
    render(<App />)
    expect(document.querySelector('.explore-event-open')).not.toBeNull()
    expect(document.querySelector('.explore-event button button')).toBeNull()
    expect(document.querySelector('.explore-event-main > .event-scan')).not.toBeNull()
  })
  it('traverses Home → Explore → Plan → Back → Back without adding entries', async () => {
    render(<App />)
    navigate('Explore')
    navigate('Plan')
    const historyLength = window.history.length
    fireEvent.click(screen.getByRole('button', { name: 'Back to previous view' }))
    await waitFor(() => expect(window.location.hash).toBe('#explore'))
    fireEvent.click(screen.getByRole('button', { name: 'Back to previous view' }))
    await waitFor(() => expect(window.location.hash).toBe('#home'))
    expect(window.history.length).toBe(historyLength)
    expect(screen.getByRole('button', { name: 'Back to previous view' })).toBeDisabled()
  })

  it('resets a sold-out deep link on ordinary Explore and restores it with Back/Forward', async () => {
    window.history.replaceState(null, '', '/?preview=1#explore?group=sold_out')
    render(<App />)
    expect(screen.getByRole('link', { name: 'Clear group filter' })).toBeInTheDocument()
    navigate('Home')
    navigate('Explore')
    expect(window.location.hash).toBe('#explore')
    expect(screen.queryByRole('link', { name: 'Clear group filter' })).not.toBeInTheDocument()
    window.history.back()
    await waitFor(() => expect(window.location.hash).toBe(''))
    window.history.back()
    await waitFor(() => expect(screen.getByRole('link', { name: 'Clear group filter' })).toBeInTheDocument())
    window.history.forward()
    await waitFor(() => expect(window.location.hash).toBe(''))
    window.history.forward()
    await waitFor(() => expect(window.location.hash).toBe('#explore'))
    expect(screen.queryByRole('link', { name: 'Clear group filter' })).not.toBeInTheDocument()
  })

  it('dismisses hotel detail on browser Back and Escape returns focus to its trigger', async () => {
    render(<App />)
    navigate('Calendar')
    navigate('Trip')
    const hotel = screen.getAllByRole('button', { name: /Hilton/ }).find(element => element.classList.contains('hotel-card'))!
    hotel.focus()
    fireEvent.click(hotel)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(hotel).toHaveFocus()
    fireEvent.click(hotel)
    window.history.back()
    await waitFor(() => expect(window.location.hash).toBe('#calendar'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('clears the group through its link and app Back restores the deep link', async () => {
    window.history.replaceState(null, '', '/?preview=1#explore?group=sold_out')
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: 'Clear group filter' }))
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Clear group filter' })).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'All types' })).toHaveClass('active')
    fireEvent.click(screen.getByRole('button', { name: 'Back to previous view' }))
    await waitFor(() => expect(screen.getByRole('link', { name: 'Clear group filter' })).toBeInTheDocument())
  })

  it('dismisses the Prize Tix article with Escape and restores focus', () => {
    render(<App />)
    navigate('Info')
    const trigger = screen.getByRole('button', { name: 'Redemption guide' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('button', { name: 'Close article' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
