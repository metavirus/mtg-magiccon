# Monitoring Hydration Contract

Updated: 2026-08-21

## Purpose

Two intake lanes exist. `public/monitoring_findings` is the current durable review queue for cloud-surveyor source evidence. `public/monitoring-intake.json` is retained only for deliberate fixture/preview hydration and compatibility testing; it is not the current cloud execution lane or canonical truth.

During design preview, the app reads `public/monitoring-intake.json` when present. If the file is absent, empty, or malformed, the app falls back to built-in representative alerts. This keeps local review stable while giving the daily agent one small, reversible hydration target.

## Legacy fixture-preview lane

When a deliberate preview-fixture refresh is requested, an agent may:

1. run `pnpm monitor:check` against `monitoring/watch-set.json` to identify deterministic public-source changes before doing broader browsing;
2. search the approved web, site-tree, newsletter, Gmail, and radar sources from `research/MONITORING_SOURCE_STRATEGY_2026-08-04.md`, keeping Gmail MagicCon-specific rather than generic Wizards/Magic marketing and using `monitoring/gmail-watch-queries.json` as the query map;
3. classify findings under `docs/MVP_MONITORING_AGENT_DESIGN.md` and `docs/POC_FINISH_GLIDE_PATH.md`;
4. replace `public/monitoring-intake.json` with reviewed observation cards;
5. run `pnpm validate:monitoring` plus the normal validation checks;
6. build the GitHub Pages preview;
7. publish only through the normal reviewed ship lane.

This is a legacy POC/QA path. The cloud surveyor must use `monitor:check` → `monitor:stage` → Kavi review instead.

## What the daily agent must not do yet

- It must not write canonical Supabase facts.
- It must not modify, label, archive, delete, send, or forward Gmail messages.
- It must not store full private receipts, QR codes, reservation numbers, or message bodies in tracked files.
- It must not treat community chatter or search results as canonical facts.
- It must not publish a noisy "nothing changed" preview update.
- It must not broaden into a crawler beyond the approved source strategy.
- It must not run `pnpm monitor:accept` on changed sources until the change has been reviewed or explicitly accepted as a new baseline.

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

`pnpm validate:monitoring` is the pre-publish guard for this file. It checks required fields, allowed enum values, duplicate IDs, lowercase kebab-case IDs, quiet findings routed to Home, and obvious private-artifact leakage risks. It is intentionally conservative and does not certify that a finding is true or canonical.

## Surveyor artifact shape

`pnpm monitor:check` writes a machine-readable report to stdout and the GitHub Actions artifact. In addition to public watch-source counts, the report now includes a `ticketedPlay` section. Until a LEAP inventory snapshot is configured, it reports `status: waiting-for-inventory` with zero signals. Once a reviewed snapshot source exists, this section may carry grouped ticketed-play signal candidates from the pure inventory-diff layer, such as first-drop, high-signal event, sold-out, time, location, or price changes. These are routing candidates only; they do not write Supabase, mutate selections, or publish app alerts by themselves.

The durable successor to file-backed preview hydration is `public.monitoring_findings`. Cloud checks may stage source evidence there using a server-only GitHub Actions secret. The table is fingerprint-deduplicated and Kavi-readable. Informational changes such as new official navigation links use `unread`, `read`, and `archived` review state with no approval or canonical mutation; their presentation links remain inside evidence. Only a finding with a distinct, explicitly named canonical consequence may enter the authorization lifecycle. Ambiguous findings remain unmapped and fail closed.

User-visible monitoring now passes through the concept reconciliation contract in `docs/MONITORING_CONCEPT_RECONCILIATION.md`. Raw findings and noise remain internal evidence. `monitoring_concepts` provides stable semantic identity, while `monitoring_concept_evidence` preserves cross-source provenance; keyed legacy alerts are transition-only fallbacks and must not create a second card when a live concept exists.

## Publication rule

Publish the GitHub Pages preview only when at least one of these is true:

- a Home-worthy alert exists;
- a useful Wallet/Trip/Explore/Map object annotation has been added;
- Kavi explicitly asked to refresh the preview;
- the source strategy or monitor behavior changed and needs visual review.

Routine quiet checks should report in the Codex task only.

In the fixture-backed POC, `quiet` alerts are displayed as already reviewed unless the owner reopens them. Use `notice` or `hot` only when the item deserves human review.
