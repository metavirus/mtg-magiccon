# Experience Architecture Candidate

Updated: 2026-08-01
Status: Candidate for owner review; not yet an approved UI or schema

## Decision question

Can the app provide one stable, understandable home for every important MagicCon need without copying the fragmented navigation of its source systems or turning the landing page into an everything-dashboard?

## Recommendation

Use five persistent destinations:

1. **Home** — attention, milestones, meaningful changes, and the next useful object.
2. **Plan** — time, decisions, commitments, conflicts, and trip constraints.
3. **Explore** — events, artists, stores, vendors, prizes, and places.
4. **Wallet** — owned, paid, claimable, showable, and reference-worthy items.
5. **Notes** — human-authored memory across every contextual object.

Treat **Now** as a focused operational layer rather than a sixth destination. It appears prominently when time makes an object immediately relevant and can be opened from Home or Plan. This keeps “what do I do next?” one gesture away without leaving an empty Now tab on the screen for months.

Treat **Places** as a first-class object and an Explore mode, not a separate primary destination. Any event, artist, vendor, pickup, or note can open its place directly. The eventual atlas can grow inside this mode without forcing users to navigate through a map to retrieve an object they already know.

Treat **Trip** as a cross-cutting MagicCon context:

- dates and travel constraints belong in Plan;
- confirmations, hotel and flight references, and receipts belong in Wallet;
- urgent travel changes belong on Home;
- place and route affordances open from the object itself.

Treat **Sources** as trust infrastructure rather than ordinary product navigation. Source health appears quietly on Home, while evidence drawers and a source register remain reachable from every supported fact. The owner should not need to browse by website or email system to find convention information.

Treat **Remember** as an archival lens across Plan, Explore, Wallet, and Notes rather than a permanently sparse tab. After the convention, Home changes its emphasis to useful residue and the other surfaces default toward completed or historical objects.

## Why five destinations

Five destinations fit a conventional mobile bottom bar without hiding a core action behind a menu. The same destinations can form a desktop sidebar, leaving room for richer local modes and filters. More importantly, each destination answers a distinct owner question:

| Destination | Owner question | Does not become |
| --- | --- | --- |
| Home | What deserves attention now? | News feed or monitoring console |
| Plan | What am I considering or doing, and what conflicts? | Leap clone or generic calendar |
| Explore | What is available, relevant, or worth finding? | Flat brochure or source directory |
| Wallet | What do I own, need, show, claim, or reference? | Booking or accounting platform |
| Notes | What did I write down, and what was it about? | Machine activity stream |

The five-way split is intentionally object- and decision-shaped. Official News, Leap, Magic Companion, Gmail, airline, hotel, store, and map are sources or operational providers, not destinations in the owner's mental model.

## Surface responsibilities

### Home

Home is a calm attention surface. It assembles only what is currently consequential:

- trustworthy quiet or a small number of meaningful changes;
- waiting-to-drop milestones;
- the next useful confirmed object;
- deadlines or contradictions that require a decision;
- source-health degradation only when quiet can no longer be trusted;
- during the event, an entry into Now.

Home is not a permanent feed of captured observations. Low-value observations remain recoverable in the relevant objects and source register.

### Plan

Plan owns time-bearing personal decisions, not every published occurrence. It combines:

- interests, tentatives, commitments, and purchases;
- fixed and flexible activities;
- Black Lotus, ticketed play, loose programming, and personal intentions;
- travel boundaries, hotel transitions, pickup windows, and meaningful deadlines;
- hard conflicts, soft conflicts, and visible overlap;
- person participation without requiring person accounts.

Desktop may use a dense time canvas. Mobile must still support inspection, state changes, conflicts, and purchased details through a chronological agenda and focused day views.

### Explore

Explore owns the changing universe of things the convention offers:

- events and programming;
- artists and card-signing opportunities;
- show store and vendor merchandise;
- prize wall;
- vendors and exclusives;
- places and map context.

It uses content-aware modes only when content exists. Before ticketed play or catalogs appear, absent modes do not consume visual space. Search and filters should operate across normalized objects while source detail stays behind evidence affordances.

