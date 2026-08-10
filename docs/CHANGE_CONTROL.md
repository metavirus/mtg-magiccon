# Change Control

1. State scope, assumptions, architecture effect, and acceptance checks before substantial edits.
2. Work on `codex/*` from an up-to-date `main`; preserve unrelated user changes.
3. Keep changes small and reversible. Schema changes are forward migrations; never rewrite applied history.
4. For Supabase, verify current official docs, assert project identity, review SQL, apply once, read back, test RLS, and run advisors.
5. Update context/frontier/backlog when durable state changes.
6. Run the acceptance checks for the active risk tier in `docs/ANTI_WASTE_OPERATING_MODE.md`. Do not run the full database/release gate for a tiny CSS or copy fix unless the change is being publicly shipped or touches data/auth/research/monitoring.
   - Tier 0 visual/copy fix: `pnpm build` plus visual verification of the affected viewport.
   - Tier 1 public preview UI change: `pnpm check:ship`, commit/push the source branch, wait for the GitHub Actions Pages deploy, then `pnpm build:pages` and `pnpm verify:public`.
   - Tier 2 data/auth/database/research/monitoring: full readiness, tests, validation, and proportional live verification.
7. Review the diff for copied baggage, secrets, unsafe policies, identity ambiguity, encoding drift, and unnecessary scope.
8. Commit intentionally. Push only when requested or required by the current lane. Open a draft PR when this is project-level work rather than a small owner-reviewed hobby-app change.

Never use destructive Git or database commands for routine change control.
