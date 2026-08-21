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

Meaningful `new`, `material_update`, `contradiction`, and `milestone_transition` resolutions also project to one deterministic persistent Info feed entry. `noise` and `corroboration` do not. Only explicitly mapped concepts update a maintained Info topic; Home remains a separate consequence gate. See `docs/INFO_KNOWLEDGE_MODEL.md`.

## Visibility and safety

Noise and raw findings do not render as user-facing Activity items. A concept renders once; a keyed legacy alert is suppressed when its database concept exists. Missing concept keys are never guessed or heuristically merged. Material updates, contradictions, and milestone transitions receive attention; ordinary corroboration does not.

No monitor baseline is accepted by reconciliation. Source evidence remains recoverable, and contradictions do not overwrite the prior active state.
