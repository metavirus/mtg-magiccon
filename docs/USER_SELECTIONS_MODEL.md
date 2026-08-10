# User Selections Model

User selections are authenticated app choices that should follow the logged-in user across phone, desktop, and future collaboration surfaces. They are not source facts, and they are not notes.

## Current implementation

As of August 9, `public.user_selections` is the canonical owner-scoped table for durable UI choices:

- event planning state such as Interested, Tentative, Committed, Hidden, and Not for me;
- Activity review state such as Needs review, Reviewed, and Archived;
- lightweight Wallet counters such as Prize Tix;
- future assignment-style choices, such as who a receipt line item is for.

The table uses forced RLS, explicit authenticated grants, no anonymous grants, and a unique `(owner_id, object_id, selection_key)` shape so each choice can be updated idempotently.

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
- receipt/store line-item assignments;
- future shared collaboration signals.

## Collaboration path

The current table is owner-scoped. Multi-person collaboration should not simply expose every owner row to everyone. The next model should decide which selection keys are:

- private owner preference;
- shared group signal;
- attendance/commitment visible to specific people;
- system-derived suggestion requiring review.

This keeps “Kavi dislikes a competitive event” distinct from “Chris is interested” or “Juan is attending.”
