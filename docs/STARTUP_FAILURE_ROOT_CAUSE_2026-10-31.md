# Startup and offline failure: root-cause review

Engineering follow-through is recorded in docs/OFFLINE_RELIABILITY_REPAIR_2026-11-01.md. The findings below describe the incident and the state at the original review; use the follow-through for the current repair and its limits.

This was preventable. The agent owned the storage design, its expansion into a production offline feature, and the incorrect completion claims. Browser limits and service-worker behavior were known engineering constraints, not an unexpected platform failure.

## Causal chain

1. **An optional cache became a product dependency without a redesign.** Commit `455a917` (August 24) stored eight growing datasets in one owner-scoped localStorage JSON value. Each lane update parsed, copied and rewrote the whole record. Later work added catalogs, findings, artist data and other lanes. There was no capacity model, independent large-data storage policy or migration trigger. Commit `6a2c77b` (August 30) described a complete authenticated offline pack while App cache writes still swallowed exceptions as best effort.
2. **The failure was hidden.** The server could return fresh data and the screen could render it, while the device failed to retain it. Silent catches made those outcomes look equivalent. Live`27fa069` diagnostics finally demonstrated QuotaExceededError for both catalog and findings. The next startup therefore needed another server fetch. Image-cache success did not establish that structured catalog/account snapshots were saved.
3. **Missing real data activated prototype content.** Before `d2afab3`, InfoCatalogsPreview treated absence of a ready nonempty catalog as permission to render the Chicago precedent. Loading, unavailable and an intentional historical preview were not separate states. Ordinary startup also seeded other surfaces with preview values. A transient read or cache miss thus produced confident, irrelevant content rather than an honest pending/failure state.
4. **Startup coupled independent work.** App published most account datasets only after a shared Promise.allSettled completed. Store could wait for unrelated requests. Separately, immediate service-worker registration and React mounting were not coordinated, so old application code could render before an update. Several preview origins/ports accumulated their own worker and cache histories.
5. **Verification did not reproduce the failure.** Early tests used small, unlimited in-memory storage; early PM checks used explicit review fixtures and a clean localhost origin. These could verify appearance and fixture speed, but could not establish authenticated persistence with the user's existing storage. Root knew the original cached preview had not adopted the update yet still reported local completion. On recurrence, root initially assumed the public site was the reported surface instead of identifying the screenshot's exact in-app tab. The user had to supply the missing acceptance test repeatedly.

The architectural mistake was accepting a feature-level success (data rendered, images cached, build green) as proof of the full sequence: server acknowledgment, complete durable device save, reopen, correct owner, usable content before network, and safe version adoption.

## Predictable constraints we failed to design around

