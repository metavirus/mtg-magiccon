import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import './OfficialMapViewer.css'
import { OfficialMapLegend } from './OfficialMapLegend'
import { BlackLotusMark } from './BlackLotusMark'

type Camera = { zoom: number; x: number; y: number }
type Point = { x: number; y: number }
const initial: Camera = { zoom: 1, x: 0, y: 0 }
const maps = {
  floor: { file: 'official-show-floor.webp', width: 5250, height: 4110, alt: 'Official MagicCon Atlanta show floor, including entrances, Marketplace, Art of Magic, Ticketed Play and Command Zone' },
  levels: { file: 'official-other-floors.webp', width: 3210, height: 2010, alt: 'Official MagicCon Atlanta building levels: level 2 connects the areas; level 3 Mana Stage and Black Lotus lounge; level 4 ticketed merchandise pickup and World Championship viewing; level 5 official show store' },
}

export function OfficialMapViewer({ mode, focusLevelThree, loungeNextStops, onShowStore, onBlackLotus }: { mode: 'floor' | 'levels'; focusLevelThree?: boolean; loungeNextStops?: ReactNode; onShowStore?: () => void; onBlackLotus?: () => void }) {
  const map = maps[mode]
  const viewport = useRef<HTMLDivElement>(null)
  const legend = useRef<HTMLDialogElement>(null)
  const legendButton = useRef<HTMLButtonElement>(null)
  const [legendOpen, setLegendOpen] = useState(false)
  const pointers = useRef(new Map<number, Point>())
  const cameraRef = useRef<Camera>(initial)
  const [camera, setCamera] = useState(initial)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const fit = Math.min(size.width / map.width, size.height / map.height)
  const imageWidth = map.width * fit
  const imageHeight = map.height * fit
  const startZoom = mode === 'floor' && fit > 0 ? Math.max(1.35, Math.min(3, size.height / (fit * 2900))) : 1
  const startCamera: Camera = { zoom: startZoom, x: mode === 'floor' && size.width < 620 ? (map.width / 2 - 2350) * fit * startZoom : Math.max(0, (imageWidth * startZoom - size.width) / 2), y: Math.max(0, (imageHeight * startZoom - size.height) / 2) }
  // Both Level 3 rooms are printed in one callout on the official overview.
  const levelThree = { x: .331, y: .202 }
  const levelThreeOffset = (zoom: number) => ({
    x: (.5 - levelThree.x) * imageWidth * zoom,
    y: (.5 - levelThree.y) * imageHeight * zoom,
  })

  function update(next: Camera) {
    const zoom = Math.max(1, Math.min(12, next.zoom))
    const offset = focusLevelThree && zoom > 1 ? levelThreeOffset(zoom) : { x: 0, y: 0 }
    const limitX = Math.max(offset.x, (imageWidth * zoom - size.width) / 2)
    const limitY = Math.max(offset.y, (imageHeight * zoom - size.height) / 2)
    const value = { zoom, x: Math.max(-limitX, Math.min(limitX, next.x)), y: Math.max(-limitY, Math.min(limitY, next.y)) }
    cameraRef.current = value
    setCamera(value)
  }

  function zoomAt(factor: number, point: Point = { x: 0, y: 0 }) {
    const old = cameraRef.current
    const zoom = Math.max(1, Math.min(12, old.zoom * factor))
    const ratio = zoom / old.zoom
    update({ zoom, x: point.x - (point.x - old.x) * ratio, y: point.y - (point.y - old.y) * ratio })
  }

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    pointers.current.clear()
    const zoom = 2.6
    const entry = focusLevelThree && fit > 0 ? { zoom, ...levelThreeOffset(zoom) } : startCamera
    cameraRef.current = entry
    setCamera(entry)
  }, [mode, focusLevelThree, size.width, size.height])

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      zoomAt(Math.exp(-event.deltaY * 0.002), { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 })
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  })

  function point(event: ReactPointerEvent<HTMLDivElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 }
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return
    const before = [...pointers.current.values()]
    pointers.current.set(event.pointerId, point(event))
    const after = [...pointers.current.values()]
    if (after.length === 1) {
      update({ ...cameraRef.current, x: cameraRef.current.x + after[0].x - before[0].x, y: cameraRef.current.y + after[0].y - before[0].y })
    } else if (after.length === 2) {
      const midpoint = (points: Point[]) => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 })
      const distance = (points: Point[]) => Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      const oldMid = midpoint(before), newMid = midpoint(after)
      const old = cameraRef.current
      const zoom = Math.max(1, Math.min(12, old.zoom * distance(after) / Math.max(1, distance(before))))
      update({ zoom, x: newMid.x - (oldMid.x - old.x) * zoom / old.zoom, y: newMid.y - (oldMid.y - old.y) * zoom / old.zoom })
    }
  }

  const anchor = (x: number, y: number) => ({
    left: size.width / 2 + camera.x + (x - .5) * imageWidth * camera.zoom,
    top: size.height / 2 + camera.y + (y - .5) * imageHeight * camera.zoom,
  })

  return <div className="official-map-viewer">
    {mode === 'floor' && <button ref={legendButton} className="official-legend-toggle" type="button" aria-haspopup="dialog" aria-expanded={legendOpen} onClick={() => { legend.current?.showModal(); setLegendOpen(true) }}>Legend</button>}
    <div className="official-map-actions" aria-label="Map controls">
      <button type="button" onClick={() => zoomAt(1 / 1.5)} disabled={camera.zoom <= 1} aria-label="Zoom out">−</button>
      <button type="button" onClick={() => zoomAt(1.5)} disabled={camera.zoom >= 12} aria-label="Zoom in">+</button>
      <button type="button" className="official-map-reset" onClick={() => update(startCamera)}>Reset</button>
    </div>
    <div ref={viewport} className="official-map-viewport" tabIndex={0} role="region" aria-label={`${mode === 'floor' ? 'Show floor' : 'Other floors'} map. Use plus and minus to zoom, arrow keys to pan, and Home to reset.`}
      onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); pointers.current.set(event.pointerId, point(event)) }}
      onPointerMove={move}
      onPointerUp={event => pointers.current.delete(event.pointerId)}
      onPointerCancel={event => pointers.current.delete(event.pointerId)}
      onLostPointerCapture={event => pointers.current.delete(event.pointerId)}
      onKeyDown={event => {
        if (['+', '=', '-', 'Home', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault()
        if (event.key === '+' || event.key === '=') zoomAt(1.5)
        if (event.key === '-') zoomAt(1 / 1.5)
        if (event.key === 'Home') update(startCamera)
        const delta: Record<string, Point> = { ArrowLeft: { x: 60, y: 0 }, ArrowRight: { x: -60, y: 0 }, ArrowUp: { x: 0, y: 60 }, ArrowDown: { x: 0, y: -60 } }
        if (delta[event.key]) update({ ...cameraRef.current, x: cameraRef.current.x + delta[event.key].x, y: cameraRef.current.y + delta[event.key].y })
      }}>
      <img src={`${import.meta.env.BASE_URL}maps/${map.file}`} alt={map.alt} draggable={false} width={map.width} height={map.height}
        style={{ width: imageWidth || '100%', height: imageHeight || 'auto', transform: `translate(calc(-50% + ${camera.x}px), calc(-50% + ${camera.y}px)) scale(${camera.zoom})` }} />
      {mode === 'levels' && fit > 0 && <span className="official-lotus-anchor"
        onPointerDown={event => event.stopPropagation()}
        style={anchor(.435, .15)}>
        {onBlackLotus
          ? <button className="official-lotus-marker official-lotus-catalog" type="button" aria-label="Black Lotus catalog" onClick={onBlackLotus}><BlackLotusMark /></button>
          : <span className="official-lotus-marker" role="img" aria-label="Black Lotus VIP Lounge, Level 3"><BlackLotusMark /></span>}
        {loungeNextStops}
      </span>}
      {mode === 'levels' && fit > 0 && onShowStore && <button type="button" className="official-store-catalog"
        aria-label="Show Store catalog" onPointerDown={event => event.stopPropagation()} onClick={onShowStore}
        style={anchor(.78, .087)}>Catalog <span aria-hidden="true">›</span></button>}
    </div>
    {mode === 'floor' && <dialog ref={legend} className="official-legend-drawer" aria-labelledby="official-legend-title" onClose={() => { setLegendOpen(false); legendButton.current?.focus() }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close() } }}>
      <header><h2 id="official-legend-title">Map legend</h2><button type="button" aria-label="Close legend" onClick={() => legend.current?.close()} autoFocus>×</button></header>
      <div className="official-legend-scroll"><OfficialMapLegend /></div>
    </dialog>}
  </div>
}
