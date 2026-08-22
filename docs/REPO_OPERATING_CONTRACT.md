# Repo Operating Contract

Updated: 2026-08-21

This is a small personal MagicCon companion app, not an enterprise deployment program. Optimize for fast useful iteration, honest state, low ceremony, and reliable public behavior.

## Core posture

- Known environment constraints are part of the repo, not new issues.
- Use package scripts and documented commands instead of improvised substitutes.
- Do not claim something is fixed or live until the public GitHub Pages app is verified when public behavior matters.
- Direct-to-main public publish is the normal workflow for bounded approved fixes. Do not stop for a fresh push approval unless scope, reversibility, credentials/auth/deploy safety, or confidence changed.
- Do not preserve obsolete paths “for reference” if they can still mislead execution.
- Do not overcorrect with broad new ceremony; remove wrong paths and use the right lane first.

## Authorization and handoff

Use this as the one canonical approval policy for repository work:

- A request to answer, explain, review, diagnose, or plan authorizes relevant read-only inspection and reporting. Do not implement unless Kavi also asks for a change.
- A request to change, build, fix, proceed, or resume authorizes the already-described, in-scope local edits and non-destructive validation when the bounded outcome is clear. When that outcome is on this repo's normal direct-to-main public-preview lane, the same request authorizes the expected commit, push, deploy wait, and public verification. Natural language is sufficient; never require an exact command such as `PUSH X`.
- Ask again only when the action becomes destructive, costly, materially scope-expanding, hard to reverse, or when credentials, auth, deploy safety, intended branch, or the exact contents to ship become ambiguous. An unrelated external write remains outside the direct-to-main exception.
- Root keeps the trusted user authorization and owns narrow integration/publication: exact staged-scope review, risk-tier validation, commit, push, and required CI/Pages or public verification. Delegated workers normally return their bounded diff and evidence; do not create a publish-only worker or transfer push to an agent whose transcript lacks Kavi's request.
- Repository policy cannot suppress a platform permission dialog. If the platform requires approval for a specific tool action, use its scoped approval UI; do not ask Kavi to type a proxy phrase in chat.

## Agent lifecycle and capability fidelity

- Use zero subagents by default for small or cohesive work. Crossing systems, surfaces, or proof lanes does not by itself justify decomposition.
- Use one fresh cohesive worker for a substantial context compartment. Add parallel workers only when their tasks are genuinely independent and parallelism will materially save time. Explicit user delegation remains binding.
- Root may coordinate and resolve bounded integration conflicts, and it owns exact staged review, risk-tier validation, commit, push, and required post-push verification. Root must not absorb a large implementation, research, browser-proof, or database tranche that it deliberately delegated.
- Do not create agents merely to satisfy process lanes. Retire them at phase end or compaction instead of accumulating long-lived workers; reuse only when the existing context still exactly matches the next bounded task.
- The repo is durable memory. Update frontier/backlog or a focused handoff for material decisions and unfinished substantial work, not for trivial edits with no durable state change.

## Recurrence doctrine

- A failure that recurs after being represented as fixed invalidates the prior fix. Treat the first recurrence as an incomplete prevention design, not as another isolated incident.
- Default ownership is agent execution or repository process until evidence proves that an external dependency changed after the prior verification.
- Stop feature work on recurrence. Establish the root cause, explain why the earlier correction did not prevent it, and encode the smallest durable prevention delta in code, a canonical script, a regression check, preflight, or the controlling instructions.
- A cleared symptom is `RECOVERED`, not `FIXED`. `FIXED` requires the original failing lane to pass and separate proof that the new guardrail detects or prevents the failure mode.
- Do not weaken this rule because the failure was hidden, recovered quickly, or did not reach the public app. Those facts change impact, not completeness.
- Only an explicit user statement that tokens are low may defer durable prevention. Record the debt, give the safe temporary state, and do not claim the issue is fixed.
- This is not permission for generic ceremony. The guardrail must target the demonstrated failure mode and should remove a fragile path rather than add duplicated checking.

## Execution standard

- Readiness is task-specific, not generic. Check a capability only when the task will use it and its state is uncertain:
  - browser/viewport inspection for UI, responsive, or deployed-app interaction work;
  - deployment visibility for public publish or public-state debugging;
  - authenticated Supabase/database execution for user-state or schema work.
- Use the smallest observable smoke test; a documented healthy lane need not be re-proved for unrelated work or duplicated before and after the same operation.
- If a platform/environment capability fails, run one bounded agent-accessible repair, retest that same capability once, then stop if it still requires host action. Report the exact failed capability, failed command/check, host-side fix, and proof command to run afterward.
- Do not retry the same failing command in variants, switch to WSL/Docker/admin/global reinstall paths, add wrappers, or continue coding through a missing capability unless the failure specifically requires that route.
- Expected project capabilities are assumed available once documented: Git writes through the approved lane, package scripts, Supabase-backed state, GitHub Pages deploy/verify, and browser/viewport inspection for visual work.
- If one of those known lanes errors, first assume agent execution failure: wrong lane, missing setup, fragile command construction, stale docs, or insufficient preflight.
- Browser inspection is a required capability for visual/UI work. Do not phrase it as "if available"; use it. If it cannot be used after recovery, say the visual verification failed and do not claim completion.
- Separate capability failures from product failures. A broken browser lane does not prove the app is broken, and a verified deploy does not prove the UI is correct.
- Recovery is not enough. For every recurring or preventable error, record and implement the prevention delta: the specific code, test, preflight, doc, script, command habit, or removed wrong path that should prevent recurrence.
- Hardening should simplify the path. Prefer one canonical command or standing rule over extra layers of duplicate checks.

