# Plan Workspace Concept

Updated: 2026-08-01
Status: Deep design candidate for stepwise owner review; not an approved screen or schema

## Decision question

How should Plan support a sparse pre-release period, a dense contender-selection period, a mostly committed schedule, and fast onsite use without becoming four unrelated products?

## Recommendation

Plan is a stable workspace with three submodes:

1. **Decide** — synthesize candidates and resolve contention.
2. **Calendar** — see time, overlap, flexibility, constraints, and the working schedule.
3. **Agenda** — read the chosen day chronologically and operate it on mobile.

The modes remain conceptually stable. The default mode and content density change with the operating period:

| Period | Default | Why |
| --- | --- | --- |
| Before ticketed play | Calendar | Shows the small number of known Black Lotus, travel, and deadline anchors without manufacturing candidate placeholders |
| Active event selection | Decide | The main job is comparing contenders and understanding what each choice displaces |
| Mostly committed | Calendar | The main job is validating the shape and pressure of the chosen days |
| During convention | Agenda | The main job is reading today quickly; Now handles the immediate object |
| After convention | Agenda/history | The main job is occasional retrieval of attended, skipped, and purchased context |

Phase sensitivity changes the default, not the conceptual ownership of information. The owner may switch modes at any time.

## Why three modes

A single calendar is weak at comparing verbose events. A candidate list is weak at showing time. A chronological agenda is weak at resolving several overlapping possibilities. Each mode gives one job enough room without creating separate copies of personal state.

The modes are different views over the same events, decisions, people, entitlements, and time semantics. Moving an event to Tentative in Decide immediately affects Calendar. Committing it in Calendar immediately resolves or displaces options in Decide. Agenda never becomes a separate schedule.

## Decide

Decide is the high-value synthesis workspace during ticketed-play selection.

### Core composition

- **Candidate pool:** Interested events that are worth retaining but have not yet been promoted to Tentative.
- **Contention sets:** Tentative contenders grouped because they overlap, compete for the same energy or budget, or serve as alternatives for a similar experience.
- **Commitment consequence:** a visible explanation of what committing one contender would displace.
- **Selected-event detail:** a drawer or pane with translated description, intelligence rationale, price, duration, flexibility, people, access, notes, and source evidence.

The candidate pool and contention sets may use a left/right composition on wide desktop or top/bottom composition at medium widths. The selected-event detail appears only when useful and should not permanently squeeze the comparison space.

### Contention sets

Contention sets are more than time-conflict groups. They may represent:

- direct overlap;
- a back-to-back sequence worth reviewing;
- several attractive activities competing for one day;
- a Black Lotus event versus a paid general event;
- two variants of a similar format;
- a group/person choice, even though MVP remains owner-managed.

The interface must label why the set exists. AI may suggest a set, but the owner can ignore, split, or regroup it without changing event state.

### Candidate ordering

Default candidate ordering should be personal relevance, tempered by schedule consequence. Other available sorts can include:

- start time;
- price;
- duration;
- newly published or changed;
- scarcity or sold-out state.

Filters should be available but recessed behind a clear filter control rather than permanently consuming the toolbar. Candidate filters may include day, planning state, program/source family, fixed/flexible, price, format, competitiveness, person, and availability.

The app should avoid a wall of filter chips before real inventory proves which dimensions matter.

### Commitment behavior

Committing a contender:

- converts its time block to solid treatment;
- creates a hard conflict only with another fixed Commitment;
- visibly displaces overlapping Tentatives without changing their state;
- recalculates intelligence chiclets and schedule pressure;
- defaults to gold purchase lock as well if the event was marked Purchased.

Displaced Tentatives remain attached to the relevant timeslot or contention set and can be restored without searching the catalog again.

## Calendar

Calendar is the temporal truth surface for the owner's working plan.

### Layers

- **Constraints:** travel boundaries, hotel transitions, deadlines, and meaningful windows; visually recessed unless consequential.
- **Committed blocks:** solid primary blocks; overlapping fixed Commitments are the only hard conflicts.
- **Purchased overlay:** gold lock layered onto the event rather than a separate block type.
- **Tentative blocks:** shaded or outlined blocks that can stack or offset when overlapping.
- **Displaced Tentatives:** dimmed but visible alternatives associated with the committed timeslot.
- **Flexible activities:** faint or movable blocks; published anchors remain distinguishable from personal placement.
- **Fuzzy tails:** fading or hatched end regions when optional expected-exit information exists.
- **Pressure cues:** adjacency, conditional overlap, long day, or meal-window intelligence shown subtly.

