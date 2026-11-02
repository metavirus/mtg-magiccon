import type { CatalogReadModel } from '../lib/catalog'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { mapStudyMessage, selectMapPersonalEvents, selectMapProducts, type MapEventInput } from '../lib/mapPersonalEvents'

/** Explicit opt-in study host; does not replace the accepted Map surface. */
export function PersonalMapStudy({ events, ownerReady, catalog }: { events: MapEventInput[]; ownerReady: boolean; catalog?: CatalogReadModel }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const current = useRef({ events, ownerReady, catalog })
  current.current = { events, ownerReady, catalog }
  const send = () => frame.current?.contentWindow?.postMessage({
    type: 'magiccon:map-study-events', version: 1,
    events: current.current.ownerReady ? selectMapPersonalEvents(current.current.events) : [],
    products: current.current.ownerReady ? selectMapProducts(current.current.catalog) : null,
  }, window.location.origin)
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (mapStudyMessage(event, frame.current?.contentWindow, window.location.origin)) send()
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])
  useLayoutEffect(send, [events, ownerReady, catalog])
  return <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
    <div style={{ padding: '6px 12px', fontSize: 12 }}>{ownerReady ? 'Your map' : 'Loading your events…'} <a href="./" style={{ color: '#eed1a0', marginLeft: 8 }}>Return to app</a></div>
    <iframe ref={frame} title="Personal map study" src="./map-preview/index.html?personal=1" onLoad={send} sandbox="allow-scripts allow-same-origin" style={{ width: '100%', flex: 1, minHeight: 0, border: 0 }} />
  </div>
}
