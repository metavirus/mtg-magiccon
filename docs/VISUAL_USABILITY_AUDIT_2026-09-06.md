# Visual usability audit — September 6, 2026

## Verdict and evidence boundary

### Local repair checkpoint

Findings 1–3 are repaired locally, not published. The card close control no longer inherits generic sticky positioning; explicit grid placement keeps art/copy in one desktop row, and signing actions remain in content flow. Escape, focus return, and keyboard containment are implemented. Actual desktop geometry confirmed equal art/copy top edges and a 680px-wide, roughly 493px-tall panel; phone inspection showed art, identity, and actions together without the old blank column. Plan exposes all four named people; Explore offers a visible phone type select beside Hidden; Calendar prints complete cross-month endpoints.

Explore density checkpoint: compact rows now retain title/time/cost/state and one bookmark action; assessment, tags, hiding, and planning controls live in detail. The built 390×844 preview shows four complete initial rows (previously roughly two), with corrected dark-theme bookmark controls. Desktop screenshots were inspected, including long Grand Melee titles and separate prices. Clicking a saved event's bookmark opened detail with Tentative unchanged and assessment/tags present. Build and two focused row tests pass. Final phone evidence: `20260906-171543-explore-390x844.png` in the temporary ui-capture folder. This is bounded fixture verification, not physical-iPhone proof or exhaustive long-title phone coverage. Receipt proof flow remains next; findings 4–5 below retain the original observations.

Validation: integrated production build passed (existing bundle-size warning); 14 targeted tests passed. Actual popup screenshots were inspected at desktop and 390×844, including the integrated desktop result; built-preview phone screenshots for Plan, Explore, and Calendar were inspected. Selecting Social in the authenticated local app retained the visible day controls and filtered results correctly. The regression guards the specific CSS placement contract and exclusion of generic sticky styling; actual browser geometry supplies the rendered proof. Findings 4–5 remain open. None of this is physical-iPhone or published verification.

The prior click-through checks did not establish visual usability. The artist card popup visibly fails despite functional checks passing. Prior blanket visual-pass claims are superseded by this report; functional regression results remain separate evidence.

This was a read-only, as-displayed review. Root inspected the authenticated local app in the in-app browser, at ordinary desktop size and 390×844. A separate worker inspected Home, Explore, Plan, and Calendar in a local built preview fixture in Chrome at 390×844. Screenshots were actually viewed after navigation and interactions, not merely generated. Fixture results are not live-data or physical-iPhone proof. No app code, selections, receipts, server data, or deployments changed. Browser viewports were restored.

## Findings, in suggested repair order

### 1. Artist card popup wastes a desktop column and separates the task — high

Reproduction: Artists → Cards → Beseech the Mirror, WOE #82. The close button occupies the first grid cell, art occupies the upper-right cell, and details fall into the next row. There is a large empty left area; identity and signing controls are displaced instead of sharing a compact desktop layout. Escape did not dismiss the popup; clicking Close did.

Source confirmation: the global `.persistent-detail-close` rule in `src/density.css` sets `position:sticky!important`, overriding the card close button's absolute positioning. That makes it participate in the popup grid. The desktop popup has two columns but no placement rule excluding the close button from content flow. This is a cascade/layout failure visible in earlier screenshots, not evidence of a new cache problem.

Acceptance: art and details start in adjacent desktop columns; close stays at the actual top-right without consuming a grid cell; identity and primary signing actions are visible without avoidable scrolling. Phone uses a coherent single column. Escape and Close return focus to the originating card. Add a geometry regression for the close/art/details relationship as well as visual review; element existence alone cannot protect this layout.

### 2. Mobile filters conceal important choices — medium

Preview fixture: Plan List and Agenda show Kavi/Chris but leave Juan/Kyle beyond the right edge. Explore initially hides Social/Hidden offscreen. A horizontal swipe reveals Explore controls but moves the day choices away; the overflow has no clear discovery cue.

Acceptance: all four people fit together at 390px. Explore exposes an identifiable type/hidden filter control without requiring discovery of an unmarked horizontal strip. Check selected and unselected states without silently changing saved planning data.

### 3. Calendar's dominant cross-month dates mislead — medium

Preview fixture: Upcoming/All forecast blocks display `OCT 29–6` and `OCT 30–3`, with end digits wrapped. A small subtitle supplies November, but the most prominent scan target looks like a reversed October range.

Acceptance: the primary date treatment explicitly includes both months and does not orphan the final digit. Test cross-month and same-month ranges at phone width.

### 4. Explore spends too much phone space per event — medium

Preview fixture: ordinary rows are approximately 175–210px high and repeat tags, assessment prose, included state, and an action shelf. Roughly 300px precedes results, leaving only two initial events in a 98-result list. Plan's roughly 100px rows demonstrate a denser peer surface.

