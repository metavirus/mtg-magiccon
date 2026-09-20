# Live UI/UX audit — September 19, 2026

## Approved implementation follow-through

The findings below preserve the original audit. Kavi subsequently approved the bounded implementation. U1–U7 are addressed in code: shared public Companion panel, honest hotel-reference routing, attendance certainty, mobile Plan wrapping/controls, unread/applied history labels, useful copy/disclosures, and artist value freshness. U8 completed: honest Companion destination label, Trip/timezone copy, on-demand unit/cap labels and prominent contradictions, clear-search recovery, Explore Escape dismissal. Flexible-time presentation and note touch-target review remain optional polish, not verified fixes. No feature or receipt artifact was removed; missing hotel originals were not invented or ingested.

The final production ship gate passed 418 tests plus text/secrets/GitHub verifier guards. Actual 390px screenshots checked Plan titles/actions and readable code, Calendar code, Explore code/dismissal, Omni-to-Wallet reference, artist attendance/card popup, and the on-demand warning; desktop Plan stayed compact. Public verification passed for `1811efd`. Signed-in deployed checks confirmed Fatehold's shared code in Explore, the applied flight facts/Trip action, all hotel-reference destinations, three real Home cards, and the balanced desktop Beseech popup with adjacent value date. No purchase, note, signing choice, or receipt was modified during browser checks. Cloud activation and quiet-repeat evidence is in the source-onboarding review.

## Scope and verdict

Audited the signed-in public app at `https://metavirus.github.io/mtg-magiccon/`, build `3b39bde36f08a8f33e0f93c66a48ea84a83ab287`. This was a click-through and screenshot-based usability review, not a check that elements merely exist. Desktop and narrow viewports were inspected, including a confirmed 390 × 844 CSS-pixel viewport. The browser viewport override was reset afterward.

The app does not need a redesign. Its main weaknesses are inconsistent object details, claims that exceed what a destination delivers, mobile event-name truncation, and internal implementation language presented as useful information. No app code, purchases, notes, signing choices, receipts, or scheduled automation was changed. Findings below are recommendations, not implemented fixes.

The [scheduled surveyor audit](SURVEYOR_AUDIT_2026-09-19.md) separately covers live cloud execution, source coverage, heartbeat behavior, Gmail capability, and legacy Activity entries. The public runner is healthy within its configured scope; broader coverage needs correction before claiming readiness for all incoming announcements.

## Actual coverage

| Surface | Actions and visual checks | Result / remaining issue |
|---|---|---|
| Home | Desktop/mobile; opened Sunday sellout notice and account menu | Calm hierarchy works; freshness label and notice explanation mislead (U5/U6). |
| Explore | Desktop/mobile; search, no-results state, Fatehold detail | Search works; code absent compared with Calendar, oversized Hide action, internal copy (U1/U6). |
| Plan | Desktop list/agenda; mobile list/agenda; people/day controls inspected | Shared comparison useful; narrow list cuts essential names, agenda scroll cue weak (U4). |
| Calendar | Desktop list and Fatehold detail; narrow detail/code panel | Public code visible to Kavi for Juan's event. Cross-surface consistency remains open (U1). |
| Wallet | Mobile Home/Play/Store/Other; Chris Original/Transfer; full-screen proof, next page, 150% zoom | Gmail-looking evidence and viewer work; hotel proof promise fails (U2). |
| Trip | Desktop Flights; mobile Hotels, Omni detail and Wallet action | Useful overview; proof/navigation gap and implementation prose (U2/U6/U8). |
| Info | Mobile Guide, on-demand guide, Catalogs and Import owner views | Readable guide; long detail and source-time conflict (U8). Historical catalog status explicit. |
| Artists | Mobile directory/watchlist/Cards to bring; desktop/mobile Beseech card popup | Art loaded; prior blank-column defect not reproduced. Attendance contradiction and prototype language remain (U3/U7). |
| Notes | Desktop/mobile list; opened an existing event note | Returns to related event/note; no substantial layout failure observed. |
| Activity | Desktop/mobile Hot and Changes; opened old flight notice | Hot correctly quiet; history looks like outstanding review (U5). |
| Map | Desktop orientation image and placeholder copy | Appropriate accepted placeholder; no new map work proposed. |
| Navigation | Desktop rail, mobile Events/More drawers, close controls, search restoration | Routes reachable. Explore did not dismiss with Escape; explicit close works (U8). |

