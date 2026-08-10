# Efficiency SOP

- Begin with identity and environment gates; stop early on trust failures.
- Read canonical context once, then open only the SOP needed for the active lane.
- Prefer bounded queries, exact file searches, and targeted validations.
- Separate discovery from mutation. Batch independent read-only checks where safe.
- Use the smallest schema or UI slice that proves the risk under test.
- Give every research pass a decision question and stop condition.
- Do not manufacture artifacts to document no-op checks; update durable state only when it changes.
- After two or three failed attempts, reassess the method and inspect authoritative documentation or logs.
- Do not make local-container availability a prerequisite for safe hosted-project read-only inspection, but never use hosted access to bypass identity or approval gates.
- For accepted UI/design surfaces, stop polishing unless there is a real defect, real data, or a user-requested change. Repeated visual misses should trigger a root-cause pass on duplicated components, CSS cascade, cached deploys, and whether the wrong viewport is being inspected.
- Use `docs/ANTI_WASTE_OPERATING_MODE.md` to keep small hobby-app changes from inheriting the full database/release workflow when that risk is not present.
