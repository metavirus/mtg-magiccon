# Project Context

Reconciled: 2026-09-19. `CURRENT_FRONTIER.md` owns current acceptance and next work; this file describes the durable product model, not a second backlog.

## Product outcome

Build an authenticated, mobile-first companion for Kavi's MagicCon Atlanta 2026 group. Shared convention, event, trip, and receipt context supports preparation and onsite use; personal preferences and Kavi's card-signing workbench retain their explicit privacy boundaries. Broader future concepts are not promises of implemented functionality.

The project began with a narrow development/trust tranche and has since grown into the connected v1.5 companion described in `CURRENT_FRONTIER.md`; schema expansion remains evidence-driven rather than speculative.

## Operating periods

- **Before:** discovery, purchases, deadlines, preparation, and itinerary construction.
- **During:** fast mobile access, live changes, check-ins, notes, purchases, encounters, and resilient offline reading.
- **After:** memories, ratings, expenses, follow-ups, contacts, and durable archival.

The app remains useful after the convention rather than treating the event date as an endpoint. Its default interface should optimize decisions: what is next, approaching, conflicting, changed, paid, needed, or worth following up.

## Durable architecture

- Supabase is canonical for authenticated data.
- Development uses that single hosted project directly through guarded CLI and Session Pooler paths; no local Supabase replica is required.
- The installable web app hydrates the authenticated production read model and permitted receipt/media artifacts for read-only device access. Installed-iPhone offline proof is accepted. Missing server artifacts cannot be cached; external destinations and first-time authentication remain online-only.
- Network-confirmed writes only; offline mutations are disabled until an explicit conflict-safe design exists.
- Public/source-backed information and private personal continuity are separate concerns.
- Evidence preserves source identity, retrieval time, and exact claims. Normalized facts and interpretation do not erase it.
- Finite-event facts can be published, tentative, changed, canceled, contradicted, personally confirmed, observed onsite, or superseded.
- Publisher truth, observed reality, and personal interpretation remain separate; none silently overwrites another.
- Agent proposals and workflow requests are reviewable intake, never automatic canonical truth. Once Kavi explicitly approves a named, bounded consequence, that approval may authorize the system to execute the safe canonical update and production verification end to end; do not require a redundant later chat request.
- Receipt originals and other ingested proof artifacts already use authenticated Storage and the device proof pack. Preserve faithful Gmail-looking proof, not reconstructed receipt content. Missing hotel-original bindings remain intake work, not a future Storage implementation.
- Shared trip/event context is shared unless a real privacy reason says otherwise; Black Lotus context is not secret. Kavi's card-signing workbench and signing details remain Kavi-only for now.

## Foundation proof and first trust slice

The foundation table `personal_notes` began as an owner-scoped private record used to prove authentication, grants, and RLS. It is now also the canonical universal contextual-notes layer: notes attach to app objects such as events, receipts, trip items, places, artists, alerts, or proofs without creating destination-specific note tables.

The companion table `user_selections` is the canonical owner-scoped persistence layer for UI choices that must follow the authenticated user across devices: event interest/tentative/committed/hidden/not-for-me state, Activity review state, wallet counters, and later assignment-style choices. Browser storage is acceptable only for UI chrome and read-only offline cache; user-authored notes and user selections belong in Supabase so future collaboration can build on one shared data model. See `docs/USER_SELECTIONS_MODEL.md`.

The roster table `companion_members` is the canonical lightweight identity scaffold for the Atlanta group. It separates people from auth accounts so the app can render consistent person bubbles before everyone logs in: Kavi (`Ka`) and Chris (`C`) have baseline Black Lotus entitlement; Juan (`J`) and Kyle (`Ky`) have Premium badges. Each invited companion must be preconfigured by Google email so first OAuth login links their `auth.users.id` automatically; the app should not require a manual per-user hydration scramble after they sign in. Black Lotus schedule/items may be visible to the whole companion group, but entitlement-specific actions should assume Kavi and Chris unless the user explicitly records a real handoff.

`note_mentions` is the first collaboration-ready backend primitive layered on top of the universal notes system. It is not a chat system and it does not yet decide notification semantics. It simply records that a note intentionally mentioned one or more known companion members so later shared review, unread/dismissed state, and targeted activity rules have a canonical place to live.

The first bounded convention-domain implementation is the Black Lotus trust slice in `docs/BLACK_LOTUS_TRUST_SLICE.md`. Five deliberately narrow owner-scoped tables prove source identity, retained observation, one normalized dated occurrence, a reversible personal decision, and one itinerary placement. This is a proof of the evidence-to-plan path, not authorization for a comprehensive convention schema.

The conceptual growth path is `Source -> Observation -> Normalized entity -> Personal decision -> Itinerary`. The Black Lotus slice proves the initial real-page path. The deployed cloud surveyor now verifies supported reconciliation, Home projection, closure, and exact-report baseline acceptance. This does not prove every future source consequence or receipt-ingestion path. Any remaining trust-slice reconciliation exercise is artifact-dependent; accepted iPhone offline proof is not validation debt. See `CURRENT_FRONTIER.md` and `docs/WORK_BACKLOG.md` for the precise remaining scope.

Public discovery and private Gmail coverage are separate lanes. GitHub Actions owns the public-source baseline and privileged consequences. The supervisor records complete/partial/not-checked Gmail coverage independently; search success does not mean receipts were ingested or visually verified. `docs/AUTOMATION_TRUTH_TABLE.md` and `docs/PRIVATE_MONITORING_COVERAGE.md` define those proof boundaries.

## Boundaries

This repository is not a fork of `mtg-events-chatgpt`. That repository is read-only methodology reference material. Do not copy its application, schema, migrations, records, secrets, users, exports, regional requirements, or Git history. Broad automated MagicCon ingestion remains out of scope; reviewed evidence intake is not automatic canonical ingestion. The temporary GitHub Pages app is personal preview hosting with auth-first live Supabase state plus explicit fixture fallbacks, clearly separate from production hosting. Docker, WSL, a local Supabase stack, backend services, and enterprise environment promotion are outside the current architecture; see `docs/DEVELOPMENT_ARCHITECTURE.md`.
