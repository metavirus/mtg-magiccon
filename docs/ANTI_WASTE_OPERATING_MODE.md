# Anti-waste operating mode

This is a small hobby companion app, not an enterprise program. Use the narrowest safe workflow that matches the risk of the change.

Known environment constraints are part of the operating model. Do not rediscover them, narrate them as surprises, or prove documented failures still fail. Check `docs/KNOWN_GREMLINS.md`, choose the correct lane first, and only add new process when it removes a wrong path.

## Proportional execution and root integration

Use zero subagents for small or cohesive work. For substantial work that benefits from context separation, use one fresh cohesive worker; parallelize only independent tranches when doing so materially saves time. Do not split work merely because it crosses systems or proof surfaces.

Root keeps the trusted user authorization and owns exact staged review, tier-appropriate validation, commit, push, and required CI/Pages or public verification. Delegated workers implement or investigate their bounded tranche and return evidence. Do not create publish-only agents, and do not ask Kavi to restate an already-authorized bounded request as `PUSH X`.

Root must not absorb a large delegated implementation, research, browser-proof, or database tranche. Retire workers at phase end or compaction, and persist only material durable state before a substantial handoff.

## Anticipation standard

For known project lanes, choose the expected working path before running commands. This applies to Git writes, package scripts, public deploy/verification, Supabase-backed state, browser/viewport inspection, and Windows/PowerShell quoting.

Readiness is task-specific. Check a capability only when the task will use it and its state is uncertain:

- Visual/browser-dependent task: use the required post-build viewport check as the capability proof; run a separate early smoke only when browser availability is uncertain.
- Public publish/debug task: confirm the expected branch/commit path; prove deployment visibility when post-push proof is actually required.
- Database/user-state task: confirm the Supabase project and authenticated execution path first.

Capability states are `READY`, `RECOVERED`, `FIXED`, or `USER-HOST-ACTION REQUIRED`. `RECOVERED` means the immediate symptom cleared but durable prevention has not been proved; it does not authorize a completion claim for a recurring failure. For a newly observed capability failure, do one bounded agent-accessible repair and retest that same capability once. If it still fails and requires host permissions or user action, stop immediately with the exact failed capability, failed command/check, host-side fix, and proof command to run afterward.

Do not retry the same failing command in variants, switch to WSL/Docker/admin/global reinstall work, add wrappers, or keep coding through a missing capability unless the failure specifically requires that route.

Keep cohesive work together. Delegate only a substantial context compartment or an independent parallel tranche with a real time benefit.

If a known lane still fails, treat that first as an agent execution failure until evidence says otherwise. Fixing the immediate symptom is not sufficient. Every recurring or preventable failure requires a prevention delta: the code, regression check, preflight, doc, script, command habit, or removed wrong path that prevents the demonstrated failure. A recurrence after a claimed fix triggers that work immediately; the retry thresholds below apply only to first-time diagnosis within one incident. Do not add broad triple-check ceremony as penance; encode the smallest durable correction.

## Change tiers

### Local-first default

During an active design/build session, keep ordinary UI and application iterations local. For each bounded change, run the proportional targeted tests/build and inspect the affected desktop/mobile viewport. Do not commit, push, wait for CI/Pages, or verify public caches after every intermediate adjustment.

Publish once at a meaningful checkpoint: Kavi explicitly says ship/publish/live; public or physical-iPhone review is needed; a coherent feature is complete; the session is pausing and needs a durable shared checkpoint; or the work inherently changes live automation, auth, persistence, monitoring, or shared data. Batch accepted local changes into one exact-scope integration and one deployment verification pass.

### Tier -1 — docs or operating-model hardening

Use for documentation, instructions, and process cleanup that does not change app code, workflows, auth, data shape, monitoring behavior, or public UI.

- Read `docs/REPO_OPERATING_CONTRACT.md`, `docs/KNOWN_GREMLINS.md`, and the directly affected docs.
- Use targeted `rg` searches for stale commands, contradicted state, or obsolete paths.
- Run `pnpm validate:text` and `pnpm validate:secrets`.
- Do not run build, browser verification, readiness, or public deploy checks unless the docs change affects commands, workflows, generated assets, or runtime behavior.
- A docs-only push does not require waiting for CI/Pages when no workflow, command, generated asset, or runtime behavior changed. Investigate if an external failure signal actually appears.
- If the audit finds stale actionable instructions, patch or delete them. Do not leave them as “historical context” unless they are clearly marked superseded.

### Tier 0 — small visual/copy fix

Use for CSS, copy, spacing, icon, and layout changes that do not touch data shape, authentication, storage, migrations, monitoring, receipts, or source evidence.

- Read only the directly relevant code and the current user complaint.
- Do not re-open the full project documentation set unless the change depends on product history.
- Do not run database/full-readiness gates. A public UI push needs the branch and GitHub publish lane, not Supabase/database readiness, unless auth or data behavior actually changed.
- Verify with `pnpm build` unless a narrower existing package script is clearly the canonical check for that exact surface.
- If the issue is visual or mobile-specific, inspect the affected public or local viewport before claiming it is fixed. `pnpm ui:capture -- -Route <route>` after the build can serve as both the browser-capability check and viewport proof. If interactive browser control is needed and appears broken, apply the stale-tab recovery in `docs/KNOWN_GREMLINS.md`; stop and request the exact host action after one reset and retry rather than continuing blind.
- For a first-time visual defect, stop patching symptoms after two failed attempts and find the duplicated component, CSS cascade, cache, or publish root cause. If a previously fixed visual defect recurs, do that root-cause work immediately on the first recurrence.

