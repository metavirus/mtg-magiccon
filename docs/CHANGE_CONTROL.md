# Change Control

1. State scope, assumptions, architecture effect, and acceptance checks before substantial edits.
2. Work on `codex/*` from an up-to-date `main`; preserve unrelated user changes.
3. Keep changes small and reversible. Schema changes are forward migrations; never rewrite applied history.
4. For Supabase, verify current official docs, assert project identity, review SQL, apply once, read back, test RLS, and run advisors.
5. Update context/frontier/backlog when durable state changes.
6. Run `pnpm build`, `pnpm test`, `pnpm validate:text`, `pnpm validate:secrets`, and `pnpm readiness`.
7. Review the diff for copied baggage, secrets, unsafe policies, identity ambiguity, encoding drift, and unnecessary scope.
8. Commit intentionally. Push and open a draft PR with exact verification evidence.

Never use destructive Git or database commands for routine change control.
