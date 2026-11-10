import { type ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { CalendarSurface, PlanSurface, WalletOtherTab } from '../App'
import { DESIGN_PREVIEW_SLICE } from './designPreview'
import { previewTripFlights } from './tripFlights'
import { buildAtlantaMerchReview } from './atlantaMerchReview'
import { ticketedPlayExploreEvents } from '../data/ticketedPlayExploreEvents'

vi.mock('./supabase', () => ({ supabase: null }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })
beforeEach(() => {
  window.localStorage.clear()
  window.history.replaceState(null, '', '/')
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-28T12:00:00-04:00'))
})

type CalendarProps = ComponentProps<typeof CalendarSurface>
const event = (id: string, time: string): CalendarProps['events'][number] => ({ ...ticketedPlayExploreEvents[0], id, title: id, day: 'Thu', time, state: 'committed' } as CalendarProps['events'][number])
const calendarProps = (): CalendarProps => ({
  slice: DESIGN_PREVIEW_SLICE, events: [event('Late event', '5:30-6:15 PM'), event('Earlier event', '4:15-5:15 PM')], flights: previewTripFlights,
  selectionRows: [], companions: [], notes: [], catalog: { status: 'ready', offers: [] }, currentPerson: 'Kavi',
  onAddNote: vi.fn(), onDeleteNote: vi.fn(), onUpdateEvent: vi.fn(), onPurchase: vi.fn(), onOpenExplore: vi.fn(), onOpenPlan: vi.fn(), onOpenPlanEvent: vi.fn(), onOpenTrip: vi.fn(), onOpenFlights: vi.fn(), onChangeState: vi.fn(), online: true, saving: false, canCommitBlackLotus: true,
})

describe('Calendar display and inspector regression', () => {
  it('puts both months in the primary cross-month forecast date, with intact endpoints', () => {
    const { container } = render(<CalendarSurface {...calendarProps()} />)
    const dates = (id: string) => [...container.querySelectorAll(`.forecast-${id} .forecast-date-tile strong span`)].map(node => node.textContent)
    expect(dates('show-catalog')).toEqual(['OCT 29', '– NOV 6'])
    expect(dates('black-lotus-store')).toEqual(['OCT 30', '– NOV 3'])
    expect(dates('artists')).toEqual([])
  })
  it('orders committed events and forecasts chronologically', () => {
    const { container } = render(<CalendarSurface {...calendarProps()} />)
    expect([...container.querySelectorAll('.convention-event-row h2')].map(n => n.textContent)).toEqual(['Earlier event', 'Late event'])
    expect([...container.querySelectorAll('.milestone-row h2')].map(n => n.textContent)).toEqual(['Show catalog', 'Black Lotus store'])
  })
  it('retires expired forecasts when Calendar regains focus and preserves completed ticketing', () => {
    const { container } = render(<CalendarSurface {...calendarProps()} />)
    fireEvent.click(screen.getByRole('button', { name: /FORECAST.*Black Lotus store/ }))
    vi.mocked(Date.now).mockReturnValue(Date.parse('2026-11-04T00:00:00-05:00'))
    fireEvent.focus(window)
    expect([...container.querySelectorAll('.milestone-row h2')].map(node => node.textContent)).toEqual(['Show catalog'])
    expect(container.querySelector('.calendar-detail-sheet')).toBeNull()
    vi.mocked(Date.now).mockReturnValue(Date.parse('2026-11-07T00:00:00-05:00'))
    fireEvent.focus(window)
    expect(screen.queryByText('Expected releases')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Past' }))
    expect(screen.getByText('Ticketed Play events posted')).toBeInTheDocument()
    expect(screen.getByText('Ticketed Play purchasing opened')).toBeInTheDocument()
  })
  it('shows no pending releases while loading and retires fulfilled forecasts before their date ends', () => {
    const props = calendarProps()
    const { rerender } = render(<CalendarSurface {...props} catalog={{ status: 'unavailable', offers: [] }} />)
    expect(screen.queryByText('Expected releases')).not.toBeInTheDocument()
    rerender(<CalendarSurface {...props} />)
    expect(screen.getByText('Expected releases')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /FORECAST.*Show catalog/ }))
    expect(screen.getByRole('complementary', { name: 'Show catalog details' })).toBeInTheDocument()
    rerender(<CalendarSurface {...props} catalog={buildAtlantaMerchReview()} />)
    expect(screen.queryByText('Expected releases')).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Show catalog details' })).not.toBeInTheDocument()
  })
  it('closes a future event when switching to Past', () => {
    render(<CalendarSurface {...calendarProps()} />)
    fireEvent.click(screen.getByRole('button', { name: /Earlier event/ }))
    expect(screen.getByRole('button', { name: 'Close event detail' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Past' }))
    expect(screen.queryByRole('button', { name: 'Close event detail' })).not.toBeInTheDocument()
  })
  it('does not stack a forecast over an event and clears it on Travel', () => {
    const { container } = render(<CalendarSurface {...calendarProps()} />)
    fireEvent.click(screen.getByRole('button', { name: /Earlier event/ }))
    fireEvent.click(screen.getByRole('button', { name: /FORECAST.*Show catalog/ }))
    expect(screen.queryByRole('button', { name: 'Close event detail' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Travel' }))
    expect(container.querySelector('.milestone-row')).toBeNull()
    expect(container.querySelector('.calendar-detail-sheet')).toBeNull()
    expect(screen.queryByText('Expected releases')).not.toBeInTheDocument()
  })
  it('dismisses an event with Escape', () => {
    render(<CalendarSurface {...calendarProps()} />)
    fireEvent.click(screen.getByRole('button', { name: /Earlier event/ }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('button', { name: 'Close event detail' })).not.toBeInTheDocument()
  })
})

describe('Wallet current itinerary', () => {
  it('renders current legs and updates both row and drawer from new flight data', () => {
    const openModal = vi.fn()
    const props = { flights: structuredClone(previewTripFlights), openModal, onOpenTrip: vi.fn() }
    const view = render(<WalletOtherTab {...props} />)
    expect(screen.getByRole('button', { name: /DL 329.*Departs 2:00 PM/ })).toBeInTheDocument()
    expect(screen.queryByText(/DL 1521/)).not.toBeInTheDocument()
    props.flights[0].legs[0].flight_number = 'DL 999'
    props.flights[0].legs[0].departure_at = '2026-11-11T15:00:00-08:00'
    view.rerender(<WalletOtherTab {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /DL 999.*Departs 3:00 PM/ }))
    expect(openModal.mock.calls[0][1]).toBe('DL 999')
    render(openModal.mock.calls[0][2])
    expect(screen.getByText(/3:00 PM PT – 9:16 PM ET/)).toBeInTheDocument()
  })
  it('keeps Wallet wired to the same live flight prop and conflicts wired to participant scope', () => {
    const source = readFileSync('src/App.tsx', 'utf8')
    expect(source).toMatch(/<WalletSurface\b[^>]*\bflights=\{tripFlights\}/)
    expect(source).toContain('<WalletOtherTab flights={flights}')
    expect(source).toContain('planEventsOverlap(first.event, second.event) && shareIncludedParticipant(')
    expect(source).not.toContain("openModal('FLIGHT DETAIL', 'DL 1521'")
  })
})

describe('Plan conflict rendering', () => {
  it('keeps every person filter available in both views without changing saved event selections', () => {
    const props = { ...calendarProps(), focusRequest: null, onChangeSliceState: vi.fn(), onOpenCalendar: vi.fn() }
    const { container } = render(<PlanSurface {...props} />)
    for (const view of ['List', 'Agenda']) {
      fireEvent.click(screen.getByRole('tab', { name: view }))
      const people = [...container.querySelectorAll('.plan-control-right .plan-people-filter button')]
      expect(people.map(button => button.getAttribute('title'))).toEqual(['Kavi', 'Chris', 'Juan', 'Kyle'])
      const kyle = people.find(button => button.getAttribute('title') === 'Kyle')!
      const previous = kyle.getAttribute('aria-pressed')
      fireEvent.click(kyle)
      expect(kyle.getAttribute('aria-pressed')).not.toBe(previous)
    }
    expect(props.onUpdateEvent).not.toHaveBeenCalled()
    expect(props.onChangeState).not.toHaveBeenCalled()
    expect(props.onChangeSliceState).not.toHaveBeenCalled()
  })
  it('only marks simultaneous events when an included traveler attends both', () => {
    const props = calendarProps()
    type PlanProps = ComponentProps<typeof PlanSurface>
    const events = [
      { ...event('Unknown', '11:30 AM–3:59 PM'), day: 'Fri' as const },
      { ...event('Collector', '3 PM–6:59 PM'), day: 'Fri' as const, state: 'none' as const },
      { ...event('Hexhaven', '5:30 PM–9:30 PM'), day: 'Fri' as const },
    ]
    const companions: PlanProps['companions'] = [{ key: 'kyle', name: 'Kyle', userId: 'kyle-id', bubbleLabel: 'Ky', bubbleColor: '#fff', badgeTier: 'black_lotus', blackLotusEntitled: true, relationship: '', sortOrder: 1 }]
    const selectionRows: PlanProps['selectionRows'] = [{ owner_id: 'kyle-id', object_id: 'explore-Collector', object_kind: 'event', selection_key: 'state', selection_value: 'committed', updated_at: '' }]
    const planProps: PlanProps = { ...props, events, companions, selectionRows, focusRequest: null, onChangeSliceState: vi.fn(), onOpenCalendar: vi.fn() }
    const { container, rerender } = render(<PlanSurface {...planProps} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Agenda' }))
    expect(container.textContent).not.toContain('Conflict')
    // Now Kavi also attends Collector: its overlap is a real personal conflict.
    const shared = events.map(e => e.id === 'Collector' ? { ...e, state: 'committed' as const } : e)
    rerender(<PlanSurface {...planProps} events={shared} />)
    expect(container.textContent).toContain('Conflict')
  })
})
