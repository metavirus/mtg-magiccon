# Environment Readiness

This is a personal hobby application for one to three trusted users. Development uses the hosted Supabase project directly; readiness should protect identity, secrets, schema discipline, and deployable code without reproducing the hosted platform locally.

Run `pnpm readiness` before Tier 2 data/auth/database/research/monitoring work and before any change where repository, branch, remote, or Supabase identity matters. Do not make it a tax on every small CSS or copy adjustment. A pass proves:

- the exact repository path, GitHub `origin`, and an allowed branch;
- GitHub CLI is authenticated to `github.com` as `metavirus` and uses HTTPS for Git operations;
- Node, pnpm, Supabase CLI, and PostgreSQL `psql` are available;
- tracked configuration names only Supabase project `pavjsexxbueuzhzgemgy`;
- the local Supabase CLI link resolves to that exact project;
- checked-in migrations match the hosted migration history;
- ignored local credential files remain ignored;
- the project-specific Session Pooler URL uses port 5432 and requires SSL;
- a harmless live query reaches database `postgres`;
- the owner proof table still has forced RLS, four policies, update `USING` and `WITH CHECK`, no anonymous grants, and exactly the intended authenticated grants.

Application build, tests, text integrity, browser capture, and secret scanning remain separate acceptance commands so failures identify their actual layer. Use the light wrappers for ordinary UI work:

```powershell
pnpm check:ui
pnpm check:ship
pnpm ui:capture -- -Route explore
```

Use the individual commands when diagnosing a specific failure:

```powershell
pnpm build
pnpm test
pnpm validate:text
pnpm validate:secrets
```

Current local note, August 12, 2026: the native Windows host is the default lane. Node 24, Corepack-managed pnpm, Git, GitHub CLI, PostgreSQL tools, Python/uv, and Playwright are available. Do not use WSL, Docker, admin installs, or global pnpm reinstalls unless a concrete dependency requires them.

Git push auth, host-shell GitHub CLI auth, and Codex repo-lane GitHub CLI auth are separate lanes. `pnpm readiness` must pass before relying on GitHub Actions or deployment inspection through `gh`; if it fails, run `pnpm gh:auth-local`, complete the browser login, and rerun readiness. Do not use raw host/elevated `gh auth login` as proof for Codex readiness; the repo-local lane stores its token under ignored `.codex-local\gh`.

pnpm is Corepack-managed. Use normal `pnpm` or `corepack pnpm`; if pnpm acts strange, first run `where.exe pnpm`, `pnpm --version`, and `corepack pnpm --version`. A non-admin `corepack enable` failure while writing shims under Program Files is not a product blocker.

`pnpm dev`, `pnpm preview`, `pnpm build`, and `pnpm test` use Vite/Vitest's runner config loader path. For Codex visual verification, prefer `pnpm ui:capture -- -Route <route>` after `pnpm build`; it serves the built preview and uses Playwright to capture screenshot, DOM, and visible text. When the surface depends on logged-in/user-specific state, pass a deterministic local QA query instead of relying on OAuth, for example `pnpm ui:capture -- -Route artists -Query "previewOwner=kavi&qa=artist-signing"`.

For interactive in-app Browser inspection against local Vite, avoid stale selected tabs. First prove `http://127.0.0.1:5173/` returns HTTP 200, then claim or open a real app tab and read URL/title/visible text. If a prior failed load left Chrome on a generated `data:` error page, do not retry that selected tab; follow the stale-tab recovery in `docs/KNOWN_GREMLINS.md`.

## Secure local setup

Browser configuration lives in ignored `.env.local` and contains only the project URL and modern publishable key. Never place a secret/service-role key in browser configuration.

Direct database verification uses ignored `.secrets/database.env`:

```dotenv
SUPABASE_DB_URL=<project Session Pooler URL on port 5432 with sslmode=require>
```

Obtain the URL from the expected project's Connect dialog and enter it locally. Never paste it into chat or tracked files.

Treat `.secrets/database.env` as the only authoritative direct-database URL for this repo. Do not use an inherited shell-level `$env:SUPABASE_DB_URL` for project work; that variable can belong to another repo or Supabase project and may silently point at the wrong database. Project scripts that touch hosted data should read `.secrets/database.env` directly or go through `pnpm readiness` / the relevant validation script.

## Deliberately excluded

The readiness contract does not require:

- Docker Desktop, WSL, or a local Supabase container stack;
- a second local PostgreSQL database or replicated hosted data;
- a backend application server, ORM, microservices, or Kubernetes;
- secret/service-role keys in local application code;
- Edge Functions, Realtime, background workers, or automated research ingestion before a proven need;
- production hosting or deployment in the foundation tranche;
- multi-writer offline synchronization;
- enterprise staging environments, local/remote parity ceremony, or exhaustive schema scaffolding.

Docker and WSL may exist on a developer machine for unrelated work, but this repository neither checks nor depends on them. Reconsider a separate development database only if destructive migration rehearsal, team concurrency, sensitive test isolation, or repeated hosted-development friction creates a concrete need.

## Failure behavior

Never continue through repository, remote, Supabase project, migration, URL, browser-control, Node, pnpm, Playwright, Git, or GitHub ambiguity. Run one bounded repair cycle, retest the exact capability once, then stop with `USER-HOST-ACTION REQUIRED` if host action is still needed. Report the exact failed capability, failed command/check, host-side fix, and proof command. Do not substitute a different project, unguarded URL, elevated browser key, WSL/Docker path, admin reinstall, or blind product coding.

The bounded repair cycle applies to a newly observed readiness failure. If the same capability fails after it was previously represented as fixed, do not repeat the ordinary recovery and call it fixed again. Apply the recurrence doctrine in `docs/REPO_OPERATING_CONTRACT.md`: identify why the prior prevention failed, add a targeted durable guardrail, and prove both the capability and guardrail before returning to feature work.
