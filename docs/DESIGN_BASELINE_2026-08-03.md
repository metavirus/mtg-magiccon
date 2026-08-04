# Design Baseline

Updated: 2026-08-03  
Status: Coherent MVP direction accepted; implementation contracts are next

## Survey conclusion

The design studies now describe one recognizable product rather than a collection of promising screens. The product is a quiet personal command center that becomes denser only when the convention creates real decisions or retrieval pressure.

The strongest organizing model is:

1. **Orient:** Home and Calendar explain what matters now and what happens when.
2. **Choose:** Explore translates the available universe; Plan resolves the few options worth comparing.
3. **Retrieve:** Map, Trip, Wallet, and Notes recover the place, proof, booking, or human memory needed in context.
4. **Trust:** Activity and object-level evidence explain what changed, where a fact came from, and what the owner did.

The current production application remains a foundation proof. The visual studies are interaction evidence and design direction; they are not implemented product state or permission to create broad schema.

## Canonical product shell

### Desktop

Use a persistent dark left rail with directly reachable Home, Calendar, Plan, Explore, Map, Wallet, Trip, and Notes. Activity remains below a divider as a utility destination. Local modes belong inside their surface headers.

The rail should carry the compact peach identity mark when the asset has been tested at navigation size. Content begins directly beside the rail with a modest fixed gutter and expands fluidly to the right; do not center the application inside a narrow maximum-width column. Individual prose regions may constrain line length, but the workspace and its comparative surfaces should use the available desktop field. Inspecting an object uses an overlay drawer so the underlying spatial or chronological context does not reflow.

### Mobile

Every destination must remain reachable in one obvious navigation step, but the exact stable bottom-bar composition is not yet accepted. The prototypes demonstrate that a bottom bar plus a labeled complete-destination surface is plausible; they do not justify hiding Wallet, Trip, Notes, or Activity behind deep nesting.

Mobile uses full-width readable rows, thin relational visualizations, and bottom sheets or focused views for detail. It preserves capability without reproducing desktop geometry.

### Shared interaction rules

- Natural cards, rows, date clusters, map marks, and timeline blocks are clickable across their useful area.
- Recognizable icons perform direct secondary actions; labels or accessible names remain available.
- Details use drawers, sheets, popovers, or focused views rather than expanding every list into brochure copy.
- Obvious behavior is not restated in prose.
- Notes are available in context without turning every object into a form.
- Source and change evidence remains inspectable but does not dominate the default interface.

## Accepted visual language

- Use a dark midnight/navy foundation with layered surfaces rather than a monochrome blue field.
- Use semantic color consistently: cool blue for focus, gold for purchase, violet for Black Lotus, rose for displacement or consequential conflict, green/mint for flexible or travel context, and neutral slate for ordinary information.
- Gold never doubles as selection.
- Icons and shading should replace walls of labels where comprehension remains clear.
- The peach mark supplies project identity; the full wordmark can appear in the shell while the simplified peach silhouette should drive favicon-scale treatment.
- Preserve visual rhythm through compact quiet rows, stronger anchors, and expandable dense clusters rather than equally heavy cards everywhere.

### Production density

The production shell must be materially denser than the early concept studies. Preserve comfortable 14–16px reading text, but reserve large typography and heavy weight for true page or object titles. Navigation, chips, state controls, and inset panels should use compact spacing and moderate weight. Avoid stacking large type, bold, bright fill, border, and generous padding on the same ordinary element. Touch targets remain usable even when their visible chips and labels are compact.

Desktop density comes primarily from a left-anchored fluid workspace, not tiny text. Mobile must be recomposed into full-width information flow rather than inheriting desktop grid columns and then shrinking them. A representative 390px viewport should show a page title, meaningful event summary, state controls, and the beginning of the next information surface without horizontal overflow; local-only diagnostic labels are excluded from the production density target.

## Shared planning-state grammar