MDN documents a small localStorage quota, QuotaExceededError, and origin-wide allocation. Paths do not isolate storage: apps below metavirus.github.io share an origin, while localhost and127.0.0.1 or different ports are different origins. We did not establish a budget across those occupants. Namespacing keys prevents collisions; it does not reserve capacity. Cache API storage is also finite and may be evicted; it is a better-fit mechanism here, not a guarantee against all device storage failures. [Browser storage documentation](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

Workbox documents that installed updates can wait behind existing controlled tabs. A server responding with new files does not prove an existing tab adopted them. The update lifecycle needed an explicit policy for pre-mount activation, open work, cached lazy chunks and legacy clients. [Service-worker update documentation](https://developer.chrome.com/docs/workbox/handling-service-worker-updates)

## Why recovery was unnecessarily painful

- Root diagnosed from a new test surface before establishing the exact failing URL, browser partition, bundle and authenticated/fixture mode.
- PM was given a narrower task than the completion claim. Independent review cannot compensate for the wrong acceptance criteria; root owned that mismatch.
- Root treated intermediate fixes as completed outcomes. Recurrence should have invalidated the first acceptance immediately.
- Silent cache errors required an extra diagnostic deployment to discover the real durability failure. Root optimized symptoms before observing persistence.
- Browser binding, ownership and viewport/compositor mistakes caused extra attempts. Some captures were rejected correctly, but these problems lengthened the work. They do not excuse claiming a product fix before the actual failing surface passed.
- Three code releases were needed: startup/fixture fixes, diagnostic/error-state changes, then quota persistence. Earlier capacity/failure evidence would have avoided much of this cycle.

## What is established, and what is not

Established: real catalog and findings writes hit quota; the offers SQL plan under the existing authenticated role took23 ms in the bounded check; the public catalog took20.2 seconds on one initial run and3.8 seconds on another. After `c694d10`, complete fallback writes succeeded and saved public Store content appeared at489 ms phone /342 ms desktop before server completion. Sixty products and both existing bookmarks remained. The root cause of repeated slow reopen was failed persistence, compounded by misleading fallback/render/update behavior.

Not established: which keys or datasets first filled localStorage, when it happened, or whether another same-origin app contributed. The incident does not establish that product images filled localStorage; images used a separate cache. We did not capture a complete network/auth/API breakdown of the initial 20-second read. The core SQL timing does not prove every downstream query was fast. No evidence in this incident showed loss of canonical Supabase records; the observed failure concerned device copies and freshness.

## Current repair and remaining exposure

`c694d10` provides complete, versioned, owner-bound CacheStorage fallback for the eleven startup datasets and catalog bookmark/promotion acknowledgments. It preserves prior data/media, serializes saves, uses lane-specific timestamps and rejects stale cache results after owner changes or newer server results. Forced quota, oversized data, ordering, failure/recovery and offline reopen tests now exist. Normal preview seeding is gated; independent data publishes without the old global barrier; startup coordinates fully installed worker adoption before mounting when possible. The exact IAB origin was recovered without clearing auth, user data or images.

This is not a completed consolidation of offline persistence. Wallet receipts, companions, artist catalog/signing data, monitor-alert writes and a direct selection update still contain legacy direct cache reads/writes. Some catch failures silently. If both primary and fallback storage fail, the new path retains last good/in-memory data and logs failure, but normal product readiness is not a complete end-to-end offline receipt. First-visit performance, public network-off and physical-iPhone behavior were not certified by the saved-startup result.

## Recommended next reliability tranche

These are review recommendations, not claims of completed implementation or authorization to rewrite the app.

1. **One owner-bound persistence boundary.** Route remaining acknowledged datasets and mutations through the same complete read/write/freshness policy, then remove feature-level direct writers. Prove full offline round trips and owner/server races for each affected dataset. Do not purge or truncate content to obtain a pass.
2. **One truthful offline-readiness result.** Distinguish server loaded, device saved and device readback verified. Keep healthy UI quiet; surface an actionable failure when content the user expects offline cannot be retained. Agent diagnostics retain technical causes.
3. **Capacity and upgrade tests at the shared boundary.** Test realistic combined data and forced failures before new large datasets or persistence changes ship. Test an already-controlled old client upgrading, not just a new browser context. Cover missing/corrupt/evicted data and both stores failing. A larger store alone does not close these cases.
4. **Acceptance matches the reported environment.** Startup/persistence sign-off records origin, browser partition, actual bundle, account mode, cache source and reopen outcome. PM's final claim cannot exceed that evidence. A large test count or a screenshot is not a substitute for a successful durable reopen.

Do this as a bounded consolidation with existing screens and canonical state intact. A wholesale app rewrite, more generic instructions, a new always-on health dashboard or another layer of fallback UI would not address the demonstrated causes.

## Evidence

- Original storage/API and tests:`455a917`; authenticated offline expansion:`6a2c77b`; immediate PWA updates:`5ad2c1e`; Store ingestion:`a496eb1`; pre-fix fallback:`61ac6f2`.
- Repairs/diagnosis:`d2afab3`,`27fa069`,`c694d10`; final acceptance record:`880292e`.
- docs/STARTUP_HYDRATION_REVIEW_2026-10-31.md contains measured conditions, exact CI/Pages identities and test boundaries.
- Local visualization evidence:merch-intake/startup-public-quota-evidence.json and startup-final-public-* screenshots; no private cache payload was needed for the diagnosis.

This review changes documentation only. Remaining engineering recommendations are open; the shipped Store recovery is not relabeled as whole-app offline certification.
