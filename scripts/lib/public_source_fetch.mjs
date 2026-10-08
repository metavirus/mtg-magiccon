const TRANSIENT_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET'])
const TLS_CODES = new Set(['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED', 'SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'])
const detail = error => `${error.message}${error.cause?.message ? `; cause: ${error.cause.message}` : ''}`
const code = error => error.cause?.code ?? error.code

export function isPublicSourceTlsError(error) {
  return TLS_CODES.has(code(error)) || /unable to verify.*certificate|certificate chain/i.test(error.cause?.message ?? error.message)
}

export function isTransientPublicSourceError(error) {
  return error.name === 'TimeoutError' || error.name === 'AbortError' || TRANSIENT_CODES.has(code(error)) || (error instanceof TypeError && error.message === 'fetch failed' && !isPublicSourceTlsError(error))
}

async function readBounded(response, maxBytes) {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel().catch(() => {})
    throw new Error(`Public source response exceeds ${maxBytes} byte limit`)
  }
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxBytes) throw new Error(`Public source response exceeds ${maxBytes} byte limit`)
      chunks.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks, length).toString('utf8')
}

/** Transport only: parsing and source identity checks deliberately run outside retries. */
export async function fetchPublicSourceText(url, {
  fetchImpl = fetch, timeoutMs = 20000, maxBytes = 20 * 1024 * 1024,
  maxAttempts = 3, maxRetryAfterMs = 3000, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  now = Date.now, tlsFallback, headers = { 'user-agent': 'MagicCon Atlanta companion monitor/1.0 (+https://metavirus.github.io/mtg-magiccon/)' },
} = {}) {
  if (![timeoutMs, maxBytes, maxAttempts].every(value => Number.isSafeInteger(value) && value > 0) || maxAttempts > 3 || !Number.isFinite(maxRetryAfterMs) || maxRetryAfterMs < 0 || maxRetryAfterMs > 10000) throw new Error('Invalid public source fetch limits')
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let retryDelay = Math.min(250 * 2 ** (attempt - 1), maxRetryAfterMs)
    try {
      const controller = new AbortController()
      let timer
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new DOMException(`Public source timed out after ${timeoutMs}ms`, 'TimeoutError')) }, timeoutMs)
      })
      let response
      try {
        response = await Promise.race([fetchImpl(url, { headers, signal: controller.signal }).then(async result => ({ status: result.status, ok: result.ok, html: await readBounded(result, maxBytes), retryAfter: result.headers.get('retry-after') })), deadline])
      } finally { clearTimeout(timer) }
      if ((response.status === 408 || response.status === 429 || response.status >= 500 && response.status <= 599) && attempt < maxAttempts) {
        const seconds = Number(response.retryAfter)
        const supplied = response.retryAfter == null ? NaN : Number.isFinite(seconds) ? seconds * 1000 : Date.parse(response.retryAfter) - now()
        if (Number.isFinite(supplied)) retryDelay = Math.max(0, Math.min(supplied, maxRetryAfterMs))
      } else {
        return { status: response.status, ok: response.ok, html: response.html }
      }
    } catch (error) {
      if (isPublicSourceTlsError(error) && tlsFallback) {
        try {
          const result = await tlsFallback(url, { timeoutMs, maxBytes })
          if (Buffer.byteLength(result.html, 'utf8') > maxBytes) throw new Error(`Public source response exceeds ${maxBytes} byte limit`)
          return result
        } catch (fallbackError) {
          throw new Error(`${detail(error)}; powershell fallback: ${fallbackError.stderr?.trim() || detail(fallbackError)}`)
        }
      }
      if (!isTransientPublicSourceError(error) || attempt === maxAttempts) throw new Error(detail(error), { cause: error })
    }
    await sleep(retryDelay)
  }
}
