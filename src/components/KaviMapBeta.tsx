import { useCallback, useEffect, useRef, useState } from 'react'
import { readMapMessage, type MapGuidePlace, type MapPlaceRequest, type MapUpperPlace } from '../lib/kaviMapBridge'
import type { MapRoomEvent } from '../lib/mapPersonalEvents'

type FrameSchedule = {
  roomEvents: Record<string, MapRoomEvent[]>
  nextRooms: Record<string, Array<{ person: string; title: string; eventId: string }>>
  eventHits: Array<{ id: string; title: string; day: string; time: string; targetId: string; location: string }>
  eventPeople: Record<string, string[]>
  initialPlaceId?: string
  canOpenPrizeCatalog: boolean
  guidePlaces?: MapGuidePlace[]
}

let rendererRequest: Promise<string> | undefined
function loadPublicRenderer() {
  rendererRequest ??= fetch(`${import.meta.env.BASE_URL}kavimap/index.html`)
    .then(response => {
      if (!response.ok) throw new Error('Map file unavailable')
      return response.text()
    })
    .catch(error => {
      rendererRequest = undefined
      throw error
    })
  return rendererRequest
}

export function KaviMapBeta({ schedule, canOpenPlace, onOpenPlace, onOtherFloors, onOpenEvent, onOpenPrizeCatalog, onOpenGuide, onReturn }: {
  schedule: FrameSchedule
  canOpenPlace: (place: MapPlaceRequest) => boolean
  onOpenPlace: (place: MapPlaceRequest) => void
  onOtherFloors: (placeId?: MapUpperPlace) => void
  onOpenEvent: (eventId: string) => void
  onOpenGuide?: (placeId: MapGuidePlace) => void
  onOpenPrizeCatalog?: () => void
  onReturn?: () => void
}) {
  const [html, setHtml] = useState<string>()
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const frame = useRef<HTMLIFrameElement>(null)
  const lastPlace = useRef<MapPlaceRequest | null>(null)
  useEffect(() => {
    let active = true
    // The host can read the precache even when the opaque frame cannot navigate offline.
    void loadPublicRenderer().then(
      renderer => { if (active) setHtml(renderer) },
      () => { if (active) setFailed(true) },
    )
    return () => { active = false }
  }, [attempt])
  const sendSchedule = useCallback(() => frame.current?.contentWindow?.postMessage({
    type: 'kavimap:schedule', version: 1, ...schedule,
  }, '*'), [schedule])
  const syncFrame = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: 'kavimap:capabilities', version: 1, levels: true }, '*')
    sendSchedule()
  }, [sendSchedule])
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
      else if (message.type === 'kavimap:guide') {
        if (schedule.guidePlaces?.includes(message.placeId)) onOpenGuide?.(message.placeId)
      }
      else if (message.type === 'kavimap:catalog') onOpenPrizeCatalog?.()
      else if (message.type === 'kavimap:return') onReturn?.()
      else if (message.type === 'kavimap:select') { lastPlace.current = message.place; reply(message.place) }
      else if (canOpenPlace(message.place)) onOpenPlace(message.place)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [canOpenPlace, onOpenPlace, onOtherFloors, onOpenEvent, onOpenPrizeCatalog, onReturn, onOpenGuide, schedule.eventHits, schedule.guidePlaces])
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.origin === 'null' &&
          event.data?.type === 'kavimap:ready' && event.data.version === 1) syncFrame()
    }
    window.addEventListener('message', receive)
    sendSchedule()
    return () => window.removeEventListener('message', receive)
  }, [sendSchedule, syncFrame])
  if (failed) return <p role="status">Couldn’t load KaviMap. <button type="button" onClick={() => {
    setFailed(false)
    setAttempt(value => value + 1)
  }}>Retry</button></p>
  if (!html) return <p role="status">Loading KaviMap…</p>
  return <iframe onLoad={syncFrame} ref={frame} className="kavimap-beta-frame"
    srcDoc={html} sandbox="allow-scripts" title="KaviMap™ Beta" />
}
