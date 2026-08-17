export type ExploreRouteType = 'all' | 'play' | 'info' | 'social' | 'other'
export type ExploreRouteMode = 'for-you' | 'all' | 'changed' | 'hidden'
export type ExploreRouteDay = 'all' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
export type ExploreRouteGroup = 'high_signal' | 'sold_out' | 'watched' | 'social_fit' | 'conflicts' | 'all_ticketed_play'

export type ExploreRouteState = {
  eventType?: ExploreRouteType
  mode?: ExploreRouteMode
  day?: ExploreRouteDay
  group?: ExploreRouteGroup
}

const routeTypes: ExploreRouteType[] = ['all', 'play', 'info', 'social', 'other']
const routeModes: ExploreRouteMode[] = ['for-you', 'all', 'changed', 'hidden']
const routeDays: ExploreRouteDay[] = ['all', 'Thu', 'Fri', 'Sat', 'Sun']
const routeGroups: ExploreRouteGroup[] = ['high_signal', 'sold_out', 'watched', 'social_fit', 'conflicts', 'all_ticketed_play']

export function hashPath(hash: string) {
  return hash.replace(/^#/, '').split('?')[0].trim().toLowerCase()
}

export function parseExploreRouteState(hash: string): ExploreRouteState {
  const [, query = ''] = hash.replace(/^#/, '').split('?')
  const params = new URLSearchParams(query)
  const eventType = normalizeOne(params.get('type'), routeTypes)
  const mode = normalizeOne(params.get('mode'), routeModes)
  const day = normalizeOne(params.get('day'), routeDays)
  const group = normalizeOne(params.get('group'), routeGroups)

  if (group === 'sold_out') return { eventType: eventType ?? 'play', mode: 'changed', day, group }
  if (group === 'all_ticketed_play' || group === 'high_signal' || group === 'watched' || group === 'social_fit' || group === 'conflicts') {
    return { eventType: eventType ?? 'play', mode: mode ?? 'for-you', day, group }
  }
  return { eventType, mode, day }
}

function normalizeOne<const T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  if (!value) return undefined
  return allowed.find(item => item.toLowerCase() === value.toLowerCase())
}
