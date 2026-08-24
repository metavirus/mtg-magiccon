# Map semantic data contract

Updated: 2026-08-23

Status: design freeze for the browsable Map. This is not a database migration, production schema, or claim about the unpublished Atlanta 2026 floor plan.

Machine-checkable preparation lives in [`map-data/`](map-data/README.md). It remains deliberately disconnected from the application until the official map is published and reviewed.

## Purpose

The Map UI should render one reviewed spatial model rather than hard-coded boxes. When the 2026 artifact arrives, we should replace fixture records—not redesign the interface.

The active scope is browsing, zooming, deterministic search, compact details, personal markers, and opening a reviewed location from another app surface. Routing, origin detection, camera recognition, and live positioning remain parked.

## Non-negotiable rules

1. **Geometry and meaning are separate.** A polygon says where something is; its semantic record says what it is.
2. **Adjacency implies nothing.** Two touching objects are unrelated unless an explicit relationship says otherwise. Command Zone does not own nearby Free Play; Pro Tour does not own Ticketed Play.
3. **Containment is explicit.** `parent_id` is used only for real containment, such as Prize Wall and Play HQ inside a Ticketed Play close view.
4. **Simplification is intentional.** Reviewed relative rectangles and polygons are sufficient. The UI does not preserve architectural noise or booth-shape quirks that do not help a visitor.
5. **Historical data is quarantined.** `historical/atlanta-2025` may exercise the model but can never activate as Atlanta 2026.
6. **Domain truth stays in its domain.** Calendar owns events; Info owns maintained facts; Exhibitors and Artists own their entities. Map stores only a versioned binding to a spatial object.
7. **User state is separate.** Bookmarks and notes are not properties of shared geometry. Shared map data stays read-only offline; personal state syncs through its existing Supabase owner model.
8. **No fabricated pin.** An unbound, ambiguous, rejected, or TBA location produces no map target.

## Active record set

### `map_manifest`

One compatible read-only package for an event map.

Required fields:

- `schema_version`
- `map_id`
- `event_key`
- `revision_id`
- `status`: `fixture | candidate | reviewed | active | superseded`
- `edition_namespace`
- `levels[]`
- `objects[]`
- `bindings[]`
- `search_entries[]`
- `source_refs[]`
- `created_at`

Activation must reject historical namespaces, mixed revision IDs, missing required review state, or an unknown source artifact.

### `map_level`

A navigable visual canvas, not necessarily a literal building floor.

Required fields:

- `id`
- `label`
- `kind`: `campus | venue | floor | zone`
- `parent_level_id` when nested
- `coordinate_space`: `{ width, height, unit: "normalized" }`
- `orientation`: reviewed display orientation for this revision
- `default_view`: `{ center_x, center_y, zoom }`
- `source_ref_ids[]`

The likely hierarchy is campus → venue/floor → show floor → dense zone close view. A level may be omitted when it adds no useful navigation.

### `spatial_object`

The one renderable/searchable spatial primitive.

Required fields:

- `id`: stable within the event edition
- `revision_id`
- `level_id`
- `type`
- `label`
- `geometry`
- `review_state`: `candidate | reviewed | rejected | unresolved`
- `source_ref_ids[]`

Optional fields:

- `short_label`
- `aliases[]`
- `parent_id`
- `children_order[]`
- `access_points[]`
- `permeability`: `open | edge_limited | enclosed`
- `presentation`
- `detail_ref`
- `search_priority`

Active `type` values:

- `venue`
- `floor`
- `hall`
- `corridor`
- `entrance`
- `room`
- `zone`
- `booth`
- `artist_table`
- `service`
- `amenity`
- `stage`
- `store`
- `queue`

`geometry` is one of:

- `{ kind: "point", x, y }`
- `{ kind: "rect", x, y, width, height }`
- `{ kind: "polygon", points: [[x, y], ...] }`

Coordinates are normalized to the owning level. The UI may simplify a reviewed source boundary, but every displayed object must retain its source reference and review state.

### `presentation`

Controls density without changing semantic identity.

- `min_zoom`: first zoom at which the object appears
- `label_zoom`: first zoom at which its label appears
- `detail_zoom`: first zoom at which children or internal services appear
- `emphasis`: `quiet | normal | major`
- `label_mode`: `full | short | icon | hidden`
- `color_role`: semantic design role, not an arbitrary literal color
- `icon_key` when a familiar symbol is more legible than text

Examples:

- The show-floor overview shows `Ticketed Play`; its Prize Wall and Play HQ children appear only in the Ticketed Play close view.
- Marketplace is one major overview object; booths appear at close zoom.
- Amenities remain quiet until searched, then highlight without opening an explanatory article.

### `access_point`

An entry or approach marker used for orientation and future compatibility, not current pathfinding.

- `id`
- `object_id`
- `point`: `{ x, y }`
- `kind`: `main | secondary | open_edge | doorway`
- `label`
- `review_state`

