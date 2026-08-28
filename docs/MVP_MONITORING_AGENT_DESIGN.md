# MVP Monitoring Agent Design

Updated: 2026-08-21

Automation status has two bounded runtimes. The Codex heartbeat `magiccon-atlanta-quiet-period-monitor` may read approved public/Gmail sources and complete explicitly allowlisted, deterministic canonical actions; its first such action is the service-only HOGFBX flight schedule executor. It cannot make generic canonical writes. The GitHub Actions surveyor checks the public watch set and may stage noncanonical source evidence in `monitoring_findings`; it cannot write normalized facts, modify Gmail, send mail, create push notifications, or change canonical app state.

## Closed-loop default

Routine, high-confidence, reversible findings are completed by the surveyor: detect, extract, reconcile to the existing object, apply the bounded canonical update, emit one concise signal when useful, and stop. A finding is not normally a work order for Kavi or Codex.

The first implemented private-source lane is the Atlanta Delta itinerary. Its service-only executor and ambiguity boundary are defined in `docs/FLIGHT_CHANGE_AUTO_APPLY.md`. Generic `review this email` output is prohibited when confirmation, carrier, travelers, and complete changed-leg facts match confidently. Cancellation, rebooking ambiguity, identity mismatch, or incomplete material facts still fail closed with one specific question.

`docs/ROUTINE_FINDING_AUTO_APPLY_POLICY.md` generalizes that same narrow consequence rule to already-bound hotel details, event availability/status, and maintained official hours/details. It does not authorize object creation, deletion, inferred identity, or arbitrary writes.

## Purpose

The MVP monitoring agent exists to remove the owner's need to manually check quiet-period MagicCon sources. It should notice rare meaningful changes and package them as reviewable observations that the app can display through `public/monitoring-intake.json`.

It is not a broad crawler, a daily content farm, a travel-monitoring service, or an autonomous decision-maker.

## Operating posture

The healthy default result is **nothing happened**.

During the quiet period, days or weeks may pass with no visible app change. The agent should preserve confidence that the watch set is alive without manufacturing engagement.

## Inputs

The detailed watch-set strategy is recorded in `research/MONITORING_SOURCE_STRATEGY_2026-08-04.md`. That research note is the authority for source priority and search-radar shape; this file defines the agent behavior and safety contract.

The mechanical web watch set is now recorded in `monitoring/watch-set.json`. Run `pnpm monitor:check` at the start of each daily run before ad hoc browsing. The command compares approved public watch URLs against the accepted local baseline in `.monitoring-state/watch-state.local.json`, which is intentionally ignored by Git so routine quiet checks do not dirty the repository. Use `pnpm monitor:accept` only after a baseline or reviewed change has been accepted; do not silently accept a changed source before routing it.

The cloud surveyor now stages changed-source candidates in `public.monitoring_findings` after the mechanical check. `pnpm monitor` is the canonical alias for the check, and `pnpm monitor:stage <report.json>` performs the server-side staging step. GitHub Actions must have a server-only `SUPABASE_SECRET_KEY` repository secret for canonical project `pavjsexxbueuzhzgemgy`; the staging command fails closed when it is absent. The secret must never use a publishable/browser key and must never be committed. Identical fingerprints update one finding rather than creating new inbox cards, and identical shared-navigation link deltas are collapsed across watched pages.

Every changed-source catch must now finish under `scripts/lib/surveyor_closure_contract.mjs`. Staging writes `closure-manifest.json` with exactly one terminal disposition for each meaningful report change: `canonical_update`, `routed_signal`, `retained_evidence`, or `ignored_noise`. Each disposition names its existing product target and carries exact Supabase relation, match, and observed readback metadata. A novel intake kind, missing outcome, blocked disposition, or missing readback fails closed. After closure verification and any watched-event alert delivery, `pnpm monitor:accept-report` promotes only the exact report-timestamped pending public-source snapshots already reviewed; it never refetches. The workflow then saves `.monitoring-state`. A failed or replay run cannot accept or advance that baseline, and the report plus closure receipt remain available as artifacts.

