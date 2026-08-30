# Current Frontier

Updated: 2026-08-29
Repository checkpoint: `cd84772` (`Prove critical PWA views offline`)

## Current product state

The Atlanta companion is an authenticated, mobile-first React PWA backed by canonical Supabase project `pavjsexxbueuzhzgemgy`. Home, Explore, Plan, Calendar, Map, Info, Wallet, Trip, Artists, Notes, and Activity are URL-addressable surfaces. Desktop and mobile navigation now derive from one ordered destination model: phone keeps Home / Events / Map / Info / More immediately reachable, with Explore / Plan / Calendar and Wallet / Trip / Artists / Notes / Activity in compact drawers. The main drawer is narrow, visually aligned with the desktop rail, and its ordering/labels can no longer drift independently.

Supabase remains truth for authenticated notes, selections, Activity review state, companions, canonical flights, maintained Info, ticketed availability, and receipt facts. Browser storage is limited to UI/auth convenience and owner-scoped read-only offline continuity. The app never queues offline writes or silently replaces newer server state.

## Monitoring and Ticketed Play

The daily surveyor now has a complete catch-to-closure lane. Changed first-party sources retain evidence, reconcile into deterministic concepts or bounded consequences, and must reach a supported terminal disposition before baseline advancement. The workflow accepts the exact timestamp-matched pending snapshots from the verified report only after staging, closure verification, and any availability alert delivery succeed; failed runs and replay runs do not advance the baseline. A zero-change run drains naturally instead of forcing a Windows/libuv exit, and a two-run cloud proof is the standing quiet-run check.

Ticketed Play inventory is extracted from the LEAP schedule, including anonymously visible sold-out controls. Partial hydration and `unknown` observations preserve the last known availability so transient gaps cannot erase the baseline and make the same sellout flap on the next run. Magic: The Menu brunch has a dedicated reopen watch and bounded email-alert lane.

Sold-out state is now product state rather than monitor noise:

- Explore keeps unselected sold-out events in a collapsed Sold out group, removes the purchase affordance, and preserves selected/purchased events in active planning context.
- Home deduplicates observations and groups sold-out events by convention day, with compact time ranges, affected saved-plan counts, and a detailed event list instead of raw survey deltas or one card per event.
- A sold-out event that overlaps saved intent routes to Inbox as an urgent retained detail; opening the alert no longer casts the non-surface `Inbox` destination into a blank page. Dismissal stops the restrained shiver and remains recoverable.

## Purchases, receipts, and shared proof

Paid events have a reversible Purchased transition that forces Committed; confirmed imported purchases can be permanently locked so ordinary planning controls cannot contradict receipt truth. Purchase and lock rows are readable across all active companions, while unrelated selections remain owner-private. Gold/lock treatment is consistent across Explore, Plan, Calendar, and Agenda.

`wallet_receipts` is the canonical private receipt-fact object. It retains normalized line items plus the original source HTML, supports one order shared with multiple explicitly bound attendees, and is readable by the owner or an authorized attendee under forced RLS. The Gmail intake is idempotent, handles companion-only orders, refuses ambiguous automatic mappings, applies exact event purchase locks, and has a guarded local-artifact fallback for Gmail render failures.

Wallet renders ticketed-play receipts with line items, totals, people bubbles, and the stable Info / Original proof grammar. Ticketed receipt lines retain exact attendee assignments and Companion event codes. A purchased event's Calendar detail shows its Companion code prominently, offers one-tap copy, and links to the official Companion app page without inventing a prefilled join URL. Black Lotus badge proof for Kavi/Chris and Juan's Premium Weekend proof remain reachable through the same reusable receipt objects; Chris's Black Lotus transfer proof has its own transfer tab.

The remaining trust gap is artifact storage: some original receipt/QR assets still ship in the public preview bundle. Moving originals, QR codes, and other private proof artifacts into private Supabase Storage remains the next sensitive implementation tranche; do not mark receipt privacy complete before that migration and readback are proven.

## Trip, Calendar, and shared activity

The canonical Delta itinerary is applied and guarded: outbound DL 329 leaves SNA at 2:00 PM and arrives ATL at 9:16 PM on November 11; return DL 1602 leaves ATL at 8:25 PM and arrives SNA at 10:14 PM on November 15. Trip and Calendar now project from the same live `trip_flights` / `trip_flight_legs` data rather than leaving Calendar on stale fixture times. Calendar travel details expose the canonical flight number, route, travelers, and Trip backlink.

Home and Activity group notes by the attached object rather than by an arbitrary short time burst, preserve all authors, and do not attach a composer to a synthetic note group. Sold-out and note presentation share compact person bubbles; Home bubbles remain horizontal. Raw source-diff rows stay internal unless they map to an allowed Inbox/consequence path.

## Offline/PWA proof

The service worker auto-updates the review build, precaches the shell plus a bounded public Map/Wallet proof pack, and deliberately excludes private/live JSON from its precache. Owner-scoped continuity caches preserve already-read notes, selections and Plan overlays, Activity, mentions, monitoring findings/concepts, Info knowledge, ticketed availability, and Trip flights for read-only offline use.

Local 390px automation now proves a cold offline reopen of the shell, the Map view and image, and the Wallet view with its bounded public proof artifacts. Owner-scoped continuity tests cover the cached read models used by Plan, Info, Trip, notes, selections, Activity, and monitoring, but those additional surfaces have not each received a cold-reopen viewport proof. This is local browser evidence, not physical-device acceptance. Installed-iPhone airplane-mode/reopen behavior and Google OAuth persistence after Safari/PWA refresh/reopen remain unresolved and must be tested on the real device.

