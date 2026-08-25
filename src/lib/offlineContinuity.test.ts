import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createReconnectRefresh, readOfflineContinuity, writeOfflineContinuityLane } from './offlineContinuity'

function memoryStorage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) }
}

describe('offline continuity', () => {
  it('refreshes once per reconnect edge and deduplicates repeated online events', async () => {
    let release!: () => void
    const run = vi.fn(() => new Promise<void>(resolve => { release = resolve }))
    const reconnect = createReconnectRefresh(run)
    await reconnect(false)
    const first = reconnect(true)
    const duplicate = reconnect(true)
    expect(run).toHaveBeenCalledTimes(1)
    release()
    await Promise.all([first, duplicate])
    await reconnect(true)
    expect(run).toHaveBeenCalledTimes(1)
    await reconnect(false)
    const second = reconnect(true)
    expect(run).toHaveBeenCalledTimes(2)
    release()
    await second
  })

  it('updates successful lanes independently and retains a failed lane cache', () => {
    const storage = memoryStorage()
    writeOfflineContinuityLane('owner', 'notes', ['old note'], storage, '2026-08-24T01:00:00Z')
    writeOfflineContinuityLane('owner', 'selections', ['fresh selection'], storage, '2026-08-24T02:00:00Z')
    expect(readOfflineContinuity('owner', storage)?.lanes).toEqual({ notes: ['old note'], selections: ['fresh selection'] })
  })

  it('keeps owners isolated and rejects malformed snapshots', () => {
    const storage = memoryStorage()
    writeOfflineContinuityLane('owner-a', 'notes', ['private'], storage)
    expect(readOfflineContinuity('owner-b', storage)).toBeNull()
    storage.setItem('magiccon:offline-continuity:v1:owner-a', '{bad')
    expect(readOfflineContinuity('owner-a', storage)).toBeNull()
  })

  it('lets a successful server refresh replace stale cached data', () => {
    const storage = memoryStorage()
    writeOfflineContinuityLane('owner', 'flights', [{ id: 'stale' }], storage)
    writeOfflineContinuityLane('owner', 'flights', [{ id: 'server' }], storage)
    expect(readOfflineContinuity('owner', storage)?.lanes.flights).toEqual([{ id: 'server' }])
  })

  it('contains no write queue or replay contract', () => {
    const storage = memoryStorage()
    writeOfflineContinuityLane('owner', 'activity', [], storage)
    const snapshot = readOfflineContinuity('owner', storage)
    expect(snapshot).not.toHaveProperty('writes')
    expect(snapshot).not.toHaveProperty('queue')
  })

  it('keeps private and live data out of the service-worker precache', () => {
    const config = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')
    expect(config).toContain("globPatterns: ['index.html', '**/*.{js,css,svg}']")
    expect(config).not.toMatch(/globPatterns:.*(?:json|\*\.html)/)
  })
})
