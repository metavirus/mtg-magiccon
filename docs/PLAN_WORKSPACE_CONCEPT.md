# Plan Workspace Concept

Updated: 2026-08-03
Status: Accepted interaction study; production implementation bracketed for v1.5

## Implementation boundary

Plan is deliberately outside the quiet-period MVP implementation path. The owner will not use dense scheduling until ticketed play exists, and a partial production scaffold would create more architectural risk than product value. Preserve this document and the working preview as design evidence, but do not derive Plan-specific schema, conflict machinery, scenario storage, drag/drop behavior, or responsive production contracts from it yet.

Resume Plan only when representative ticketed-play data exposes actual Atlanta variation, or when a deliberately comprehensive structural fixture is approved. The existing narrow itinerary record remains part of the trust-slice proof; it is not the schema for this eventual workspace.

## Purpose

Plan is the focused resource-contention workspace for the three public convention days: Friday through Sunday, November 13–15, 2026. It answers:

- Which activities are serious contenders?
- Which contenders compete for the same time, energy, money, or experience?
- What am I committing to?
- What does each commitment displace?
- How does the resulting convention weekend fit together?

Plan is not a general calendar, trip itinerary, or month view. Broad dated context belongs in the primary Calendar surface.

## One stable workspace

Plan does not split decision-making and scheduling into separate modes. The shared time canvas is the decision surface: selecting an event exposes its detail and reversible state controls without requiring a context change merely to mark it Interested, Tentative, Committed, or Purchased.

Calendar owns the broader onsite agenda and quick chronological glance. Plan owns focused Friday–Sunday contention, consequence preview, and recovery of displaced alternatives.

November 12 Black Lotus preview programming may be referenced where useful, but it does not need the same contention machinery because access and the day's structure are already constrained. November 11 travel belongs in Calendar and Trip.

### Core composition

- **Shared time canvas:** Interested events, Tentative contenders, Commitments, and purchases retain one temporal geometry.
- **Compact candidate context:** retained events can be reached without creating a permanent shelf that competes with the time field.
- **Commitment consequence:** a visual preview of what choosing one contender displaces.
- **Selected-event detail:** an on-demand drawer or page with translated details, rationale, evidence, and notes.

On desktop, the time field uses the available width. Event detail opens as a true overlay drawer rather than reflowing and compressing the later hours. It closes explicitly, with Escape, on day change, or when empty planning space receives attention. On mobile, detail is a bottom sheet or focused layer over a compact time ruler and readable event rows.

### At-a-glance event blocks

Multi-event views show only decision headlines:

- title;
- time and duration;
- price or access;
- planning state and gold purchase lock;
- person markers where relevant;
- one intelligence chiclet;
- exceptional source state such as Changed, Canceled, or Sold out.

The entire natural block opens detail. Narrow blocks use concise contextual labels while full identity remains in detail; the product does not sacrifice proportional time merely to fit a long organizer title.

Person markers remain a lightweight overlay rather than a collaboration subsystem. Stable fill color and white initial identify the person; border treatment shows Interested, Tentative, Committed, or Purchased. Markers sit away from the title and timing, preferably at the lower-right, and reveal exact involvement on hover, focus, or tap. People with no relevant relationship are omitted.

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

Interested events may remain as quiet full-size blocks so their duration and overlap stay legible. They use lower contrast than Tentatives and Commitments; promotion strengthens state treatment without changing temporal geometry. Do not add a separate “show interests” mode unless real schedule density later proves it necessary.

### Density and panes

Desktop provides a detailed day canvas and an on-demand overlay drawer. The closed drawer restores the full horizontal time field. The design must allow visible overlap instead of forcing every event into one nonoverlapping lane.

Mobile uses Friday/Saturday/Sunday switching, a thin shared time ruler for temporal relationships, and full-width event rows for reading and state changes. The ruler and rows select the same object. It must preserve overlaps, displaced Tentatives, flexibility, detail, and reversible controls without reproducing the desktop lanes literally.

### Accepted visual state grammar

- **Interested:** readable text, quiet/faded category fill, dotted border.
- **Tentative:** full category fill, dotted border.
- **Committed:** full category fill, solid border.
- **Purchased:** Committed treatment plus a gold financial marker; purchase remains reversible and returns to the prior planning state when unmarked.
- **Selected:** cool-blue focus treatment only; gold never doubles as focus.
- **Displaced:** a separate rose consequence cue that does not erase or fade the underlying Tentative state.
- **Person marker:** smaller stable fill and white initial identify the person; no border means Interested, dotted means Tentative, solid means Committed, and gold means Purchased.

Free and included events do not show a purchase control. Obvious UI semantics should not be repeated in explanatory prose.

## Relationship with Calendar

Calendar is the broad meaningful-date stream. Plan is the focused convention scheduling workspace.

Calendar may show a November 13 date cluster with:

- Committed and Purchased events;
- the count of Tentative contenders;
- major schedule pressure;
- a compact expanded preview.

Calendar does not reproduce the contention workspace. “Open Friday in Plan” changes context deliberately and opens Plan with Friday selected.

## AI placement

AI remains embedded:

- one intelligence chiclet per event;
- contention-set explanation;
- consequence preview before commitment;
- conditional-overlap and pressure rationale;
- rare A/B feedback through Now when an answer materially improves planning.

There is no AI, Conflicts, Purchased, Black Lotus, People, Candidates, Decide, or Schedule subtab. Those are intelligence, states, treatments, filters, or layers inside Plan.

## Remaining design sequence

1. Test the Explore-to-Plan handoff into Interested and Tentative.
2. Test a denser real-data-like day without changing the accepted state grammar.
3. Test the Calendar-to-Plan handoff and onsite Calendar agenda.
4. Add filters or sorting only after actual inventory proves a need.

## Boundary

This concept does not authorize a comprehensive event model, scheduling engine, automated grouping agent, or screen implementation. It defines the focused workspace to test before deriving the Black Lotus trust-slice contract.
