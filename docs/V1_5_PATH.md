# Version 1.5 Path

Updated: 2026-08-08  
Status: Fixture-backed 1.5 coherence pass accepted; future 1.5 work should be trust/data plumbing, not more placeholder polish

## Outcome

Version 1.5 moved the fixture-backed app out of "good POC" territory and into a coherent private field guide. The main destinations now behave like one connected product: objects are understandable, monitor findings route somewhere useful, Wallet is one-handed enough for quiet-period review, and mobile navigation is no longer fighting the information architecture.

The guiding shift is:

> v1 proved we have tabs. v1.5 proves the app understands convention objects and gets Kavi to the right place at the right time.

Do not use the remainder of 1.5 to broaden the app into every future feature. The fixture/UI side is now pinned unless real phone defects appear. The important remaining work is trust, auth/session continuity, private artifacts, reviewed monitoring hydration, and eventually real ticketed-play data.

## Accepted fixture-backed 1.5 state

- Shared object-detail drawer/sheet grammar works across representative events, alerts, receipts, hotels, notes, and monitor-discovered objects.
- Home is a command center: it distinguishes quiet status from review-worthy signals and avoids becoming a dump of every monitored fact.
- Activity is a reviewed monitor inbox with Review, Changes, Sources, Notes, and Archive streams. It has been volume-tested with representative monitoring output and is frozen for this tranche.
- Wallet Home uses a simple compact Prize Tix counter with `-100` / `+100`; decorative ticket art and drawer ideas are parked.
- Mobile navigation uses five primary destinations: Home, Events, Map, Wallet, and More. Events opens Explore / Plan / Calendar; More opens Trip / Artists / Notes / Activity.
- Explore and Calendar contain the known official Atlanta Black Lotus schedule as fixture-backed, source-caveated data.
- Plan-lite is legitimate for the quiet period: it distinguishes official Black Lotus anchors, promoted contenders, and watch/TBD items without pretending to be the future contention engine.
- Artists exists as an honest top-level destination ready for future confirmed artist data, historical unconfirmed seeds, and later ManaBox matching.
- Public GitHub Pages mobile review is working and the latest iPhone pass looked good.

## Lessons from the 1.5 pass

- The product feels strongest when surfaces are organized by owner task, not by source system.
- "Clickable by default" is a useful design law, but every click needs a destination that earns it; fake future controls erode trust quickly.
- Mobile should preserve direct access to the main mental modes, not hide everything inside a tiny tab bar. The Events / More grouping is a better compromise than a horizontally scrolling rail.
- Activity should remain quiet and review-oriented. If it starts feeling like a social feed or a generic log, it has drifted.
- Plan should not be overbuilt before ticketed-play inventory exists. The app can represent Black Lotus anchors and promoted contenders now; the real contention model should wait for real event variation.
- Wallet should optimize retrieval under stress, not decorative charm first. Cute art can return later after the interaction is solid.
- Monitoring output must remain reviewable observation. The app can route and explain findings without silently changing canonical plans.
- Avoid process drag. Use `docs/ANTI_WASTE_OPERATING_MODE.md` and `docs/KNOWN_GREMLINS.md` before repeating known Git, Vite, Pages, cache, auth, local-preview, or browser-storage failures.

## Design principles for 1.5

- **Mobile-first for onsite retrieval.** Desktop can be roomier, but the design must first work when Kavi is standing in a hall, needing a code, receipt, map clue, hotel address, or quick answer.
- **One object-detail grammar.** Events, alerts, receipts, hotels, flights, places, notes, and sources should open through a consistent desktop drawer / mobile bottom sheet pattern.
- **Fewer dead blocks.** If a card mentions an event, hotel, receipt, page, source, or note, it should usually click into that object or explain why it cannot yet.
- **Home answers urgency, not completeness.** Home should say whether anything needs attention and show the next useful thing, not display every collected fact.
- **AI value is routed usefulness.** The app should translate, assess, explain, and route findings. It should not add chatty excitement or gratuitous prompts.
- **Trust stays visible.** Source observations, normalized facts, personal interpretation, and proposed actions remain separate.

## Chunk 1 — shared app grammar and object detail

Goal: make the POC feel like one app instead of separate mockup panels.

### Scope

- Establish a reusable object-detail shell:
  - desktop: right drawer that can close without disrupting the list or timeline;
  - mobile: bottom sheet with strong top summary and obvious close affordance;
  - consistent sections for summary, key facts, source, actions, notes, and backlinks.
