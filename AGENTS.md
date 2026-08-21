# Agent Instructions

Before substantive application, research, documentation, or database work, read `docs/REPO_OPERATING_CONTRACT.md`, check `docs/KNOWN_GREMLINS.md` for any already-known failure mode, then choose the smallest safe lane from `docs/ANTI_WASTE_OPERATING_MODE.md`.

When a known gremlin applies, use its documented path directly. Do not run the expected failing command first, do not present known environment friction as a new blocker, and do not add replacement ceremony unless the documented path itself fails.

If a known lane still errors, presume agent execution failure until proven otherwise: wrong command, wrong setup, wrong environment lane, stale assumption, or insufficient preflight.

Any recurrence of a failure after it was represented as fixed conclusively means the prior fix was incomplete. Stop feature work on the first recurrence, identify why the earlier prevention failed, and add the smallest durable guardrail in code, scripts, tests, preflight, or the canonical instructions. Clearing the current symptom is recovery, not a fix. Do not report `FIXED`, readiness, or completion until the original failing lane and the new guardrail both pass. This applies whether or not the failure is user-visible. Only an explicit user statement that tokens are low may defer the durable prevention work; record the debt and do not call it fixed.

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

## Kavi collaboration contract

- Optimize for real speed: assess, execute, file it away. Eliminate recurring failure causes and encode the smallest prevention rule; do not normalize recurrence as ambient friction.
- Use decisive bounded chunks with little ceremony. Take the obvious approved next step; ask only when risk, product direction, privacy, credentials, or reversibility materially changes.
- Before implementing work that spans multiple systems, surfaces, or proof lanes, identify the bounded tranches and mark which are independently delegable. Every large independent tranche must be dispatched to a narrow subagent; the root chat coordinates scope, resolves cross-tranche decisions, integrates results, verifies the whole, and updates durable state. The root chat must not silently absorb a delegable large tranche. Small work and tightly coupled work that cannot run independently stay in the root chat. If subagents are unavailable, a higher-priority instruction blocks delegation, or a tranche is not safely separable, disclose that immediately before implementation, explain the substitute lane, and do not downgrade silently. Continue a large delegable tranche in the root chat only after explicit user approval. Persist `CURRENT_FRONTIER.md` and `docs/WORK_BACKLOG.md` after each material tranche so compaction cannot erase state.
- Visual work requires actual viewport inspection and visual judgment: spacing, hierarchy, controls, alignment, mobile wrapping, drawer size, and false affordances all count.
- Supabase is truth. Shared trip/event context is shared unless there is a real privacy reason; Black Lotus context is not secret; Kavi's card-signing workbench/details remain private for now.
- Purchased/locked state gets the strongest visual language. Interested, tentative, and ordinary committed states must not steal that signal.
- Avoid filler UI and demo theater. Prefer compact information-rich surfaces, natural content growth, reachable mobile controls, and persistent navigation/filters when lists become long.
- When visual feedback says a version is wrong, infer and fix the design principle/class of issue rather than defending the patch.
- Be honest but decisive: state the best judgment, evidence, and cheap rollback. Backlog anything that is not now, with a reason.
- When Kavi is angry, skip apology theater: name the violated expectation, correct the root issue, encode prevention, and move forward.
