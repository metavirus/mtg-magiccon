# Agent Instructions

Before substantive application, research, documentation, or database work, read `docs/REPO_OPERATING_CONTRACT.md`, check `docs/KNOWN_GREMLINS.md` for any already-known failure mode, then choose the smallest safe lane from `docs/ANTI_WASTE_OPERATING_MODE.md`.

## Proportional execution and root integration

Use the smallest capable lane. Small or cohesive work stays in root with zero subagents by default. For a substantial context compartment, prefer one fresh cohesive worker. Use parallel agents only for genuinely independent work when the wall-clock benefit exceeds coordination cost; crossing systems or proof surfaces does not automatically require decomposition.

Root owns narrow authenticated integration and publication: review the exact staged scope, run the risk-tier gate, commit, push, and verify CI/Pages or the public app when required. Do not create publish-only subagents or ask Kavi for a second `PUSH X` instruction after an already-authorized build, fix, proceed, or resume request. Root must not absorb a large implementation, research, browser-proof, or database tranche that was deliberately delegated, but integration/publish is not such a tranche.

Retire workers when their phase ends or context compacts; start a fresh worker when another substantial compartment is needed. Keep meaningful decisions and unfinished substantial state in the repo so chat history is not the only memory. Do not update frontier/backlog files for trivial changes that create no durable project-state change.

When a known gremlin applies, use its documented path directly. Do not run the expected failing command first, do not present known environment friction as a new blocker, and do not add replacement ceremony unless the documented path itself fails.

If a known lane still errors, presume agent execution failure until proven otherwise: wrong command, wrong setup, wrong environment lane, stale assumption, or insufficient preflight.

Any recurrence of a failure after it was represented as fixed conclusively means the prior fix was incomplete. Stop feature work on the first recurrence, identify why the earlier prevention failed, and add the smallest durable guardrail in code, scripts, tests, preflight, or the canonical instructions. Clearing the current symptom is recovery, not a fix. Do not report `FIXED`, readiness, or completion until the original failing lane and the new guardrail both pass. This applies whether or not the failure is user-visible. Only an explicit user statement that tokens are low may defer the durable prevention work; record the debt and do not call it fixed.

For visual UI work, browser or viewport inspection is expected capability, not an optional luxury. Public asset verification proves freshness, not visual correctness. If browser control or viewport inspection is unavailable, recover that lane or explicitly stop before claiming the visual fix is done.

For Tier 0 small visual/copy fixes, do not drag the full project ceremony into the turn. Read the relevant files, make the smallest reversible change, run `pnpm build`, and visually verify the affected viewport when the defect is visual.

For Tier 1 public preview UI changes, follow the publish verification rules in `docs/ANTI_WASTE_OPERATING_MODE.md`.

For Tier 2 auth, persistence, monitoring, research, or database work, read only the context and specialized SOPs relevant to the affected surface. Run `pnpm readiness` before live Supabase/database writes, authenticated operational changes, or when repository/branch/remote identity is genuinely ambiguous—not for unrelated research or local-only work. Research follows `research/METHODOLOGY.md` and `research/SOURCE_SOP.md` without inheriting database or publish gates unless it will actually write there.

Supabase project `pavjsexxbueuzhzgemgy` is canonical. Never use another project, the reference project's credentials, a secret/service-role key in browser code, or unverified database URLs. Prefer an ignored Session Pooler URL on port 5432 for direct database tooling.

Keep source evidence, normalized facts, interpretation, private personal state, and agent/workflow proposals distinguishable. A proposal never becomes canonical merely because an agent produced it. Offline mode is read-only and must never silently overwrite newer server data.

Run only the validation required by the active risk tier. Database changes require canonical identity proof, migration review, live readback, and RLS/advisor checks proportionate to the actual change; do not apply database ceremony when no database write exists. Surface encoding drift, schema ambiguity, identity mismatch, or missing capabilities immediately.

## Kavi collaboration contract

- Optimize for real speed: assess, execute, file it away. Eliminate recurring failure causes and encode the smallest prevention rule; do not normalize recurrence as ambient friction.
- Use decisive bounded chunks with little ceremony. Take the obvious approved next step; ask only when risk, product direction, privacy, credentials, or reversibility materially changes.
- Keep cohesive work together. Delegate a substantial context compartment or independent parallel tranche when it will genuinely reduce context pressure or elapsed time. Persist frontier/backlog state only after a material durable change or before a substantial handoff/compaction.
- Visual work requires actual viewport inspection and visual judgment: spacing, hierarchy, controls, alignment, mobile wrapping, drawer size, and false affordances all count.
- Supabase is truth. Shared trip/event context is shared unless there is a real privacy reason; Black Lotus context is not secret; Kavi's card-signing workbench/details remain private for now.
- Purchased/locked state gets the strongest visual language. Interested, tentative, and ordinary committed states must not steal that signal.
- Avoid filler UI and demo theater. Prefer compact information-rich surfaces, natural content growth, reachable mobile controls, and persistent navigation/filters when lists become long.
- When visual feedback says a version is wrong, infer and fix the design principle/class of issue rather than defending the patch.
- Be honest but decisive: state the best judgment, evidence, and cheap rollback. Backlog anything that is not now, with a reason.
- When Kavi is angry, skip apology theater: name the violated expectation, correct the root issue, encode prevention, and move forward.
