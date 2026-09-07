import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtistAssetStatus } from './ArtistAssetStatus'
import { auditDeviceAssets, cacheDeviceAssets } from '../lib/deviceAssets'
vi.mock('../lib/deviceAssets', () => ({ auditDeviceAssets: vi.fn(), cacheDeviceAssets: vi.fn() }))
afterEach(() => { cleanup(); vi.resetAllMocks() })
describe('artist image completion status', () => {
  it('shows partial coverage and retries without claiming readiness', async () => {
    vi.mocked(cacheDeviceAssets).mockResolvedValueOnce({ expected: 2, cached: 1, failures: ['/b'] }).mockResolvedValueOnce({ expected: 2, cached: 2, failures: [] })
    render(<ArtistAssetStatus urls={['/a', '/b']} missingImages={0} online revision={0} />)
    await waitFor(() => expect(screen.getByText('Artist/card images incomplete · 1/2')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Retry image download' }))
    await waitFor(() => expect(screen.getByText('Artist/card images saved · 2/2')).toBeTruthy())
  })
  it('audits bytes offline and counts missing references as incomplete', async () => {
    vi.mocked(auditDeviceAssets).mockResolvedValue({ expected: 1, cached: 1, failures: [] })
    render(<ArtistAssetStatus urls={['/a']} missingImages={1} online={false} revision={0} />)
    await waitFor(() => expect(screen.getByText('Artist/card images incomplete · 1/2')).toBeTruthy())
    expect(cacheDeviceAssets).not.toHaveBeenCalled()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
