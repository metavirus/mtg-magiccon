# Automation Truth Table

Updated: 2026-08-31

This file is the short answer to “what actually happens automatically?” A green process proves only the closure listed here. Names, summaries, and documentation must not claim a broader outcome.

| Lane | Trigger | Actual side effect | Required closure | Does not prove |
|---|---|---|---|---|
| CI | Pull request or push to `main` | Builds and runs the complete repository test and validation gate | `pnpm check:deploy` exits successfully | Public deployment, signed-in behavior, offline behavior, or visual correctness |
| GitHub Pages deployment | Push to `main` or manual dispatch on `main` | Runs the complete deploy gate, prepares the Pages artifact, and deploys it | Tests and validations pass before `actions/deploy-pages` succeeds | CDN freshness, authenticated product readback, or visual correctness; run `pnpm verify:public` and inspect affected viewports |
| Daily MagicCon surveyor | Daily GitHub schedule or manual dispatch | Fetches the approved public watch set, stages/reconciles supported findings, verifies closure, sends every watched Ticketed Play alert, and advances only the exact successful report baseline | Every transition has either canonical readback or retained-evidence readback; closure verification and alert delivery succeed before baseline/cache save | Gmail discovery, human review, normal-user UI visibility, or offline-device hydration |
| Surveyor replay | Manual dispatch with `replay_run_id` | Restages a retained failed report | Staging and closure verification succeed | Refetching, alert delivery, or baseline advancement |
| MagicCon supervisor heartbeat | Daily Codex heartbeat | Inspects the authoritative cloud run and dispatches one replacement when the latest suitable run failed or is stale | Exact cloud workflow reaches terminal success | Immediate failure detection; the daily cadence can leave a detection delay |
| Manual receipt payload publisher (recovery) | Human workflow dispatch with a reviewed encrypted normalized payload | Writes normalized receipt facts, archival supplied HTML, purchase locks, and public Companion codes with database/Storage readback | Returns `payload_published` and `completion.status: verification_required` | Gmail discovery/extraction, a showable Gmail-looking proof, shared-user retrieval, Wallet rendering, offline completeness, or end-to-end receipt ingestion |
| Receipt device proof pack | Authenticated app refresh | Downloads and caches every authorized receipt artifact known to the read model | Device reports cached/expected counts and cached artifacts reopen offline | Proof readability, Gmail fidelity, QR validity, or artifacts absent from the server read model |

## Manual tools

The following are operator tools, not resident automation: `ticketed:precanon`, `ticketed:hydrate-static`, `info:ingest`, catalog photo/image commands, artifact migrations, and receipt payload publication. Their existence does not imply that a scheduler, mailbox watcher, crawler, or automatic reviewer runs them.

`pnpm monitor` is the public-source detector only. The authoritative daily lane is the GitHub workflow; do not compare its cloud baseline with ignored local monitoring state. `pnpm prepare:pages` prepares a validated artifact but does not deploy it.

## Failure rule

If any lane fails after previously being called fixed, stop feature work on that lane. Preserve the failed report, identify why the prior prevention did not catch it, add a deterministic regression guard, rerun the original path, and verify the advertised closure before describing it as restored.
