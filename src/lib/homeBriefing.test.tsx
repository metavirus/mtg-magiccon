import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HomeBriefing } from '../components/HomeBriefing'
import { briefingPreview, buildHomeBriefing, type BriefingSignal } from './homeBriefing'

afterEach(cleanup)
const now = Date.parse('2026-10-07T12:00:00Z')
function item(id: string, title: string, summary = 'Useful context. More detail remains in the original notice.', severity = 'notice', days = 1): BriefingSignal {
  return { id, title, summary, severity, checkedAtIso: new Date(now - days * 86_400_000).toISOString(), sourceKind: 'monitor', objectDetail: { kind: 'alert' } }
}

describe('Home briefing', () => {
  it('chooses useful published information ahead of newer marketing and keeps related notices together', () => {
    const notices = [item('special', 'Exhibitor specials preview'), item('badge', 'Weekend badges sold out'), item('directory', 'Exhibitor directory published', undefined, 'notice', 4), item('panels', 'Panel schedule published', undefined, 'notice', 4), item('guest', 'Guest programming preview')]
    const briefing = buildHomeBriefing(notices, now)
    expect(briefing.spotlights.map(group => group.items[0].id)).toEqual(['panels', 'directory'])
    expect(briefing.spotlights[0].items.map(notice => notice.id)).toEqual(['panels', 'guest'])
    expect(briefing.spotlights[1].items.map(notice => notice.id)).toEqual(['directory', 'special'])
    expect(briefing.sections.at(-1)?.key).toBe('quiet')
  })

  it('conserves every eligible notice once without a list cap and preserves original detail callbacks', () => {
    const notices = Array.from({ length: 17 }, (_, index) => item(`artist-${index}`, `Artist signing plans ${index}`))
    notices.push(item('wristband', 'Wristband pickup changed'), item('meetup', 'Meet & greet schedule published'), item('badge', 'Weekend badges sold out'))
    const open = vi.fn()
    const { container } = render(<HomeBriefing items={notices} now={now} onOpenItem={open} renderIcon={() => null} renderPeople={() => null} />)
    expect(container.querySelectorAll('.home-briefing-item')).toHaveLength(notices.length)
    for (const notice of notices) {
      fireEvent.click(screen.getByRole('button', { name: `${notice.title} ${briefingPreview(notice.summary)} Recent` }))
      expect(open).toHaveBeenLastCalledWith(notice)
    }
    expect(container.querySelector('.quiet')).toBeTruthy()
  })

  it('keeps true urgency ahead of ordinary spotlights and respects featured sale space', () => {
    const notices = [item('panels', 'Panel schedule published'), item('pickup', 'Wristband pickup changed', undefined, 'hot', 0)]
    const briefing = buildHomeBriefing(notices, now, 1)
    expect(briefing.spotlights).toHaveLength(1)
    expect(briefing.spotlights[0].items[0].id).toBe('pickup')
    expect(briefing.sections.flatMap(section => section.groups.flatMap(group => group.items)).map(notice => notice.id)).toEqual(['panels'])
  })

  it('uses one compact sentence without changing the original summary', () => {
    const notice = item('panel', 'Panel schedule published')
    expect(briefingPreview(notice.summary)).toBe('Useful context.')
    expect(notice.summary).toContain('More detail')
    expect(briefingPreview('Long description '.repeat(30)).length).toBeLessThanOrEqual(160)
  })

  it('keeps all currently hot topics ahead of ordinary content regardless of spotlight slots', () => {
    const notices = [item('panels', 'Panel schedule published'), item('pickup', 'Wristband pickup changed', undefined, 'hot', 0), item('artist', 'Artist signing change', undefined, 'hot', 0), item('tickets', 'Ticket availability changed', undefined, 'hot', 0)]
    const briefing = buildHomeBriefing(notices, now, 1)
    expect(briefing.spotlights.map(group => group.items[0].id)).toEqual(['pickup', 'artist', 'tickets'])
    expect(briefing.sections.flatMap(section => section.groups.flatMap(group => group.items)).map(notice => notice.id)).toEqual(['panels'])
  })

  it('routes dinner by its title even when its summary mentions tickets', () => {
    const briefing = buildHomeBriefing([item('dinner', "Council's Call dinner", 'Tickets are available for this hosted experience.'), item('family', 'Family drawing workshop with a visiting artist', 'Artists will lead drawing activities.')], now)
    expect(briefing.sections[0].key).toBe('shows')
    expect(briefing.sections[0].groups[0].items).toHaveLength(2)
  })
})
