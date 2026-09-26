# Official artist roster release

The official Atlanta 2026 Artist Directory was inspected as rendered in the live browser on September 25 (September 26 UTC): 65 named entries, all with booths. The source-owned LEAP feed agrees. Reviewed source names, canonical identity mappings, booth labels, profile links and image links are retained in `research/precanon/artists/2026-09-25-official-roster.json`.

## Canonical update

Canonical project `pavjsexxbueuzhzgemgy` now contains 65 confirmed Atlanta appearances with 65 booths, plus the retained unconfirmed Rebecca Guay appearance. The import reused 59 identities and added six: Andrea Radeck, Kaja Foglio, kelogsloops, Phil Foglio, Tom Wanerstrand, and Wizard of Barge. Joint artist credits are separate identities, not evidence that both artists attend. Existing UUIDs are preserved; nobody absent from the source is marked cancelled or deleted.

Directory listing does not establish individual days or signing hours. Imported appearance days are null, replacing the three unsupported POC `All days` values. The UI now shows `Days not published`; booths are visible in rows and artist details. The header summarizes the count rather than repeating all 65 names, and its source link opens the actual directory.

Migration `20260926022712_artist_appearance_booth.sql` adds only nullable event-specific booth text. Existing RLS/grants are unchanged. `scripts/build_artist_roster_sql.mjs` generates the bounded reviewed transaction without connecting to a database; rerunning it is safe for this exact snapshot, but it must not replace a newer roster without review. It neither writes owner import manifests nor reimports card data. Source provenance stays in the reviewed public snapshot and appearance source notes.

The first transaction was rolled back because its import-history conflict key reflected the obsolete shared schema. The corrected generator no longer writes owner-scoped history. A regression asserts the only write targets are artists and appearances. Transaction-level digests prove all private inventory, profiles, assessments, import history, cards, printings, signing interests and preferences remained unchanged. Database readback: 1,128 identities, 66 appearances, 5,068 cards, 5,451 printings/assessments. Owner/nonowner and anonymous-denial checks passed. Advisor returned no artist findings; existing unrelated monitored-fact/auth notices are unchanged.

## Monitoring and validation

See `SURVEYOR_ARTIST_FEED_REPAIR_2026-09-25.md`. Empty HTML is not roster coverage: the surveyor now reads the official widget feed and fails closed on missing/invalid results. Static overview gets reviewed noise; directory release gets one useful Home announcement. Full local gate passed 432 tests, build, text/secrets and workflow-verifier guards.

Roster/feed commit `9a1b1c4` passed CI `36212126202`, Pages `36212126251`, and public asset verification. Authenticated Chrome readback confirmed that exact build, all 65 roster entries, booths, unknown days, and preserved signing picks. Desktop roster and 390px mobile filtering/artist-details screenshots were inspected: Cynthia Sheppard has booth 9151, her saved Beseech the Mirror, and the exact official source link. The previous browser shell briefly remained cached; it updated normally without clearing authentication or offline data.

Home visibly showed “Atlanta's artist directory is available.” That check also caught the obsolete October artist forecast on Home/Calendar; it is now retired, with the directory marked published and catalog/store the next estimated releases. Targeted cross-surface regressions (16 tests), build, and local 390px Home viewport passed. The release checklist is source import, private-state preservation, directory display, Home announcement, and retirement of superseded forecasts—not just a successful database import.
