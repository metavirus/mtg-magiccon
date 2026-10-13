import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { blackLotusDaySummary, blackLotusExploreEvents, blackLotusLogistics, blackLotusRetiredEvents, blackLotusSessions, blackLotusSource } from './blackLotusSchedule'

describe('reviewed Black Lotus source hydration', () => {
  it('keeps the cloud reviewed artifact identical to the deployed catalog', () => {
    const artifact = JSON.parse(readFileSync('src/data/blackLotusSchedule-reviewed.json', 'utf8'))
    expect(artifact).toEqual({ source: blackLotusSource, sessions: blackLotusSessions, logistics: blackLotusLogistics })
  })

  it('retains every legacy selection key while replacing stale facts', () => {
    const byId = new Map([...blackLotusExploreEvents, ...blackLotusRetiredEvents].map(event => [event.id, event]))
    for (const id of ['bl-progressive-sealed', 'bl-first-look-thursday', 'bl-thursday-tbd-2', 'bl-thursday-tbd-3', 'bl-thursday-tbd-530', 'bl-design-planechase', 'bl-paint-sip', 'bl-welcome-reception', 'bl-friday-play-event', 'bl-planechase', 'bl-mystery-booster-drafts', 'bl-feedback-session']) expect(byId.has(id)).toBe(true)
    expect(byId.get('bl-design-planechase')?.time).toBe('4:30-5:30 PM')
    expect(byId.get('bl-paint-sip')?.time).toBe('6-7:30 PM')
    expect(byId.get('bl-welcome-reception')?.time).toBe('8:45-11 PM')
    expect(byId.get('bl-feedback-session')?.time).toBe('4-5 PM')
    expect(byId.get('bl-friday-play-event')?.format).toBe('8-pack Sealed Two-Headed Giant')
    expect(byId.get('bl-progressive-sealed')?.detail).toContain('Star Trek play boosters')
    expect(blackLotusExploreEvents.every(event => event.state === 'none' && !('purchased' in event))).toBe(true)
    expect(byId.get('bl-iconic-deck-histories')).toMatchObject({ time: '3:15-4 PM', state: 'none' })
    expect(byId.get('bl-thursday-tbd-530')).toMatchObject({ time: '5:30-6:15 PM', availability: 'changed' })
    expect(blackLotusSessions.some(event => event.id === 'bl-thursday-tbd-530')).toBe(false)
    expect(blackLotusRetiredEvents[0].detail).toContain('has not been transferred')
  })

  it('covers the full reviewed daily program without inventing an end time or turning logistics into commitments', () => {
    expect(blackLotusSessions).toHaveLength(25)
    expect(new Set(blackLotusSessions.map(event => event.id)).size).toBe(25)
    expect(blackLotusExploreEvents.find(event => event.id === 'bl-thursday-tbd-3')).toMatchObject({ time: '3 PM', window: 'End time not published' })
    expect(blackLotusSessions.filter(event => event.id.startsWith('bl-mega-game-')).map(event => [event.day, event.time])).toEqual([['Fri', '3:30-6:30 PM'], ['Sat', '3:30-6:30 PM'], ['Sun', '2:30-5:30 PM']])
    expect(blackLotusSessions.filter(event => event.id.startsWith('bl-mega-game-')).every(event => event.detail.includes('no later than 2:00 PM'))).toBe(true)
    expect(blackLotusSessions.filter(event => event.id.startsWith('bl-coffee-chat-'))).toHaveLength(3)
    expect(blackLotusSessions.filter(event => event.format === 'Meet & greet')).toHaveLength(5)
    expect(blackLotusSessions.some(event => /Lounge (Opens|Closed)|Beverage Service|Priority Entry|Registration Closes/.test(event.title))).toBe(false)
    expect(blackLotusDaySummary('Thu')).toContain('6 PM registration closes')
    expect(blackLotusDaySummary('Fri')).not.toContain('pre-order pickup')
    expect(blackLotusDaySummary('Sun')).toContain('4-5 PM BL Meet & Greet / Feedback Session')
  })

  it('removes obsolete inline definitions and uses the shared source in calendar details', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    expect(app).toContain('...blackLotusExploreEvents')
    expect(app).toContain('...blackLotusRetiredEvents')
    expect(app).toContain("'bl-progressive-sealed': 'tentative'")
    expect(app).toContain("'bl-feedback-session': 'interested'")
    expect(app).not.toContain('Black Lotus Content TBD')
    expect(app).not.toContain("if (event.id === 'bl-friday-play-event') return 'Details pending'")
    expect(app).not.toContain('Online store pre-order pickup begins')
    for (const day of ['Thu', 'Fri', 'Sun']) expect(app).toContain(`blackLotusDaySummary('${day}')`)
  })
})
