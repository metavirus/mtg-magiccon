# Known gremlins and how not to waste time on them

This file exists because repeated avoidable errors are expensive. If one of these patterns appears, use the listed path instead of rediscovering the problem.

Core rule: a known environment-specific failure is no longer debugging. It is operating procedure. If the same sandbox, Git, PowerShell, Vite, network, cache, or publish failure happens again after the correct lane is documented here, that is an agent execution failure unless the documented lane itself changed.

Readiness rule: capabilities are task-specific. If a task may require browser inspection, deployment visibility, or database writes, prove that capability with a small observable smoke test before substantive work. A silent tool call is not readiness. After two failed attempts on the same exact path, classify the path as failed for the session and switch lanes.

## Git writes in Codex sandbox

**Symptom:** `fatal: Unable to create .git/index.lock: Permission denied`.

**Cause:** The managed filesystem permits reading `.git` but may block writing Git internals.

**Do this:**

- Use normal Git commands for read-only checks: `git status`, `git diff`, `git log`.
- For `git add`, `git commit`, and `git push`, use the elevated Git path immediately.
- Do not first attempt a normal Git write and then “discover” the sandbox again.
- Only inspect `.git/index.lock` if the error happens during an already-elevated Git operation.

## Retired GitHub Pages worktree path

**Symptom:** Any instruction to inspect, sync, commit, or push `tmp/gh-pages`.

**Cause:** This project migrated to GitHub Actions Pages deployment. The old `tmp/gh-pages` generated-worktree path was too wasteful for this hobby app.

**Do this:**

- Do not use or revive `tmp/gh-pages`.
- For public review, push the source branch and let `.github/workflows/deploy-pages.yml` deploy `dist/`.
- Public GitHub Pages publication is now restricted to `main` only. Feature-branch pushes must not publish the shared public site.
- If a stale doc mentions `gh-pages`, update the doc instead of following it.

## Vite config-loader failures

**Symptom:** esbuild cannot resolve `vite.config.ts`, or tries to read broad parent directories.

**Cause:** The managed sandbox dislikes Vite's default config bundling path.

**Do this:**

- Use project scripts, not raw `vite` commands.
- `pnpm dev`, `pnpm preview`, `pnpm build`, and `pnpm test` intentionally use `--configLoader runner`.
- If a project script fails now, treat it as a real defect; do not workaround with random alternate ports or raw Vite invocations until the scripted path is inspected.

## GitHub Pages publication

**Symptom:** Kavi still sees old UI after “publish,” or public HTML points at an old bundle.

**Cause:** There are three relevant states: built locally, deployed by the GitHub Actions Pages workflow, and publicly served by GitHub Pages. Browser/PWA cache can add a stale client shell.

**Do this:**

1. Commit/push the source branch.
2. If the change is meant for the shared public site, it must be on `main`.
3. Wait for the GitHub Actions Pages workflow to complete.
4. Run `pnpm verify:public`; it prepares the Pages-stamped local comparison artifact before fetching the public URL.
5. Only say “published” after public verification passes.

If public verification fails after a correct push, report propagation/cache lag and wait briefly. Do not claim success from local sync alone.

**Concrete proof standard before saying “propagation”:**

- Check the exact target commit SHA locally.
- Check the latest `Deploy MagicCon companion to GitHub Pages` workflow run for that SHA/branch.
- Compare the live site's `magiccon-build-sha` meta tag to the expected local Pages artifact SHA.
- Only call it propagation/cache lag when:
  - the deploy workflow for the target SHA completed successfully, and
  - the live site still serves an older SHA.
- If the workflow for the target SHA did not complete successfully, this is not propagation. It is a deploy failure until fixed.

### GitHub Actions Node runtime warnings

**Symptom:** Pages deploy succeeds but GitHub emails or annotates: `Node.js 20 is deprecated... forced to run on Node.js 24`.

**Cause:** one or more workflow actions are still pinned to an older action major whose internal runtime targets Node 20. This is GitHub Actions plumbing, not the app's runtime.

**Do this:**

- Keep `actions/checkout` and `actions/setup-node` on their Node-24 majors (`@v6` at time of writing), with project Node set to `24`.
- Prefer Corepack (`corepack enable` + `corepack prepare pnpm@... --activate`) over `pnpm/action-setup` so package-manager setup does not add another action runtime warning.
- With Corepack, do not set `actions/setup-node` `cache: pnpm` unless the workflow has already installed pnpm before `setup-node` runs. `setup-node` cache lookup can fail when pnpm is not yet on `PATH`.
- Keep GitHub Pages actions on the newest supported major in GitHub's Pages docs. As of the cleanup commit, the only remaining warning is GitHub's internal `upload-artifact` dependency used by the Pages artifact action; do not churn the app to suppress that GitHub-owned non-blocking warning.
- Do not present this as an app build failure when ship checks and deploy pass.
- Do not batch workflow action-major upgrades, package-manager setup changes, and cache changes in one “cleanup” commit. Make the smallest operational change, let Actions prove it, then stop.

