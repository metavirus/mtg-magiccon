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

export function shareIncludedParticipant(
  first: readonly { person: string }[], second: readonly { person: string }[], included: readonly string[],
): boolean {
  return first.some(a => included.includes(a.person) && second.some(b => b.person === a.person))
}
