# Known gremlins and how not to waste time on them

This file exists because repeated avoidable errors are expensive. If one of these patterns appears, use the listed path instead of rediscovering the problem.

Core rule: a known environment-specific failure is no longer debugging. It is operating procedure. If the same sandbox, Git, PowerShell, Vite, network, cache, or publish failure happens again after the correct lane is documented here, that is an agent execution failure unless the documented lane itself changed.

Recurrence rule: if any failure returns after it was represented as fixed, the prior fix is disproven. Stop feature work on that first recurrence. Do not merely rerun the recovery. Determine why the previous guardrail failed or was absent, add a targeted durable prevention delta, then prove both the original lane and the guardrail. Until both pass, the state is recovered at best, never `FIXED`. This rule overrides the “after two attempts” troubleshooting thresholds elsewhere; those thresholds apply only to first-time diagnosis within one incident. Only an explicit user statement that tokens are low may defer the prevention work, and deferred work must not be called fixed.

Readiness rule: capabilities are task-specific. Check a capability only when the task will use it and its state is uncertain. Use the smallest observable smoke; do not duplicate it before and after the same operation. After one bounded repair and one retest, stop if the capability still needs host/user action.

## Root absorbs a large delegated tranche

**Symptom:** after deliberately delegating a substantial implementation, research, browser-proof, or database tranche, root starts doing that same large tranche and context grows out of control.

**Cause:** ownership of a substantial compartment became unclear, or its return contract was broad enough that root repeated the investigation. This does not include root's normal product judgment, exact staged review, tier-appropriate validation, commit, push, or post-push verification.

**Do this:**

- Stop duplicating the delegated tranche. Let its cohesive worker finish or, if that context is stale, retire it and dispatch one fresh worker.
- Root may continue coordination, bounded integration decisions, exact staged review, tier-appropriate validation, commit, push, and required post-push verification.
- Do not delegate small cohesive work or split one tightly coupled change among agents merely to satisfy a lane rule.
- For a justified handoff, send only the history needed for the bounded objective, boundaries, relevant files, acceptance criteria, and validation. Require a compact evidence-backed return instead of replaying the worker's transcript in root.

**Prevention:** use zero agents by default, anticipate context-heavy work before root absorbs it, and use one fresh cohesive worker for a substantial independently verifiable compartment. Duration is a warning signal rather than a rigid trigger. Keep root as user/product continuity and integration/publish owner; use parallel agents only for independent work with a real time benefit.

## Delegated publisher asks for a magic push phrase

**Symptom:** bounded work is already authorized, but the agent assigned to commit or push says it lacks direct user authorization and asks Kavi to type an exact phrase such as `PUSH <sha>`.

**Cause:** publication was unnecessarily delegated even though root holds the direct user request and is the trusted integration owner.

**Do this:**

- Do not ask Kavi for a proxy command.
- Stop the publish-only handoff. The delegated worker returns its bounded diff and evidence; root reviews the exact staged scope and owns commit, push, deploy wait, and required verification.
- Treat ordinary natural-language requests to change, build, fix, proceed, or resume an unambiguous bounded public-preview outcome as authorization under `docs/REPO_OPERATING_CONTRACT.md`; re-confirm only when its listed risk or scope conditions change.
- If the platform itself requires a scoped permission approval, use that approval UI. Repository rules cannot disable platform permission prompts.

**Prevention:** do not create publish-only agents. Root retains integration/publication responsibility and the trusted user authorization.

## Context compaction and frontier drift

**Symptom:** repeated context compactions cause frontier drift, retreading, opaque long-running work, or implementation to accumulate in the root chat.

**Cause:** a substantial context compartment was not separated early enough, stale agents were kept alive across phases, a delegated tranche was duplicated in root, or meaningful state existed only in chat.

**Do this:**

