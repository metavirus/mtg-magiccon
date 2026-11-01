# Startup hydration review — October 31, 2026

Local implementation evidence; phone/desktop PM acceptance and measured browser timings belong to root's final review. No commit, publication, production fixture insertion, or database write is part of this change.

## Demonstrated causes and prevention

- Ordinary App state initialized Info topics/feed and flights with preview seeds. Reset/no-owner and successful-empty flight paths restored the same seeds. Normal startup now starts empty or binds the saved owner's acknowledged snapshot; preview data remains explicitly gated.
- `tripFlightCalendarProjection([])` independently invented the original receipt itinerary. It now returns null when the canonical itinerary/legs are absent. Flight, Wallet and Calendar callers preserve unrelated content while omitting unavailable flight claims.
- `InfoCatalogsPreview` selected historical prior-event catalogs whenever the Atlanta read model was not ready. Historical selectors now require explicit catalog-browser QA; pending Atlanta review shows a compact Store loading state, and authoritative empty models show an empty state.
- Ten account lanes waited for one `Promise.allSettled` before publishing; only exhibitors escaped that barrier. Each lane now publishes and caches as it settles. A slow monitoring/notes read cannot hold Store, Info, flights, or selections. Unavailable catalog responses retain the last complete model instead of overwriting it.
- The auth subscription restarted with companion roster changes, and continuity refresh restarted with trust-slice/session object changes. Stable owner/mode dependencies now avoid those redundant full reloads. Context refs provide current roster/trust when selections finish.
- Every preview visibility refresh reset trial shopping interests. Same-owner/mode preview initialization runs once per mounted App; visibility keeps trial bookmarks and other view context.
- Owner changes invalidate pending hydration generations, clear/rebind UI in a layout effect before paint, and reject old-owner completions. Explicit sign-out revokes offline identity; network/session lookup failure alone retains it. Wallet rebinding also occurs before paint. Onboarding waits for the saved or server-acknowledged selections lane rather than unrelated completion.
- Ordinary monitoring initialization/merging no longer injects demonstration alerts or QA concepts. Explicit previews retain their fixtures.

## Cache policy

Genuine owner-bound saved snapshots paint promptly on offline and apparently-online reopen, including poor connections. Successful independent server reads replace those snapshots; failed reads retain them. A legitimate saved-to-fresh update can therefore still occur online. This change removes wrong-edition/preview fallbacks, not every update from previously acknowledged data. Resume does not replay the device snapshot over newer in-memory server results. Offline remains read-only with no write queue/replay contract.

## Verification and measurement scope

`pnpm test src/lib/startupHydration.test.tsx src/lib/tripFlights.test.ts src/lib/offlineContinuity.test.ts src/lib/appNavigation.test.tsx src/CatalogBookmark.detail.test.tsx`: 46 tests pass across five files. Eleven startup tests cover immediate saved paint online/offline, refresh-failure retention, independent Store publication with unrelated reads held, owner-switch late response rejection, explicit sign-out, no historical pending fallback, no production Info seed, onboarding readiness, and preview bookmark retention on visible resume.

The held-lane comparison executes both the former all-settled publication barrier and the new independent lane against the same deferred Store/monitoring promises: after Store resolves, only the new lane has painted; the former lane paints only after monitoring is released. This is a deterministic dependency-boundary measurement, not an invented real-network millisecond benchmark.

For routes with an explicit `qa` parameter, `<html>` records `data-startup-shell-ms`, `data-startup-cache-ms` when a saved snapshot binds, and `data-startup-catalog-ms` when catalog data is published. Values are navigation-relative `performance.now()` milliseconds, recorded once per milestone. No payload, owner ID, API read, visible status counter, or telemetry submission is added. Ordinary routes emit no timing attributes. Browser timing observations must distinguish warm/reload/offline conditions and do not establish billed network transfer.

Full `pnpm test`: 108 files / 650 tests pass (18.83 s). `pnpm validate:text` and `pnpm validate:secrets` pass. Canonical `pnpm build` passes, including TypeScript checking after the new tests. Production bundle-size warning remains pre-existing. Final root phone/desktop review is required before visual-completion language.

## Shell updates and independent PM review

`src/startupShell.ts` gates only controlled online startup. First visits and known-offline startup mount immediately. An ordinary update check has a 350 ms budget; a detected replacement gets up to four seconds to finish precaching. A complete replacement activates and reloads before React mounts. Background installs remain waiting, preserving open forms and lazy chunks. Failed/stalled installs retain the complete cached shell. Once activation is requested, failure/timeout cannot mount obsolete code: a small Reload recovery appears, and a later controller change still recovers automatically. Fifteen regression tests cover these branches. JavaScript precaching and the shared image cache are retained.

Independent PM inspected actual 390x844 phone and 1440x1000 desktop viewports against the Guide peer. On the explicit merchandise review route, Store showed its loading state followed by the current review catalog without historical fallback. Observed shell/catalog milestones: clean-origin phone 283/379 ms, warm phone 60/110 ms, warm desktop 112/131 ms. These are local preview observations, not authenticated production benchmarks or a measured before/after speedup. Review data contains 62 items; canonical Store remains 60 products.

PM stopped only the isolated preview origin, proved HTTP refusal, and verified cached reload plus closed-tab reopening. Catalog milestones were 77 ms on reload and 468 ms on reopening. A previously unopened bag detail and its 2000x1999 zoomable image worked with that origin stopped. The server was restored. Exact selected XL bookmark survived visibility resume. No live interests were written. Evidence and screenshots are in the visualization folder's `merch-intake/startup-final-evidence.json`. Initial browser evidence covers `index-BtjF5WHg.js`; final fault-hardening bundle is `index-B2j0o5z5.js`, with final smoke recorded separately in that evidence.

The pre-existing auto-update client cannot retrospectively run this new startup coordinator. Existing tabs holding that old worker may require closing all app tabs and reopening once to adopt the new lifecycle. Do not erase local storage, auth or caches to disguise this migration boundary. Future updates are covered by the new coordinator. Physical iPhone and production-authenticated timing remain unmeasured.

Final full suite: 109 files / 665 tests pass; production build passes. Changes remain local and unpublished; parked map work is excluded from the task.

Final PM smoke on B2j0o5z5: the preceding Btj worker adopted it after one reload (1111/1163 ms shell/catalog). Subsequent warm phone was 82/97 ms and desktop 86/115 ms; offline phone reload was 51/88 ms with product detail/zoom intact. Final server restored. Closed-tab reopen was proved on Btj; final B2 repeated reload and image zoom. Independent PM accepts the local reviewed flow within these limits.
