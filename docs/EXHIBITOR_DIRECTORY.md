# Exhibitor directory

The nonspatial directory lives under Info → Exhibitors. It is separate from product catalog inventory and does not imply map placement, current stock, or guaranteed vendor offers.

## Source and publication

- The watched official Atlanta Exhibitors page binds the LEAP event 21389, slug `htwhdatl26shdl10`, category 20590.
- `exhibitor_directory_feed.mjs` retains structured specials/exclusives and raw promotion evidence. Boolean exclusives flags are not offers. Same-count content edits change the fingerprint; object-property order does not.
- Only an exact reviewed Home/noise decision allows cloud staging to project the complete feed into `public.exhibitor_directory`. Identity, count, hash, older-report protection and exact full readback are enforced. Missing entries become inactive; private user records are not deleted.
- `monitoring/exhibitor-enrichment.json` contains a few reviewed aliases and visit reasons, guarded by exact source name/description and, where relevant, booth values. Changed source evidence invalidates the enrichment instead of silently reusing it.
- Editorial review, retained replay and normal acceptance remain the standard cloud lane. Never publish a directory from an unreviewed local fetch.

## Personal state and UI

The list searches names, raw booth text and reviewed aliases. Saved entries use owner-scoped `user_selections` with kind `exhibitor`; notes use `personal_notes` with an enforced private-only constraint. Exhibitor actions are excluded from shared Activity and mention delivery. `scripts/verify_exhibitor_privacy.sql` verifies owner readback and cross-companion isolation in a rolled-back transaction.

The directory joins the owner-scoped read-only offline cache. Offline save/note controls cannot write. Source links require an online browser. Vendor descriptions and offers remain source claims; zero-price placeholders are not labeled free, and listed prices are not inventory guarantees.

Map arrival will add reviewed many-to-many booth placement. Do not infer coordinates from booth numbers or collapse multiple exhibitors sharing a booth code. Actual catalog promotion remains a separate reviewed workflow.

## Activation evidence

Implementation `122a26e`, editorial/presentation checkpoint `5888f20`. The initial cloud report `37716117774` retained 65 exhibitors and 44 offers across 19 vendors, with complete coverage; its exact reviewed fingerprint is in `monitoring/editorial-decisions.json`. Replay `37716374597` verified all canonical records and the useful specials Home notice. Normal run `37716525321` passed complete coverage, closure, exact baseline acceptance/cache save, and the downloaded-artifact supervision gate.

Authenticated desktop/390px browser inspection verified the real list, Ultimate Guard alias lookup, Dragon Shield offers/booth distinction, and private composer. A bookmark survived reload and was restored to unsaved after testing; no shared Activity entry was created. Database owner/cross-companion rollback tests and public asset verification passed. CI exposed an unrelated whole-page navigation-test query timeout; the exact-landmark correction preserves the five-second budget and all history assertions.