Only Kavi can read and manage these rows through the app. Informational source evidence uses `unread`, `read`, and `archived`; those transitions are review state, not approval, and carry no decision audit.

### Decision-to-action boundary

- Do not create a decision prompt when the finding is already the useful object. New official links are informational evidence, not permission to publish a duplicate alert.
- Every genuine decision prompt must name a distinct canonical consequence, such as `Update this event`; avoid a generic Yes whose effect is hidden.
- **Yes** authorizes the stated action. When the source, target mapping, transformation, and rollback are deterministic and bounded, the system should perform the canonical update, run the proportional validation lane, publish when public behavior changed, verify the deployed result, and record the outcome without waiting for Kavi to remember to ask in chat later.
- **No** dismisses the candidate with who/when audit.
- Use `staged` only when the mapping is genuinely ambiguous, required capability/credential is blocked, or the consequence cannot yet be safely automated. A staged row must record a concrete blocker, next action, and execution owner/wakeup mechanism; it must not become passive “ask Kavi again someday” purgatory.
- User-approved bounded execution is not the same as unreviewed autonomous canonical ingestion. Broad unreviewed ingestion remains parked.
- Extend the audit model so it can prove the authorized action, execution status, canonical target/result, failure/blocker, validation, deployment, and verification—not only the decision timestamp.

The mechanical Gmail query map is recorded in `monitoring/gmail-watch-queries.json`. It does not access Gmail by itself; it prevents the daily run from drifting back into broad, noisy searches.

### Initial watch set

- MagicCon Atlanta official site tree, not merely the home page. Any new, removed, renamed, or materially changed page under `https://mcatlanta.mtgfestivals.com/en-us/` is a candidate observation.
- Black Lotus VIP page, elevated as a Home-worthy target by default unless a diff is clearly cosmetic.
- Ticketed play / event schedule placeholder surfaces.
- MagicCon news page.
- Leap order and ticketed-play schedule surfaces when access is available.
- Official MagicCon social links as low-volume announcement radar.
- MagicCon Black Lotus VIP Discord as a bounded manual/radar source, especially `#questions-for-staff` and Black Lotus discussion channels. It is high-signal for leads and staff/community context, but not canonical publisher truth unless supported by staff/organizer wording or a first-party link.
- Official Wizards Magic news as a narrowly filtered product/context source. Do not monitor the broad Wizards news feed; check it only when article text or search terms intersect MagicCon, MTG Festivals, Atlanta, Black Lotus, Festival in a Box, Mystery Booster, ticketed play, or event products.
- Pastimes format/ticketed-play resources for interpreting event difficulty and mechanics.
- Official artist, vendor, show store, map, and prize wall pages when URLs exist.
- Gmail search results for MagicCon-specific mail, Leap Conventions/leapevent, Pastimes, Delta, hotel receipts, and store receipts. Generic Wizards/Magic marketing and standalone Leap wording are out of scope unless the message itself mentions MagicCon, MTG Festivals, Atlanta 2026, ReedPop, Leap Conventions, leapevent, or Pastimes.
- Small external search radar for high-signal Atlanta terms such as ticketed play, Black Lotus, artist directory, show store, prize wall, map, exclusive playmat, and Dragon Shield.

### Later watch set expansion

Add URLs only when a user, source page, or reviewed prior observation shows they matter.

Examples:

- artist directory page once published;
- show store catalog once linked;
- prize wall once linked;
- ticketed-play schedule once Atlanta inventory appears;
- venue map PDF/image once published.

## Output and hydration contract

The POC hydration contract is documented in `docs/MONITORING_HYDRATION_CONTRACT.md`.

Each run may emit zero or more reviewable observations with:

- source kind: `site`, `newsletter`, `email`, or `manual`;
- exact source reference: URL, Gmail message/thread ID, or artifact pointer;
- retrieval/check time;
- observed wording, diff summary, or receipt/artifact pointer;
- AI summary;
- why it matters;
- suggested app destination;
- attention level;
- review status;
- whether the finding appears to supersede, contradict, or merely supplement prior evidence.