Acceptance: the initial phone view exposes at least three useful ordinary results. Prioritize title, time, cost, and meaningful state; move secondary assessments into detail. Preserve the strongest visual emphasis for purchased/locked state. Verify long titles and lower rows, not only the first result.

### 5. Wallet proof is thumbnail-first, not show-at-a-glance — medium

Authenticated local sequence: Wallet → Chris badge → Transfer → enlarge page 1 → Zoom in. In the ordinary drawer the original page is roughly 297px wide and its text is tiny. Repeated enlarge labels/captions and drawer chrome consume more space. Fullscreen enlargement works; at 150% the transfer wording becomes readable, but horizontal panning is necessary. This is task friction, not a missing receipt or a failed image load.

Acceptance: offer a direct, clear mobile Show proof path to the fullscreen original, with reachable close/page/zoom controls. Preserve the genuine Gmail-rendered evidence unchanged; do not recreate, rewrite, or crop away receipt content to make it fit. Judge how quickly a person can reach recipient/registration proof, while recognizing that a full letter-size page cannot all be readable simultaneously on a phone.

## Coverage and limits

Receipt entry checkpoint: `ReceiptPages` now offers Show proof directly above a collapsed Browse original pages group. Authenticated local Chris Transfer was opened at 390×844: Show proof opens the unchanged page full-screen with reachable page/zoom/close controls; 150% zoom and return to the drawer were exercised. Desktop entry was also visually inspected. A letter-size source still needs zoom/panning for small text; no source rewriting or cropping was introduced. Build and reader regression pass. Local only; no physical-iPhone or newly published verification. The old 5173 server had stopped; the canonical capture command restarted the built preview before this check.

- Root: artist card open/close/Escape; desktop Wallet overview; phone transfer drawer/fullscreen/zoom/close; desktop Trip hotel overview; desktop and phone Info overview. Trip overview grouping and Info hours hierarchy showed no comparable major defect in the inspected view; this is not an endorsement of every detail state.
- Worker: Home and artist directory expansion; Explore initial/scroll/filter strip/Social/Paint & Sip detail; Plan Thursday/List/Agenda; Calendar Upcoming/catalog details/Travel.
- Not covered in this pass: physical iPhone, cold offline behavior, real state-changing controls, dense overlapping agenda, Calendar Past, all articles/hotel drawers, Map/Notes/Activity, and every artist printing. These remain unverified, not implicitly passed.

## Next bounded work

### Remaining-surface review (authenticated local, September 6)

Local repair checkpoint: Activity now uses an all-lanes phone select while retaining desktop tabs; the Hot banner appears only when there are hot findings and Hot is selected, removing duplicate empty-state/banner noise. Monitoring finding details expose Read original source immediately after the summary and collapse monitoring facts. Grouped Notes omit duplicated event identity and retain author/date/privacy. Build passed; authenticated local desktop and phone screenshots inspected, Events selected from the phone dropdown, article opened/closed with source link above collapsed metadata. Notes checked at both widths. No publishing or data mutations. Map is deliberately deferred: Kavi confirmed it is only a placeholder.

Read-only click-through covered Map, Notes, and Activity with desktop and 390px viewport screenshots actually judged. No note, selection, archive, or review-state controls were submitted.

- **Activity, medium:** phone filter strip conceals Notes/Archive/All with little discovery cue. Hot repeats the same empty-state message in the header and body. Events retains the hot-lane banner even while displaying useful content. Article detail prioritizes status/first-seen/last-seen/repetition boxes above the official source link. Put the useful summary and clearly labeled article link first, collapse monitoring metadata, and expose all lane choices in a compact phone selector. Atlanta play-guide detail opened and Escape dismissed successfully.
- **Map, medium:** the static aerial image is too small for embedded street labels at phone width and has no enlarge/zoom affordance. Only Omni is interactive; clicking it navigates to general Trip Hotels, not the Omni detail. Add an explicit map enlargement path and make the hotel destination/label agree. This is an orientation image, not verified pedestrian directions; do not invent a walking route.
- **Notes, low:** each note repeats its event title twice beneath a group already titled with that event. Desktop makes the duplication especially apparent. Remove redundant per-note identity within an object group, retaining author/body/date/privacy. Opening the LoadingReadyRun note correctly navigated to its contextual event note and Close dismissed the event drawer. The sticky event header still consumes substantial phone height and merits tightening in a subsequent drawer pass.

Recommended next repair is Activity hierarchy/filter access, then Map enlargement, then Notes redundancy. This does not prove all historical items, source links, or destructive controls; physical iPhone/offline remains separate acceptance.

Repair findings 1–3 first, then re-open the exact failing states at desktop and phone sizes. Address scanning/proof flow next. Keep implementation local until a coherent publication checkpoint is requested. Do not resume the ownership migration under the guise of fixing these visual defects.
