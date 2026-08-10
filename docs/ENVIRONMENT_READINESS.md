# Environment Readiness

This is a personal hobby application for one to three trusted users. Development uses the hosted Supabase project directly; readiness should protect identity, secrets, schema discipline, and deployable code without reproducing the hosted platform locally.

Run `pnpm readiness` before Tier 2 data/auth/database/research/monitoring work and before any change where repository, branch, remote, or Supabase identity matters. Do not make it a tax on every small CSS or copy adjustment. A pass proves:

- the exact repository path, GitHub `origin`, and an allowed branch;
- Node, pnpm, Supabase CLI, and PostgreSQL `psql` are available;
- tracked configuration names only Supabase project `pavjsexxbueuzhzgemgy`;
- the local Supabase CLI link resolves to that exact project;
- checked-in migrations match the hosted migration history;
- ignored local credential files remain ignored;
- the project-specific Session Pooler URL uses port 5432 and requires SSL;
- a harmless live query reaches database `postgres`;
- the owner proof table still has forced RLS, four policies, update `USING` and `WITH CHECK`, no anonymous grants, and exactly the intended authenticated grants.

Application build, tests, text integrity, and secret scanning remain separate acceptance commands so failures identify their actual layer. Use the light wrappers for ordinary UI work:

```powershell
pnpm check:ui
pnpm check:ship
```

Use the individual commands when diagnosing a specific failure:

```powershell
pnpm build
pnpm test
pnpm validate:text
pnpm validate:secrets
```

Current local note, August 3, 2026: after restarting the Codex desktop session, ordinary `node`, `pnpm`, and `pnpm readiness` are available on `PATH`; the previous Node PATH issue is not currently reproducing. The managed-sandbox Vite/esbuild config-resolution failure is fixed by using Vite/Vitest's `--configLoader runner` in the project scripts, which avoids bundling the config with esbuild before execution. Plain `pnpm build` and `pnpm test` should now pass inside the sandbox.

Current local note, August 10, 2026: `pnpm dev`, `pnpm preview`, `pnpm build`, and `pnpm test` all use Vite/Vitest's runner config loader path. If one of those scripts fails, treat it as a real defect to diagnose, not as expected environment flakiness.

## Secure local setup

Browser configuration lives in ignored `.env.local` and contains only the project URL and modern publishable key. Never place a secret/service-role key in browser configuration.

Direct database verification uses ignored `.secrets/database.env`:

```dotenv
SUPABASE_DB_URL=<project Session Pooler URL on port 5432 with sslmode=require>
```

Obtain the URL from the expected project's Connect dialog and enter it locally. Never paste it into chat or tracked files.

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

Never continue through repository, remote, Supabase project, migration, URL, or RLS ambiguity. Run one bounded repair cycle, retest the exact capability, then report the single external action still required. Do not substitute a different project, unguarded URL, or elevated browser key.
