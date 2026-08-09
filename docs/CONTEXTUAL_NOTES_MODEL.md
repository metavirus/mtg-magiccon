# Contextual Notes Model

Notes should be easy to add almost anywhere, but they should not turn the interface into a universal comments system. The useful default is: write a note in context, then let the Notes tab collect and search those notes later.

## Product rule

A note belongs primarily to the thing the user was looking at when they wrote it:

- receipt;
- receipt line item;
- event;
- itinerary/calendar entry;
- hotel or flight;
- artist;
- vendor/store/prize item;
- map place;
- monitor/activity finding;
- generic trip/convention note only when there is no better object.

The Notes tab is an index and review surface, not the only place notes live.

## Visibility model

For MVP, notes are written by and visible to the logged-in owner. When friend/partner access becomes real, do not make every note a social object by default.

Use a small explicit visibility value:

- `private` — only the writer. Good for stray thoughts, personal preference, or anything that would be boring/noisy to others.
- `shared` — visible to the small MagicCon group. Good for coordination, receipt assignments, meet-up notes, travel handoffs, and “Chris should see this.”
- `system` — app/agent-generated annotation or extracted source note. Not editable as a personal thought and not treated as canonical truth without review.

The practical default should be object-sensitive:

- receipt assignment notes: `shared` if the receipt involves someone else, otherwise `private`;
- event preference notes: `private` by default;
- calendar/meet-up notes: `shared` when multiple people are involved;
- artist/card-signing notes: `private` unless explicitly shared;
- monitor/agent notes: `system` until accepted or converted.

## Interface behavior

Most object details should have a small “Add note” affordance, but it should stay visually quiet. Notes are useful because they are available everywhere, not because they constantly demand attention.

Each object detail can show:

- latest note snippet, if any;
- note count;
- small add/edit affordance;
- visibility icon/chip only when needed.

The Notes tab should group by context first:

- Recent;
- Receipts;
- Events;
- Trip;
- Artists/vendors;
- Monitor/activity;
- Archived.

Notes in the tab should deep-link back to their object. A note without a backlink is usually a design smell.

## Data direction

Do not create a full collaboration system for v1.5. A narrow authenticated table is enough later:

- `id`;
- `owner_id`;
- `body`;
- `visibility`;
- `object_type`;
- `object_id`;
- `object_title`;
- `created_at`;
- `updated_at`;
- `archived_at`;
- optional `source_observation_id` when a note responds to monitored evidence.

RLS should keep owner-written notes owner-controlled. Future shared viewing can be added with an explicit event/group membership model rather than assuming every authenticated user can read everything.

## Guardrail

Notes are personal interpretation unless deliberately tied to a source observation. They should not silently overwrite publisher truth, observed reality, or normalized event facts.

