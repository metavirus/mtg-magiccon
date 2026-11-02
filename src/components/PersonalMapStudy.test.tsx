import { act, render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PersonalMapStudy, mapStudyDocumentUrl } from './PersonalMapStudy'
import type { MapEventInput } from '../lib/mapPersonalEvents'

afterEach(cleanup)

const event: MapEventInput = { id: 'ticketed-944011', title: 'Current owner event', day: 'Fri', time: '11 AM', state: 'committed', purchased: true, price: '$100' }
describe('opt-in personal study frame', () => {
  it('binds the frame document to the release without carrying sample or owner parameters', () => {
    expect(mapStudyDocumentUrl('?review=fc167a1&sampleEvents=1&previewOwner=kavi', '49e31f9')).toBe('./map-preview/index.html?personal=1&v=fc167a1')
    expect(mapStudyDocumentUrl('?review=invalid', '49e31f9')).toBe('./map-preview/index.html?personal=1&v=49e31f9')
  })

  it('sends current projected choices in memory and clears them when owner readiness changes', () => {
    const view = render(<PersonalMapStudy events={[event]} ownerReady />)
    const frame = view.getByTitle('Personal map study') as HTMLIFrameElement
    expect(frame.getAttribute('src')).toBe('./map-preview/index.html?personal=1&v=local')
    const send = vi.spyOn(frame.contentWindow!, 'postMessage')
    act(() => window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, origin: window.location.origin, data: { type: 'magiccon:map-study-ready', version: 1 } })))
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ events: [expect.objectContaining({ id: event.id, status: 'paid', locationId: null })] }), window.location.origin)
    view.rerender(<PersonalMapStudy events={[event]} ownerReady={false} />)
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ events: [], products: null }), window.location.origin)
    view.rerender(<PersonalMapStudy events={[]} ownerReady />)
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ events: [] }), window.location.origin)
  })
  it('does not disclose events to unrelated frame messages or a different origin', () => {
    const view = render(<PersonalMapStudy events={[event]} ownerReady />)
    const frame = view.getByTitle('Personal map study') as HTMLIFrameElement
    const send = vi.spyOn(frame.contentWindow!, 'postMessage')
    for (const message of [{ source: window, origin: window.location.origin }, { source: frame.contentWindow, origin: 'https://other.test' }]) {
      act(() => window.dispatchEvent(new MessageEvent('message', { ...message, data: { type: 'magiccon:map-study-ready', version: 1 } })))
    }
    expect(send).not.toHaveBeenCalled()
  })
})
