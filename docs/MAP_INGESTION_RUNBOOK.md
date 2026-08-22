# Official map arrival ingestion runbook

Updated: 2026-08-22

Use this checklist when an official Atlanta 2026 map artifact appears. It is a controlled evidence-to-spatial-twin workflow, not monitoring-baseline acceptance and not automatic publication.

This runbook begins only after a first-party original artifact is reachable. A newly discovered link, social image, monitor finding, or resemblance to Atlanta 2025 stays in NOW mode. The outputs are an immutable candidate `map_revision`, reviewed spatial objects and graph, versioned bindings, one compatible offline bundle, and activation evidence; none is production truth until section K passes.

## Stop conditions

Stop before mutation/publication when any of these is unresolved:

- repository/main/GitHub or canonical Supabase identity is ambiguous;
- source is not first-party or exact artifact access is unavailable;
- event, city, year, floor, or revision cannot be proven;
- a newer reviewed revision may already exist;
- original-resolution inspection is unavailable;
- orientation or coordinate calibration is unknown;
- OCR/CV candidates are being treated as canonical;
- route barriers, portals, accessibility, or destination joins are unreviewed;
- required offline, desktop/mobile, or physical-iPhone proof cannot be performed. Sensor permission proof is required only for sensor behavior included in the candidate release; manual-origin proof is always required.

## A. Arrival and evidence capture

- [ ] Run `pnpm readiness`; prove canonical repo, `main`, GitHub repo-local identity, Supabase `pavjsexxbueuzhzgemgy`, and hosted migration alignment.
- [ ] Run the canonical monitor check first. Do not accept or rewrite a baseline merely because a map link appeared.
- [ ] Record first-party page URL and direct artifact URL, publisher, retrieval time, publication/effective date if stated, access/HTTP state, and discovery evidence.
- [ ] Download/capture the original artifact through the approved evidence lane; do not use a social thumbnail or screenshot as the source original.
- [ ] Record SHA-256, bytes, MIME type, pixel/page dimensions, filename, and private artifact pointer where required.
- [ ] Verify visible event name, Atlanta, 2026, GWCC, level/floor labels, and dates. Cross-check the source page and venue floor plans.
- [ ] Compare hash and source metadata with all existing candidate/published artifacts.
- [ ] Create an immutable candidate `map_revision` under the Atlanta 2026 `map_set`. Do not overwrite or mutate the active revision.
- [ ] If the artifact is unchanged, attach corroborating provenance and stop; do not create a duplicate revision/card.

## B. Artifact and revision classification

- [ ] Identify whether this is a full floor, submap, exhibitor/artist enlargement, campus map, accessibility map, or replacement revision.
- [ ] Enumerate every floor/page/submap and their relationships.
- [ ] Record revision label/date if present; otherwise use retrieval/hash identity and mark publisher revision unknown.
- [ ] Link the candidate to the prior revision as `supersedes` only when scope identity is proven.
- [ ] Preserve the prior artifact and normalized objects until the replacement is reviewed and activated.
- [ ] Record the expected object, graph, binding, anchor, and offline-bundle versions for this revision; mixed-version activation is forbidden.

## C. Orientation and coordinate calibration

- [ ] Find north/orientation evidence in the 2026 artifact, venue plan, or independently reviewed landmarks.
- [ ] Do not inherit the user-confirmed west-up orientation of the 2025 map.
- [ ] Record `top_bearing_deg`, evidence, reviewer, and uncertainty. If unknown, block production spatial publication.
- [ ] Select at least four distributed control points visible in both artifact and venue/reference geometry.
- [ ] Record original image pixels and normalized coordinates.
- [ ] Fit the approved affine transform; inspect residuals and outliers.
- [ ] If one affine transform fails, review source distortion before allowing piecewise affine. Never hide error with an opaque warp.
- [ ] Freeze transform version and golden control-point test.

## D. Candidate extraction

- [ ] Run OCR/CV only as candidate generation at original resolution.
- [ ] Extract candidate labels, booth/room numbers, large zones, icons, polygons/boxes, corridors, doors, stairs, elevators, escalators, restrooms, first aid, concessions, entrances, and portals.
- [ ] Record extractor/version, confidence, source crop/coordinates, and candidate status.
- [ ] Preserve unreadable/ambiguous text as unknown; do not guess.
- [ ] Deduplicate candidates by reviewed spatial identity, not fuzzy title alone.

## E. Human original-resolution overlay QA

- [ ] Inspect the whole original at 100% and zoomed detail.
- [ ] Accept/edit/reject every production POI and label.
- [ ] Draw reviewed polygons/points and at least one usable approach point for route targets.
- [ ] Deconstruct walkable corridors/hallways, walls/barriers, door gaps, queue boundaries, transitions, and staff-only/nonpublic space.
- [ ] Verify entrances, floor portals, stairs/elevators/escalators, and accessible alternatives.
- [ ] Inspect dense booth/artist matrices individually; confirm number/name pairs.
- [ ] Confirm landmark visibility and direction phrasing from plausible approaches.
- [ ] Record reviewer, timestamp, source revision, and unresolved objects.
- [ ] Complete a coverage reconciliation: every labeled public area and every visibly traversable connection is accepted, rejected with reason, or explicitly unresolved. “Important-looking items only” is not complete floorplan deconstruction.

