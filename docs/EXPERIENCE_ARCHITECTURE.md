# Experience Architecture

Updated: 2026-08-02
Status: Core direction accepted; screen behavior and mobile navigation remain under review

## Decision question

Can the app provide one stable, understandable home for every important MagicCon need without copying the fragmented navigation of its source systems or turning the landing page into an everything-dashboard?

## Recommendation

Prefer focused, directly reachable destinations over an arbitrary tab limit:

1. **Home** — attention, milestones, meaningful changes, and the phase-aware focus.
2. **Calendar** — the broad visual stream of meaningful dates from now through Atlanta.
3. **Plan** — focused November 13–15 decisions, commitments, conflicts, and time contention.
4. **Explore** — the catalog of events, artists, stores, vendors, and prizes.
5. **Map** — places, spatial context, and eventually the interactive convention atlas.
6. **Wallet** — owned, paid, claimable, showable, and reference-worthy items.
7. **Trip** — flights, hotels, travelers, dates, and situated quality-of-life reference.
8. **Notes** — human-authored memory across every contextual object.

Place **Activity** below a visual divider as an easily reached utility destination. It combines chronological history with top-level stream tabs such as All, Changes, Sources, and Personal. This is the natural home for monitoring history, source health, captured observations, ingestion actions, and owner activity without making source systems part of the primary product model.

Treat **Now** as Home's phase-aware focus rather than another destination:

- during quiet monitoring, it presents trustworthy quiet, the next expected unlock, or a rare new signal;
- during active planning, it presents the decision or contention that most deserves attention;
- onsite, it becomes the immediate operational object: what, when, where, who, and what to show;
- after the convention, it presents only useful residue such as a reimbursement or follow-up, then recedes.

Map and Trip are direct destinations because they support distinct, recurring retrieval behaviors. Their facts still backlink into events, Wallet items, people, and notes rather than becoming isolated subsystems.

Sources remain trust infrastructure. They are directly reachable through Activity's Sources stream and through an evidence drawer on every supported fact. The owner should not need to browse by website or email system to find convention information.

Treat **Remember** as an archival lens across Plan, Explore, Wallet, and Notes rather than a permanently sparse tab. After the convention, Home changes its emphasis to useful residue and the other surfaces default toward completed or historical objects.

## Why focused destinations

The information architecture should not be compressed merely to fit a conventional five-item mobile bar. Each destination earns direct access by answering a distinct owner question. Mobile navigation should be designed around the approved architecture rather than forcing conceptual nesting too early.

| Destination | Owner question | Does not become |
| --- | --- | --- |
| Home | What deserves attention now? | News feed or monitoring console |
| Calendar | What meaningful thing happens when? | Generic month grid or dense contention planner |
| Plan | What am I considering or doing, and what conflicts? | Leap clone or generic calendar |
| Explore | What exists and might interest me? | Flat brochure or source directory |
| Map | Where is it, what is nearby, and what matters there? | Static image viewer or promised indoor GPS |
| Wallet | What do I own, need, show, claim, or reference? | Booking or accounting platform |
| Trip | What are the useful travel and lodging facts? | Travel-management platform |
| Notes | What did I write down, and what was it about? | Machine activity stream |
| Activity | What changed or happened in the app, and why? | Noisy telemetry console |

The split is intentionally object- and decision-shaped. Official News, Leap, Magic Companion, Gmail, airline, hotel, and store systems remain sources or operational providers, not destinations in the owner's mental model.

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

Plan owns focused November 13–15 resource contention, not every dated object. It combines:

- interests, tentatives, commitments, and purchases;
- fixed and flexible activities;
- Black Lotus, ticketed play, loose programming, and personal intentions;
- convention-day time pressure and meaningful operational windows;
- hard conflicts, soft conflicts, and visible overlap;
- person participation without requiring person accounts.

Desktop may use a dense time canvas. Mobile must still support inspection, state changes, conflicts, and purchased details through a chronological agenda and focused day views.

### Calendar

Calendar owns the broad dated story from now through the trip:

- milestones and expected information releases;
- deadlines and shopping windows;
- flights, hotel transitions, and travel dates;
- November 12 Black Lotus preview programming;
- November 13–15 convention-day summaries;
- useful post-event follow-ups.

Its default form is a vertically scrollable meaningful-date stream, not a conventional 30-day grid. Empty periods compress; month and week markers preserve orientation; dense periods naturally expand. A compact date navigator may support quick jumps.

Clicking a convention day expands a readable summary inline. Committed and Purchased events may appear individually, while Tentatives are summarized. “Open in Plan” deliberately changes context into the dense contention workspace for that day.

### Explore

Explore owns the changing universe of things the convention offers:

- events and programming;
- artists and card-signing opportunities;
- show store and vendor merchandise;
- prize wall;
- vendors and exclusives.

