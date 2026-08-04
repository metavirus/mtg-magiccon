# POC Finish Glide Path

Updated: 2026-08-04

## Goal

Finish the POC as a useful quiet-period companion that is ready to receive rare, meaningful MagicCon signals from manual checks, Gmail review, newsletter review, or later automation.

This does **not** mean building the full monitoring system yet. The POC should prove that when an agent uncovers information, the app has a clear place to put it, a clear attention level, and a clear path back to the affected object.

The first deployable monitoring-agent design is recorded in `docs/MVP_MONITORING_AGENT_DESIGN.md`.

## Finish definition

The POC is ready when:

1. The GitHub Pages phone preview opens reliably in fixture-preview mode.
2. Home, Calendar, Explore, Map, Wallet, Trip, Notes, and Activity are reachable and not dead-end surfaces.
3. New information can be represented as a reviewable observation without becoming canonical by accident.
4. Important findings can reach Home as rare signals.
5. Less urgent findings can settle into Activity, the affected object, or Notes without cluttering the default screen.
6. The one live trust slice still proves Source → Observation → Occurrence → Personal decision → Itinerary.
7. Offline read behavior and auth persistence are explicitly tested or explicitly left as open defects.

## What remains for POC

### 1. Phone preview hardening

Current state: GitHub Pages preview is live and fixture-backed by default.

Finish work:

- Confirm the iPhone preview opens after the Pages asset-path fix.
- Confirm the horizontal mobile destination strip works across Home, Calendar, Explore, Wallet, Trip, Notes, and Activity.
- Confirm the page can be saved to the iPhone home screen with the peach icon.
- Record any mobile layout defects as POC polish or v1.5 backlog, not as reasons to widen scope.

### 2. Monitoring landing contract

Current state: Home, Activity, and Notes can already display fixture-backed monitoring-style observations.

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
- Do not create live monitors yet.
- Do not let an agent mark facts canonical, update plans, hide events, or send notifications without a reviewed workflow.

## Landing places for information an agent uncovers

The app should route discoveries by usefulness, not by where they came from.

| Discovery | Default landing | If important | Why |
| --- | --- | --- | --- |
| Official page changed but consequence unclear | Activity → Changes | Home timely signal if it affects a milestone, purchased event, known plan, trip fact, or deadline | Preserves watch duty without turning Home into a diff log |
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

### POC-A — polish the existing phone preview

Do only enough to make the deployed preview trustworthy for review:

- confirm mobile navigation;
- fix obvious blank/dead states;
- keep density compact;
- record v1.5 visual issues rather than chasing them indefinitely.

### POC-B — make landing routes demonstrable

Add a tiny set of representative alert fixtures that prove routing:

- official page change affecting Black Lotus;
- newsletter milestone for ticketed play;
- email receipt imported to Wallet;
- travel change that stays under Trip unless consequential;
- user note tied to a receipt or event.

Each fixture should have a visible source, check time, rationale, and destination.

### POC-C — trust and offline proof

Use the existing Black Lotus trust slice to prove:

- a source revision can be captured without overwriting the previous observation;
- the owner decision remains separate;
- the app can reopen the cached critical view offline with freshness visible;
- offline writes remain disabled.

### POC-D — auth persistence

Fix magic-link callback/session persistence after preview review. Do not consume more magic-link quota until the likely client-side storage/callback cause is identified.

### POC-E — handoff checkpoint

Run:

- `pnpm build`;
- `pnpm test`;
- `pnpm validate:text`;
- `pnpm validate:secrets`;
- `pnpm readiness`;
- GitHub Pages preview build and smoke check;
- docs/frontier/backlog review.

## Explicitly not POC

- live Gmail monitor;
- newsletter crawler;
- official-site watcher;
- push notifications;
- daily AI recomputation;
- comprehensive event schema;
- private Storage artifact model;
- production Plan contention engine;
- broad ticketed-play ingestion;
- full map atlas;
- multi-user collaboration.

Those become safe only after the POC proves the landing contract and review workflow.
