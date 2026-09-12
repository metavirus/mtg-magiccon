# Current Frontier

Updated: 2026-09-11

## Current checkpoint

The public app and live automation are current through `fa73eb81d90b227962c5c2711e3846eac8b00d6e`. The accepted UI checkpoint includes the compact Artist **Cards to bring** checklist: it derives from **For sure** signing picks, groups cards by artist, and persists independent Packed/Signed checks through owner-scoped Supabase selections. CI, Pages, public freshness, authenticated save/reload, the deployed 390px layout, and installed-iPhone offline behavior passed. Later shipped checkpoints added the reviewed artist collection-refresh tooling and corrected surveyor summaries for official resource-link changes.

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

1. When a new artist collection export arrives, use `docs/ARTIST_IMPORT_REFRESH.md`; review the delta before any authenticated database write.
2. When the first Atlanta catalog releases, preserve the source and use the reviewed catalog intake/promotion path. Keep Catalogs hidden until a real reviewed Atlanta offer passes exact live readback.
3. When the official Atlanta map arrives, begin with `docs/MAP_INGESTION_RUNBOOK.md`; do not activate speculative spatial data.
4. Otherwise keep the accepted app and cloud surveyor stable until real source data or a visible defect creates a concrete next task.
