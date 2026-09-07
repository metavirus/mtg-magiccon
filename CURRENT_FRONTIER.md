# Current Frontier

Updated: 2026-09-07

## Current checkpoint

The public app is current through `139439c50d16aa4e9ecd8b4ab001a295c7acd61f`. The latest shipped feature is the compact Artist **Cards to bring** checklist: it derives from **For sure** signing picks, groups cards by artist, and persists independent Packed/Signed checks through owner-scoped Supabase selections. CI, Pages, public freshness, authenticated save/reload, and the deployed 390px layout passed. Automated offline-state tests pass, and Kavi accepted the installed-iPhone offline behavior.

The Atlanta companion is an authenticated mobile-first React PWA backed by canonical Supabase project `pavjsexxbueuzhzgemgy`. Supabase is truth for meaningful authenticated state. Browser storage is limited to UI/auth convenience and owner-scoped read-only offline continuity; offline mode never queues writes or replaces newer server data.

The accepted public surfaces are Home, Explore, Plan, Calendar, Map, Info, Wallet, Trip, Artists, Notes, and Activity. Map intentionally remains a placeholder until a dated first-party Atlanta 2026 map passes the documented arrival gate.

## Active systems

- The Daily MagicCon surveyor's authoritative public-source baseline and privileged discovery-to-closure work exist only in the GitHub Actions workflow. Daily supervision must inspect that cloud run first and must not compare the ignored local baseline to cloud state or run local staging/acceptance commands.
- Purchased/locked events, receipt facts and originals, Companion codes, trip facts, maintained Info, artist holdings/signing choices, monitoring concepts, and contextual notes use the established Supabase-backed models described by their focused contracts.
- Authenticated device hydration covers the user-visible production read model and permitted receipt/media artifacts. External destinations and first-time authentication are necessarily online-only.
- The private catalog operator UI and canonical schema are ready, but no real Atlanta catalog has been promoted. Historical items and media are reference material only. Image recognition and automated exact-product search remain parked.

## Parked local work

Future artist collection refresh tooling is prepared locally and intentionally unpublished. It adds explicit before/after CSV review plus batched, replay-safe SQL generation; see `docs/ARTIST_IMPORT_REFRESH.md`. Its targeted tests, full-source generation, and isolated PostgreSQL replay passed. It has not changed hosted collection data. Missing holdings are review flags, never automatic deletions.

## Next safe lanes

1. When a new artist collection export arrives, use `docs/ARTIST_IMPORT_REFRESH.md`; review the delta before any authenticated database write.
2. When the first Atlanta catalog releases, preserve the source and use the reviewed catalog intake/promotion path. Keep Catalogs hidden until a real reviewed Atlanta offer passes exact live readback.
3. When the official Atlanta map arrives, begin with `docs/MAP_INGESTION_RUNBOOK.md`; do not activate speculative spatial data.
4. Otherwise keep the accepted app and cloud surveyor stable until real source data or a visible defect creates a concrete next task.
