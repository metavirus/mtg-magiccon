# Anti-waste operating mode

This is a small hobby companion app, not an enterprise program. Use the narrowest safe workflow that matches the risk of the change.

Known environment constraints are part of the operating model. Do not rediscover them, narrate them as surprises, or prove documented failures still fail. Check `docs/KNOWN_GREMLINS.md`, choose the correct lane first, and only add new process when it removes a wrong path.

## Anticipation standard

For known project lanes, choose the expected working path before running commands. This applies to Git writes, package scripts, public deploy/verification, Supabase-backed state, browser/viewport inspection, and Windows/PowerShell quoting.

If a known lane still fails, treat that first as an agent execution failure until evidence says otherwise. Fixing the immediate symptom is not sufficient. When the failure is user-visible, the handoff must include the prevention delta: the doc, script, command habit, or removed wrong path that makes recurrence less likely. Do not add broad triple-check ceremony as penance; encode the smallest durable correction.

## Change tiers

### Tier -1 — docs or operating-model hardening

Use for documentation, instructions, and process cleanup that does not change app code, workflows, auth, data shape, monitoring behavior, or public UI.

- Read `docs/REPO_OPERATING_CONTRACT.md`, `docs/KNOWN_GREMLINS.md`, and the directly affected docs.
- Use targeted `rg` searches for stale commands, contradicted state, or obsolete paths.
- Run `pnpm validate:text` and `pnpm validate:secrets`.
- Do not run build, browser verification, readiness, or public deploy checks unless the docs change affects commands, workflows, generated assets, or runtime behavior.
- If the audit finds stale actionable instructions, patch or delete them. Do not leave them as “historical context” unless they are clearly marked superseded.

### Tier 0 — small visual/copy fix

Use for CSS, copy, spacing, icon, and layout changes that do not touch data shape, authentication, storage, migrations, monitoring, receipts, or source evidence.

- Read only the directly relevant code and the current user complaint.
- Do not re-open the full project documentation set unless the change depends on product history.
- Do not run database/readiness gates unless publishing or auth/data behavior is involved.
- Verify with `pnpm check:ui`.
- If the issue is visual or mobile-specific, inspect the affected public or local viewport before claiming it is fixed. Browser or viewport inspection is mandatory, not optional; if it is unavailable, recover that lane or stop before saying the visual fix is done.
- If the same visual target fails twice, stop patching symptoms and find the duplicated component, CSS cascade, cache, or publish root cause.

### Tier 1 — public preview UI change

Use when the change will be pushed to GitHub Pages or reviewed on iPhone.

- Run `pnpm check:ship`.
- Push `main` after a bounded approved fix. GitHub Actions deploys the `dist/` artifact to Pages.
- Only `main` is allowed to publish the shared public Pages site. Feature branches may be reviewed locally or merged first; they should not overwrite the public preview.
- After the Pages workflow completes, run `pnpm verify:public`. That script prepares the local Pages-stamped comparison artifact itself.
- If public verification needs network access, run that exact script with the elevated/network-capable path; do not first invent a different verification method.
- For visual changes, inspect the affected public or local viewport in the browser. `verify:public` proves bundle freshness, not layout correctness, and must not be treated as a substitute for browser inspection.
- Treat “published” as true only after a cache-busted public URL serves the expected current asset or visible behavior.
- If public Pages still shows stale behavior, say “pushed but not propagated/cached yet,” not “fixed.”
- If any known environment/publish/cache/auth/Git failure appears, follow `docs/KNOWN_GREMLINS.md` before inventing a new workaround.

For this app, do not add a separate “ask to push” step once Kavi has approved the bounded work. The public app is the review target. Validate, commit, push to `main`, wait for deploy, verify live, and report. Pause before push only if scope expanded, the change is destructive or hard to reverse, credentials/auth/deploy state is unsafe or ambiguous, or confidence about what will ship has dropped.

### Commit/publish discipline

