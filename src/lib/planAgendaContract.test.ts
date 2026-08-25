import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const ticketedEventsSource = readFileSync(resolve(process.cwd(), 'src/data/ticketedPlayExploreEvents.ts'), 'utf8')

describe('Plan agenda flexible-lane contract', () => {
  it('keeps Mage Tower flexible without using the generic flexible tag to hide real timed leagues', () => {
    expect(appSource).toContain('/mage tower league/i.test')
    expect(appSource).not.toContain("event.tags.some(tag => tag.toLowerCase() === 'flexible')")
    expect(ticketedEventsSource).toContain('"title": "Mage Tower League - Vigorbloom"')
    expect(ticketedEventsSource).toContain('"title": "Commander and Cocktails League with Brian David-Marshall"')
    expect(ticketedEventsSource).toContain('"time": "7 PM–10:25 PM"')
  })
})
