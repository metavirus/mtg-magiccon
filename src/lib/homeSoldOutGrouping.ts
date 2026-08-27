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

export function groupHomeSoldOutEventsByDay(batches: HomeSoldOutEvent[][]) {
  const days = new Map<string, HomeSoldOutEvent[]>()
  for (const event of mergeHomeSoldOutEvents(batches)) {
    days.set(event.day, [...(days.get(event.day) ?? []), event])
  }
  return [...days.entries()].map(([day, events]) => ({ day, events }))
}
