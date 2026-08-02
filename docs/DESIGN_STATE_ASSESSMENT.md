# Design State Assessment

Updated: 2026-08-02
Status: Audit complete; recommends the next behavioral-design tranche

## Assessment question

After discovery, architecture decisions, and several interactive sketches, what is actually settled, what remains unproven, and what should the next design pass test?

## Executive assessment

The product concept is coherent. The durable center is not monitoring, a calendar, or a brochure replacement in isolation. It is a personal convention command center that turns fragmented evidence into understandable options, preserves the owner's decisions, and retrieves the right operational fact without requiring recall of its original source.

The information architecture and planning language are sufficiently settled to stop revisiting them abstractly. The weak point is now behavioral and visual proof. Calendar has a credible distinct role, while Plan has a credible conceptual model but not yet a sufficiently expressive prototype. The current Plan playground proves that one state change can affect both Decide and Schedule; it does not yet prove that the owner can visually understand a crowded field of alternatives and consequences.

No database or broad implementation work should begin from the current Plan sketch. The next safe move is a bounded Plan interaction study using representative, clearly fictionalized Vegas-shaped data.

## Settled product invariants

### Stable shell

- Home, Calendar, Plan, Explore, Map, Wallet, Trip, Notes, and Activity are distinct, directly reachable concepts.
- Now is Home's phase-aware focus, not a separate destination.
- The shell remains recognizable before, during, and after the convention; priority and density change, not the product identity.
- Empty modes collapse rather than manufacturing placeholder content.

### Calendar and Plan

- Calendar is the broad, scrollable meaningful-date story from now through limited post-event follow-up.
- Plan is the focused November 13–15 resource-contention workspace.
- November 11 travel and November 12 Black Lotus preview belong primarily in Calendar/Trip, not the dense Plan canvas.
- Calendar summarizes convention days and deliberately deep-links to the selected day in Plan.

### Planning semantics

- Interested remembers an option without consuming time.
- Tentative is the core synthesis state: a serious contender placed into the comparison field.
- Committed protects time and is the only personal state capable of producing a hard conflict with another fixed Commitment.
- Purchased is an independent access/financial fact that staples the event into Plan and defaults it to Committed until an explicit Skip/Release.
- Hidden, Not for me, Passed, Skipped, and Attended have distinct cleanup, preference, decision, and outcome meanings.
- Committing one option does not erase alternatives; displaced Tentatives remain visible and recoverable.

### Time and intelligence

- Publisher time, usable window, personal placement, expected exit, and observed time remain distinguishable.
- Flexible activities and fuzzy endings create conditional overlap or pressure, not automatic hard conflict.
- The app performs immediate deterministic reasoning for overlaps, purchase locks, adjacency, flexibility, and light daily-pressure cues.
- One quiet sparkle insight presents the most consequential rationale; situational consequences outrank generic taste.
- Later reflective “Codex sauce” and feedback prompts remain downstream, rare, constrained, and non-authoritative.

### Visual language

- The interface is dark, layered, visual, icon-literate, and highly clickable.
- Violet denotes Black Lotus context; warm gold denotes purchase or consequential lock; blue supports Tentative/selection; amber and red are reserved for meaningful exceptions.
- State must be encoded with shape, opacity, texture, icon, label, and position—not color alone.
- Multi-object surfaces show decision headlines; full descriptions, evidence, notes, and rationale open in context.

## Documentation drift corrected by this audit

- An early “purchased but unscheduled” allowance contradicted the later accepted rule that purchase staples an event into Plan. The accepted rule now appears consistently.
- `NEXT_PHASE_SCOPE.md` still described Plan as all time-bearing objects and used the earlier Places/Now candidate map. It now reflects Calendar, focused Plan, Map, Trip, phase-aware Now, and Activity.
- `CURRENT_FRONTIER.md` omitted Calendar from the accepted primary navigation list. It now records the full surface map.
- `EXPERIENCE_ARCHITECTURE.md` still framed an already accepted gate as a candidate awaiting approval. Its status now distinguishes settled architecture from unresolved screen behavior.

