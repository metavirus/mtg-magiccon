import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useKaviMapAccess(accountId: string | undefined) {
  const [authorizedAccount, setAuthorizedAccount] = useState<string>()

  useEffect(() => {
    if (!accountId || !supabase) return
    const request = new AbortController()
    void supabase.from('kavimap_beta_release').select('id').eq('id', 'current')
      .abortSignal(request.signal).maybeSingle().then(({ data }) => {
        if (!request.signal.aborted) setAuthorizedAccount(data ? accountId : undefined)
      })
    return () => request.abort()
  }, [accountId])

  return Boolean(accountId && authorizedAccount === accountId)
}

export function KaviMapBeta() {
  const [html, setHtml] = useState<string>()
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!supabase) return
    const request = new AbortController()
    void supabase.from('kavimap_beta_release').select('html').eq('id', 'current')
      .abortSignal(request.signal).maybeSingle().then(({ data }) => {
        if (request.signal.aborted) return
        if (data?.html) setHtml(data.html)
        else setFailed(true)
      })
    return () => request.abort()
  }, [attempt])

  if (failed) return <div role="status">KaviMap™ Beta is unavailable. <button type="button" onClick={() => {
    setFailed(false)
    setAttempt(value => value + 1)
  }}>Try again</button></div>
  if (!html) return <p role="status">Loading KaviMap™ Beta…</p>
  return <iframe className="kavimap-beta-frame" srcDoc={html} sandbox="allow-scripts" title="KaviMap™ Beta" />
}
