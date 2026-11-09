import type { Surface } from './navigation'
import type { ContinuityLane } from './offlineContinuity'

export type ScreenRead = { state: 'checking' | 'current' | 'failed'; checkedAt?: string; savedAt?: string }
export type InfoView = 'guide' | 'catalogs' | 'import' | 'exhibitors' | 'prize_wall'

const requiredReads: Record<Surface, ContinuityLane[]> = {
  home: ['selections', 'flights', 'activity', 'findings', 'monitorAlerts'],
  calendar: ['selections', 'flights'],
  plan: ['selections'],
  explore: ['selections', 'ticketedAvailability'],
  wallet: ['walletReceipts'],
  trip: ['flights'],
  info: ['info'],
  map: [],
  artists: ['artistCatalog', 'artistSigningInterests'],
  notes: ['notes'],
  activity: ['activity', 'findings', 'selections', 'monitorAlerts'],
}

export function screenReads(surface: Surface, infoView: InfoView): ContinuityLane[] {
  if (surface === 'info' && infoView === 'catalogs') return ['catalog']
  if (surface === 'info' && infoView === 'exhibitors') return ['exhibitors', 'selections']
  if (surface === 'info' && (infoView === 'import' || infoView === 'prize_wall')) return []
  return requiredReads[surface]
}

export function screenFreshness(keys: ContinuityLane[], reads: Partial<Record<ContinuityLane, ScreenRead>>, online: boolean) {
  if (!keys.length) return { state: 'current' } as const
  const lanes = keys.map(key => reads[key])
  if (online && lanes.some(lane => !lane || lane.state === 'checking')) return { state: 'checking' } as const
  if (online && lanes.every(lane => lane?.state === 'current')) return { state: 'current' } as const
  const saved = lanes.filter(lane => lane?.checkedAt || lane?.savedAt)
  if (!saved.length) return { state: 'unavailable' } as const
  const savedAt = saved.length === lanes.length
    ? saved.map(lane => lane!.checkedAt ?? lane!.savedAt!).sort()[0]
    : undefined
  return { state: 'saved', savedAt } as const
}

/** Bound the UI's wait, and never publish the response from an expired read. */
export async function withReadDeadline<T>(read: PromiseLike<T>, milliseconds = 4000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([read, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Refresh timed out')), milliseconds)
    })])
  } finally {
    clearTimeout(timer)
  }
}
