# MagicCon Atlanta 2026 Companion

Private, mobile-first planning and personal-intelligence app for one attendee at MagicCon Atlanta 2026. This repository is greenfield: the nearby `mtg-events-chatgpt` project is a methodology reference only.

## Foundation

- React + TypeScript + Vite installable PWA
- Supabase project `pavjsexxbueuzhzgemgy` as canonical storage and authentication
- Owner-scoped personal data protected by RLS and explicit Data API grants
- Read-only offline shell; offline writes are intentionally disabled
- Evidence, normalized facts, interpretation, personal state, and workflow proposals remain distinguishable

## Start

1. Copy `.env.example` to `.env.local`.
2. Add the project URL and a publishable key. Never add secret/service-role keys.
3. Run `pnpm install --frozen-lockfile` and `pnpm dev`.

Run `pnpm readiness` before database or release work. See [development architecture](docs/DEVELOPMENT_ARCHITECTURE.md), [environment readiness](docs/ENVIRONMENT_READINESS.md), [project context](docs/PROJECT_CONTEXT.md), and [current frontier](CURRENT_FRONTIER.md).

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local app |
| `pnpm build` | Type-check and production build |
| `pnpm test` | Unit tests |
| `pnpm validate:text` | UTF-8/LF and text checks |
| `pnpm validate:secrets` | Tracked-file secret scan |
| `pnpm readiness` | Identity and environment gate |

No production deployment is configured in this tranche.
