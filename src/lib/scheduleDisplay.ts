/** Unknown times stay last; do not invent a start time for ambiguous source text. */
export function scheduleStart(time: string): number {
  const range = time.replace(/[–—]/g, '-').match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*-\s*(\d{1,2})(?::\d{2})?\s*(AM|PM)/i)
  const single = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
  if (!range && !single) return Number.POSITIVE_INFINITY
  const match = range ?? single!
  const hour = Number(match[1])
  const meridiem = match[3]?.toUpperCase() ?? (range![5].toUpperCase() === 'PM' && hour > Number(range![4]) ? 'AM' : range![5].toUpperCase())
  return (hour % 12 + (meridiem === 'PM' ? 12 : 0)) * 60 + Number(match[2] ?? 0)
}

export function sortScheduledEvents<T extends { time: string }>(events: T[]): T[] {
  return [...events].sort((a, b) => scheduleStart(a.time) - scheduleStart(b.time))
}

export function atlantaConventionStart(day: 'Thu' | 'Fri' | 'Sat' | 'Sun', time: string): number {
  const date = { Thu: 12, Fri: 13, Sat: 14, Sun: 15 }[day]
  const start = scheduleStart(time)
  if (!date || !Number.isFinite(start) || start < 0 || start >= 1440) return Number.NaN
  // All four convention days are in Atlanta standard time (UTC−5).
  return Date.UTC(2026, 10, date, 5) + start * 60_000
}

export function nextCalendarEntry<T extends { at: number }>(entries: readonly T[], now: number): T | undefined {
  return entries.reduce<T | undefined>((next, entry) =>
    Number.isFinite(entry.at) && entry.at >= now && (!next || entry.at < next.at) ? entry : next, undefined)
}

export function shareIncludedParticipant(
  first: readonly { person: string }[], second: readonly { person: string }[], included: readonly string[],
): boolean {
  return first.some(a => included.includes(a.person) && second.some(b => b.person === a.person))
}
