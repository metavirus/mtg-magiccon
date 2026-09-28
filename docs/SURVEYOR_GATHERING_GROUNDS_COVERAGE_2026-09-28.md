# Gathering Grounds and legacy ADA coverage

Read-only source review: September 28, 2026, 15:53–15:56 UTC. Owner: MagicCon / MTG Festivals; public schedule transport: LEAP. Publication dates are unspecified. No local operational monitor, staging, acceptance, or database write was used. This document records local implementation and source evidence; cloud activation and quiet-repeat proof belong to root integration.

## Gathering Grounds

The [official schedule page](https://mcatlanta.mtgfestivals.com/en-us/experience/the-gathering-grounds/the-gathering-grounds-schedule.html) returned HTTP 200. Its static main content contains only “The Gathering Grounds The Gathering Grounds Schedule.” Its `growTixScheduleSlim` widget supplies public event key `d33e6b91-2a8f-4e35-970c-752c447b23ed`, category `20600`, and the event detail path under that same schedule URL.

The page's [official widget script](https://mcatlanta.mtgfestivals.com/content/dam/sitebuilder/rna/innovations/magiccon-atlanta/2026/gt-scripts-min.js) returned HTTP 200 and constructs `https://conventions.leapevent.tech/api/schedules?key=` plus the widget key and category. Directly reading that exact transport returned HTTP 200, event ID `21389`, event slug `htwhdatl26shdl10`, event name `MagicCon: Atlanta 2026`, and 19 sessions. Every session identifies category `20600` and location `The Gathering Grounds`.

| Source sessions | Observed programming |
| --- | --- |
| 954448–954450 | MelaninMagic Booster Blitz, one session on each of November 13–15 |
| 954451–954453 | MelaninMagic Guess That Character!, one session on each day |
| 954454, 954458 | BOP! Free Headshots Booth, Friday and Saturday |
| 954455–954457 | BOP! Booster Blitz, one session on each day |
| 954459 | BOP! Mini Master Tournament, Sunday |
| 954460, 954462 | Wizards Pride Presents: Commander, Friday and Sunday |
| 954461 | Draft with Wizards Pride, Saturday |
| 954463–954465 | Veterans The Gathering: Casual Commander Friday, DOUBLE TAP EVENT Saturday, PLANE CHASE Sunday |
| 954466 | DAA Commander Sleeve Decorating, Saturday 15:00–17:00 as supplied |

Preserved uncertainties: Saturday headshots (`954458`) has identical 10:30 start/end timestamps. Sunday's Pride Commander (`954462`) has a structured noon start while its description says pods at 11am and 2pm. The API supplies local-looking timestamps without timezone offsets. No timezone conversion, calendar import, correction, purchase availability, or sellout claim is made. The initial Home synopsis names the three days and representative activities, directs readers to official details/sign-up instructions, and avoids disputed times.

The new `gathering_grounds_feed.mjs` validates page/widget/event/category/session identity and times, rejects empty or malformed results, and retains every supplied session field in stable normalized source evidence. Transport has an eight-second timeout, a 512 KiB response limit, and rejects redirects. Session order and JSON key order do not change the fingerprint. Additions, removals, time/location/description/participant/status changes do. Transport/parser errors flow into the existing failed-source coverage and baseline hold. Dynamic evidence cannot be coalesced away by another page's shared navigation change. `gatheringGroundsCoverage` exposes the checked count and schedule hash on quiet runs.

Production-helper read at **2026-09-28T15:55:58.107Z**:

- Page content hash: `3082aa315bd62e7dc5236b59c19a86e09eff17939db6349ae75d722451f35b61`.
- Schedule hash: `a5fae74d54a5d3c34399b81de81c798cfcce12070227e5e39fc469d7db1797d1`.
- Composite content hash: `9e8d8423ce3dc265dee85d139418f8da88e7ba1c813f8c8447cacf16554d8d8d`.
- Content link hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

`monitoring/watch-set.json` binds source `atlanta-gathering-grounds-schedule` to both exact composite/link hashes and the reviewed Home title “Gathering Grounds schedule is available.” A different feed requires fresh editorial interpretation. The existing canonical findings, app projection, closure and exact-report acceptance path publishes this synopsis. No public runtime JSON card was added.

## Legacy ADA disposition

Fresh direct read of [the exact legacy URL](https://mcatlanta.mtgfestivals.com/en-us/info/ada-assistance.html) at **2026-09-28T15:53:15.872Z** returned **HTTP 404**, with no redirect. Main text: “Page not found Unfortunately, the page you were looking for could not be found. Return to homepage.” Content hash `937b698c0ed1704c80db1867640f257f87759442c19ce8355a93e65fea56bb3a`; link hash `353248b3d41aa5c8d04c5f39c687ee897a6a06fff8aa627223a3125f01a8131f`.

The already-watched [Accessibility Assistance page](https://mcatlanta.mtgfestivals.com/en-us/info/accessibility-assistance.html) returned **HTTP 200** at **15:53:16.840Z**, with Atlanta-specific content, October 9, 2026 communication-request deadline, and November 13–15 sensory-room hours. Content hash `a2b48345c54aa4f213e56bcc47765ff3b9062f189b8a393b70cf2331ed799ca4`; link hash `f539a7c10ea973a2464350f21775ad1f8aa530722cb7ca9023eb7b4ac99c3d14`.

Disposition: renew the exact legacy URL exclusion until **October 4, 2026, 00:00 UTC**, because it is a broken old FAQ destination with a verified current watched replacement. This is fresh 404 evidence, not reuse of a search engine's cached 2025 policy. Restoration remains possible, so exclusion expiry must continue returning it to the coverage gaps. No new ADA policy announcement is warranted.

## Local validation

Targeted `pnpm test` covers the adapter, artist precedent, detail coverage, source onboarding, and candidate routing. Tests cover dynamic changes under unchanged HTML, ordering stability, identity/empty/parser/transport failures, response limits, ambiguous source preservation, exact Home review, evidence retention, baseline acceptance, navigation isolation, and dated ADA exclusion expiry. Root must run the final monitoring ship gate and authoritative cloud activation/repeat before marking this coverage live.
