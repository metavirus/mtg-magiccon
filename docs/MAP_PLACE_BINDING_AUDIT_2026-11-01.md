# Map place associations — local checkpoint, November 1, 2026

Local-only study. No commit, push, deployment, database query/write, source fetch, model call or private static export.

## Implemented coverage

| Surface | Bound coverage | Identity/evidence |
| --- | --- | --- |
| Convention programs | 88/88 sessions | Maintained conventionPrograms.json session ID + exact location label |
| Mana Stage | 9 sessions | Level 3 Georgia Ballroom |
| C101 Showcase / C102 Spindown | 9 / 11 sessions | Exact named source room |
| Family Magic | 19 sessions | Named activity; never Family Spark lounge |
| Meet & Greets / Gathering Grounds | 19 / 21 sessions | Named activity IDs |
| Black Lotus lounge | 8/25 BL sessions | Explicit source IDs already naming lounge; 17 remain unplaced |
| Show Store | 60 grouped products | Normalized Atlanta show-store list membership/product keys |
| BL purchasing/pickup | 8 grouped products | Named announced preorder items; lounge pickup, never generic Show Store membership |
| Artist official profiles | 65/66 directory artists | One exact maintained canonical/source name, then frozen source ID + map place ID; seven unplaced artists remain unpinned |
| Vendor official profiles | 29/46 named map vendors | One exact accepted exhibitor name, frozen source ID + map place ID |
| Vendor promotions | 37 source offers | Existing exact vendor IDs; title/price only, no inferred schedule |

Public payload is a 121139-byte finite local source projection. Its 68 product/location rows represent purchasing channels, not 68 distinct physical products; 66 rows reuse packaged thumbnail assets. It is not canonical inventory or stock proof. The main app's opt-in host also projects its already-loaded current Atlanta CatalogReadModel using offer_id/product_id/family, grouping variants and omitting interests, notes, owner IDs and purchase state. Unknown/mixed variant prices use From or no price; mixed limits are omitted. No extra production read is added. Paid/committed events are current-owner-only, in-memory, exact frame/origin-checked; public schedules deduplicate by event ID against those rows.

## Deliberate gaps and next evidence needed

- 17 map vendors have no unique exact source-name match: gamesgenic, beadle-grimms, trading-cart, galactus-roma, daria, cool-stuff, face-to-face, frost-giant, mana-vault, mages-sanctum, toamagic, foam-brain, manamart, mythic-goblin, yakata, nerd-gear-pink-bunny, manatrust. Legal suffixes/spellings and combined footprints are not silently resolved. The accepted checkpoint has 66 exhibitors; a future explicit reviewed source-ID crosswalk must resolve these, including the two Galactus records and combined Nerd Gear/Pink Bunny footprint. No fuzzy matching runs in the browser.
- Tran Nguyen is absent from the maintained 65-entry reviewed official artist roster; a reviewed official artist source ID/profile is required. The map's existing name is preserved. Private signing workbench, cards, priorities and notes are never included in these public profile projections.
- Generic ticketed-play events have no verified upper/extension/on-demand footprint assignment. Existing ticketed identities remain accessible in personal Events with Location not assigned; exact named subarea evidence is required before pinning. Seventeen BL sessions likewise lack a sufficiently explicit lounge assignment; general Thursday/program/logistics context does not assign every event.
- Level 4 ticketed-merch pickup has no normalized product membership list. No Show Store or BL products are assigned there. Prize Wall can consume exact current canonical family offers through the host; historical infoCatalog Chicago/Amsterdam precedent rows are deliberately excluded from Atlanta stock.
- Exhibitor promotions link to their official profile and retain source IDs. Unscheduled vendor activities are not fabricated as timed events. Neither aliases from a stale source-name hash nor title similarity establishes a booth binding.
- Authenticated real owner host flow is still unverified. Unit tests/sample screens do not prove the signed-in browser path or physical iPhone behavior.

## Drawer and event interaction

Initial canvas has no drawer. Place selection opens it; Close, blank-map tap, Escape and starting a drag hide it, clear selection and reclaim space. Search and explicit Events/Levels/browse tabs open useful results; typing or drawer interaction does not dismiss it. Resize retains camera intent, dense destination policy and accepted Marketplace tiles. Sticky Close stays reachable. Public/personal activation shares activateEvent/eventDetail and focuses the detail instead of appending it below a long list; Back to place restores lists. Personal unplaced events remain reachable through Your events.

## Verification and limitations

- Standalone study and canonical build guards pass 157 destinations × 7 inputs × 3 camera contexts (3297 cases), plus dismissal, public/personal event detail, source/geometry, unplaced and cache-hash checks.
- Seven focused projection/frame tests pass, including non-owner message exclusion, private-field omission, variant price/currency/limit uncertainty.
- pnpm build passes; existing Vite large-chunk advisory remains.
- Independent PM ACCEPT after actual phone/desktop recheck, including sticky Close, all four dismissal paths, public/sample details/back, Store thumbnails, gold profile links and accepted Market grid. Evidence: study evidence/pm-place-review.md and referenced screenshots.
- A scratch string-replacement insertion interpreted literal dollar-apostrophe as JavaScript's suffix substitution, duplicating runtime source and corrupting the TS adapter. Local checks caught it; no public deployment/data affected. Automatic approval review rejected recovery until durable prevention existed. Recovery used an isolated parsed candidate that passed the exhaustive guard, followed by atomic adoption. Canonical public builder now parses/uniqueness-checks runtime before writing; build guard regresses the exact TS dollar-suffix failure. Unsafe scratch mutators were retired as inert text. Final original checks and new prevention pass.

## Reproduction and scope

- Public-only study: http://127.0.0.1:5210/
- Explicit sample mode: http://127.0.0.1:5210/?sampleEvents=1
- Personal host opt-in: existing app origin /?mapStudy=personal (not live-account verified).
- Rebuild public projection: node scripts/build_map_place_content.cjs [optional study directory]. Sources are maintained JSON only; source screenshots/geometry remain unchanged.
- Final study app c0a03bd7e32f; public app be488a59a54a; CSS 1a5a0040e2c9.
- App.before-personal-study.tsx.txt retains the unrelated dirty App baseline; personal-study-App.patch isolates the import + opt-in host (now passing existing catalog). Root owns exact integration/publication.
