# Handoff — surveyor closed loop and documentation recovery

Updated: 2026-08-21

## Product correction — informational findings are not actions

This section supersedes the older official-links approval language below. The Magic Play link appearance is useful source evidence already visible in Activity; it must not ask Kavi to approve publishing a duplicate Activity alert. Official-link findings use `unread`, `read`, and `archived` review state, preserve labeled links in evidence, carry no action mapping or decision audit, and never mutate canonical facts. The specific official-links executor/RPC is retired. Consequence-aware authorization remains available only for future findings with a separate, real canonical effect. No baseline was accepted.

## Final closeout — live and verified

- Commit `f0fe3f1` (`Close the reviewed surveyor action loop`) was pushed to `main`.
- CI run `32520980614` succeeded.
- Pages run `32520980683` succeeded with zero annotations; `pnpm verify:public` passed.
- The deployed Activity flow passed desktop and mobile visual inspection.
- Manual `Daily MagicCon surveyor` runs `32521125551` and `32521224614` succeeded.
- Workflow-owned fingerprint `bc7e5a…` remained one Supabase row and its `occurrence_count` advanced to `2`, proving repeated-fingerprint deduplication.
- The obsolete undecided prototype row `fdb94…` was deleted.
- The GitHub workflow-scope recurrence was fixed durably in the readiness/auth scripts and canonical instructions included in `f0fe3f1`.
- The real workflow-created finding remains `needs_review`. This is now Kavi's explicit product decision; agents must not click or decide it.
- No monitoring baseline was accepted.

## Continuation update — consequence-aware execution implemented

- Hosted migrations `20260821193729 monitoring_finding_action_lifecycle` and `20260821194017 monitoring_action_rpc_invoker` are applied and match local filenames; `pnpm readiness` passes.
- A named Kavi approval now calls one RLS-governed atomic RPC. The supported Magic Play action idempotently publishes a reviewed source-evidence Activity alert, records canonical target/result and verification evidence, and never normalizes facts or accepts baselines. Staging is reserved for explicit blockers.
- The real finding `62b26e7d-bbbf-423f-a2d2-91ba10b03a80` remains undecided and has fresh official link evidence plus action label `Publish these reviewed links`.
- Kavi queue access, Chris zero-row privacy, non-Kavi RPC denial, forced RLS, explicit grants, and advisors are proven. The only security advisor warning is the pre-existing leaked-password-protection setting.
- The local workflow can no longer accept monitoring baselines. Candidate staging now maps only a deterministic allowlisted official-links class; unsupported findings remain unmapped/fail closed.
- `SUPABASE_SECRET_KEY` is still absent from GitHub Actions. Do not push/dispatch the fail-closed workflow until Kavi configures it through the hidden `gh secret set` prompt. No workflow run, dedupe proof, commit, push, Pages deploy, or public verification has occurred yet.
- A migration-version recurrence was fixed durably: MCP-applied SQL is now authored outside `supabase/migrations/`, then filed under the hosted-assigned version before readiness. See `docs/KNOWN_GREMLINS.md`.

## Read this first

Continue from `C:\Users\kavig\Documents\Codex\mtg-magiccon`. Read `AGENTS.md`, the operating contract/gremlins/anti-waste docs, `README.md`, `docs/PROJECT_CONTEXT.md`, `CURRENT_FRONTIER.md`, and `docs/WORK_BACKLOG.md`. Treat this file as the exact recovery checkpoint for the uncommitted surveyor tranche.

Before implementation, identify the bounded tranches and which are independently delegable. Every large independent tranche must go to a narrow subagent; the root chat coordinates, makes cross-tranche decisions, integrates, verifies the whole, and updates durable state. Do not load database, workflow, UI, documentation, and publication work into one chat again. Never silently downgrade a requested capability or absorb a delegable large tranche into the root chat. If delegation is unavailable, blocked by a higher-priority instruction, or unsafe because work is tightly coupled, disclose that before implementation and obtain Kavi's explicit approval before proceeding serially.

