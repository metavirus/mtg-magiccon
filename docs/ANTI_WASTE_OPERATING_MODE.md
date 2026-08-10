# Anti-waste operating mode

This is a small hobby companion app, not an enterprise program. Use the narrowest safe workflow that matches the risk of the change.

## Change tiers

### Tier 0 — small visual/copy fix

Use for CSS, copy, spacing, icon, and layout changes that do not touch data shape, authentication, storage, migrations, monitoring, receipts, or source evidence.

- Read only the directly relevant code and the current user complaint.
- Do not re-open the full project documentation set unless the change depends on product history.
- Do not run database/readiness gates unless publishing or auth/data behavior is involved.
- Verify with `pnpm build`.
- If the issue is visual or mobile-specific, inspect the affected public or local viewport before claiming it is fixed.
- If the same visual target fails twice, stop patching symptoms and find the duplicated component, CSS cascade, cache, or publish root cause.

### Tier 1 — public preview UI change

Use when the change will be pushed to GitHub Pages or reviewed on iPhone.

- Run `pnpm build`, `pnpm validate:text`, and `pnpm validate:secrets`.
- Run `pnpm publish:pages`.
- Push `gh-pages` if publication is requested.
- Treat “published” as true only after a cache-busted public URL serves the expected current asset or visible behavior.
- If public Pages still shows stale behavior, say “pushed but not propagated/cached yet,” not “fixed.”

### Tier 2 — user data, auth, receipts, monitoring, Supabase, or migrations

Use the full project gate:

- Read `README.md`, `docs/PROJECT_CONTEXT.md`, `CURRENT_FRONTIER.md`, and `docs/WORK_BACKLOG.md`.
- Run `pnpm readiness`.
- Follow `docs/CHANGE_CONTROL.md`, `docs/EFFICIENCY_SOP.md`, and `docs/COLLABORATION_SOP.md`.
- For database changes, prove identity, migration behavior, RLS, grants, live readback, and validation proportional to risk.

## Product simplicity rules

- Prefer deleting duplicated UI paths over styling each copy. Navigation, person bubbles, notes, object drawers, and receipt proof display must have one shared source of truth.
- Browser storage is only for UI chrome, auth-mode convenience, and read-only offline cache. User-authored notes, event preferences, hidden/not-for-me state, Activity review state, and Prize Tix balance belong in Supabase.
- Do not build placeholder controls. Empty is better than fake.
- Do not continue polishing a fixture surface after it is accepted unless real data or a real device defect exposes a problem.
- Do not replace the stack casually. Vite is acceptable for this React/TypeScript PWA; reduce script/process friction before considering a rewrite.

## Assistant stop rules

- After two failed attempts on the same UI defect, stop and inspect the actual DOM/CSS/published asset path before making another patch.
- After any mobile-navigation or responsive claim, verify a phone-sized viewport.
- After any GitHub Pages publish claim, verify the public page with a cache-busting query or explicitly report that propagation is still pending.
- If a fix starts requiring broad architecture work, pause and name the root cause instead of burning tokens on edge adjustments.
