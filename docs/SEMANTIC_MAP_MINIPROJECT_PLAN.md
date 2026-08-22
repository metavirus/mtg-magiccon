# Semantic Map miniproject plan

Updated: 2026-08-22

Status: planning baseline, not implemented. The 2025 Atlanta map is a quarantined structural reference only. Its west-up orientation is user-confirmed for that edition only; no original-resolution 2025 artifact is currently tracked in this repository. The official Atlanta 2026 floor map has not been captured or normalized.

## Charter

Build an onsite-first semantic spatial twin of MagicCon Atlanta: not a zoomable JPEG, but an offline map that understands places, entrances, walkable routes, event and itinerary destinations, and the uncertainty of a person's approximate origin.

The default question is **What is my next move?** Map should answer:

1. where the next purchased or committed event is;
2. when to leave;
3. a rough reviewed path from a known or approximate origin;
4. recognizable landmarks, signs, booth numbers, or rooms along the way;
5. what remains uncertain.

The external official map is source evidence. Reviewed spatial objects, route topology, bindings, and personal position are distinct layers. AI may retrieve and explain reviewed objects; it must never invent coordinates, corridors, accessibility, hours, or destinations.

## Success and non-goals

Success means Kavi can open the installed web app under poor connectivity, find a booth/artist/room/amenity, jump to the next real calendar destination, choose or visually recognize an origin landmark, and follow a reviewed path without believing the phone knows more than it does.

This miniproject does not promise:

- GPS-quality indoor positioning;
- organizer-grade turn-by-turn navigation;
- automatic canonization of OCR/CV output;
- background location history or companion tracking;
- BLE/Wi-Fi scanning in iPhone Safari;
- UWB or ARKit from the PWA;
- a parallel event, artist, itinerary, or Info truth model.

## Two operating modes

### NOW: before the official Atlanta 2026 map

Safe work now is structure, tooling, contracts, and quarantined rehearsal:

- freeze product semantics, provenance, uncertainty, and acceptance criteria;
- model map editions, revisions, floors, reviewed objects, anchors, graph nodes/edges, bindings, and offline bundles conceptually;
- use an original-resolution 2025 Atlanta artifact only if it is captured through the evidence lane and quarantined in a historical structural lab;
- prototype raster overlay authoring, normalized coordinates, search, routing, offline packaging, and deterministic fixtures against clearly historical IDs;
- define and test the visual-anchor confirmation, covariance, expiry, sensor-denial, and privacy contracts against synthetic or historical fixtures without claiming a 2026 position;
- prepare the arrival runbook and proof harness;
- wire no 2025 coordinates, booth assignments, orientation, or names into the 2026 production projection.

NOW may establish code-shaped contracts later, but this plan authorizes no feature or schema implementation by itself.

### ARRIVAL: when the official Atlanta 2026 map publishes

Capture and fingerprint the official artifact, prove event/year/floor/revision, independently verify orientation, extract candidates, manually author and review the spatial twin at original resolution, bind current objects, prove routes/offline/mobile/physical-device behavior, and only then publish. Follow [MAP_INGESTION_RUNBOOK.md](MAP_INGESTION_RUNBOOK.md).

The mode changes only when a first-party original artifact passes the runbook's identity checks. A link appearance, social thumbnail, historical resemblance, OCR result, or monitor finding does not move the project into ARRIVAL.

## Brainstorm inventory

The broad possibility space is intentionally recorded before convergence:

- pan/zoom floor and campus maps with semantic POI overlays;
- booth, artist, exhibitor, room, panel, play area, amenity, food, accessibility, and store search;
- natural-language questions such as “where do I spend Prize Tix?” or “Rebecca Guay then my 2 PM event”;
- itinerary-aware next destination, leave-by time, route duration, and conflict warning;
- landmark-first directions using visible signs, zones, booth numbers, and approach sides;
- route preferences for accessible paths, fewer turns, elevators, quieter paths, or avoiding queues;
- selected-event, purchased-event, companion, artist-signing, Store, Prize Wall, and Info backlinks;
- approximate origin from manual landmark, QR marker, recognized sign/booth/room, optional compass, or coarse outdoor GPS;
- camera-assisted recognition of a sign, booth number, landmark, or approved marker;
- organizer-supplied QR anchor set;
- temporary crowd/closure overlays and route-edge disablement;
- map revision diffs highlighting moved booths, renamed zones, changed doors, and closed paths;
- offline map bundle and textual emergency fallback;
- multi-floor portal navigation;
- optional step dead reckoning after a trusted anchor;
- native-only ARKit/UWB/BLE experiments if the web MVP proves valuable;
- companion rendezvous proposals without live location sharing;
- “near me before my next event” recommendations constrained by available slack and location confidence.

