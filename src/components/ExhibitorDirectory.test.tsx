import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExhibitorDirectory, type Exhibitor } from './ExhibitorDirectory'

afterEach(cleanup)
const base = { profileUrl: '', description: '', website: '', storeUrl: '', imageUrl: '', visitReason: '' }
const exhibitors: Exhibitor[] = [
  { ...base, id: 'a', name: 'Example Card Supply', booth: '101, 203', aliases: ['ECS'] },
  { ...base, id: 'b', name: 'Another Vendor', booth: '402', aliases: [] },
]
const props = () => ({ exhibitors, savedIds: ['b'], canWrite: true, onToggleSaved: vi.fn(), onOpen: vi.fn() })
describe('Exhibitor directory', () => {
  it('highlights only reviewed booth reasons, not the existence of promotions', () => {
    render(<ExhibitorDirectory {...props()} exhibitors={[{ ...exhibitors[0], highlight: 'Live product engraving' }, exhibitors[1]]} />)
    fireEvent.click(screen.getByRole('button', { name: 'Highlights' }))
    expect(screen.getByText('Live product engraving')).toBeVisible()
    expect(screen.queryByText('Another Vendor')).toBeNull()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'engraving' } })
    expect(screen.getByText('Example Card Supply')).toBeVisible()
    fireEvent.click(screen.getByLabelText('Clear exhibitor search'))
    fireEvent.click(screen.getByRole('button', { name: /^All$/ }))
    expect(screen.getByText('Another Vendor')).toBeVisible()
  })
  it('searches names, every booth, and aliases case-insensitively', () => {
    render(<ExhibitorDirectory {...props()} />)
    for (const query of ['example', '203', 'ecs', 'ECS 101']) {
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: query } })
      expect(screen.getByText('Example Card Supply')).toBeVisible()
      expect(screen.queryByText('Another Vendor')).toBeNull()
    }
    fireEvent.click(screen.getByLabelText('Clear exhibitor search'))
    expect(screen.getByText('Another Vendor')).toBeVisible()
  })
  it('filters saved entries and keeps opening separate from saving', async () => {
    const callbacks = props()
    render(<ExhibitorDirectory {...callbacks} />)
    fireEvent.click(screen.getByRole('button', { name: /^Saved$/ }))
    expect(screen.queryByText('Example Card Supply')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open Another Vendor details' }))
    expect(callbacks.onOpen).toHaveBeenCalledWith(exhibitors[1])
    expect(callbacks.onToggleSaved).not.toHaveBeenCalled()
    callbacks.onOpen.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Unsave Another Vendor' }))
    await waitFor(() => expect(callbacks.onToggleSaved).toHaveBeenCalledWith('b'))
    expect(callbacks.onOpen).not.toHaveBeenCalled()
  })
  it('shows private saved state read-only without allowing writes', () => {
    const callbacks = props()
    render(<ExhibitorDirectory {...callbacks} canWrite={false} />)
    const saved = screen.getByRole('button', { name: 'Unsave Another Vendor' })
    expect(saved).toHaveAttribute('aria-pressed', 'true')
    expect(saved).toBeDisabled()
    fireEvent.click(saved)
    expect(callbacks.onToggleSaved).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Open Another Vendor details' })).toBeEnabled()
  })
  it('reports a failed save without inventing a saved state', async () => {
    render(<ExhibitorDirectory {...props()} onToggleSaved={vi.fn().mockRejectedValue(new Error('offline'))} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save Example Card Supply' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not save'))
    expect(screen.getByRole('button', { name: 'Save Example Card Supply' })).toHaveAttribute('aria-pressed', 'false')
  })
})