- Apply the pattern first to representative objects:
  - one event;
  - one monitoring alert;
  - one receipt;
  - one hotel;
  - one note.
- Normalize interaction language:
  - "open details" should feel the same across Home, Calendar, Explore, Wallet, Trip, Notes, and Activity;
  - state controls should stay reversible and compact;
  - no page should invent a bespoke drawer unless the use case actually requires it.
- Tighten the visual system:
  - reduce over-large utility headers;
  - keep ordinary chips smaller;
  - use semantic color more sparingly;
  - make card importance visually obvious rather than giving every card the same weight.

### Acceptance

- A user can click from at least four destinations into a consistent detail surface.
- The same object can be reached from more than one context without feeling duplicated.
- Mobile detail does not obscure the key browse context longer than necessary.
- Visual density feels intentionally compact rather than merely shrunk.

Status: accepted for representative fixture-backed objects.

## Chunk 2 — Home as command center

Goal: make Home answer "do I need to care?" in seconds.

### Scope

- Rework Home around a phase-aware priority stack:
  1. status line: quiet / needs review / action needed;
  2. one strongest current signal or next milestone;
  3. known anchors;
  4. recent monitor findings;
  5. last checked, offline saved, and source-health metadata.
- Keep the countdown chip, but prevent it from competing with urgent information.
- Make milestone reasoning accessible through hover/tap details without turning Home into a research report.
- Preserve quiet mode. Weeks with no useful signal should feel calm, not empty or broken.

### Acceptance

- In quiet state, Home visibly communicates "nothing needs you."
- In alert state, exactly one or a very small number of items get prominence.
- Every surfaced alert has a clear route into Activity or the affected object.
- Home does not become the dumping ground for all monitoring output.

Status: accepted for quiet-period preview and monitoring fixtures.

## Chunk 3 — Activity as a reviewed monitor inbox

Goal: convert monitor output from "log entries" into useful reviewable observations.

### Scope

- Reframe Activity streams around review work:
  - Needs review;
  - Changes;
  - Sources;
  - Personal;
  - Archived / dismissed.
- Each monitor item should answer:
  - what happened;
  - why it may matter;
  - what source supports it;
  - where it belongs;
  - what action, if any, is available.
- Support lightweight grouping for bursts, e.g. rapid repeated state changes or multiple page diffs from one site crawl.
- Add contextual backlinks into destination objects rather than leaving findings as dead cards.

### Acceptance

- A representative site change opens Activity and then the affected page/object.
- A representative email receipt opens Activity and then Wallet.
- A representative travel change opens Activity and then Trip/Calendar.
- A dismissed item remains recoverable without staying noisy.

Status: accepted and frozen for this tranche; revisit only for real findings or defects.

## Chunk 4 — Wallet mobile-first retrieval

Goal: make Wallet useful onsite, not just visually interesting.

### Scope

- Redesign Wallet Home around retrieval tasks:
  - show badge / QR / original badge order;
  - show event receipt or code;
  - show store receipt / pickup proof;
  - update Prize Tix;
  - see assignments and notes.
- Rework Prize Tix:
  - keep the ticket-art idea as personality;
  - make the interaction one-handed and resilient;
  - consider a persistent mini-card plus drawer for `+` / `-`;
  - soften harsh borders and improve art quality only after the interaction works.
- Keep Play as the highest-value onsite receipt tab:
  - event codes;
  - QR or original receipt;
  - pickup proof;
  - extracted metadata.
- Keep Store receipts assignment-friendly:
  - K/J/C chips for known people;
  - plain custom names for anyone else;
  - notes per receipt/item.

### Acceptance

- On phone, Kavi can reach a badge/QR, a receipt, and Prize Tix controls quickly.
- The original artifact and extracted metadata remain clearly separate.
- Receipt assignment persists in the POC state or explicitly declares that persistence is not yet implemented.
- Wallet no longer depends on a desktop-wide composition to look coherent.

Status: adequate for fixture review after simplifying Prize Tix. Private artifact capture/storage remains open.

## Chunk 5 — trust, auth, offline, and private artifacts

Goal: keep real continuity reliable without reopening the magic-link rabbit hole.

### Scope

- Keep Google OAuth as the primary authenticated path.
- Preserve sessions aggressively across refresh, mobile browser, and installed PWA.
- Keep magic link as rare fallback/bootstrap only; do not use it for ordinary testing.
- Complete the trust-slice proof:
  - one reviewed source revision;
  - prior observation recoverable;
  - normalized fact may update;
  - personal decision and itinerary do not silently change.
