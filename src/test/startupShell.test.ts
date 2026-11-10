import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { showStartupStalled, startWithCurrentShell } from '../startupShell'

class Worker extends EventTarget {
  state: ServiceWorkerState = 'activated'
  postMessage = vi.fn()
  change(state: ServiceWorkerState) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }
}

function setup() {
  vi.useFakeTimers()
  const old = new Worker()
  const registration = Object.assign(new EventTarget(), {
    installing: null as Worker | null,
    waiting: null as Worker | null,
    update: vi.fn(async () => registration as unknown as ServiceWorkerRegistration),
  })
  const container = Object.assign(new EventTarget(), {
    controller: old as Worker | null,
    getRegistration: vi.fn(async () => registration as unknown as ServiceWorkerRegistration),
    register: vi.fn(async () => registration as unknown as ServiceWorkerRegistration),
  })
  const mount = vi.fn()
  const reload = vi.fn()
  const stalled = vi.fn()
  const launch = (online = true) => startWithCurrentShell({
    serviceWorker: container as unknown as ServiceWorkerContainer,
    online, workerUrl: './sw.js', mount, reload, stalled,
  })
  const install = () => {
    const worker = new Worker()
    worker.state = 'installing'
    registration.installing = worker
    registration.dispatchEvent(new Event('updatefound'))
    return worker
  }
  return { old, registration, container, mount, reload, stalled, launch, install }
}

afterEach(() => vi.useRealTimers())

