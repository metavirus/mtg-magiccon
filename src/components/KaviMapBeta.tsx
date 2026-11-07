import { useEffect, useRef } from 'react'
import { readMapMessage, type MapPlaceRequest, type MapUpperPlace } from '../lib/kaviMapBridge'
import type { MapRoomEvent } from '../lib/mapPersonalEvents'

type FrameSchedule = {
  roomEvents: Record<string, MapRoomEvent[]>
  nextRooms: Record<string, Array<{ person: string; title: string; eventId: string }>>
  eventHits: Array<{ id: string; title: string; day: string; time: string; targetId: string; location: string }>
  eventPeople: Record<string, string[]>
  initialPlaceId?: string
  canOpenPrizeCatalog: boolean
}

export function KaviMapBeta({ html, schedule, canOpenPlace, onOpenPlace, onOtherFloors, onOpenEvent, onOpenPrizeCatalog, onReturn }: {
  html: string
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
  return <iframe onLoad={()=>frame.current?.contentWindow?.postMessage({type:'kavimap:capabilities',version:1,levels:true}, '*')} ref={frame} className="kavimap-beta-frame" srcDoc={html} sandbox="allow-scripts" title="KaviMap™ Beta" />
}
