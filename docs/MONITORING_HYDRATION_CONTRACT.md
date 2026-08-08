# Monitoring Hydration Contract

Updated: 2026-08-04

## Purpose

The POC site is now ready to receive daily-agent observations without pretending the final database or private artifact model exists.

During design preview, the app reads `public/monitoring-intake.json` when present. If the file is absent, empty, or malformed, the app falls back to built-in representative alerts. This keeps local review stable while giving the daily agent one small, reversible hydration target.

## What the daily agent may do

When a daily monitoring run finds meaningful information, it may:

1. search the approved web, site-tree, newsletter, Gmail, and radar sources from `research/MONITORING_SOURCE_STRATEGY_2026-08-04.md`, keeping Gmail MagicCon-specific rather than generic Wizards/Magic marketing;
2. classify findings under `docs/MVP_MONITORING_AGENT_DESIGN.md` and `docs/POC_FINISH_GLIDE_PATH.md`;
3. replace `public/monitoring-intake.json` with reviewed observation cards;
4. run the normal validation checks;
5. build the GitHub Pages preview;
6. publish the fixture-backed preview when there is something useful for Kavi to see.

This is the POC hydration path. It is intentionally file-based so it can be replaced later by Supabase-backed reviewed observations without redesigning Home or Activity.

## What the daily agent must not do yet

- It must not write canonical Supabase facts.
- It must not modify, label, archive, delete, send, or forward Gmail messages.
- It must not store full private receipts, QR codes, reservation numbers, or message bodies in tracked files.
- It must not treat community chatter or search results as canonical facts.
- It must not publish a noisy "nothing changed" preview update.
- It must not broaden into a crawler beyond the approved source strategy.

## Alert shape

`public/monitoring-intake.json` contains an `alerts` array. Each alert must include:

- `id`;
- `kind`: `site`, `email`, `newsletter`, or `manual`;
- `severity`: `hot`, `notice`, or `quiet`;
- `destination`: `Home`, `Activity`, `Wallet`, `Trip`, `Explore`, `Calendar`, `Map`, `Artists`, or `Notes`;
- `attention`;
- `title`;
- `summary`;
- `object`;
- `source`;
- `checkedAt`;
- `status`;
- `rationale`;
- `nextAction`.

The app validates only the shape needed to avoid crashing. The monitor remains responsible for preserving source quality, useful wording, and exact references in the generated file.

## Publication rule

Publish the GitHub Pages preview only when at least one of these is true:

- a Home-worthy alert exists;
- a useful Wallet/Trip/Explore/Map object annotation has been added;
- Kavi explicitly asked to refresh the preview;
- the source strategy or monitor behavior changed and needs visual review.

Routine quiet checks should report in the Codex task only.

In the fixture-backed POC, `quiet` alerts are displayed as already reviewed unless the owner reopens them. Use `notice` or `hot` only when the item deserves human review.