- Stop implementation as soon as compaction makes the active lane or completed state uncertain; do not code through compaction churn.
- Rebuild the handoff packet from `CURRENT_FRONTIER.md`, `docs/WORK_BACKLOG.md`, `git status`, `git log`, the dirty diff, and the latest user constraints.
- Retire stale workers. If the next substantial compartment is independently verifiable, dispatch one fresh cohesive worker with a narrow, limited-history task packet and compact evidence-return contract; add parallel workers only for genuinely independent work with a material time benefit.
- Root keeps coordination, bounded integration decisions, exact staged review, tier-appropriate validation, commit/push, and required post-push verification.

**Prevention:** the repo is durable memory. Update frontier/backlog or a focused handoff for meaningful decisions and unfinished substantial work, not for trivial edits.

## A small fix overlaps a dirty shared file

**Symptom:** a visually small request stays in root, but the target file already contains substantial unfinished work from another scope. Root then spends a long turn separating hunks, reconstructing a safe staged patch, and consuming the main conversation context.

**Cause:** task size was judged only from the requested behavior, without checking whether its implementation surface was already carrying another dirty scope.

**Do this:**

- Before classifying app work as a small root lane, inspect `git status` and the target-file diff.
- If the request overlaps a dirty shared file containing another substantial scope, treat the request as a separate context compartment even when the visible change is small.
- Give one fresh cohesive worker the implementation and exact-scope handoff. Root retains review, staged-scope ownership, commit, push, and public verification.
- Prefer separating or finishing the existing file scope before piling on another feature. Do not make manual cached-patch reconstruction the normal workflow.

**Prevention:** “small request” is not enough for the zero-worker lane; it must also have a clean or singly owned implementation surface.

## pnpm and Corepack on native Windows

**Symptom:** `pnpm` behaves oddly, hangs, or appears missing after host setup changes.

**Cause:** the shell may be stale, a shim may be shadowed, or Corepack may not be activated for that session. This is a host/tooling lane, not app code.

**Do this:**

- First run `where.exe pnpm`, `pnpm --version`, and `corepack pnpm --version`.
- Use normal `pnpm` or `corepack pnpm`; both are acceptable when healthy.
- Do not reinstall pnpm globally with npm.
- Do not diagnose app code until the package-manager smoke itself is healthy.
- A non-admin `corepack enable` failure caused by writing shims under Program Files is not a product blocker.

## Local UI browser capture

**Symptom:** visual work needs browser evidence, or a dev server/browser command is unclear.

**Cause:** visual QA needs a deterministic viewport lane. Vite dev dependency optimization can be noisier than the built preview path in managed environments.

**Do this:**

- Run `pnpm build` first.
- Run `pnpm ui:capture -- -Route <route>`.
- Treat `UI_CAPTURE: PASS` plus URL/title, visible text, DOM, and screenshot paths as the local browser-readiness proof.
- For authenticated or user-state UI, do not accept empty preview as proof. Use a deterministic local QA query through the same capture lane, for example `pnpm ui:capture -- -Route artists -Query "previewOwner=kavi&qa=artist-signing"`. This exercises preview auth plus seeded state without depending on Supabase OAuth/browser session freshness.
- If interactive browser control is needed and appears broken, apply the stale-tab recovery below before asking Kavi to refresh/restart the Codex task. Do not continue visual work blind.

## In-app browser stale error tab after local server restart

**Symptom:** the Codex in-app Browser can initialize, but a local app navigation/readback fails because the selected tab is a generated Chrome error page such as `data:text/html,...` from an earlier `ERR_CONNECTION_REFUSED`, or because `http://127.0.0.1:5173/` was not reachable when the tab first loaded.

**Cause:** the browser-control lane is real, but the selected tab can be stale or poisoned by a generated browser error document after Vite was down. Retrying the same selected tab is wasted effort and can look like browser control is broken when the actual issue is tab state.

**Do this:**