## Opinionated product freeze

### MVP

- Official Atlanta 2026 raster with source/revision state.
- Reviewed vector POIs, approach points, walkable graph, barriers, portals, and accessible attributes.
- Offline pan/zoom with clickable POIs and compact object drawers.
- Deterministic alias/typo search across booth numbers, rooms, artists, exhibitors, areas, amenities, Store, and event destinations.
- Calendar/Plan next-destination pin, route estimate, and leave-by time for bound fixed commitments.
- Manual “I am at” landmark selection and an honest approximate-origin indicator.
- A visibly drawn rough-but-reviewed route from the confirmed landmark/anchor to the destination approach point, plus landmark-relative text directions.
- Explicit unknown/TBA/unbound states; no fabricated pin.
- Cache freshness, source revision, and offline-ready status.

The MVP can be engineered and rehearsed in NOW, but its Atlanta 2026 spatial content and production activation are ARRIVAL work. Historical or synthetic fixtures never satisfy the live-map gate.

### Next

- Organizer-approved QR anchors.
- Camera recognition of a bounded visual landmark/sign library with confirmation before positioning.
- Optional compass rotation/heading aid after a user gesture.
- Multi-floor routing through reviewed stairs/elevators/escalators.
- Reviewed temporary closures/crowd modifiers.
- Search/recommendation integration across Artists, Exhibitors, Store, Info, and available itinerary slack.

### Experiments

- Step-based dead reckoning whose uncertainty grows until re-anchored.
- Camera marker pose or simple visual-inertial assistance.
- Native ARKit world-map prototype.
- Native UWB/BLE beacon pilot with organizer hardware.
- Privacy-preserving rendezvous check-ins.

Experiments ship only if physical tests demonstrate benefit and the UI communicates uncertainty correctly.

### Parked

- Automatic raster-to-canonical-map ingestion.
- Exact blue-dot claims from GPS or compass.
- Wi-Fi fingerprinting or Web Bluetooth scanning in the PWA.
- Continuous/background tracking, companion location history, or passive surveillance.
- Fully autonomous AI routing or recommendations without reviewed object IDs.
- Decorative 3D/AR theater before reliable 2D navigation.
- Full dynamic crowd routing without trustworthy onsite observations.

## Conceptual spatial contract

These are design names, not implemented tables.

### `map_set`

Stable event-edition/venue identity, active revision pointer, and provenance owner. A set does not carry mutable floor geometry.

### `map_revision`

Immutable candidate/reviewed/published revision identity; artifact set; floor membership; lifecycle (`candidate`, `reviewing`, `published`, `superseded`, `rejected`); predecessor/supersession relationship; review record; object, graph, binding, and bundle versions; unresolved counts; and activation time. A changed official artifact creates a new revision rather than mutating the active one.

### `map_artifact`

Stable source URL, private/original artifact pointer as appropriate, retrieval and publication dates, SHA-256 hash, MIME type, pixel dimensions, floor, revision label, event/year assertions, access state, and supersession link. Full source evidence remains separate from normalized spatial truth.

### `map_floor`

Floor key, raster bounds, `top_bearing_deg`, coordinate-system version, reviewed transform, control points, calibration residuals, and publication status. The user-confirmed 2025 west-up orientation applies only to the 2025 artifact. Atlanta 2026 orientation must be verified independently.

### `spatial_object`

Stable POI ID, floor, type, canonical label, aliases, reviewed point/polygon, approach points, booth/room code, accessibility attributes, source evidence, confidence, and revision lifecycle. Types include zone, booth, room, entrance, service, amenity, stage, store, artist area, play area, corridor, barrier, and portal.

### `route_graph`

Reviewed nodes and edges with floor, geometry, length/time estimate, directionality, accessibility, transition type, barrier/closure state, landmark cues, and revision. Raster pixels never define walkability by themselves.

### `location_binding`

Current canonical object ID (event, artist appearance, exhibitor, Store/Info topic) to stable spatial object/approach point, with effective interval, source, review status, and supersession. Free text is an observation, not a join key.

### `position_anchor`

Anchor ID, edition/floor, reviewed coordinate, label, visual signatures, optional QR payload version/checksum, and validity interval.

