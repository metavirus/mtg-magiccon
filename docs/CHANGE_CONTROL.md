# Change Control

1. State scope, assumptions, architecture effect, and acceptance checks before substantial edits.
2. Preserve unrelated user changes and follow the active lane: bounded owner-approved hobby-app fixes may go directly to an up-to-date `main`; use `codex/*` plus a draft PR for project-level, risky, or independently reviewable work.
3. Keep changes small and reversible. Schema changes are forward migrations; never rewrite applied history.
4. For Supabase, verify current official docs, assert project identity, review SQL, apply once, read back, test RLS, and run advisors.
5. Update context/frontier/backlog when durable state changes.
6. Run the acceptance checks for the active risk tier in `docs/ANTI_WASTE_OPERATING_MODE.md`. Do not run the full database/release gate for a tiny CSS or copy fix unless the change is being publicly shipped or touches data/auth/research/monitoring.
   - Tier 0 visual/copy fix: `pnpm build` plus visual verification of the affected viewport.
   - Tier 1 public preview UI change: use `pnpm build` for one tightly bounded UI/routing fix or `pnpm check:ship` for broader changes, then visually verify, commit/push the source branch, wait for the GitHub Actions Pages deploy, and run `pnpm verify:public`.
   - Tier 2 data/auth/database/research/monitoring: full readiness, tests, validation, and proportional live verification.
7. Review the diff for copied baggage, secrets, unsafe policies, identity ambiguity, encoding drift, and unnecessary scope.
8. Commit intentionally. For a bounded owner-approved fix on the normal direct-to-main lane, complete the push/deploy/public-verification path without asking again. Pause or use a draft PR when scope, reversibility, credentials, deployment safety, or confidence changed.

If the change addresses a recurring failure, acceptance must include two distinct proofs: the original failing lane now succeeds, and a targeted guardrail catches or prevents the demonstrated cause. A successful retry without that second proof is recovery, not an accepted fix.

Never use destructive Git or database commands for routine change control.

## Operational-change guardrail

Treat workflows, publish scripts, auth wiring, persistence, and migrations as operational surfaces. They deserve stricter anticipation, not heavier ceremony.

- Inspect the caller and command order before editing.
- Change one operational variable per commit unless two changes are inseparable and the dependency is named.
- Do not combine “silence warnings,” “modernize tooling,” and “fix behavior” in one patch.
- If a pushed operational change produces a red external signal, stop and fix that signal before doing more product work.
- If Kavi would see the failure through email, mobile, or the public app, mention it directly in handoff even if it was fixed.