- First prove the local app server with a tiny HTTP read: `Invoke-WebRequest http://127.0.0.1:5173/`.
- If the server is not reachable, start one controlled Vite process with `pnpm dev --host 127.0.0.1`, keep that process, and retest HTTP once.
- Re-read/use the current `browser:control-in-app-browser` skill path if the browser runtime shape changed. The current bundled browser client exposes `setupBrowserRuntime()`.
- Do not keep driving a selected `data:` or Chrome error tab. Use `browser.user.openTabs()` to find the real `http://127.0.0.1:5173/` tab and `browser.user.claimTab(...)`, or open a fresh app tab after the server responds.
- A passing smoke must read observable page state: URL, title, visible text, DOM, or screenshot. Generic JavaScript output is not enough.
- If a fresh/claimed app tab still cannot be read after one reset and one retry, stop with the exact host action: close stale in-app Browser tabs, open `http://127.0.0.1:5173/` after Vite is running, or restart the Codex task. Do not continue visual work blind.

## Local Vite tab shows an older PWA shell

**Symptom:** `http://127.0.0.1:5173/` responds, but the user's actual tab lacks a just-built control or loads a hashed `/assets/index-*.js` bundle instead of `/@vite/client`.

**Cause:** a production service worker previously registered on the local origin can continue serving its precached application shell in front of a healthy Vite server. A clean Playwright context is not proof that the user's existing tab received current code.

**Do this:**

- Inspect the user's exact tab. In local development its first app script must be `/@vite/client`; a hashed `/assets/index-*.js` script proves the stale PWA shell is still in control.
- Keep the dev-only `/sw.js` middleware in `vite.config.ts`. It installs a network-only worker and removes obsolete asset caches without clearing authentication/localStorage.
- Reload the claimed tab until `/@vite/client` is present, then verify the requested control and content in that same tab.
- Do not report a local UI fix from a clean capture alone when the user's tab is the failing surface.

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

If `actions/configure-pages` reports `Get Pages site failed` with `Not Found`, the repository's Pages site is absent or disabled rather than stale. Confirm repository visibility and plan support before changing the workflow: the workflow `GITHUB_TOKEN` cannot create a Pages site, and GitHub rejects Pages creation for a private repository when the account plan does not support private Pages. Do not diagnose this as app, cache, or Supabase failure.

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

- Keep `actions/checkout` and `actions/setup-node` on current Node-24 majors, with project Node set to `24`.
- Prefer Corepack (`corepack enable` + `corepack prepare pnpm@... --activate`) over `pnpm/action-setup` so package-manager setup does not add another action runtime warning.
- With Corepack, do not set `actions/setup-node` `cache: pnpm` unless the workflow has already installed pnpm before `setup-node` runs. `setup-node` cache lookup can fail when pnpm is not yet on `PATH`.
- Keep GitHub Pages actions on the newest warning-free supported major in GitHub's Pages docs. For artifact upload, use `actions/upload-pages-artifact@v5` or newer because that path delegates to the Node-24 `actions/upload-artifact@v7` runtime.
- A successful Pages deploy with a visible Node runtime/deprecation annotation is not clean. Treat it as a workflow defect until the action pin or deploy path is updated.
- Do not present this as an app build failure when ship checks and deploy pass.
- After any workflow fix, inspect the latest run for both success and warning annotations before calling the deploy lane clean.
- If the latest official Pages artifact action still emits an upstream-owned warning, prove no supported warning-free Pages upload path exists before documenting it as unavoidable.
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

## GitHub CLI auth is not the same as Git push auth or host-shell auth

**Symptom:** `git push` works, or a Windows/host PowerShell says `gh auth login` succeeded, but Codex still gets `HTTP 401`, `invalid token`, `SEC_E_NO_CREDENTIALS`, or `gh auth status -h github.com` reports a bad or expired token.

**Cause:** Git credential manager, GitHub CLI, the Windows keyring, and the normal Codex command lane can be separate auth surfaces. A healthy Git remote push or host/elevated GitHub CLI login does not prove the `gh` token used by repo commands is valid.