It uses content-aware modes only when content exists. Before ticketed play or catalogs appear, absent modes do not consume visual space. Search and filters should operate across normalized objects while source detail stays behind evidence affordances.

The Plan/Explore boundary is explicit:

- Explore answers “what could I do?” and may show the entire available catalog.
- Plan answers “how do the things I care about fit together?” and becomes the dense scheduling workspace.
- Expressing interest, making a tentative, or owning an entitlement is the ordinary bridge from Explore into Plan.

### Map

Map owns the spatial convention model:

- venue, floor, hall, zone, room, booth, table, and meetup context;
- events, vendors, artists, pickups, exclusives, and notes associated with places;
- official map versions and extracted labels;
- direct links from a place to its related objects and back again.

The first versions may be a place directory plus official-map references. The destination can later grow toward the interactive atlas without promising indoor positioning or forcing every map lookup through Explore.

### Wallet

Wallet owns operational possession and proof:

- badges and orders;
- entitlements, discounts, shopping windows, and pickups;
- ticketed-play purchases and Companion codes if captured;
- travel and hotel confirmations;
- receipts and showable originals;
- Prize Tix and other lightweight operational balances.

Wallet shows pleasant extracted summaries but preserves the original artifact whenever a human may need to see it. Sensitive values are revealed deliberately and cached offline only under an approved policy.

### Trip

Trip owns pleasant, lightweight travel and lodging reference:

- flight routes, dates, local times, travelers, and confirmation references;
- hotel stays, nights, people, addresses, and check-in/out facts;
- Maps and provider link-outs;
- material changes such as cancellation or a consequential schedule shift.

Travel constraints backlink into Plan, and original confirmations backlink into Wallet. Trip does not assess whether an adult has booked enough travel, manage reservations, or reproduce airline and hotel tools.

### Notes

Notes defaults to human-authored content from anywhere in the app:

- standalone notes;
- notes attached to events, places, artists, items, receipts, or wallet entries;
- linked context and the current state of that context;
- search and lightweight time grouping.

Machine activity, source history, and balance changes remain optional drill-down logs. They do not compete with personal notes.

### Activity

Activity is the comprehensive historical and trust surface, positioned below a divider in desktop navigation. Its top stream tabs are initially:

- **All:** a readable chronological union of meaningful activity;
- **Changes:** added, changed, canceled, contradicted, or superseded facts;
- **Sources:** source checks, captured observations, health, freshness, and exact URLs;
- **Personal:** decisions, purchases, notes, balance adjustments, and other owner actions.

Entries are human-readable and clickable into their context. Low-level diagnostics stay behind expansion. Notes remain separate because they are intentionally authored and retrieved; Activity explains what happened across the system.

### Now operational layer

Now is the leading contextual focus on Home. Its content changes by operating period rather than becoming a separate navigation obligation.

Onsite, it answers immediate questions:

- what is next;
- when it begins and when to leave;
- where to go and the best available location clue;
- who is involved;
- what to bring, show, enter, or claim;
- what changed or remains uncertain;
- which artifact is available offline.

Before the convention it can express trustworthy quiet, a waiting milestone, a consequential new signal, or the next planning decision. Afterward it can briefly elevate useful cleanup. It is invoked by relevance, and may collapse entirely when no focus adds value.

## Navigation by form factor

### Mobile

- Do not use a five-item constraint to decide which product concepts exist.
- Home, Calendar, Plan, Explore, Map, Wallet, Trip, Notes, and Activity must remain easy to reach without deep nesting.
- The exact mobile navigation treatment remains a screen-design question. Candidate treatments should be tested for reachability, labeling, safe-area use, and one-handed access.
- A contextual Now focus appears at the top of Home and may backlink into Plan, Map, Wallet, or Trip.
- Tapping an actionable Now focus opens the relevant object or a focused layer with nearby fallback information.
- Object cards open their details from the whole natural hit area; secondary icons perform recognizable direct actions.
- Local modes such as Events, Artists, Store, and Prizes appear within Explore only when populated.

### Desktop

- Persistent left navigation presents Home, Calendar, Plan, Explore, Map, Wallet, Trip, and Notes as focused destinations.
- Activity sits below a divider as a directly accessible utility rather than being buried in settings.
- Local modes and view controls appear in each surface header.
- Plan may use a wide contention canvas with an adjacent detail drawer.
- Explore may use list/map or catalog/detail compositions.
- Map may use atlas/detail or place-directory/detail compositions.
- Evidence and notes appear in right-side drawers so the owner can retain planning context.

Mobile and desktop share capabilities and object state. They do not need layout parity.

## Phase-density matrix

The shell does not transform between operating periods. Priority, ordering, and defaults change.

