# Artist signing import plan

Updated: 2026-08-20

This is the artist/card-signing data contract for Kavi's personal signing workflow. The working CSVs are now import evidence only; the canonical app data belongs in the normalized Supabase catalog created by migration `20260820173320_artist_card_canonical_catalog.sql`.

## Source boundary

- `local-assets/artist-card-quarantine/` holds original enriched CSVs as source evidence only.
- `local-assets/artist-card-working/` holds import working files and ignored generated SQL.
- App/database work should treat Supabase as gospel after hydration. Do not point production UI at quarantined CSVs or generated fixture modules as durable truth.
- Card images stay local until an explicit storage/publication decision is made.

## Canonical Supabase catalog

Migration: `supabase/migrations/20260820173320_artist_card_canonical_catalog.sql`

Tables:

- `artist_import_batches`: provenance for a specific import run, including source filenames, row counts, and hashes.
- `artists`: one artist identity/profile row independent of any convention.
- `artist_appearances`: event-specific attendance evidence. For the current POC, Cynthia Sheppard, Mark Poole, and Serena Malyon are confirmed for Atlanta 2026; Rebecca Guay stays unconfirmed/reference-only unless official evidence changes.
- `artist_cards`: one card identity row keyed by Scryfall/card identity.
- `artist_card_printings`: owned candidate printings, quantities, price, treatment, local-image filename, and source URLs.
- `artist_card_assessments`: richer interpretation/taste/style notes from the import pass, kept separate from objective card/printing facts.
- `artist_signing_interests`: per-user signing decisions (`not_reviewed`, `maybe`, `want_signed`, `skip`) with owner-scoped RLS. The UI labels these as Maybe and For sure/Sign.

Security shape:

- RLS is enabled and forced on every catalog table.
- Anonymous access has no grants.
- Authenticated users can read the shared artist/card catalog.
- Signing interests are owner-writable and owner-readable by policy.

Current catalog hydration:

- 1,122 artists
- 4 appearances
- 5,068 unique card identities
- 5,451 owned candidate printings
- 5,451 assessment rows

The React Artists surface now attempts to read from the canonical Supabase catalog first. The generated TypeScript bridge remains only as a local/offline fallback for unauthenticated preview or catalog-read failure; it is not app truth.

## Current local outputs

The normalizer writes:

- `artist_profiles.normalized.csv`
- `artist_card_candidates.normalized.csv`
- `artist_signing_targets.seed.csv`
- `priority_review.csv`
- `missing_image_requests.original_format.csv`
- `import_summary.json`

The missing-image request file intentionally preserves the original card CSV column shape so it can be handed back to ChatGPT or another image processor without translation.

## Superseded staging shape

The shapes below describe the earlier local CSV staging vocabulary. They are useful history, but they are no longer the canonical database model.

### `artist_profiles`

Canonical artist row, independent of any one event.

Expected fields:

- `id`
- `artist_name`
- `attending_status`: `unknown`, `confirmed`, `not_attending`
- `collection_card_count`
- `unique_collection_printings`
- `predominant_style`
- `abstract_surreal_tendency`
- `style_confidence`
- `style_description`
- `representative_abstract_surreal_cards`
- `historical_style_signals`
- `sample_mtg_cards`
- `source_status`
- `created_at`
- `updated_at`

### `artist_card_candidates`

Kavi's personal candidate pool for cards that might be worth bringing for signatures.

Expected fields:

- `id`
- `artist_id`
- `card_name`
- `set_code`
- `set_name`
- `collector_number`
- `foil`
- `rarity`
- `quantity`
- `scryfall_id`
- `printing_type`
- `special_treatment`
- `card_style_category`
- `visual_style_category`
- `taste_match`
- `abstract_surreal_focus`
- `style_notes`
- `card_art_basis`
- `card_art_tags`
- `card_image_url`
- `art_crop_url`
- `local_image_filename`
- `local_image_count`
- `local_image_found`
- `review_rank`
- `bring_status`: `not_reviewed`, `maybe`, `bring`, `leave`
- `bring_reason`
- `created_at`
- `updated_at`

### `artist_signing_targets`

Small app-facing planning layer.

Expected fields:

- `id`
- `artist_id`
- `owner_id`
- `attending_status`
- `interest_status`: `not_reviewed`, `maybe`, `want_signed`, `skip`
- `target_cards_count`
- `top_card_names`
- `interest_reason`
- `signing_notes`
- `created_at`
- `updated_at`

For MVP, this is primarily Kavi's personal card-signing layer. Other companions can still mark an artist as interesting later without seeing Kavi's full card corpus.

### Optional later: `artist_card_images`

Use only if the app needs multiple image sizes or Supabase Storage paths.

Expected fields:

- `id`
- `candidate_id`
- `image_role`: `thumb`, `card`, `full`, `crop`
- `storage_path`
- `local_source_path`
- `width`
- `height`
- `bytes`
- `created_at`

## MVP UI implications

- Confirmed Atlanta artists are visible to everyone.
- Anyone can mark an artist as interesting.
- Kavi's private candidate card matching can stay owner-specific.
- Artist rows and card rails should be mobile-first with horizontal scrolling where useful.
- Do not expose or publish the giant local corpus until deliberately wired and reviewed.

## Validation

Run:

```powershell
pnpm validate:artist-import
pnpm artist:seed-sql
pnpm validate:artist-catalog-db
```

`validate:artist-import` checks the remaining local import working files. `artist:seed-sql` regenerates the ignored Supabase seed SQL from the current source files. `validate:artist-catalog-db` proves the canonical hosted catalog has forced RLS, no anonymous grants, policies, and non-empty hydrated tables.
