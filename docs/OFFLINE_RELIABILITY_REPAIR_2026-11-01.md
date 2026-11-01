# Offline reliability repair

This implements the bounded follow-through from the startup root-cause review. Canonical account data remains in Supabase. Device copies are read-only; no server mutation queue, data purge, or map redesign is introduced.

## Persistence boundary

All seventeen account snapshot lanes now use the same owner-bound boundary, including Wallet, companions, artist catalog/signing choices, alerts, selections and the legacy Black Lotus trust view. Complete per-lane CacheStorage envelopes are primary. Independent per-lane localStorage is fallback. Success requires exact storage readback, not merely a resolved write. A change in one lane no longer rewrites the combined owner JSON. Existing originals remain available for compatible migration; outdated artist privacy versions are rejected.

Saves serialize per owner/lane. Owner changes, newer acknowledgments and authoritative empty results fence delayed cache/server responses. A missing trust occurrence has a durable null snapshot so the old occurrence cannot reappear. Same-owner auth refresh does not restore stale legacy planning state. A cache failure cannot suppress fresh server content.

The boundary retains failed latest snapshots in memory for device-only retry. Read failures with evidence of a previously retained snapshot remain actionable; recovering an older copy does not certify the missing newer one. Tiny optional per-lane receipts help detect eviction. Browser access denial is caught inside storage operations, including denial of the storage getter itself.

## Product behavior

Healthy saves stay quiet. A failed device copy shows “Some content isn’t available offline.” and Retry. Retry repeats only failed local persistence/readback; it does not replay account mutations. Offline owner bootstrap is read back too; failure shows “Offline access couldn’t be saved on this device.” Optional view/filter preferences cannot crash startup or Plan when browser storage is denied or full. Those preferences do not use the account-data boundary.

The notice reuses the existing image-status controls, with legible 12px consequence text. Explicit preview-only `qa=offline-storage-failure` rehearses the real boundary against disposable memory stores: initial failure, Retry, verified readback, notice removal. It never touches real account storage or the server. This rehearsal proves the failure flow, not a real browser quota condition.

## Verification

Automated coverage includes every lane together above a shared 5 MiB localStorage budget, full original/private artifact references, independent fallback, exact readback failure, both stores failing, corruption/known eviction, clock rollback, late responses, authoritative empty results, account changes, and source guards against feature-level legacy writes. Feature tests exercise actual Wallet and artist surfaces reopening from primary-only copies. Existing worker-upgrade tests cover pre-mount adoption, failed installs, activation timeout and preservation of open sessions.

Exact release gate: 709 tests across 113 files, TypeScript/production/PWA build, text integrity, secret scan and GitHub-verifier guard pass. The isolated release tree excludes parked map source/config/assets. Environment readiness passed against the canonical project; no database writes were performed.

Independent PM inspected actual 375×844 phone and 1265×720 desktop screens against Guide. The initial failure sentence inherited a 9.17px small-text style; it was corrected to 12px and rechecked. Failure Retry clears after verified readback; healthy flow has no status counter. Product details, eight hoodie sizes, XL selection, original-image viewing and 150% zoom remained usable.

The existing root IAB client at 127.0.0.1:5205 adopted B2j0o5z5 → Cgtg70nK by ordinary reload and automatic pre-mount replacement, without clearing storage. PM's existing client similarly adopted Cgtg70nK → Det9LVQa → Dy2cqXAa. With the actual Vite listener stopped and HTTP unavailable, Dy2cqXAa reloaded and reopened Store 62/62; a previously unopened Black Lotus Medallion Necklace detail and 2000px original image worked with zoom. The local review fixture includes two pending Extra Life items beyond the canonical sixty products. This is a local-origin outage proof with remote networking still available, not full device network isolation. The server was restored with the exact release artifact BCA9y7ar.js / BKPwl1ps.css.

The capture script reports its launcher PID; stopping that launcher alone did not stop the site. Root identified and verified the Vite process actually listening on the specific port, stopped only that process, then proved HTTP unavailable before the PM offline check. Use listener identity plus HTTP proof for future stopped-origin tests.

Public deployment verification is pending the release checkpoint below.

## Limits

This does not promise that browsers cannot evict storage. If an entire origin and every receipt are removed, the app cannot distinguish that from a first visit. When both device stores are unavailable, current online content remains usable and failure remains visible; retry cannot manufacture storage capacity. The offline identity selector still requires localStorage, with explicit failure instead of a false offline-ready claim. No credential or auth-token cache has been added.

Store fixture screenshots and a stopped localhost server are not authenticated public data or physical-iPhone certification. First-time sign-in, external destinations, new server content while disconnected, and offline editing remain outside the offline contract. The real iPhone must still prove installed-app reopen and critical Wallet originals in airplane mode before travel. Previously verified media warming, full-size product zoom and private-proof cache ownership remain intact.
