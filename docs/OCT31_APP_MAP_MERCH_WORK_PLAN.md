# October 31 app, map and merchandise work plan

Kavi requested bounded chunks and selective subagents after supplying 14 official-app map screenshots. This is an execution plan, not completion evidence. `CURRENT_FRONTIER.md` remains the status authority. Source findings are in `OFFICIAL_APP_INSPECTION_2026-10-31.md`.

## Order and boundaries

| Chunk | Bounded output | Completion gate |
| --- | --- | --- |
| 0. Finish current monitoring repair | Exact retained incident closed; published schedule and announcements verified | Normal cloud receipt accepted, complete coverage, all four terminal steps, downloaded supervision gate and recorded receipt. Green holds do not count. |
| 1. Capture and reconcile evidence | Screenshot ledger split into overview/levels, artists and marketplace; finite dynamic merchandise manifest | Every fact has a source locator; uncertain names/codes explicitly unresolved; stable identities preserved. Screenshot observations do not become authoritative coordinates. |
| 2A. Obtain original map | Original official artifact, URL, dimensions, hash, edition/revision proof | Atlanta 2026 and orientation established; map runbook source gate satisfied. No substitute invented map. |
| 2B. Ingest merchandise independently | Reviewed diff into existing Show Store catalog, with prices, product/variant IDs, images and access notes | Idempotent dry run, canonical identity proof before writes, bounded exact readback. Listed price is not stock or purchase evidence. |
| 3. Map major destinations | One candidate revision with venue/floors, entrances, major areas and ordinary Show Store destination | Reviewed containment and source coverage; `validate:map-data`; unresolved locations remain unpinned. |
| 4. Map dense areas, one at a time | Art of Magic table bindings, then Marketplace booth bindings | Per-zone reviewed/excluded/unresolved ledger; stable canonical identities; visually checked against original. Shared booths do not merge exhibitors. |
| 5. Wire existing surfaces | Accepted map design consumes reviewed data; existing catalog details show clickable zoomable product images | Desktop and phone-width visual/interaction checks, search and return-context proof. No replacement viewer or store canvas. |
| 6. Offline and coherent release | Complete compatible map/catalog/media bundle and focused public checkpoint | Cold offline reopening and larger-image viewing, atomic update/failure tests, exact deploy/readback. Physical-iPhone proof remains separate until exercised. |
| 7. Monitor content, not just landing pages | Dynamic merchandise coverage and durable official-app inspection checkpoint | Complete pagination/identity tests; meaningful add/remove/price/image changes; partial reads cannot look like deletions. Existing daily cloud cadence only. |

Merchandise capture/ingestion can proceed while original-map acquisition is blocked. Do not let the map dependency hold useful catalog work hostage. Dynamic monitoring should share the reviewed merchandise manifest/adapter rather than independently rediscovering the same collection.

## Reuse rather than rebuild

- Map: preserved `show-floor-schematic.html` named in `MAP_PROTOTYPE_REHEARSAL.md`, existing pan/zoom/session restoration, package builder/verifier and `docs/map-data` schemas. Historical venue structure is not evidence of current event placement. Bump session revision when real identities replace rehearsal data.
- Catalog: `src/lib/catalog.ts`, `catalogImport.ts`, `catalogPromotion.ts`, `src/CatalogBrowser.tsx` and existing catalog surfaces. Show Store products belong in that catalog, not as fabricated exhibitor offers.
- Images: `src/components/ExhibitorMaterials.tsx` already provides thumbnail-to-modal zoom/Fit/scroll behavior. Reuse it; retain larger-image URLs explicitly where distinct. `src/lib/deviceAssets.ts` and the matching service-worker cache own media warming/auditing.
- Identity: reviewed source-ID to canonical artist UUID mapping, exhibitor directory IDs and aliases. Explicitly account for UI object ID prefixes. Names, adjacent numbers and featured stars are not identity keys.

## Evidence limits and product decisions

- Show Store stays a normal destination (screenshot: Level 5, Thomas Murphy Ballroom). Ticketed merchandise pickup (Level 4) and Black Lotus preorder/Festival in a Box fulfillment are separate destinations/rules.
- The screenshots show real native content, but are neither complete app inspection nor original-resolution map coverage. No blanket claim of complete app coverage.
- Artist table location does not establish signing hours or attendance days. Tran Nguyen's visible relative placement does not supply a missing numeric booth code.
- Public catalog membership does not prove BL preorder membership. Preserve per-offer limits and pickup rules; never copy personal shopping codes, infer purchases, or overwrite attendance.
- Actual device cold-offline behavior, storage eviction and touch use require the physical iPhone. Browser rehearsal and phone-width emulation provide narrower evidence.

## Context-safe execution

Root owns user decisions, current status, exact-scope integration and publication. Use one fresh worker for a substantial compartment, or two only when independent (for example original-map source acquisition and merchandise manifest capture). Do not give every worker the whole chat.

Each packet contains objective, allowed files, source locators, dependencies, forbidden mutations and a concrete acceptance gate. Return a compact handoff: artifact paths, decisions, changed files, checks/results, unresolved facts and next action. Save large source evidence to files, not repeated chat/tool dumps. Reuse one finite evidence snapshot for reviewers. Retire workers after the compartment; reopen from the durable artifact, not an ever-growing transcript.

Close each chunk before starting another substantial implementation tranche. Update the frontier with actual state and the next bounded action; do not label planning, publication or offline acceptance complete merely because their preceding step succeeded.
