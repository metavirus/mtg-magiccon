# Flight change auto-apply

Updated: 2026-08-22

Routine travel signals follow `detect → extract → reconcile → update → brief signal → done`. Gmail is source evidence, not a second inbox Kavi must review.

## Current bounded lane

The canonical itinerary is `atlanta-2026-delta-hogfbx`. `trip_flights` owns itinerary identity and `trip_flight_legs` owns the current schedule. `trip_flight_source_evidence` preserves the exact source reference plus prior/applied state and is not exposed through the browser Data API.

`apply_confident_flight_schedule_update` is service-role-only and applies a routine schedule change atomically when all of these are true:

- confidence is at least `0.90`;
- confirmation is `HOGFBX`;
- carrier matches Delta;
- travelers match Kavi and Juan;
- every changed leg includes identity, route, flight number, departure, and arrival;
- match evidence explicitly records `changed_legs_complete = true`;
- match evidence explicitly classifies cancellation/rebooking and airline-assigned replacement state.

Missing or malformed guard flags fail closed in the database function itself; prompt compliance is not treated as enforcement.

An airline-assigned replacement may apply when the email presents a complete replacement itinerary with no user action or unresolved choice, and match evidence explicitly confirms the same itinerary, travelers, carrier, dates, and routes. A cancellation, user-choice rebooking, date/route change, or uncertain replacement remains review.

The function updates canonical legs, retains immutable evidence, and creates one unread Home concept: `Your Atlanta flight changed.` Reprocessing the same Gmail reference is idempotent. A repeated state with a new source is retained as corroboration without another signal.

Anything outside that boundary fails closed and warrants at most one precise question. It must not become a generic `review this email in Codex` card.

The Trip UI reads these shared canonical tables through `loadTripFlights`; the same shaped preview data is retained only as an offline/design fallback.