The main show hall can therefore have exactly three reviewed lobby entrances while remaining enclosed on its other sides. Open zones may use one or more `open_edge` markers without pretending they have doors.

### `location_binding`

Connects another canonical object to one reviewed map object.

- `id`
- `revision_id`
- `domain`: `calendar | plan | info | artist | exhibitor | store | activity`
- `domain_object_id`
- `spatial_object_id`
- `focus_object_id` when a child should be highlighted
- `effective_from` / `effective_to` when relevant
- `review_state`: `reviewed | ambiguous | unbound | superseded`
- `source_ref_ids[]`

Examples:

- A Calendar event binds to Ticketed Play with Play HQ as its focus object.
- An Info article binds to Prize Wall.
- An exhibitor binds to its booth; the exhibitor description remains owned by Exhibitors.
- An artist appearance binds to an artist table; private signing notes remain private and separate.

### `search_entry`

One deterministic search projection generated from reviewed objects and bindings.

- `id`
- `label`
- `normalized_terms[]`
- `category`
- `spatial_object_id`
- `focus_object_id` when applicable
- `priority`

Search supports names, room codes, booth names, categories, common synonyms, and bounded typo tolerance. Typing may highlight candidates, but the viewport moves only after an explicit selection.

### `source_ref`

Minimal provenance pointer for a reviewed assertion.

- `id`
- `artifact_id`
- `edition_namespace`: the edition the evidence actually describes
- `source_kind`: `official_map | official_directory | official_schedule | reviewer_annotation`
- `locator`: page, crop, label, or object reference
- `reviewed_at`
- `reviewed_by`

Raw OCR/CV candidates remain outside the active manifest until reviewed.

## Relationships

```text
map_manifest
  ├─ map_level
  │    └─ spatial_object
  │         ├─ spatial_object children (only real containment)
  │         └─ access_point
  ├─ location_binding ──> external canonical domain object
  ├─ search_entry ──> spatial_object / optional focus child
  └─ source_ref ──> retained source evidence
```

There is no active route graph, origin estimate, camera anchor, or live-position record in this contract.

## UI session state

Map presentation state is transient and device-local:

```json
{
  "level_id": "show-floor",
  "viewport": { "center_x": 0.62, "center_y": 0.54, "zoom": 2.4, "rotation_deg": 0 },
  "selected_object_id": "ticketed-play",
  "focused_object_id": "play-hq",
  "search_text": "ticketed play",
  "return_context": {
    "surface": "calendar",
    "domain_object_id": "event-example",
    "scroll_anchor": "event-example"
  }
}
```

This state may survive ordinary navigation and reconnects, but it is not canonical shared data. Returning from Map restores the originating surface and scroll anchor; returning to Map restores the prior level, viewport, selection, and search text.

## Personal overlay state

Personal interest is joined at render time:

- `spatial_object_id` or canonical domain object ID
- owner user ID
- bookmark/interested flag
- note count or quiet note marker
- updated timestamp

One user's saved artist or exhibitor does not appear on another user's map. Personal overlays never alter shared object geometry, labels, or bindings.

## Minimal synthetic example

```json
{
  "id": "ticketed-play",
  "revision_id": "fixture-r1",
  "level_id": "show-floor",
  "type": "zone",
  "label": "Ticketed Play",
  "geometry": { "kind": "rect", "x": 0.73, "y": 0.55, "width": 0.22, "height": 0.34 },
  "permeability": "open",
  "children_order": ["prize-wall", "play-hq"],
  "presentation": {
    "min_zoom": 1,
    "label_zoom": 1,
    "detail_zoom": 2,
    "emphasis": "major",
    "label_mode": "full",
    "color_role": "play"
  },
  "review_state": "reviewed",
  "source_ref_ids": ["synthetic-layout-review"]
}
```

The example is synthetic and proves shape only. It is not Atlanta 2026 evidence.

## Arrival mapping workflow

When the official 2026 map arrives:

1. Create a candidate manifest and immutable artifact record.
2. Establish the useful level hierarchy and reviewed coordinate spaces.
3. Author only visitor-meaningful objects: boundaries, three show-hall entrances if confirmed, rooms, major zones, booths/tables, and useful amenities.
4. Review every object and containment relationship against the source. Proximity never creates a parent.
5. Generate search entries and domain bindings from reviewed stable IDs.
6. Validate zoom presentation, mobile density, cross-surface state recovery, and offline compatibility.
7. Activate one complete revision atomically; keep the previous complete bundle until the replacement passes.

## Design gate before implementation

The implementation schema may proceed when all of these remain true:

- the UI can render every accepted prototype state from these records;
- no active requirement depends on routing or live positioning;
- dense children appear only at their intended zoom/detail level;
- containment and sibling relationships are unambiguous;
- unbound domain objects cannot create a pin;
- 2025 historical fixtures cannot satisfy a 2026 activation check;
- personal overlays remain separate from shared map truth.