| State | Object treatment | Person marker |
| --- | --- | --- |
| Interested | Quiet/faded category fill, dotted border | Stable fill, no border |
| Tentative | Full category fill, dotted border | Stable fill, dotted white border |
| Committed | Full category fill, solid border | Stable fill, solid white border |
| Purchased | Committed plus gold financial marker | Stable fill, gold border |

All state controls are reversible. Removing Purchased returns the event to its prior planning state. Included or free activities do not show a purchase action. Selected uses cool-blue focus, while displaced remains recoverable with a separate rose consequence cue.

## Surface baseline

### Home

Home is settled as a calm phase-aware status and command surface. In the quiet period it shows:

- trustworthy quiet or one consequential signal;
- a compact milestone runway with inspectable evidence-based timing estimates;
- the next confirmed dated anchor;
- direct Wallet and Trip references;
- a restrained Atlanta countdown;
- precise last-checked time in the lower-left utility area, not headline space.

Home does not show routine successful checks, synthetic excitement, or a feed of captured material. When a milestone lands, the useful handoff is the next milestone.

### Calendar

Calendar is a continuous meaningful-date stream, not a month grid. Its accepted first pass uses three density levels:

- light milestone or expected-window rows;
- stronger travel, deadline, purchase, or Black Lotus anchors;
- expandable convention-day clusters that summarize commitments and tentatives and link into Plan.

The evidence-based milestone estimates are explicitly forecasts. They preserve their reasoning and never become Atlanta facts merely because the app displays a date range.

### Explore

Explore is the browsing and translation surface. The accepted event-list direction includes:

- search, day controls, restrained filters, and useful sorting;
- continuous browsing rather than arbitrary pagination for a convention-sized list;
- time, duration, price/access, format or structure, availability, and a concise personal-fit reason;
- a source-backed complexity/competitive signal with Unknown before assessment and Inconclusive when evidence cannot support a conclusion;
- whole-row detail plus direct Interested, Tentative, and Hidden actions;
- a collapsed recoverable Hidden group and a deeper Not for me drawer;
- a visible bridge into Plan when a contender is created.

Rows should stay compact enough to browse 100-plus events. AI rationale is one useful sentence, not a personality layer.

### Plan

Implementation status: bracketed for v1.5. The direction below remains accepted design evidence, but it is not an MVP production contract. No planner-specific schema or complex interaction work proceeds until representative ticketed-play data exists.

Plan is the focused November 13-15 contention workspace. Its accepted responsive direction is:

- a dominant proportional desktop time field with a non-reflowing overlay drawer;
- a thin mobile time ruler paired with readable full-width event rows;
- visible overlap, fixed/flexible/fuzzy time, displacement, and recoverable alternatives;
- the shared planning-state and person-marker grammar;
- concise consequence preview before commitment;
- only overlapping fixed commitments treated as hard conflicts.

Calendar provides the onsite chronological glance. Plan provides the dense decision workspace. There is no separate Decide mode merely to change state.

### Event detail

Event detail translates organizer prose into a decision brief. High-position facts include name, time, duration, price/access, place if known, planning state, people, and refund consequence. It then provides:

- a one-sentence fit or caution rationale;
- compact event structure such as product, build, Swiss rounds, and prizes;
- an inspectable complexity/competition explanation;
- Plan effect;
- notes, related objects, source history, and full organizer wording behind disclosure.

Routine registration boilerplate stays available but recessed. A small question-mark affordance explains unusual formats such as Grand Melee.

### Map and Trip

Map begins honestly as two top contexts: Trip area and Event map. Before the 2026 floor map arrives, Trip area uses confirmed hotel and venue facts, provider links, transitions, and a modest clickable orientation sketch. The sketch is a quality-of-life aid, not claimed precision.

Event map says when the 2026 artifact is unavailable and may expose the 2025 Atlanta map only as historical structural evidence. Place details and backlinks are the MVP value. OCR, booth overlays, route intelligence, current-position hints, and an interactive atlas remain v2.

