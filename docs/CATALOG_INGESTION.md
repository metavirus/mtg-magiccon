# Catalog ingestion

Status: historical photo proof, fail-closed promotion planner, Kavi-only local operator UI, atomic promotion RPC/client boundary, canonical read path, shopping-interest path, and companion browse UI implemented locally; migration review/apply and live readback remain pending

## Product boundary

Info owns three source-backed inventory families: Show Store, Black Lotus Store, and Prize Wall. Catalogs stays hidden in the ordinary Atlanta experience until at least one reviewed Atlanta catalog and offer are published. Explore continues to own events; Wallet continues to own purchases, receipts, Prize Tix balances, and proof.

Kavi is the catalog operator. Companions can browse the shared catalog and see one another's shopping interests, while each companion controls only their own interest state. Monitoring may discover that a catalog or replacement PDF exists, but discovery never creates canonical products or availability without the operator review gate.

Catalog records have one of two purposes. `inventory` is event-bound and is the only purpose that may publish into the companion read model. `reference` retains historical products, variants, evidence, and reviewed presentation media for later candidate matching; it is structurally non-publishable and never proves that an item is offered at the current event. The Atlanta 2025 photo intake and Las Vegas 2026 QA catalog are reference material/placeholders, not a seed catalog for Atlanta 2026.

## First catalog release runbook

When the first Atlanta catalog appears:

1. Preserve the untouched first-party artifact or page response, source URL, retrieval time, SHA-256, and event identity as a new `inventory` source capture.
2. Diff extracted item identities against the retained reference library only to propose product/variant candidates. A prior match may reuse a canonical product and reviewed image; it may not inherit price, availability, purchase limits, exclusivity, or event identity.
3. Create event-specific offers and reviewed offer observations from the new source. Unclear identities stay pending; missing images do not block retaining offer evidence, but they do block companion publication.
4. Select an exact-product or exact-variant presentation image with its own provenance. Reused historical media remains attributable to its original source capture.
5. Record an explicit availability observation. A catalog listing defaults to `unknown` unless the source proves a stronger state.
6. Promote one complete reviewed batch atomically, verify the exact RPC receipt and `catalog_current_offers` readback, then expose Catalogs. Reference catalogs are rejected by the promotion RPC and excluded again by the read view as defense in depth.

The release path is additive: a corrected catalog or later onsite observation appends evidence and observations. It never mutates an old source capture or treats a historical placeholder as current inventory.

## Canonical chain

```text
Source capture
  -> immutable original artifact + SHA-256
  -> deterministic page correction and crops
  -> reviewed extraction observation
  -> canonical product / variant / offer
  -> append-only availability observation
  -> current catalog read model
  -> per-person Interested shopping list
```

Names, prices, Prize Tix costs, purchase limits, availability, and images have independent provenance. A new PDF or onsite scan appends evidence and observations; it does not overwrite prior evidence. `sold_out` is a first-class availability state, with the observation time and event-local day retained so a new day's Prize Wall can start from new evidence rather than quietly rewriting yesterday.

Prize Wall is a redemption catalog, not a store: every published Prize Wall offer must have a Prize Tix cost and must not carry a money price. The import planner and promotion RPC reject cash-valued Prize Wall entries, and browse/detail surfaces always render the full `Prize Tix` unit rather than an ambiguous abbreviation. If a source does not establish the cost, the item remains `Prize Tix pending` and cannot publish.

The same physical product may appear in more than one catalog family. Model that as one canonical product/variant with separate event offers—for example, a Play Booster may have a USD Show Store offer and a Prize Tix Prize Wall offer at the same time. Each offer keeps its own source observation, value, availability, purchase limit, sort position, and shopping interest. Shared identity and reviewed product media may be reused; offer facts never bleed across acquisition paths, and both entries remain visible in their respective family views.

## Photo intake

The initial proof uses the historical MagicCon Atlanta 2025 Accessories board. It is explicitly QA evidence, never 2026 Atlanta inventory.

```powershell
pnpm catalog:photo-intake -- --manifest scripts\fixtures\catalog-atlanta-2025-accessories.json `
  --source "D:\path\to\accessories-board.webp" `
  --output .codex-local\catalog-intake\atlanta-2025-accessories
```

The command creates, under the ignored `.codex-local` directory:

- an untouched copy of the supplied source;
- a perspective-corrected board;
- an evidence crop, midsize card image, and thumbnail for each item;
- SHA-256 hashes and exact normalized crop coordinates;
- a contact sheet and `review-manifest.json` whose status is always `needs_review`.

The tool never approves or uploads its own output. `pnpm catalog:photo-test` proves identical inputs produce identical derivatives and preserves the review gate.

## Image policy

Use the best faithful image that can be verified:

