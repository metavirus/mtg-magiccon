# Project Context

## Product outcome

Build a private, mobile-first companion for one authenticated attendee at MagicCon Atlanta 2026. It should eventually support official convention intelligence, ticketed play, travel, lodging, purchases, tasks, deadlines, people, vendors, plans, evidence, changes, encounters, expenses, packing, and memories.

The first tranche proves the development and trust foundation rather than predicting the final schema.

## Operating periods

- **Before:** discovery, purchases, deadlines, preparation, and itinerary construction.
- **During:** fast mobile access, live changes, check-ins, notes, purchases, encounters, and resilient offline reading.
- **After:** memories, ratings, expenses, follow-ups, contacts, and durable archival.

The app remains useful after the convention rather than treating the event date as an endpoint. Its default interface should optimize decisions: what is next, approaching, conflicting, changed, paid, needed, or worth following up.

## Durable architecture

- Supabase is canonical for authenticated data.
- Development uses that single hosted project directly through guarded CLI and Session Pooler paths; no local Supabase replica is required.
- The installable web app provides a fast mobile shell and safe read-only offline access to previously loaded critical itinerary information.
- Network-confirmed writes only; offline mutations are disabled until an explicit conflict-safe design exists.
- Public/source-backed information and private personal continuity are separate concerns.
- Evidence preserves source identity, retrieval time, and exact claims. Normalized facts and interpretation do not erase it.
- Finite-event facts can be published, tentative, changed, canceled, contradicted, personally confirmed, observed onsite, or superseded.
- Publisher truth, observed reality, and personal interpretation remain separate; none silently overwrites another.
- Agent proposals and workflow requests are reviewable intake, never automatic canonical truth.
- Sensitive receipts, confirmations, screenshots, and travel artifacts belong in private Storage in a later tranche.

## Foundation proof and first trust slice

The foundation table `personal_notes` remains an owner-scoped private record used to prove authentication, grants, and RLS. It is intentionally not a convention-domain model.

The first bounded convention-domain implementation is the Black Lotus trust slice in `docs/BLACK_LOTUS_TRUST_SLICE.md`. Five deliberately narrow owner-scoped tables prove source identity, retained observation, one normalized dated occurrence, a reversible personal decision, and one itinerary placement. This is a proof of the evidence-to-plan path, not authorization for a comprehensive convention schema.

The conceptual growth path is `Source -> Observation -> Normalized entity -> Personal decision -> Itinerary`. The Black Lotus slice now proves the initial real-page path. A reviewed reconciliation fixture and real offline device test remain required before monitoring or broad normalization.

## Boundaries

This repository is not a fork of `mtg-events-chatgpt`. That repository is read-only methodology reference material. Do not copy its application, schema, migrations, records, secrets, users, exports, regional requirements, or Git history. Bulk MagicCon ingestion does not belong in this tranche. A temporary GitHub Pages preview is acceptable for iPhone review when it remains fixture-backed by default and clearly separate from production data deployment. Docker, WSL, a local Supabase stack, backend services, and enterprise environment promotion are outside the current architecture; see `docs/DEVELOPMENT_ARCHITECTURE.md`.