### Wallet

Wallet owns operational possession and proof:

- badges and orders;
- entitlements, discounts, shopping windows, and pickups;
- ticketed-play purchases and Companion codes if captured;
- travel and hotel confirmations;
- receipts and showable originals;
- Prize Tix and other lightweight operational balances.

Wallet shows pleasant extracted summaries but preserves the original artifact whenever a human may need to see it. Sensitive values are revealed deliberately and cached offline only under an approved policy.

### Notes

Notes defaults to human-authored content from anywhere in the app:

- standalone notes;
- notes attached to events, places, artists, items, receipts, or wallet entries;
- linked context and the current state of that context;
- search and lightweight time grouping.

Machine activity, source history, and balance changes remain optional drill-down logs. They do not compete with personal notes.

### Now operational layer

Now answers only immediate onsite questions:

- what is next;
- when it begins and when to leave;
- where to go and the best available location clue;
- who is involved;
- what to bring, show, enter, or claim;
- what changed or remains uncertain;
- which artifact is available offline.

Now is invoked by relevance, not by navigation obligation. Before the convention it may preview a genuinely imminent travel or deadline object, but it should otherwise remain absent.

## Navigation by form factor

### Mobile

- Persistent bottom destinations: Home, Plan, Explore, Wallet, Notes.
- A contextual Now card appears at the top of Home and Plan when active.
- Tapping the Now card opens a focused full-screen layer with one dominant object and nearby fallback information.
- Object cards open their details from the whole natural hit area; secondary icons perform recognizable direct actions.
- Local modes such as Events, Artists, Store, Prizes, and Map appear within Explore only when populated.

### Desktop

- Persistent left navigation uses the same five destinations.
- Local modes and view controls appear in each surface header.
- Plan may use a wide contention canvas with an adjacent detail drawer.
- Explore may use list/map or catalog/detail compositions.
- Evidence and notes appear in right-side drawers so the owner can retain planning context.

Mobile and desktop share capabilities and object state. They do not need layout parity.

## Phase-density matrix

The shell does not transform between operating periods. Priority, ordering, and defaults change.

| Surface | Quiet monitoring | Active planning | During convention | After convention |
| --- | --- | --- | --- | --- |
| Home | Trustworthy quiet, milestones, rare change | Decisions, deadlines, newly available catalogs | Now entry, confirmed changes, immediate claims | Receipts, reimbursements, useful notes, archive summary |
| Plan | Known trip boundaries, Black Lotus skeleton | Contention, interests, tentatives, purchases | Today agenda, live adjustments, paid consequences | Attended/skipped history and lessons |
| Explore | Available official details; absent modes collapse | Events, artists, stores, vendors, places | Nearby/reference-first catalogs, fresh availability | Historical browse; low prominence |
| Wallet | Badges, orders, travel, hotel, entitlements | Purchased events, deadlines, pickup preparation | Showable artifacts, codes, receipts, Prize Tix | Receipts, reimbursement, durable proof |
| Notes | Prior lessons and preparation notes | Decision notes attached in context | Very fast contextual capture | Primary cross-object memory and retrieval |
| Now layer | Usually absent | Only a truly imminent deadline or trip object | Dominant immediate operational view | Absent |

### Density rules

- Empty content modes disappear; their destination remains stable only when the destination has other useful content.
- A rare high-consequence item can reorder a surface but does not change its ownership.
- Home shows conclusions and next actions; evidence remains one click deeper.
- During the event, confirmed personal commitments outrank interesting published content.
- After the event, ephemeral live state fades while receipts, notes, reimbursement, and durable memories rise.

## Contextual-retrieval model

Every meaningful object should be reachable from the concept the owner remembers.

### Object neighborhoods

- **Event:** decision state, occurrence, people, entitlement, place, required artifact, notes, source evidence, conflicts.
- **Place:** map reference, upcoming events, vendor or artist, exclusives, notes, source evidence.
- **Person:** associated plans, badges, hotel nights, purchases, reimbursements, notes; not an app account by default.
- **Item:** store or prize listing, vendor/place, favorite or hidden state, availability observation, receipt, notes.
- **Wallet entry:** owner or beneficiary, original artifact, extracted facts, related event/place/item, notes.
- **Note:** parent object, human text, creation time, and backlinks to related context.