## User working contract

Kavi values real speed, decisive bounded execution, root-cause prevention for recurrence, minimal ceremony, actual visual judgment, honest uncertainty without timidity, and disciplined backlog placement. Supabase is truth. Shared trip/event and Black Lotus context is not secret; Kavi's card-signing workbench/details remain private. Avoid filler UI and demo theater. When feedback rejects a version, fix the underlying design class. When Kavi is angry, identify the violated expectation, correct it, encode prevention, and continue without apology theater.

The durable version of this contract is now in `AGENTS.md`.

## Repository state

- Branch: `main`, aligned with `origin/main` before this tranche.
- Working tree: dirty, uncommitted, unpushed, unpublished.
- Do not discard or rewrite these changes. Inspect them with `git diff` first.
- Modified tracked files:
  - `.github/workflows/daily-surveyor.yml`
  - `AGENTS.md`
  - `CURRENT_FRONTIER.md`
  - `README.md`
  - `docs/ANTI_WASTE_OPERATING_MODE.md`
  - `docs/CHANGE_CONTROL.md`
  - `docs/DESIGN_BASELINE_2026-08-03.md`
  - `docs/KNOWN_GREMLINS.md`
  - `docs/MONITORING_HYDRATION_CONTRACT.md`
  - `docs/MVP_MONITORING_AGENT_DESIGN.md`
  - `docs/POC_FINISH_GLIDE_PATH.md`
  - `docs/PROJECT_CONTEXT.md`
  - `docs/REPO_OPERATING_CONTRACT.md`
  - `docs/V1_5_PATH.md`
  - `docs/WORK_BACKLOG.md`
  - `package.json`
  - `src/App.tsx`
- New files:
  - `scripts/stage_monitoring_findings.mjs`
  - `src/lib/monitoringFindings.ts`
  - `src/test/monitoringFindings.test.ts`
  - `supabase/migrations/20260821190241_monitoring_findings_review_queue.sql`
  - `supabase/migrations/20260821190839_index_monitoring_findings_decided_by.sql`
  - this handoff file

## What was implemented

1. `pnpm monitor` now aliases the canonical `monitor:check`, preventing stale handoffs from failing on a missing command.
2. `monitoring_findings` is a live Supabase review queue with:
   - SHA-256 fingerprint uniqueness;
   - first/last seen and occurrence count;
   - source evidence JSON separated from canonical facts;
   - statuses `needs_review`, `staged`, and `dismissed`;
   - yes/no decision semantics with `decided_by`, `decided_at`, and `staged_at`;
   - forced RLS and explicit Data API grants;
   - Kavi-only select/update policy through active `companion_members.person_key = 'kavi'`;
   - authenticated column-level update permission only for decision/audit fields.
3. `stage_monitoring_findings.mjs` converts the monitor JSON artifact into review candidates. It:
   - refuses any Supabase project except `pavjsexxbueuzhzgemgy`;
   - requires a modern server-only `sb_secret_...` key;
   - collapses identical shared-navigation link deltas across source pages;
   - upserts by fingerprint and increments occurrence count;
   - fails closed when the credential is absent (`--allow-missing` exists only for explicit local validation).
4. The GitHub Actions surveyor calls `pnpm monitor:stage` after the deterministic check. It remains public-watch-only: no Gmail, Discord, or LEAP browsing.
5. The app loads database findings only for Kavi. Its current provisional UI gives `Yes · stage` and `No · dismiss`; this proves the RLS/decision boundary but is explicitly not the accepted final closed loop. The consequence-aware replacement is specified below.
6. A query-only `qa=monitoring-findings` fixture supports deterministic viewport proof. It is not public product data.
7. The Kavi-only artist workbench remains guarded by `currentPerson === 'Kavi'`; a Chris mobile QA capture confirmed the workbench is absent.