1. Prefer a first-party product asset tied to the exact product or exact variant.
2. Otherwise use a clean crop from the captured catalog, PDF, or onsite board.
3. If the board crop is weak and the identity is distinctive—for example, a fully named Secret Lair drop—an exact-match official or manufacturer product image may be used.
4. Never use a merely similar item, a different variant, a synthetic reconstruction, or generative cleanup as the canonical product image.

Online discovery is currently operator-assisted. The implemented UI and intake gate do not imply that automated fuzzy search is comprehensive: observed passes missed easy exact products even when the full maker and product name were available. Search results are candidates only. A future retrieval lane must be benchmarked for exact-name, maker/product decomposition, typo/alias expansion, visual motifs, first-party domain ranking, and adjacent merchandise pages before it may claim useful recall or automatically decide that no exact image exists.

The onsite capture still proves that the item was offered, its displayed price or Prize Tix cost, and its observed availability. A separately sourced product image is presentation media with its own provider, URL, retrieval record, match status, and reviewer. Replacing a presentation image never replaces the offer evidence.

### Derivatives and background removal

Background removal is a presentation transform, never identity evidence. During intake, a deterministic flat-background matte runs automatically when the image corners agree closely enough to prove a simple light background; the derivative records the source hash, transform method/version, removed-pixel ratio, and output hash. Product presentation derivatives are square, retain a real alpha channel, and render over the app's one consistent square thumbnail canvas rather than stretching across variable-height copy/actions or carrying white or gray letterbox bars. The fixture validator and catalog preview test reject missing, non-square, or removable opaque-matte presentation assets; the UI's compact layout independently preserves a square image surface. Complex board photos and lifestyle images do not get guessed foreground masks. They remain evidence-only until Kavi selects an exact online image or explicitly sends the candidate through a heavier reviewed cleanup lane. A `thumbnail_only` board crop without a verified exact-product source routes to `search_required` by default; the Import Lab must not display a padded or reformatted weak crop as though it were a presentation candidate.

Any cleanup that creates halos, streaks, damaged edges, or invented transparency fails visual review and is demoted back to evidence/search-required status. A first-party file is not automatically a usable presentation image when its delivered alpha channel is visibly corrupted.

Do not make the companion-facing PWA download or execute a large segmentation model. The normal path is operator-side processing during import, with an optional local or cloud fallback for difficult exact-match images. Every result still passes visual review before it can become presentation media.

### Identity questions

The operator is asked only when an image-to-product binding is genuinely ambiguous: a cross-event source, a shortened or changed name, an unclear variant, or conflicting identity cues. Obvious exact matches may be approved as a batch.

Each question is a compact comparison object:

- the original catalog/board evidence remains visible and labeled;
- the proposed clean image is larger and visually dominant;
- exact matching and conflicting cues are stated in plain language, including event and price differences;
- the decisions are `Not the same item` and `Use this image`;
- there is no confidence percentage or unlabeled AI judgment.

When research yields multiple plausible or provenance-limited images, the Import Lab presents a compact, unselected option set with source labels and exact caveats. Kavi chooses a candidate before it replaces the empty presentation panel; no uncertain result is silently selected.

The decision binds presentation media only. It does not assert Atlanta availability, price, or inventory unless those facts are independently supported by the reviewed Atlanta source.

Automated image recognition is intentionally outside the pre-release catalog path. It is parked for an onsite experiment, where camera input and physical merchandise make recognition useful. Before the event, import uses source text, exact identifiers, operator-assisted retrieval, and explicit review; the system must not delay a catalog release waiting for recognition.

## Operator review

Before promotion, Kavi reviews each selected item for:

- exact product and variant identity;
- transcription of price, Prize Tix cost, limits, and labels;
- crop quality and whether a better exact-match presentation image is warranted;
- catalog family and grouping;
- availability and the time/day it was observed;
- source attribution and media rights note.

Only an approved extraction may appear in the current catalog read model. Rejected or ambiguous items remain retained evidence and do not become inventory.

## Onsite operating shape

The most recently selected complete intake is retained in on-device browser storage and restored automatically after reloads or local URL changes. It is not bundled into the public app or uploaded to Supabase.

The Import Lab is Kavi-only and mobile-first. Its local first pass can load either a schema-version 1 review manifest or the complete processed intake folder. Folder loading binds the manifest's relative evidence/card/thumbnail paths to browser-local object URLs without changing the manifest or uploading the files. One review item is expanded at a time; resolving it advances to the next pending item. Each editor compares the source evidence against the selected presentation image before exposing product/category/value/availability/media corrections and the approve/reject/needs-review disposition. The promotion boundary recomputes live and exposes exact blockers. A ready non-fixture batch exposes a deliberate two-step promotion action only to an authenticated Kavi session; success is reported only after the atomic RPC returns an exact receipt and the canonical catalog read model refreshes. Re-scanning a Prize Wall PDF or board will eventually append a new batch and highlight changes, especially new `sold_out`, restocked, and new-day states. Uploads will use a private Supabase Storage bucket with content-addressed immutable paths; large or unreliable mobile uploads will use resumable TUS.

