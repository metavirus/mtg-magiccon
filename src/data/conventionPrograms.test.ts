import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import snapshot from './conventionPrograms.json'
import { conventionProgramEvents, councilsCallEvents } from './conventionPrograms'

describe('reviewed official convention programs', () => {
  it('includes every retained session once with exact event-bound identity', () => {
    expect(conventionProgramEvents).toHaveLength(88)
    expect(new Set(conventionProgramEvents.map(event => event.id)).size).toBe(88)
    expect(snapshot.sources.map(source => source.count)).toEqual([48, 19, 21])
    expect(snapshot.sources.every(source => source.eventId === '21389' && source.eventSlug === 'htwhdatl26shdl10')).toBe(true)
    expect(conventionProgramEvents.filter(event => event.kind === 'Family Magic')).toHaveLength(19)
    for (const session of snapshot.sessions) expect(session.detailUrl).toContain(`gtID=${session.id}`)
    expect(snapshot.sources.map(source => [source.sourceId, source.scheduleHash])).toEqual([
      ['atlanta-experience-panels-and-events', '677aaa0e62943d43ee6fcdc2ac061172e85f3ce9decf7f0d72f3298cc7bef442'],
      ['atlanta-experience-meet-and-greets', '0abf1fe70bb6f92cc788601e7c3b07ad4d978fc4dcf12f89c2ab1c7de7f72392'],
      ['atlanta-gathering-grounds-schedule', '0f69d52bbe11bbeecb7baddfb9a0128109b2de8416056a500a5ac0c3acde5a42'],
    ])
    for (const source of snapshot.sources) {
      expect(snapshot.sessions.filter(session => session.sourceId === source.sourceId)).toHaveLength(source.count)
      expect(source.contentHash).toMatch(/^[a-f0-9]{64}$/)
      expect(source.contentLinkHash).toMatch(/^[a-f0-9]{64}$/)
    }
    const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
    expect(app).toContain("import { conventionProgramEvents, councilsCallEvents } from './data/conventionPrograms'")
    expect(app).toContain('...conventionProgramEvents,')
    expect(app).toContain('...councilsCallEvents,')
  })
  it('hydrates reviewed October 22 participants into selectable session details', () => {
    for (const [id, names] of [['954664', ['Anna Margaret']], ['954668', ['Anna Margaret', 'Lua Stardust', 'Lauren Bond']], ['954670', ['TheAsianAvenger']], ['954671', ['Becca Scott']]] as const) {
      for (const name of names) expect(conventionProgramEvents.find(event => event.id === `program-${id}`)?.detail).toContain(name)
    }
    for (const id of ['954700', '954701']) expect(snapshot.sessions.find(session => session.id === id)?.description).toContain('Priority seating for Family Spark')
  })
  it('preserves existing identities and Atlanta wall times without shifting timezone', () => {
    expect(conventionProgramEvents.find(event => event.id === 'program-954674')).toMatchObject({ day: 'Fri', time: '5 PM–6 PM' })
    expect(conventionProgramEvents.find(event => event.id === 'program-954669')).toMatchObject({ day: 'Sat', time: '6:45 PM–9 PM' })
    expect(conventionProgramEvents.find(event => event.id === 'program-955653')).toMatchObject({ day: 'Sun', time: '1 PM–2 PM' })
    expect(snapshot.sessions.every(session => /^2026-11-(13|14|15) /.test(session.startTime))).toBe(true)
  })
  it('does not seed attendance or purchase and distinguishes separate paid dinners', () => {
    expect([...conventionProgramEvents, ...councilsCallEvents].every(event => event.state === 'none')).toBe(true)
    expect(councilsCallEvents).toHaveLength(2)
    expect(councilsCallEvents.map(event => event.id)).toEqual(['council-call-1', 'council-call-2'])
    expect(councilsCallEvents.every(event => event.price === '$299' && event.detail.includes('checkout availability is not verified'))).toBe(true)
    expect(conventionProgramEvents.find(event => event.id === 'program-954720')?.detail).toContain('8:30 AM')
    expect(conventionProgramEvents.find(event => event.id === 'program-954458')?.window).toContain('End time not clarified')
  })
})