## Live Supabase state

- Canonical project: `pavjsexxbueuzhzgemgy` (`mtg-magiccon`, ACTIVE_HEALTHY).
- Applied hosted migrations:
  - `20260821190241 monitoring_findings_review_queue`
  - `20260821190839 index_monitoring_findings_decided_by`
- Local filenames were corrected to those exact hosted versions; `pnpm readiness` passes migration identity.
- One real pending row exists:
  - id `62b26e7d-bbbf-423f-a2d2-91ba10b03a80`
  - title `Atlanta pages now expose Magic Play links`
  - status `needs_review`
  - fingerprint `fdb94a0f97f2e47396b20694c33bf0110d38eff17e6253476e99c5358fb2f187`
  - it summarizes the shared official navigation exposing Ticketed Play Schedule, On-Demand Events, Prize Tix/Prize Wall, and the play guide.
- RLS proof ran transactionally and rolled back:
  - Kavi could select and stage the row.
  - Chris saw zero rows and updated zero rows.
- RLS is enabled and forced. Policies and column grants were read back live.
- Security advisor found only the pre-existing project warning that leaked-password protection is disabled.
- Performance advisor initially identified the new unindexed `decided_by` foreign key; the follow-up index migration removed that finding. Remaining advisor items predate this tranche.

## Monitor result and baseline state

`pnpm monitor` passed with seven watched sources changed and zero failures. The meaningful shared signal was the new Atlanta Magic Play/Ticketed Play/Prize navigation. Several page hashes were dominated by the same shared-navigation change; older accepted baselines also predate labeled-link tracking.

No monitoring baseline was accepted or modified. Do not run `pnpm monitor:accept` until each changed source has been reviewed and intentionally accepted.

## Verification already completed

- `pnpm readiness` — passed after correcting migration filenames.
- `pnpm test` — 7 files, 27 tests passed, including two monitoring decision tests.
- `pnpm build` — passed.
- `pnpm validate:monitoring` — passed.
- `pnpm validate:text` — passed before the final documentation audit; rerun it.
- `pnpm validate:secrets` — passed before the final documentation audit; rerun it.
- `git diff --check` — passed before the final documentation audit; rerun it.
- Live migration/readback/RLS/advisor checks — passed as described above.
- Viewport captures passed and were visually inspected:
  - Activity 1440×1000 with the decision card.
  - Activity 390×844 with reachable Yes/No actions.
  - Home 390×844 with the pending finding in Worth Knowing.
  - Artists 390×844 as Chris; Kavi signing workbench was absent.

## Known agent mistakes and prevention

1. The first handoff said `pnpm monitor`, but the repository exposed only `monitor:check`. The failed command was process-owned. Prevention: `pnpm monitor` is now a tested alias.
2. The first database readback queried nonexistent `pg_tables.forcerowsecurity`. The corrected proof uses `pg_class.relforcerowsecurity`; schema/public state was unaffected.
3. The two local migration filenames initially did not match hosted versions assigned by the apply tool. Prevention: filenames were renamed to hosted versions and readiness was rerun successfully.
4. The root chat consumed excessive context despite Kavi explicitly asking for discrete dispatches. Prevention: the collaboration rule is now in `AGENTS.md`; this documentation audit itself used two narrow read-only subagents.
5. The prevention rule is now strengthened across `AGENTS.md`, the repo operating contract, anti-waste lane selection, and the compaction gremlin: pre-identify large chunks, delegate every independent large tranche, and never silently downgrade to root execution.

## Critical product correction — avoid approval purgatory

The provisional implementation and earlier sections of this handoff describe Yes→`staged`. Kavi has explicitly rejected that as the final product behavior because it can leave actionable findings waiting for a future chat request.

The next agent must explore and design consequence-aware execution before calling the surveyor loop complete:

