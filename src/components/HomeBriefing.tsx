import type { ReactNode } from 'react'
import { briefingAgeLabel, briefingPreview, buildHomeBriefing, type BriefingSignal } from '../lib/homeBriefing'
import './HomeBriefing.css'

export function HomeBriefing<T extends BriefingSignal>({ items, now, spotlightSlots = 2, onOpenItem, renderIcon, renderPeople }: {
  items: T[]
  now: number
  spotlightSlots?: number
  onOpenItem: (item: T) => void
  renderIcon: (item: T) => ReactNode
  renderPeople: (item: T) => ReactNode
}) {
  const briefing = buildHomeBriefing(items, now, spotlightSlots)
  const leftSections = briefing.sections.filter(section => ['marketplace', 'practical', 'other'].includes(section.key))
  const rightSections = briefing.sections.filter(section => ['shows', 'collaboration'].includes(section.key))
  const row = (item: T) => <button type="button" className={`home-briefing-item ${item.severity}`} key={item.id} onClick={() => onOpenItem(item)}>
    <span className="home-briefing-icon" aria-hidden="true">{renderIcon(item)}</span>
    <span className="home-briefing-copy"><strong>{item.title}</strong><span>{briefingPreview(item.summary)}</span></span>
    <span className="home-briefing-meta"><small>{briefingAgeLabel(item, now)}</small>{renderPeople(item)}<b aria-hidden="true">›</b></span>
  </button>
  const sectionView = (section: typeof briefing.sections[number]) => <section className={`home-briefing-section ${section.key}`} key={section.key} aria-label={section.label}>
    <header><h3>{section.label}</h3><small>{section.groups.reduce((total, group) => total + group.items.length, 0)}</small></header>
    {section.groups.map(group => <div className="home-briefing-related" key={group.key}>{group.items.map(row)}</div>)}
  </section>
  return <div className="home-briefing">
    {briefing.spotlights.length > 0 && <div className="home-briefing-spotlights" aria-label="Briefing spotlights">
      {briefing.spotlights.map(group => <section className={`home-briefing-spotlight ${group.score >= 100 ? 'urgent' : ''}`} key={group.key} aria-label={`${group.label} spotlight`}>
        <h3>{group.score >= 100 ? 'Hot now' : group.label}</h3>
        {group.items.map(row)}
      </section>)}
    </div>}
    <div className={`home-briefing-sections ${leftSections.length && rightSections.length ? 'has-two-stacks' : ''}`}>
      {briefing.sections.map(sectionView)}
    </div>
  </div>
}
