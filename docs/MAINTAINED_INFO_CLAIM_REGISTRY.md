# Maintained Info claim registry

The surveyor may compare newsletter/page wording with a maintained Info fact only when the fact is declared in `scripts/lib/maintained_info_claim_registry.mjs`. The declaration owns stable concept identity, exact topic/section/fact binding, value kind and normalization, trusted first-party URL scope, and consequence class.

The first bounded registry covers operational facts already present in Hours, Will Call, Prize Tix, and On-Demand Play. It does not create new topics or turn unmatched newsletter prose into an alert. Ticketed Play's existing sale milestone remains a separate monitoring concept and can corroborate inside a mixed observation without becoming a maintained-fact mutation binding.

For each registered claim:

- an equal normalized value adds source provenance to the existing concept;
- a different comparable value from the trusted Atlanta first-party scope retains both values and creates one stable A/B Activity choice;
- repeated conflicts reuse the fingerprint derived from concept key plus the two normalized values;
- ambiguous, unregistered, or non-first-party wording remains noise/review evidence and never becomes a generic newsletter announcement.

Fresh raw source rows that resolve only to registered fact evidence or noise are archived on staging, so they remain recoverable evidence without competing with the precise concept choice in the Inbox. Existing user review state is preserved.

Migration `20260824153000_generalize_info_fact_choice_bindings.sql` adds the matching server-side binding table. Authenticated clients cannot write or read that table directly. The resolver accepts only an enabled concept/path binding, requires exactly two server-stored choices, locks the bound topic, verifies that the exact canonical prior value still matches the rollback payload, and updates only the one JSON fact value. The already-shipped one-off migration remains immutable.

The resolver is intentionally a `SECURITY DEFINER` RPC because the client has no direct write access to canonical Info articles or the binding table. Its empty search path, explicit schema qualification, active-Kavi identity check, server-stored option validation, and revoked `PUBLIC`/`anon` execution are the compensating controls; the corresponding Supabase advisor warning is expected for this bounded endpoint.

Adding a fact requires coordinated changes to both the code registry and a forward-only binding migration, plus a deterministic extraction/reconciliation test. Merely detecting plausible text is not authorization to expand the registry.