No persistent user-choice or destructive controls were exercised. This is not a fresh installed-iPhone/offline, multi-account authorization, exhaustive keyboard/screen-reader, every-receipt, or every-external-link certification. Existing accepted iPhone offline proof stays accepted. Owner-visible catalog tools were not tested under another account. Screenshots were visually inspected in-session; receipt screenshots containing personal information were not checked into the repository.

## Prioritized findings

### U1 — The same event exposes different essential details by entry point

**High; confirmed inconsistency.** Open Mage Tower League — Fatehold from Explore, then Calendar. Calendar displays the public Companion code and copy action; Explore omits it. The missing-code history is not fully closed across the product even though Calendar works in this online session.

The code panel lives in Calendar detail (`src/App.tsx:6750`); Explore uses another presentation. Reuse a compact canonical event-facts/code block across relevant entry points. Keep public codes shared, source links, planning actions, notes, and raw official facts.

**Acceptance:** the same event opened through Explore, Calendar, and any Plan detail exposes the same known code and copy behavior; absent codes are never invented. Add a cross-entry regression check, not another Calendar-only assertion. Preserve offline projection behavior without reopening the whole accepted offline campaign.

### U2 — “Open Wallet proof” does not open proof

**High; confirmed destination/claim failure.** Trip → Omni → Open Wallet proof lands on Wallet Home badges. Wallet → Other → Omni opens a one-sentence hotel summary, not an original receipt, under “Hotel receipts / Shared proof for every traveler.” This audit does not establish whether an original exists elsewhere.

Relevant code: generic Wallet navigation `src/App.tsx:2376`, `:5807`; hotel section `:5730`; `tripHotelDetail` at `:5757`. Resolve the selected hotel/proof, not just the Wallet page. If no original is captured, say so and label the item itinerary details. Preserve every artifact; never manufacture evidence or silently substitute a summary.

**Acceptance:** available originals open directly from Trip in the readable viewer; missing originals get an honest state. Check all three hotels and return navigation, not just Omni.

### U3 — Unconfirmed artist presented as attending all days

**High; confirmed factual contradiction.** Rebecca Guay's watchlist modal says “Likely artist watchlist seed” / unconfirmed candidate alongside “Attendance: All days” / “Appearing: All days.” This could prompt a signing plan based on an unconfirmed appearance.

At `src/App.tsx:2651`, `appearance_days` wins over unconfirmed status. Attendance certainty must take precedence over day scope. Preserve the watchlist and its holdings/notes.

**Acceptance:** directory and modal consistently distinguish unconfirmed, confirmed all-days, and confirmed day-specific attendance. Include an unconfirmed fixture with inherited `All days` data.

### U4 — Mobile Plan prioritizes repeated metadata over names

**Medium; screenshot-confirmed.** At 390px Friday List cuts names to “Unknown wit…”, “Collector Booster Sealed - Re…”, and “Hexhaven Study Hall Se…”, while repeating time and reserving space for price, sellout, people, and three planning controls.

Give names a naturally wrapping primary row; retain compact time/people/status and every action. Keep purchased state strongest. Agenda's horizontal timeline needs an unobtrusive continuation cue: observed 806px scroll width within 370px. Do not revive deferred planning architecture.

**Acceptance:** long real titles remain identifiable without opening every row at 390px, all actions remain reachable, and desktop stays compact. Check own versus companion purchases. “Undo purchase” guidance must not promise an action unavailable on permanently locked purchases.