### `map_bundle`

Immutable compatibility manifest tying the app-shell requirement, raster/pyramid assets, overlays, search index, graph, bindings, anchors, minimum itinerary snapshot, source revision, sizes, hashes, and activation state into one offline-readable unit.

### ephemeral position estimate

`{x, y, floor, covariance, method, observed_at, anchor_id?}` lives in memory or private transient state. Heading alone never reduces position uncertainty. Raw camera, motion, and location history are not uploaded or shared by default.

## Coordinate and orientation rules

- Store geometry in normalized source-image coordinates plus an explicit transform version.
- Fit a reviewed affine transform from at least three control points; use four to eight distributed controls and publish residuals. Use piecewise affine only when a single transform demonstrably fails.
- Never infer orientation from last year's map. Record 2026 `top_bearing_deg` only after independent evidence/review.
- For a west-up image, top bearing is 270 degrees; screen angle is `wrap(world_bearing - top_bearing)`. This is a historical test fixture, not a 2026 assumption.
- Original-resolution QA must inspect labels, corridors, doors, walls, stairs, elevators, barriers, and approach sides. Downscaled screenshots are insufficient.
- OCR/CV produces candidates with bounding boxes and confidence only. A reviewer accepts, edits, rejects, or marks unknown.

## Routing and directions

- Author walkable centerlines and portals explicitly; derive neither from white pixels nor a generic image segmentation mask.
- Route with Dijkstra/A* using distance, turn, floor-transition, accessibility, closure, and optional crowd costs.
- Target an approach point, not merely a polygon centroid.
- Prefer landmark-relative steps: “cross the lobby toward Registration; pass Marketplace on your left; Prize Wall is beside Ticketed Play HQ.”
- Accessibility routes must use verified accessible edges. Unknown is not accessible.
- Route output includes graph revision, origin method, destination binding revision, estimated time range, and uncertainty note.
- A route is a reviewed wayfinding aid, not emergency guidance. Official signage and staff override it.

## Search, AI, and recommendations

Deterministic retrieval comes first: exact IDs, aliases, room/booth codes, categories, typo tolerance, current object bindings, and itinerary state. An optional semantic layer may parse or rerank a query, but every result must resolve to retrieved stable IDs.

AI may:

- interpret intent and synonyms;
- combine reviewed Info facts with spatial objects;
- explain a reviewed route;
- rank feasible stops before the next commitment.

AI may not:

- generate coordinates, corridors, accessibility, hours, availability, or closures;
- treat OCR/CV candidates as reviewed truth;
- route to an unbound/TBA object;
- hide contradictions or uncertainty.

Itinerary recommendations score commitment/purchase priority, time to start, route-time range, required buffer, opening/access constraints, interest, detour cost, and position confidence. “Nearby” is unavailable when the origin is too uncertain.

## Cross-surface integration

- **Calendar/Plan:** source of fixed purchased/committed next destinations; Map returns route/leave-by, never a second schedule.
- **Explore:** broad event discovery and location-change review; bound locations open Map.
- **Info:** maintained official facts and source evidence; Info links to spatial objects such as Prize Wall or Will Call.
- **Artists:** shared confirmed appearance may bind to Art of Magic booth; private card/signing workbench remains private.
- **Exhibitors:** shared official directory/booth binding; no invented business metadata.
- **Store/Wallet:** Store and pickup locations may bind spatially; receipts and private purchase proof remain private.
- **Activity:** meaningful map revision or bound-location change, not OCR bookkeeping.

The current `MapSurface` and stable `map` route are the UI seam. Existing `exploreEventState`, shared selection rows, Calendar, object drawers, `locationName`/`room`, and ticketed-play location-change signals should be passed into Map rather than duplicated.

## Offline, performance, and revision policy

- Version app shell, raster/vector assets, graph, aliases, bindings, and the minimum itinerary snapshot as one compatible bundle manifest.
- Provide an explicit “available offline” state after cache verification; a registration attempt is not proof.
- Use tiled/pyramidal raster or appropriately sized floor assets to avoid decoding an enormous image at once on iPhone.
- Keep overlays and labels culled by viewport/zoom; search and routing remain local and deterministic.
- Cache is a read-only projection. Supabase/reviewed artifacts remain truth.
- Detect quota failure/eviction and offer a bounded re-download. Never silently serve mixed revisions.
- A new official artifact creates a candidate revision. Diff artifacts, objects, graph, and bindings; review; then atomically activate and supersede the prior bundle.

