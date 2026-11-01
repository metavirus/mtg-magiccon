# Atlanta merchandise intake — October 31, 2026

Local source/review checkpoint, not canonical promotion or an approved final UI. Kavi requested two lists: Official Show Store and Black Lotus purchasing, sharing normalized products/variants. Existing preparation remains a foundation, not a finished design.

## Source reconciliation

Official page: https://mcatlanta.mtgfestivals.com/en-us/merch.html . Rendered page and its public collection agree on 60 products. The complete collection has 202 variants and 60 product images; product, image and variant pagination all terminate. Untouched public response is research/merchandise/2026-10-31/public-collection-page-0.json.capture; normalized review data beside it retains source hash, observation time, IDs, prices, options and media. The public client token was used only in memory and is not retained. No stock claim was inferred from listing.

The official October 26 email, Information on the Black Lotus Advanced Online Show Store, was re-read in signed-in Gmail. It names eight guaranteed preorder items: Hobbit Collector Booster (6), Star Trek Collector Booster (6), Reality Fracture Collector Booster (6), Secret Lair So Salty Traditional Foil (1), Extra Life 2026 Rise of the Polygons Traditional Foil (1), Extra Life 2026 Rise of the Polygons (1), Festival in a Box Atlanta 2026 (2), and Magic: The Gathering Crocs (1; sizes may be limited).

Six products match the public collection. The two Extra Life editions have no matching entry there. The review dataset therefore has 62 product identities, 202 sourced variants, 202 Show Store variant listings and eight Black Lotus product-level associations. Black Lotus variant eligibility/prices remain unknown. The other 54 public products are NOT silently copied into Black Lotus: the email gives a general preorder promise with limited-print and late-arrival exceptions. Full membership awaits actual Black Lotus store evidence.

Black Lotus shopping opens November 2 at 10 AM PT and closes November 8 at 10 AM PT. One checkout; access is through the official app and the private emailed code. The code and raw email are excluded from tracked artifacts. Preorder pickup begins November 13 at 8:30 AM in the lounge; no post-show shipping. Festival in a Box limit two is per VIP per event across preorder/onsite. Remaining allotment can be purchased at lounge fulfillment until November 14 at 2 PM, not the Show Store. These rules belong to purchasing paths, not shared product identity.

## Existing infrastructure and verified local changes

Global products, product-scoped variants and catalog-specific offers already support shared identity. Prices, availability, limits and owner/offer interests remain separate per catalog. Companion interests and their notes are shared with active companions under existing policy, not private. Purchases/receipts remain separate and must not be inferred from interest or imported listings.

Added local planner guards against duplicate offer keys and conflicting shared product/variant metadata. Focused 38 tests and build passed. Tests include one shared variant across Show Store/Black Lotus with independent price, availability, limits and owner interest. No live database writes.

## Required before production promotion

- Reconcile source IDs with existing canonical identities; source-derived review keys are not proof of matching existing rows.
- Server-side protection must prevent an existing offer key being rebound to another product/variant and silently transferring interests. Current batch-local checks do not solve cross-batch RPC identity mutation.
- Import Lab needs variant/limit support and the import contract needs eligibility/pickup and source option fields carried through. Purpose/reference handling must be explicit.
- Review exact images, retain larger detail views, and verify offline media coverage. Source URL capture alone is not image/offline proof.
- Review Black Lotus actual assortment and prices when accessible; do not promote pending associations as fully priced/available offers.

Map work remains parked. No publication or canonical catalog activation is implied by this intake.

## Local two-list review checkpoint

Review URL: http://127.0.0.1:5205/?previewOwner=kavi&qa=atlanta-merch-review#info . Existing CatalogBrowser and object detail surfaces show 60 Show Store product rows (202 variants grouped) and eight Black Lotus rows, sharing six product identities. This is explicitly local review, not approved UI or published inventory. Black Lotus prices and variant scope remain pending; two Extra Life images are missing.

Root verified the current index-zJme_Hpq.js build at 390px and 320px: Jace search returns three products with images/prices; hoodie detail shows the larger image and all eight sizes; channel tabs remain separate. The 320px document/body widths equal the viewport, with no horizontal page overflow. Review note controls and shopping-interest controls are absent; handlers reject temporary review identities. The note-editor leak found during browser review is covered by a regression guard and reverified in the browser. Six review tests and final build pass, alongside the prior 38 catalog/import tests.