| Surface | Quiet monitoring | Active planning | During convention | After convention |
| --- | --- | --- | --- | --- |
| Home | Trustworthy quiet, milestones, rare change | Decisions, deadlines, newly available catalogs | Now entry, confirmed changes, immediate claims | Receipts, reimbursements, useful notes, archive summary |
| Calendar | Milestones, deadlines, travel, sparse dated context | Broad agenda and convention-day summaries | Trip and convention-day chronological reference | Follow-ups and historical date retrieval |
| Plan | Black Lotus reference with no manufactured contention | November 13–15 contention, Tentatives, and purchases | Focused day schedule and alternatives | Attended/skipped convention-plan history |
| Explore | Available official details; absent modes collapse | Events, artists, stores, vendors | Reference-first catalogs and fresh availability | Historical browse; low prominence |
| Map | Known venue/place references | Rooms, booths, transition context | Navigation reference, nearby objects, meetup points | Archived place context; low prominence |
| Wallet | Badges, orders, travel, hotel, entitlements | Purchased events, deadlines, pickup preparation | Showable artifacts, codes, receipts, Prize Tix | Receipts, reimbursement, durable proof |
| Trip | Confirmed flights, hotels, people, useful links | Constraints and consequential changes | Quick reference and Maps/provider link-outs | Historical reference; low prominence |
| Notes | Prior lessons and preparation notes | Decision notes attached in context | Very fast contextual capture | Primary cross-object memory and retrieval |
| Activity | Quiet source confidence and sparse history | Meaningful changes and decisions | Operational changes and personal actions | Searchable history with low-level detail recessed |
| Now focus | Quiet status or next unlock | Next decision or consequential deadline | Dominant immediate operational view | Small useful cleanup, then recedes |

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

## Visual direction

Use a restrained dark convention-command-center language with Magic-inspired accents rather than a generic corporate dashboard or a fantasy-card imitation.

### Foundation

- Near-black and deep navy surfaces provide the base.
- Layered charcoal and blue-black shading separates navigation, content fields, cards, drawers, and selected rows.
- Warm off-white primary text and cooler muted text preserve hierarchy without turning every surface bright.
- Borders and shadows remain subtle but sufficient to make clickable regions legible.
- Dense screens use color, shape, icon, spacing, and alignment together to reduce reading load.

### Semantic color direction

- Violet: Black Lotus eligibility and programming.
- Warm gold: committed, purchased, paid, or consequentially locked time.
- Rose or magenta: personal interest and favorites.
- Blue: tentative planning and neutral selection.
- Amber: meaningful change, unresolved contradiction, or approaching decision.
- Red: cancellation, invalid state, or lost entitlement requiring attention.
- Green: personally confirmed, observed onsite, successfully claimed, or healthy saved state.
- Stable person colors: Kavi, Chris, and Juan, always paired with initials or a face marker.

These mappings are the accepted starting language for screen testing. Color never communicates state alone and should not make routine publisher categories look urgent.

### Icon and block language

- Use recognizable icons for interest, commitment, ticket/entitlement, flexibility, people, place, map, evidence, note, change, and offline state.
- Use custom owned lotus-inspired iconography for Black Lotus rather than copied card art.
- Give time blocks, place blocks, wallet artifacts, and catalog items distinctive silhouettes and shading so screens do not become walls of identically shaped text cards.
- Use icons as compact state carriers; preserve labels or accessible text wherever the meaning is not universal.

### Design process

Visual work should support stepwise product decisions. Do not present a polished whole site as a substitute for reasoning through navigation, state, density, and behavior. Each prototype pass should isolate a small set of decisions, explain the recommendation, and then incorporate owner feedback before increasing fidelity.

## Architectural boundaries implied by the direction

This design does not authorize a table per tab. Surfaces are read models across small, related concepts. Navigation organization and database organization must remain independent.

The direction does imply several durable modeling pressures to consider later:

- people must remain distinct from authenticated users;
- places need identity beyond free text;
- time-bearing objects need fixed, flexible, window, deadline, and live-assignment semantics;
- entitlement cannot be inferred from itinerary placement;
- evidence and personal interpretation must attach without overwriting normalized facts;
- notes need a safe cross-object association mechanism;
- offline packs need explicit contents and freshness.

These pressures are inputs to the next design gate, not permission for a comprehensive schema.

## Remaining screen questions

1. Which mobile navigation treatment preserves direct access without becoming cramped or obscure?
2. How should the accepted semantic language behave at phone density?
3. How should detail drawers and focused mobile layers preserve the user's comparison context?
4. Which parts of Plan need visual state propagation before the Black Lotus trust slice can be specified safely?

## Gate recommendation

The surface map, phase-aware Now, Activity framing, Calendar/Plan separation, and dark visual direction are accepted. The next gate is behavioral screen evidence: a representative Plan interaction model, event detail, and mobile translation that preserve the accepted planning semantics. Database design remains downstream of that evidence.