Trip remains the pleasant booking detail surface and owns hotel/flight sequences, people by stay, addresses, dates, confirmation references, and Maps/provider links. It does not become a travel-management system.

### Wallet

Wallet owns badges, entitlements, ticketed events, receipts, QR or alphanumeric proof, show-store purchases, and lightweight Prize Tix balance. The accepted direction includes:

- prominent Prize Tix with simple increments;
- extracted receipt line items, quantities, assignments, notes, and catalog links where available;
- original proof preserved exactly as received;
- a dedicated show mode for a QR, receipt image, or entitlement;
- PNG-first quick viewing with PDF retained where useful;
- deliberate reveal of sensitive values;
- object-aware offline status.

Proof opens in one focused layer, never stacked modal boxes.

The current Wallet Home POC is parked as design evidence rather than final polish. The next serious Wallet pass should begin from the onsite phone use case: show proof quickly, adjust Prize Tix with minimal friction, and then scale outward to desktop. Prize Tix may work better as a right-edge quick drawer or similar transient control than as a large permanent hero object. The ticket art needs a stronger generated or source-inspired treatment, a softer border, and a composition that does not crowd badge proof.

### Notes and Activity

Notes defaults to human-authored notes from any context and backlinks into the original event, place, receipt, artist, vendor, or item.

Activity remains the chronological trust/history surface with All, Changes, Sources, and Personal streams. Rapid related actions may collapse into one burst that names the actor and final state while preserving individual steps behind expansion. Entries remain clickable into their context; routine monitoring success and diagnostics stay recessed.

## Intelligence baseline

AI earns space only when it reduces interpretation or retrieval work. Approved patterns include:

- translating dense event copy into a decision brief;
- explaining why an event may fit or not fit the owner's known preferences;
- estimating format complexity or competitive intensity from inspectable evidence;
- forecasting likely milestone windows from prior events and email evidence with visible uncertainty;
- identifying the personal consequence of a source change;
- pointing out schedule pressure, back-to-back risk, or a genuinely useful missing decision;
- asking a rare yes/no or A/B question when the answer resolves a real ambiguity.

AI does not create engagement prompts, routine-adult advice, forced excitement, unsupported certainty, or silent canonical decisions.

## Offline and freshness baseline

Offline support protects retrieval, not multi-writer synchronization. Critical Plan, Map, Trip, and Wallet objects may be cached with an understandable “as of” time. Offline state is read-only. Pending or uncertain writes never masquerade as canonical state, and newer server facts never get silently overwritten.

Home's last-checked time is an overall watch-set signal. Object-level freshness remains available where the owner may rely on a specific schedule, place, or proof.

## MVP boundary

The design baseline authorizes the following next implementation slice:

1. a thin persistent shell and shared responsive interaction primitives;
2. one Atlanta Black Lotus source snapshot and observation;
3. one normalized dated occurrence;
4. one reversible personal decision and visible Plan consequence;
5. one source-revision reconciliation path;
6. one critical offline-readable view with freshness.

It does not authorize broad MagicCon ingestion, production monitoring, Gmail automation, the full event planner, comprehensive artifact storage, multi-user collaboration, indoor navigation, or full visual polish.

## Remaining design questions

These can be resolved against working behavior rather than more isolated mockups:

1. Which stable mobile bottom destinations provide the best one-handed access without conceptually burying Wallet, Trip, Notes, or Activity?
2. How dense can a real Atlanta Explore list become before filters or virtualization are necessary?
3. What exact fields belong in the first offline Black Lotus view?
4. Does the peach wordmark remain legible in the desktop rail, and what simplified silhouette is best for favicon and compact mobile identity?
5. Which change deserves Home attention versus only an object annotation or Activity entry?

## Exit test for the next slice

The first implementation is successful when the owner can trace one Black Lotus claim to its source, express a decision, see its dated Plan consequence, reconcile a later conflicting observation without losing history, and reopen the approved critical view offline with visible freshness and no unsafe mutation path.