## F. Spatial object joins

- [ ] Join exhibitors by stable official exhibitor identity plus reviewed booth code; never name-only when ambiguous.
- [ ] Join artists by canonical appearance ID and reviewed Art of Magic booth/table.
- [ ] Join Store, pickup, Will Call, Prize Wall, Ticketed Play HQ, ODE, stages, rooms, lounges, amenities, and Info topics by reviewed POI ID.
- [ ] Join event occurrences through normalized room/location IDs; retain original source label.
- [ ] Prove Calendar and Plan consume those occurrence bindings and next-destination state; Map does not create a second schedule or planning-state record.
- [ ] Reconcile renamed/moved/removed objects against prior revision.
- [ ] Keep private receipts, signing picks, itinerary, and position out of shared spatial truth.
- [ ] Leave unresolved/TBA joins unbound and visible as unknown.

## G. Route graph and accessibility gate

- [ ] Author reviewed centerlines, intersections, barriers, approach points, and floor portals.
- [ ] Add edge length/time range, directionality, turn cue, transition, accessible state, and landmark cues.
- [ ] Treat unknown accessibility as unavailable for accessible routing.
- [ ] Prove entrance→Registration, entrance→panel room, entrance→Prize Wall, Marketplace→Art, Art→Ticketed Play, next-event, and cross-floor/accessibility goldens.
- [ ] Render and visually inspect every golden path against the original; each rough reviewed line starts at a confirmed landmark/anchor, ends at the destination approach point, and crosses no wall, booth, closed door, or queue barrier.
- [ ] Confirm official signage/staff override language.

## H. Position anchors

- [ ] Select safe, recognizable landmarks with reviewed coordinates and reasonable approach area.
- [ ] Create manual anchors first.
- [ ] If approved QR markers exist, bind versioned/checksummed anchor IDs; do not embed arbitrary coordinates.
- [ ] Build the bounded visual landmark set from source-backed signs/room/booth views; retain no private camera frames. Ordinary camera matches propose an approximate anchor and require user confirmation.
- [ ] Define covariance radius, freshness, confirmation, expiry, and wrong-anchor recovery for each method.
- [ ] GPS remains campus/entrance-only. Compass remains orientation-only.

## I. Offline package

- [ ] Generate one compatible bundle manifest for shell, raster/pyramid, overlays, search aliases, graph, bindings, anchors, source/revision metadata, and minimum itinerary snapshot.
- [ ] Confirm asset sizes and iPhone decode/memory performance.
- [ ] Verify every expected cache entry after download before showing “available offline.”
- [ ] Test quota failure, eviction, partial download, mixed revision, interrupted update, and recovery.
- [ ] Activate a new bundle atomically; retain the last complete reviewed bundle until success.

## J. Validation and publication

- [ ] Run unit/fixture gates for transform, object identity, search, joins, graph, routes, revision diff, and historical leakage.
- [ ] Run build, tests, text-integrity, secret, diff, and task-specific validation.
- [ ] Review schema/migration only if separately authorized; if changed, perform canonical identity, migration review, hosted apply, readback, RLS, grants, and advisors.
- [ ] Inspect desktop and 390px Map: pan/zoom, search, POIs, drawers, route, next move, unknown state, source revision, and offline status.
- [ ] Test the installed physical iPhone PWA. Manual origin, search, drawers, route, and offline behavior always run; granted/denied/revoked camera, compass, and geolocation are added to the matrix only when the release exposes them.
- [ ] Airplane-mode cold launch proves pan/zoom/search/next move/route.
- [ ] Run screen reader, keyboard, large text, contrast, reduced-motion, hit-target, and accessible-route checks.
- [ ] Commit/push through the documented lane; wait for exact clean CI/Pages; verify public cache freshness.
- [ ] Repeat deployed desktop, 390px, and physical-iPhone affected-path inspection.

## K. Readback and activation evidence

- [ ] Read back active map set, artifact hash, transform revision, object/edge/binding counts, unresolved counts, and active bundle manifest.
- [ ] Confirm the active bundle uses one compatible revision across raster, overlay, search, graph, bindings, anchors, and itinerary projection; confirm no historical namespace or 2025 artifact/orientation appears.
- [ ] Prove shared/private boundaries and non-owner access proportionately.
- [ ] Record seven route-golden results, accessibility status, offline proof, device/OS/browser, screenshots, commit, CI, Pages, and public verification.
- [ ] Update frontier/backlog/handoff with what is active, unresolved, superseded, and next.

## L. Revision diff and supersession

- [ ] On every later artifact, compare hash, pixels/pages, OCR candidates, reviewed objects, graph topology, bindings, and anchor validity.
- [ ] Classify each change as noise, corroboration, new object, material move/rename, barrier/route change, contradiction, or supersession.
- [ ] Link evidence; do not duplicate current POIs or public map revisions.
- [ ] Re-run affected joins and routes, plus all accessibility goldens when topology changes.
- [ ] Keep old bundle active until replacement passes completely, then atomically supersede.
- [ ] Surface only meaningful user consequences: moved destination, new floor, closed path, accessibility change, or next-event impact.
