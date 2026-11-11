import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PersonalCalendar } from './PersonalCalendar'
import type { PersonalCalendarEvent } from '../lib/personalCalendar'

const { write, single, cache } = vi.hoisted(() => ({ write: vi.fn(), single: vi.fn(), cache: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: () => ({ upsert: write, update: write, delete: write }) } }))
vi.mock('../lib/offlineLaneCache', () => ({ saveOfflineLane: cache }))
const event: PersonalCalendarEvent = { id: 'id', owner_id: 'owner', title: 'Dinner', event_date: '2099-11-13', start_time: '18:00:00', end_time: '19:00:00', visibility: 'private', invited_user_ids: ['guest'], updated_at: '' }
function Harness({ online = true, ownerId = 'owner', initial = [] as PersonalCalendarEvent[] }) {
  const [rows, setRows] = useState(initial)
  return <PersonalCalendar rows={rows} onRowsChange={setRows} ownerId={ownerId} canWrite online={online} mode="upcoming" companions={[{ userId: 'owner', name: 'Kavi', bubbleLabel: 'Ka', key: 'kavi' }, { userId: 'guest', name: 'Chris', bubbleLabel: 'C', key: 'chris' }]} renderNotes={(_, readers) => <div>Readers: {readers.map(person => person.name).join(', ')}</div>}>
    {({ rows, renderRow, add }) => <><button onClick={add} disabled={!online}>Add event</button>{rows.map(renderRow)}</>}
  </PersonalCalendar>
}
afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.replaceState(null, '', '/') })
describe('personal Calendar drawer', () => {
  it('creates private by default, saves a stable ID, and opens the persisted detail', async () => {
    const chain = { select: () => chain, single }
    write.mockReturnValue(chain)
    single.mockResolvedValue({ data: event, error: null })
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add event' }))
    expect(screen.getByLabelText('Visibility')).toHaveValue('private')
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Dinner' } })
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2099-11-13' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save event' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit event' })).toBeInTheDocument())
    expect(write.mock.calls[0][0]).toMatchObject({ owner_id: 'owner', visibility: 'private', title: 'Dinner', id: expect.any(String) })
    expect(cache).toHaveBeenCalledWith('owner', 'personalCalendar', [event])
    expect(screen.getByText('Readers: Kavi, Chris')).toBeInTheDocument()
  })
  it('keeps offline detail readable and mutations disabled', () => {
    render(<Harness online={false} initial={[event]} />)
    fireEvent.click(screen.getByRole('button', { name: /Private event Dinner/ }))
    expect(screen.getByRole('button', { name: 'Edit event' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove event' })).toBeDisabled()
    expect(write).not.toHaveBeenCalled()
  })
  it('retries an uncertain save with the same ID rather than creating a second event', async () => {
    const chain = { select: () => chain, single }
    write.mockReturnValue(chain)
    single.mockResolvedValueOnce({ data: null, error: { message: 'connection lost' } }).mockResolvedValueOnce({ data: event, error: null })
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Add event' }))
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Dinner' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save event' }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Save event' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit event' })).toBeInTheDocument())
    expect(write.mock.calls[0][0].id).toBe(write.mock.calls[1][0].id)
  })
  it('lets invited people view details without owner edit/remove controls or attendance claims', () => {
    render(<Harness ownerId="guest" initial={[event]} />)
    fireEvent.click(screen.getByRole('button', { name: /Private event Dinner/ }))
    expect(screen.queryByRole('button', { name: 'Edit event' })).not.toBeInTheDocument()
    expect(screen.queryByText(/purchased|committed/i)).not.toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('opens the actual event requested by a note backlink', async () => {
    window.history.replaceState(null, '', '/?calendarEvent=id')
    render(<Harness initial={[event]} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAccessibleName('Dinner'))
    expect(window.location.search).toBe('')
  })
})
