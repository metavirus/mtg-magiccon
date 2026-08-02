# Planning and Intelligence Model

Updated: 2026-08-01
Status: Planning-language gate accepted; screen behavior remains to be tested

## Purpose

Define how the app represents personal consideration, access, schedule pressure, time uncertainty, preference intelligence, and lightweight AI feedback without conflating publisher facts with owner decisions.

This is product language, not a database schema.

## Decision funnel

Planning intent follows a small, understandable funnel:

1. **Interested** — worth remembering; no calendar consequence.
2. **Tentative** — a serious contender placed into Plan for comparison and conflict analysis.
3. **Committed** — protect this timeslot in the working plan, including for free or Black Lotus-included activities.
4. **Attended** or **Skipped** — observed personal outcome.

The app does not add a separate Shortlisted state. Tentative already means “good contender being weighed.”

### Visual candidates

- Heart: Interested.
- Shaded or dashed time block: Tentative.
- Solid time block: Committed.
- Attendance outcome: a later, visually quieter historical treatment.

## Access and purchase are separate

Access is not the final planning state. It is an independent fact:

- open or free;
- eligible through Black Lotus or another entitlement;
- purchased.

Purchased uses a warm-gold lock. It means money or entitlement is attached and remains consequential even if the owner ultimately skips participation.

Marking an event Purchased staples it into Plan and defaults it to Committed because purchase is the strongest expression of intent. The event remains a fixed planning consequence until the owner explicitly marks it Skipped or otherwise releases the commitment. Leap removing it from a displayed schedule does not erase the purchase or free the time in this app.

An event may therefore be:

- purchased and committed;
- purchased and later skipped;
- tentative but not purchased;
- committed because it is included with Black Lotus.

## Removing things from consideration

Negative and cleanup actions carry different meaning:

- **Hidden:** removes clutter, remains easily restorable, and does not create a strong preference signal.
- **Not for me:** an emphatic negative signal that moves the object into a deeper drawer and informs future relevance judgments.
- **Passed:** considered and deliberately declined, without necessarily expressing categorical dislike.
- **Skipped:** intended, committed, or purchased but not attended; an outcome rather than a taste signal.

Not for me never erases source evidence. Similar objects may be de-emphasized but are not automatically rejected. Automatic deep-drawer placement requires either an explicit owner action or a stable owner-approved rule.

## Tentatives as a synthesis layer

Tentatives are a primary value surface, not weak commitments. They let the owner see and compare multiple serious contenders together without returning to separate source pages.

Committing one overlapping event does not automatically change neighboring Tentatives to Passed or Hidden. They remain recoverable in context and become visibly displaced by the committed block. If the commitment changes, sells out before purchase, or loses appeal, the alternatives are still available without reconstructing the earlier comparison.

## Preference intelligence

The product should avoid opaque numeric fit scores. It may use restrained qualitative judgments:

- strong fit;
- worth considering;
- probably not for you;
- not enough information.

Every judgment needs concrete, inspectable rationale such as:

- flexible social league;
- Commander format;
- mystery or surprise element;
- Black Lotus included;
- unusual guest or personality-driven experience;
- high price;
- competitive qualifier or cEDH;
- routine precon or draft;
- conflicts with a purchased event.

Preference intelligence may order, shade, or de-emphasize Explore results. It cannot hide or reject an event automatically.

## Intelligence chiclet

Each event may show one compact sparkle-marked intelligence chiclet near its title. It presents the most decision-relevant insight, not a collection of AI badges.

The chiclet can synthesize:

- **Event fit:** how the event aligns with known preferences.
- **Plan context:** how the event interacts with purchases, commitments, duration, food opportunity, proximity, or other schedule pressure.

Situational consequences outrank general taste in the visible chiclet. A strong-fit event that creates an unreasonable uninterrupted day should show the schedule concern first. The event drawer can retain the full fit rationale.

Chiclet language is light and suggestive: “likely a good fit,” “worth reconsidering,” or “awkward today.” Clicking it reveals inputs, rationale, confidence, and uncertainty.

## Two-speed intelligence

### Immediate embedded logic

Routine plan reasoning runs automatically in the app whenever relevant data changes:

- direct time overlap;
- back-to-back timing;
- access and purchase locks;
- fixed versus flexible activities;
- long uninterrupted stretches;
- subtle meal-window pressure;
- more than two ticketed-play events in a day;
- known transition or location uncertainty.

Marking an event Purchased must immediately recalculate adjacent events and their relevant insights. Opening a separate Codex session is not part of ordinary schedule operation.

### Daily “Codex sauce” pass

A later daily monitoring agent may provide a slower reflective pass over the previous day's source changes and owner activity. It may:

- refresh preference and schedule-context insights;
- identify compound effects across several small changes;
- recognize newly extracted flexibility or competitiveness;
- compare a new Black Lotus option with an existing tentative;
- propose one useful uncertainty for owner feedback;
- place a richer issue in the next full Codex-session inbox.

It may not alter source evidence, personal planning states, purchases, calendar placement, or external systems. It may nominate an alert, but ordinary alert policy remains the notification authority. Producing nothing for weeks is healthy behavior.

The daily agent remains downstream of the proven manual source workflow and is not authorized for the trust slice.

## Guarded AI feedback

The app may expose a constrained async feedback loop for periods when the owner is not interacting directly with Codex:

`Meaningful uncertainty -> one small prompt -> explicit owner response -> daily-agent review -> improved future insight`

Prompts use low-effort Yes/No or A/B answers and preserve:

- what triggered the question;
- the related event or decision;
- why an answer matters;
- the exact response and time;
- whether the answer is local or a broader preference;
- whether a later agent incorporated it.

Guardrails:

