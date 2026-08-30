# Info knowledge model

Updated: 2026-08-28

Info is the durable shared official-knowledge surface. It has two modes: **Guide** and **Catalogs**. Guide is the only visible mode initially. Catalogs remains hidden until real, source-backed Atlanta inventory exists. Map remains spatial, Explore remains events and opportunities, Wallet remains owned/purchased/showable proof, and Activity owns source/change history plus app and user activity.

`info_topics` supplies the Guide's concise current answers for recurring retrieval needs such as show hours, Will Call, Ticketed Play, On-Demand Play, and Prize Tix rules. Topic details retain current facts, update date, sources, and related concept history. `info_feed_entries` remains a reconciliation/history structure keyed by stable `concept_key`; it does not require or authorize a visible Recent mode in Info. When a concept-current update deserves user-visible chronology, Activity is its feed surface. Superseded rows retain history, while link discovery and ingestion bookkeeping remain `internal`. These structures are shared read-only knowledge for active companions; trusted surveyor/database lanes write them.

Surveyor routing is deterministic:

- noise creates nothing;
- corroboration adds source evidence to the concept layer silently;
- new concepts and meaningful updates upsert one stable concept-current entry for reconciliation; a fingerprint is evidence, never card identity;
- corroboration, superseded summaries, link-only discovery, and ingestion bookkeeping never render as separate Activity items or Info content;
- a recognized maintained topic is updated only when the deterministic concept mapping warrants it;
- contradictions and milestone transitions persist without overwriting raw evidence;
- Home receives only separately justified timely or consequential items.

Raw source diffs stay in monitoring evidence. Info does not accept monitoring baselines, manufacture facts, or replace publisher evidence.

## Catalog contract

Catalogs contains exactly three current-event inventory families: Show Store, Black Lotus Store, and Prize Wall. A family appears only after reviewed first-party or otherwise approved evidence establishes real Atlanta inventory. Store receipts, purchases, entitlements, claimable proof, and Prize Tix balance remain in Wallet; event and participation discovery remains in Explore.

A product can be offered through multiple families without becoming multiple product identities. Store and Prize Wall appearances are separate offers with separate values and availability: a Play Booster may be sold for money in Show Store and redeemed for Prize Tix at Prize Wall. Prize Wall offers never carry a money price, and the browser displays their full Prize Tix cost.

Prior-event catalog fixtures may be used only in explicit QA modes as precedent for information shape, visual density, filters, and interactions. They must carry their real event and year, stay out of the default Atlanta data path, and never be labeled, implied, counted, or displayed as Atlanta inventory. An honest hidden mode is preferable to plausible placeholder merchandise.

## Maintained article contract

Link discovery is never a finished article. `article_status = incomplete` remains internal/compact until a reviewed source-content extraction supplies a lede and at least one factual section. A maintained article contains ordered sections, explicit unknowns, explicit contradictions, recent changes, and keyed sources. External originals are optional provenance at the bottom; the factual synthesis must stand alone.

`info_source_snapshots` retains the official URL, publisher, retrieval time, HTTP status, SHA-256 content fingerprint, and structured capture metadata. It deliberately does not store full copyrighted page bodies. `pnpm info:seed-sql` produces the reviewed idempotent SQL data correction; `pnpm info:ingest` is the server-secret operational lane for later source-backed refreshes.

The first comprehensive capture synthesizes the official Atlanta On-Demand Events, Ticketed Play Schedule, play-guide, Prize Tix rules, and retained official order-confirmation evidence for show hours and Will Call. Those operational topics belong in Guide. Prize Wall item inventory belongs in Catalogs and remains hidden unless the captured evidence is real current Atlanta inventory. The On-Demand article preserves the unresolved Sunday timing tension between the 3 PM voucher-sales cutoff and 4 PM Commander registration end instead of silently choosing an interpretation.
