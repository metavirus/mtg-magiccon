# MagicCon Atlanta 2026 Companion

Private, mobile-first planning and personal-intelligence app for one attendee at MagicCon Atlanta 2026. This repository is greenfield: the nearby `mtg-events-chatgpt` project is a methodology reference only.

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

Run `pnpm readiness` before database or release work. See [development architecture](docs/DEVELOPMENT_ARCHITECTURE.md), [environment readiness](docs/ENVIRONMENT_READINESS.md), [project context](docs/PROJECT_CONTEXT.md), and [current frontier](CURRENT_FRONTIER.md).

Before spending time on a recurring setup, Git, auth, cache, publish, or responsive issue, check [Known Gremlins](docs/KNOWN_GREMLINS.md). The project should not repeatedly rediscover the same environment failures.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local app |
| `pnpm check:ui` | Fast Tier 0 acceptance for ordinary UI/copy/layout changes |
| `pnpm check:ship` | Tier 1 acceptance before pushing a public preview change |
| `pnpm preview` | Serve a built app preview using the same Vite config-loader path as build |
| `pnpm build` | Type-check and production build |
| `pnpm publish:pages` | Build and sync the local `tmp/gh-pages` worktree; this is not public until `gh-pages` is pushed |
| `pnpm verify:public` | Compare the public GitHub Pages asset references with the pushed `tmp/gh-pages` build after a cache-busted fetch |
| `pnpm test` | Unit tests |
| `pnpm validate:text` | UTF-8/LF and text checks |
| `pnpm validate:secrets` | Tracked-file secret scan |
| `pnpm readiness` | Identity and environment gate |

The first live product slice is documented in [Black Lotus Trust Slice](docs/BLACK_LOTUS_TRUST_SLICE.md). It retains one official Atlanta claim, a reversible owner decision, a Plan placement, and a versioned owner-bound offline read model.

A temporary GitHub Pages preview is available for iPhone review at https://metavirus.github.io/mtg-magiccon/. It is fixture-backed by default and not a production data deployment.

For this project, "published" should mean the public GitHub Pages URL has been verified, not merely that `dist` was built or copied into the local `tmp/gh-pages` worktree.

As of the August 8 fixture-backed 1.5 pass, the preview is accepted as a coherent quiet-period review surface. Google OAuth is now the deliberate live-auth path at `?auth=1`; the default Pages URL remains fixture-backed for unblocked review. See [Google OAuth Setup](docs/GOOGLE_OAUTH_SETUP.md).
