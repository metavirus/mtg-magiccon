# User Selections Model

User selections are authenticated app choices that should follow the logged-in user across phone, desktop, and future collaboration surfaces. They are not source facts, and they are not notes.

## Current implementation

As of August 11, the app uses two owner-scoped Supabase layers:

- `public.user_selections` for current durable UI choices;
- `public.user_activity_events` for append-only user-action history that can be grouped for Home and Activity without inventing history from current state.

`public.user_selections` is the canonical table for:

- event planning state such as Interested, Tentative, Committed, Hidden, and Not for me;
- Activity review state such as Needs review, Reviewed, and Archived;
- lightweight Wallet counters such as Prize Tix;
- future assignment-style choices, such as who a receipt line item is for.

`public.user_activity_events` is the canonical append-only lane for meaningful user actions such as:

- changing an event selection;
- adjusting Prize Tix;
- future collaboration-visible state changes that should appear in Home or Activity as grouped bursts rather than as silent overwrites.

Both tables use forced RLS, explicit authenticated grants, and no anonymous grants. `user_selections` keeps the unique `(owner_id, object_id, selection_key)` shape so each current choice stays idempotent, while `user_activity_events` preserves the action trail separately.

`public.companion_members` is the read-only authenticated roster that lets these user-owned records render stable people labels across the app. It does not replace auth: each expected companion should be preconfigured with `person_key`, display name, bubble label/color, badge tier, active flag, and `auth_email` before they first sign in. The auth trigger links `user_id` from the confirmed Google account on first login, so a new companion should not need any manual post-login row repair.

New-companion readiness is a real product requirement, not a nice-to-have. Before sending someone the app link, verify:

- their `companion_members` row is active and has the exact Google `auth_email`;
- the auth-link trigger is installed, so first login hydrates `user_id`;
- shared notes, note mentions, event-selection rows, and activity rows are readable across active companions;
- owner-private choices such as non-event UI chrome remain private unless explicitly shared;
- legacy Black Lotus trust-slice tables are not treated as a companion access gate. Black Lotus schedule/items are visible planning context for the group even when the old owner-scoped trust-slice rows only exist under Kavi.

Current collaboration rules deliberately share the useful group-planning layer: active companions can read each other's event planning states, shared notes, note mentions addressed to them, and grouped activity. Writes remain owner-scoped except the explicit Kavi/Juan Prize Tix sharing rule.

`public.note_mentions` is the first mention-ready collaboration scaffold. It is not part of the selection layer, but it matters for future shared-activity semantics because a shared note that explicitly mentions Chris should rank and route differently from a generic shared note.

## Product rule

If the user clicks something that expresses preference, commitment, review state, count, assignment, or visibility, it should persist in Supabase unless it is clearly disposable UI chrome.

Browser storage is acceptable for:

- auth-mode or preview-mode convenience;
- read-only offline cache;
- ephemeral filters, open drawers, and view modes.

Browser storage is not acceptable for:

- notes;
- event interest/tentative/committed/hidden/nope;
- alert review/archive;
- wallet balances;
- activity history;
- receipt/store line-item assignments;
- future shared collaboration signals.

## Collaboration path

The current table is owner-scoped for writes, with narrow read-sharing for group planning. Multi-person collaboration should not simply expose every owner row to everyone. The next model should decide which additional selection keys are:

- private owner preference;
- shared group signal;
- attendance/commitment visible to specific people;
- system-derived suggestion requiring review.

This keeps “Kavi dislikes a competitive event” distinct from “Chris is interested” or “Juan is attending.”
