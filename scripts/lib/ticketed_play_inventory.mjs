import crypto from 'node:crypto'
import { inferTicketedPlayAvailability } from './ticketed_play_availability.mjs'

const ACTIONABLE_SELECTION_STATES = new Set(['interested', 'tentative', 'committed'])

function compact(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function cleanTitle(value) {
  return compact(value)
    .replace(/^(?:sold\s*out|waitlist|available)\s*(?:-|–|—|:)\s*/i, '')
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

/** Align a prior snapshot with current durable keys only when the slot and
 * normalized title identify exactly one event on each side. A changed label
 * must not manufacture a new availability transition. */
export function reconcileTicketedPlayIdentity(previous = [], current = []) {
  const identity = event => leapEventIdentity({ title: event.title, day: event.day, time: `${event.startsAt}-${event.endsAt}` })
  const buckets = events => {
    const map = new Map()
    for (const event of events) map.set(identity(event), [...(map.get(identity(event)) ?? []), event])
    return map
  }
  const oldBuckets = buckets(previous)
  const newBuckets = buckets(current)
  return previous.map(event => {
    const key = identity(event)
    const old = oldBuckets.get(key) ?? []
    const now = newBuckets.get(key) ?? []
    if (old.length !== 1 || now.length !== 1) return event
    return { ...event, sourceEventKey: now[0].sourceEventKey, id: now[0].id }
  })
}

export function assertTicketedPlayIdentityStable(previous, current) {
  const oldKeys = new Set(previous.map(event => event.sourceEventKey))
  const newKeys = new Set(current.map(event => event.sourceEventKey))
  const removed = previous.filter(event => !newKeys.has(event.sourceEventKey)).length
  const added = current.filter(event => !oldKeys.has(event.sourceEventKey)).length
  if (added >= 10 && removed >= 10 && added >= current.length * .2 && removed >= previous.length * .2) {
    throw new Error(`Ticketed Play identity churn: ${added} added and ${removed} removed; hold the baseline for review`)
  }
}

/** A rendered schedule shell is not proof that its cards finished hydrating.
 * Compare against the last accepted inventory (or the reviewed seed on the
 * first run) and fail closed before staging an incomplete availability view. */
export function assertTicketedPlayInventoryComplete(current = [], reference = []) {
  const keys = current.map(event => String(event.sourceEventKey ?? ''))
  if (keys.some(key => !key) || new Set(keys).size !== keys.length) {
    throw new Error('Ticketed Play inventory incomplete: missing or duplicate event keys; hold the baseline')
  }
  const countByDay = events => events.reduce((counts, event) => {
    const day = event.day ? cleanDay(event.day) : ''
    counts.set(day, (counts.get(day) ?? 0) + 1)
    return counts
  }, new Map())
  const observedDays = countByDay(current)
  if (observedDays.size < 3 || observedDays.has('')) {
    throw new Error(`Ticketed Play inventory incomplete: only ${observedDays.size} populated day(s); hold the baseline`)
  }
  if (!reference.length) return
  const expectedDays = countByDay(reference)
  const minimumTotal = Math.ceil(reference.length * .8)
  if (current.length < minimumTotal) {
    throw new Error(`Ticketed Play inventory incomplete: ${current.length} cards versus ${reference.length} accepted/reviewed (${minimumTotal} minimum); hold the baseline`)
  }
  for (const [day, expected] of expectedDays) {
    const observed = observedDays.get(day) ?? 0
    if (observed < Math.ceil(expected * .7)) {
      throw new Error(`Ticketed Play inventory incomplete: ${day} has ${observed} cards versus ${expected} accepted/reviewed; hold the baseline`)
    }
  }
}

export function ticketedPlayAvailabilityCoverage(observed = []) {
  const notApplicable = observed.filter(event => event.availabilityScope === 'advancement_only')
  const notCovered = observed.filter(event => event.availability === 'unknown' && event.availabilityScope !== 'advancement_only').map(event => ({
    eventId: event.id,
    sourceEventKey: event.sourceEventKey,
    title: event.title,
    reason: event.availabilityEvidence?.kind === 'checkout_unmatched' ? 'no_exact_checkout_product_match'
      : event.availabilityEvidence?.controls?.some(control => /login to add to your schedule/i.test(control.text ?? ''))
      ? 'anonymous_login_required_for_registration_state'
      : 'no_explicit_registration_state',
  }))
  return {
    knownCount: observed.length - notCovered.length - notApplicable.length,
    unknownCount: notCovered.length,
    notApplicableCount: notApplicable.length,
    status: notCovered.length ? 'partial' : 'complete',
    notCovered,
  }
}

const CHECKOUT_TITLE = /^(Fri|Sat|Sun)\s+(\d{1,2}):(\d{2})(AM|PM)\s+-\s+(.*?)\s+-\s+[A-Z0-9]{7}$/i
const DAY_BY_LABEL = { fri: '2026-11-13', sat: '2026-11-14', sun: '2026-11-15' }
const CHECKOUT_ALIASES = new Map([
  ['savvy pin traders - sealed league - reality fracture with veggie wagon featuring a special pin!', 'savvy pin traders - deluxe sealed league - reality fracture with veggie wagon featuring a special pin!'],
  ['friday night magic - pick-two draft - magic: the gathering | star trek draft night', 'friday night magic - pick-two draft - magic: the gathering | star trek'],
])

function checkoutIdentity({ title, day, startsAt }) {
  return `${day}|${startsAt}|${compact(title).toLowerCase().replace(/[^a-z0-9]/g, '')}`
}

export function normalizeLeapCheckoutProducts(products = []) {
  return products.map(product => {
    const match = compact(product.title).match(CHECKOUT_TITLE)
    if (!match) throw new Error(`Ticketed Play checkout title not parseable: ${product.title}`)
    const [, label, hour, minute, meridiem, rawTitle] = match
    const startsAt = `${String(Number(hour) % 12 + (meridiem.toUpperCase() === 'PM' ? 12 : 0)).padStart(2, '0')}:${minute}`
    const title = CHECKOUT_ALIASES.get(rawTitle.toLowerCase()) ?? rawTitle
    const control = compact(product.control)
    const availability = /sold\s*out/i.test(control) ? 'sold_out'
      : /unavailable|registration\s+closed/i.test(control) ? 'unavailable'
      : product.purchasable ? 'available' : 'unknown'
    return { ...product, title, day: DAY_BY_LABEL[label.toLowerCase()], startsAt, availability, control }
  })
}

/** Checkout's public product controls are stronger purchase evidence than the
 * anonymous schedule's disabled login control. Match only unique exact slots
 * and reviewed label aliases; advancement rounds are not checkout products. */
export function mergeLeapCheckoutAvailability(schedule = [], products = [], checkoutUrl = '') {
  const byIdentity = new Map()
  for (const product of normalizeLeapCheckoutProducts(products)) {
    const key = checkoutIdentity(product)
    byIdentity.set(key, [...(byIdentity.get(key) ?? []), product])
  }
  const used = new Set()
  const merged = schedule.map(event => {
    const matches = byIdentity.get(checkoutIdentity(event)) ?? []
    if (matches.length > 1) throw new Error(`Ambiguous checkout products for ${event.day} ${event.startsAt} ${event.title}`)
    const product = matches[0]
    if (product) {
      used.add(product.productId)
      return { ...event, availability: product.availability, availabilityScope: 'checkout_product', availabilityEvidence: {
        kind: 'first_party_checkout', sourceUrl: checkoutUrl, productId: product.productId,
        text: product.control, purchasable: product.purchasable,
      } }
    }
    if (/\btop\s+(?:\d+|eight|sixteen|thirty-two|sixty-four)\b/i.test(event.title)) {
      return { ...event, availabilityScope: 'advancement_only', availabilityEvidence: {
        kind: 'advancement_round', text: 'Bracket advancement round, not a separately sold checkout product',
      } }
    }
    return { ...event, availability: 'unknown', availabilityEvidence: {
      kind: 'checkout_unmatched', sourceUrl: checkoutUrl, text: 'No unique exact public checkout product match',
    } }
  })
  const unmatched = products.filter(product => !used.has(product.productId))
  if (unmatched.length) throw new Error(`Ticketed Play checkout mismatch: ${unmatched.length} public products not matched to schedule (${unmatched.slice(0, 3).map(product => product.title).join('; ')})`)
  return merged
}

export async function scrapeLeapTicketedPlayCheckout({ url }) {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('#product_list_56868 .product_item', { state: 'attached', timeout: 30000 })
    const products = await page.locator('#product_list_56868 .product_item').evaluateAll(nodes => nodes.map(node => ({
      productId: node.className.match(/\bproduct_(\d+)\b/)?.[1] ?? '',
      title: node.querySelector('.product_title span')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      control: node.querySelector('.product_control')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      purchasable: Array.from(node.querySelectorAll('.product_control select option')).some(option => Number(option.value) > 0),
    })))
    if (products.length < 100 || products.some(product => !product.productId || !product.title)) {
      throw new Error(`Ticketed Play checkout incomplete: ${products.length} products or missing identities`)
    }
    return products
  } finally {
    await browser.close()
  }
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
    // The first checkout-backed observation corrects ambiguous anonymous
    // schedule states. It is not evidence that a sale changed since yesterday.
    if (before && event.availabilityEvidence?.kind === 'first_party_checkout'
      && before.availabilityEvidence?.kind !== 'first_party_checkout'
      && before.availabilityEvidence?.kind !== 'explicit_text') return []
    if (before?.availability === event.availability) {
      const soldOutTextDisappeared = event.availability === 'sold_out'
        && before?.availabilityEvidence?.kind === 'explicit_text'
        && event.availabilityEvidence?.kind === 'missing_registration_control'
      if (!soldOutTextDisappeared) return []
      return [{
        kind: 'availability_transition', sourceEventKey: event.sourceEventKey, eventId: event.id,
        previousAvailability: 'sold_out', availability: 'potential_opening', event,
      }]
    }
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

/**
 * Unknown is an observation gap, not a new availability fact. Preserve the
 * last known state so one partially hydrated LEAP response cannot erase the
 * baseline and make the same sellout look new on the next healthy run.
 */
export function stabilizeTicketedPlayInventory(previous = [], current = []) {
  const prior = new Map(previous.map(event => [event.sourceEventKey, event]))
  return current.map(event => {
    const before = prior.get(event.sourceEventKey)
    if (event.availability !== 'unknown' || !before || before.availability === 'unknown') return event
    return {
      ...event,
      availability: before.availability,
      availabilityEvidence: before.availabilityEvidence,
    }
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

export function routeTicketedPlayAvailabilityTransitions(transitions, { selectionRows = [], companions = [], checkedAt, availabilityWatches = [] } = {}) {
  const soldOut = transitions.filter(item => item.availability === 'sold_out')
  const rows = []
  const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
  const watches = new Map(availabilityWatches.map(watch => [String(watch.sourceEventKey), watch]))
  const reopened = transitions.filter(item => ['available', 'waitlist', 'potential_opening'].includes(item.availability) && watches.has(String(item.sourceEventKey)))
  for (const item of reopened) {
    const watch = watches.get(String(item.sourceEventKey))
    const purchaseReady = item.availability === 'available'
    const waitlistReady = item.availability === 'waitlist'
    rows.push({
      fingerprint: fingerprint({ kind: 'ticketed_play_watched_reopened', sourceEventKey: item.sourceEventKey, availability: item.availability }),
      source_id: 'atlanta-ticketed-play-inventory',
      source_label: 'MagicCon Atlanta Ticketed Play registration',
      source_url: watch.registrationUrl || item.event.sourceUrl,
      destination: 'Inbox',
      title: purchaseReady ? `${item.event.title} is available again` : waitlistReady ? `${item.event.title} has a waitlist` : `${item.event.title} may be opening`,
      summary: purchaseReady ? 'A purchase spot appears to be open. Act quickly if Juan still wants to join.' : waitlistReady ? 'The sold-out event now offers a waitlist. Join it if Juan still wants a spot.' : 'The SOLD OUT label disappeared, but a purchase control was not confirmed. Check the registration page now.',
      status: 'unread',
      evidence: {
        intake_kind: 'ticketed_play_inventory', transition: 'reopened', availability: item.availability,
        previous_availability: item.previousAvailability, persistent_inbox: true, bell: true,
        email_alert: watch.emailAlert === true, notify_person_key: watch.notifyPersonKey,
        registration_url: watch.registrationUrl || item.event.sourceUrl, event: item.event, monitorCheckedAt: checkedAt,
      },
    })
  }
  if (!soldOut.length) return rows
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
  rows.push({
    fingerprint: fingerprint({ kind: 'ticketed_play_sold_out_group', events: material.map(event => event.sourceEventKey).sort() }),
    source_id: 'atlanta-ticketed-play-inventory',
    source_label: 'MagicCon Atlanta Ticketed Play registration',
    source_url: material[0].sourceUrl,
    destination: 'Home',
    title: `${material.length} Ticketed Play ${material.length === 1 ? 'event is' : 'events are'} sold out`,
    summary: material.map(event => `${event.day} ${event.startsAt} · ${event.title}`).join('; '),
    status: 'unread',
    evidence: { intake_kind: 'ticketed_play_inventory', transition: 'sold_out', events: material, monitorCheckedAt: checkedAt },
  })
  // The party has purchased its events. Routine sellouts are short-lived Home
  // information, including selected events; they do not create a persistent bell.
  return rows
}

export const routeTicketedPlaySoldOutTransitions = routeTicketedPlayAvailabilityTransitions