**Do this:**

- The canonical `pnpm verify:github-runs -- -CommitSha <sha>` command proves its own repo-local GitHub identity. Run full `pnpm readiness` only when broader repository/branch/remote state is also in question.
- If the GitHub CLI check fails, run `pnpm gh:auth-local`, choose browser login, then retry the exact command; rerun `pnpm readiness` only when the broader gate is needed.
- `pnpm gh:auth-local` stores the GitHub CLI token under ignored `.codex-local\gh` and sets `GH_CONFIG_DIR` for the repo-local Codex lane. Do not print, inspect, or commit `.codex-local\gh\hosts.yml`.
- Do not use raw host/elevated `gh auth login` as proof for Codex readiness. It can succeed while the repo lane still fails.
- Do not keep trying `gh run ...` variants when readiness says the token is bad. Fix the CLI auth lane first.
- If GitHub CLI auth is unavailable but a read-only public check is enough, use the public Pages URL as a fallback and say that Actions visibility is unavailable; do not call the GitHub lane ready.

### Workflow-file push rejected despite healthy GitHub identity

**Symptom:** `git push` is rejected with “refusing to allow an OAuth App to create or update workflow ... without workflow scope” even though readiness identifies `metavirus` correctly.

**Cause:** GitHub identity and repository access do not prove the token has the separate `workflow` scope needed to change `.github/workflows/*`.

**Do this:** run `pnpm gh:auth-local`. The canonical auth script now checks for `workflow` scope and opens one bounded full GitHub authorization when it is missing. Do not use `gh auth refresh` in this repo-local lane; it previously invalidated the saved token without leaving a usable replacement. Then rerun `pnpm readiness` before pushing.

**Prevention:** readiness must fail when the repo-local GitHub token lacks `workflow` scope. Identity-only auth proof is incomplete for this repository because ordinary approved changes can include Actions workflows.

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
- The package scripts run Node with `--use-system-ca`; do not remove that flag unless the public-source fetch path is re-proven without it.
- If both Node fetch and the PowerShell fallback fail, treat it as a real network/source failure and report the exact source IDs.
- Do not replace the monitor with ad hoc browser scraping just because Node fetch alone failed.

## Surveyor mixed-batch status normalization

**Symptom:** `Daily MagicCon surveyor` completes the watch check but `monitor:stage` fails with PostgreSQL `23502`, reporting a null `monitoring_findings.status`.

**Cause:** Supabase bulk upsert normalizes missing properties across mixed row shapes. If classified rows specify `status` while an ordinary candidate omits it, the omitted value may be sent as null instead of receiving the database default.

**Do this:**

- Every row returned by `buildMonitoringCandidateRows` must carry an explicit status; the safe initial state for an unmapped candidate is `needs_review`.
- Run the mixed-batch regression in `src/test/stageMonitoringFindings.test.ts` before rerunning the workflow.
- After staging, summarization, closure verification, and any watched-event alert delivery succeed, run `pnpm monitor:accept-report` before saving the cache. That command promotes the exact timestamp-matched pending snapshots from the verified report; do not rerun `monitor:accept`, which refetches and could accept different source bytes. A failed or replay run must retain its report and closure-manifest artifacts without advancing the cache.
- To recover a retained failed report, manually dispatch `Daily MagicCon surveyor` with that failed run ID in `replay_run_id`; the replay stages the retained report through current code and does not alter the watch baseline.
- Do not repair this by weakening the database not-null constraint or by filtering out ordinary changed-source evidence.

**Prevention:** the candidate builder assigns `needs_review` before specialized informational/newsletter classifications override it, the regression test covers one ordinary row mixed with one informational row, and the workflow accepts the exact pending public snapshots only after the pure catch-to-closure validator proves one supported terminal disposition plus exact readback for every meaningful catch. Novel or blocked intake remains in the uploaded closure receipt and fails before baseline acceptance or save.

