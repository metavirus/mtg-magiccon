# Live app click-through audit — September 6, 2026

## Scope and confidence

**Visual acceptance correction:** the prior checks below establish only their stated functional outcomes, not overall usability. A broken artist popup was present in screenshots but missed in judgment. `docs/VISUAL_USABILITY_AUDIT_2026-09-06.md` supersedes blanket visual-pass claims and records the reproduced layout, mobile filter/date, scanning, and receipt-flow failures. These visual findings remain open.

### Follow-up implementation checkpoint (local, not published)

The first correctness/navigation batch addresses findings 1–4, 7, and the reproduced Travel-filter part of 8. Wallet/Trip now select the same flight projection; Plan requires a shared included attendee for conflict labels; Calendar orders timed events and October forecasts, hides forecasts in Travel, and clears competing/stale inspectors. App and browser navigation share one history transition, ordinary Explore resets route filters, group restrictions have a Clear link, and global details/articles support Escape and focus return.

Regression coverage includes rendered Calendar/Wallet/Plan components and five rendered-App navigation sequences. The local production build and full 318-test suite passed before one additional Plan rendering regression; that additional regression and final type-checked build also pass. Desktop and 390×844 browser checks covered current Wallet flights, Back traversal, Clear group behavior, Calendar Past dismissal and Travel contents. Existing Explore nested-button/duplicate-tag-key React warnings and bundle-size warnings remain follow-up work, not hidden passing checks.

Still open: receipt enlarging (5), Hot-notice lifecycle (6), mobile event title hierarchy (9), shared/personal detail labeling (10), internal prose/timestamp labeling (11), source-only group/person-filter candidates, and the separate artist/card architecture review. No application data or production deployment changed in this batch.

Read-only audit of the deployed MagicCon Companion, authenticated as Kavi, starting from build `a50044f`. Inspected every main destination using actual browser navigation, representative drawers, filters, search, and desktop/mobile screenshots. Desktop default viewport and a temporary 390×844 responsive viewport were used; the viewport was restored afterward.

No selections, purchases, notes, receipts, alert dispositions, or server data were changed. No implementation, deployment, workflow dispatch, or database writes were performed. One independent read-only source audit supplemented root browser verification. Artist/card architecture remains a separate next pass; only its current UI was exercised here.

Priority means suggested implementation order, not a claim of a security incident. Browser-confirmed findings are separated from source-only candidates below. Screenshots were inspected during the audit but receipt images, order identifiers, and personal notes are not copied into this report.

## Fix first: correctness and trust

### 1. Wallet contradicts the current itinerary — high priority, reproduced

- Wallet → Other shows outbound **DL 1521**, November 11, **12:20 PM–7:34 PM**; the return summary says **8:35 PM**.
- Trip → Flights shows outbound **DL 329**, **2:00 PM–9:16 PM**; the return departs **8:25 PM**. Calendar agrees with Trip.
- Wallet's flight drawer repeats the old information. It is not labeled superseded or historical and offers no original receipt there.
- Root cause: `WalletOtherTab` receives no current flight projection and embeds old values literally (`src/App.tsx:5686`, `:5691`). Trip and Calendar use the flight projection. The canonical correction is already recorded in `CURRENT_FRONTIER.md`.
- Fix: use one current itinerary projection for all three surfaces. Preserve old times only inside explicitly historical original evidence. Add a cross-surface regression test for schedule changes.

### 2. Plan reports conflicts between different people's plans — high priority, reproduced + source confirmed

- Friday Agenda labels Unknown with Gavin Verhey (Kavi/Chris), Collector Booster Sealed (Kyle), and Hexhaven (Kavi/Juan) **CONFLICT**.
- Kyle's event overlaps each of the other events, but he is not attending either. The other two events do not overlap each other.
- Root cause: `planEventsOverlap` checks intervals/nonblocking classification only, and `conflictPairs` compares all visible placements (`src/App.tsx:4142`, `:4215`). Participant intersection is not checked.
- Fix: only label a personal conflict when the same included traveler overlaps. A separate, neutrally labeled simultaneous-group-activity indication could be useful; it should not say conflict. Test disjoint and shared-attendee pairs.

### 3. Explore can get stuck in a sold-out-only view — high priority, reproduced

- Open `#explore?group=sold_out`, then Home → Events → Explore.
- URL becomes ordinary `#explore`, but the **SOLD-OUT TICKETED PLAY** restriction and 30-result group remain.
- Clicking All types and All days does not remove it. Reloading the bare Explore URL removes the group.
- Root cause: navigation `pushState` does not refresh the stored Explore route state; only the history/hash listeners do (`src/App.tsx:1244`, `:1341`, `:4478`).
- Fix: one route-state transition path, with explicit removable group filters. Test deep link → another page → ordinary Explore, plus browser Back/Forward.

### 4. Back and drawer lifecycle are inconsistent — high priority, reproduced

