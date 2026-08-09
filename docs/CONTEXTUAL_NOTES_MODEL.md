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

## Author and visibility model

For MVP, notes are written by and visible to the logged-in owner. When friend/partner access becomes real, a note can simply be another person's timestamped annotation on the same object. That is useful; it still does not need to become chat.

Each note should visibly carry:

- author identity using the universal person bubble (`Ka`, `J`, `C`, future `Ky`);
- timestamp;
- body;
- context/backlink;
- visibility.

This means a receipt, event, or store item can show a short note thread such as Kavi's note plus Chris's note without needing a separate messaging surface.

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

Filtering should be available wherever multiple notes can accumulate:

- `All` — every note visible to the current user;
- `Mine` — notes written by the logged-in user;
- `Others` — visible notes written by other attendees;
- optional per-person filters using the same bubbles when the object has enough notes to justify it.

For example, a receipt detail can default to `All`, but let Kavi flip to `Mine` when he only wants his own assignment/reminder notes. The Notes tab can use the same filter grammar globally.

## Interface behavior

Most object details should have a small “Add note” affordance, but it should stay visually quiet. Notes are useful because they are available everywhere, not because they constantly demand attention.

Each object detail can show:

- latest note snippet, if any;
- note count;
- author bubbles for the people who have notes on that object;
- small add/edit affordance;
- visibility icon/chip only when needed.

The Notes tab should group by context first:

- Recent;
- Mine;
- Others;
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
- `author_id`;
- `author_display`;
- `body`;
- `visibility`;
- `object_type`;
- `object_id`;
- `object_title`;
- `created_at`;
- `updated_at`;
- `archived_at`;
- optional `source_observation_id` when a note responds to monitored evidence.

RLS should keep each author's notes author-controlled for edits/deletes. Future shared viewing should be based on explicit event/group membership or object access, not a blanket rule that every authenticated user can read every note. A user may be allowed to read a shared note without being allowed to edit it.

## Guardrail

Notes are personal interpretation unless deliberately tied to a source observation. They should not silently overwrite publisher truth, observed reality, or normalized event facts.
