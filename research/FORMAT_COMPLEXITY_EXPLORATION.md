# Format Complexity Exploration

Status: Initial bounded research; proposal, not canonical format data  
Target: MagicCon Atlanta 2026  
Retrieved: 2026-08-02

## Decision question

How can the app help a moderate-skill attendee understand whether an unfamiliar event will be easy, mentally demanding, or genuinely competitive without collapsing those different ideas into an unexplained AI score?

## Finding

A single difficulty rating is useful as an at-a-glance display, but it should be derived from several separately supported signals:

1. **Rules novelty** — how many unusual rules or interaction patterns must be held in mind.
2. **Preparation burden** — whether the player can open and play, must build onsite, draft under time pressure, bring a tuned deck, or prepare for a metagame.
3. **Live mental load** — simultaneous decisions, multiplayer politics, coordination, hidden information, deck construction, and long-round concentration.
4. **Competitive stakes** — casual or Regular REL play versus elimination, Competitive REL, qualification, cash, or premier-play advancement.

The interface may render one green-to-red thermometer for quick scanning, but its label and explanation must distinguish the dominant reason. Examples:

- **Easy · open and play**
- **Moderate · onsite deckbuilding**
- **Demanding · unusual multiplayer rules**
- **Highly competitive · qualifier stakes**

Personal attractiveness remains separate. A demanding novelty event may still be a strong recommendation, while a mechanically familiar qualifier may be an emphatic personal mismatch.

## Initial comparison set

The ratings below are design hypotheses on a relative 1–5 scale. They are interpretations derived from the cited organizer descriptions, not publisher claims and not yet a comprehensive registry.

| Format or event shape | Rules novelty | Preparation | Live mental load | Competitive stakes | Suggested headline | Why |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Commander Precon Battle | 1 | 1 | 2 | 1 | Easy · open and play | A supplied preconstructed deck removes deckbuilding and bring-your-own preparation; the cited event used Regular REL and two Swiss rounds. |
| Mini-Masters / Pack Wars | 2 | 1 | 1 | 1 | Easy · quick play | One booster becomes the deck after adding lands; best-of-one games are short. |
| All Play | 2 | 1 | 2 | 1 | Easy–moderate · unusual sealed shortcut | Players use all six packs without building a normal deck, but must remember special land and cycling rules. |
| Standard Sealed side event | 1 | 3 | 3 | 2* | Moderate · build onsite | Six boosters, a 40-card minimum, and onsite deck construction create meaningful cognitive work. Stakes depend on the particular event. |
| Booster Draft side event | 2 | 4 | 4 | 2* | Demanding · draft and build | Players evaluate picks in real time, track a changing card pool, build a 40-card deck, then play. Stakes depend on the event. |
| Two-Headed Giant | 3 | 2–3* | 4 | 2* | Demanding · coordinate every turn | Shared turns and life, separate resources, team strategy, and multiplayer rule differences increase live load. Product and stakes depend on the event. |
| Grand Melee | 5 | 1–3* | 5 | 2* | Demanding · unusual multiplayer rules | Up to hundreds of players share one game; attack direction, range of influence, concurrent turn markers, elimination, and corner cases require sustained attention. It is not automatically a high-stakes event. |
| Last Commander Standing | 4 | 5 | 5 | 5 | Very hard · competitive multiplayer | Single elimination, Competitive REL, timed sudden death, formal multiplayer policy, and a prepared legal Commander deck materially raise both cognitive and competitive burden. |
| Qualifier / premier-play path event | 1–3* | 5 | 5 | 5 | Very hard · qualification stakes | The underlying format varies, but preparation and opponent strength matter because top finishes advance toward Regional Championships, Pro Tours, or other premier events. |

`*` The event instance must override the format default when product, REL, structure, prizes, or qualification stakes are published.

## Product implications

- Show the compact thermometer near price and time, paired with a plain-language label.
- Tapping it should reveal the four contributing signals and exact rationale.
- Never infer competitive intensity merely from a strange format name.
- Treat explicit terms such as `Competitive REL`, `single elimination`, `qualifier`, `Top 8`, `decklist required`, and premier-play invitations as strong competitive signals.
- Treat `preconstructed deck supplied`, `no supplies needed`, `Regular REL`, and participation-based prizes as easing signals.
- Treat drafting, timed deck construction, team coordination, multiplayer politics, simultaneous turns, special zones, or format-specific turn procedures as mental-load signals.
- Allow event-level wording to override the format baseline. “Grand Melee” can be constructed, Commander, or sealed; those variants do not impose the same preparation burden.
- Preserve confidence and source coverage. If the event omits REL or round structure, display the assessment as incomplete rather than manufacturing certainty.

