# Info knowledge model

Updated: 2026-08-22

Info is the durable shared official-knowledge surface. Map remains spatial. Activity remains app and user activity.

`info_feed_entries` retains useful official updates even when no maintained topic is warranted. Its default Recent projection is not an append-only event log: `concept_key` is the stable semantic identity and exactly one `feed_status = 'current'` row may exist per concept. Superseded rows retain history, while link discovery and ingestion bookkeeping remain `internal`. `info_topics` holds concise current answers for recurring retrieval needs such as show hours, Will Call, Ticketed Play, On-Demand Play, and Prize Tix. Topic details retain current facts, update date, sources, and related feed entries. Both tables are shared read-only knowledge for active companions; trusted surveyor/database lanes write them.

Surveyor routing is deterministic:

- noise creates nothing;
- corroboration adds source evidence to the concept layer silently;
- new concepts and meaningful updates upsert one stable concept-current Info feed entry; a fingerprint is evidence, never card identity;
- corroboration, superseded summaries, link-only discovery, and ingestion bookkeeping never render as separate Recent cards;
- a recognized maintained topic is updated only when the deterministic concept mapping warrants it;
- contradictions and milestone transitions persist without overwriting raw evidence;
- Home receives only separately justified timely or consequential items.

Raw source diffs stay in monitoring evidence. Info does not accept monitoring baselines, manufacture facts, or replace publisher evidence.

## Maintained article contract

Link discovery is never a finished article. `article_status = incomplete` remains internal/compact until a reviewed source-content extraction supplies a lede and at least one factual section. A maintained article contains ordered sections, explicit unknowns, explicit contradictions, recent changes, and keyed sources. External originals are optional provenance at the bottom; the factual synthesis must stand alone.

`info_source_snapshots` retains the official URL, publisher, retrieval time, HTTP status, SHA-256 content fingerprint, and structured capture metadata. It deliberately does not store full copyrighted page bodies. `pnpm info:seed-sql` produces the reviewed idempotent SQL data correction; `pnpm info:ingest` is the server-secret operational lane for later source-backed refreshes.

The first comprehensive capture synthesizes the official Atlanta Prize Wall, On-Demand Events, Ticketed Play Schedule, and play-guide pages, plus the retained official order-confirmation evidence for show hours and Will Call. All five topics are maintained articles. The On-Demand article preserves the unresolved Sunday timing tension between the 3 PM voucher-sales cutoff and 4 PM Commander registration end instead of silently choosing an interpretation.
