# Work Backlog

## Foundation acceptance

- [ ] Confirm clean CI on the draft pull request.
- [x] Record live migration, harmless query, RLS proof, and advisor evidence.
- [x] Confirm one owner account exists without storing its credentials in the repository.

## Next product tranche

- [x] Define the minimal Black Lotus provenance contract for sources, observations, normalized occurrences, decisions, and itinerary placement.
- [x] Model a small itinerary slice from actual official Atlanta Black Lotus evidence.
- [ ] Design private Storage and retention rules for confirmations and receipts.
- [ ] Test installability and cached critical-view behavior on a real mobile device.
- [ ] Confirm the temporary GitHub Pages preview opens reliably on iPhone after the relative asset-path fix and record any remaining mobile-only layout defects.
- [ ] Fix and verify magic-link callback persistence across refresh and installed-app launch; auth logs prove successful owner login with no server-side logout, so diagnose client/browser storage before requesting more email links.
- [x] Synthesize pre-ticketed-play usefulness and interface behavior.
- [x] Explore ticketed-play planning usefulness and interface behavior.
- [x] Synthesize cross-phase value principles and onsite support surfaces.
- [x] Scope the next design and trust-slice tranche without committing broad UI or schema.
- [x] Accept the persistent surface-map direction, phase-aware Now, Activity framing, and dark visual language in `docs/EXPERIENCE_ARCHITECTURE.md`; defer exact mobile navigation treatment to screen design.
- [x] Approve planning states, Tentative synthesis, time semantics, conflict hierarchy, preference intelligence, and source-state presentation in `docs/PLANNING_INTELLIGENCE_MODEL.md`.
- [ ] Test priority mobile and desktop screen concepts against representative scenarios.
  - [x] Apply `docs/DESIGN_AUDIT_2026-08-02.md`; reconcile the resulting direction in `docs/DESIGN_BASELINE_2026-08-03.md`.
  - [x] Implement the accepted desktop shell and test one stable mobile navigation candidate against working behavior.
  - [ ] Accept the implemented meaningful-date Calendar stream and Calendar-to-Plan handoff after live desktop and phone review.
  - [ ] Test bounded contextual find/jump and real backlinks across the proof-slice objects.
  - [x] Replace the Decide / Schedule split with one focused Plan workspace in `docs/PLAN_WORKSPACE_CONCEPT.md`.
  - [x] Review the scrollable meaningful-date Calendar density and Calendar-to-Plan context shift in `docs/CALENDAR_SURFACE_CONCEPT.md`.
  - [x] Audit accepted design state and prototype limitations in `docs/DESIGN_STATE_ASSESSMENT.md`.
  - [x] Test the deeper Plan visual grammar and state propagation on desktop.
  - [x] Translate the same Plan scenario to a deliberate mobile interaction.
  - [x] Prove reversible Interested, Tentative, Committed, and Purchased transitions with consistent schedule blocks and person-marker borders.
  - [x] Review the event-detail decision surface, including the source-backed complexity/competitive-intensity explanation.
  - [x] Design and implement the first Explore-to-Plan bridge with mixed events, concise relevance rationale, availability, and recoverable Hidden / Not for me states.
  - [x] Fix Explore event-detail Prize Tix box rendering so missing/empty prize metadata does not leave an awkward blank cell; incomplete decision-fact rows now collapse cleanly.
  - [x] Review the Map/Trip/Wallet retrieval cluster using confirmed Omni and Courtyard lodging facts as design fixtures.
  - [x] Implement the first Trip retrieval slice with the shared Courtyard night, Thursday Black Lotus split, Omni assignment, verified property links, and restrained luggage-handoff insight.
  - [x] Test a dedicated showable-artifact direction and object-aware offline/freshness treatment conceptually; implementation proof remains in the trust slice.
  - [x] Structurally test a contextual note path and meaningful Activity change path, including rapid-action burst grouping.
- [x] Reconcile accepted visual studies into the coherent MVP baseline in `docs/DESIGN_BASELINE_2026-08-03.md`.
- [x] Scope Map as an MVP scaffold rather than a v1 interactive atlas: direct destination, place directory, official Atlanta map artifacts, object backlinks, and offline-readable confirmed place reference.
- [x] Reframe Map's quiet-period landing as Trip-area orientation first, with Event map as a separate top context until 2026 floor evidence exists.
- [x] Capture confirmed lodging facts for design context: Omni Atlanta Hotel at Centennial Park for Nov 12-15 and Courtyard by Marriott Atlanta Downtown for Nov 11-12. Treat sensitive booking values as hidden.
- [ ] Later, design the v2 interactive convention atlas only after Atlanta map evidence exists and the simpler place-reference workflow proves useful.
- [ ] Later, evaluate approximate indoor-position support only as a v2 capability with visible uncertainty, manual correction, and no promise of reliable turn-by-turn navigation.
- [ ] Expand `research/FORMAT_COMPLEXITY_EXPLORATION.md` into a reviewed all-format registry when Atlanta event ingest begins; refresh derived assessments only from captured source changes.
- [x] Derive and implement the minimal Black Lotus trust-slice contract from the accepted baseline.
- [ ] Prove source revision reconciliation and an offline-readable critical view.
- [ ] **v1.5:** Resume production Plan design only after representative ticketed-play data exists; preserve the current preview as disposable design evidence and do not derive planner schema from it.
- [ ] Park v2 collaboration concepts separately from MVP owner-managed planning.
- [ ] Later, design synthetic during-event scenario tests before relying on onsite behavior.
- [x] Define and implement the fixture-backed monitoring-alert intake contract for MVP/POC so future Gmail, newsletter, and official-page observations can land as reviewable alerts without becoming automatic canonical facts.
- [x] Document the POC finish glide path and routing map for agent-discovered news, receipts, page changes, travel updates, notes, and future prompts in `docs/POC_FINISH_GLIDE_PATH.md`.
- [x] Add a small set of representative landing-route fixtures: Black Lotus page change, ticketed-play/newsletter milestone, email receipt import, travel change, artist-list opportunity, map unlock, and contextual user note.
- [x] Document the MVP monitoring-agent design, output contract, routing rules, and safe daily-run deployment shape in `docs/MVP_MONITORING_AGENT_DESIGN.md`.
- [x] Define the source hierarchy and creative monitoring radar for quiet-period Atlanta discovery in `research/MONITORING_SOURCE_STRATEGY_2026-08-04.md`.
- [x] Enable the first scheduled monitoring heartbeat after user approval. It reports only to the Codex task and cannot write Supabase data, modify Gmail, send messages, or change app state.

## Parked

- Exhaustive event/travel/vendor/expense/people schema.
- Automated large-scale MagicCon ingestion.
- Full interactive convention atlas with clickable booths/rooms/zones.
- Booth-level map enrichment, route hints, map OCR/georeferencing, approximate indoor positioning, and indoor-navigation-style features.
- True multi-user collaboration, shared schedules, voting, chat, and live sharing.
- Synthetic event-day scenario suite.
- Daily monitoring-agent “Codex sauce,” constrained resident intelligence, and AI Feedback review inbox.
- Production Plan contention workspace, including scenario storage, drag/drop, fuzzy-time machinery, conflict solving, and AI schedule recomputation, until representative ticketed-play data exists.
- Offline write queues and conflict resolution.
- Full production hosting beyond the temporary fixture-backed GitHub Pages preview.
- Docker/WSL and a local Supabase replica unless a concrete isolation or migration-rehearsal need emerges.