### Retrieval examples

| Remembered thought | Natural entry | Context recovered |
| --- | --- | --- |
| “When was that Planechase event?” | Plan or Explore event search | Black Lotus occurrence, interest, conflicts, source freshness |
| “Where is Dragon Shield?” | Explore vendor/place | Booth, map marker, exclusive item, note |
| “What do I show for the pickup?” | Wallet entitlement | Original receipt or order, place, window, note |
| “Where do I go next?” | Home's Now entry | Event, leave time, place clue, Companion artifact, uncertainty |
| “Which shirts were for Kellen?” | Notes or Wallet receipt | Attached note, original receipt, extracted line items |
| “What did Chris want to do?” | Person chip from Plan | Chris-associated interest and commitment context |

Backlinks should be real navigation, not decorative labels. A person chip, place label, source indicator, receipt association, or event relationship should open the corresponding context whenever that behavior is natural.

## Shared interaction vocabulary

### Whole-card navigation

The card body opens detail. Nested controls are reserved for frequent, unambiguous state changes such as favorite, reveal, add note, or Prize Tix adjustment. Dead card real estate is avoided without making every label look like a button.

### Detail drawer or focused layer

Desktop uses a side drawer when retaining surrounding context helps comparison. Mobile uses a focused layer or sheet. The content order remains consistent:

1. decision summary;
2. time, place, price, and people;
3. personal state and direct actions;
4. translated details and practical requirements;
5. notes and related objects;
6. source evidence, wording, and history.

### Chips and icons

- Heart: personal interest or favorite.
- Lock: committed or purchased time with meaningful consequence.
- Ticket: paid or entitled access.
- Flexible-time glyph: published time is movable or nonblocking.
- Person marker: association or participation, with stable person color plus initials or face.
- Alert mark: consequential change requiring attention.
- Freshness/source mark: evidence state and “as of” information.
- Custom lotus-inspired mark: Black Lotus eligibility or programming, using owned artwork rather than copied card art.

Color never carries meaning alone. Labels, icon shape, and state text remain available.

### Evidence affordance

A quiet source/freshness line opens evidence and history. It should answer:

- who published or observed this;
- when it was retrieved or observed;
- what wording supports the displayed fact;
- whether the display is tentative, changed, contradicted, or superseded;
- what personal interpretation has been added separately.

### Notes affordance

“Add note” is available in the detail context of meaningful objects. Existing notes appear as a concise preview and open into Notes without losing the backlink.

### Offline affordance

Offline-capable objects show when their critical view was saved. Stale or unavailable information is explicit. Write controls are disabled or held outside the canonical workflow; the interface never implies a successful server write while offline.

## Architectural boundaries implied by the candidate

This design does not authorize a table per tab. Surfaces are read models across small, related concepts. Navigation organization and database organization must remain independent.

The candidate does imply several durable modeling pressures to consider later:

- people must remain distinct from authenticated users;
- places need identity beyond free text;
- time-bearing objects need fixed, flexible, window, deadline, and live-assignment semantics;
- entitlement cannot be inferred from itinerary placement;
- evidence and personal interpretation must attach without overwriting normalized facts;
- notes need a safe cross-object association mechanism;
- offline packs need explicit contents and freshness.

These pressures are inputs to the next design gate, not permission for a comprehensive schema.

## Owner-review questions

1. Does the five-destination split match how the owner would naturally go looking for something?
2. Is Now stronger as a contextual layer than a permanent tab?
3. Does folding Places into Explore preserve enough prominence for the eventual interactive atlas?
4. Are Trip, Sources, and Remember better as cross-cutting contexts than top-level destinations?
5. Is any important object forced into an unnatural destination?

## Gate recommendation

Approve this candidate if the five destinations feel stable and the contextual placements above feel natural. If approved, the next work should define planning state, time semantics, conflicts, relevance, and source status against this architecture before detailed screen concepts or database design.
