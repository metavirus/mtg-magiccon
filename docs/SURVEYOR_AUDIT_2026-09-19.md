# Scheduled surveyor audit — September 19, 2026

## Approved implementation follow-through

S1–S4 are shipped and operationally verified; the original audit below remains historical evidence. The watch set now has 35 sources, current-link reconciliation, six dated exclusions, exact initial-source review, and regression coverage. Three deliberately reviewed current-reference Home synopses passed exact cloud readback and appeared in the signed-in app. The existing heartbeat was updated through the app tool to require the separate private Gmail coverage receipt; its cadence and cloud-only rules were preserved. See `SURVEYOR_SOURCE_ONBOARDING_2026-09-19.md` and `PRIVATE_MONITORING_COVERAGE.md`. Final ship gate passed 418 tests. Activation run `35485943116` and quiet repeat `35486149809` both passed complete coverage, closure, exact acceptance, and cache save; the repeat had zero changes. The first complete connector-backed Gmail receipt was recorded, with no newly unhandled finding and the known hotel-original binding gap retained explicitly. S5 UI now labels unread history honestly, provides current itinerary context for the applied flight update, and archives the two compatibility announcements by default while preserving explicit saved review preferences.

Read-only audit of scheduled execution, current cloud evidence, source coverage, and readiness for additional sources. No dispatch, acceptance, database write, automation edit, or publication was performed. The authoritative artifact was downloaded to ignored local audit storage; no private email content is retained here.

## Current health

