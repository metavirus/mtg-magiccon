/** Keep the cached app usable; only reload for a replacement before React mounts. */
export function startWithCurrentShell({
  serviceWorker,
  online,
  workerUrl,
  mount,
  reload,
  stalled,
  discoveryMs = 350,
  installMs = 4000,
}: {
  serviceWorker?: ServiceWorkerContainer
  online: boolean
  workerUrl: string
  mount: () => void
  reload: () => void
  stalled: () => void
  discoveryMs?: number
  installMs?: number
}): void {
  if (!serviceWorker || !online) {
    mount()
    return
  }

  const initialController = serviceWorker.controller
  if (!initialController) {
    // A first visit has no stale shell to replace. Installation runs in parallel.
    mount()
    void serviceWorker.register(workerUrl).catch(() => {})
    return
  }

  let finished = false
  let installing = false
  let activationRequested = false
  let stalledPresented = false
  let registration: ServiceWorkerRegistration | undefined
  const watched = new Set<ServiceWorker>()
  let timer: ReturnType<typeof setTimeout>

  const finish = (replace: boolean) => {
    if (finished) return
    clearTimeout(timer)
    registration?.removeEventListener('updatefound', updateFound)
    for (const worker of watched) worker.removeEventListener('statechange', stateChanged)
    if (!replace && activationRequested) {
      // Activation cannot be cancelled. Never mount a shell whose lazy chunks
      // may now be removed; retain controllerchange recovery before any App mount.
      if (!stalledPresented) {
        stalledPresented = true
        stalled()
      }
      return
    }
    finished = true
    serviceWorker.removeEventListener('controllerchange', controllerChanged)
    if (replace) reload()
    else mount()
  }
  const controllerChanged = () => {
    if (serviceWorker.controller && serviceWorker.controller !== initialController) finish(true)
  }
  const stateChanged = () => {
    controllerChanged()
    // Failed precaching leaves the old worker intact and safe to use.
    if ([...watched].every(worker => worker.state === 'redundant')) finish(false)
    // Only an installed, fully precached worker may replace this startup.
    if (!finished && !stalledPresented && !activationRequested) {
      for (const worker of watched) {
        if (worker.state === 'installed') {
          activationRequested = true
          worker.postMessage({ type: 'SKIP_WAITING' })
          break
        }
      }
    }
  }
  const updateFound = () => {
    const worker = registration?.installing ?? registration?.waiting
    if (!worker || worker === initialController || watched.has(worker)) return
    watched.add(worker)
    worker.addEventListener('statechange', stateChanged)
    if (!installing) {
      installing = true
      clearTimeout(timer)
      timer = setTimeout(() => finish(false), installMs)
    }
    stateChanged()
  }

  serviceWorker.addEventListener('controllerchange', controllerChanged)
  timer = setTimeout(() => finish(false), discoveryMs)
  void (async () => {
    try {
      registration = await serviceWorker.getRegistration(workerUrl)
      if (finished || stalledPresented) return
      if (!registration) {
        finish(false)
        void serviceWorker.register(workerUrl).catch(() => {})
        return
      }
      registration.addEventListener('updatefound', updateFound)
      updateFound()
      if (finished || stalledPresented || activationRequested) return
      // update() checks the worker script, not app data or a version endpoint.
      await registration.update()
      if (finished || stalledPresented) return
      controllerChanged()
      updateFound()
      if (!installing) finish(false)
    } catch {
      // A failed network check says nothing about an already precached worker.
      // Give a requested activation its own deadline and controllerchange path.
      if (!activationRequested) finish(false)
    }
  })()
}

/** An actual activation fault gets a recovery action, never the obsolete app. */
export function showStartupStalled(root: HTMLElement, reload: () => void): void {
  const panel = document.createElement('section')
  panel.className = 'center-card empty'
  panel.setAttribute('role', 'alert')
  const message = document.createElement('p')
  message.textContent = 'Update stalled.'
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Reload'
  button.addEventListener('click', reload)
  panel.append(message, button)
  root.replaceChildren(panel)
}
