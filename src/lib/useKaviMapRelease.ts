import { useEffect, useState } from 'react'
import { clearOfflineLane, readOfflineLane, usableOfflineLane, writeOfflineLane } from './offlineLaneCache'
import { withReadDeadline } from './screenFreshness'
import { supabase } from './supabase'

type MapRelease = { ownerId: string; html: string; saved: boolean; fromDevice: boolean }

/** Only the RLS-protected response can seed this account's device copy. */
export function useKaviMapRelease(ownerId: string | undefined, sessionOwnerId: string | undefined, online: boolean, foreground: boolean) {
  const [release, setRelease] = useState<MapRelease>()
  useEffect(() => {
    if (!ownerId || ownerId.startsWith('preview-')) return
    const request = new AbortController()
    const current = () => !request.signal.aborted
    const restore = async () => {
      const saved = await withReadDeadline(readOfflineLane(ownerId, 'kaviMap'), 1500).catch(() => null)
      if (current() && typeof saved?.value === 'string') {
        setRelease({ ownerId, html: saved.value, saved: true, fromDevice: true })
      }
    }
    const download = async () => {
      if (!supabase || ownerId !== sessionOwnerId) return
      try {
        const { data, error, status } = await withReadDeadline(supabase.from('kavimap_beta_release').select('html')
          .eq('id', 'current').abortSignal(request.signal).maybeSingle())
        if (!current()) return
        if (error && status === 0) { await restore(); return }
        if (error || !data) {
          setRelease(undefined)
          if (!error || status === 403) await clearOfflineLane(ownerId, 'kaviMap').catch(() => {})
          return
        }
        if (!usableOfflineLane('kaviMap', data.html)) { await restore(); return }
        const html = data.html
        setRelease({ ownerId, html, saved: false, fromDevice: false })
        await writeOfflineLane(ownerId, 'kaviMap', html).then(() => {
          if (!current()) return
          setRelease(previous => previous?.ownerId === ownerId && previous.html === html
            ? { ...previous, saved: true }
            : previous)
        }).catch(() => { /* The shared device save notice shows the retry. */ })
      } catch {
        if (!current()) return
        // A device can report online with no working connection.
        await restore()
      }
    }
    const timer = online ? setTimeout(() => void download(), foreground ? 0 : 1500) : undefined
    if (!online) void restore()
    return () => { clearTimeout(timer); request.abort() }
    // Foreground is a startup scheduling hint; navigation must not refetch the renderer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, sessionOwnerId, online])

  return release?.ownerId === ownerId && (!online || sessionOwnerId === ownerId) ? release : undefined
}
