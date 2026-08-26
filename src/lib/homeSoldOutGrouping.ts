export type HomeSoldOutEvent = {
  title: string
  day: string
  startsAt: string
  people: string[]
  sourceEventKey?: string
  eventId?: string
}

export function mergeHomeSoldOutEvents(batches: HomeSoldOutEvent[][]) {
  const events = new Map<string, HomeSoldOutEvent>()
  for (const event of batches.flat()) {
    const key = event.sourceEventKey || event.eventId || `${event.day}|${event.startsAt}|${event.title}`
    const previous = events.get(key)
    events.set(key, previous
      ? { ...previous, ...event, people: [...new Set([...previous.people, ...event.people])] }
      : event)
  }
  return [...events.values()].sort((left, right) => `${left.day}T${left.startsAt}`.localeCompare(`${right.day}T${right.startsAt}`))
}