- Use read-only Git normally, but use elevated Git immediately for `git add`, `git commit`, and `git push`.
- Do not narrate predictable environment friction as surprising progress. If a known gremlin applies, follow the documented lane quietly and report only the outcome.
- Do not add new scripts or verification wrappers without running them once in the same environment and fixing obvious quoting/path/network assumptions before relying on them.
- For operational files (`.github/workflows/*`, publish scripts, auth config, Supabase migrations/policies, persistence wiring), change one moving part at a time unless the dependency chain is explicit and unavoidable. Do not bundle speculative cleanup with functional fixes.
- Before changing a command, workflow, or script, inspect the existing project script/consumer first. Do not improvise a raw replacement for a scripted path that already exists.
- `pnpm publish:pages` is a local artifact/preflight command only. It does not publish the public site by itself under the current GitHub Actions Pages model.

### Error visibility without ceremony

Quiet execution is good; hidden failure is not. Known environmental friction should be handled without theatrical rediscovery, but agent-caused mistakes must be visible.

Report a mistake when any of these are true:

- a pushed commit causes a red GitHub Actions run, failed deploy, broken public page, or user-visible failure email;
- a command/script was wrong, run in the wrong lane, or claimed success without the required verification;
- a data/auth/persistence change stores user state in the wrong place or breaks cross-device continuity;
- a repeated visual defect shows that the wrong viewport, stale bundle, duplicated component, or CSS cascade was not inspected.

When reporting a mistake, keep it compact and concrete:

1. what failed;
2. whether it was agent-owned, environment-owned, upstream-owned, or still uncertain;
3. whether the public app or user data was affected;
4. what correction was made;
5. what standing rule changed if this was a repeatable failure.

Do not pad the report with apology theater or a new checklist. Do not hide behind “usual sandbox” language when the failure was predictable from project docs. If a known gremlin was routed correctly and final state was unaffected, report the final outcome only unless Kavi asks for the trace.

### Tier 2 — user data, auth, receipts, monitoring, Supabase, or migrations

Use the full project gate:

- Read `README.md`, `docs/PROJECT_CONTEXT.md`, `CURRENT_FRONTIER.md`, and `docs/WORK_BACKLOG.md`.
- Run `pnpm readiness`.
- Follow `docs/CHANGE_CONTROL.md`, `docs/EFFICIENCY_SOP.md`, and `docs/COLLABORATION_SOP.md`.
- For database changes, prove identity, migration behavior, RLS, grants, live readback, and validation proportional to risk.

## Product simplicity rules

- Remove or rewrite obsolete actionable paths instead of preserving them as confusing alternatives.
- Prefer deleting duplicated UI paths over styling each copy. Navigation, person bubbles, notes, object drawers, and receipt proof display must have one shared source of truth.
- Browser storage is only for UI chrome, auth-mode convenience, and read-only offline cache. User-authored notes, event preferences, hidden/not-for-me state, Activity review state, and Prize Tix balance belong in Supabase.
- Do not build placeholder controls. Empty is better than fake.
- Do not continue polishing a fixture surface after it is accepted unless real data or a real device defect exposes a problem.
- Do not replace the stack casually. Vite is acceptable for this React/TypeScript PWA; reduce script/process friction before considering a rewrite.

## Assistant stop rules

- After two failed attempts on the same UI defect, stop and inspect the actual DOM/CSS/published asset path before making another patch.
- After any mobile-navigation or responsive claim, verify a phone-sized viewport.
- After any GitHub Pages publish claim, verify the public page with a cache-busting query or explicitly report that propagation is still pending.
- When public Pages looks stale, inspect the exact deploy workflow run and compare the live `magiccon-build-sha` to the expected artifact SHA before using the word “propagation.”
- If a fix starts requiring broad architecture work, pause and name the root cause instead of burning tokens on edge adjustments.
- If an operational fix creates a new external failure signal, stop feature work until the failure is understood, corrected, and documented in `docs/KNOWN_GREMLINS.md` or the relevant SOP.
