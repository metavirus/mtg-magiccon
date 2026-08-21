# Efficiency SOP

- Begin with identity and environment gates; stop early on trust failures.
- Read canonical context once, then open only the SOP needed for the active lane.
- Prefer bounded queries, exact file searches, and targeted validations.
- Separate discovery from mutation. Batch independent read-only checks where safe.
- Use the smallest schema or UI slice that proves the risk under test.
- Give every research pass a decision question and stop condition.
- Do not manufacture artifacts to document no-op checks; update durable state only when it changes.
- For a newly observed problem, reassess the method and inspect authoritative documentation or logs after at most two failed attempts. If a problem recurs after a claimed fix, reassess immediately; do not spend another attempt on symptom recovery before root-cause and prevention work.
- Do not make local-container availability a prerequisite for safe hosted-project read-only inspection, but never use hosted access to bypass identity or approval gates.
- For accepted UI/design surfaces, stop polishing unless there is a real defect, real data, or a user-requested change. Repeated visual misses should trigger a root-cause pass on duplicated components, CSS cascade, cached deploys, and whether the wrong viewport is being inspected.
- Use `docs/ANTI_WASTE_OPERATING_MODE.md` to keep small hobby-app changes from inheriting the full database/release workflow when that risk is not present.
- Prefer the project script over an invented command. If a package script, verification script, workflow, or SOP already owns the task, inspect and use that path instead of composing a new shell sequence.
- Do not run a command that the known-gremlins file says will fail merely to confirm it still fails.
- Avoid broad “cleanup” while fixing a concrete defect. Operational maintenance is successful when the narrow defect is gone and the app still ships, not when adjacent files look more modern.
- When a mistake is agent-owned, surface it compactly instead of burying it in progress narration; then make the smallest documentation or code correction that prevents the same mistake.