## Local heartbeat tries to use the cloud surveyor secret

**Symptom:** the Codex heartbeat finds public-source changes, then local `monitor:stage` fails because `SUPABASE_SECRET_KEY` is absent—even though the GitHub Actions secret was configured previously. A fresh cloud run may report zero changes because the ignored local baseline was also stale.

**Cause:** GitHub Actions secrets are write-only and cannot be retrieved into the local Codex process. The configured `SUPABASE_SECRET_KEY` belongs to the `Daily MagicCon surveyor` workflow; duplicating it into `.env.local`, `.secrets/database.env`, or a Windows user variable creates a second privileged credential lane and is not required. The accepted public-source baseline also lives in the workflow cache, so `.monitoring-state` on the workstation is not an authoritative daily-discovery baseline.

**Do this:**

- Do not use local `pnpm monitor:check` for heartbeat discovery or user notification. It remains a developer/diagnostic command whose ignored baseline may lag the cloud cache.
- Inspect the latest `Daily MagicCon surveyor` run first. Reuse or wait for a successful/active run within the standing 26-hour freshness window; dispatch `daily-surveyor.yml` on `main` only when the cloud run is stale, absent, or failed.
- Treat only the cloud workflow's successful staging, alert delivery, closure verification, and exact-report baseline acceptance as completion.
- Never ask Kavi to copy the GitHub Actions secret into a local file merely to close a public monitoring run. Never run local `monitor:accept-report` after local staging was blocked.

**Prevention:** the active heartbeat prompt names GitHub Actions as the exclusive public-source discovery and closure lane, explicitly forbids the stale local baseline and local staging/acceptance, and requires cloud-run freshness inspection before dispatch. This section is the repository-side authority if the automation is recreated.

## Zero-change surveyor stage exits with a Windows libuv assertion

**Symptom:** `monitor:stage` prints a successful zero-change projection, then exits with `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` from `src/win/async.c`.

**Cause:** the zero-change branch called `process.exit(0)` immediately after Supabase network work, interrupting undici/libuv handle teardown on the Windows Actions runner.

**Do this:** let the zero-change branch finish naturally. Keep the change-bearing staging path in the alternate branch; do not restore an explicit process exit or add a sleep-based workaround.

**Prevention:** `scripts/lib/stage_monitoring_findings_contract.test.ts` forbids a forced exit in the zero-change branch, and the two-run cloud proof requires the second run to complete with zero changed sources.

## Service worker / PWA cache

**Symptom:** iPhone or installed app shows an old shell after a successful deploy.

**Cause:** The app is a PWA. The public page may be fresh while a browser tab or installed shell is still using older cached assets.

**Do this:**

- Verify the public cache-busted URL first.
- Then ask for refresh/reopen only if the public asset check is current.
- Do not keep patching CSS if the device is simply serving an old bundle.
- For a deterministic local cold-offline proof, build first and run `pnpm ui:capture -- -Route <route> -Width 390 -Height 844 -Query "previewOwner=kavi" -OfflineReopen -ExpectText "<critical text>"`. Add `-ExpectImage "<selector>"` for a rendered image or `-ExpectAssets "asset-a|asset-b"` for exact precached proof files.

**Recurring completeness trap:** A route or image loading after one visit proves opportunistic cache warming, not a complete offline companion. Do not define an unapproved “critical subset.” The authenticated device hydration contract covers every user-visible production data/media lane and every permitted private receipt artifact, including originals. Public precache may exclude private data, but the authenticated device pack may not. Hidden QA/reference content, unrelated inactive corpora, first-time authentication, external destinations, and offline writes are the explicit exclusions. A partial private-proof download must remain visibly incomplete, and the contract tests must fail if artifact hydration is narrowed back to selected roles.

