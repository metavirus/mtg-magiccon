# MVP Monitoring Agent Design

Updated: 2026-08-08

Automation status: daily heartbeat `magiccon-atlanta-quiet-period-monitor` is active. It may read approved public sources and Gmail search results, report into the Codex task, and update the fixture-backed POC hydration file when a finding is ready for review. It is not authorized to write Supabase data, modify Gmail, send mail, create push notifications, or change canonical app state.

## Purpose

The MVP monitoring agent exists to remove the owner's need to manually check quiet-period MagicCon sources. It should notice rare meaningful changes and package them as reviewable observations that the app can display through `public/monitoring-intake.json`.

It is not a broad crawler, a daily content farm, a travel-monitoring service, or an autonomous decision-maker.

## Operating posture

The healthy default result is **nothing happened**.

During the quiet period, days or weeks may pass with no visible app change. The agent should preserve confidence that the watch set is alive without manufacturing engagement.

## Inputs

The detailed watch-set strategy is recorded in `research/MONITORING_SOURCE_STRATEGY_2026-08-04.md`. That research note is the authority for source priority and search-radar shape; this file defines the agent behavior and safety contract.

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

## Recommended MVP deployment shape

Use a deliberately simple scheduled Codex/automation workflow first:

1. Run once daily during quiet period.
2. Search/check the approved watch set.
3. Emit a compact observation report.
4. If any Home-worthy item exists, wake the thread or create an app alert payload.
5. If nothing meaningful changed, record only a quiet Activity observation or no visible app update.

The deployed heartbeat follows this shape and may also refresh the fixture-backed preview hydration file when there is a meaningful finding. Routine quiet checks remain thread-only.

Do not start with:

- continuous polling;
- multi-writer sync;
- browser session scraping of logged-in sites;
- push notifications;
- automatic database writes beyond reviewed observation intake;
- broad web search across the entire internet every day.

## Suggested daily run outline

1. Confirm project identity and current watch set.
2. Check official site/watch URLs for changed text, new links, or removed "coming soon" language.
3. Check MagicCon news for new posts.
4. Search Gmail using narrow MagicCon-specific, Leap Conventions/leapevent, Pastimes, Delta, hotel, and store queries since the last run. Do not search standalone `Wizards` or standalone `Leap`; require MagicCon/MTG Festivals context for broad vendor/operator terms.
5. Check narrowly filtered official Wizards news only when it intersects MagicCon-relevant product/context terms.
6. Review any manually supplied or connector-available Black Lotus Discord observations as radar. Follow official links before promoting claims; keep unsupported community chatter in Activity unless it indicates an urgent Black Lotus, ticketed-play, store, sellout, map, or vendor/exclusive lead.
7. Classify each finding into the routing map.
8. Produce a short report:
   - Home-worthy findings;
   - object annotations;
   - Activity-only observations;
   - unclear items needing a rare yes/no prompt.
9. Do not ask the owner anything unless the answer changes future classification, recommendation, or alerting.

## First deployable automation prompt

When automation is enabled, the scheduled task should say:

> Check the MagicCon Atlanta 2026 watch set for meaningful changes. Use the repository docs as routing authority. Return only Home-worthy findings, object annotations, and Activity-worthy observations. Preserve exact URLs, source wording where useful, retrieval time, and why each finding matters. Do not normalize facts, change app state, send email, or create noisy engagement prompts.

## POC acceptance

The monitoring agent is POC-ready when:

- the app preview demonstrates landing places for representative findings;
- this design is documented;
- a human can run the daily prompt manually and know where every finding belongs;
- live automation can be enabled later without redesigning Home, Activity, Notes, Wallet, Trip, Explore, Calendar, or Map.

## Open before live automation

- Decide whether the first real run writes only to the Codex thread or also to Supabase observation tables.
- Fix auth/session persistence before expecting owner-reviewed writes to survive reliably from the app.
- Design private Storage before saving real receipt screenshots/PDFs.
- Define the watch-set file format if the URL list grows beyond a handful of official pages.
