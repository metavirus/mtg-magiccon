# MagicCon Atlanta 2026 Companion

Private, mobile-first planning and personal-intelligence app for MagicCon Atlanta 2026. The project began greenfield; the nearby `mtg-events-chatgpt` project remains a methodology reference only.

## Foundation

- React + TypeScript + Vite installable PWA
- Supabase project `pavjsexxbueuzhzgemgy` as canonical storage and authentication
- Owner-scoped personal data protected by RLS and explicit Data API grants
- Read-only offline shell; offline writes are intentionally disabled
- Evidence, normalized facts, interpretation, personal state, and workflow proposals remain distinguishable
- One bounded Black Lotus trust slice proves Source → Observation → Occurrence → Personal decision → Itinerary without broad ingestion

## Start

1. Copy `.env.example` to `.env.local`.
2. Add the project URL and a publishable key. Never add secret/service-role keys.
3. Run `pnpm install --frozen-lockfile` and `pnpm dev`.

Use native Windows. pnpm is Corepack-managed; do not reinstall pnpm globally with npm. If pnpm acts strange, first run `where.exe pnpm`, `pnpm --version`, and `corepack pnpm --version` before diagnosing app code.

Run `pnpm readiness` before database or release work. See [development architecture](docs/DEVELOPMENT_ARCHITECTURE.md), [environment readiness](docs/ENVIRONMENT_READINESS.md), [project context](docs/PROJECT_CONTEXT.md), and [current frontier](CURRENT_FRONTIER.md).

Before spending time on a recurring setup, Git, auth, cache, publish, data, browser, or responsive issue, check [Known Gremlins](docs/KNOWN_GREMLINS.md). A failure returning after it was called fixed disproves that fix: stop feature work, find why the prevention failed, add a targeted durable guardrail, and prove both the original lane and the guardrail. A successful retry alone is only recovery. Only an explicit user statement that tokens are low may defer that work.

For the short operating contract that keeps this hobby app from accumulating avoidable process overhead, see [Repo Operating Contract](docs/REPO_OPERATING_CONTRACT.md).

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local app |
| `pnpm check:ui` | Fast Tier 0 acceptance for ordinary UI/copy/layout changes |
| `pnpm check:ship` | Tier 1 acceptance before pushing a public preview change |
| `pnpm preview` | Serve a built app preview using the same Vite config-loader path as build |
| `pnpm ui:capture -- -Route explore` | Build-preview browser smoke with Playwright screenshot, DOM, and visible text readback |
| `pnpm build` | Type-check and production build |
| `pnpm publish:pages` | Local Pages artifact check only: run ship checks and prepare `dist/` for the GitHub Actions deploy |
| `pnpm verify:public` | Compare the public GitHub Pages asset references with the local `dist/` artifact after a cache-busted fetch |
| `pnpm test` | Unit tests |
| `pnpm monitor` | Run the canonical watched-source change check (`monitor:check` alias) |
| `pnpm validate:text` | UTF-8/LF and text checks |
| `pnpm validate:secrets` | Tracked-file secret scan |
| `pnpm readiness` | Identity and environment gate |

The first live product slice is documented in [Black Lotus Trust Slice](docs/BLACK_LOTUS_TRUST_SLICE.md). It retains one official Atlanta claim, a reversible owner decision, a Plan placement, and a versioned owner-bound offline read model.

A temporary GitHub Pages preview is available for iPhone review at https://metavirus.github.io/mtg-magiccon/. Normal entry is auth-first and uses live Supabase-backed state where implemented; `?preview=1` is the explicit fixture bypass. This remains personal preview hosting, not a production deployment.

For this project, "published" should mean the public GitHub Pages URL has been verified after the GitHub Actions Pages deploy, not merely that `dist` was built locally.

As of the August 8 fixture-backed 1.5 pass, the preview is accepted as a coherent quiet-period review surface. Google OAuth is the normal live-auth path; use `?preview=1` only for deliberate fixture/QA review. See [Google OAuth Setup](docs/GOOGLE_OAUTH_SETUP.md).
