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
