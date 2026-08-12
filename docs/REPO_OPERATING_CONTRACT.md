# Repo Operating Contract

Updated: 2026-08-11

This is a small personal MagicCon companion app, not an enterprise deployment program. Optimize for fast useful iteration, honest state, low ceremony, and reliable public behavior.

## Core posture

- Known environment constraints are part of the repo, not new issues.
- Use package scripts and documented commands instead of improvised substitutes.
- Do not claim something is fixed or live until the public GitHub Pages app is verified when public behavior matters.
- Direct-to-main public publish is the normal workflow for bounded approved fixes. Do not stop for a fresh push approval unless scope, reversibility, credentials/auth/deploy safety, or confidence changed.
- Do not preserve obsolete paths “for reference” if they can still mislead execution.
- Do not overcorrect with broad new ceremony; remove wrong paths and use the right lane first.

## Execution standard

- Readiness is task-specific, not generic. Before substantive work, identify the critical capabilities the task depends on:
  - browser/viewport inspection for UI, responsive, or deployed-app interaction work;
  - deployment visibility for public publish or public-state debugging;
  - authenticated Supabase/database execution for user-state or schema work.
- Check those critical capabilities up front with the smallest observable smoke test. Observable means the tool returns usable state, not silence or a vague success.
- Classify capability state decisively: `READY`, `FIXED`, or `USER-HOST-ACTION REQUIRED`. Do not operate in a lingering "maybe usable" state.
- If a platform/environment capability fails, run one bounded agent-accessible repair, retest that same capability once, then stop if it still requires host action. Report the exact failed capability, failed command/check, host-side fix, and proof command to run afterward.
- Do not retry the same failing command in variants, switch to WSL/Docker/admin/global reinstall paths, add wrappers, or continue coding through a missing capability unless the failure specifically requires that route.
- Expected project capabilities are assumed available once documented: Git writes through the approved lane, package scripts, Supabase-backed state, GitHub Pages deploy/verify, and browser/viewport inspection for visual work.
- If one of those known lanes errors, first assume agent execution failure: wrong lane, missing setup, fragile command construction, stale docs, or insufficient preflight.
- Browser inspection is a required capability for visual/UI work. Do not phrase it as "if available"; use it. If it cannot be used after recovery, say the visual verification failed and do not claim completion.
- Separate capability failures from product failures. A broken browser lane does not prove the app is broken, and a verified deploy does not prove the UI is correct.
- Recovery is not enough. For a user-visible preventable error, record the prevention delta: the specific doc/script/command habit/removed wrong path that should prevent recurrence.
- Hardening should simplify the path. Prefer one canonical command or standing rule over extra layers of duplicate checks.

## Product rules

- Supabase is canonical for meaningful authenticated user state.
- Browser storage is only for UI chrome, transient convenience, or read-only offline cache.
- Notes, event selections, hidden/not-for-me state, Activity review state, Prize Tix balance, and collaborative state must be Supabase-backed.
- Honest empty state is better than fake placeholder data.
- If a control looks clickable, it should work or be removed.
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

- Small app-code UI or routing fix in one bounded area: `pnpm build`, visual check of the affected flow, push `main`, wait for the GitHub Actions Pages deploy, then run `pnpm verify:public`.
- Public UI change with broader surface area, risk, or multiple touched files: `pnpm check:ship`, visual check of the affected flow, push `main`, wait for the GitHub Actions Pages deploy, then run `pnpm verify:public`.
- Auth, persistence, workflow, monitoring, or data-shape change: use the heavier documented gate for that tier.

Do not default to `pnpm check:ship` for every small hobby-app UI tweak when `pnpm build` plus the required visual/public checks would catch the meaningful failure just as well.

For this one-user hobby app, a bounded fix that Kavi already approved should be shipped through that direct-to-main path without asking “push it?” again. Pause before pushing only when the change expanded beyond the approved scope, the push would be destructive or hard to reverse, credentials/auth/deploy state became unsafe or ambiguous, or you are no longer confident what will ship.

Do not blame “propagation” by default. First prove whether the commit was pushed, whether the Pages workflow ran for that commit, whether the live `magiccon-build-sha` matches the deployed build, and whether any remaining mismatch is actually CDN/browser cache instead of old code still being deployed.

### Vite and Node

Node is the build/tooling layer, not a user-facing runtime complication. Use the package scripts that already encode the correct Vite config-loader path. Do not run raw `vite` or raw `vitest` commands when a package script exists.

pnpm is Corepack-managed on the native Windows host. Use normal `pnpm` or `corepack pnpm`; do not reinstall pnpm globally with npm. If pnpm acts strange, first check `where.exe pnpm`, `pnpm --version`, and `corepack pnpm --version` before diagnosing app code. A non-admin `corepack enable` shim-write failure under Program Files is not a product blocker.

For browser-dependent visual work, prove the browser lane at the start with `pnpm ui:capture -- -Route <route>` after a build. The capture command serves the built app preview and uses Playwright to return URL/title, visible text, DOM, and screenshot evidence.

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
5. If the same symptom happens twice, stop patching symptoms and inspect the root cause: DOM, duplicated component, stale bundle, workflow order, or storage target.

Environment friction that has already been discovered is operating procedure. Repeating it without using the known lane first is an agent execution failure.