## Product rules

- Supabase is canonical for meaningful authenticated user state.
- Browser storage is only for UI chrome, transient convenience, or read-only offline cache.
- Notes, event selections, hidden/not-for-me state, Activity review state, Prize Tix balance, and collaborative state must be Supabase-backed.
- Honest empty state is better than fake placeholder data.
- Never render raw long URLs in user-facing cards or drawers; use a concise labeled link or paperclip/external-link affordance. Anything that visually reads clickable must be clickable; otherwise restyle or remove it.
- UI should be compact, useful, and low-explainer.
- Shared preview quality matters: if Chris saw it, it should look real and honest.

## Canonical lanes

### Git writes

Use normal Git for read-only checks. Use the elevated Git lane immediately for `git add`, `git commit`, and `git push`. Do not rediscover `.git/index.lock` permission failures.

### Build and publish

Public behavior has four distinct states:

1. local code changed;
2. branch pushed;
3. GitHub Pages deploy succeeded;
4. public preview verified and cache-fresh.

Only the fourth state counts as live.

Use the smallest validation lane that still catches the real failure mode:

- Docs-only change with no workflow, command, generated-asset, or runtime effect: `pnpm validate:text` and `pnpm validate:secrets`; no build, browser check, or CI/Pages wait is required unless an external failure signal appears.
- Small app-code UI or routing fix in one bounded area: `pnpm build`, visual check of the affected flow, then root reviews the staged scope, pushes `main`, waits for the GitHub Actions Pages deploy, and runs `pnpm verify:public`.
- Public UI change with broader surface area, risk, or multiple touched files: `pnpm check:ship`, visual check of the affected flow, then the same root-owned publish and verification lane.
- Auth, persistence, workflow, monitoring, or data-shape change: use the heavier documented gate for that tier.

Do not default to `pnpm check:ship` for every small hobby-app UI tweak when `pnpm build` plus the required visual/public checks would catch the meaningful failure just as well.

For this one-user hobby app, a bounded fix that Kavi already approved should be shipped through that direct-to-main path without asking “push it?” again. Pause before pushing only when the change expanded beyond the approved scope, the push would be destructive or hard to reverse, credentials/auth/deploy state became unsafe or ambiguous, or you are no longer confident what will ship.

Do not blame “propagation” by default. First prove whether the commit was pushed, whether the Pages workflow ran for that commit, whether the live `magiccon-build-sha` matches the deployed build, and whether any remaining mismatch is actually CDN/browser cache instead of old code still being deployed.

### Vite and Node

Node is the build/tooling layer, not a user-facing runtime complication. Use the package scripts that already encode the correct Vite config-loader path. Do not run raw `vite` or raw `vitest` commands when a package script exists.

pnpm is Corepack-managed on the native Windows host. Use normal `pnpm` or `corepack pnpm`; do not reinstall pnpm globally with npm. If pnpm acts strange, first check `where.exe pnpm`, `pnpm --version`, and `corepack pnpm --version` before diagnosing app code. A non-admin `corepack enable` shim-write failure under Program Files is not a product blocker.

For browser-dependent visual work, use `pnpm ui:capture -- -Route <route>` after the build as the required viewport proof. Run a separate early browser smoke only when that capability is uncertain. The capture command serves the built app preview and returns URL/title, visible text, DOM, and screenshot evidence.

### Monitoring

Run `pnpm monitor:check` first. Use `pnpm monitor:accept` only after a baseline or changed source has been reviewed and accepted. Do not invent parallel monitoring verifiers.

### PowerShell and scripts

Keep PowerShell URL construction and argument passing simple. If a quoting/interpolation pattern is brittle, fix the canonical script once instead of bypassing it with ad hoc commands.

### Public cache and mobile review

Verify the public cache-busted URL before interpreting stale mobile screenshots. If the public asset is current but the device is stale, treat that as browser/PWA cache first.

## Failure ladder

When something fails:

1. Check `docs/KNOWN_GREMLINS.md`.
2. Use the canonical repo command, not a substitute.
3. If the failure is a known sandbox, network, Git, or cache constraint, use the documented path immediately.
4. If public behavior is involved, verify public deployment before changing code again.
5. For a new failure, one bounded diagnosis/repair cycle is allowed. If a symptom recurs after any claimed fix, apply the recurrence doctrine immediately; there is no additional retry allowance.

Environment friction that has already been discovered is operating procedure. Repeating it without using the known lane first is an agent execution failure.
