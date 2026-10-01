# Current Frontier

Updated: 2026-10-01

## October 1 surveyor follow-through and schedule coverage — closed

Repairs `943cce0` and `5a0b2fa` complete the agent-owned detect/review/publish loop rather than treating pending editorial as owner homework. The saved heartbeat now resolves retained failed reports before rediscovery and requires the read-only supervision finish gate, cloud closure, exact baseline acceptance/cache save, and app readback. Regression proof rejects the original pending artifact and incomplete nested coverage. Exact-content announcement continuity preserves first-seen age and user read/archive choices across navigation fingerprint changes; duplicate announcements are archived by the cloud lane, including on quiet runs.

Both retained failed reports replayed successfully (`36932886853`, `36932890391`). Normal activation `36933161782` and zero-change repeat `36933580394` passed closure, exact acceptance and cache save. Repeat: complete 40-source coverage, nine inspected articles, no fetch failures, missing articles or linked-page gaps. Real schedule feeds cover Gathering Grounds (21), Meet and Greets (19), and Panels and Events (48); the dedicated Family Magic category is identity-valid but empty, explicitly awaiting publication and still watched. See `docs/SURVEYOR_SCHEDULE_COVERAGE_2026-10-01.md`.

Home publishes reviewed Family Magic activities, panel/meet-and-greet schedules (including Spell Slayers), and current Atlanta wristband instructions. Heading/backlink-only announcements were withdrawn. The final full gate passed 481 tests; CI/Pages and public freshness passed. Private Gmail coverage remains separately checked through October 1 16:57 UTC, with no unresolved candidates. Older September 28 counts below are historical checkpoints, not current coverage.

## September 28 coverage and receipt gaps — closed

Repair `b0e5960` passed 454 tests, CI/Pages, public freshness, and authenticated Wallet phone-view proof. Gathering Grounds now monitors its real 19-session feed and has a verified Home announcement. Cloud activation `36449775196` and zero-change repeat `36450121574` both verified closure, accepted the exact baseline, and saved the cloud cache; the repeat has complete 38-source coverage with no failures, missing articles, or detail-page gaps. The legacy ADA URL was freshly confirmed 404; its current accessibility replacement is watched, and the dated exclusion is reviewed through October 4. See `docs/SURVEYOR_GATHERING_GROUNDS_COVERAGE_2026-09-28.md`.

All three private Gmail queries completed through September 28 15:53 UTC with no new unhandled messages. Kyle's known Hilton original was published through the approved manual recovery lane and is now visible under Wallet → Other → Hilton → Original → Show proof. The unmodified attachment, exact hotel binding, all four companions' read access, and 390px rendering were verified before clearing the sole private candidate. Remaining hotel originals require their own source evidence; they are not unresolved Gmail candidates or reopened offline work. Private publication identifiers and source evidence remain ignored, not in public documentation.

## September 25 artist release — roster and monitoring shipped

The released official directory contains 65 artists with booths. All 65 are now confirmed in canonical Supabase, with the retained unconfirmed Rebecca Guay reference; cards, ownership, signing choices and preferences are unchanged. Individual days/hours remain unpublished. Roster/UI/feed commit `9a1b1c4` passed CI/Pages, public freshness, authenticated desktop/mobile visual inspection, cloud activation `36212138777`, and zero-change repeat `36212302077`. Home has the verified directory announcement. Superseded October artist forecasts are retired. See `docs/ARTIST_ROSTER_RELEASE_2026-09-25.md` and `docs/SURVEYOR_ARTIST_FEED_REPAIR_2026-09-25.md`. The separate Gathering Grounds coverage gap was closed September 28 above.

## September 19 approved audit implementation — shipped and verified