## GitHub Actions workflow edits

**Symptom:** a workflow fails immediately after a maintenance cleanup, especially with package-manager setup, cache, permissions, artifact, or Pages deploy errors.

**Cause:** workflow files are operational glue, not ordinary app code. Small-looking changes can alter ordering or environment assumptions that only Actions proves.

**Do this:**

- Inspect the existing workflow and `package.json` scripts before editing.
- Change the narrow failing/warning source only; do not modernize adjacent actions or options opportunistically.
- Preserve the proven command order unless the bug is specifically the order.
- If a workflow change is pushed and produces a red run or user-visible email, treat it as an agent-owned mistake until evidence proves otherwise. Fix the run before returning to feature work.
- After a workflow fix, check the latest GitHub Actions run rather than relying on local `pnpm` success.

### GitHub Actions Pages self-signed certificate failure

**Symptom:** `actions/configure-pages` fails with `Get Pages site failed` and `self-signed certificate; ... try running Node.js with --use-system-ca`.

**Cause:** the hosted Windows runner's Node-based action is not using the system certificate store for that Pages API call.

**Do this:**

- Keep `NODE_OPTIONS: --use-system-ca` in the Pages deploy workflow job env.
- Do not change app code, Supabase config, or the Pages artifact build for this symptom when `pnpm check:ship` and `pnpm build:pages` already passed.
- After the env fix, rerun or repush the same workflow path and verify the public page normally.

## GitHub Actions missing browser config

**Symptom:** Public GitHub Pages app shows “Project connection needed” even though local preview works.

**Cause:** Local `.env.local` is intentionally ignored, so GitHub Actions does not receive Vite browser env unless the workflow supplies it.

**Do this:**

- Keep the public Supabase URL and modern `sb_publishable_...` key in `.github/workflows/deploy-pages.yml`.
- Never use a `sb_secret_`, service-role key, database URL, or JWT in browser config.
- If the setup wall appears on public Pages, inspect the workflow env before changing app auth or Supabase UI code.
- Treat this as a CI configuration bug, not a user setup problem.

## Public Pages verification network lane

**Symptom:** `pnpm verify:public` fails with a PowerShell web request receive/TLS/network error after the URL is valid.

**Cause:** Public verification needs outbound network access and may fail inside the restricted sandbox.

**Do this:**

- `scripts/verify_public_pages.ps1` is the canonical verifier; do not write ad hoc curl/browser substitutes first.
- If `pnpm verify:public` fails with a network/receive/TLS error, rerun `pnpm verify:public` using the elevated/network-capable path immediately.
- A verifier URL construction error is a script bug. Fix the script once and commit it; do not bypass it.
- If the verifier itself was just edited, prove the script once before treating its output as authoritative.

## Monitoring web fetch certificate lane

**Symptom:** `pnpm monitor:check` or `pnpm monitor:accept` reports `fetch failed; cause: unable to verify the first certificate` for MTG Festivals pages.

**Cause:** Node's fetch can reject the certificate chain in this Windows/Codex environment even when the same URL opens normally through browser or Windows web tooling.

**Do this:**

- Use the project scripts as-is; `scripts/monitoring_watch_check.mjs` already falls back to PowerShell's Windows web stack.
- If both Node fetch and the PowerShell fallback fail, treat it as a real network/source failure and report the exact source IDs.
- Do not replace the monitor with ad hoc browser scraping just because Node fetch alone failed.

## Service worker / PWA cache

**Symptom:** iPhone or installed app shows an old shell after a successful deploy.

**Cause:** The app is a PWA. The public page may be fresh while a browser tab or installed shell is still using older cached assets.

**Do this:**

- Verify the public cache-busted URL first.
- Then ask for refresh/reopen only if the public asset check is current.
- Do not keep patching CSS if the device is simply serving an old bundle.

## Local preview server and ports

**Symptom:** preview/dev cannot be reached, port changes, or a local server hangs a tool call.

**Cause:** Vite dev/preview are long-running processes and local ports may already be occupied or sandbox-restricted.

**Do this:**

- Prefer public Pages for iPhone review.
- For local smoke tests, use `pnpm preview` only when needed and record the exact URL/port.
- Do not turn local server startup into a project blocker if `pnpm build` passes and the public preview is the actual review target.

## Supabase OAuth/provider setup