## Privacy and sensor honesty

- Sensor access is optional, purpose-specific, foreground-only, and requested after a direct user action.
- Manual navigation remains complete when camera, motion, compass, or geolocation is denied/unavailable.
- Coarse GPS is campus/entrance context only. It has no floor and does not establish an indoor map point.
- Compass rotates an orientation aid only; it does not locate the user.
- Visual recognition/QR proposes an anchor and asks for confirmation unless the marker is cryptographically/version matched and the product decision explicitly permits direct anchoring.
- Show a labeled uncertainty circle/ellipse and freshness. Suppress the position dot when uncertainty exceeds the useful threshold.
- Stop sensors when Map is hidden; throttle sampling; retain no raw camera frames or background position history.
- Shared map knowledge stays shared. Personal position, itinerary-derived route, receipts, and private signing work remain private.

## Failure modes and fallbacks

| Failure | Required behavior |
|---|---|
| Official map missing | Keep campus orientation and honest waiting state; do not promote 2025 geometry. |
| Wrong year/event/floor | Quarantine artifact and stop ingestion. |
| Orientation unknown | Lock authoring/publish; allow uncalibrated visual review only. |
| OCR/CV low confidence | Retain candidate; require original-resolution manual QA. |
| Destination unbound/TBA | Explain that location is not published; offer event drawer, not a pin. |
| Graph edge/accessibility unknown | Exclude from accessible routing; expose unknown. |
| Camera/compass/location denied | Manual origin, fixed orientation, and textual directions remain available. |
| GPS accuracy poor/indoors | No exact dot; campus hint or manual anchor. |
| Offline bundle incomplete/mixed | Fail closed to textual cached essentials and request complete download online. |
| Cache evicted | Show not-offline-ready and re-download action. |
| Revision arrives onsite | Keep last complete reviewed bundle until replacement passes and activates atomically. |
| AI unavailable | Deterministic search, next move, and routing continue offline. |

## Phases and gates

### P0 — brainstorm/problem framing (`now`)

Record the broad possibility space, then freeze the thesis, panic tasks, non-goals, privacy boundaries, and success measures. Gate: the durable plan says this is a navigation utility, not sensor theater, and the MVP/Next/Experiments/Parked split is explicit.

### P1 — design freeze (`now`)

Freeze conceptual contracts, lifecycle, offline/revision semantics, cross-surface ownership, and acceptance fixtures. Gate: no open decision can change coordinate identity or canonical boundaries.

### P2 — historical structural lab (`now`)

If an original-resolution 2025 artifact is available through the evidence lane, exercise it under namespace `historical/atlanta-2025`; inventory structure, OCR candidates, overlay tooling, the user-confirmed west-up transform test, and graph-authoring ergonomics. Otherwise use a synthetic fixture and leave artifact-dependent work blocked. Gate: an automated guard proves historical IDs/artifacts cannot enter a 2026 bundle.

### P3 — map revision and spatial model (`now`)

Freeze versioned JSON schemas for map set, immutable revision, artifacts, floors/transforms, reviewed objects, graph, bindings, anchors, and bundles. Gate: schema fixtures validate; a revision cannot activate with an unknown orientation, mixed versions, historical namespace, or unresolved required review.

### P4 — spatial overlay authoring/review prototype (`now`)

Prototype normalized geometry, control points, original-resolution review, POI polygons, approach points, and diffable reviewer output. Gate: golden transform residuals and overlay QA pass without database promotion.

### P5 — POIs/search/existing drawers (`now` with fixtures; `arrival` with real data)

Clickable overlay, deterministic search, and existing object-drawer routing. Gate: target queries resolve one reviewed object and unknowns invent nothing.

### P6 — corridors, barriers, approach points, and reviewed route graph (`now` with fixtures; `arrival` for production)

Author corridors, barriers, portals, destination approach points, graph/path rendering, landmark directions, and the accessibility contract. Gate: the rough drawn path starts at a confirmed landmark, ends at the destination approach, never crosses a barrier, and an accessible route uses only verified accessible edges.

### P7 — domain bindings (`now` contract; `arrival` data)

Define adapters from Calendar, Plan, Info, Artists, Exhibitors, and Store canonical IDs to versioned spatial objects without creating parallel truth. Gate: a next fixed commitment routes once through a reviewed binding; TBA/unbound data never pins.