- Home → Explore → Plan → app Back → app Back returns Explore → Plan, instead of traversing to Home. `previousSurface` is swapped and another history entry is pushed (`src/App.tsx:1357`).
- Trip → Hilton detail → browser Back changes the background to Calendar but leaves Hilton's detail on top. Route changes do not clear the global object drawer (`src/App.tsx:1244`, `:1341`, `:2086`).
- Calendar → Fatehold detail → Past leaves the future event detail open beside completed milestones. Period changes clear `detail` but not `selectedEventId` (`src/App.tsx:6533`).
- Escape did not close the Prize Tix guide; its explicit close button worked.
- Fix: define one back/dismiss contract, close stale inspectors on route/filter/period changes, and give each overlay reliable keyboard dismissal and focus return. Test the actual navigation sequence rather than only direct route rendering.

### 5. Receipt proof is available but still too small for quick inspection — high-priority usability, reproduced visually

- At phone width, original badge pages and Chris's four-page transfer proof load with recognizable Gmail formatting.
- Juan's Fatehold receipt is a long single-image proof. Its text is extremely small when fitted to the drawer width.
- Neither tested receipt viewer exposes a visible enlarge/fullscreen/zoom control. Drawer padding consumes scarce width; the outer page and drawer both expose scrolling.
- Fix: retain the original untouched proof, but add a reachable full-screen viewer with fit-width, zoom/pan, and page navigation where relevant. Optimize the first view for showing registration proof to a worker, not displaying an entire letter-sized page as a thumbnail.
- Physical iPhone pinch gestures were not tested. This finding concerns the visibly tiny default rendering and absent discoverable controls, not a claim that Safari cannot zoom.

## Next: consistency and usable signals

### 6. Old Hot findings still demand attention without helping resolve them — reproduced

- Activity's default lane shows **2 hot findings**: the August 22 flight change and August 19 artist confirmation.
- Trip simultaneously says **No travel action needed**. The flight alert's “Why this matters” repeats “Your Atlanta flight changed”; Open object shows a status and retained-observation count, not changed times, an itinerary link, or an outstanding action.
- This does not prove the airline has no newer changes; it proves the app's surfaces disagree about what requires the user now.
- Fix: separate unread from actionable. Reconcile already-applied factual updates into useful history and link to the resulting object. For an actually unresolved travel change, show old/new facts and the precise required decision. An old artist confirmation should not remain urgent solely because it is unread.

### 7. Calendar order is not chronological — reproduced

- Thursday lists the **5:30 PM** TBD event before **4:15 PM** Design the Unknown Planechase Card.
- October forecasts likewise put October 30 before October 29.
- Day arrays are filtered but not sorted (`src/App.tsx:6480` onward).
- Fix: sort by actual start time/date, with explicit treatment of flexible listings and uncertain date ranges. Do not depend on source array ordering.

### 8. Calendar Travel filter still shows convention forecasts — reproduced

- Travel removes convention event rows but leaves artist directory, Black Lotus store, and show catalog forecasts above travel.
- Fix: apply the type filter to every group or clearly label the forecasts as an unfiltered global section. Source: `src/App.tsx:6567` onward.

### 9. Mobile Explore suppresses event identity to make room for controls — reproduced visually

- In the sold-out view, titles appear as **“Unknown w…”** and **“Magic: The …”** while price/lock/status/hide controls consume the same row.
- Long generic provenance text below receives more room than the title.
- Fix: allow a useful two-line title; put secondary metadata/actions below it. Preserve the strongest purchased visual signal without making the event name unreadable.

### 10. Shared event list and personal detail state need clearer labels — reproduced

- Calendar identifies Fatehold as Juan purchased; its drawer says **DISCOVERING** and presents an unselected purchase control because the current user is Kavi.
- This can be logically correct personal state but looks like a contradiction when the shared attendee context disappears inside the drawer.
- Fix: retain “Juan purchased” in the detail header and label the controls as **Your plan**. Do not pretend another person's purchase is the current user's purchase.
- Purchased event controls also contain the help text “Undo purchase to change commitment” while the purchase itself is permanently locked (`src/App.tsx:4326`, `:4794`, `:4862`). Use truthful locked-state guidance.

### 11. Detail content still exposes too much implementation language — reproduced

- News and hotel details show SIGNAL/PLACE, KEY FACTS, WHY IT MATTERS, SOURCE / PROVENANCE; some explanations discuss app visibility/approval policy rather than the thing being viewed.
- Artist details include “during the POC pass”; Cards says “POC artists.” Wallet says “Private original is available” to an already authenticated traveler.
- The Spell Slayers finding showed FIRST SEEN **10:00:24 AM** later than LAST SEEN **10:00:12 AM** on September 6. Creation/observation timestamps need distinct labels or consistent ordering.
- Fix: put user-relevant facts and the source link first; collapse diagnostic provenance. Keep certainty/source distinctions, but remove internal workflow prose from normal reading.

## Source-backed candidates, not fully reproduced