- **Public surveyor healthy within its configured scope.** Scheduled run [35463946355](https://github.com/metavirus/mtg-magiccon/actions/runs/35463946355) completed September 19 at 19:20:07 UTC on `3b39bde36f08a8f33e0f93c66a48ea84a83ab287`. Its staging, closure verification, watched-alert step, exact-report acceptance, and cache save all succeeded. Job annotations were empty. All 12 most recent runs inspected were successful; this is a bounded recent-history check, not a claim about all historical runs.
- The report checked **11 configured pages and all 9 discovered news articles**; zero fetch failures, missing discovery sources, unfetched articles, or recorded detail gaps. LEAP covered **139 events: 130 purchasable states known, 9 advancement-only rounds, zero unknown**. `coverageStatus` and closure were `complete`.
- One current change closed: **Savvy Pin Traders — Deluxe Sealed League — Reality Fracture with Veggie Wagon** (`ticketed-944129`) became sold out. The closure artifact contains exact availability-table and Home-finding readbacks; 130 availability rows were inspected and one written. The alert step succeeding does not itself mean an email was sent; this event is not the configured Numot brunch email watch.
- No pending editorial catch exists in this report. The two article `uncertainCount` entries are not two open tickets: no new/changed article observation was emitted, and the reviewed Amsterdam/Atlanta article decisions already exist in `monitoring/editorial-decisions.json`. This audit does not certify the complete historical database queue.
- One active MagicCon Codex heartbeat supervises the cloud workflow. Its saved prompt correctly reuses a successful run within 26 hours, forbids the local operational baseline, and separates optional Gmail. The unrelated MTG Events surveyor is paused. The receipt payload publisher is dispatch-only, not a second daily Gmail job.
- Cloud schedule is `15 17 * * *` (17:15 UTC; 10:15 PDT), with concurrency serialized. Actual scheduled starts September 17–19 were 20:19, 19:34, and 19:18 UTC. It is a daily check with observed scheduler delay, not an exact-time availability alarm. The daily heartbeat has no fixed clock time in its saved rule; recent observed turns include multiple checks in a day, but those reused cloud results rather than duplicating discovery.

## Findings, in priority order

### S1 — Important existing source pages are outside daily coverage

**Current gap, high priority before claiming readiness for incoming information.** A fresh read of the approved home, Experience, and Info pages found 18 linked nested detail URLs absent from `monitoring/watch-set.json`. Examples include panels/events, meet-and-greets, Creator Central, exhibitors, accessibility, badge details, and the play guide. The linked `/en-us/guests.html` overview is also absent.

The detector intentionally checks only newly added links: `scripts/lib/monitoring_detail_coverage.mjs:22` excludes URLs already present in the previous link set. Its path pattern at line 1 also excludes top-level `/en-us/guests.html`. The calling check at `scripts/monitoring_watch_check.mjs:343` requires an existing link baseline. As a result, a page can become useful without changing its already-existing overview link, and the report can remain `complete` without inspecting that page. The scoped coverage label is honest, but the heartbeat's broader guest/program promise exceeds the configured watch set.

Smallest correction: review and add the useful existing sources, including Guests, meet-and-greets, panels/events, and exhibitors; explicitly record intentionally excluded placeholders. Reconcile the current approved links against watched/excluded sources instead of comparing only newly added links, and include relevant top-level overview paths. Preserve a bounded first-party allowlist. Do not turn this into a general crawler.

Source examples inspected: [Panels & Events](https://mcatlanta.mtgfestivals.com/en-us/experience/panels-and-events.html), [Meet & Greets](https://mcatlanta.mtgfestivals.com/en-us/experience/meet-and-greets.html), [Exhibitors](https://mcatlanta.mtgfestivals.com/en-us/experience/exhibitors.html). The live Meet & Greets page returned HTTP 200 and still links to Amsterdam wristband information. That is an upstream contradiction to retain during onboarding, not verified Atlanta wristband policy. Merely discovering a page or catalog link must not publish its placeholder/copied content as current inventory.

### S2 — Routine Gmail coverage has no demonstrated freshness receipt

**Current proof gap, medium priority; not evidence of missed mail.** The last four completed heartbeat turns inspected (September 18–19) performed public workflow checks without a Gmail search or a separate private coverage status. The saved prompt calls Gmail optional and requests a window since the last successful private-source check, but does not name a durable checkpoint or require an explicit `checked`/`not_checked` result. Public green status therefore does not establish inbox freshness.

The available Gmail connector successfully executed a read-only canonical query for September 12 onward with zero results. A bounded September 1–19 positive-control search returned known official newsletters, proving the search capability works in this audit session. This does not prove it was available to every earlier scheduled turn, nor does a single query certify trip and receipt coverage. No message was modified.

Smallest correction: make the intended Gmail cadence explicit and retain a small private coverage receipt containing query IDs, checked-through time, capability status, and unresolved candidate reasons. Keep public-run success separate. If Gmail stays optional, consistently report it as not checked when skipped rather than letting unqualified “full coverage” imply mailbox coverage.

**Private ingestion remains deliberately bounded.** `docs/MONITORING_HYDRATION_CONTRACT.md:65` states the normalized adapter does not discover Gmail. The manual publisher requires deliberate payload review and reports `verification_required`; it cannot be described as an automatic receipt monitor. `docs/MVP_MONITORING_AGENT_DESIGN.md:215` forbids the daily agent from dispatching that publisher. Successful Gmail search does not prove receipt publication, flight auto-application, shared download, or Wallet rendering.

### S3 — Adding a URL does not review its existing content

**Demonstrated implementation behavior; future onboarding risk.** At `scripts/monitoring_watch_check.mjs:349`, a previously unconfigured source is accepted into its initial baseline without emitting a changed-source catch. Initial article intake likewise suppresses observations at line 403. This avoids a noisy initial import, but simply adding the S1 pages would not automatically interpret their current facts or announce already-present useful information.

Smallest correction: attach a one-time content review to each approved new source and deliberately route any useful current fact/announcement through existing editorial inputs. Then establish its normal change baseline. Include real new-source fixtures in the existing coverage/editorial tests; do not manufacture a live change just to test publication.

### S4 — Canonical monitoring instructions retain obsolete activation work

**Current documentation defect, low priority.** `docs/MVP_MONITORING_AGENT_DESIGN.md:238` still labels secret setup, a manual staging activation, and initial dedupe/privacy proof as a “Remaining activation gate,” despite the documented deployed runtime and live proof above. `docs/WORK_BACKLOG.md:184` also describes the old local-baseline daily sequence. These are plausible execution traps for a fresh agent.

Smallest correction: replace the obsolete activation section with the actual active state and remaining source/private-coverage limits, and mark the historical backlog entry as superseded by cloud-only supervision. The editorial contract already explicitly supersedes old article batching text at line 5, so that text is confusing but not the controlling behavior.

### S5 — Activity mixes legacy announcements and completed-update history under “needs review”

**Current presentation debt, medium priority; not three blocked surveyor catches.** The live signed-in viewport inspected by the main audit shows three old Changes entries: the August 22 flight update and two August 18 official-page announcements. Their persistence has two different causes:

- The two August 18 titles come directly from `public/monitoring-intake.json:27` and `:42`. Production still fetches and merges this compatibility file (`src/App.tsx:1233`). Both rows lack a `conceptKey`, so `coalesceMonitoringConcepts` cannot suppress them when canonical concepts exist (`src/lib/monitoringFindings.ts:74`). Notice-level legacy rows default to `needs-review` (`src/App.tsx:3101`), and `shouldShowActivityItem` imposes no age limit on monitoring history (`:3208`). These are retained historical announcements, not newly detected cloud work; their old next-action language can nevertheless look like unfinished agent work.
- “Atlanta flight changed” is emitted by the canonical flight-apply function only inside its changed-state branch, after recording the applied itinerary and immutable evidence (`supabase/migrations/20260822221053_canonical_trip_flights_and_surveyor_apply.sql:148`). The exact title is not a production fixture. The app maps its persisted unread concept to `needs-review` (`src/App.tsx:1703`). The urgency lifecycle intentionally releases the old flight notice from Hot without marking it read (`src/lib/monitoringNoticeLifecycle.test.ts:23`). Retaining unread history is legitimate; this UI label does not mean the itinerary update is waiting for approval. This source-path diagnosis is not a new database readback of the historical itinerary.

Changes includes all nonarchived change-like entries, including already-read history (`src/App.tsx:7028`), so its count is not a pending-action count. `Mark read`/`Ignore` are generic review controls (`:7143`); they do not execute another flight update. The current Hot 0 and quiet Home behavior are consistent with the intended urgency fix.

Smallest correction: retire or canonically key the two compatibility announcements while preserving their history/review preferences, and label historical factual updates “Unread” or “Applied update” rather than suggesting an unresolved review task. For the flight entry, expose the changed facts and a useful Trip link. Do not auto-dismiss genuine unresolved decisions or describe these three entries as current surveyor failures.

## Existing safeguards worth keeping

- Exact report timestamp and pending-snapshot matching; no refetch during acceptance (`scripts/accept_monitoring_baseline.mjs`, `scripts/lib/monitoring_baseline_acceptance.mjs`).
- Unknown intake kinds and blocked/missing terminal dispositions fail closure (`scripts/lib/surveyor_closure_contract.mjs:27`, `:75`). Unknown content gets exact-fingerprint editorial interpretation, not automatic noise.
- Verified Home announcement content/status/destination, stable fingerprints, preserved read/archive status, seven-day announcement expiry and 24-hour quiet sellout expiry.
- Replay does not advance the baseline; successful ordinary runs accept only after closure and the watched-alert step (`.github/workflows/daily-surveyor.yml:119`).
- Article failures fail the workflow. Other partial coverage can still be green by design, so artifact coverage must continue to be read separately from job success; this is not a current failure in the September 19 report.

## Validation and limits

Inspected contracts, workflow definitions, watch/query/editorial inputs, coverage/closure/baseline code, local automation definitions, recent heartbeat execution history, recent GitHub runs, the latest artifact and job steps, approved official-page links, and bounded read-only Gmail searches. No local operational monitor command was run. No full historical database queue or private ingestion end-to-end claim is made. The main UI audit owns actual Home and broader app viewport acceptance.
