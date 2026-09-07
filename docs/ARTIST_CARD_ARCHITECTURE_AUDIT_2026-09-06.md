# Artist/card architecture audit

Date: 2026-09-06. Read-only application/schema/import audit. No live database reads or writes, ingestion, signing-state changes, or publication.

## Judgment

Keep the current directory and card browser. Correct the identity, import, and continuity boundaries before adding signing features. The current separation of artists, appearances, cards, printings, assessments, and signing interests is a useful foundation, but several consumers collapse distinctions the schema attempts to preserve.

The authenticated local UI currently shows three confirmed artists and one explicit watchlist artist, 29 card candidates, and five saved signing choices. Artist portraits, card images, artist-to-card navigation, and the selected-only filter work in the inspected session. This is not proof of live RLS or complete offline media coverage.

## First correction batch: protect choices and inventory

Local implementation checkpoint: this batch is implemented, not published. The card mapper retains every printing (authenticated local count increased from 29 to 32, with five existing signing picks retained). Real-account signing is disabled when writes are unavailable, validates canonical IDs before any change, and commits state/cache only after successful persistence; a synchronous pending guard serializes changes. Explicit preview interaction remains local-only. The seed builder aggregates each snapshot before generating absolute quantity upserts: 5,562 input rows, 5,451 identities, 105 duplicate groups, and all 6,307 copies retained. No generated seed was uploaded or applied, so hosted quantities are not repaired yet. Four importer regressions and three identity/offline/rejected-save regressions pass, along with the production build and local desktop/mobile viewport checks. Live successful-write and physical iPhone tests were not performed.

1. **Offline signing can appear saved without a server write.** `src/App.tsx:6108` updates state and the owner cache before checking `canWrite` at 6124. The detail buttons at 6380/6383 are not disabled offline. Missing canonical IDs also return after the optimistic/cache mutation. Move authorization/network/identity validation before mutation; disable real-account actions offline, retain interactive QA only for explicit preview, and test that denied/failed changes leave the canonical snapshot unchanged. Rapid repeated saves also need a pending guard or ordered persistence.

2. **One physical variant disappears according to price.** `src/App.tsx:2692` sorts printings by price and 2696 deduplicates by card ID, while signing choices use printing ID at 6021. Foil/nonfoil rows can therefore disappear, and a price refresh can change which saved printing is visible. Preserve every owned printing/finish in the model. Group by card/artwork visually, but never use market price to choose identity. Existing picks must survive refresh unchanged.

3. **Repeated inventory rows lose copies during import.** The delegated read-only audit found 105 duplicate printing-identity groups in the current CSV. Stormwing Entity M21 #73 normal appears twice with quantity 1. The seed key at `scripts/build_artist_card_catalog_seed_sql.mjs:112` collapses these rows, but the conflict update at 248 replaces quantity instead of aggregating it. Normalize totals before writing and make reruns idempotent: importing the same snapshot twice must not double quantity. The normalizer's suffixed duplicate IDs do not guard this SQL collapse.

Acceptance: foil and nonfoil independently selectable; price changes preserve picks; duplicate source rows sum correctly; repeat import leaves totals unchanged; offline/denied saves change neither cached nor persisted signing state.

## Second correction batch: trustworthy refresh and event scope

Local September 6 checkpoint for findings 4–5: completed. Catalog requests now coalesce only while in flight, are owner/convention keyed, and release on success or failure. Appearance reads filter Atlanta on the server and in the projection; an empty event catalog remains empty. The Artists surface reloads when write/connectivity eligibility changes and exposes Refresh artists; the summary derives confirmed names from loaded data. Routine card import no longer emits attendance SQL or injects historical attendance artists. Five refresh regressions and six importer regressions pass; production build and local desktop/mobile inspection passed. No live attendance or inventory writes and nothing published. Finding 6, asset completeness/fallback labeling, remains open.

4. **Catalog refresh is permanently memoized and not convention-scoped.** `src/App.tsx:2750–2787` retains a fulfilled module-level request until an error; reconnect and remount reuse it. All appearances are loaded, then mapped only by artist ID, with no Atlanta convention filter. A second convention can replace the displayed attendance for an artist. Use a convention-scoped read model and an in-flight-only request cache with explicit refresh invalidation; preserve a known-good offline snapshot when refresh fails.

5. **Routine card import can overwrite attendance.** `scripts/build_artist_card_catalog_seed_sql.mjs:14,191,196` hardcodes the original three confirmed artists plus Rebecca Guay, writes “All days,” and overwrites existing attendance/source notes. Card/inventory refresh must not rewrite independently reviewed appearance evidence. Separate the bootstrap from attendance maintenance.

