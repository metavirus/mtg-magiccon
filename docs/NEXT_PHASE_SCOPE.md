# Next Phase Scope: Product Design and Trust Slice

Updated: 2026-08-01

## Phase outcome

Turn the completed problem-space discovery into a coherent, testable product design and prove one narrow path through the app's trust architecture.

This phase should answer two questions:

1. Does the proposed interface make MagicCon information easier to understand, decide on, and retrieve across the quiet, planning, and onsite periods?
2. Can one consequential official fact move safely from source evidence to a personal plan, survive a later change, and remain readable offline?

The phase is complete when those questions can be answered from working evidence. It is not a commitment to the app's comprehensive schema or final visual design.

## Why this is the right next phase

The foundation already proves project identity, authentication, owner-scoped RLS, and a read-only offline shell. Discovery has also established the differentiated product: a calm personal command center that translates fragmented MagicCon systems into decisions and retrieves facts through the object the owner is thinking about.

The largest remaining uncertainty is no longer whether the idea has useful features. It is whether the features form one understandable product and whether the provenance model remains useful once it reaches the interface. Building broad ingestion or a large domain schema before resolving that uncertainty would harden guesses.

## Scope principles

- Design the whole experience, implement only the proof slice.
- Keep the interface recognizable throughout the before, during, and after periods; change priority and density rather than replacing the app.
- Optimize for decisions and contextual retrieval, not collection volume.
- Use MagicCon-specific friction as the relevance filter. Ordinary adult logistics stay quiet unless they constrain the convention plan.
- Keep publisher truth, observed reality, and personal interpretation visibly distinct.
- Treat source evidence as recoverable support, not default-interface clutter.
- Preserve owner-only MVP simplicity while allowing people such as Chris and Juan to be referenced independently of app accounts.
- Make mobile fully functional for ordinary use while allowing desktop to provide the richer contention-planning canvas.
- Keep offline behavior useful and honest: critical reads are cached, freshness is visible, and canonical writes wait for the network.

## Workstream 1: Experience architecture

Produce a compact surface map and navigation model for the persistent app shell.

The candidate primary surfaces are:

- **Home:** quiet status, meaningful changes, milestones, and the next useful thing.
- **Plan:** all time-bearing objects, event discovery, interest and commitment, overlap, and itinerary decisions.
- **Now:** the next confirmed or relevant object with time, place, required artifact, freshness, and fallback.
- **Wallet:** badges, orders, entitlements, receipts, confirmations, pickup proof, and lightweight balances.
- **Explore:** stores, prize wall, artists, vendors, and other ingested convention catalogs when they exist.
- **Places:** rooms, zones, booths, tables, and map context, initially simple and eventually capable of supporting an interactive atlas.
- **Notes:** human-authored notes first, linked back to their context; machine activity available only as a drill-down.

Trip facts and watched sources are important, but the design pass should test whether they deserve permanent top-level destinations or work better as strong contextual sections reached from Home, Wallet, Plan, and evidence drawers. “Remember” should be evaluated as a post-event mode or filter rather than assumed to require a permanent empty tab before the event.

### Required artifacts

- App-level information architecture with mobile and desktop navigation.
- A phase-density matrix showing what each surface emphasizes during quiet monitoring, active planning, onsite use, and archival use.
- A contextual-retrieval map showing how an event, place, person, purchase, entitlement, and source connect without requiring the owner to remember the originating system.
- A small shared interaction vocabulary for cards, drawers, chips, status, freshness, evidence, notes, and direct actions.

### Decision gate

Approve the surface map before detailed screen work. The test is whether each major discovery need has one natural home and whether the design avoids both source-shaped navigation and a crowded everything-dashboard.

## Workstream 2: Decision-state and time model

Define the product language needed to represent planning before designing the dense planner.

### Required distinctions

- Published offer, entitlement, personal decision, itinerary commitment, runtime participation, and memory.
- Interested, tentative, committed, purchased, skipped, and attended, with no assumption that every object uses every state.
- Fixed occurrence, flexible activity, suggested time, deadline, travel constraint, pickup window, and live assignment.
- Hard conflict, soft conflict, overlap worth reviewing, and no practical conflict.
- Publisher state, observed onsite state, personal interpretation, and source freshness.
- Owner relevance versus person participation. Kavi's preference signals drive recommendations; Chris and Juan remain visible planning context.

### Required artifacts