### P8 — offline bundle (`now` with fixtures; `arrival` activation)

Versioned cache manifest, asset sizing, bundle compatibility, eviction recovery, and offline status. Gate: airplane-mode cold launch supports map/search/route/next move.

### P9 — visual landmark and camera anchoring (`now` contract/prototype; `arrival` enrollment; `onsite` proof)

Define bounded sign/room/booth/QR candidate recognition, mandatory user confirmation for ordinary visual matches, covariance, freshness/expiry, wrong-anchor recovery, and camera privacy now. Enroll only reviewed 2026 anchors after map arrival. Gate: manual origin remains complete; physical-device confusion-matrix and false-anchor thresholds pass before recognition may influence origin.

### P10 — optional compass enhancement (`now` contract; `onsite` proof)

Define permission, screen-orientation correction, filtering, calibration, interference handling, and fixed-map fallback without making compass a dependency. Gate: denial/revocation paths are complete, heading never changes position confidence, and physical field error is visibly bounded before the aid ships.

### P11 — device and onsite simulation (`now` harness; `arrival` content; `onsite` proof)

Build deterministic desktop, 390px, installed-iPhone, permission-matrix, offline, route, accessibility, and timed next-move test scenarios now. Populate them with reviewed 2026 content at ARRIVAL and execute physical venue checks onsite. Gate: no severity-one wrong-destination, false-position, privacy, accessibility, or offline failure.

## Safe-now versus must-wait boundary

| Safe now | Must wait for official 2026 evidence or onsite access |
|---|---|
| Product/design freeze; conceptual and versioned file contracts; historical/synthetic quarantine fixture; leakage guard; overlay-review tooling; deterministic POI/search/drawer prototype; route authoring and path rendering against fixtures; cross-surface binding interfaces; offline bundle machinery; sensor/privacy contracts; device test harness. | Any Atlanta 2026 coordinate, orientation, floor, POI, booth/room assignment, corridor/barrier, accessible edge, canonical join, visual-anchor enrollment, production route, or active offline map bundle. Camera/compass usefulness claims and onsite timing also wait for physical-device evidence. |

No task in NOW may create a plausible-looking 2026 map from historical geometry. No ARRIVAL task may publish candidates before original-resolution review and activation gates pass.

## Exact acceptance scenarios

1. Search “Prize Wall,” a booth number, an artist, an exhibitor, C101, restroom, first aid, and a misspelling; each returns a reviewed current POI or honest no result.
2. Purchased fixed event with a reviewed binding appears once as next destination with leave-by range; flexible/TBA event has no false pin.
3. Manual Main Entrance origin routes to Registration, C101, Prize Wall, Art of Magic, Marketplace, Ticketed Play, and an accessible destination without crossing a barrier.
4. West-up historical transform maps north/right, east/down, south/left, west/up. No corresponding assertion exists for 2026 until verified.
5. Four-plus control points meet the frozen residual threshold and reviewed hitboxes contain their landmark points.
6. Camera/compass/geolocation granted, denied, revoked, unavailable, and stale states all preserve manual navigation.
7. Poor GPS never renders an exact indoor dot. Manual/visual anchor shows method, freshness, and uncertainty.
8. Airplane-mode cold launch after verified download supports pan/zoom, search, current itinerary target, routing, and source revision.
9. Mixed or superseded bundle revisions fail closed; latest complete reviewed bundle remains usable.
10. 390px portrait, desktop, large text, reduced motion, keyboard, screen reader, contrast, 44px targets, zoom/pan, and drawer reachability pass.
11. Original-resolution review verifies every production corridor, barrier, portal, approach point, booth/room join, and accessibility edge.
12. Onsite simulation at 12 landmarks and seven routes records wrong turns, completion time, anchor confidence, and fallback use; sensor enhancement ships only if it improves outcomes.
13. Historical leakage validation rejects a bundle, binding, or active revision containing a 2025 namespace, artifact, transform, POI, graph edge, or orientation claim.
14. A camera match for an approved sign/booth/room proposes an approximate anchor with method, freshness, uncertainty, and user confirmation; rejection or permission denial returns cleanly to manual origin.

## Recommended next bounded tranche

Execute P1–P3 only: freeze the versioned spatial contract, create the quarantine/leakage rules, and prepare a test-only historical or synthetic fixture. Do not touch production Map UI or Supabase yet. This provides reusable authoring and validation leverage without pretending 2025 is Atlanta 2026.
