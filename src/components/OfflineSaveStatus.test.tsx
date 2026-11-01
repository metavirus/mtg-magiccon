import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { OfflineSaveStatus } from './OfflineSaveStatus'

const mock = vi.hoisted(() => ({ statuses: [] as Array<{ ownerId: string; status: string }>, retry: vi.fn(async (_owner: string) => {}) }))
vi.mock('../lib/offlineLaneCache', () => ({
  OFFLINE_LANE_STATUS_EVENT: 'offline-lane-status',
  getOfflineLaneStatuses: (owner: string) => mock.statuses.filter(row => row.ownerId === owner),
  retryFailedOfflineLanes: mock.retry,
}))
beforeEach(() => { mock.statuses = []; mock.retry.mockReset(); mock.retry.mockResolvedValue(undefined) })
afterEach(cleanup)

it('stays quiet for healthy saves and another owner’s failures', () => {
  mock.statuses = [{ ownerId: 'other', status: 'failed' }, { ownerId: 'current', status: 'verified' }]
  render(<OfflineSaveStatus ownerId="current" />)
  expect(screen.queryByRole('status')).toBeNull()
})
it('shows a device-specific failure, retries only local copies, and clears after verification', async () => {
  mock.statuses = [{ ownerId: 'current', status: 'failed' }]
  let release!: () => void
  mock.retry.mockImplementation(async () => { await new Promise<void>(resolve => { release = resolve }); mock.statuses = [] })
  render(<OfflineSaveStatus ownerId="current" />)
  expect(screen.getByRole('status').textContent).toContain('Some content isn’t available offline.')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(mock.retry).toHaveBeenCalledWith('current')
  expect(screen.getByRole('button', { name: 'Retrying…' })).toBeDisabled()
  await act(async () => release())
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
})
it('keeps a persistent failure actionable without claiming a successful offline pack', async () => {
  mock.statuses = [{ ownerId: 'current', status: 'failed' }]
  render(<OfflineSaveStatus ownerId="current" />)
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled())
  expect(screen.queryByText(/ready|saved successfully/i)).toBeNull()
})
it('responds to real save events and immediately rebinds accounts', () => {
  const view = render(<OfflineSaveStatus ownerId="current" />)
  mock.statuses = [{ ownerId: 'current', status: 'failed' }]
  act(() => window.dispatchEvent(new Event('offline-lane-status')))
  expect(screen.getByRole('status')).toBeTruthy()
  view.rerender(<OfflineSaveStatus ownerId="other" />)
  expect(screen.queryByRole('status')).toBeNull()
})
it('reports failed owner bootstrap separately and retries it', async () => {
  const retry = vi.fn()
  render(<OfflineSaveStatus ownerId="current" identityFailed onRetryIdentity={retry} />)
  expect(screen.getByRole('status').textContent).toContain('Offline access couldn’t be saved on this device.')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(retry).toHaveBeenCalledOnce())
})
