# Known gremlins and how not to waste time on them

This file exists because repeated avoidable errors are expensive. If one of these patterns appears, use the listed path instead of rediscovering the problem.

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
2. Wait for the GitHub Actions Pages workflow to complete.
3. Run `pnpm build:pages` locally if `dist/` is not current, then `pnpm verify:public`.
4. Only say “published” after public verification passes.

If public verification fails after a correct push, report propagation/cache lag and wait briefly. Do not claim success from local sync alone.

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