- State diagrams and plain-language transition rules.
- A conflict-behavior matrix covering fixed events, flexible leagues, Black Lotus activities, purchased nonrefundable events, meals, travel constraints, and loose activities.
- Relevance examples showing why an event is emphasized, left neutral, or de-emphasized without hiding it.
- Alert examples showing how personal state changes the meaning of sellout, cancellation, movement, or description changes.

### Decision gate

Approve the state language before a database model. The test is whether representative Vegas examples and the current Black Lotus schedule can be expressed without special-case contradictions or false certainty.

## Workstream 3: Screen concepts and interaction prototype

Design representative flows at enough fidelity to judge product behavior. This is not a visual-polish tranche.

### Priority screen set

1. **Quiet Home and milestones:** trustworthy “nothing changed,” expected information drops, source confidence, and rare meaningful alerts.
2. **Plan and contention canvas:** a desktop-rich time view plus a usable mobile counterpart for inspection, state changes, overlap, and purchased commitments.
3. **Event detail drawer:** translated decision information, full source description on demand, person chips, notes, evidence, and commitment consequence.
4. **Now:** one calm operational card answering what is next, where, when to leave, what to show or bring, and what is still uncertain.
5. **Wallet item:** extracted facts plus the showable original, deliberate sensitive-detail reveal, notes, and contextual links.
6. **Place detail:** enough structure to connect a room, booth, vendor, artist, exclusive item, note, and map reference without attempting the full atlas.

Explore, Prize Wall, artist matching, store catalog, receipts, and Notes should receive structural sketches sufficient to test their relationship to the shell. They do not need equally detailed prototypes in this phase.

### Design expectations

- Cards and meaningful real estate should be naturally clickable.
- Icons should reduce reading load: hearts, locks, tickets, alerts, person markers, time flexibility, source/freshness, and custom VIP/lotus-inspired glyphs where appropriate.
- Detail should progressively disclose through drawers, expansion, or drill-down instead of forming walls of text.
- Empty surfaces should collapse gracefully; the Plan tab can exist without filling the page with ticketed-play placeholders.
- AI explanations should be concrete and inspectable, such as “de-emphasized: competitive qualifier” or “soft conflict: this league can be played later,” never manufactured excitement.
- Tiny steering prompts are permitted only where one answer resolves a real ambiguity and changes future behavior.

### Decision gate

Walk representative scenarios through the prototype on phone and desktop. Revise until the owner can answer the core questions without knowing which source originally held the fact.

## Workstream 4: Black Lotus trust slice

Implement one narrow end-to-end slice using the current official Atlanta Black Lotus schedule page. It is the strongest proof candidate because it already contains useful dated occurrences, is personally important, and a future page change should be high-signal.

### Manual flow to prove

`Official page -> source snapshot -> supported observation -> small normalized occurrence -> personal interest or note -> Plan placement -> later change or contradiction -> visible reconciliation -> offline-readable critical view`

### Initial product behavior

- Capture the exact official URL, source owner, retrieval time, useful source wording, and page health.
- Represent only the minimum Black Lotus schedule facts required by the chosen screen.
- Allow an owner decision such as interest, tentative placement, or a contextual note.
- Show the occurrence in Plan with its source status and VIP eligibility context.
- Explain a changed fact without overwriting the prior observation.
- Let the user inspect the supporting evidence from the presented fact.
- Cache the approved critical view for offline reading with a clear “as of” time.
- Disable or clearly defer mutations while offline.

### Change testing

A real publisher change is ideal but cannot be scheduled. The phase should therefore preserve the first real snapshot and use a reviewed local fixture representing a plausible second snapshot to test changed, canceled, contradicted, and superseded behavior. When the live page actually changes, it can replace the fixture as validation evidence without redesigning the flow.

### Deliberately excluded from the slice

- Automated page polling or notifications.
- General-purpose scraper infrastructure.
- Ticketed-play ingestion.
- Email ingestion or a mailbox monitor.
- Receipt or QR artifact uploads.
- Broad event, person, place, travel, store, artist, or prize-wall tables.
- Multi-user accounts or shared writes.

### Acceptance checks

- The displayed claim is traceable to retained source evidence.
- A source revision does not destroy the earlier observation.
- Publisher wording, normalized display, and personal state cannot silently overwrite one another.
- One personal decision has a visible itinerary consequence.
- Changed, canceled, contradicted, and superseded states can be demonstrated.
- The approved view remains readable after the device loses connectivity and visibly reports freshness.
- Offline interaction cannot silently create or replace canonical data.
- Owner RLS, explicit grants, and project-identity checks remain intact.

