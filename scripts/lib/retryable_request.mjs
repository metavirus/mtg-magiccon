import { isTransientPublicSourceError } from './public_source_fetch.mjs'

export function requestMayRetry(input, init = {}) {
  const method = (init.method ?? input?.method ?? 'GET').toUpperCase()
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  if (/\/rpc\//.test(url.pathname)) return false
  if (method === 'GET' || method === 'HEAD') return true
  // Streams cannot be replayed safely; Supabase JSON writes use strings.
  if (init.body != null && typeof init.body !== 'string' && !(init.body instanceof Uint8Array)) return false
  if (method === 'PATCH') return true
  const headers = new Headers(init.headers ?? input?.headers)
  return method === 'POST' && !!url.searchParams.get('on_conflict') && /(?:^|,)\s*resolution=merge-duplicates\s*(?:,|$)/i.test(headers.get('prefer') ?? '')
}

/** One deadline across all attempts; only exact replayable idempotent requests retry. */
export async function fetchRetryableRequest(input, init = {}, {
  fetchImpl = fetch, timeoutMs = 20000, maxAttempts = 3, maxRetryAfterMs = 3000,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now,
  retryJwtFuture = false,
} = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || !Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 3 || !Number.isFinite(maxRetryAfterMs) || maxRetryAfterMs < 0 || maxRetryAfterMs > 10000) throw new Error('Invalid retryable request limits')
  const retrySafe = requestMayRetry(input, init)
  const controller = new AbortController()
  const parent = init.signal ?? input?.signal
  const signal = parent ? AbortSignal.any([parent, controller.signal]) : controller.signal
  let timer
  let removeParent
  let returnedResponse = false
  const deadline = new Promise((_, reject) => {
    const abort = () => { controller.abort(parent?.reason); reject(parent?.reason ?? new DOMException('Request aborted', 'AbortError')) }
    if (parent?.aborted) abort()
    else parent?.addEventListener('abort', abort, { once: true })
    removeParent = () => parent?.removeEventListener('abort', abort)
    timer = setTimeout(() => { controller.abort(); reject(new DOMException(`Request timed out after ${timeoutMs}ms`, 'TimeoutError')) }, timeoutMs)
    timer.unref?.()
  })
  const bounded = operation => Promise.race([operation, deadline])
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (controller.signal.aborted) await deadline
      let delay = Math.min(250 * 2 ** (attempt - 1), maxRetryAfterMs)
      let response
      try {
        response = await bounded(fetchImpl(input instanceof Request ? input.clone() : input, { ...init, signal }))
      } catch (error) {
        if (!retrySafe || !isTransientPublicSourceError(error) || controller.signal.aborted || attempt === maxAttempts) throw error
        await bounded(sleep(delay))
        continue
      }
      const jwtFuture = retryJwtFuture && response.status === 401 && /JWT issued at future/i.test(await bounded(response.clone().text()))
      const transient = response.status === 408 || response.status === 429 || response.status >= 500 && response.status <= 599
      if (attempt === maxAttempts || !(jwtFuture || retrySafe && transient)) {
        returnedResponse = true
        return response
      }
      if (jwtFuture) delay = 2000
      else {
        const header = response.headers.get('retry-after')
        const seconds = Number(header)
        const supplied = header == null ? NaN : Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - now()
        if (Number.isFinite(supplied)) delay = Math.max(0, Math.min(supplied, maxRetryAfterMs))
      }
      // Release rejected response connections without waiting on an unbounded body.
      void response.body?.cancel().catch(() => {})
      await bounded(sleep(delay))
    }
  }
  // Keep the abort deadline alive for consumers reading the returned raw body.
  finally { if (!returnedResponse) clearTimeout(timer); removeParent() }
}
