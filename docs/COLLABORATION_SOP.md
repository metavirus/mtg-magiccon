# Collaboration SOP

Lead with verified outcomes and name uncertainty precisely. Raise structural risks before they compound.

When a capability fails:

1. Capture the exact failure and determine whether it is sandbox, path, authentication, identity, network, or external-state related.
2. Run one bounded repair using documented permissions or bundled runtimes.
3. Retest the exact capability.
4. If still blocked, ask for the minimum secure external action. Never request credentials in chat.

For database access, ask the user only to place the project-specific Session Pooler URL in ignored `.secrets/database.env`, or complete Dashboard/OAuth authentication. State what remains unverified. Preserve exact working state in `CURRENT_FRONTIER.md` and the backlog before a handoff.