- at most one unanswered prompt is visible in Now;
- ask only when the answer changes future classification, recommendation, or alerting;
- dismissal is harmless and produces no nagging;
- no engagement prompts, satisfaction surveys, praise, or abstract preference interviews;
- agent interpretations remain proposals; explicit owner answers become personal preference evidence;
- feedback cannot silently change commitments, purchases, or calendar placement.

Completed and unanswered prompts remain available in an AI Feedback stream within Activity. This stream can also become the review inbox for the next full Codex session.

“Son of Codex” is an internal name for the constrained resident intelligence role, not necessarily a user-facing label. Visible language should remain quieter, such as Insight or AI Feedback.

## Time semantics

### Fixed versus flexible

The app preserves an organizer's published time separately from the owner's personal placement.

A flexible league or similar activity may have:

- a **published anchor:** the time shown by Leap or another source;
- a **usable window:** when participation can actually occur;
- a **personal placement:** when the owner tentatively hopes to participate.

The interface need not expose this model ceremonially. Explore shows the official listing. Plan can show a faint movable block. Moving the personal placement never rewrites publisher truth.

Flexible blocks create visible planning pressure but not hard conflicts. A fixed event may overlap them with an explanation that the flexible activity can move.

### Firm starts and fuzzy endings

Event time can be asymmetric:

- **Published start:** firm unless changed by the organizer.
- **Published or estimated end:** an organizer estimate.
- **Personal expected exit:** when the owner may choose or expect to leave.
- **Observed exit or end:** what actually happened onsite.

The default requires no owner input: use the published interval. Optional fuzziness activates only when useful:

- the owner marks May leave early;
- the owner adds a rough expected exit;
- the source explicitly describes variable rounds, elimination, or flexible participation;
- AI suggests the possibility in an insight without changing the schedule.

A fuzzy tail may be drawn with fading or hatched treatment. A lunch block or subsequent activity can sit inside it as conditional overlap, with an explanation such as “depends on leaving the event early.”

### Back-to-back activities

The app does not impose a mandatory transition buffer. Back-to-back activities remain schedulable because the owner often has enough flexibility to leave an earlier event.

An adjacent event may receive a contextual insight such as “starts when your previous event is scheduled to end.” If the earlier event has a fuzzy tail or May leave early, the app explains that the transition is manageable but depends on leaving promptly.

### Departure alerts

Onsite Now may alert the owner approximately 15 minutes before it is time to begin heading to a Committed or Purchased event. If location and routing evidence later support a better lead time, the reminder may become more informed without claiming false indoor-navigation precision.

Tentative events may show an in-app countdown but do not create a push alert unless explicitly requested.

## Conflict hierarchy

- **Hard conflict:** two fixed Committed activities overlap. Committed is the only “cannot do both” planning state.
- **Conditional overlap:** the combination works only by moving something flexible or leaving an event early.
- **Schedule pressure:** back-to-back timing, long uninterrupted play, meal-window concern, or uncertain transition deserves attention but does not block the plan.
- **Alternative:** Tentative contenders occupy the same time while the owner weighs them. This is expected planning work, not an error.

Two overlapping Tentatives remain visible as alternatives. A Tentative overlapping a Commitment is visibly displaced. Flexible activities can overlap a Commitment with an explanation that they can move.

Purchased staples an event into Plan and defaults it to Committed. Even if Leap permits removal from its display schedule, the app retains the block because entitlement and financial consequence remain. Only an explicit owner decision to skip or release the event frees the timeslot; the gold purchase record remains.

The product does not need a separate claimable-item workflow for skipped events in this tranche. Event detail may retain included product information and accept a simple note such as “grab product only.”

## Source-state presentation

Normal publisher information receives no “normal” or Published badge. Visual attention is reserved for exceptions.

- **Tentative:** publisher uncertainty remains visible.
- **Changed:** amber attention state until reviewed; old and new values are inspectable.
- **Canceled:** remains visibly exceptional.
- **Contradicted:** preserves both supported claims and does not select a winner silently.
- **Superseded:** retained in history rather than dominating the current card.

Changed is an attention lifecycle, not a permanent identity. If it affects a Committed or Purchased event, it remains prominent until acknowledged. After review, the current value returns to ordinary presentation while the change remains in Activity and evidence history.

Attention has three levels:

- **Ambient cue:** subtle edge, tint, or dot worth noticing while scanning.
- **Attention item:** clear Changed treatment and summary for an Interested or Tentative object.
- **Active alert:** Now placement and possible notification only for real consequence to a Commitment, purchase, deadline, travel fact, or major milestone.

Contradictions use a split-source treatment and present claims side by side. When the conflict affects app behavior, a guarded A/B prompt can ask the owner to choose an operational interpretation. That answer becomes definitive personal guidance without erasing or resolving publisher truth.

Default suggestions may depend on the fact:

- deadline conflict: suggest the earlier safer date;
- schedule or location conflict: suggest the latest dated official observation;
- never apply a consequential choice without owner input.

The MVP should not rely on voluntary onsite reporting. Personal observations may remain possible as contextual notes, but the interface does not ask the owner to record room changes, queues, or operational reality. Current publisher information remains the default unless a captured update or explicit owner note provides something better.

## Remaining screen questions

- Whether Passed needs a frequent direct control or can live inside the negative-action menu.
- How planning insights age visually when underlying schedule or event description changes.
- Exact mobile controls for tentative placement, expected exit, and intelligence explanation.
- How displaced Tentatives remain legible without overcrowding the contention canvas.

## Boundary

This model does not authorize the daily agent, monitoring, push delivery, AI API integration, comprehensive event schema, or a general scheduling engine. It defines product behavior that the design and later trust slice must be able to accommodate.
