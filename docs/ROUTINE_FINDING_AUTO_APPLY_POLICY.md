# Routine finding auto-apply policy

Maintained Info factual conflicts use the controlled registry and server bindings described in `docs/MAINTAINED_INFO_CLAIM_REGISTRY.md`; they are concrete owner choices, not routine auto-apply mutations.

Updated: 2026-08-22

The surveyor should finish ordinary information work instead of handing it back to Kavi. This is a bounded policy for existing canonical objects, not a generic autonomous-ingestion framework.

A finding auto-applies only when all are true:

- source confidence is at least `0.90`;
- a stable canonical target already exists and matches;
- the changed fields and their meaning are deterministic;
- the update is reversible;
- exact source evidence and prior state are retained;
- the new evidence is not materially contradictory;
- the change is not destructive, a cancellation, or an ambiguous replacement.

The allowed consequence is always narrow: update the matched fields, preserve evidence, emit one concise signal when useful, and stop. Cross-source repetition corroborates the same object rather than creating another signal.

Initial applicable domains are:

- matched routine flight schedule/status details through the dedicated flight executor;
- matched hotel confirmation details such as check-in/out, address, room, or confirmed dates when the hotel object and reservation identity are stable;
- matched event availability/status such as sold out or reopened when the event identity is stable and official;
- maintained official hours or details when the source is first-party and an existing Info topic owns those fields.

Ambiguous identity, missing canonical binding, incomplete field extraction, contradictory high-consequence evidence, cancellation, choice-required rebooking, deletion, or another destructive consequence remains review. An airline-assigned replacement is safe only when complete evidence explicitly proves no required user action, no unresolved choice, and the same itinerary, travelers, carrier, dates, and routes. The review item must name the exact unresolved decision; `review this email in Codex` is not an acceptable fallback.

When two comparable first-party claims genuinely disagree about one exact maintained fact, the surveyor may stage one deterministic factual-choice finding. The finding must bind a stable concept and an allowlisted canonical field, retain evidence for both values, offer concrete value labels, and preserve the prior value for rollback. `Not now` is a recoverable defer, not rejection. A selected value is applied atomically and recorded as one quiet activity event. Similar times belonging to different claims are not a conflict merely because their values differ.