## Workstream 5: Minimal technical contracts

Derive technical contracts only after the relevant design decisions are approved.

### In scope

- A minimal provenance contract for source, snapshot, observation, normalized occurrence, personal decision, and itinerary placement.
- Stable identifiers and relationships required by the Black Lotus slice.
- A display/read model sized to the approved screens.
- Cache contents, freshness metadata, invalidation behavior, and offline safety for the critical view.
- Tests for state reconciliation, RLS, project identity, and offline read behavior.

### Not yet in scope

- A comprehensive convention ontology.
- Generic recurrence machinery; MagicCon facts should prefer dated occurrences.
- Private Storage buckets until an approved artifact workflow actually needs them.
- A synchronization engine or offline mutation queue.
- Monitoring jobs, agent automation, background research, push delivery, or mailbox access.
- Production deployment or environment promotion.

## Recommended sequence

1. **Surface map:** establish the persistent shell, phase-density behavior, and contextual-retrieval paths.
2. **Product language:** settle planning states, time semantics, source state, conflicts, and personal relevance.
3. **Low-fidelity concepts:** test Quiet Home, Plan, Event Detail, Now, Wallet, and Place on mobile and desktop.
4. **Scenario review:** run real examples from Black Lotus and representative Vegas ticketed play through the concepts.
5. **Trust-slice contract:** derive the smallest data and cache contracts needed for the approved Black Lotus flow.
6. **Implementation:** build the slice behind the existing authenticated owner boundary.
7. **Change and offline proof:** exercise reconciliation fixtures, offline reads, security, and freshness behavior.
8. **Tranche review:** decide what the proof authorizes next; do not automatically roll into monitoring or broad ingestion.

The sequence has intentional gates. A weak design finding can be corrected before migration work, and a weak trust-slice finding can be corrected before automation multiplies it.

## Representative scenario review

The design should be tested against a short, reusable scenario set:

- Nothing meaningful has changed for several weeks; the app communicates trustworthy quiet.
- A Black Lotus schedule detail changes after the owner marked the occurrence interesting.
- An appealing paid event overlaps a preferred Black Lotus event.
- A flexible league appears to overlap a fixed event but should not block it.
- An interested event sells out; a purchased event sells out; a purchased event is canceled.
- The owner is onsite with weak connectivity and needs the next event, place clue, and showable artifact.
- A store or vendor item is favorited and later changes availability.
- A contextual note must be found later without remembering whether it was attached to an event, place, or receipt.

Only the first two and the offline read must be implemented in this tranche. The others judge whether the design is coherent and preserve a future synthetic-testing backlog.

## Phase deliverables

- Approved app surface map and navigation rationale.
- Phase-density and contextual-retrieval maps.
- Planning state, time, conflict, relevance, source-status, and alert rules.
- Mobile and desktop concepts for the priority screen set.
- A lightweight interactive prototype or equivalent walkthrough for representative scenarios.
- Minimal provenance and display contracts derived from the approved design.
- Working Black Lotus trust slice with change reconciliation and offline-readable critical view.
- Verification evidence and an explicit recommendation for the following tranche.

## Explicit exclusions

This phase does not include:

- Continuous research or monitoring automation.
- Gmail monitoring or automated private-email classification.
- Full ticketed-play, loose-event, Black Lotus, artist, merch, vendor, map, or prize-wall ingestion.
- Complete travel, expense, reimbursement, collection, or contact management.
- The interactive convention atlas or indoor positioning.
- True multi-user collaboration, invitations, permissions, voting, messaging, or schedule synchronization.
- Push/email notification delivery.
- Production deployment.
- Docker, WSL, or a local Supabase stack.
- Visual polish beyond what is needed to make the interaction model legible and testable.

## Exit criteria and next decision

The phase exits when:

1. The persistent product shape is understandable across all operating periods.
2. The owner can navigate the representative scenarios without returning mentally to source websites.
3. The Black Lotus slice proves evidence, normalization, personal decision, itinerary consequence, reconciliation, and offline reading.
4. Security and project identity remain verified.
5. Remaining unknowns are named and the next tranche is chosen from evidence.

Likely next-tranche candidates are manual ticketed-play ingestion and contention planning, private artifact/Wallet storage, or source monitoring. The trust slice should determine which is ready; none is pre-authorized by this scope.