Media remains remotely loaded: offline packaging and in-place image zoom are not complete. No physical-iPhone, live catalog activation, canonical identity reconciliation, or server-side cross-batch identity protection is claimed. Phone evidence: visualization merch-intake/catalog-review-phone.png. Next chunk: finish the production import contract/identity safeguards and media packaging before canonical promotion; await the actual Black Lotus assortment for unsupported membership/prices.

## Independent PM correction review

User rejected inconsistent catalog control sizing. Reused the Info trip-tabs control class for purchasing choices and replaced the prominent internal banner with a collapsed secondary disclosure. Independent PM rejected the first build because long Black Lotus names clipped variant metadata; compact rows now use minimum heights and natural growth while images remain square. PM rechecked rendered build index-DbF3EUZI.js at 390x844 and 1440x1000 and passed the bounded correction, including Hobbit, Star Trek and Extra Life foil rows. Phone/desktop evidence: visualization merch-intake/pm-phone-black-lotus.png and pm-desktop-black-lotus.png. Build, text integrity and secret checks pass. Standing independent visual review is encoded in AGENTS.md and UI_CONTROL_DENSITY_CONTRACT.md. This is local visual acceptance only; all production/offline/source gaps above remain.

## Import safeguards, categories and packaged images

Current local build: index-CG3CSj9O.js. Eight reviewed browse categories now cover all 62 identities; categories are attributed editorial classification in reviewed-categories.json, not fabricated official taxonomy. The untouched collection and its empty category fields remain intact. Both channel views use the shared classification.

Import plan/editor now preserve variant key/label/SKU/options, purchase limit, eligibility and pickup notes; pending identity and blank prices cannot be silently upgraded into valid promotion. Inventory/reference purpose is explicit. Local migration 20261101014944_catalog_import_identity_safeguards.sql adds immutable catalog/offer-key/product/variant identity enforcement and carries the new optional fields through RPC while preserving older omitted fields. It has NOT been applied to hosted Supabase. Isolated PostgreSQL 18 proof executed the schema, migration, UPDATE/UPSERT and real promotion RPC: conflicting identity reassignment fails, rejected batches roll back, interests stay attached, replay is idempotent, optional fields survive and concurrent contenders wait then reject. Fixture auth/storage and superuser execution do not prove hosted RLS. Temporary test server stopped. 24 focused import tests passed.

Media uses the existing magiccon-remote-images-v1 cache. Sixty 320px thumbnails plus sixty detail WebPs (quality 90, max 2000px without upscaling) total 14,983,498 bytes. Exact source originals (182,773,901 bytes) are archived in ignored .codex-local/merchandise/atlanta-2026-originals; source URLs, dimensions and hashes stay in the media manifest. Public pack is bounded under 20 MiB by a regression check. No content reconstruction or background manipulation. Shared products reuse media; both thumbnail and detail URLs hydrate. Integrity checks reject corrupt/HTML/evicted assets and mixed concurrent download races. Two Extra Life image references remain missing. Fifteen focused media/cache/status tests passed; all packaged bytes and hashes verified. Catalog detail reuses the extracted existing exhibitor image viewer; zoom, Fit, close and reset tests passed alongside the existing exhibitor tests. Eleven category/review/viewer tests passed.

Independent PM passed rendered 390x844 and 1440x1000 views of categories, shared typography, long names, image enlargement and Import Lab advanced fields. Evidence is visualization merch-intake/complete-pm-*.jpg. Build, text integrity and secret checks passed. This remains local preview; canonical existing-ID reconciliation, hosted migration/RLS/readback and real catalog promotion are still separate release work. Black Lotus full assortment/prices await source evidence. No personal purchases or attendance changed.

