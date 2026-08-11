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

`public.companion_members` is the read-only authenticated roster that lets these user-owned records render stable people labels across the app. It does not replace auth: when a member has an auth account, `auth_email` / `user_id` can map that account to the person bubble. Until collaboration rules are intentionally expanded, notes and selections remain owned by the logged-in user, while shared notes are visible across authenticated companion members.

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

The current table is owner-scoped. Multi-person collaboration should not simply expose every owner row to everyone. The next model should decide which selection keys are:

- private owner preference;
- shared group signal;
- attendance/commitment visible to specific people;
- system-derived suggestion requiring review.

This keeps “Kavi dislikes a competitive event” distinct from “Chris is interested” or “Juan is attending.”
