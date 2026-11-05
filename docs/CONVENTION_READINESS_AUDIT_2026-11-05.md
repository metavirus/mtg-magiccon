# Convention readiness audit — November 5, 2026

## Verdict

Not yet ready to certify for convention use. Normal signed-in navigation works, but loading-state and receipt-recovery defects remain. Audit only: no application changes, production data writes, or deployment were performed.

Scope: committed HEAD `399f592`, relevant working-copy changes, 79 focused regression tests, and independent PM inspection of the signed-in live app. Existing unrelated map work was preserved. The findings below are present in the committed implementation, not dependent on the local map changes.

## Fix before travel

1. **P1 — Wallet and Plan can falsely look empty during loading.** `src/App.tsx:272` clears receipts before asynchronous cache/network reads; lines 5720/5730 render “No receipts” without distinguishing loading from a confirmed empty result. Selections reset around 1071; Plan's empty state at 4356 has the same problem. Preserve same-owner acknowledged content and represent loading, confirmed empty, and failed refresh separately. Test delayed cache, delayed server, failure, and owner change; old-owner content must never leak.

2. **P1 — Offline proof can claim readiness before inventory is known.** `src/App.tsx:261,273` initializes expected/cached to zero with loading false; line 7218 renders readiness from those counts. A pending or failed inventory read can therefore look ready. Require confirmed inventory discovery and successful artifact verification before claiming offline readiness. Test pending/failed discovery, genuinely empty inventory, partial cache and complete cache.

3. **P1 — Receipt opening depends on optional cache writes.** `src/lib/receiptArtifacts.ts:59–73` downloads a proof and then awaits its cache write before returning it. Cache quota/access failure can prevent an otherwise successful proof from opening. When online, even already cached proof waits for the download to succeed or fail before using the cache; a bad connection reported as online can delay access. Make verified owner-scoped saved proof promptly available, and keep cache-write failure separate from successful display. Test successful download with failed cache write and a hung network with a saved proof. Do not weaken private-owner isolation.

4. **P2 — Fresh startup can wait indefinitely for auth.** `src/App.tsx:1004–1007,1538`: a non-settling `getSession()` with no offline identity leaves the boot screen indefinitely. Existing hanging-auth tests seed an identity and do not cover this case. Add bounded recovery with a reachable retry/sign-in path; do not silently pretend authentication succeeded or discard saved state.

5. **P2 — Storage denial can interrupt sign-out.** `src/App.tsx:2270` calls `clearOfflineIdentity()` before SDK sign-out without protecting against storage errors. `src/lib/offlineIdentity.ts:28–29` can throw. Cleanup failure must not prevent authentication sign-out; test denied localStorage.

6. **P2 — Home and Calendar still promote superseded forecasts.** Live phone review confirmed “catalog/store next” and an Oct 30–Nov 3 Black Lotus forecast under Upcoming on Nov 5, while Store already contains 60 products. `src/App.tsx:3963–3975,6710,6990,7005` retains static forecasts. Derive visibility from actual fulfilled milestones and dates. Keep an explicit unresolved future milestone only when supported; test both date rollover and fulfillment.

7. **P2 — Store details omit a purchase restriction shown on the card.** Live Festival in a Box card shows Limit 2, but its drawer does not retain that fact. Use the same normalized limit in both surfaces; check phone and desktop, including product options.

8. **P3 — Wallet leaks internal process language.** Live original-receipt view explains that it is a full Gmail render rather than a cropped proof slice; badge overview also narrates capture. Remove process narration across that flow, keeping useful receipt labels and transaction facts.

## What passed

- 76 focused startup-shell, hydration, owner-isolation and offline-continuity tests passed in the reliability review; 3 additional session-refresh retry tests passed in root.
- Supabase client explicitly enables session persistence and token refresh. A populated live session survived one refresh.
- Independent PM exercised Home, Explore, Plan, Calendar, Info/Store and Wallet on desktop (approximately 1327×921) and Chrome responsive viewport 390×844.
- Mobile Events/More navigation worked; Store Bookmarked filter returned three items; Wallet QR and five-page Original opened; drawer close controls were reachable. No purchases, plans or bookmarks were modified.
- Existing shell tests cover offline immediate mount, bounded worker discovery/install, failed precache, and safe activation. These are useful regression guards, not physical-device certification.

## Performance and device evidence still required

PM saw a brief blank gradient during refresh, but did not measure time to useful content. `index.html` has an empty root until JavaScript mounts; the inspected local dist entry was about 1.15 MB uncompressed plus 288 KB CSS. These are local asset sizes, not live transferred bytes or evidence of a specific network bottleneck. Do not claim startup performance passes from this audit.

After the fixes, capture one bounded before/after startup trace separating shell, authentication, cached content, network refresh and images. Measure fresh visit, warm reopen and degraded-network reopen on the deployed build. Suggested acceptance: warm cached essential content within one second on the test device; no false empty/placeholder facts; slow network must not block saved proof. Record actual timings and conditions rather than presenting the target as achieved.

Physical iPhone Safari and installed Home Screen behavior remains unverified in this audit: force-close/reopen, background/resume after token expiry, airplane-mode cold reopen, proof/QR availability and pinch/scroll/keyboard behavior. Chrome viewport resizing is not a substitute. Avoid deliberately expiring or clearing Kavi's real session; use an isolated test account/context for destructive auth/storage scenarios.

## Recommended implementation order

1. One cohesive reliability fix: truthful hydration states, proof access independent of optional persistence, bounded auth recovery, resilient sign-out. Add regression cases for the exact missing scenarios above.
2. Convention content pass: fulfilled forecasts, purchase limits and remaining process copy. Independent PM rechecks actual phone and desktop flows.
3. One exact-scope release and deployed signed-in rehearsal, then the short physical-iPhone check. Preserve unrelated map work and existing personal data. Do not call the release complete at push or deployment success.

## Evidence

Private screenshots are local under `output/reliability-pm-2026-11-05/`; do not publish receipt screenshots:

- `phone-calendar-stale-forecasts.jpg`
- `desktop-store-bookmarked.jpg`
- `phone-store-bookmarked.jpg`
- `phone-wallet-original.jpg`
- `phone-wallet-original-enlarged.jpg`

Limitations: no production mutations, new login, forced token expiry, network-off browser trial, or physical iPhone test. Unit tests use mocks. This is a broad core-flow audit with explicit gaps, not proof that every interaction or connectivity condition passes.

Documentation validation: secret scan passed. Repository text validation failed on pre-existing CRLF/CR line endings in `docs/MAP_REV8_HANDOFF.md`; it did not report this audit file. That unrelated handoff was not changed here.