Offline browser proof remains incomplete: CUA browser API exposes no network emulation. One native Chrome attempt opened a new QA tab, then Computer Use stopped because it could not confidently determine the Windows browser URL for policy enforcement. No throttling/network setting was changed; user PDF tab was untouched. A QA-created tab may remain because the tool required stopping. Do not claim cold-offline reload or physical-iPhone acceptance from cache unit/file tests. Next verification is an actual offline reload followed by opening a not-previously-viewed product detail and zoom, then restoring online mode.

## Unified Store direction (supersedes two-list browsing)

Kavi requested one Store surface because the assortments largely overlap. Local build index-4waCewPm.js deduplicates shared products for browsing (62 distinct review products) while preserving separate underlying offers, prices, limits and interests. Show Store presentation wins on a shared identity; two Lotus-only Extra Life items remain visible with pending prices/images. This does not infer full Black Lotus membership or a Black Lotus price from public listings. Confirmed Lotus items expose individual rules through the existing lotus icon; a top-level button summarizes all eight announced preorder limits, one checkout, dates and lounge pickup. No marker does not prove exclusion. Store replaces the Catalogs navigation label. Underlying catalog and variant identities are unchanged; regression test proves the shared model is not mutated and Festival box public price and separate VIP limit remain distinct.

Scroll repair removes page overflow-x:hidden creating a false sticky ancestor and lets category summaries stick below measured responsive toolbar height. The persistent browse-context requirement is now part of UI_CONTROL_DENSITY_CONTRACT.md. Build and Store identity regression pass; no live activation/publication.

Independent PM verified phone390 and desktop1440 scrolling through long Clothing rows, category boundaries, collapsing while scrolled, filtered groups, layout against the Exhibitors peer, and popup readability. Scrolled proof: visualization merch-intake/store-unified-phone.png and store-unified-desktop.png. Initial popup focus finding corrected in index-DbVoPVzn.js: Tab stays within the dialog and closing returns focus to its exact launcher; independent final recheck PASSED on index-DbVoPVzn.js for both top and item launchers, including Tab/ShiftTab and click-close/Escape. No visual blockers remain in this bounded local change.

## Purchase-limit copy correction

The item popup had reused the import-oriented description and appended irrelevant uncertainty. It now renders the purchase-limit field alone, retaining Festival in a Box's event-wide qualification. Top popup contains preorder checkout/quantity restrictions only. Regression rejects unrelated unconfirmed/sizes/pickup copy in the item popup. Global Codex AGENTS.md now requires relevance before completeness, a deletion pass and PM review of scope/words. Research context: https://arxiv.org/abs/2411.07858 reports verbosity compensation associated with uncertainty in studied models; it does not establish the internal cause of this output. The demonstrated local cause was using a broad description in a narrow limit UI.

Store detail copy cleanup: removed the visible internal source/provenance block, generated import summary, review badge, local-review disclosure and redundant unknown/catalog facts. Evidence, approval state and write fences remain internal and unchanged. The prior limit-only copy check failed to audit the entire Store flow; global writing guidance now explicitly requires that sweep on recurrence. Build index-C9ZZSpBN.js. Independent PM is checking whole-flow copy before handoff.

Whole-Store sweep also removed repeated unknown-stock status badges and changed missing-image wording to product images unavailable. Final copy build index-CtPHY2Lb.js; four focused Store/image-status tests pass. Price pending and actual missing images remain visible because they affect browsing; internal evidence is retained outside the user-facing detail.

## Canonical release preparation (November 1 UTC)

Read-only hosted reconciliation at 02:28:12 UTC found zero catalogs, products, variants or offers in canonical project `pavjsexxbueuzhzgemgy`. Retained snapshot: `research/merchandise/2026-10-31/canonical-identity-reconciliation.json`. There are no persisted reference candidates to merge or transfer. Exact source-derived Shopify IDs can therefore introduce 60 products and 202 variants; no fuzzy identity matching is involved.

`scripts/prepare_atlanta_catalog.mjs` verifies the untouched collection hash, product/variant IDs, names, SKU/options, independent money values and exact official image bindings. It verifies every packaged thumbnail/detail hash and invokes the existing promotion planner. It requires an explicit exact-public approval flag and reviewer/time, never upgrades unresolved Black Lotus associations. Deterministic prepared artifacts are under ignored `.codex-local/catalog-release/atlanta-2026`.

Regenerate the reviewed bundle:

```powershell
node scripts/prepare_atlanta_catalog.mjs --approve-exact-public yes --reviewer codex-reviewed-exact-official-source --reviewed-at 2026-11-01T02:28:12.976Z --media-base-url https://metavirus.github.io/mtg-magiccon/ --output .codex-local/catalog-release/atlanta-2026
```

Root release order after readiness/migration review: execute `01-stage-source.sql` on the verified canonical pooler; run `node scripts/upload_atlanta_catalog_artifacts.mjs` (dry run), then `--apply` through the existing server-only `SUPABASE_URL`/`SUPABASE_SECRET_KEY` environment; inspect the two checksum-verified object receipts; execute `03-promote.sql` and retain its exact 202-item receipt. The uploader must run before promotion. It creates a private bucket only when absent, refuses public storage, uses immutable inserts, checks canonical capture bindings and hashes downloaded bytes. It never replaces or deletes an existing object. The dedicated manual `store-source-upload.yml` workflow uses the existing repository server-only Storage secret; no local duplicate credential is required. Root owns publication and dispatch. Do not claim uploaded evidence until Storage readback passes.

The original public response is 119,224 bytes and remains exact JSON; the 2,286-byte Black Lotus artifact is explicitly a redacted reviewed synopsis, not the original email. The pending import migration adds `application/json` only for original evidence and accepts JSON originals only for web/manual-entry captures. Images remain sourced packaged WebPs with independent official-asset provenance. No JSON is disguised as a PDF/image.

The Black Lotus catalog stays unpublished with zero offers. Its append-only source capture retains eight product names/keys, limits/scopes, dates, checkout restriction and pickup rules. Two Extra Life identities remain announcements only. A bounded canonical reader loads that capture independently; `purchaseRulesStatus` distinguishes ready, absent and unavailable evidence. Canonical product media uses local packaged thumbnail/detail URLs only when canonical key and stored official source URL both match the media manifest; provenance remains unchanged.

Validation: 40 focused catalog/import/rules tests passed; deterministic batch regression passed; build passed. Isolated PostgreSQL 18 executed the updated migration, JSON-source RPC positive/negative cases, immutable identity/replay/optional-field regressions, and the exact prepared batch, then rolled back the batch: 202 current offers, 60 products, unknown stock throughout, no Black Lotus offers, eight retained rules. These superuser/fixture checks do not prove hosted RLS or actual Storage uploads. Test server stopped. Root retains live writes, hosted readback/RLS, Store grouping/variant selection, independent visual review and publication.

## Final local verification and publication hold

Build index-8j5rZUo9.js passed the full check:ship gate: 629 tests across 106 files, build, text/secrets and GitHub verifier. Independent PM inspected the entire Store flow/copy at390/1440, including native option selection (hoodieXL exactvariant), search/filter/groupcollapse, sticky group transitions, zoom/Fit/close, item and summary limits. No blockers. Evidence: visualization merch-intake/store-final-*.png.

Chrome offline-origin proof succeeded on isolated5206: after exact server stop and confirmed connection refusal, reload and closed-tab reopen rendered the Store; an unopened detail asset decoded2000x2000, zoom/Fit/filter and Lotus limits worked. Evidence: visualization merch-intake/offline-origin-proof.json and offline-*.png. This proves origin-unreachable cached browsing, not physical-iPhone airplane mode. QAserver restored. Canonical ordinary-user replay remains after import.

Hosted state: safeguard migration20261101014944 applied with matching history in one transaction; readiness and71catalog schema/RLS/grant/RPC assertions passed. Two unpublished catalogs and immutable sourcecapture rows are staged. Zero public catalog products/offers have been promoted; no shopping interests or purchases changed. Storage upload has not run.

Automatic approval review rejected the attempted combined main push and store-source-upload workflow dispatch because it did not find explicit authorization for publication/external hosted writes. The command was rejected before execution: no commit/push/dispatch from that call. Do not work around the rejection. Await explicit user approval to publish the reviewed Store checkpoint and execute the fixed two-artifact upload, then promote the exact reviewed202offer batch and verify ordinary canonical/public/offline readback. Parked map work is excluded from the staged release.