**Symptom:** Google login returns “unsupported provider” or redirects to `localhost:3000`.

**Cause:** Dashboard provider/URL configuration, not frontend code.

**Do this:**

- Verify Supabase project ref is `pavjsexxbueuzhzgemgy`.
- Check Supabase Auth provider enabled state, Client ID/secret, and URL Configuration.
- Check Google OAuth authorized JavaScript origins and redirect URI.
- Do not rewrite auth UI code before proving provider configuration.

## Supabase CLI telemetry writes

**Symptom:** `supabase migration new ...` fails because the CLI tries to write a telemetry file under `C:\Users\kavig\.supabase\...` and the managed sandbox blocks it.

**Cause:** the CLI writes outside the project workspace even for a harmless local migration-name command.

**Do this:**

- Create the migration file directly under `supabase/migrations/` with the timestamped name.
- Apply hosted database changes through the connected Supabase MCP/tooling after proving project ref `pavjsexxbueuzhzgemgy`.
- Do not retry the same CLI command first; that just burns time on a known sandbox edge.

## Browser storage versus Supabase state

**Symptom:** notes, event preferences, hidden/not-for-me state, Activity review state, or Prize Tix differ across devices.

**Cause:** User state is being stored locally or seeded from fixture-only paths.

**Do this:**

- User-authored notes and user selections must use Supabase.
- Browser storage is allowed only for UI chrome, auth/preview convenience, and read-only offline cache.
- Before implementing a new interactive control, decide whether it is user state. If yes, route it through the Supabase-backed selection or notes layer, or explicitly park it.

### One continuity request makes every user surface look broken

**Symptom:** a red `User selections could not be refreshed` warning remains even though notes, selections, and activity reads are succeeding, or one optional history read makes unrelated user state disappear.

**Prevention:** load notes, selections, and activity history independently; commit each successful result; name only the failed resource; clear stale continuity errors after a fully successful refresh. Never wrap independent owner-state resources in one all-or-nothing `Promise.all`.

## Visual/reponsive misses

**Symptom:** Kavi has to send repeated screenshots of the same broken element.

**Cause:** Patching CSS without inspecting the actual rendered viewport, or duplicated desktop/mobile UI paths.

**Do this:**

- After one visual miss, inspect DOM/CSS at the affected viewport.
- After two visual misses, stop patching and look for duplicated components, stale public bundle, or cascade conflict.
- For navigation, person bubbles, notes, receipt proof, and object drawers, prefer one source of truth over separate mobile and desktop implementations.

### Browser or viewport inspection treated as unavailable

**Symptom:** visual work is claimed complete after build/public verification, but no real viewport was inspected because browser control returned no useful state.

**Cause:** the visual lane was established too late, or a known browser-control/setup issue was treated as an external blocker instead of an agent execution/setup problem.

**Do this:**

- For visual work, establish and use a browser or viewport inspection lane before claiming done. Browser inspection is mandatory, not best-effort.
- If browser control returns unusable output, treat it first as agent setup failure: re-read/use the browser-control skill, recover the binding, or use another supported viewport inspection lane.
- Do not substitute `pnpm verify:public` for visual QA. It proves the deployed asset is fresh; it does not prove the UI looks right.
- If no viewport lane can be made available after recovery, stop and say visual QA was not completed before any publish/done language. Do not soften this as "browser if available"; the expected state is that the browser is available.

**Prevention:** visual fixes require both code validation and viewport evidence. Known browser-control friction is part of the operating model, not a new surprise. The agent should assume browser control should work and treat failure to make it work as an agent-side process failure unless proven otherwise.

## Mistake visibility

**Symptom:** a gremlin is fixed eventually, but Kavi only learns through GitHub emails, screenshots, or repeated prompts that something was wrong.

**Cause:** over-smoothing progress updates can hide the very signal needed to prevent recurrence.

**Do this:**

- If an agent-owned mistake creates a red CI/deploy run, failed public page, broken persistence, or visible UI regression, name it plainly.
- Distinguish mistake from friction: sandbox permission and network restrictions are environment friction only when the documented path was followed; wrong command order, wrong workflow edit, wrong storage target, or wrong viewport verification is agent-owned.
- Keep the report short: failure, impact, correction, prevention.
- Do not add broad new process as penance. Add or tighten the specific rule that would have prevented this exact failure.

## Public verifier assumes the wrong local artifact

**Symptom:** `pnpm verify:public` fails because `dist/index.html` lacks the Pages build marker after ordinary ship checks rebuilt `dist`.

**Prevention:** `verify:public` must prepare its own Pages-stamped comparison artifact. Run the single command; do not manually sequence `build:pages` and verification.