- Explore group routes `watched`, `high_signal`, and `conflicts` have labels, but only `sold_out` is enforced by the group predicate (`src/App.tsx:4431`, `:4476`; `src/lib/exploreRouting.ts:31`). Verify each real producer route before changing semantics.
- Calendar's people filter scopes event commitments but not travel/hotel anchors. Selecting Kyle alone may retain Kavi/Juan travel (`src/App.tsx:6465`, `:6578`, `:6616`). People selections were left unchanged during this audit.
- Calendar can mount competing forecast/event inspectors; source confirms separate state with asymmetric clearing (`src/App.tsx:6568`, `:6632`). Past-period stale event behavior was reproduced, but this exact two-inspector sequence was not.

## Coverage and working paths

| Surface | Exercised | Outcome |
| --- | --- | --- |
| Home | Current cards, Spell Slayers detail, desktop/mobile navigation | Useful news surfaced; old sales alert absent. Low-priority sellout disappeared during the audit without a dismissal. |
| Explore | Normal list, sold-out deep link, All filters, no-result search and clearing, note-to-event navigation | Search recovery worked; stale route filter and mobile title issues above. |
| Plan | Friday Agenda, participant badges, conflict labels, Back | False conflicts and Back loop above. Did not change anyone's plan. |
| Calendar | Upcoming/Past, Travel, Fatehold and Commander/Cocktails details | Both Companion codes displayed, including mobile; stale drawer and ordering/filter issues above. Copy/join not invoked. |
| Wallet | Home/Play/Store/Other; Chris original/transfer; Juan Fatehold original; flight detail | Tested originals loaded, Store has honest empty state; stale flights and proof sizing above. |
| Trip | Hotels, Hilton detail, Flights, Wallet-to-Trip link | Current itinerary visible; generic drawer persists across browser Back. |
| Map | Mobile aerial asset and Omni hotspot | Asset loaded; hotspot reaches Trip. Primarily an orientation image, not a floor-plan/navigation tool. |
| Info | Guide, Prize Tix article, owner Catalog/Import views | Prize costs use Prize Tix; source links present. Catalog clearly says precedent, Import clearly says three-item historical sample. No load/promote actions performed. |
| Artists/Cards UI | Portraits, artist detail, artist-to-filtered-Cards link, card preview | Portrait/card assets and contextual filtering worked. Architecture intentionally deferred. |
| Notes | Grouped notes, note-to-related-event click | Related event and contextual note opened. No note contents changed. |
| Activity | Hot and Events filters, rationale disclosure, flight object | Old hot findings and weak resolution path above. No mark-read/archive/ignore actions. |
| Account | Menu and offline status | Shows **Offline proof ready · 32/32**. Status observation only, not a fresh offline completeness test. |

Not covered: physical airplane-mode/cold-start behavior, all receipt pages/QR scanability, external provider transactions, every outgoing external URL, write flows, signed-out/other-account authorization, full screen-reader/focus-trap testing, and artist/card architecture. No claim of exhaustive offline or security readiness is made.

## Recommended implementation chunks

### Second local checkpoint — September 6

- Shared `ReceiptPages` displays the existing downloaded originals unchanged. Tap the image or Enlarge for a fullscreen reader with 100–300% zoom, fit-width reset, page arrows, native modal keyboard containment, and focus return. No receipt ingestion, upload, or evidence changes.
- Explore title and purchase controls are siblings rather than invalid nested buttons. Mobile titles wrap without ellipsis and price/status sit beneath the title; desktop retains the compact trailing-value layout. Duplicate event tag keys are removed.
- Monitoring Hot is no longer synonymous with unread forever. Informational monitor notices demote after 24 hours; contradictions, mapped decisions/blocked actions, and unread Inbox actions retain urgency. History/read state are not mutated. Corroboration lacks a separate material-change timestamp, so its first-seen date is used conservatively.
- Verified the authenticated local Wallet: Chris's real four-page transfer proof, mobile fullscreen/zoom/page change/Escape return, and desktop fullscreen/close. Verified mobile and desktop long sold-out event names. Activity shows Hot 0 while the old flight and artist notices remain under All. Local build capture also passed at 390×844.
- Validation: full suite 324 tests passed, followed by a new nested-control regression and targeted rerun; production build passed. Physical iPhone/offline fullscreen gestures and PDF-specific behavior were not tested. Nothing published and no live state changed.

The broader editorial cleanup and richer flight-change before/after details remain outside this bounded lifecycle fix. The architecture review follows this local UI checkpoint.

1. **Trust/correctness:** one itinerary projection, participant-aware conflicts, chronological Calendar sorting; regression tests for each.
2. **Navigation:** unified route/filter state and consistent drawer dismissal/back behavior, with browser sequence tests.
3. **At-con usability:** full-screen readable original-proof viewer and mobile event-title hierarchy; verify on the actual iPhone.
4. **Signal cleanup:** reconcile old Hot notices with current object state; replace internal prose with concise useful summaries.
5. **Then artist/card architecture:** model inventory versus printings, artist identity/attendance, ownership/signing state, enrichment provenance, refresh and offline projections. Do not fold that larger review into cosmetic fixes from this audit.
