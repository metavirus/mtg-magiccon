# POC Finish Glide Path

Updated: 2026-08-08

## Goal

Finish the POC as a useful quiet-period companion that is ready to receive rare, meaningful MagicCon signals from manual checks, Gmail review, newsletter review, or later automation.

The conservative daily heartbeat is now active and may hydrate the fixture-backed preview through the file contract below. The fixture-backed 1.5 UI pass has also proved where findings land: Home for rare breakthroughs, Activity for review, and destination objects for context. This is still not the durable monitoring inbox; the Supabase-backed successor remains future trust work.

The first deployable monitoring-agent design is recorded in `docs/MVP_MONITORING_AGENT_DESIGN.md`. The source-priority and search-radar strategy is recorded in `research/MONITORING_SOURCE_STRATEGY_2026-08-04.md`. The POC file-based hydration seam is recorded in `docs/MONITORING_HYDRATION_CONTRACT.md`.

## Finish definition

The POC is ready when:

1. The GitHub Pages phone preview opens reliably in fixture-preview mode.
2. Home, Calendar, Explore, Map, Wallet, Trip, Notes, and Activity are reachable and not dead-end surfaces.
3. New information can be represented as a reviewable observation without becoming canonical by accident.
4. Important findings can reach Home as rare signals.
5. Less urgent findings can settle into Activity, the affected object, or Notes without cluttering the default screen.
6. The one live trust slice still proves Source → Observation → Occurrence → Personal decision → Itinerary.
7. Offline read behavior is explicitly tested or explicitly left as an open defect. Google OAuth is now the deliberate live-auth path; magic-link quota churn remains parked.

## POC status after mobile review

The POC/fixture-backed 1.5 preview is accepted as a useful quiet-period companion. Kavi completed a mobile flip-through on August 8 and reported that it is looking good. Further fixture UI polish should stop unless a real defect appears.

The remaining work is no longer "make the POC feel real." It is trust/data and operational-hardening work:

- keep Google OAuth continuity reliable without reopening the magic-link rabbit hole;
- design private Storage for original receipts, QR/proof screenshots, and travel artifacts;
- graduate monitoring observations from file-backed preview intake to reviewed app data;
- wait for real Atlanta ticketed-play inventory before building the production Plan engine.

## What remains after POC

### 1. Phone preview hardening

Current state: GitHub Pages preview is live, fixture-backed by default, reachable on iPhone, and accepted for the current tranche.

Follow-up only if defects appear:

- record mobile layout defects as targeted polish;
- do not reopen broad fixture-design tweaking;
- do not reintroduce auth as a gate to mobile review.

### 2. Monitoring landing contract

Current state: Home, Activity, and Notes can already display fixture-backed monitoring-style observations. In design preview, the app now reads `public/monitoring-intake.json` so the daily agent can hydrate the POC without editing React source or writing canonical database facts.

Finish work:

- Keep the alert shape small and explicit:
  - source kind;
  - source reference;
  - retrieval/check time;
  - observed wording or artifact pointer;
  - AI summary;
  - why it matters;
  - suggested destination;
  - attention level;
  - current review status.
- Add enough fixtures to demonstrate the main routes below.
- The daily monitor may now read approved sources and Gmail and update the POC hydration file when there is something meaningful to show.
- Do not let an agent mark facts canonical, update plans, hide events, or send notifications without a reviewed workflow.

## Landing places for information an agent uncovers

The app should route discoveries by usefulness, not by where they came from.

