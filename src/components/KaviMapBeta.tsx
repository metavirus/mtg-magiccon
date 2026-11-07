import { useEffect, useRef, useState } from 'react'
import { readMapMessage, type MapPlaceRequest, type MapUpperPlace } from '../lib/kaviMapBridge'
import type { MapRoomEvent } from '../lib/mapPersonalEvents'
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

type FrameSchedule = {
  roomEvents: Record<string, MapRoomEvent[]>
  nextRooms: Record<string, Array<{ person: string; title: string; eventId: string }>>
  eventHits: Array<{ id: string; title: string; day: string; time: string; targetId: string; location: string }>
  eventPeople: Record<string, string[]>
  initialPlaceId?: string
  canOpenPrizeCatalog: boolean
}

export function KaviMapBeta({ schedule, canOpenPlace, onOpenPlace, onOtherFloors, onOpenEvent, onOpenPrizeCatalog, onReturn }: {
  schedule: FrameSchedule
  canOpenPlace: (place: MapPlaceRequest) => boolean
  onOpenPlace: (place: MapPlaceRequest) => void
  onOtherFloors: (placeId?: MapUpperPlace) => void
  onOpenEvent: (eventId: string) => void
  onOpenPrizeCatalog?: () => void
  onReturn?: () => void
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const lastPlace = useRef<MapPlaceRequest | null>(null)
  useEffect(() => {
    const reply = (place: MapPlaceRequest) => frame.current?.contentWindow?.postMessage({ type: 'kavimap:available', version: 1, place, available: canOpenPlace(place) }, '*')
    if (lastPlace.current) reply(lastPlace.current)
    const receive = (event: MessageEvent) => {
      const message = readMapMessage(event, frame.current?.contentWindow)
      if (!message) return
      if (message.type === 'kavimap:levels') onOtherFloors(message.placeId)
      else if (message.type === 'kavimap:event') {
        if (schedule.eventHits.some(event => event.id === message.eventId)) onOpenEvent(message.eventId)
      }
      else if (message.type === 'kavimap:catalog') onOpenPrizeCatalog?.()
      else if (message.type === 'kavimap:return') onReturn?.()
      else if (message.type === 'kavimap:select') { lastPlace.current = message.place; reply(message.place) }
      else if (canOpenPlace(message.place)) onOpenPlace(message.place)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [canOpenPlace, onOpenPlace, onOtherFloors, onOpenEvent, onOpenPrizeCatalog, onReturn, schedule.eventHits])
  useEffect(() => {
    const sendSchedule = () => frame.current?.contentWindow?.postMessage({
      type: 'kavimap:schedule', version: 1, ...schedule,
    }, '*')
    const receive = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.origin === 'null' &&
          event.data?.type === 'kavimap:ready' && event.data.version === 1) sendSchedule()
    }
    window.addEventListener('message', receive)
    sendSchedule()
    return () => window.removeEventListener('message', receive)
  }, [schedule])
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
  return <iframe onLoad={()=>frame.current?.contentWindow?.postMessage({type:'kavimap:capabilities',version:1,levels:true}, '*')} ref={frame} className="kavimap-beta-frame" srcDoc={html} sandbox="allow-scripts" title="KaviMap™ Beta" />
}