The companion-facing catalog reuses Explore's interaction vocabulary: sticky search with typeahead, compact dropdown filters, collapsible groups, and small/midsize density. Interested products form a shopping-list view and show companion bubbles without weakening sold-out or purchase status.

## Implemented local companion surface

The local Catalogs surface reads only the reviewed `catalog_current_offers` projection and fails closed when that projection or its presentation media is unavailable. It does not fall back to fixtures in the production path. External exact-product media is passed through; private Storage objects resolve through short-lived signed URLs. Interest changes are explicit upserts with exact owner/offer readback before the UI treats them as saved.

The ordinary Info page hides Catalogs until at least one current reviewed offer exists. The deterministic `qa=catalog-browser` route supplies 17 clearly labeled products and exact published prices from the official MagicCon Las Vegas 2026 catalog only for UI proof. Eleven categories exercise realistic grouping and list length. Every presentation image is a local verified copy so visual proof does not depend on a third-party hot-link, while the exact first-party image URL remains attached as provenance. Availability stays `unknown` because the source proves listing and price, not live stock. Compact mode is a horizontal square-thumbnail row; comfortable mode is a larger image-led tile. Both preserve availability, price or Prize Tix cost, shared interest bubbles, and a reachable personal interest action.

Verified locally on 2026-08-29:

- build and 21 focused catalog/offline-continuity tests pass;
- the deterministic photo-intake contract passes;
- 390x1600 mobile and 1365x900 desktop captures pass with rendered product images;
- search, Sold out filtering, compact/comfortable switching, group collapse, and local shopping-list changes work;
- no Supabase migration, Storage upload, canonical promotion, commit, or publish occurred in this checkpoint.

Historical placeholder retention at this checkpoint:

- Atlanta 2025 item identities and crop instructions remain in `scripts/fixtures/catalog-atlanta-2025-accessories.json`; the generated original/crops remain in the ignored `.codex-local/catalog-intake/atlanta-2025-accessories` evidence workspace.
- Las Vegas 2026 exact-product QA entries and locally packaged derivatives remain under `src/lib/catalogPreview.ts` and `public/catalog-qa/`.
- Neither set is loaded by the production catalog read path. If imported later, it must use `purpose = 'reference'`.

## Implemented Import Lab domain gate

`src/lib/catalogImport.ts` is the local boundary between a photo-intake review manifest and any future canonical writer. It never writes Supabase. `src/CatalogImportLab.tsx` exercises that boundary in a Kavi-only Info view without treating browser identity as server authorization. A batch produces a deterministic promotion plan only when:

- catalog and source-capture identities are exact and the source artifact retains its SHA-256;
- every source item has exactly one terminal approve or reject decision;
- approved items bind an exact product or variant, stable keys, category, and the value required by that offer's family: Prize Tix for Prize Wall, or the independently observed store value for a store offer;
- presentation media has a reviewed exact-product/exact-variant match and acceptable quality, with independent provenance for external replacements;
- availability, observation instant, and event-local day are explicit, including `sold_out` and zero quantity;
- fixture-only, pending, ambiguous, incomplete, duplicated, or unknown items fail closed.

Rejected items remain in retained review history and are excluded from promotion. The ready result is sorted and transaction-shaped. `public.promote_catalog_batch(jsonb)` is implemented locally as a roster-bound, atomic, idempotent RPC: fixture, pending, malformed, or incomplete plans fail closed; offers remain unpublished until matching approved evidence and exact presentation media exist; same-batch replay returns the stored receipt while changed input under the same key fails. The client accepts only the exact `{status,batch_key,catalog_id,source_capture_id,promotions,promoted_count,retained_review_count}` readback, refreshes the canonical catalog projection, and only then reports success. Focused planner/client coverage currently passes 16 cases, with 30 catalog-domain tests passing overall. The local operator UI, Kavi/companion visibility proof, phone/desktop viewport proof, and fixture-only fail-closed interaction proof pass. The migration has not been applied and no live canonical write has occurred; SQL runtime proof remains required in the authorized migration lane.

### Stable local intake loading

Normal local development reads the current ignored intake directly from `.codex-local/catalog-intake/atlanta-2025-accessories/processed` through the dev-only `/__local_catalog_intake/` route. The Import Lab loads `review-manifest.json` and its media automatically on startup; a reload or a different browser context must show the same complete batch. IndexedDB is only a fallback for an explicitly chosen alternate folder, never the primary source for the maintained local intake. Do not validate the maintained batch by seeding browser storage or moving to another port: browser storage is origin-specific and makes a healthy batch appear to reset. The local route is available only while serving the Vite development app and is not bundled into production assets.
