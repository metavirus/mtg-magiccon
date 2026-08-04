# MagicCon Atlanta Monitoring Source Strategy

Updated: 2026-08-04

## Decision question

What should the quiet-period monitor watch so Kavi does not have to manually patrol MagicCon sources, while still avoiding noisy web-crawler behavior?

## Operating principle

Canonical evidence comes from Kavi's inbox and first-party publisher/operator sources. Broader internet search and community chatter are useful radar, but they should create leads for review rather than silently becoming facts.

The Atlanta official site tree is itself a canonical watch target. The monitor should not only check individual bookmarked URLs; it should also notice new, removed, renamed, or materially changed pages under `https://mcatlanta.mtgfestivals.com/en-us/`.

## Source priority

### P0 — canonical and high-alert by default

These are the sources most likely to contain decision-changing information.

- Gmail messages about MagicCon or the Atlanta trip: MagicCon, Magic Con, MTG Festivals, ReedPop MagicCon mail, Leap/Event Technology, Pastimes, Delta, Omni, Courtyard, Booking/KAYAK, official store, prize wall, QR codes, confirmations, or receipts. Generic Wizards/Magic marketing is out of scope unless the same message also mentions MagicCon, MTG Festivals, Atlanta 2026, ReedPop, Leap, or Pastimes.
- Atlanta official site tree: `https://mcatlanta.mtgfestivals.com/en-us.html` and all discovered `mcatlanta.mtgfestivals.com/en-us/` pages.
- Atlanta Black Lotus VIP page: `https://mcatlanta.mtgfestivals.com/en-us/badges/buy-badges/black-lotus-vip-experience.html`.
- Global MagicCon news index: `https://www.mtgfestivals.com/global/en-us/magiccon-news.html`.
- Leap order and ticketed-play schedule surfaces, when authenticated or public access is available.

Black Lotus page changes should be Home-worthy unless clearly cosmetic, because the page already contains the Thursday First Look schedule, Black Lotus included events, online store entitlement, pickup windows, special access, lounge state, and FAQ claims.

### P1 — official operational surfaces

These sources are first-party or operator-adjacent and often become more useful near the event.

- Atlanta badge and how-to-buy pages.
- Atlanta hotels/travel, FAQ, accessibility, safety/wellness, code of conduct, contact, newsletter signup, industry/applications pages.
- Future Atlanta pages for ticketed play, Magic Play, Art of Magic, artist directory, guests, exhibitors, vendors, show store, merch, map, mobile app, meet-and-greet wristbands, special events, and prize wall.
- Pastimes event-format resources and ticketed-play explainers, especially when Leap descriptions use hard-to-interpret format language.
- Official MagicCon social profiles linked from the event site: Facebook, X, Instagram, and Bluesky. These are announcement radar; official pages or email still win for canonical details.
- The official MagicCon mobile app page/app feed once Atlanta 2026 publishes one.

### P2 — value-add discovery radar

These are not canonical, but they may reveal things worth checking.

- Daily or every-few-days search queries:
  - `"MagicCon Atlanta" "ticketed play"`
  - `"MagicCon Atlanta" "Black Lotus"`
  - `"MagicCon Atlanta" "artist directory"`
  - `"MagicCon Atlanta" "show store"`
  - `"MagicCon Atlanta" "prize wall"`
  - `"MagicCon Atlanta" "map"`
  - `"MagicCon Atlanta" "exclusive" "playmat"`
  - `"MagicCon Atlanta" "Dragon Shield"`
- Vendor and sponsor channels only after the official exhibitor/vendor list exists, with special attention to con-exclusive merch such as playmats, sleeves, deck boxes, promos, pins, and limited-quantity products.
- Artist pages/social only after the official artist list exists, and only to enrich signature/card planning rather than generating fan-noise.
- Reddit and community posts as weak radar for timing, sellouts, store drops, app changes, and operational pain points. Community claims require a canonical follow-up before becoming app facts.

### P3 — deliberately not monitored for MVP

- Broad continuous social scraping.
- Flight-status monitoring beyond consequential email changes already in Gmail.
- Hotel-price, restaurant, rideshare, booking-management, or tourist-guide monitoring.
- Unofficial Discord monitoring unless Kavi later identifies a specific channel as high-signal.
- Browser-session scraping of logged-in Leap pages without a separate reviewed design.

## Prior-event clues from web research

Prior and current MagicCon pages show that important information lands across many surfaces, not just the news page.

