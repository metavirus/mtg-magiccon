# Pre-ticketed-play hypothetical hydration

Updated: 2026-08-01

## Scope

This is a paper hydration exercise, not a schema, migration, seed file, monitor, or production data load. It uses redacted and representative facts from the discovery pass to imagine what the app would look like if a small amount of known pre-ticketed-play information had already been captured.

No credential values, reservation numbers, QR contents, payment details, addresses from private artifacts, or live account links are reproduced here. Example identifiers are fake.

## Hypothetical hydrated state

### People

- Owner: Kavi.
- Known trip people: Chris, Juan.
- These people are trip context, not app users for MVP.

### Hot

Quiet state:

- Nothing meaningful changed since the last successful check.
- Watched official sources are healthy enough to trust the quiet state.
- Next known readiness dates are displayed if present.

Potential Hot items:

- Ticketed play page changes from placeholder to available.
- Black Lotus/VIP details are added or changed.
- Artist list becomes available.
- FAQ or confirmation evidence creates a deadline contradiction.
- A private operational email indicates refund, cancellation, ticket transfer, or travel disruption.
- Monitoring has not checked important sources recently enough to support "nothing changed."

Non-Hot examples:

- Generic hotel booking promo when lodging is already known.
- Repeated newsletter content that adds no new fact.
- One-off source check failure.
- Application news unrelated to the owner's likely attendance unless explicitly watched.

### Sources

Watched groups:

- Official News: global MagicCon news archive and ReedPop/MagicCon newsletters.
- Atlanta Core: Atlanta homepage, FAQ, badge information, venue/hours pages.
- Unlock Signals: ticketed play placeholder, artists, maps, Black Lotus/VIP details, merch/store, mobile app page.
- Private Trip Evidence: Leap confirmations, hotel confirmations, flight receipts, receipts, refunds, transfer emails.
- External Leads: later lightweight search/news leads that must be tied back to official or private evidence before becoming trusted facts.

Each watched source needs a plain reason:

- "Watches for official announcement posts."
- "Currently says ticketed play is coming soon; alert when schedule or registration appears."
- "Provides badge mailing, will call, show hours, and Companion guidance."
- "Provides private trip timing and reference details."

Source failures should usually remain here as confidence metadata. They become visible on Hot only when the quiet state is no longer trustworthy.

### Trip

Flight cards:

- Show route, dates, local times, passengers, and confirmation reference.
- Provide "Open in Delta" and copy confirmation affordances.
- Surface a flight change/cancellation badge if such an email is later captured.
- Do not manage seats, upgrades, rebooking, fares, or airline status.

Hotel cards:

- Show hotel name, nights, check-in/out, who is associated with each stay, address summary, and source.
- Provide "Open in Maps," "Open booking," and copy/reveal private reference affordances.
- Surface cancellation or payment dates only when useful.
- Do not assess whether the owner has enough lodging coverage unless asked.

Trip value is quality-of-life reference, not travel management.

### Wallet

Pre-ticketed-play wallet cards:

- Badge/order summary.
- Who or what the order covers.
- Order date and source.
- Amount paid at summary level where useful.
- Open Leap order.
- Reveal credential details deliberately.
- Included products/benefits to claim later.

Wallet is a trusted reference before the event. Onsite scanning and "what do I need right now?" should be pulled into Now/Hot when the time comes rather than making Wallet the primary operational surface.

### Plan

Before ticketed play appears, Plan is lightly populated:

- Waiting for ticketed play inventory.
- Known fixed trip boundaries.
- Rough interests or reminders.
- Future comparison criteria, such as format, time, price, duration, prize/product value, novelty, and conflicts.

Plan should not look absent. It should communicate what is not yet available and why.

### Remember

Before the event, Remember can hold prior-event lessons and pre-event notes:

- Prior receipt/reimbursement pattern.
- Things to remember from Vegas.
- Notes about artists, purchases, or logistics to revisit later.

It should be present but quiet.

## Opportunities surfaced by the hydration

1. The app needs an explicit distinction between alert-worthy change and captured observation. This likely belongs in the provenance/observation layer before broad domain modeling.
2. Known trip state should be available to the alerting logic so it can suppress irrelevant urgency, such as hotel promos when lodging is already known.
3. Trip and Wallet need sensitive-detail reveal patterns before private artifact storage is implemented.
4. A lightweight person concept is useful even in owner-only MVP, because badges, hotel nights, flights, purchases, and memories can refer to different people without implying app accounts.
5. Source health needs only a small MVP vocabulary: not checked, checked unchanged, changed, needs review, and failed.
6. The Hot quiet state depends on both source observations and source health; "nothing changed" is a claim that needs support.
7. Rare steering input should be stored as interpretation or preference only when it changes future behavior. It should not become a general engagement surface.
8. The first slice may need a "display model" before a comprehensive schema: enough to render Hot, Sources, Trip, Wallet, Plan, and Remember from a tiny evidence set.
9. Private email artifacts and public website observations need separate source handling, but the UI can present both as trip intelligence.
10. The app should preserve source evidence without making every captured artifact visible by default.

## Questions before ticketed-play planning

1. Which exact pre-ticketed-play display cards should be mocked first: Hot quiet state, Sources status, Trip reference, Wallet reference, or all four as a thin shell?
2. Should the first implemented source workflow prove a public official source change, a private artifact capture, or one of each?
3. What is the minimum private artifact storage design needed before showing Wallet/Trip facts derived from receipts and confirmations?
4. How should sensitive detail reveal behave on mobile: tap-to-reveal per field, card-level unlock, or no reveal until onsite?
5. Should email/push alerts be treated as future automation, or should the first UI already model alert severity and delivery preference?

## Working conclusion

The pre-ticketed-play app can be meaningfully hydrated with a very small amount of evidence if the UI is organized around attention, trust, and reference. The next product risk is not a lack of domain tables; it is proving that a few source observations can drive a calm Hot state, useful Trip/Wallet reference cards, and recoverable evidence without creating fake urgency or provider-specific subsystems.
