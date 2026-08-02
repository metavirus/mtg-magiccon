# Plan Workspace Concept

Updated: 2026-08-02
Status: Direction accepted; detailed visual behavior remains under review

## Purpose

Plan is the focused resource-contention workspace for the three public convention days: Friday through Sunday, November 13–15, 2026. It answers:

- Which activities are serious contenders?
- Which contenders compete for the same time, energy, money, or experience?
- What am I committing to?
- What does each commitment displace?
- How does the resulting convention weekend fit together?

Plan is not a general calendar, trip itinerary, or month view. Broad dated context belongs in the primary Calendar surface.

## Stable modes

Plan has two stable submodes:

1. **Decide** — synthesize candidates and resolve contention.
2. **Schedule** — inspect the focused Friday–Sunday time canvas.

During active event selection, Decide is the natural default. As commitments accumulate, Schedule may become the natural default. The owner can switch at any time.

November 12 Black Lotus preview programming may be referenced where useful, but it does not need the same contention machinery because access and the day's structure are already constrained. November 11 travel belongs in Calendar and Trip.

## Decide

Decide is the differentiated planning surface.

### Core composition

- **Candidate pool:** Interested events worth retaining but not yet promoted to Tentative.
- **Contention sets:** Tentative contenders grouped because they overlap or otherwise compete.
- **Commitment consequence:** a visual preview of what choosing one contender displaces.
- **Selected-event detail:** an on-demand drawer or page with translated details, rationale, evidence, and notes.

On wide desktop, the candidate pool can sit beside the dominant contention workspace. At medium widths it can move above or below. Event detail should open only on selection rather than permanently creating a crowded third pane.

### At-a-glance event blocks

Multi-event views show only decision headlines:

- title;
- time and duration;
- price or access;
- planning state and gold purchase lock;
- person markers where relevant;
- one intelligence chiclet;
- exceptional source state such as Changed, Canceled, or Sold out.

The entire natural block opens detail. Desktop may retain comparison context with a drawer; mobile may use a focused page or sheet.

### Visual contention sets

Contention should not degrade into a ranked text list. Two or three contenders can be positioned against a shared mini time rail:

- spatial position reveals overlap;
- block shape and shading reveal fixed, flexible, and fuzzy time;
- violet identifies Black Lotus context;
- gold lock identifies purchase;
- solid versus translucent fill distinguishes Commitment and Tentative;
- person and interest markers remain compact;
- selecting a contender emphasizes it and dims the time or opportunities it would displace.

Desktop may compare contenders side by side. Mobile stacks the same visually encoded blocks while retaining the common time reference.

### Contention sets beyond overlap

A set may represent:

- direct overlap;
- back-to-back pressure;
- several attractive activities competing for one day;
- Black Lotus versus paid general programming;
- similar formats or experience substitutes;
- a person/group tradeoff, while MVP remains owner-managed.

The interface labels why a set exists. AI may propose a set, but cannot silently change event state.

### Candidate ordering and filtering

Default ordering is personal relevance tempered by schedule consequence. Optional sorts may include time, price, duration, newly published or changed, and scarcity.

Filters remain recessed until useful. Potential filters include day, state, program family, fixed/flexible, price, format, competitiveness, person, and availability. Do not permanently display a wall of filter chips before real inventory proves the need.

## Schedule

Schedule is the detailed temporal view for November 13–15 only.

### Range controls

- Friday;
- Saturday;
- Sunday;
- all three days.

There is no generic month or week context inside Plan. Broad dates and travel days belong in Calendar.

### Time layers

- **Committed blocks:** solid primary blocks; overlapping fixed Commitments are the only hard conflicts.
- **Purchased overlay:** gold lock layered onto the event.
- **Tentative blocks:** shaded or outlined blocks that can stack or offset.
- **Displaced Tentatives:** dimmed but visible alternatives tied to the relevant timeslot.
- **Flexible activities:** faint movable blocks with published anchors kept separate from personal placement.
- **Fuzzy tails:** fading or hatched end regions only when contextual uncertainty is useful.
- **Pressure cues:** adjacency, conditional overlap, long day, or meal-window intelligence.

Interested-only events do not appear as full blocks by default. A later “show interests” option may add lightweight markers if useful.

### Density and panes

Desktop may provide a detailed day canvas, an all-three-days overview, an optional candidate tray, and an on-demand event drawer. The design must allow visible overlap instead of forcing every event into one nonoverlapping lane.

Mobile may use a focused day timeline with Friday/Saturday/Sunday switching. It must preserve the ability to inspect overlaps, displaced Tentatives, flexibility, and detail even if the dense desktop canvas is not reproduced literally.

## Relationship with Calendar

Calendar is the broad meaningful-date stream. Plan is the focused convention scheduling workspace.

Calendar may show a November 13 date cluster with:

- Committed and Purchased events;
- the count of Tentative contenders;
- major schedule pressure;
- a compact expanded preview.

Calendar does not reproduce the contention workspace. “Open Friday in Plan” changes context deliberately and opens Schedule or Decide with Friday selected.

## AI placement

AI remains embedded:

- one intelligence chiclet per event;
- contention-set explanation;
- consequence preview before commitment;
- conditional-overlap and pressure rationale;
- rare A/B feedback through Now when an answer materially improves planning.

There is no AI, Conflicts, Purchased, Black Lotus, People, or Candidates subtab. Those are intelligence, states, treatments, filters, or panes inside Decide and Schedule.

## Remaining design sequence

1. Candidate pool versus contention-set composition.
2. Shared-time-rail contender comparison.
3. Tentative stacking and displacement.
4. Schedule layering and three-day overview.
5. Mobile Decide and Schedule behavior.
6. Toolbar, filters, and sorting after the main jobs are credible.

## Boundary

This concept does not authorize a comprehensive event model, scheduling engine, automated grouping agent, or screen implementation. It defines the focused workspace to test before deriving the Black Lotus trust-slice contract.
