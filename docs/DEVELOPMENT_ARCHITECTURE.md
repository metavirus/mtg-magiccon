# Development Architecture

## Selected approach

The application is a small installable React/TypeScript PWA backed directly by one hosted Supabase project. This is the complete development architecture for the current product pressure:

1. Vite serves and builds the browser application locally.
2. The browser uses the expected Supabase URL and a publishable key; Auth identifies one to three trusted users.
3. Supabase Data API access is limited by explicit grants and owner-scoped RLS.
4. SQL migrations are reviewed and committed in Git, then applied to the single canonical hosted project.
5. Supabase CLI proves project linkage and migration parity.
6. `psql` uses an ignored SSL Session Pooler URL for harmless live queries and structural RLS/grant verification.
7. GitHub Actions repeats code-only checks without database credentials.
8. The PWA caches its application shell; canonical writes require a verified server response.

This keeps the number of operational systems equal to the number the product actually needs: one frontend toolchain, one canonical database platform, and one source-control/CI workflow.

## Change path

For database changes:

1. verify current official Supabase guidance;
2. prove repository and project identity with `pnpm readiness`;
3. create and review the smallest forward migration;
4. apply only to `pavjsexxbueuzhzgemgy`;
5. read back the migration and affected objects;
6. verify RLS, grants, and a harmless query;
7. run Supabase advisors and repository acceptance checks;
8. commit and publish evidence in the draft pull request.

## Excluded until earned

There is no required local Supabase replica, Docker/WSL dependency, backend server, ORM, service-role browser path, offline write queue, broad ingestion pipeline, multi-environment promotion system, or comprehensive speculative schema. Add infrastructure only in response to an observed limitation that the hosted-first workflow cannot safely handle.
