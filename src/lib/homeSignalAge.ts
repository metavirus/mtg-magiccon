const DAY_MS = 24 * 60 * 60 * 1000
export const TICKETED_PLAY_SALE_OPENED_AT = '2026-08-25T17:00:00.000Z'

export type HomeSignalAgeBucket = 'recent' | 'earlier'

type FeatureableHomeSignal = {
  conceptKey?: string | null
  monitoringConcept?: { current_state: Record<string, unknown> }
}

export function isTicketedPlaySaleOpen(item: FeatureableHomeSignal) {
  return item.conceptKey === 'atlanta:ticketed-play:sales-opening'
    && item.monitoringConcept?.current_state?.phase === 'open'
}

export function ticketedPlaySaleHasOpened(now = Date.now()) {
  return now >= new Date(TICKETED_PLAY_SALE_OPENED_AT).getTime()
}

export function isFeaturedTicketedPlaySale(item: FeatureableHomeSignal, now = Date.now()) {
  if (!isTicketedPlaySaleOpen(item)) return false
  const state = item.monitoringConcept?.current_state
  const openedAt = new Date(String(state?.milestone_opened_at ?? '')).getTime()
  return Number.isFinite(openedAt) && now >= openedAt && now - openedAt <= 7 * DAY_MS
}

export function homeSignalAgeBucket(checkedAtIso: string, now = Date.now()): HomeSignalAgeBucket | null {
  const checkedAt = new Date(checkedAtIso).getTime()
  if (!Number.isFinite(checkedAt)) return null
  const ageDays = Math.max(0, now - checkedAt) / DAY_MS
  if (ageDays <= 3) return 'recent'
  if (ageDays <= 14) return 'earlier'
  return null
}

export function homeSignalIsHotNow(checkedAtIso: string, now = Date.now()) {
  const checkedAt = new Date(checkedAtIso).getTime()
  return Number.isFinite(checkedAt) && now >= checkedAt && now - checkedAt <= DAY_MS
}

export function partitionHomeSignals<T extends { severity: string; checkedAtIso: string }>(items: T[], now = Date.now()) {
  const hotNow = items.filter(item => item.severity === 'hot' && homeSignalIsHotNow(item.checkedAtIso, now))
  return {
    hotNow,
    recent: items.filter(item => !hotNow.includes(item) && homeSignalAgeBucket(item.checkedAtIso, now) === 'recent'),
    earlier: items.filter(item => homeSignalAgeBucket(item.checkedAtIso, now) === 'earlier'),
  }
}
