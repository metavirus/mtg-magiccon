# Black Lotus Trust Slice

Updated: 2026-08-03  
Status: Implemented against canonical Supabase; authenticated visual and device-offline review pending

## Decision question

Can the app retain one official Atlanta claim, normalize only what it supports, connect it to a reversible personal decision and Plan placement, preserve a later conflicting observation, and keep the critical result readable offline?

## Bounded source

- Publisher: ReedPop / MagicCon: Atlanta
- URL: `https://mcatlanta.mtgfestivals.com/en-us/badges/buy-badges/black-lotus-vip-experience.html`
- Retrieved: 2026-08-03T10:34:06-07:00
- Access state: available
- Page caveat: “Event locations will be announced closer to the event. Schedule subject to change.”

The first supported claim is the published Saturday occurrence:

> 11:30 AM – 3:00 PM - WotC Casual Play Designers and members of the Commander Format Panel (CFP) present Planechase Unknown*. Commander Deck needed.

The normalized occurrence is **Black Lotus Planechase Unknown**, Saturday, November 14, 2026, 11:30 AM–3:00 PM in `America/New_York`. Its location remains unknown. Black Lotus access and Commander-deck preparation are supported; attendance, personal preference, and itinerary state are not publisher facts.

## Minimal records

### `sources`

One owner-scoped source identity. It preserves publisher, title, canonical URL, source type, and the latest known access state. It does not contain the current truth of every claim on the page.

### `source_observations`

An immutable-in-spirit observation of what one retrieval supports. It preserves retrieval time, exact wording, a concise support statement, status, content hash, and an optional link to the observation it supersedes. New evidence creates another observation; it does not rewrite the earlier wording.

### `occurrences`

One normalized dated event supported by an observation. It preserves event state, local timezone, time certainty, access context, preparation clue, location uncertainty, and the observation currently used for display. A later source observation can change the current display without destroying evidence history.

### `personal_decisions`

The owner's reversible interpretation and planning state for the occurrence: none, Interested, Tentative, Committed, Hidden, or Not for me. Purchase remains a separate boolean fact because it must not be conflated with preference. Publisher evidence cannot modify this row.

### `itinerary_entries`

A deliberately small connection from a personal decision to its Plan placement. It can use the occurrence's published time or an explicit personal override, carries fixed/flexible/fuzzy semantics, and records whether it is active. It does not attempt to model the whole convention calendar.

## Truth boundaries

- Publisher truth lives in source observations and the normalized occurrence they support.
- Observed onsite reality would be a separate observation with `observed_onsite` status.
- Personal interpretation lives in the decision and itinerary records.
- A changed, canceled, contradicted, or superseded observation never silently overwrites personal state.
- Agent interpretation may propose a normalization but becomes canonical only through the reviewed write path.

## Ownership and API contract

All five tables are owner-scoped for MVP. Every exposed table:

- defaults `owner_id` to `auth.uid()`;
- requires a non-null owner referencing `auth.users`;
- enables and forces RLS;
- revokes all access from `public`, `anon`, and `authenticated` before granting only the required operations to `authenticated`;
- uses owner predicates for select, insert, update, and delete;
- includes both `USING` and `WITH CHECK` for update;
- has an owner index and relationship indexes needed by the slice.

No view, trigger, privileged function, service-role browser path, or authorization metadata is introduced.

## Read model and offline boundary

The client may join the five owner-visible records into one in-memory critical view:

- title, date, start/end, timezone, access, preparation, and location certainty;
- current publisher status and exact source wording;
- personal planning state and active Plan placement;
- source URL and retrieval time;
- whether newer or conflicting evidence exists.

After a successful authenticated server read, that bounded object may be stored in local storage as a versioned read-only cache. When offline, the app reads it and shows its saved time. No offline mutation is accepted. A later server read may replace the cache only after the full read succeeds.

## Reconciliation fixture

The first change proof may use a clearly labeled local fixture rather than inventing a live publisher change. The fixture creates a second observation that differs in time, location, status, or wording, links to the earlier observation, and demonstrates:

- earlier evidence remains readable;
- the normalized occurrence points to the reviewed current observation;
- the owner sees the consequence before accepting any operating choice;
- the personal decision remains unchanged unless the owner changes it.

The fixture is test evidence, not an assertion about the current Atlanta page.

## Acceptance checks

1. The five-table contract is the only new domain schema.
2. Anonymous access is absent; authenticated access is owner-scoped.
3. Cross-owner select, insert, update, and delete are rejected by RLS.
4. The official claim and exact URL can be read back from the canonical project.
5. The personal decision and itinerary placement are separately readable and reversible.
6. A second observation can be reconciled without deleting the first.
7. The critical view reloads offline with a visible saved time.
8. Offline controls are disabled and never update canonical or cached state.

## Explicit exclusions

No broad Black Lotus schedule ingestion, polling, notifications, Gmail access, artifact Storage, generalized event ontology, recurrence, full Plan engine, multi-user writes, offline queue, or production deployment belongs in this slice.
