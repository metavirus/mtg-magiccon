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

## GitHub Pages worktree ownership

**Symptom:** `fatal: detected dubious ownership in repository at '.../tmp/gh-pages'`.

**Cause:** The `tmp/gh-pages` worktree is owned by the normal Windows user, while the sandbox may run as `CodexSandboxOffline`.

**Do this:**

- For read-only inspection of `tmp/gh-pages`, use the elevated Git path immediately.
- Do not mutate global Git config with `safe.directory` unless Kavi explicitly asks for that local machine setting.
- Do not treat this as a repository corruption issue; it is an expected Windows/sandbox identity mismatch.

## Vite config-loader failures

**Symptom:** esbuild cannot resolve `vite.config.ts`, or tries to read broad parent directories.

**Cause:** The managed sandbox dislikes Vite's default config bundling path.

**Do this:**

- Use project scripts, not raw `vite` commands.
- `pnpm dev`, `pnpm preview`, `pnpm build`, and `pnpm test` intentionally use `--configLoader runner`.
- If a project script fails now, treat it as a real defect; do not workaround with random alternate ports or raw Vite invocations until the scripted path is inspected.

## GitHub Pages publication

**Symptom:** Kavi still sees old UI after “publish,” or public HTML points at an old bundle.

**Cause:** There are three different states: built locally, synced into `tmp/gh-pages`, and publicly served by GitHub Pages. Browser/PWA cache can add a fourth stale state.

**Do this:**

1. `pnpm publish:pages`
2. Commit/push the `tmp/gh-pages` worktree when public review is requested.
3. Run `pnpm verify:public`.
4. Only say “published” after public verification passes.

If public verification fails after a correct push, report propagation/cache lag and wait briefly. Do not claim success from local sync alone.

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

## Visual/reponsive misses

**Symptom:** Kavi has to send repeated screenshots of the same broken element.

**Cause:** Patching CSS without inspecting the actual rendered viewport, or duplicated desktop/mobile UI paths.

**Do this:**

- After one visual miss, inspect DOM/CSS at the affected viewport.
- After two visual misses, stop patching and look for duplicated components, stale public bundle, or cascade conflict.
- For navigation, person bubbles, notes, receipt proof, and object drawers, prefer one source of truth over separate mobile and desktop implementations.
