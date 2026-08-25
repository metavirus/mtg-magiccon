# Monitoring concept reconciliation

Updated: 2026-08-21

## Contract

Page hashes, navigation deltas, wording churn, and fetched source snapshots are internal evidence. The user-visible unit is a stable planning concept that Kavi is likely not already seeing elsewhere.

The deterministic reconciler resolves every observation as one of:

- `noise`: no stable planning fact; retain raw evidence only;
- `corroboration`: the same semantic state from another or repeated source; add provenance to the existing concept;
- `new`: first supported observation for a concept;
- `material_update`: a planning-relevant field such as date, time, inventory, sale condition, sold-out state, cancellation, or purchase rule changed;
- `contradiction`: incompatible active claims must remain side by side for review;
- `milestone_transition`: an explicit phase boundary such as announced → open was crossed.

`monitoring_findings` remains the raw, fingerprint-deduplicated source-diff layer. `monitoring_concepts` is a Kavi-only derived read model keyed by deterministic `concept_key`; `monitoring_concept_evidence` retains lineage to every contributing finding. Neither table is canonical publisher truth.

## Deterministic identity

Concept identity comes from versioned extraction rules over normalized facts, never fuzzy title similarity alone. The first supported keys are:

- `atlanta:ticketed-play:sales-opening` for the published sale date/time and sale phase;
- `atlanta:magic-play:official-resources-available` for labeled first-party Magic Play resource availability.

Repeated mentions of the August 25, 10 AM PT Ticketed Play sale resolve to one concept. Corroboration adds evidence/provenance without producing another Home or Hot card and without downgrading an existing material attention state.

When that concept crosses from `announced` to `open`, reconciliation records `milestone_opened_at` once. The app derives one coordinated consequence set from that same concept:

- a left-column `ON SALE NOW` Home hero for seven days;
- one urgent inbox item at the top of the inbox, with the small reduced-motion-safe shiver bell overlapping the envelope's top-left corner;
- dismissal into the recoverable collapsed Dismissed group, which stops the shiver without removing the seven-day Home hero;
- after the feature window, an unread item falls back to the ordinary Hot list rather than creating a second concept;
- the Ticketed Play milestone remains permanently complete as `Sales open`; its state is not tied to the temporary hero window.

The hero and inbox item link directly to the official Ticketed Play schedule. The QA sale-open overlay is presentation-only and must never write review state into the real monitoring concept.

The August 25 transition is also encoded as a one-time scheduled monitoring milestone, so it does not depend on an official page producing a novel diff at exactly the right moment. The daily surveyor runs at 17:15 UTC (10:15 AM Pacific during PDT), after the published 10:00 AM opening time. The reached marker is persisted in monitoring state; cache loss may replay the same stable fingerprint, but concept and finding deduplication prevent a second user-visible concept.

Meaningful `new`, `material_update`, `contradiction`, and `milestone_transition` resolutions upsert one deterministic current Info entry keyed by stable topic/concept. They do not append fingerprint-named cards. `noise` and `corroboration` do not project; link-only discovery remains internal. A later material change updates the concept's current card and article history rather than duplicating Recent information. Only explicitly mapped concepts update a maintained Info topic; Home remains a separate consequence gate. See `docs/INFO_KNOWLEDGE_MODEL.md`.

Projection additionally requires structured source content plus a retained content fingerprint. A discovered link or navigation change alone is incomplete evidence and produces neither a finished article nor a user-visible Info publication.

## Visibility and safety

Noise and raw findings do not render as user-facing Activity items. A concept renders once; a keyed legacy alert is suppressed when its database concept exists. Missing concept keys are never guessed or heuristically merged. Material updates, contradictions, and milestone transitions receive attention; ordinary corroboration does not.

No monitor baseline is accepted by reconciliation. Source evidence remains recoverable, and contradictions do not overwrite the prior active state.

## Bounded first-party article intake

The watch check may follow article links discovered only on the already-approved `global-magiccon-news` index. This is not a general crawler: linked pages must use HTTPS on the exact `www.mtgfestivals.com` host under `/global/en-us/magiccon-news/`. Fragments are removed, query parameters are sorted, and canonical URLs are deduplicated before fetch. The ordinary Atlanta watch pages are not discovery seeds.

Each run considers at most 12 candidate links and fetches at most four pages, once each, with an eight-second timeout and 192 KiB response limit. Redirects, credentials, ports, off-host targets, non-HTML content, and oversized bodies fail closed. One linked-page failure is recorded compactly and does not stop remaining watch sources or articles. Scripts, styles, comments, and markup are removed; only bounded visible text reaches deterministic claim extraction.

During explicit first-time initialization, eligible Atlanta index records are fingerprinted as a quiet, bounded baseline (continuing across runs if more than four exist); historical index contents do not enter reconciliation as new observations. Thereafter, newly discovered pages and the bounded tracked set are fetched, with content fingerprints persisted in ignored monitoring state. Repeated unchanged content is quiet. Only index records whose label or canonical URL explicitly names Atlanta are eligible; incidental Atlanta wording inside an Amsterdam or Vegas article never reaches the Atlanta extractor. Eligible evidence is archived and sent through the maintained-Info concept path; source existence alone cannot create a generic newsletter Activity item. Equal registered values add provenance, while one comparable changed fact may produce the existing precise factual-choice review.
