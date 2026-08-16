# Ticketed play hydration contract

Updated: 2026-08-16

This contract prepares the app for Atlanta ticketed-play listings without pretending the listings exist yet. LEAP is a one-way source hydrator: it tells the app what public ticketed-play inventory exists and how those source facts changed. The MagicCon companion app owns browsing, ranking, planning state, notes, purchased proof, Calendar blocking, and Home/Activity signal behavior.

## Source hierarchy

Public LEAP schedule pages hydrate event inventory and source availability:

- event title and full source title;
- source categories;
- date, start/end time, duration, location, and room when present;
- price as exact source fact;
- availability such as available, sold out, waitlist, or unknown;
- full description and headed sections such as registration details, participation details, tournament details, prizes, and questions;
- source URL, retrieval timestamp, and raw snapshot payload.

Private purchase or registration status does not come from ordinary public LEAP inventory. It comes from a receipt, LEAP order confirmation, intentional My Schedule capture, or a later verified manual proof path. Purchased proof belongs with Wallet/proof objects and hydrates the app's purchased/registered status.

User planning intent remains app-owned state in the existing selections layer: interested, tentative, committed, hidden, and not-for-me are not LEAP facts.

## Normalized event dimensions

Preserve exact source labels separately from app interpretation.

- `exploreBucket`: `play`, `info`, `social`, or `other`.
- `kind`: what the object is, such as `ticketed_play`, `panel`, `meet_greet`, `reception`, `pickup`, `store`, `logistics`, or `unknown`.
- `playFormat`: only for gameplay items, such as sealed, draft, commander, two-headed giant, league, constructed, casual play, or unknown.
- `difficulty`: casual, social, challenging, competitive, or unknown.
- `timeKind`: fixed block, optional window, league window, drop-in, pickup window, all-day, or unknown.
- `availability`: available, sold out, waitlist, unavailable, or unknown.
- `priceAmount`, `priceCurrency`, and `priceDisplay`: exact source price facts. Cost weight is derived in UI/ranking rather than stored as a canonical category.
- `requirements`: passive facts such as team event, team size, one-entry-covers-team, Wizards Account required, Companion App required, nonrefundable, or registration required.

If actual Magic gameplay happens, the Explore bucket is `play`, even when LEAP also labels the item as Social. Commander-and-cocktails-style social play is Play.

Competitive is a difficulty/pressure signal and usually ranks lower for Kavi. Challenging and social/casual play are acceptable starting defaults.

## Time and purchase rules

Purchased proof is stronger than planning intent, but it does not always create a hard calendar conflict.

- Purchased plus `fixed_block` creates a firm Plan/Calendar block.
- Purchased plus `league_window`, `optional_window`, `drop_in`, or `pickup_window` is a flexible entitlement, not a hard block.
- League-style events may have source times that indicate an optional play window rather than a mandatory full-duration commitment.
- Purchased status should not be casually toggled from Explore or Plan. Corrections belong in the proof/Wallet layer.

Suggested UI language:

- fixed purchased event: `Purchased · Firm block`;
- league/window event: `Purchased · Flexible window`;
- pickup/product entitlement: `Purchased · Claim window`.

## Sold-out rules

Sold out is a source availability status, not a hiding action.

- Newly sold-out events remain visible in Explore, visually cooled/greyed, and sorted later.
- The first sold-out transition creates a Home signal.
- Sold-out events should not move into a hidden/collapsed unavailable group immediately.
- After roughly one week, a sold-out event may collapse if it is still sold out, unpurchased, not watched, not interested/tentative/committed, and has no relevant notes/activity.
- Purchased sold-out events remain visible as purchased obligations or entitlements.

## Home and Activity signal grouping

The first Atlanta ticketed-play drop should not flood Home.

- Home gets one grouped signal such as `Ticketed play is live`.
- The grouped signal may include targeted subcounts, such as high-signal picks, social options, expensive/limited events, and conflicts.
- Clicking a grouped signal must route directly to the useful Explore slice: Play selected, the relevant group/filter applied, and affected events surfaced at the top.
- Activity may preserve the full ingest/change log, but bursty additions should still collapse into grouped entries.

Later Home-worthy changes:

- watched/interested/tentative/committed event sells out;
- high-signal event sells out;
- time or location changes for purchased/committed/tentative items;
- a new high-signal event appears after the initial drop;
- purchase or registration proof appears.

Activity-only by default:

- ordinary low-rank new events;
- minor copy changes;
- prize/rules/description changes unless high-signal, watched, purchased, or prep-changing;
- sold-out changes for irrelevant events after the initial grouped signal.

Raw wording churn with no planning consequence belongs in source history/event detail only.

## Initial ranking defaults

Initial high-signal ranking should start with:

1. Black Lotus relevance;
2. unique or convention-only fun;
3. social/friend fit;
4. schedule fit;
5. value/prize usefulness;
6. competitive seriousness.

Default penalties:

- high price unless clearly special;
- long events that consume a major day block;
- generic formats available elsewhere;
- conflicts with committed or purchased anchors;
- team events without an obvious teammate path.

Refine these weights when the real Atlanta inventory lands.
