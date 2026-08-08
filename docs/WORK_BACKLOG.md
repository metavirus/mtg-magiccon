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
- [x] Confirm the temporary GitHub Pages preview opens reliably on iPhone after the relative asset-path fix and record any remaining mobile-only layout defects. Auth is now fully parked for POC review; remaining mobile tension is design quality, especially Wallet Home/Prize Tix, not access.
- [x] Disable client auth for the fixture-backed POC so local, GitHub Pages, and installed mobile review cannot be blocked by Supabase magic-link quota.
- [ ] **v1.5:** Reintroduce low-friction authenticated continuity deliberately after the POC is no longer fighting mobile review. Prefer keeping magic link as a rare bootstrap path, and evaluate Google OAuth before spending more email quota.
- [x] Synthesize pre-ticketed-play usefulness and interface behavior.
- [x] Explore ticketed-play planning usefulness and interface behavior.
- [x] Synthesize cross-phase value principles and onsite support surfaces.
- [x] Scope the next design and trust-slice tranche without committing broad UI or schema.
- [x] Accept the persistent surface-map direction, phase-aware Now, Activity framing, and dark visual language in `docs/EXPERIENCE_ARCHITECTURE.md`; defer exact mobile navigation treatment to screen design.
- [x] Approve planning states, Tentative synthesis, time semantics, conflict hierarchy, preference intelligence, and source-state presentation in `docs/PLANNING_INTELLIGENCE_MODEL.md`.
- [ ] Test priority mobile and desktop screen concepts against representative scenarios.
  - [x] Apply `docs/DESIGN_AUDIT_2026-08-02.md`; reconcile the resulting direction in `docs/DESIGN_BASELINE_2026-08-03.md`.
  - [x] Implement the accepted desktop shell and test one stable mobile navigation candidate against working behavior.
  - [x] Replace the overflowing mobile destination strip with fixed Home / Events / Map / Wallet / More navigation; keep Explore / Plan / Calendar and Trip / Notes / Activity one compact drawer away.
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
  - [x] Convert Map from a dead rail notice into an honest POC landing surface: Trip-area orientation now, official event-map intelligence later.
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
- [ ] Complete trust proof on device. Pure reconciliation now requires a new explicitly superseding observation, retains the prior observation, and preserves personal decision/itinerary state; live reviewed write/readback and real-iPhone offline reopening remain.
- [x] Record the updated cohesion-first v1.5 path in `docs/V1_5_PATH.md`, ordered by intelligent chunks: shared object-detail grammar, Home command center, Activity inbox/backlinks, Wallet mobile retrieval, trust/auth/storage, reviewed monitoring hydration, ticketed-play vertical slice, and production Plan only after real contention exists.
- [x] **v1.5:** Establish the shared object-detail drawer/sheet pattern before continuing destination-specific polish.
- [x] **v1.5:** Refine Home into a true command center that answers whether anything needs attention, rather than a general dashboard of collected facts.
- [x] **v1.5:** Reframe Activity as a reviewed monitor inbox with Needs review / Changes / Sources / Personal / Archived streams and contextual backlinks.
- [x] **v1.5:** Redesign Wallet Home mobile-first, especially Prize Tix. The MVP now uses a compact, always-visible counter with `-100` / `+100`; the decorative ticket and drawer are parked for later refinement.
- [x] **v1.5:** Move Activity away from forced placeholder framing and into a compact reviewed inbox: count-aware streams, cleaner alert cards, reversible reviewed/archive actions, object opening, and mobile-safe supporting context.
- [x] **v1.5:** Test Activity with realistic monitor output volume. The POC now uses a 20-item sanitized intake fixture; Home only breaks glass for hot Home-worthy signals, while Activity keeps broader review/source volume manageable.
- [x] **v1.5:** Add richer contextual backlinks from Home/Activity alert cards into destination objects so monitor findings do not become dead informational blocks.
- [x] **v1.5:** Make primary navigation URL-addressable. Surface hashes now load directly, survive refresh, update during navigation, and support browser back/forward for Home, Calendar, Plan, Explore, Map, Wallet, Trip, Notes, and Activity.
- [x] **v1.5:** Run the first no-dead-control cleanup pass. Wallet future-play rows are now honest waiting states, representative proof rows open actual previews, Trip and Leap actions route somewhere real, Notes no longer advertises unavailable composition, and Plan handoff copy is less misleading.
- [x] **v1.5:** Hydrate the known official Black Lotus schedule into the fixture-backed UI. Thursday early-access programming, weekend league, Friday under-construction play, Saturday Planechase, Sunday drafts, and Sunday feedback now appear in Explore/Calendar with TBD/location/change caveats preserved.
- [x] **v1.5:** Replace the disconnected Plan study with a bounded working Plan-lite surface. Explore and Plan now share POC-session decisions; Thursday-Sunday groupings show official Black Lotus anchors plus promoted contenders; Interested / Tentative / Committed actions are reversible; only Commitments count as hard blocks; contextual details and flexible/change signals remain visible.
- [ ] **v1.5:** Continue the no-placeholder pass on a real phone and public preview, especially labels that still imply future persistence or real artifacts where the POC is fixture-backed.
- [ ] **v1.5:** Resume the production contention-engine design only after representative Atlanta ticketed-play data exists. Treat Plan-lite as a useful interaction proof, not a persistence/schema contract.
- [ ] Park v2 collaboration concepts separately from MVP owner-managed planning.
- [ ] Later, design synthetic during-event scenario tests before relying on onsite behavior.
- [x] Define and implement the fixture-backed monitoring-alert intake contract for MVP/POC so future Gmail, newsletter, and official-page observations can land as reviewable alerts without becoming automatic canonical facts.
- [x] Document the POC finish glide path and routing map for agent-discovered news, receipts, page changes, travel updates, notes, and future prompts in `docs/POC_FINISH_GLIDE_PATH.md`.
- [x] Add a small set of representative landing-route fixtures: Black Lotus page change, ticketed-play/newsletter milestone, email receipt import, travel change, artist-list opportunity, map unlock, and contextual user note.
- [x] Document the MVP monitoring-agent design, output contract, routing rules, and safe daily-run deployment shape in `docs/MVP_MONITORING_AGENT_DESIGN.md`.
- [x] Define the source hierarchy and creative monitoring radar for quiet-period Atlanta discovery in `research/MONITORING_SOURCE_STRATEGY_2026-08-04.md`.
- [x] Add `public/monitoring-intake.json` and `docs/MONITORING_HYDRATION_CONTRACT.md` so the daily agent can hydrate the fixture-backed POC preview with reviewable observations without editing React source.
- [x] Enable the first scheduled monitoring heartbeat after user approval. It can read approved public/Gmail sources and update the POC hydration file when useful, but cannot write Supabase data, modify Gmail, send messages, or change canonical app state.

## Parked

- Decorative Prize Tix ticket art/drawer; reconsider only after the simple onsite counter proves useful.
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
