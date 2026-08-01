# Environment Readiness

Run `pnpm readiness` before substantive work. A passing gate proves:

- repository path and `origin` identity;
- allowed branch (`main` for inspection, `codex/*` for changes);
- clean-enough tracked state;
- Node and pnpm availability;
- Supabase CLI availability, exact local link identity, and linked migration parity;
- PostgreSQL `psql` availability, including its standard Windows installation path;
- a responsive Docker engine capable of running the local Supabase stack;
- expected Supabase project reference in tracked configuration;
- local secret files are ignored;
- any supplied database URL names the expected project, uses SSL, and uses the preferred Session Pooler port 5432.

## Secure local setup

Browser setup: copy `.env.example` to ignored `.env.local` and obtain only the URL and modern publishable key from the Supabase project Connect dialog.

Direct database setup, only when required: create ignored `.secrets/database.env`, then place the project's Session Pooler URL in `SUPABASE_DB_URL`. Obtain it from the project Connect dialog. Do not paste the password into chat. The URL must use user `postgres.pavjsexxbueuzhzgemgy`, port `5432`, database `postgres`, and `sslmode=require`.

The environment gate also rejects the reference project's project ref anywhere in tracked project content. Local credential files must be project-specific rather than ambiguous global variables. Automated CLI checks disable optional Supabase telemetry so telemetry delivery cannot turn a successful database check into a false failure.

Run `pnpm readiness:repair` only for bounded repair work while installing or starting Docker. It is not an acceptance result. Run `pnpm readiness:database` when the direct Session Pooler path must be proven; this executes a harmless `select current_database() = 'postgres'` query without printing credentials.

## Failure behavior

Never continue through an identity failure. Diagnose one bounded repair cycle, rerun the exact failed check, then report `ENVIRONMENT NOT READY` with the single external action needed. Docker absence or a stopped engine is a readiness defect to repair; it does not authorize an unverified remote workaround.
