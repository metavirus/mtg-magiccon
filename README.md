# MagicCon Atlanta 2026 Companion

Private, mobile-first planning and personal-intelligence app for MagicCon Atlanta 2026. The project began greenfield; the nearby `mtg-events-chatgpt` project remains a methodology reference only.

## Foundation

- React + TypeScript + Vite installable PWA
- Supabase project `pavjsexxbueuzhzgemgy` as canonical storage and authentication
- Owner-scoped personal data protected by RLS and explicit Data API grants
- Read-only device pack for the authenticated app read model and permitted receipt/media artifacts; offline writes are intentionally disabled
- Evidence, normalized facts, interpretation, personal state, and workflow proposals remain distinguishable
- Shared convention/trip context, Wallet proof, Companion codes, and a private artist-signing workbench; the original Black Lotus trust slice remains the foundation proof

## Start

1. Copy `.env.example` to `.env.local`.
2. Add the project URL and a publishable key. Never add secret/service-role keys.
3. Run `pnpm install --frozen-lockfile` and `pnpm dev`.

Use native Windows. pnpm is Corepack-managed; do not reinstall pnpm globally with npm. If pnpm acts strange, first run `where.exe pnpm`, `pnpm --version`, and `corepack pnpm --version` before diagnosing app code.

Run `pnpm readiness` before live Supabase/database writes, authenticated operational changes, or when repository/branch/remote identity is genuinely uncertain. Ordinary local UI and documentation work uses the proportional lanes in [the operating contract](docs/REPO_OPERATING_CONTRACT.md). See [development architecture](docs/DEVELOPMENT_ARCHITECTURE.md), [environment readiness](docs/ENVIRONMENT_READINESS.md), [project context](docs/PROJECT_CONTEXT.md), and [current frontier](CURRENT_FRONTIER.md).

Before spending time on a recurring setup, Git, auth, cache, publish, data, browser, or responsive issue, check [Known Gremlins](docs/KNOWN_GREMLINS.md). A failure returning after it was called fixed disproves that fix: stop feature work, find why the prevention failed, add a targeted durable guardrail, and prove both the original lane and the guardrail. A successful retry alone is only recovery. Only an explicit user statement that tokens are low may defer that work.

For the short operating contract that keeps this hobby app from accumulating avoidable process overhead, see [Repo Operating Contract](docs/REPO_OPERATING_CONTRACT.md). For the exact trigger, side effect, and proof boundary of every scheduled or automation-labelled lane, see [Automation Truth Table](docs/AUTOMATION_TRUTH_TABLE.md).

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local app |
| `pnpm check:ui` | Fast Tier 0 acceptance for ordinary UI/copy/layout changes |
| `pnpm check:deploy` | Full deployment gate: build, tests, text integrity, secret scan, and workflow-verifier guard |
| `pnpm check:ship` | Compatibility alias for `pnpm check:deploy` |
| `pnpm preview` | Serve a built app preview using the same Vite config-loader path as build |
| `pnpm ui:capture -- -Route explore` | Build-preview browser smoke with Playwright screenshot, DOM, and visible text readback |
| `pnpm build` | Type-check and production build |
| `pnpm prepare:pages` | Run the full deployment gate and prepare the local `dist/` Pages artifact; this does not deploy |
| `pnpm verify:public` | Compare the public GitHub Pages asset references with the local `dist/` artifact after a cache-busted fetch |
| `pnpm test` | Unit tests |
| `pnpm monitor` | Development/diagnostic detector (`monitor:check` alias), not daily discovery; the GitHub Actions workflow owns the authoritative baseline |
| `pnpm validate:text` | UTF-8/LF and text checks |
| `pnpm validate:secrets` | Tracked-file secret scan |
| `pnpm readiness` | Identity and environment gate |

The first live product slice is documented in [Black Lotus Trust Slice](docs/BLACK_LOTUS_TRUST_SLICE.md). It retains one official Atlanta claim, a reversible owner decision, a Plan placement, and a versioned owner-bound offline read model.

A temporary GitHub Pages preview is available for iPhone review at https://metavirus.github.io/mtg-magiccon/. Normal entry is auth-first and uses live Supabase-backed state where implemented; `?preview=1` is the explicit fixture bypass. This remains personal preview hosting, not a production deployment.

For this project, "published" should mean the public GitHub Pages URL has been verified after the GitHub Actions Pages deploy, not merely that `dist` was built locally.

## Current state

The September 19 UI and surveyor improvements are shipped and verified. Installed-iPhone offline proof is accepted, including the receipt/device-pack work; missing hotel originals are a separate source-ingestion gap, not an unimplemented cache. Google OAuth is the normal live-auth path; `?preview=1` is only for deliberate fixture/QA review. See [Google OAuth Setup](docs/GOOGLE_OAUTH_SETUP.md).

[Current Frontier](CURRENT_FRONTIER.md) owns the latest accepted checkpoint and remaining work. The [September 19 UI audit](docs/UI_UX_AUDIT_2026-09-19.md) and [surveyor audit](docs/SURVEYOR_AUDIT_2026-09-19.md) retain the verification evidence. Public-source discovery, closure, and baseline acceptance run exclusively in GitHub Actions; Gmail coverage has a separate private receipt and does not imply automatic receipt ingestion. See [Automation Truth Table](docs/AUTOMATION_TRUTH_TABLE.md).

Session planning is complete for this convention. Map remains a placeholder; real Atlanta catalog/map activation waits for reviewed first-party sources. Historical POC and dated audit findings do not reopen accepted work.