- The Atlanta badge page already exposes show-floor hours, play-hall hours, registration/will-call pickup windows, ticketed merch pickup windows, nonrefundability, and the badge-shipping cutoff. These are operational facts that can matter in Calendar, Wallet, and Trip.
- The Atlanta Black Lotus page already contains dated lounge hours, Thursday First Look content, included play events, online store preorder pickup, priority entry, Black Lotus store entitlement, and “details closer to show” placeholders. This page deserves page-diff monitoring as a first-class alert source.
- The Vegas 2026 map page demonstrates that a later event site can publish show maps, level highlights, room/area locations, Black Lotus lounge and fulfillment locations, ticketed play HQ, Magic Marketplace, Art of Magic, show-store routing, and pickup instructions.
- The Vegas 2026 mobile-app page demonstrates that some event schedules, maps, exhibitors, bookmarks, reminders, app-game surfaces, and timely push notifications may live in the official app layer.
- The global MagicCon news feed has historically announced feature previews, ticketed-play readiness, Art of Magic artists, schedule links, and other “planning season starts now” facts.
- The Amsterdam 2026 Black Lotus page shows a comparable Black Lotus pattern: lounge schedule, included events, online shopping entitlement, meet-and-greet placeholders, and “more information closer to show” language.

## Watch-set shape

The watch set should be represented as a small reviewed list, not hard-coded inside the app.

Each target should store:

- source owner;
- URL or Gmail query;
- priority;
- expected destination if changed;
- Home-worthy trigger rule;
- known stale/contradictory labels;
- last checked time;
- last material observation hash or excerpt.

## Suggested Gmail queries

These are read-only discovery queries, not authorization to create a live Gmail monitor.

- `after:2026/06/01 (MagicCon OR "Magic Con" OR mtgfestivals OR ReedPop OR Leap OR leapevent OR Pastimes)`
- `after:2026/06/01 ("MagicCon: Atlanta" OR "Atlanta 2026")`
- `after:2026/06/01 (subject:(confirmation OR receipt OR order OR ticket OR badge) (MagicCon OR Leap OR leapevent))`
- `after:2026/06/01 ("Black Lotus" OR "online store" OR "show store" OR "Prize Tix" OR "prize wall")`
- `after:2026/06/01 (Delta OR "HOGFBX" OR Omni OR Courtyard OR Booking.com OR KAYAK) (Atlanta OR ATL OR MagicCon)`

Do not use a standalone `Wizards` query. It catches ordinary Magic marketing and creates noise. If Wizards-origin mail becomes relevant, it should match a MagicCon-specific query such as `(from:(wizards.com) (MagicCon OR mtgfestivals OR "Magic Con"))`.

Older Vegas and Amsterdam messages may be searched manually for timing clues, but they should not pollute Atlanta facts.

## Alert routing

### Home-worthy by default

- New Atlanta official page appears for ticketed play, artist directory, mobile app, maps, show store/catalog, prize wall, meet-and-greet wristbands, or Black Lotus details.
- Any meaningful Black Lotus page change.
- Atlanta ticketed-play schedule opens or inventory becomes visible.
- Ticketed event marked Interested/Tentative/Committed/Purchased changes, sells out, or becomes available.
- Email announces Black Lotus online store window, shopping instructions, pickup instructions, or purchase confirmation.
- Official map or venue layout appears.
- Flight/hotel email changes a confirmed arrival, departure, check-in, checkout, or handoff.

### Activity/object annotation

- Cosmetic official page changes.
- Generic newsletters without Atlanta-specific planning consequence.
- New links that are plausible but not yet useful.
- Receipt imports and extracted metadata.
- Community chatter without canonical confirmation.

## Contradiction handling

The Atlanta homepage currently exposes a stale `MagicCon: Atlanta 2025` heading while its page chrome and body describe Atlanta in November 2026. The monitor should preserve that contradiction as source wording. It should not “fix” the page in normalized facts unless a reviewed observation supports the correction.

## Implementation guidance

The monitor should run breadth-first but report sparse:

1. Check the Atlanta official site tree and detect new/deleted/materially changed pages.
2. Check the Black Lotus page as a separately elevated target.
3. Check the global news index for new MagicCon posts.
4. If Gmail is enabled, run the narrow query set and extract only candidate confirmations, receipts, travel changes, or announcement emails.
5. Run a small external-search radar set for new high-signal Atlanta mentions.
6. Route findings to Home, Activity, Wallet, Trip, Explore, Calendar, Map, or Notes under `docs/POC_FINISH_GLIDE_PATH.md`.
7. Preserve exact URLs, retrieval time, useful wording, and confidence. Do not write canonical facts or app state without a reviewed workflow.