## Proposed maintainable table

The eventual table should be a reviewed format-intelligence registry, not a hard-coded color assignment:

| Field | Purpose |
| --- | --- |
| `format_key` | Stable internal identifier such as `grand_melee` or `booster_draft`. |
| `display_name` | Current organizer-facing name. |
| `rules_novelty_default` | Evidence-backed 1–5 baseline. |
| `preparation_default` | Evidence-backed 1–5 baseline. |
| `mental_load_default` | Evidence-backed 1–5 baseline. |
| `competitive_default` | Evidence-backed 1–5 baseline. |
| `plain_language_summary` | Compact explanation for the event detail surface. |
| `easing_signals` | Structured cues that lower an event-instance assessment. |
| `escalating_signals` | Structured cues that raise an event-instance assessment. |
| `source_observation_ids` | Evidence supporting the current baseline and explanation. |
| `assessed_at` / `assessment_version` | Freshness and interpretation version. |
| `review_state` | Proposed, reviewed, contradicted, or superseded. |

When an official format page changes, capture a new source observation and compare supported wording. Only affected derived fields should be proposed for review. The old assessment remains recoverable and is not silently overwritten. This is a future monitoring behavior, not authorization to build a monitor now.

## Source observations

| Source owner | URL | Supported observation | State |
| --- | --- | --- | --- |
| Pastimes Events | https://www.pastimesevents.com/magic-formats-hub/ | Organizer format index includes the broad family of MagicCon-relevant formats. | Published; retrieved 2026-08-02 |
| Pastimes Events | https://www.pastimesevents.com/events/pax-west-2025-magic/sunday-2pm-preconbattle/ | Example Precon Battle supplies a random preconstructed Commander deck, requires no cards, uses Regular REL, and lists two 90-minute Swiss rounds. | Published example; retrieved 2026-08-02 |
| Pastimes Events | https://www.pastimesevents.com/mini-masters/ | Mini-Masters uses one pack plus basic lands, best-of-one play, and an indicated 15-minute game duration. | Published; retrieved 2026-08-02 |
| Pastimes Events | https://www.pastimesevents.com/all-play/ | All Play uses all six opened packs, external basic lands, special cycling rules, and typical best-of-one play. | Published; retrieved 2026-08-02 |
| Pastimes Events | https://www.pastimesevents.com/sealed-deck/ | Sealed uses six boosters, onsite construction, a 40-card minimum, and opened cards as the sideboard. | Published; retrieved 2026-08-02 |
| Pastimes Events | https://www.pastimesevents.com/booster-draft/ | Booster Draft requires repeated card selection and passing across three packs before building a 40-card deck. | Published; retrieved 2026-08-02 |
| Pastimes Events | https://www.pastimesevents.com/two-headed-giant/ | Two-player teams share turns and life while retaining separate cards and mana; several loss and interaction rules differ. | Published; retrieved 2026-08-02 |
| Pastimes Events | https://www.pastimesevents.com/grand-melee/ | Grand Melee supports a very large shared game using attack-left, range-of-influence, multiple turn markers, special elimination handling, and acknowledged corner cases. | Published; retrieved 2026-08-02 |
| Pastimes Events | https://www.pastimesevents.com/last-commander-standing/ | Last Commander Standing is single elimination at Competitive REL with formal multiplayer tournament and infraction procedures. | Published; retrieved 2026-08-02 |
| Wizards of the Coast | https://www.magic.gg/news/play-update-2026-27s-regional-championship-qualifier-events-promos-and-more | RCQs feed Regional Championships; formats vary by organizer and qualifying round. | Published 2026-02-03; retrieved 2026-08-02 |
| Wizards of the Coast | https://www.magic.gg/pro-tour | Top finishes at MagicCon Pro Tour Qualifiers are part of the Pro Tour qualification path. | Published; retrieved 2026-08-02 |

## Unknowns and stop condition

- This pass does not assess every format on the Pastimes hub.
- Event-instance competitiveness cannot be safely derived from format alone.
- Some organizer pages are older general references and may not express current Atlanta implementation details.
- Personal difficulty will improve after the owner reacts to several real Atlanta event assessments.

The research question is sufficiently answered to revise the event-detail model and create a backlog item for a complete, source-backed registry. Broad ingestion or monitoring is not yet warranted.