- Define the first private Storage proof:
  - one badge order;
  - one travel confirmation;
  - one purchase receipt;
  - original PNG/PDF separate from extracted metadata.
- Prove critical offline read:
  - upcoming anchors;
  - selected proofs;
  - Trip facts;
  - important notes;
  - freshness timestamp.

### Acceptance

- Auth does not block design review or mobile access.
- One sign-in survives refresh and installed-app reopen.
- Offline mode opens the critical read pack and disables writes.
- Private artifact access is owner-scoped and does not leak through public preview code.

## Chunk 6 — monitoring hydration into real objects

Goal: let the daily monitor safely make the app more useful without pretending it is canonical truth.

### Scope

- Keep the current file-backed POC hydration seam until the owner-reviewed inbox exists.
- Graduate only meaningful discoveries:
  - MagicCon-related email;
  - official Atlanta site tree change;
  - Black Lotus page change;
  - MagicCon news post;
  - Leap schedule availability;
  - artist list;
  - store catalog;
  - prize wall;
  - map artifact;
  - travel/hotel receipt or consequential change.
- Route discoveries by destination:
  - Home only for rare high-signal items;
  - Activity for review history;
  - Wallet for receipts/proofs;
  - Trip for travel/lodging;
  - Calendar for dated commitments/milestones;
  - Explore/Plan for event choices;
  - Map for location artifacts;
  - Notes for user-authored thoughts.
- Keep AI output as proposed interpretation unless explicitly reviewed.

### Acceptance

- A monitor item can be added without editing React source.
- The app displays it in the right lane.
- The item has source, retrieval time, rationale, and destination.
- Nothing becomes canonical merely because the monitor found it.

## Chunk 7 — ticketed-play vertical slice, only when real data appears

Goal: use one real Atlanta event to authorize the eventual event model.

### Scope

- Manually capture one representative ticketed-play event from Atlanta when available.
- Preserve source wording and normalize:
  - time;
  - duration;
  - price/access;
  - refund consequence;
  - availability/sold-out state;
  - format;
  - structure;
  - prizes;
  - eligibility;
  - fixed/flexible/fuzzy timing.
- Add source-backed complexity and personal-fit rationale.
- Express Interested / Tentative / Committed / Purchased consequences.
- Capture one later change, sold-out state, or contradiction.

### Acceptance

- One real event moves from source observation to Explore to Calendar/Plan implication.
- A later source change is visible without overwriting history.
- The owner can understand why the event may or may not be attractive.
- Broader event ingestion remains blocked until this slice proves the shape.

## Chunk 8 — Plan workspace after representative contention exists

Goal: resume Plan only when there is real scheduling pressure.

### Scope

- Use November 13-15 as the focused contention surface.
- Include:
  - proportional time placement;
  - visible overlap;
  - fixed and flexible events;
  - Black Lotus inclusion;
  - purchased financial anchors;
  - fuzzy tails;
  - concise consequence previews;
  - person markers for Kavi/Chris/Juan as owner-managed context.
- Do not add drag/drop, solvers, automatic schedules, multi-user editing, or AI recomputation until real data pressure demands it.

### Acceptance

- Plan helps compare contenders without forcing commitment.
- Purchased commitments are visually stronger than interests/tentatives.
- Flexible league-style events can remain visible without hard-blocking.
- Calendar and Plan hand off cleanly.

## Recommended execution order from here

1. **Low-friction auth/session continuity and offline proof.**
2. **Private artifact proof for badge/travel/receipt originals.**
3. **Reviewed monitoring hydration into real app objects.**
4. **One real ticketed-play vertical slice when Atlanta data appears.**
5. **Production Plan only after representative contention exists.**

The original first four chunks are accepted. The remaining order is deliberate: restore trust without breaking mobile review, make retrieval private and durable, then let real monitoring and ticketed-play data drive the next product shape.

## Explicitly deferred

- comprehensive MagicCon schema;
- broad autonomous crawling;
- full interactive convention atlas;
- booth-level OCR/georeferencing;
- multi-user accounts, permissions, voting, chat, or live schedule sharing;
- offline writes or synchronization;
- automatic schedule optimization;
- extensive post-event functionality;
- further Prize Tix art iteration before the mobile interaction is settled.