- The decision control must say what Yes will do, not merely `Yes · stage`.
- A clear Yes is authorization for the stated action. If the source/target mapping, transformation, rollback, validation, and publish path are deterministic and bounded, execute the canonical update and production verification end to end immediately.
- No dismisses with audit.
- Stage only genuinely ambiguous or blocked actions. Every staged item needs a blocker, concrete next action, owner/wakeup mechanism, and visible execution state; never leave it in “wait for Kavi to ask in chat in three days” purgatory.
- Extend the data model beyond decision audit to action type/payload, execution status, canonical target/result, error/blocker, executed time, deploy/verification evidence, and retry/rollback semantics.
- Preserve the distinction between Kavi-approved bounded execution and parked unreviewed autonomous ingestion.

Treat the existing Yes→`staged` UI/schema as a proof of the review boundary, not as the accepted final workflow.

## Documentation audit and corrections

Two read-only subagents audited monitoring and broader project docs. Confirmed conflicts patched in this working tree:

- README fixture-default/`?auth=1` language contradicted auth-first `?preview=1` behavior.
- Change Control mandated `codex/*`, `check:ship`, and repeat push approval contrary to the controlling direct-to-main/smallest-safe-lane rules.
- Project Context still called monitoring and normalization future prerequisites after both existed.
- Monitoring design blurred the read-only Codex heartbeat with the GitHub surveyor's bounded evidence staging.
- Monitoring Hydration Contract still made tracked file replacement/publication the main active lane.
- POC Finish Glide Path and V1.5 Path still described the owner-reviewed inbox as future work.
- Current Frontier mixed historical POC claims, stale no-change baseline state, artifact-only surveyor behavior, and ticketed-play priority with the current credential blocker.
- Work Backlog said the cloud surveyor had no database writes without identifying that as the original artifact-only checkpoint.

Historical fixture/file behavior remains documented only when labeled legacy, preview, or historical. The current cloud intake lane is `monitor` → `monitor:stage` → Kavi decision. Unreviewed intake never becomes canonical automatically; a Kavi-approved named bounded action should execute end to end when its safety conditions are met.

## Exact blocker

As of August 21, `gh secret list` returned no repository Actions secrets. The local repo has a Session Pooler URL only, not a Supabase server API key. Do not substitute a publishable key, expose anonymous insert, or paste/request the key in chat.

Kavi must configure repository Actions secret `SUPABASE_SECRET_KEY` with a modern server-only key for canonical project `pavjsexxbueuzhzgemgy`. Until then, the new workflow intentionally fails at `monitor:stage`. Because the workflow change is unpushed, it has not caused a red CI run or email yet.

## Next bounded tranche

Dispatch this as a narrow operational task rather than doing it inline with unrelated work:

1. Confirm the dirty diff and rerun `pnpm readiness`.
2. Have Kavi configure `SUPABASE_SECRET_KEY` in GitHub Actions without sharing the value in chat.
3. Run `Daily MagicCon surveyor` manually.
4. Prove the workflow is green and stages/deduplicates a candidate. Repeating the same report must update the existing fingerprint/occurrence count, not create inbox spam.
5. Design and implement the consequence-aware action router above in separately delegated database, execution, and UI/proof tranches; do not preserve generic Yes→stage as the final workflow.
6. Read back the row/action audit and re-prove Kavi/non-Kavi RLS after schema/script changes.
7. Run tests, build, monitoring/text/secret validation, readiness, advisors, and desktop/mobile Home/Activity captures.
8. Review the complete diff. Then commit/push through the documented lane, wait for Pages, run `pnpm verify:public`, and visually inspect the deployed Kavi flow.
9. Update `CURRENT_FRONTIER.md`, `docs/WORK_BACKLOG.md`, and this handoff with the final commit, workflow run, action result, and public verification.

Do not restart random UI polish, change monitoring baselines, broaden ingestion, expose signing details, or begin production Plan work during this tranche.
