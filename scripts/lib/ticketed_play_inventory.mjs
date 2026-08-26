import crypto from 'node:crypto'
import { inferTicketedPlayAvailability } from './ticketed_play_availability.mjs'

const ACTIONABLE_SELECTION_STATES = new Set(['interested', 'tentative', 'committed'])

function compact(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function cleanTitle(value) {
  return compact(value)
    .replace(/\s*\(click here for more info\)\s*$/i, '')
    .replace(/\s*(?:-|–|—)\s*\$\d+(?:\.\d{2})?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanDay(value) {
  const text = compact(value)
  const monthFirst = text.match(/\b(?:Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?,?\s*(?:Nov(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i)
  const dayFirst = text.match(/\b(?:Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)\s+(?:Nov(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i)
  const match = monthFirst ?? dayFirst
  return match ? `${match[2] ?? '2026'}-11-${match[1].padStart(2, '0')}` : text.toLowerCase()
}

function cleanTime(value) {
  return compact(value).toLowerCase().replace(/\s+/g, '').replace(/(\d{1,2}):(\d{2})(am|pm)/g, (_, hour, minute, meridiem) => {
    let value = Number(hour) % 12
    if (meridiem === 'pm') value += 12
    return `${String(value).padStart(2, '0')}:${minute}`
  })
}

export function leapEventIdentity(event) {
  return [cleanTitle(event.title).toLowerCase(), cleanDay(event.day).toLowerCase(), cleanTime(event.time)].join('|')
}

export function normalizeLeapInventoryCards(cards, { sourceUrl, retrievedAt, canonicalEvents = [] } = {}) {
  const canonicalByIdentity = new Map(canonicalEvents.map(event => [leapEventIdentity({
    title: event.rawTitle ?? event.title,
    day: event.rawDateLabel ?? event.day,
    time: event.rawTimeLabel ?? event.time,
  }), event]))
  const canonicalBySlot = new Map()
  for (const event of canonicalEvents) {
    const slot = `${cleanDay(event.rawDateLabel ?? event.day)}|${cleanTime(event.rawTimeLabel ?? event.time)}`
    const bucket = canonicalBySlot.get(slot) ?? []
    bucket.push(event)
    canonicalBySlot.set(slot, bucket)
  }

  return cards.map(card => {
    const title = cleanTitle(card.title)
    const day = cleanDay(card.day)
    const time = cleanTime(card.time)
    const [startsAt = '', endsAt = ''] = time.split('-')
    const identity = leapEventIdentity({ title, day, time })
    const exactCanonical = canonicalByIdentity.get(identity)
    const slotCandidates = canonicalBySlot.get(`${day}|${time}`) ?? []
    const normalizedTitle = title.toLowerCase()
    const canonical = exactCanonical ?? slotCandidates.find(event => {
      const candidateTitle = cleanTitle(event.rawTitle ?? event.title).toLowerCase()
      return normalizedTitle.startsWith(candidateTitle) || candidateTitle.startsWith(normalizedTitle)
    })
    const sourceEventKey = String(canonical?.sourceEventKey ?? `leap-${crypto.createHash('sha256').update(identity).digest('hex').slice(0, 16)}`)
    const soldOut = Boolean(card.soldOut || card.registrationControlMissing)
    const availability = inferTicketedPlayAvailability({
      title: soldOut ? `${title} SOLD OUT` : title,
      controls: card.controls ?? [],
    })
    return {
      id: canonical?.id ?? (canonical?.sourceEventKey ? `ticketed-${canonical.sourceEventKey}` : sourceEventKey),
      sourceEventKey,
      sourceUrl,
      retrievedAt,
      title,
      day,
      startsAt,
      endsAt,
      availability,
      availabilityEvidence: soldOut
        ? card.soldOut
          ? { kind: 'explicit_text', text: 'SOLD OUT' }
          : { kind: 'missing_registration_control', text: 'No add/login registration control; available cards retain one.' }
        : { kind: 'purchase_control', controls: card.controls ?? [] },
    }
  }).sort((a, b) => `${a.day}|${a.startsAt}|${a.title}`.localeCompare(`${b.day}|${b.startsAt}|${b.title}`))
}

export async function scrapeLeapTicketedPlayInventory({ url, retrievedAt, canonicalEvents = [] }) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('.schedule.card', { timeout: 30000 })
    const allDates = page.getByRole('button', { name: /View All Dates/i })
    if (await allDates.isVisible()) {
      await allDates.click()
    }
    // LEAP renders Friday first and hydrates the other dates asynchronously.
    // A card selector alone can therefore return a valid-looking partial set.
    await page.waitForFunction(() => {
      const days = new Set(Array.from(document.querySelectorAll('.schedule-day'))
        .map(node => node.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean))
      return days.size >= 3
    }, { timeout: 30000 })
    // Availability badges arrive after the date/card shell. Give the explicit
    // state lane a bounded chance to hydrate; absence after the timeout is a
    // valid all-available/unknown inventory, not a navigation failure.
    await page.waitForFunction(() => /\bSOLD OUT\b/i.test(document.body.innerText), { timeout: 10000 }).catch(() => {})
    const cards = await page.locator('.schedule.card').evaluateAll(nodes => nodes.map(card => {
      const text = selector => card.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
      const controls = Array.from(card.querySelectorAll('button, [role="button"], input[type="submit"]')).map(control => ({
        text: (control.textContent || control.getAttribute('value') || control.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(),
        disabled: control.matches(':disabled') || control.getAttribute('aria-disabled') === 'true',
      })).filter(control => control.text)
      return {
        title: text('.card-label'),
        day: text('.schedule-day'),
        time: text('.schedule-time'),
        soldOut: /\bSOLD OUT\b/i.test(card.textContent ?? ''),
        registrationControlMissing: controls.length === 0,
        controls,
      }
    }))
    return normalizeLeapInventoryCards(cards, { sourceUrl: url, retrievedAt, canonicalEvents })
  } finally {
    await browser.close()
  }
}

export function diffTicketedPlayInventory(previous = [], current = []) {
  const prior = new Map(previous.map(event => [event.sourceEventKey, event]))
  return current.flatMap(event => {
    const before = prior.get(event.sourceEventKey)
    // A fresh durable cache must surface already-explicit sellouts once. Other
    // newly discovered listings are baseline context, not availability news.
    if (!before && event.availability !== 'sold_out') return []
    if (before?.availability === event.availability) return []
    return [{
      kind: 'availability_transition',
      sourceEventKey: event.sourceEventKey,
      eventId: event.id,
      previousAvailability: before?.availability ?? 'unobserved',
      availability: event.availability,
      event,
    }]
  })
}

function selectedPeopleForEvent(eventId, selectionRows, companions) {
  const relevant = selectionRows.filter(row => row.object_kind === 'event' && [eventId, `explore-${eventId}`].includes(row.object_id))
  const ownerIsActionable = new Set(relevant.filter(row =>
    (row.selection_key === 'state' && ACTIONABLE_SELECTION_STATES.has(row.selection_value))
    || (['purchased', 'purchase_locked'].includes(row.selection_key) && row.selection_value === 'true')
  ).map(row => row.owner_id))
  const names = new Map(companions.filter(person => ownerIsActionable.has(person.user_id)).map(person => [person.user_id, person.display_name]))
  return [...ownerIsActionable].map(ownerId => names.get(ownerId) ?? 'A companion').sort()
}

export function routeTicketedPlaySoldOutTransitions(transitions, { selectionRows = [], companions = [], checkedAt } = {}) {
  const soldOut = transitions.filter(item => item.availability === 'sold_out')
  if (!soldOut.length) return []
  const material = soldOut.map(item => ({
    eventId: item.eventId,
    sourceEventKey: item.sourceEventKey,
    title: item.event.title,
    day: item.event.day,
    startsAt: item.event.startsAt,
    endsAt: item.event.endsAt,
    sourceUrl: item.event.sourceUrl,
    availabilityEvidence: item.event.availabilityEvidence,
    people: selectedPeopleForEvent(item.eventId, selectionRows, companions),
  }))
  const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
  const rows = [{
    fingerprint: fingerprint({ kind: 'ticketed_play_sold_out_group', events: material.map(event => event.sourceEventKey).sort() }),
    source_id: 'atlanta-ticketed-play-inventory',
    source_label: 'MagicCon Atlanta Ticketed Play registration',
    source_url: material[0].sourceUrl,
    destination: 'Home',
    title: `${material.length} Ticketed Play ${material.length === 1 ? 'event is' : 'events are'} sold out`,
    summary: material.map(event => `${event.day} ${event.startsAt} · ${event.title}`).join('; '),
    status: 'unread',
    evidence: { intake_kind: 'ticketed_play_inventory', transition: 'sold_out', events: material, monitorCheckedAt: checkedAt },
  }]
  const selected = material.filter(event => event.people.length)
  if (selected.length) rows.push({
    fingerprint: fingerprint({ kind: 'ticketed_play_selection_sold_out', events: selected.map(event => [event.sourceEventKey, event.people]).sort() }),
    source_id: 'atlanta-ticketed-play-inventory',
    source_label: 'MagicCon Atlanta Ticketed Play registration',
    source_url: selected[0].sourceUrl,
    destination: 'Inbox',
    title: `${selected.length === 1 ? selected[0].title : `${selected.length} selected Ticketed Play events`} sold out`,
    summary: selected.map(event => `${event.people.join(', ')} · ${event.title}`).join('; '),
    status: 'unread',
    evidence: { intake_kind: 'ticketed_play_inventory', transition: 'sold_out', persistent_inbox: true, bell: true, events: selected, monitorCheckedAt: checkedAt },
  })
  return rows
}