**Manual-warm cache-name trap:** A successful `cache.put()` is not proof that an offline `<img>` request can retrieve the response. The device asset warmer and Workbox `CacheFirst` route must use the same cache name (`magiccon-remote-images-v1`); `src/lib/deviceAssets.test.ts` guards that binding.

**Remote-QR-in-original trap:** Preserving a ticketed receipt's HTML does not preserve a QR loaded from an external URL. The protected original renderer blocks remote resources, and an offline device cannot fetch them anyway. Ticketed Gmail intake must fail closed when the source has no recognized QR, download the recognized QR as a separate immutable private artifact, and verify both objects by checksum before reporting `applied`; `scripts/lib/private_gmail_intake.test.ts` guards the boundary.

## Local preview server and ports

**Symptom:** preview/dev cannot be reached, port changes, or a local server hangs a tool call.

**Cause:** Vite dev/preview are long-running processes and local ports may already be occupied or sandbox-restricted.

**Do this:**

- Prefer public Pages for iPhone review.
- For local smoke tests, use `pnpm preview` only when needed and record the exact URL/port.
- Do not turn local server startup into a project blocker if `pnpm build` passes and the public preview is the actual review target.

## Scratch artifacts tripping validation

**Symptom:** `pnpm validate:text` or `pnpm check:ship` fails because temporary browser/debug files in the repo root are missing a final newline or otherwise fail text hygiene.

**Cause:** one-off verification artifacts were written into the tracked workspace instead of an ignored temp location.

**Do this:**

- Write browser/debug scratch files to the system temp directory or another ignored temp path, not the repo root.
- If a temporary repo-local artifact already exists, delete it before running text or ship validation.
- Do not treat this as a product or build failure; it is execution residue and should be cleaned up quietly.

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

### Hosted migration version drift after MCP apply

**Symptom:** a migration applies successfully through the hosted Supabase tool, but the locally guessed timestamp does not match the hosted migration version, so `pnpm readiness` reports migration identity drift.

**Cause:** the hosted apply operation assigns the canonical version; a preselected local timestamp is not authoritative. Renaming only after readiness fails catches the issue too late and has recurred.

**Do this:**

- Author the SQL outside `supabase/migrations/` (use an ignored temp path) while it is under review.
- Apply it to canonical project `pavjsexxbueuzhzgemgy` with the descriptive migration name.
- Immediately list hosted migrations, read the assigned version, and only then place the reviewed SQL in `supabase/migrations/<hosted-version>_<name>.sql`.
- Run `pnpm readiness` before any further feature or publish work.
- Never invent or preserve a local migration timestamp for an MCP-applied hosted migration.

**Prevention:** canonical migration files enter `supabase/migrations/` only after the hosted version is known. Readiness remains the guard that proves local/hosted identity, not the first signal that triggers the rename.

## Browser storage versus Supabase state

**Symptom:** notes, event preferences, hidden/not-for-me state, Activity review state, or Prize Tix differ across devices.

**Cause:** User state is being stored locally or seeded from fixture-only paths.

**Do this:**

- User-authored notes and user selections must use Supabase.
- Browser storage is allowed only for UI chrome, auth/preview convenience, and read-only offline cache.
- Before implementing a new interactive control, decide whether it is user state. If yes, route it through the Supabase-backed selection or notes layer, or explicitly park it.

### One continuity request makes every user surface look broken

**Symptom:** a red `User selections could not be refreshed` warning remains even though notes, selections, and activity reads are succeeding, or one optional history read makes unrelated user state disappear.

**Prevention:** load notes, selections, and activity history independently; commit each successful result; name only the failed resource; clear stale continuity errors after a fully successful refresh. Never wrap independent owner-state resources in one all-or-nothing `Promise.all`. Notes and `user_selections` reads must retry once after a stale Supabase auth-session refresh before surfacing failure. A notes-only failure belongs as a quiet retry notice on Notes, never as a red global banner across unrelated pages. If selections alone fail, show a low-drama sync notice, not a red global failure banner.

## Visual/responsive misses

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