The approved implementation (`1811efd`, source-review guard `dc0db4a`) shares Companion codes across Explore/Plan/Calendar, routes hotel references correctly without claiming missing originals exist, fixes unconfirmed artist attendance, distinguishes unread/applied Activity history from required action, and improves mobile Plan and supporting copy. Desktop/mobile click-throughs and 418 tests passed. Cloud activation `35485943116` reviewed 24 initial snapshots and verified three Home cards; quiet repeat `35486149809` had zero changes, complete 35-page/article/Ticketed Play coverage, closure, exact acceptance, and cache save. The existing heartbeat now requires a separate Gmail coverage receipt; its first real three-query check passed, with no new unhandled message. See `docs/UI_UX_AUDIT_2026-09-19.md`, `docs/SURVEYOR_AUDIT_2026-09-19.md`, and `docs/SURVEYOR_SOURCE_ONBOARDING_2026-09-19.md`. Hotel originals were separate missing-data work at this checkpoint; Kyle's source and binding are now closed above. Optional flexible-time/note-target polish is not an activation blocker. Accepted iPhone offline proof, deferred planning architecture, and placeholder Map remain accepted/parked. The checkpoint below describes the earlier accepted feature baseline, not the newest deployed SHA.

## Earlier accepted feature baseline (historical)

The earlier baseline at `fa73eb81d90b227962c5c2711e3846eac8b00d6e` included the compact Artist **Cards to bring** checklist: it derives from **For sure** signing picks, groups cards by artist, and persists independent Packed/Signed checks through owner-scoped Supabase selections. CI, Pages, public freshness, authenticated save/reload, the deployed 390px layout, and installed-iPhone offline behavior passed. Later shipped checkpoints added the reviewed artist collection-refresh tooling and corrected surveyor summaries for official resource-link changes. The September 19 checkpoint above supersedes this deployment reference without reopening its accepted work.

## Current product boundaries

The Atlanta companion is an authenticated mobile-first React PWA backed by canonical Supabase project `pavjsexxbueuzhzgemgy`. Supabase is truth for meaningful authenticated state. Browser storage is limited to UI/auth convenience and owner-scoped read-only offline continuity; offline mode never queues writes or replaces newer server data.

The accepted public surfaces are Home, Explore, Plan, Calendar, Map, Info, Wallet, Trip, Artists, Notes, and Activity. Map intentionally remains a placeholder until a dated first-party Atlanta 2026 map passes the documented arrival gate.

## Active systems

- The Daily MagicCon surveyor's authoritative public-source baseline and privileged discovery-to-closure work exist only in the GitHub Actions workflow. Daily supervision must inspect that cloud run first and must not compare the ignored local baseline to cloud state or run local staging/acceptance commands.
- Purchased/locked events, receipt facts and originals, Companion codes, trip facts, maintained Info, artist holdings/signing choices, monitoring concepts, and contextual notes use the established Supabase-backed models described by their focused contracts.
- Authenticated device hydration covers the user-visible production read model and permitted receipt/media artifacts. External destinations and first-time authentication are necessarily online-only.
- The private catalog operator UI and canonical schema are ready, but no real Atlanta catalog has been promoted. Historical items and media are reference material only. Image recognition and automated exact-product search remain parked.

## Planning-season decision

Atlanta 2026 session planning is effectively complete: the companion group has obtained its sessions. Plan-lite remains the accepted planning surface, but shared-selection summaries, voting, contention solving, drag/drop scenarios, and AI schedule recomputation are not active work for this event. Revisit planning architecture only for a demonstrated onsite problem or when planning a future convention.

The reviewed artist collection-refresh tooling is published and ready for a future export. It provides explicit before/after CSV review plus batched, replay-safe SQL generation; see `docs/ARTIST_IMPORT_REFRESH.md`. Its targeted tests, full-source generation, and isolated PostgreSQL replay passed. Publishing the tooling did not change hosted collection data. Missing holdings remain review flags, never automatic deletions.

## Next safe lanes

The known monitoring gaps are closed as of October 1. Maintain dynamic artist and all four schedule feeds, continue through bounded editorial work, and re-review dated source exclusions when due; do not turn routine maintenance into owner homework.

1. When a new artist collection export arrives, use `docs/ARTIST_IMPORT_REFRESH.md`; review the delta before any authenticated database write.
2. When the first Atlanta catalog releases, preserve the source and use the reviewed catalog intake/promotion path. Keep Catalogs hidden until a real reviewed Atlanta offer passes exact live readback.
3. When the official Atlanta map arrives, begin with `docs/MAP_INGESTION_RUNBOOK.md`; do not activate speculative spatial data.
4. Otherwise keep the accepted app and cloud surveyor stable until real source data or a visible defect creates a concrete next task.