## Catalog checkpoint

The private catalog UI is published behind its Kavi-only gate, and the canonical Supabase catalog schema is live without any promoted catalog content. The schema separates immutable source captures, extracted observations, reviewed canonical products/variants/offers, presentation media, append-only availability (including `sold_out` and event-local day), and per-person shopping interests. Catalog purpose distinguishes publishable event `inventory` from non-publishable historical `reference` material; the promotion RPC rejects reference plans and the production read view independently excludes them. The production read path otherwise fails closed and reads only reviewed current offers; interest writes require exact owner binding and readback.

Info now has a hidden-until-inventory Catalogs surface with sticky search/typeahead, compact dropdown filters, collapsible product groups, Available / Shopping list / Sold out views, and compact-versus-comfortable density. Compact is a true thumbnail row and comfortable is an image-led tile. Product images stay square; sold-out status and shared companion bubbles remain independently legible. A deterministic QA route now uses 17 exact products and prices across 11 categories from the official MagicCon Las Vegas 2026 catalog, with locally packaged verified image copies and first-party provenance. All 17 presentation derivatives are 640x640 transparent WebPs; the validator/test rejects missing, non-square, or removable opaque-matte assets, and compact tiles cannot stretch the image surface across text rows. It is explicitly precedent, never Atlanta inventory, and stock remains unknown unless a source proves otherwise. Mobile captures pass, as do search, sold-out filtering, density, collapse, and local interest-toggle checks.

The operator-side photo proof preserves the original artifact, deterministic correction/crops, hashes, a contact sheet, quality flags, and a mandatory review state. Weak board crops may be replaced only with reviewed exact-product media carrying separate provenance; background removal is a presentation transform, not identity evidence. A Kavi-only Import tab now loads either a local review manifest or its complete processed intake folder, resolves folder media locally without upload, compares source evidence with the chosen presentation image, keeps only one pending editor open, supports compact per-item correction plus approve/reject/needs-review decisions, and displays the planner's exact blockers. Its historical QA batch remains fixture-only and visibly cannot promote. The planner retains rejections, blocks fixtures/pending or ambiguous identity/missing value/media/source/availability, and emits deterministic transaction-shaped output only when every source item has a terminal reviewed disposition. The atomic promotion RPC and exact-readback client now complete the writer boundary: only the roster-bound Kavi identity can invoke it, repeated identical batches return the stored receipt, and offers publish only after approved evidence and exact presentation media. Canonical migration `20260830155905_canonical_event_catalogs` is live; the hosted catalog remains honestly empty because no real Atlanta catalog has been promoted.

Automated online image discovery is explicitly not part of the completed checkpoint. Exact-name and ad hoc fuzzy passes missed readily discoverable products, including Gatherers' Tavern's Chatterfang ARTY Deck Box, so search output remains operator-assisted lead material rather than a reliable completeness claim. Resume that lane only with a benchmark set, query-expansion contract, source ranking, and measured exact-item recall; do not hold up the accepted local UI on it.

## Durable foundations and parked boundaries

- `docs/UI_CONTROL_DENSITY_CONTRACT.md` is now the canonical grammar for tabs, browse filters, sticky toolbars, compact rows, and icon actions. New surfaces reuse the accepted 30–34px segmented rhythm; search/select controls stay 34–38px, compact result rows stay roughly 76–84px, and visual review includes a same-viewport peer comparison.
- The normalized artist/card catalog remains canonical in Supabase. Authenticated companions may see the directory and confirmed Atlanta appearances; Kavi's card inventory, owned printings, signing interests/workbench, and private images remain private.
- Maintained Info articles, factual-choice resolution, canonical flight auto-apply, and the concept-diff monitoring boundary remain in force. Ambiguous or destructive consequences fail closed.
- Semantic Map preparation is complete through `MAP-NOW-03` and parked. No production Atlanta 2026 spatial data or map activation begins before a dated first-party artifact passes the arrival gate.
- Plan-lite remains the active planning surface. Resume a production contention engine only when real purchased/locked conflicts make it necessary.
- No broad ingest, speculative schema, offline write queue, unreviewed canonical promotion, or production hosting expansion is authorized by this frontier.

## Next safe lanes

1. When the first Atlanta catalog releases, capture it immutably, run the documented inventory intake/review path, runtime-test and apply the prepared catalog migration plus private Storage prerequisites through the authenticated Supabase lane, and prove one non-fixture batch with exact live readback. Keep the public Catalogs tab hidden until a reviewed Atlanta inventory offer has that live readback. Historical Atlanta 2025 and Vegas 2026 items/media remain reusable reference material only; image recognition is parked for an onsite experiment.
2. Design and implement private Supabase Storage plus retention/access rules for receipt originals, QR codes, badge proof, and other sensitive confirmation artifacts; migrate consumers without changing the stable receipt object grammar.
3. On a physical iPhone, prove Google OAuth persistence and installed-PWA cold airplane-mode reopen across the critical cached views. Record device/browser/build evidence and any actual defect.
4. Keep monitoring and the accepted preview stable unless a real source change or visible defect appears. Use `pnpm monitor:check` first and accept a baseline only through the documented reviewed closure lane.
5. Keep Map parked until the official Atlanta 2026 artifact arrives, then enter through `docs/MAP_INGESTION_RUNBOOK.md`.
