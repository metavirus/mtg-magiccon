# Official Atlanta 2026 map arrival runbook

Updated: 2026-08-24

Use this only after an official first-party Atlanta 2026 map is actually published. A link, thumbnail, social post, leaked image, or resemblance to Atlanta 2025 does not start this process.

The goal is a reviewed, browsable map with useful zoom levels, search, compact details, and links from Calendar, Info, Artists, Exhibitors, and Store. Routing, directions, camera positioning, live location, and turn-by-turn behavior are not part of this release.

The controlling data contract is [`MAP_SEMANTIC_DATA_CONTRACT.md`](MAP_SEMANTIC_DATA_CONTRACT.md). Machine-checkable schemas and guards live in [`map-data/`](map-data/README.md).

## Stop immediately when

- the source is not official or the original-resolution file cannot be obtained;
- Atlanta, 2026, event dates, venue, floor, or map revision cannot be proven;
- orientation is uncertain;
- a newer candidate or active revision may already exist;
- a label, boundary, entrance, room, booth, or containment relationship is being guessed;
- Atlanta 2025 data is being used as evidence for Atlanta 2026;
- an unresolved location is about to receive a pin;
- someone proposes changing the live app before the reviewed candidate package passes.

## 1. Capture the official evidence

- [ ] Record the official webpage and direct map-file URLs.
- [ ] Download the original PDF or image; do not use a screenshot or thumbnail as the source.
- [ ] Record retrieval time, filename, MIME type, byte size, page/pixel dimensions, and SHA-256.
- [ ] Record the visible event name, Atlanta, 2026, GWCC, dates, level labels, and publisher revision/date when present.
- [ ] Compare the hash and source metadata with any existing candidate. If unchanged, record corroboration and stop.
- [ ] Preserve the original artifact unchanged. Derived crops, OCR, and simplified geometry must be separate files.

## 2. Open a candidate edition

- [ ] Create a new candidate manifest from the map-manifest schema; never edit the synthetic fixture into an official map.
- [ ] Use `event/atlanta-2026` as `edition_namespace` only after the source identity above is proven.
- [ ] Give the candidate one immutable `revision_id` and keep that revision consistent across every object and binding.
- [ ] Set `status` to `candidate`; do not replace any active package.
- [ ] Add a `source_ref` for each official artifact or reviewer annotation, including its true `edition_namespace`.
- [ ] Keep `historical/atlanta-2025` quarantined. Its user-confirmed west-up orientation applies only to that edition.

## 3. Establish the useful spatial canvases

- [ ] Decide the smallest useful hierarchy: campus/venue, floor, show floor, and dense zone close views only where needed.
- [ ] Establish the 2026 display orientation from the 2026 artifact or independently verified venue landmarks.
- [ ] Record each level's normalized coordinate space and default view.
- [ ] Use enough reviewed control points to place important areas consistently; exact architectural precision is unnecessary.
- [ ] Preserve meaningful relative position. Simplify decorative wall detail, loading infrastructure, service rooms, and architectural noise visitors do not need.

## 4. Deconstruct the map into reviewed objects

- [ ] Work at original resolution and visually inspect every authored object against the source.
- [ ] Create only visitor-meaningful objects: hall boundaries, lobby/corridors, entrances, meeting rooms, major zones, queues, booths/tables, stages, stores, useful services, and light amenities.
- [ ] Keep adjacent concepts separate. Proximity never creates ownership or containment.
- [ ] Use `parent_id` only for real containment—for example, Prize Wall and Play HQ inside the Ticketed Play close view.
- [ ] Record reviewed access points where they aid orientation. An enclosed hall may have only its confirmed lobby entrances; an open zone may use open-edge markers.
- [ ] Mark ambiguous items `unresolved` rather than guessing.
- [ ] Retain OCR or image-recognition output only as candidate evidence until a human accepts, edits, or rejects it.
- [ ] Reconcile coverage: every useful visible label or boundary is reviewed, deliberately excluded as noise, or explicitly unresolved.

## 5. Set zoom and visual density

- [ ] Give each object reviewed `min_zoom`, `label_zoom`, and `detail_zoom` values.
- [ ] At overview, show only major visitor concepts such as Marketplace, Art of Magic, Ticketed Play, Command Zone, and Queue.
- [ ] Reveal booths, artist tables, internal services, and room numbers only when the screen has room.
- [ ] Keep amenities quiet by default; search may highlight them without opening filler explanations.
- [ ] Use short labels, familiar icons, and semantic color roles where they improve small-screen legibility.
- [ ] Do not encode literal UI colors as spatial truth.

## 6. Add search and cross-app bindings

- [ ] Generate reviewed search entries from names, aliases, room codes, booth names, categories, and common useful synonyms.
- [ ] Typing may highlight a candidate; the map moves only after the user selects it.
- [ ] Bind Calendar, Plan, Info, Artists, Exhibitors, and Store records to stable spatial IDs.
- [ ] Use `focus_object_id` when the useful destination is a child, such as Prize Wall within Ticketed Play.
- [ ] Keep event, article, artist, exhibitor, and store facts in their existing domains; Map stores only the location binding.
- [ ] Leave ambiguous or TBA records unbound. No binding means no pin.
- [ ] Keep private bookmarks and notes in the personal-overlay model, separate from shared geometry.

## 7. Validate the candidate package

- [ ] Run `pnpm validate:map-data`.
- [ ] Confirm the clean candidate passes revision, provenance, containment, binding, bounds, and review checks.
- [ ] Confirm historical, mixed-revision, incomplete-review, invalid-containment, unresolved-binding, and parked-routing guard tests still fail safely.
- [ ] Confirm every source reference belongs to `event/atlanta-2026` before activation.
- [ ] Confirm no `historical/atlanta-2025` source, artifact, orientation, coordinate, label, or binding entered the candidate.
- [ ] Review the package diff as data, not merely as rendered pixels.

## 8. Only then connect the reviewed package to the app

- [ ] Import one reviewed read-only package; do not hard-code a second copy of the layout in UI components.
- [ ] Verify overview, zone close views, pinch/desktop zoom, click details, deterministic search, and prior-context recovery.
- [ ] Verify compact drawers/popovers stay in map context unless the user deliberately opens another surface.
- [ ] Verify personal markers are private and do not alter shared geometry.
- [ ] Build one compatible offline bundle and activate it atomically; never expose a partial or mixed revision.
- [ ] Confirm reconnect refreshes quietly and never overwrites newer shared data with stale offline state.

## 9. Visual and release proof

- [ ] Run the risk-tier build, tests, text, secret, and map-data validation required by the actual implementation change.
- [ ] Visually inspect desktop and 390px views: orientation, pan/zoom, density, label collisions, search, object details, drawers, and return context.
- [ ] Test the installed iPhone PWA, including cold offline launch and reconnect.
- [ ] Confirm the official source remains reachable from provenance/details without requiring it for ordinary use.
- [ ] Commit and push through the normal root-owned publication lane; verify exact CI/Pages and public cache freshness.
- [ ] Record active revision, source hash, object/binding counts, unresolved items, screenshots, commit, deployment proof, and any intentionally deferred work.

## Parked until separately reconsidered

Do not revive these merely because the data model could support them someday:

- route graphs or suggested paths;
- turn-by-turn directions;
- camera/sign recognition;
- manual or automatic origin detection;
- compass, GPS, or live positioning;
- accessibility routing claims;
- onsite crowd or obstruction reporting.

If any returns, it begins as a separate design decision with its own evidence and validation—not as a hidden extension of map ingestion.
