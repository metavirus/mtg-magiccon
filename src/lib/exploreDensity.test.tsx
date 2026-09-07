import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ExploreEventRow } from '../App'
import { ticketedPlayExploreEvents } from '../data/ticketedPlayExploreEvents'
import type { ComponentProps } from 'react'

const baseEvent = ticketedPlayExploreEvents[0] as ComponentProps<typeof ExploreEventRow>['event']

vi.mock('./supabase', () => ({ supabase: null }))
afterEach(cleanup)

it('keeps secondary assessment out of scan rows and opens saved events without changing state', () => {
  const onSelect = vi.fn(), onState = vi.fn()
  const event = { ...baseEvent, state: 'tentative' as const, fit: 'Secondary assessment only in detail' }
  render(<ExploreEventRow event={event} selected={false} onSelect={onSelect} onState={onState} onPurchase={() => {}} />)
  expect(screen.queryByText(event.fit)).toBeNull()
  expect(screen.getByText('Tentative')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Review saved event' }))
  expect(onSelect).toHaveBeenCalledOnce()
  expect(onState).not.toHaveBeenCalled()
})

it('offers a direct interest action for an unsaved event', () => {
  const onState = vi.fn()
  render(<ExploreEventRow event={{ ...baseEvent, state: 'none' }} selected={false} onSelect={() => {}} onState={onState} onPurchase={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Interested' }))
  expect(onState).toHaveBeenCalledWith('interested')
})