### U5 — History looks unresolved; freshness means something else

**Medium; confirmed UI/code mismatch.** Activity Changes contains three old “needs review” entries: an August flight update and two August official notices. Hot correctly shows zero. Surveyor report S5 explains compatibility announcements versus already-applied flight history; these are not three current blocked catches.

Distinguish unread/history/applied from action-required. Show the changed flight facts and link to Trip; normalize dates instead of mixing locale and raw ISO strings. Preserve review preferences/history when reconciling compatibility rows; do not auto-dismiss unresolved decisions.

The rail's “Last checked” derives from device `slice.savedAt` (`src/App.tsx:1344`, `:1964`, `:1992`), not cloud checking. Label device refresh honestly or separately expose actual survey freshness.

**Acceptance:** users can distinguish action-required, applied, and unread, and device refresh from official-source checking. Preserve the 24-hour quiet sellout and seven-day announcement lifetimes without refreshing their age.

### U6 — Internal implementation copy displaces useful content

**Medium; confirmed polish.** Omni explains how Trip should differ from a booking app. Explore repeats “Assessment… staged for review” and a generic official-listing statement. Home's sellout explanation discusses deduplication, not impact on this group. Explore's filled full-width Hide button dominates the event drawer.

Replace internal prose with concrete facts/impact. Keep useful provenance and reasoning available through disclosure; keep Hide but give it secondary emphasis. Preserve functionality.

**Acceptance:** the first screen answers what/when/who/important action. Technical supporting detail remains available without competing with facts.

### U7 — Artist workbench retains prototype language and distant value freshness

**Low/medium; confirmed polish.** “1 selected cards for POC artists” (`src/App.tsx:6357`) is internal and grammatically wrong. Price is prominent, its August 19 source date distant. Art-fit/confidence explanations crowd the signing decision.

Use natural singular/plural copy, an estimated/as-of cue beside price, and disclosure for extended matching rationale. Preserve private workbench boundaries, sources, card art, notes, ownership and Packed/Signed state. Current card-popup geometry and Cards to bring grouping are worth retaining.

### U8 — Smaller follow-up opportunities

These are bounded polish, not reasons to rebuild accepted surfaces:

- Show flexible/start context instead of making a league look like a five-minute appointment; retain raw source time in details.
- “Open Companion” links to the product webpage, not an app handoff. Label the destination honestly.
- Flights keeps a hotel-specific headline/subtitle. Use flight-specific context and departure/arrival time zones. Make the “Receipt in Gmail” chip's informational role clear, or link captured proof if available.
- On-demand guide: summarize constraints near the top; explain `$5 · $100` as unit/cap. Keep the full guide.
- The guide quotes a Sunday “3 PM PT” sales cutoff for Atlanta. Surface the source contradiction rather than guessing a correction or promoting copied upstream content.
- No-results says clear search but has no direct clear/reset action. Add a small recovery control without changing hidden choices.
- Standardize Escape dismissal: artist popup dismissed, Explore drawer did not; explicit close was reachable.
- Check tiny adjacent note-open/delete touch targets and accessible names. No deletion was exercised; accidental deletion is a risk to test, not an observed incident.

## Recommended sequence

1. **Trust and consistency:** U1–U3 plus U5, with each original failing click path rechecked.
2. **Incoming-source readiness:** surveyor S1/S3 (existing linked sources plus initial review), S2 (independent Gmail coverage receipt), S4 (obsolete instructions). Keep a bounded first-party watch set, not a general crawler. Search success is not receipt-ingestion success.
3. **Small visual pass:** U4/U6/U7 and cheap U8 improvements. Recheck actual 390px and desktop screenshots.

No feature removal is proposed. Real Atlanta catalog publication, map activation, speculative scheduling features, broad design-system work, and a repeat of accepted iPhone offline proof remain out of scope. Implement and publish only at an approved checkpoint; this report does not change the public app.
