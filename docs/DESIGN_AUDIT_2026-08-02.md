# Design Audit: MVP Enrichment Without Product Sprawl

Updated: 2026-08-02
Status: Guidance for remaining design work; not additional implementation scope

## Audit question

Given the discovery, accepted architecture, and screen studies completed so far, which changes would make the MVP substantially more useful and coherent without expanding it into a comprehensive convention platform?

## Overall assessment

The product direction is coherent and differentiated. Its strongest idea is not monitoring, calendaring, travel storage, or receipt extraction by itself. It is **contextual retrieval plus decision support across information that normally lives in unrelated systems**.

The screen studies have found useful local interaction patterns, especially for Plan, event translation, Wallet proof, and phase-aware Home. They have not yet proved that those patterns form one product. Navigation, detail layering, state controls, offline language, and contextual links vary enough that the app could reproduce a gentler version of the source-hopping problem it is meant to solve.

The next design work should emphasize a shared system and a small number of cross-surface capabilities. It should not add another set of domain features.

## Principles strengthened by the audit

### Retrieval is the MVP superpower

The owner often remembers a concept, not its source: an event name, vendor, hotel, pickup, person, or “where I go next.” Important displays should make related objects reachable.

High-value, bounded enrichment:

- one compact app-wide find/jump affordance for the object types already implemented;
- real backlinks among Plan, Map, Wallet, Trip, Notes, and evidence;
- recent and currently relevant results before broad filtering;
- no chatbot framing and no need to remember the originating source.

The interaction can be proven with trust-slice objects before comprehensive search infrastructure exists.

### One semantic visual grammar must survive every surface

The production design system should reserve:

- category tint for persistent object identity, such as Black Lotus, ticketed play, flexible activity, travel, or Wallet proof;
- blue for focus, selection, and current context;
- gold for purchase, paid consequence, or financial fact;
- border, opacity, and texture for Interested, Tentative, Committed, displaced, flexible, and fuzzy states;
- stable person fill plus a white initial, with marker border carrying that person's involvement state;
- amber or rose for graded attention, contradiction, cancellation, or consequential change.

No screen should invent a second meaning for gold, use a colored outline merely because a card is selected, or rely on color without an icon, label, shape, or texture.

### Mobile is a distinct composition, not compressed desktop

The useful mobile Plan is a chronological, touch-friendly agenda with a focused state/action layer and visible overlap cues. It is not the desktop lane canvas squeezed into a phone.

The same rule applies elsewhere:

- full-card targets open detail;
- bottom sheets handle one scoped choice or action, not nested modal stacks;
- desktop drawers and mobile focused layers use the same content order;
- frequent onsite actions receive large, separated targets;
- the parent context remains understandable while detail is open.

WCAG 2.2 sets a 24 CSS-pixel minimum target or spacing requirement. This app should generally aim closer to 44 CSS pixels for frequent mobile controls because they may be used one-handed while walking or carrying convention materials.

### Offline state should be calm, explicit, and object-aware

Prefer:

- one quiet shell-level connection/cache status;
- an `as of` time where freshness changes a decision;
- explicit saved-for-offline status on critical Plan, Map, and Wallet objects;
- clear read-only behavior while disconnected;
- a small “newer information available” affordance that does not unexpectedly replace the current screen;
- no generic failure or check feed when monitoring is simply quiet.

Home can say the important watch set was checked. Source-check minutiae remain in Activity unless the app can no longer support that assurance.

## Surface-by-surface audit

### Home and Now

What works:

- phase-aware Now is the correct central concept;
- quiet monitoring avoids manufactured excitement;
- milestones are a credible months-ahead landing spine;
- Trip and Wallet remain ready without demanding attention.

Improve:

- Remove ambient “page checked; no change” cards from quiet Home. They belong in Activity unless check failure makes quiet untrustworthy.
- Give milestones a total view with completed, current, waiting, and timing-clue states; Home shows only the next few useful entries.
- Show the next confirmed dated anchor alongside the next expected information release.
- Make onsite Now operational rather than narrative: event, start, leave cue, place clue, people, and the one artifact or code most likely needed.
- Permit a yes/no or A/B question only when it resolves a real contradiction or changes future behavior.

MVP recommendation: one trustworthy status, a compact milestone runway, the next known anchor, and direct reference chips. A consequential change temporarily replaces an element rather than creating a permanent feed.

### Calendar

What works:

- a meaningful-date stream suits the runway better than a month grid;
- empty time compresses;
- Calendar-to-Plan is a clear zoom change;
- milestones, deadlines, travel, Black Lotus preview day, and convention summaries belong together.

Improve:

- Use lighter rows for quiet milestones; repeated bordered cards make sparse time feel heavier than it is.
- Add a compact date navigator for thumb jumps without becoming a calendar toolbar.
- Summarize commitments, tentatives, and operational windows visually before a convention day expands.
- Let completed milestones recede while the next waiting milestone becomes the handoff. Completion itself should not create celebration noise.

