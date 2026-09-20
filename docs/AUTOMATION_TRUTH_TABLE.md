# Automation Truth Table

Updated: 2026-09-19

This file is the short answer to “what actually happens automatically?” A green process proves only the closure listed here. Names, summaries, and documentation must not claim a broader outcome.

| Lane | Trigger | Actual side effect | Required closure | Does not prove |
|---|---|---|---|---|
| CI | Pull request or push to `main` | Builds and runs the complete repository test and validation gate | `pnpm check:deploy` exits successfully | Public deployment, signed-in behavior, offline behavior, or visual correctness |
| GitHub Pages deployment | Push to `main` or manual dispatch on `main` | Runs the complete deploy gate, prepares the Pages artifact, and deploys it | Tests and validations pass before `actions/deploy-pages` succeeds | CDN freshness, authenticated product readback, or visual correctness; run `pnpm verify:public` and inspect affected viewports |
| Daily MagicCon surveyor | Daily GitHub schedule or manual dispatch | Fetches the approved public watch set, stages/reconciles supported findings, verifies closure, sends every watched Ticketed Play alert, and advances only the exact successful report baseline | Every transition has either canonical readback or retained-evidence readback; closure verification and alert delivery succeed before baseline/cache save | Gmail discovery, human review, normal-user UI visibility, or offline-device hydration |
| Surveyor replay | Manual dispatch with `replay_run_id` | Restages a retained failed report | Staging and closure verification succeed | Refetching, alert delivery, or baseline advancement |
| MagicCon supervisor heartbeat — public lane | Daily Codex heartbeat | Reuses a successful cloud run within 26 hours, waits for an active run, or dispatches one replacement for a stale/failed run; inspects coverage and handles retained editorial evidence under the editorial contract | Exact terminal workflow steps plus complete coverage and closure; Home-worthy findings require exact app projection readback | Immediate failure detection, Gmail coverage, or receipt ingestion |
| Supervisor Gmail coverage — private lane | Same heartbeat; due when the last complete private search is older than 24 hours | Searches all three canonical queries read-only via an available connector or already signed-in browser; overlaps the prior window, finishes pagination, and retains unresolved candidates | Ignored private receipt records `checked` / `partial` / `not_checked`, capability, query coverage and checked-through time; only a complete search advances freshness | Receipt publication, flight application, shared download, faithful Wallet proof, or offline readability; unavailable capability does not block the public lane |
| Manual receipt payload publisher (recovery) | Human workflow dispatch with a reviewed encrypted normalized payload | Writes normalized receipt facts, archival supplied HTML, purchase locks, and public Companion codes with database/Storage readback | Returns `payload_published` and `completion.status: verification_required` | Gmail discovery/extraction, a showable Gmail-looking proof, shared-user retrieval, Wallet rendering, offline completeness, or end-to-end receipt ingestion |
| Receipt device proof pack | Authenticated app refresh | Downloads and caches every authorized receipt artifact known to the read model | Device reports cached/expected counts and cached artifacts reopen offline | Proof readability, Gmail fidelity, QR validity, or artifacts absent from the server read model |

## Manual tools

The September 19 activation and quiet repeat verified the expanded 35-source watch set, initial-source review, coverage, closure, and exact baseline acceptance. The separate first complete Gmail check found no newly unhandled message; the known hotel-original binding gap remains unresolved intake work. These are dated proofs, not a claim of perpetual freshness. See `SURVEYOR_AUDIT_2026-09-19.md`, `SURVEYOR_SOURCE_ONBOARDING_2026-09-19.md`, and `PRIVATE_MONITORING_COVERAGE.md`.

The following are operator tools, not resident automation: `ticketed:precanon`, `ticketed:hydrate-static`, `info:ingest`, catalog photo/image commands, artifact migrations, and receipt payload publication. Their existence does not imply that a scheduler, mailbox watcher, crawler, or automatic reviewer runs them.

`pnpm monitor` is the public-source detector only. The authoritative daily lane is the GitHub workflow; do not compare its cloud baseline with ignored local monitoring state. `pnpm prepare:pages` prepares a validated artifact but does not deploy it.

## Failure rule

If any lane fails after previously being called fixed, stop feature work on that lane. Preserve the failed report, identify why the prior prevention did not catch it, add a deterministic regression guard, rerun the original path, and verify the advertised closure before describing it as restored.