describe('startup shell coherence', () => {
  it('mounts offline immediately without network or worker activation', () => {
    const s = setup()
    s.launch(false)
    expect(s.mount).toHaveBeenCalledOnce()
    expect(s.container.getRegistration).not.toHaveBeenCalled()
  })

  it('mounts a first visit immediately and registers in parallel', () => {
    const s = setup()
    s.container.controller = null
    s.launch()
    expect(s.mount).toHaveBeenCalledOnce()
    expect(s.container.register).toHaveBeenCalledOnce()
  })

  it('mounts immediately when the update check finds no replacement', async () => {
    const s = setup()
    s.launch()
    await vi.advanceTimersByTimeAsync(0)
    expect(s.mount).toHaveBeenCalledOnce()
    expect(s.registration.update).toHaveBeenCalledOnce()
    expect(s.reload).not.toHaveBeenCalled()
  })

  it('falls back to cached content when the origin errors', async () => {
    const s = setup()
    s.registration.update.mockRejectedValue(new Error('offline origin'))
    s.launch()
    await vi.advanceTimersByTimeAsync(0)
    expect(s.mount).toHaveBeenCalledOnce()
  })

  it('activates a waiting complete shell and reloads once before old React mounts', async () => {
    const s = setup()
    const worker = new Worker()
    worker.state = 'installed'
    s.registration.waiting = worker
    s.launch()
    await vi.advanceTimersByTimeAsync(0)
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(s.registration.update).not.toHaveBeenCalled()
    expect(s.mount).not.toHaveBeenCalled()
    s.container.controller = worker
    s.container.dispatchEvent(new Event('controllerchange'))
    s.container.dispatchEvent(new Event('controllerchange'))
    expect(s.reload).toHaveBeenCalledOnce()
    expect(s.mount).not.toHaveBeenCalled()
  })

  it('waits for installing precache then requests activation', async () => {
    const s = setup()
    const worker = s.install()
    s.launch()
    await vi.advanceTimersByTimeAsync(0)
    expect(worker.postMessage).not.toHaveBeenCalled()
    expect(s.mount).not.toHaveBeenCalled()
    worker.change('installed')
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    s.container.controller = worker
    s.container.dispatchEvent(new Event('controllerchange'))
    expect(s.reload).toHaveBeenCalledOnce()
    expect(s.mount).not.toHaveBeenCalled()
  })

  it('mounts cached content if replacement precaching fails', async () => {
    const s = setup()
    const worker = s.install()
    s.launch()
    await vi.advanceTimersByTimeAsync(0)
    worker.change('redundant')
    expect(s.mount).toHaveBeenCalledOnce()
    expect(worker.postMessage).not.toHaveBeenCalled()
    expect(s.reload).not.toHaveBeenCalled()
  })

  it('bounds a stalled discovery at 350ms and ignores later controller changes', async () => {
    const s = setup()
    s.container.getRegistration.mockImplementation(() => new Promise(() => {}))
    s.launch()
    await vi.advanceTimersByTimeAsync(349)
    expect(s.mount).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(s.mount).toHaveBeenCalledOnce()
    s.container.controller = new Worker()
    s.container.dispatchEvent(new Event('controllerchange'))
    expect(s.reload).not.toHaveBeenCalled()
  })

  it('bounds a pending install at 4s; a late install stays waiting without discarding drafts', async () => {
    const s = setup()
    const worker = s.install()
    s.launch()
    await vi.advanceTimersByTimeAsync(3999)
    expect(s.mount).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(s.mount).toHaveBeenCalledOnce()
    worker.change('installed')
    expect(worker.postMessage).not.toHaveBeenCalled()
    expect(s.reload).not.toHaveBeenCalled()
  })

  it('does not activate background updates after normal mounting', async () => {
    const s = setup()
    s.launch()
    await vi.advanceTimersByTimeAsync(0)
    const worker = s.install()
    worker.change('installed')
    expect(worker.postMessage).not.toHaveBeenCalled()
    expect(s.mount).toHaveBeenCalledOnce()
    expect(s.reload).not.toHaveBeenCalled()
  })

  it('never mounts old React after requested activation exceeds the deadline; a late controller still recovers', async () => {
    const s = setup()
    const worker = new Worker()
    worker.state = 'installed'
    s.registration.waiting = worker
    s.launch()
    await vi.advanceTimersByTimeAsync(4000)
    expect(s.stalled).toHaveBeenCalledOnce()
    expect(s.mount).not.toHaveBeenCalled()
    s.container.controller = worker
    s.container.dispatchEvent(new Event('controllerchange'))
    s.container.dispatchEvent(new Event('controllerchange'))
    expect(s.reload).toHaveBeenCalledOnce()
    expect(s.mount).not.toHaveBeenCalled()
  })

  it('lets a precached worker claim the page after an in-flight network check fails', async () => {
    const s = setup()
    let rejectUpdate!: (error: Error) => void
    s.registration.update.mockImplementation(() => new Promise((_, reject) => { rejectUpdate = reject }))
    s.launch()
    await vi.advanceTimersByTimeAsync(0)
    const worker = s.install()
    worker.change('installed')
    rejectUpdate(new Error('offline origin'))
    await vi.advanceTimersByTimeAsync(0)
    expect(worker.postMessage).toHaveBeenCalledOnce()
    expect(s.stalled).not.toHaveBeenCalled()
    expect(s.mount).not.toHaveBeenCalled()
    s.container.controller = worker
    s.container.dispatchEvent(new Event('controllerchange'))
    expect(s.reload).toHaveBeenCalledOnce()
  })

  it('never mounts old React if a requested worker becomes redundant', async () => {
    const s = setup()
    const worker = new Worker()
    worker.state = 'installed'
    s.registration.waiting = worker
    s.launch()
    await vi.advanceTimersByTimeAsync(0)
    worker.change('redundant')
    expect(s.stalled).toHaveBeenCalledOnce()
    expect(s.mount).not.toHaveBeenCalled()
  })

  it('offers Reload only on the explicit stalled outcome', () => {
    const root = document.createElement('div')
    const reload = vi.fn()
    showStartupStalled(root, reload)
    expect(root.textContent).toBe('Update stalled.Reload')
    root.querySelector('button')!.click()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('keeps complete precaching and legacy chunks while activating a fully installed shell', () => {
    const config = readFileSync('vite.config.ts', 'utf8')
    expect(config).toContain("registerType: 'prompt'")
    expect(config).toContain('injectRegister: null')
    expect(config).toContain('skipWaiting: false')
    expect(config).toContain("importScripts: ['shell-upgrade.js']")
    expect(config).toContain("cacheId: 'magiccon-shell-v2'")
    expect(config).toContain('cleanupOutdatedCaches: false')
    expect(config).toContain('await caches.match(request)')
    expect(config).toContain('clientsClaim: true')
    expect(config).toContain("globPatterns: ['index.html', '**/*.{js,css,svg}']")
    expect(config).toContain("cacheName: 'magiccon-remote-images-v1'")
  })
})