MVP recommendation: establish three density levels—quiet dated row, important anchor, and expandable convention-day cluster—on one continuous stream.

### Plan: Decide and Schedule

What works:

- Tentative is a valuable synthesis layer;
- the shared time axis makes contention legible;
- fixed, flexible, and fuzzy time read differently;
- displaced alternatives remain recoverable;
- purchase is a durable financial/access fact and normally staples an event into Plan;
- person markers add useful context without creating multi-user behavior.

Improve:

- Make the time field dominant. The contender shelf should be compact; selected detail belongs in the shared drawer pattern.
- Show consequences on the axis, not mainly in prose: highlight the controlling block, dim displaced options, and mark conditional overlap during preview.
- Avoid category lanes when they imply false hierarchy. Time is primary; tint, icon, and labels can carry category.
- Reserve hard conflict for overlapping fixed commitments. Fuzzy tails, movable leagues, optional early exits, and meal pressure stay advisory.
- Make state changes reversible. Interested, Tentative, and Committed can be toggled off. Purchased remains separate, defaults to Committed, and can be unmarked if the app record is wrong; it is not an irreversible UI lock.
- On mobile, state and purchase controls must update the schedule block and person-marker borders together.

MVP recommendation: use one canonical scenario to prove select, consequence preview, commit, undo, applicable purchase, displaced recovery, and the same transitions on mobile.

### Event detail

What works:

- translating organizer copy into a decision brief is major value;
- Grand Melee demonstrates useful format explanation;
- separating rules novelty, preparation, mental load, and competitive stakes avoids a misleading one-dimensional difficulty label;
- Plan remains visible while detail opens.

Improve:

- Reduce the current smart detail before it becomes a second brochure.
- Put price, time, duration, place, people, state, and refund consequence in one stable high-position facts row.
- Lead with one verdict and rationale, not every translated rule.
- Express “what happens” as a compact sequence such as product, build, play, and prizes.
- Keep personal fit separate from objective complexity and competitive stakes. Expand the summary into dimensions and sources only on request.
- Recede organizer boilerplate into registration/evidence disclosure while preserving exact wording and history.

MVP recommendation: identity and facts; one-sentence decision brief; personal state; Plan effect; complexity explanation; what happens; prizes/product; notes and related objects; evidence and full wording.

### Explore

Explore is underdesigned relative to its pre-event importance. It needs to prove the bridge from the available universe into Interested and Tentative planning.

A representative event row needs enough information to consider or ignore: time, duration, price, format, complexity/competition, availability, concise personal-fit rationale, and relevant person interest. It must not become a chip wall. Hidden and Not for me require distinct recovery surfaces.

MVP recommendation: make Explore the next major screen study after the canonical Plan interaction. Test a mixed event list with whole-row detail, heart/tentative actions, sold-out treatment, one concise rationale, and lightweight sort/filter modes. Do not build ingestion merely to prototype it.

### Wallet

What works:

- Prize Tix receives proper prominence;
- extracted facts coexist with preserved original proof;
- line-item assignment and catalog links add practical value;
- QR and original proof do not dominate the default list.

Improve:

- Open proof in one dedicated full-height sheet or focused view, not nested modal layers.
- Add a “show this” mode that maximizes the QR, receipt image, or entitlement proof with high contrast and minimal chrome.
- Reveal sensitive values deliberately and conceal them again when leaving the focused view.
- Keep extracted line items, assignments, and notes editable without modifying the preserved artifact.
- Cross-link Wallet, Trip, and Map rather than duplicating confirmation facts into dead ends.

MVP recommendation: prove one Wallet object end to end—summary, line items, assignment, note, original PNG/PDF, show mode, related place or item, and offline status—before defining a generalized artifact system.

### Trip

Trip needs one visual concept so Map and Wallet do not absorb its job. The Courtyard-to-Omni sequence is a useful fixture: arrival, lodging transition, dates, addresses, people, check-in/out, confirmation reference, and provider links.

Consequential travel changes can annotate the Trip object and Calendar constraint. They do not justify a travel-alert subsystem. People-by-night should be visually legible without collaboration machinery.

MVP recommendation: design one compact trip sequence and keep provider tools one tap away.

### Map

What works:

- Trip area and Event map are honestly separated;
- confirmed hotel and venue facts are useful before the 2026 floor map;
- the 2025 Atlanta map remains historical structure rather than current truth;
- linked objects can eventually make Map more than a static image.

Improve:

- The quiet-period concept is still mainly a schematic field with buttons. It does not yet add enough spatial value to justify a large map-shaped surface.
- Before an official 2026 map, emphasize the lodging sequence, addresses, venue, route/provider links, and offline facts. Do not imply precision through a speculative diagram.
- State plainly that the 2026 Event map is not published. Keep the 2025 reference behind a historical label.
- When the official map arrives, marks should open compact place detail with events, vendor/artist/item links, notes, source version, and an offline clue. A directory supplies equivalent touch access when marks are dense.

MVP recommendation: begin as place-and-transition retrieval with modest geographic/provider context. Prove place detail and backlinks. OCR, georeferencing, overlays, current-position hints, and route intelligence stay v2.

### Notes and Activity

Notes and Activity are conceptually correct but under-tested. Prove one contextual note flowing from an event into Notes, and one meaningful source change flowing into Activity and back to the affected fact. Background checks and low-level diagnostics must not become a telemetry wall.

## Navigation audit

The mockups do not yet use one stable shell. Some omit Calendar, some compress many destinations into a small mobile grid, and some use different bottom-navigation sets. This is a blocking design question because navigation inconsistency would undermine the persistent-product feeling.

Desktop is largely settled: a stable left rail with focused destinations and Activity below a divider.

Mobile should test one candidate rather than solve the issue in prose:

- a stable five-item bottom bar for the most frequently reached destinations;
- a labeled More destination opening the complete destination grid in one tap;
- contextual shortcuts from Now and object backlinks;
- no phase-based reordering of stable bottom items;
- no unlabeled icon-only primary navigation.

A sensible first candidate is **Home, Calendar, Plan, Map, More**, with Wallet and Trip aggressively linked from Home/Now, Map, and related objects. This is a prototype hypothesis, not an accepted architecture change. The test is whether Wallet becomes too slow onsite; if so, a contextual show/proof action may be better than an unstable tab bar.

## Small MVP enrichments with high leverage

1. **Contextual find/jump:** recover the implemented object by the name the owner remembers.
2. **Reversible state changes:** immediate visual propagation plus a short undo opportunity.
3. **Showable artifact mode:** high-contrast QR, receipt image, or entitlement proof.
4. **One-tap contextual note:** capture without leaving the event, place, receipt, artist, vendor, or item.
5. **Object-aware offline pack:** critical objects show cached availability and meaningful freshness.
6. **Inspectably smart rationale:** one concise reason for relevance, disinterest, complexity, or schedule pressure, expandable to evidence.
7. **Change consequence line:** show what a changed fact affects personally before the raw diff.
8. **Real backlinks:** person, place, receipt, event, vendor, and note chips navigate instead of decorating.

These do not require broad ingestion, continuous monitoring, multi-user accounts, indoor navigation, or a comprehensive schema.

## Things not to enrich yet

- full AI itinerary generation or persistent assistant chrome;
- drag-and-drop before tap-based state behavior works;
- generalized rules engines for every Magic format;
- broad email or web monitoring;
- full store, prize-wall, artist, or map ingestion;
- live indoor GPS or turn-by-turn routing;
- multi-user accounts, voting, shared writes, or chat;
- routine-adult reminders, packing coaching, meal planning, or travel management;
- celebratory milestones, streaks, engagement prompts, or synthetic excitement.

## Remaining design sequence

1. Unify the shell and mobile navigation.
2. Refine one canonical desktop Plan scenario and its mobile translation.
3. Reduce Event detail into the shared progressive-disclosure order.
4. Design the Explore-to-Plan bridge.
5. Test the Map/Trip/Wallet retrieval cluster with Courtyard, Omni, and one proof artifact.
6. Refine quiet Home and Calendar, removing no-change clutter.
7. Structurally test one Notes path and one Activity change path.
8. Test at 320, 390, 736, and desktop widths; verify target sizing, safe areas, reflow, focus, contrast, and sheet dismissal.
9. Only then derive the Black Lotus trust-slice display and data contracts.

## Exit test

The design is ready to inform implementation when the owner can:

- understand why an event is appealing or demanding;
- promote it from Explore into a real tentative comparison;
- see what committing or purchasing changes in Plan;
- undo or revise the decision without losing alternatives;
- retrieve associated people, place, proof, note, and source;
- see the next dated anchor and next watched milestone;
- open a critical Plan, Map, or Wallet object with weak connectivity and understand its freshness;
- perform the same essential decision and retrieval tasks on phone and desktop without mentally returning to Gmail, Leap, the official site, or a booking tool.

## External guidance used

- [Apple Human Interface Guidelines: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars): top-level sections should remain predictable and use labels.
- [Apple Human Interface Guidelines: Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets): a sheet should contain a scoped task related to the parent context.
- [WCAG 2.2 target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum): interactive targets require at least 24 CSS pixels or sufficient separation; larger targets are beneficial for touch use.
- [web.dev offline UX guidance](https://web.dev/articles/offline-ux-design-guidelines): cached content needs visible freshness and connection context, and background updates should not unexpectedly replace the user's current view.