6. **Offline asset completeness is not surfaced for this lane.** `src/lib/deviceAssets.ts` returns expected/cached/failure counts, but artist hydration at `src/App.tsx:1188` and 5942 discards the result. Catalog load failure can silently fall back to bundled seeds (5909–5963), while its source/error state is not visibly rendered. Give the artist pack a completion/error indicator and label stale/offline/fallback content honestly. Do not narrow the pack to selected cards or claim a portrait loading proves the whole card pack is ready.

Acceptance: a successful refresh receives new appearances; another convention cannot contaminate Atlanta; card reimport leaves attendance unchanged; failed media remains visibly incomplete and retryable; source failure does not silently present fixture cards as current truth.

## Data model boundaries to settle before expansion

Local asset-completeness checkpoint (finding 6): Artists now labels reference versus saved-device versus server data, reports expected/cached artist-card URLs, detects missing references and incomplete downloads, and offers retry. Offline inspection checks actual cache entries rather than trusting a stored count. The authenticated local page reports 62/62 URLs saved; desktop/mobile inspected. Tests cover retry, missing references, and eviction; production build passed. This does not certify physical iPhone cold-offline behavior, QR/image decode fidelity, or every asset elsewhere in the app. Background hydration remains in place even before Artists is opened; the on-surface check now consumes and displays completeness rather than discarding it.

### Ownership/provenance implementation plan (reviewed, not applied)

- Preserve existing artist/card/printing UUIDs and all signing choices. Keep identities and appearance evidence shared.
- Add owner-scoped inventory rows keyed by owner and printing, containing quantity and local image metadata. Move collection-specific artist counts out of shared profiles. Initially allow owner reads and privileged imports; do not invent browser inventory editing.
- Owner-scope existing assessment rows and private import manifests. Source CSV paths and personal taste text do not belong in the shared read model. Review any personal appearance priority text separately from public attendance evidence.
- Attach source batch and original parsed-record ordinals to imported inventory/assessments. Aggregated quantities must retain all contributing ordinals. Separate source observation, assessment, import, and price times; do not fabricate historical timestamps.
- Remove real personal quantities/taste from the statically imported `src/data/artistCardCandidates.ts` production fallback. Hidden tabs and database RLS cannot protect data already shipped in the JavaScript bundle. Use synthetic preview data and deliberately version legacy caches at the privacy checkpoint.
- Before applying: canonical-project readiness, live columns/grants/policies and Kavi UUID readback, source-to-hosted snapshot match, signing-ID and quantity baselines. Then additive backfill, app/importer cutover, and removal of shared private fields; verify another authenticated user retains directory access without Kavi holdings, assessments, manifests, or signing picks. Do not claim privacy from policy counts alone.

No live schema, policy, source-data ownership, or hosted quantity repair was performed during this design review.

7. **Owned inventory and personal assessment are mixed into shared catalog rows.** The checked-in migration `20260820173320_artist_card_canonical_catalog.sql:71,200,207,214` has global printing quantity and authenticated-readable cards/assessments. The delegated migration search found no later override. This is a repository-level policy gap, not a verified claim about current hosted grants. Verify live policy before remediation. Keep artist identity, event attendance, and public printing metadata shared; put Kavi's holdings, quantities, taste judgments, and signing plan behind the intended owner boundary. Do not infer privacy from the Cards tab being hidden for other people.

8. **Import provenance does not attach to individual facts.** Import batches store hashes, but imported rows do not reference their source batch/row. Assessment upserts at `scripts/build_artist_card_catalog_seed_sql.mjs:277` replace content without refreshing `assessed_at`. Add batch/row provenance and distinct source-observed, assessed, and imported timestamps. Avoid an elaborate history subsystem until a real comparison/reversion need exists.

Target relationships:

- Artist identity → convention-specific appearance/evidence.
- Card/artwork → exact printing and finish.
- Owner inventory → printing/finish and quantity.
- Owner signing choice → owned variant, optionally convention; never a price-selected representative.
- Assessment → explicit subject and source, distinct from objective identity/attendance.

Later product work: a bring checklist and signed/completed status may be useful, but require a separate product decision. Current “for sure” means intent, not completed signing; avoid UI labels that call it “signed.”

## Documentation and validation debt

`docs/ARTIST_SIGNING_IMPORT_PLAN.md` still describes local-only images and fallback behavior as current, alongside old hydration counts. Update it with the implemented boundaries after corrections rather than certifying those statements now. Existing validators count rows/IDs/policies but lack the identity, duplicate-quantity, refresh-preservation, and offline-write regressions above.

No physical iPhone/offline run, cross-account authorization test, or fresh live schema readback was performed in this audit. Those belong to the relevant implementation batch, not a claim that all eight issues have already been fixed.
