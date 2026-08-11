# Agent Instructions

Before substantive application, research, documentation, or database work, read `docs/REPO_OPERATING_CONTRACT.md`, check `docs/KNOWN_GREMLINS.md` for any already-known failure mode, then choose the smallest safe lane from `docs/ANTI_WASTE_OPERATING_MODE.md`.

When a known gremlin applies, use its documented path directly. Do not run the expected failing command first, do not present known environment friction as a new blocker, and do not add replacement ceremony unless the documented path itself fails.

If a known lane still errors, presume agent execution failure until proven otherwise: wrong command, wrong setup, wrong environment lane, stale assumption, or insufficient preflight. Recovery is not enough. For a user-visible preventable error, state the prevention delta and update the relevant doc/script/standing rule if one is missing.

For visual UI work, browser or viewport inspection is expected capability, not an optional luxury. Public asset verification proves freshness, not visual correctness. If browser control or viewport inspection is unavailable, recover that lane or explicitly stop before claiming the visual fix is done.

For Tier 0 small visual/copy fixes, do not drag the full project ceremony into the turn. Read the relevant files, make the smallest reversible change, run `pnpm build`, and visually verify the affected viewport when the defect is visual.

For Tier 1 public preview UI changes, follow the publish verification rules in `docs/ANTI_WASTE_OPERATING_MODE.md`.

For Tier 2 data/auth/research/database/monitoring work:

1. Read `README.md`, `docs/PROJECT_CONTEXT.md`, `CURRENT_FRONTIER.md`, and `docs/WORK_BACKLOG.md`.
2. Run `pnpm readiness` and stop if repository, branch, remote, or Supabase identity is ambiguous.
3. Follow `docs/CHANGE_CONTROL.md`, `docs/EFFICIENCY_SOP.md`, and `docs/COLLABORATION_SOP.md`.
4. For research, follow `research/METHODOLOGY.md` and `research/SOURCE_SOP.md`.

Supabase project `pavjsexxbueuzhzgemgy` is canonical. Never use another project, the reference project's credentials, a secret/service-role key in browser code, or unverified database URLs. Prefer an ignored Session Pooler URL on port 5432 for direct database tooling.

Keep source evidence, normalized facts, interpretation, private personal state, and agent/workflow proposals distinguishable. A proposal never becomes canonical merely because an agent produced it. Offline mode is read-only and must never silently overwrite newer server data.

Run build, tests, text-integrity, and secret validation before handoff. Database changes require identity proof, migration review, live readback, RLS verification, and advisor review proportionate to risk. Surface encoding drift, schema ambiguity, identity mismatch, or missing capabilities immediately.
