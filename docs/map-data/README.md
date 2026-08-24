# Map data preparation package

This directory prepares the map model for the future official Atlanta 2026 map. It is deliberately disconnected from the application.

## Contents

- `schemas/map-manifest.schema.json`: reviewed shared spatial data
- `schemas/map-ui-session.schema.json`: temporary device-local viewport and return state
- `schemas/personal-map-overlay.schema.json`: private bookmarks and note markers
- `fixtures/synthetic-show-floor.json`: fake geometry that proves the contract without asserting any Atlanta 2026 facts
- `fixtures/negative-cases.json`: deliberately unsafe mutations that the guard must reject
- `historical/atlanta-2025/reference.json`: a non-activatable quarantine record, not a current map

Run `pnpm validate:map-data` after changing the package. The validator checks relationships that basic JSON shape validation cannot safely infer: revision consistency, containment, source evidence, valid bindings, normalized bounds, and historical activation protection.

The command also promotes a copy of the synthetic fixture into a fake future-edition control, proves that clean control can activate, and then proves that historical provenance, mixed revisions, incomplete review, invalid containment, unresolved bindings, and parked routing data are rejected.

## Release boundary

Nothing in this directory is imported by `src/`. Do not connect it to the app before the official map is published and reviewed. When that happens, create a new candidate edition rather than editing this synthetic fixture into something that looks official.