Interested-only events do not appear as full calendar blocks by default. A “show interests” option may place lightweight markers at their published times when the owner wants a broader scan.

### Desktop density

Desktop may provide:

- one-day and multi-day time canvases;
- aligned vertical time axes;
- side-by-side convention days when readable;
- a candidate tray at the side or bottom;
- an event detail drawer without losing the time context;
- zoom or density controls only if real inventory demonstrates the need.

The design should allow overlap visibly rather than forcing every event into a single nonoverlapping lane.

### Sparse period

Before ticketed play, Calendar should not render large empty day grids. It can use a compact known-anchors treatment:

- Black Lotus schedule skeleton;
- flight and hotel boundaries when useful;
- known deadlines and shopping windows;
- a clear statement that ticketed-play inventory is not yet available.

The Calendar mode still exists; its density reflects available information.

## Agenda

Agenda is the chronological reading and operating mode.

### Before and during the event

- Groups objects by day.
- Presents Committed and Purchased events as the main sequence.
- Shows Tentative alternatives in a compact subordinate area.
- Makes flexible activities visibly movable.
- Links the immediate event into Now.
- Keeps location, person, artifact, intelligence, and notes one tap away.

Agenda is likely the most natural mobile Plan view, but mobile must still be able to open Decide and Calendar behaviors in forms suited to the screen.

### After the event

Agenda can default to attended, skipped, and purchased history without requiring the owner to complete a retrospective workflow.

## Shared toolbar and filters

Plan's surface header should contain only stable, high-value controls:

- Decide / Calendar / Agenda submode.
- Day or date range.
- Filter control with active-count indicator.
- Search when inventory exists.

Sorting belongs primarily to Decide's candidate pool. Calendar uses time ordering by definition. Agenda uses chronological ordering by definition.

Person chips can filter or annotate participation without implying multi-user accounts. Black Lotus eligibility remains visible where it changes access or comparison.

## Multipane behavior

Multipane layout should follow the job:

- **Decide, wide desktop:** candidate pool beside contention workspace; selected event in an on-demand drawer.
- **Calendar, wide desktop:** time canvas plus optional candidate tray; selected event in a drawer.
- **Medium desktop/tablet:** main workspace above, candidate tray or selected detail below.
- **Mobile:** one dominant list/canvas at a time; detail and comparison use sheets or focused layers.

The design should not permanently display three dense panes merely because the screen is wide. Each pane must support the current decision.

## AI placement

AI remains embedded rather than becoming a Plan subtab:

- one sparkle intelligence chiclet per event;
- contention-set explanation;
- consequence preview before committing;
- conditional-overlap and schedule-pressure rationale;
- rare A/B question in Now when owner input resolves real ambiguity.

There is no AI Recommendations tab. The value is contextual synthesis inside the owner's existing decision surface.

## States that should not become tabs

- Conflicts: a property of Calendar and Decide.
- Candidates: a pool inside Decide.
- Purchased: a filter and overlay across Plan.
- Black Lotus: a program/eligibility treatment, not a separate schedule.
- People: chips and filters in MVP; collaboration remains v2.
- AI: embedded intelligence, not a destination.

## Initial screen-design sequence

Plan should be designed through bounded decisions rather than one polished mockup:

1. Decide mode: candidate pool versus contention-set composition.
2. Tentative stacking and displacement inside one contention set.
3. Calendar layering for Committed, Tentative, flexible, fuzzy, and purchased states.
4. Sparse pre-ticketed Calendar behavior.
5. Mobile Agenda and access to comparison/detail.
6. Toolbar, filters, and sorting only after the main workspaces are credible.

## First owner-review questions

1. Do Decide, Calendar, and Agenda describe genuinely distinct jobs?
2. Should active event selection default to Decide rather than Calendar?
3. Are contention sets a useful synthesis unit beyond literal overlaps?
4. Should the sparse pre-ticketed Plan default to compact Calendar anchors?

## Boundary

This concept does not authorize a comprehensive event model, scheduling engine, automated grouping agent, monitoring, or screen implementation. It defines the workspace behavior to test before deriving the Black Lotus trust-slice contract.
