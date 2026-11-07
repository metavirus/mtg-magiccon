import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearOfflineLane, readOfflineLane, writeOfflineLane } from './offlineLaneCache'
import { useKaviMapRelease } from './useKaviMapRelease'

const html = '<!doctype html><html><body>Private map fixture</body></html>'
const { read } = vi.hoisted(() => ({ read: vi.fn() }))

vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          abortSignal: () => ({ maybeSingle: read }),
        }),
      }),
    }),
  },
}))

beforeEach(() => { localStorage.clear(); read.mockReset() })
afterEach(cleanup)

describe('private map device copy', () => {
  it('saves a server-authorized release and cold reopens for the same offline owner', async () => {
    read.mockResolvedValue({ data: { html }, error: null, status: 200 })
    const online = renderHook(() => useKaviMapRelease('map-owner', 'map-owner', true, true))
    await waitFor(() => expect(online.result.current).toMatchObject({ html, saved: true, fromDevice: false }))
    online.unmount()

    const offline = renderHook(({ owner }) => useKaviMapRelease(owner, undefined, false, true), { initialProps: { owner: 'map-owner' } })
    await waitFor(() => expect(offline.result.current).toMatchObject({ html, fromDevice: true }))
    offline.rerender({ owner: 'other-owner' })
    expect(offline.result.current).toBeUndefined()
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('recovers when the device reports online but the network cannot reach the server', async () => {
    await writeOfflineLane('map-owner', 'kaviMap', html)
    read.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' }, status: 0 })
    const { result } = renderHook(() => useKaviMapRelease('map-owner', 'map-owner', true, true))
    await waitFor(() => expect(result.current).toMatchObject({ html, fromDevice: true }))
  })

  it('withdraws the saved renderer after an authoritative access denial', async () => {
    await writeOfflineLane('map-owner', 'kaviMap', html)
    read.mockResolvedValue({ data: null, error: null, status: 200 })
    const { result } = renderHook(() => useKaviMapRelease('map-owner', 'map-owner', true, true))
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1))
    await waitFor(async () => expect(await readOfflineLane('map-owner', 'kaviMap')).toBeNull())
    expect(result.current).toBeUndefined()
  })

  it('removes the device copy after an already-started save completes', async () => {
    const pending = writeOfflineLane('map-owner', 'kaviMap', html)
    const removal = clearOfflineLane('map-owner', 'kaviMap')
    expect(await readOfflineLane('map-owner', 'kaviMap')).toBeNull()
    await Promise.all([pending, removal])
    expect(await readOfflineLane('map-owner', 'kaviMap')).toBeNull()
  })
})