| Discovery | Default landing | If important | Why |
| --- | --- | --- | --- |
| Official page changed but consequence unclear | Activity → Changes | Home timely signal if it affects a milestone, purchased event, known plan, trip fact, or deadline | Preserves watch duty without turning Home into a diff log |
| New/changed Atlanta official-site page | Activity → Sources or Changes | Home if it unlocks ticketed play, Black Lotus, artists, show store, prize wall, map, mobile app, meet-and-greets, or an operational deadline | The event site tree is canonical; new pages are often the first sign a surface exists |
| Newsletter post | Activity → Sources | Home if it announces ticketed play, artists, catalog, Black Lotus store, map, policy, or schedule availability | News is rare enough to matter, but not every post deserves alarm styling |
| Gmail receipt or confirmation | Wallet tab matching object type | Home only if it creates a near-term action or missing proof item | Receipts are mostly retrieval artifacts, not news |
| Ticketed-play event inventory appears | Explore | Home milestone signal and Calendar marker | This is a major phase change; Explore becomes the browse/triage surface |
| Specific event sells out or changes | Explore event detail and Activity → Changes | Home if user marked Interested, Tentative, Committed, or Purchased | Consequence depends on personal state |
| Black Lotus page changes | Affected BL object + Activity → Changes | Home unless obviously cosmetic | This is a high-value watched page during quiet period |
| Artist list appears or changes | Explore or future Artists surface | Home milestone signal at first appearance; later Activity unless personally relevant | Enables card/signature planning without becoming fanboy noise |
| Store catalog appears | Wallet → Store, future Store surface | Home milestone signal at first appearance | Useful because the app can over-ingest and make the catalog easier than the source |
| Prize wall list appears | Wallet / future Prize Wall surface | Home during convention, not necessarily before | Mostly useful onsite and tied to Prize Tix |
| Hotel, flight, or travel change email | Trip object + Activity → Changes | Home only if consequential | Travel should be pleasant reference, not a flight-management system |
| Map or venue layout appears | Map → Event map | Home if first official 2026 map or known destination changes | Useful because it unlocks onsite navigation context |
| Black Lotus Discord staff answer or official-link lead | Activity → Sources/Changes, then affected object if confirmed | Home only for urgent BL store windows, included-event/logistics changes, ticketed-play/sellout signals, or other time-sensitive owner impact | High-signal radar, but Discord chatter must not silently become publisher truth |
| Official Wizards product/context article | Activity → Sources, Explore annotation if tied to an event/product | Home only if it announces a MagicCon-specific product window, event availability, or urgent convention action | Useful for translating products/formats like Mystery Booster, but not a general Magic news feed |
| User-authored note | Notes + linked object | Never by default | Notes are memory and context, not alerts |
| Agent suggestion or uncertainty prompt | Activity → Personal / future AI Feedback | Home only if a rare yes/no answer would materially improve classification or alerting | Keeps “Son of Codex” useful without becoming clingy |

## Attention levels

### Home signal

Use Home only when the owner would plausibly be glad they did not need to manually check for it.

Examples:

- ticketed play is live;
- Black Lotus store window announced;
- official artist directory appears;
- official show catalog appears;
- known interested event sells out;
- confirmed flight or hotel time changes;
- official map appears.

### Object annotation

Use an object annotation when the fact matters in context but should not interrupt.

Examples:

- event description adds a minor rule clarification;
- store item has a catalog backlink;
- hotel page confirms address;
- receipt line item is assigned to Kavi, Chris, Juan, or custom text.

### Activity only

Use Activity when the fact is worth retaining but does not change a decision.

Examples:

- newsletter checked with no new Atlanta-specific action;
- watched page unchanged;
- monitor found a cosmetic wording change;
- agent imported a receipt and extracted line items;
- user changed an event from Interested to Tentative.

### Notes

Use Notes when the information is authored by the owner or is a lightweight memory attached to a context.

Examples:

- “three shirts were for Kellen” on a store receipt;
- “ask Chris about this event” on an event;
- “luggage handoff may be annoying Thursday” on Trip.

## Next build tranches

### Completed — phone preview and landing routes

The deployed preview is trustworthy enough for review:

- mobile navigation is grouped into Home / Events / Map / Wallet / More;
- Activity is a review inbox rather than a placeholder log;
- Home carries rare signals without becoming noisy;
- Plan-lite uses known Black Lotus anchors and promoted contenders;
- Wallet uses a simple Prize Tix counter rather than the parked decorative ticket concept.

### Completed — make landing routes demonstrable

Add a tiny set of representative alert fixtures that prove routing:

- official page change affecting Black Lotus;
- newsletter milestone for ticketed play;
- email receipt imported to Wallet;
- travel change that stays under Trip unless consequential;
- user note tied to a receipt or event.

Each fixture should have a visible source, check time, rationale, and destination.

### Next — trust and offline proof

Use the existing Black Lotus trust slice to prove:

- a source revision can be captured without overwriting the previous observation;
- the owner decision remains separate;
- the app can reopen the cached critical view offline with freshness visible;
- offline writes remain disabled.

### Still true — magic link parked, Google OAuth preferred

Magic link was intentionally parked after Supabase email quota became a design/testing blocker. Google OAuth is now the preferred live-auth path. Fixture/preview mode remains useful for unblocked review, but future user-state work should assume authenticated Supabase continuity rather than browser-local persistence.

### Handoff checkpoint

Use the tiered handoff checks in `docs/ANTI_WASTE_OPERATING_MODE.md`:

- Tier 0 UI/copy/layout: `pnpm check:ui` plus viewport verification when visual.
- Tier 1 public preview: `pnpm check:ship`, commit/push the source branch, wait for the GitHub Actions Pages deploy, then `pnpm build:pages` and `pnpm verify:public`.
- Tier 2 data/auth/database/research/monitoring: full readiness, tests, validation, and proportional live verification.

## Explicitly not POC

- canonical Gmail/Supabase ingestion;
- continuous newsletter crawler;
- continuous official-site watcher;
- push notifications;
- daily AI recomputation;
- comprehensive event schema;
- private Storage artifact model;
- production Plan contention engine;
- broad ticketed-play ingestion;
- full map atlas;
- multi-user collaboration.

Those become safe only after the POC proves the landing contract and review workflow.