The older research hydration remains intentionally historical. Its Hot, Sources, Places, Remember, and placeholder language records the path to the current decisions and should not be treated as current architecture.

## Artifact assessment

### Useful evidence

- The dark architecture sketch established the desired command-center tone.
- Home/Now established that quiet can be a successful state and milestones can carry the pre-event landing experience.
- The playable Calendar concept established the broad-agenda versus focused-Plan context shift.
- The Plan playground established a useful mechanical proposition: event state changes should propagate immediately into both comparison and schedule consequences.

### Why the Plan playground is not the design baseline

- It is still card-and-text dominant when the core problem is spatial contention.
- The common time axis is secondary rather than the main organizing field.
- It presents too few simultaneous Tentatives to prove the synthesis value.
- Flexible anchors, usable windows, personal placement, fuzzy tails, and early-exit possibilities are underexpressed.
- Displacement is mostly dimming; the displaced opportunity and reason are not visually traceable enough.
- The detail area changes state, but the consequence preview before commitment is weak.
- It does not yet test the owner-centered preference layer, person markers, source exceptions, or the distinction between ordinary pressure and hard conflict at realistic density.
- Its mobile reflow demonstrates responsiveness, not a deliberate mobile planning interaction.

The artifact should therefore be retained as a mechanical sketch, not polished into the product screen.

## Next behavioral-design tranche

Build one deeper, still non-production Plan study around a representative Friday. It should test four questions only.

### 1. Can Tentatives act as a visual synthesis layer?

Show enough credible alternatives to make comparison worthwhile. Candidate events enter Plan from an Interested shelf, then occupy a shared time field when promoted to Tentative. The user should understand the day without opening each event.

### 2. Does a commitment make consequences legible before and after selection?

Selecting a contender should preview what becomes displaced, conditionally possible, or impossible. Committing or purchasing should then update all affected blocks and explanations immediately without deleting alternatives.

### 3. Can time uncertainty be understood without configuration overhead?

Include at least one fixed purchased event, one Black Lotus option, one flexible league with a published anchor and movable placement, and one event with a plausible fuzzy tail. Their shapes must explain the difference at a glance. Optional nuance belongs in event detail, not a setup form.

### 4. Can desktop richness translate into useful mobile behavior?

Desktop should use the shared temporal canvas as the dominant workspace. Mobile may use a day rail plus contention cards or focused comparison sheet, but must preserve overlap, displaced alternatives, state changes, and consequence explanations. It need not reproduce the desktop geometry literally.

## Recommended prototype sequence

1. Static visual grammar study: fixed, flexible, fuzzy, Tentative, Committed, Purchased, displaced, and source-changed blocks on one axis.
2. Desktop Decide interaction: promote, select, preview consequence, commit, and recover a displaced alternative.
3. Desktop Schedule validation: confirm the same state reads naturally as a day plan rather than a duplicate screen.
4. Mobile translation of the same scenario and state; no new product semantics.
5. Event-detail layer with the minimum decision brief, full-description access, one insight rationale, people, note, and evidence affordance.

Do not begin with filters, sorting, drag-and-drop, all-three-day overview, AI feedback, monitoring, or polished animation. Those can follow only if the main visual grammar works.

## Gate for the next step

The Plan design is ready to inform the Black Lotus trust-slice contract when the owner can, without opening source pages:

- see the serious alternatives for a timeslot;
- distinguish fixed, flexible, and fuzzy time;
- predict what committing will displace;
- understand why an overlap is hard, conditional, or merely pressure;
- recover a displaced Tentative;
- open the chosen event's details and evidence;
- perform the same essential state change on mobile.

Until then, the project should remain in design evidence rather than schema expansion.