For Discord-origin observations, the exact reference should include server, channel, message timestamp, and message link or screenshot/export pointer when available. Usernames should be minimized in public fixtures; retain `Metavirus` as Kavi and `Gremmy` as Chris only when identity matters to the app's interpretation.

## Discord method borrowed from the reference app

The nearby `mtg-events-chatgpt` project already proved a useful Discord pattern. Reuse its principles, not its schema or broad scope:

- Maintain a small watch map instead of rediscovering Discord each run: server, channel, purpose, priority, cadence, expected signal types, safe access mode, last checked marker, and last useful signal.
- Keep access mode explicit. The default for this project is `manual_open_required`: Kavi opens the channel or supplies a screenshot/paste, and Codex analyzes only visible content.
- Future automation should require a dedicated read-only Discord profile plus mechanical guards before any agent-driven browsing: no typing, pasting, reactions, posting, joining, role changes, settings changes, uploads, or DMs.
- Check high-yield surfaces first: staff Q&A, announcements, event/product/logistics threads, then Black Lotus discussion. Do not browse ordinary chat history.
- Classify findings as `staff_answer`, `official_link_lead`, `friend_signal`, `community_activity`, `event_or_product_lead`, `logistics_change`, `sellout_or_availability`, or `noise`.
- Preserve channel, timestamp, role/identity only when useful, source wording, and a verification target. Unsupported community chatter stays Activity-only.
- Quiet Discord checks are run observations, not Home alerts and not permanent source downgrades.

For MagicCon Atlanta, the initial Discord watch-map candidate is:

| Server | Channel | Role | Expected signal | Default route |
| --- | --- | --- | --- | --- |
| MagicCon Black Lotus VIP | `#questions-for-staff` | staff/organizer clarification | BL logistics, entitlements, schedule clarifications, policy answers | Activity → affected object; Home if urgent |
| MagicCon Black Lotus VIP | `#magiccon-discussion` | community/friend radar | official-link leads, friend questions, event/product chatter, sellout/logistics leads | Activity |
| MagicCon Black Lotus VIP | `#deckbuilding-and-theorycrafting` | event prep texture | deck/product clues for included events or Mystery Booster-like formats | Explore/Activity |
| MagicCon Black Lotus VIP | `#trades` | low-priority community surface | possible meetups/trades only if Kavi later cares | ignored by default |

The agent may replace `public/monitoring-intake.json` with these observations when there is something useful to show in the GitHub Pages preview. The agent must never silently normalize, overwrite, hide, commit, purchase, or notify external systems.

## Routing rules

Use `docs/POC_FINISH_GLIDE_PATH.md` as the routing authority.

Short form:

- Home only for rare consequential signals.
- Activity for source/change history.
- Wallet for receipts, QR codes, proof, and original artifacts.
- Trip for flights, hotels, lodging transitions, and travel changes.
- Explore for event, artist, vendor, catalog, and opportunity discovery.
- Calendar for dated milestones, deadlines, travel anchors, and committed itinerary objects.
- Map for venue/floor/location artifacts.
- Notes only for human-authored notes or explicitly requested agent-to-owner prompts.

## Attention policy

### Home-worthy

Send to Home when the owner would plausibly be glad they did not have to manually check:

- ticketed play opens;
- Black Lotus store window or details appear;
- the Black Lotus VIP page materially changes;
- the Atlanta official site tree gains a new planning-relevant page;
- official artist directory appears;
- official show catalog appears;
- official map appears;
- prize wall appears during event;
- event marked Interested/Tentative/Committed/Purchased changes or sells out;
- flight/hotel change affects arrival, departure, check-in, or event timing.

### Activity-only

Keep in Activity when:

- a watched source is unchanged;
- a newsletter is generic or non-Atlanta;
- a source has a cosmetic change;
- a receipt was imported successfully;
- an agent extracted metadata for later review.

### Object annotation

Attach to the object when:

- a receipt belongs to a Wallet item;
- a flight update belongs to Trip;
- a venue/map fact belongs to Map;
- an event detail affects Explore or Plan;
- a source fact explains why an object is trustworthy.

## Deployed runtime split

The Codex heartbeat remains a deliberately simple closed-loop workflow:

1. Run once daily during quiet period.
2. Search/check the approved watch set.
3. Reconcile findings into known concepts and apply an explicitly allowlisted deterministic consequence when its confidence guard passes.
4. Emit a compact result; a Home-worthy item is normally the notice that the update already completed.
5. If nothing meaningful changed, record only a quiet Activity observation or no visible app update.

The GitHub Actions surveyor is separate: it runs the deterministic public check, uploads the artifact, and—once its server credential is configured—stages deduplicated review candidates in Supabase. It does not run Gmail, Discord, or LEAP browsing. Routine quiet checks create no visible app noise.

Do not start with:

- continuous polling;
- multi-writer sync;
- browser session scraping of logged-in sites;
- push notifications;
- generic or unmapped automatic database writes;
- broad web search across the entire internet every day.

## Suggested daily run outline

1. Confirm project identity and current watch set.
2. Run `pnpm monitor:check`. If it reports changed watched sources, inspect those sources first and classify the change before checking broader radar.
3. Check official site/watch URLs for changed text, new links, or removed "coming soon" language only where the mechanical check or source strategy indicates a need.
4. Check MagicCon news for new posts.
5. Search Gmail using `monitoring/gmail-watch-queries.json` and a narrow date window since the last run. Do not search standalone `Wizards` or standalone `Leap`; require MagicCon/MTG Festivals context for broad vendor/operator terms.
6. Check narrowly filtered official Wizards news only when it intersects MagicCon-relevant product/context terms.
7. Review any manually supplied or connector-available Black Lotus Discord observations as radar. Follow official links before promoting claims; keep unsupported community chatter in Activity unless it indicates an urgent Black Lotus, ticketed-play, store, sellout, map, or vendor/exclusive lead.
8. Classify each finding into the routing map.
9. For a normalized private Gmail receipt or flight candidate, run `pnpm intake:private-gmail -- -` with the JSON on stdin. Treat only `applied` as closure; carry every `not_covered` reason into the run summary and do not advance a private-source baseline for that candidate.
10. Complete other safe allowlisted consequences, then produce a short report:
   - Home-worthy findings;
   - object annotations;
   - Activity-only observations;
   - unclear items needing a rare yes/no prompt.
11. Do not ask the owner anything unless material ambiguity prevents the safe consequence.

## First deployable automation prompt

When automation is enabled, the scheduled task should say:

> Check the MagicCon Atlanta 2026 watch set for meaningful changes. Use the repository docs as routing authority. Detect, extract, reconcile, apply any explicitly allowlisted high-confidence reversible consequence, emit one concise signal when useful, and stop. Preserve source evidence. Never modify Gmail. Do not turn a safe deterministic update into a Codex review request; ask one specific question only for material unresolved ambiguity.

## POC acceptance

The monitoring agent is POC-ready when:

- the app preview demonstrates landing places for representative findings;
- this design is documented;
- a human can run the daily prompt manually and know where every finding belongs;
- live automation can be enabled later without redesigning Home, Activity, Notes, Wallet, Trip, Explore, Calendar, or Map.

## Remaining activation gate

- In GitHub repository Settings → Secrets and variables → Actions, configure the secret named exactly `SUPABASE_SECRET_KEY` with a modern `sb_secret_...` server key for `pavjsexxbueuzhzgemgy`. Never paste it into chat, commit it, or expose it through Vite/browser configuration.
- Run `Daily MagicCon surveyor` manually and prove a changed report stages a row, then rerun the same report and prove fingerprint dedupe updates `occurrence_count` instead of creating another card.
- Confirm Kavi can review the candidate and a non-Kavi companion cannot read or decide it.
- Run the normal ship/public verification gate only after that workflow is clean. Private Storage for receipt originals remains a separate tranche.
