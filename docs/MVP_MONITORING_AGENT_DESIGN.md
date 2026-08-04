# MVP Monitoring Agent Design

Updated: 2026-08-04

Automation status: first conservative daily heartbeat created as `magiccon-atlanta-quiet-period-monitor`. It reports into the Codex task only. It is not authorized to write Supabase data, modify Gmail, send mail, create push notifications, or change app state.

## Purpose

The MVP monitoring agent exists to remove the owner's need to manually check quiet-period MagicCon sources. It should notice rare meaningful changes and package them as reviewable observations that the app can display.

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
- Pastimes format/ticketed-play resources for interpreting event difficulty and mechanics.
- Official artist, vendor, show store, map, and prize wall pages when URLs exist.
- Gmail search results for MagicCon, Leap/Event Technology, Pastimes, Delta, hotel receipts, and store receipts, only when explicitly enabled.
- Small external search radar for high-signal Atlanta terms such as ticketed play, Black Lotus, artist directory, show store, prize wall, map, exclusive playmat, and Dragon Shield.

### Later watch set expansion

Add URLs only when a user, source page, or reviewed prior observation shows they matter.

Examples:

- artist directory page once published;
- show store catalog once linked;
- prize wall once linked;
- ticketed-play schedule once Atlanta inventory appears;
- venue map PDF/image once published.

## Output contract

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

The agent must never silently normalize, overwrite, hide, commit, purchase, or notify external systems.

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

The initial deployed heartbeat follows this shape and is intentionally limited to thread reporting.

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
4. If Gmail is enabled, search only narrow MagicCon/Leap/Pastimes/Delta/hotel/store queries since the last run.
5. Classify each finding into the routing map.
6. Produce a short report:
   - Home-worthy findings;
   - object annotations;
   - Activity-only observations;
   - unclear items needing a rare yes/no prompt.
7. Do not ask the owner anything unless the answer changes future classification, recommendation, or alerting.

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