### Tier 1 — requested public preview UI change

Use only when the change is intentionally being pushed to GitHub Pages or reviewed on iPhone. Ordinary in-session UI iteration remains Tier 0/local-first until that checkpoint.

- Use the smallest validation lane that still covers the real risk:
  - one-file or tightly bounded UI/routing fix: `pnpm build`
  - broader UI change or anything touching multiple surfaces: `pnpm check:ship`
- Root reviews the exact staged scope, then commits and pushes `main` after a bounded approved fix. GitHub Actions deploys the `dist/` artifact to Pages.
- Only `main` is allowed to publish the shared public Pages site. Feature branches may be reviewed locally or merged first; they should not overwrite the public preview.
- After the Pages workflow completes, confirm the workflow completed cleanly. For workflow/deploy-lane changes, “clean” means no visible warning annotations as well as success. Then run `pnpm verify:public`. That script prepares the local Pages-stamped comparison artifact itself.
- If public verification needs network access, run that exact script with the elevated/network-capable path; do not first invent a different verification method.
- For visual changes, inspect the affected public or local viewport in the browser. `verify:public` proves bundle freshness, not layout correctness, and must not be treated as a substitute for browser inspection.
- Treat “published” as true only after a cache-busted public URL serves the expected current asset or visible behavior.
- If public Pages still shows stale behavior, say “pushed but not propagated/cached yet,” not “fixed.”
- If any known environment/publish/cache/auth/Git failure appears, follow `docs/KNOWN_GREMLINS.md` before inventing a new workaround.

Default fast lane for a requested public checkpoint:

1. edit the smallest relevant file(s);
2. run `pnpm build`;
3. visually check the affected flow locally or in the browser lane already established for the task;
4. commit and push `main`;
5. run `pnpm verify:public`;
6. do one final deployed click/view check of the exact affected flow.

Escalate above that fast lane only when the change touches auth, persistence, workflows, multiple broad UI surfaces, or a capability/readiness path is itself under question.

For this app, do not publish ordinary intermediate iterations. Once Kavi asks to ship/publish/live or another documented publish condition applies, do not add a separate magic “ask to push” step: root validates, reviews the staged scope, commits, pushes `main`, waits for deploy, verifies live, and reports. Pause only if scope expanded, the change is destructive or hard to reverse, credentials/auth/deploy state is unsafe or ambiguous, or confidence about what will ship has dropped.

### Commit/publish discipline

- Use read-only Git normally, but use elevated Git immediately for `git add`, `git commit`, and `git push`.
- Do not narrate predictable environment friction as surprising progress. If a known gremlin applies, follow the documented lane quietly and report only the outcome.
- Do not add new scripts or verification wrappers without running them once in the same environment and fixing obvious quoting/path/network assumptions before relying on them.
- Keep browser scratch artifacts and one-off verification files out of the repo root. Use an ignored temp path or the system temp directory so doc/build validation does not get polluted by debugging residue.
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

### Tier 2 — auth, persistence, monitoring, research, or database work

Use a proportional higher-risk gate:

- Read only the project context and specialized SOPs relevant to the affected surface.
- Run `pnpm readiness` before live Supabase/database writes, authenticated operational changes, or when repository/branch/remote identity is genuinely in question; do not run it for unrelated research or local-only work.
- For research, follow the methodology/source rules without adding database or publish gates unless the result will actually be written there.
- For database changes, prove canonical project identity, review the forward migration, verify live readback and RLS/grants, and run advisor checks proportional to the actual risk. Do not apply migration ceremony when no schema/data write exists.

## Product simplicity rules

- Remove or rewrite obsolete actionable paths instead of preserving them as confusing alternatives.
- Prefer deleting duplicated UI paths over styling each copy. Navigation, person bubbles, notes, object drawers, and receipt proof display must have one shared source of truth.
- Browser storage is only for UI chrome, auth-mode convenience, and read-only offline cache. User-authored notes, event preferences, hidden/not-for-me state, Activity review state, and Prize Tix balance belong in Supabase.
- Do not build placeholder controls. Empty is better than fake.
- Do not continue polishing a fixture surface after it is accepted unless real data or a real device defect exposes a problem.
- Do not replace the stack casually. Vite is acceptable for this React/TypeScript PWA; reduce script/process friction before considering a rewrite.

## Assistant stop rules

- For a newly observed UI defect, after two failed attempts stop and inspect the actual DOM/CSS/published asset path before another patch. A recurrence after a claimed fix skips those attempts and requires immediate root-cause and prevention work.
- After any mobile-navigation or responsive claim, verify a phone-sized viewport.
- For a newly observed browser-control failure, if readback fails twice on the same path after the documented stale-tab recovery, classify it as failed for the session and switch to a concrete alternate lane or exact host-action request. If that browser failure was previously represented as fixed, the first recurrence instead triggers the recurrence doctrine and requires a durable readiness correction before visual work resumes.
- After any GitHub Pages publish claim, verify the public page with a cache-busting query or explicitly report that propagation is still pending.
- When public Pages looks stale, inspect the exact deploy workflow run and compare the live `magiccon-build-sha` to the expected artifact SHA before using the word “propagation.”
- If a fix starts requiring broad architecture work, pause and name the root cause instead of burning tokens on edge adjustments.
- If an operational fix creates a new external failure signal, stop feature work until the failure is understood, corrected, and documented in `docs/KNOWN_GREMLINS.md` or the relevant SOP.
