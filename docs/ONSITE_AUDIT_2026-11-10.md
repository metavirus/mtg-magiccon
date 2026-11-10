# Onsite visual and sharing audit — November 10

Scope: release worktree, starting at `d3b87f4`; phone widths 320/390 and desktop 1280. No purchases, attendance, notes, bookmarks, or receipt contents were changed.

## Findings and corrections

- Wallet tabs overlapped at 320px because the Prize Tix counter consumed the same non-wrapping row. Tabs now retain a complete row at narrow widths; the counter follows below.
- Calendar's Travel filter clipped at narrow widths. Type filters now occupy their own phone row.
- Official announcements were inadvertently Kavi-only in both the client loader and database access. The new companion RPC returns only reviewed public copy and plain official links. Raw monitoring tables retain their original restrictions; read/archive choices are per viewer and original expiry is unchanged.

## Verified evidence

- Independent PM inspected Home, Events, Calendar, Wallet, Trip, Info, Map, event/Info drawers, More navigation, populated Store, and scrolled Store groups at 320/390/1280. Corrected Wallet tabs and Calendar Travel filter were rechecked; Travel was clicked. Flight departure/arrival summaries remain visible with details closed. Map overview/search was inspected, not every destination.
- Under each of the four actual companion identities, read-only authenticated database transactions returned identical counts: 3 flight itineraries, 6 flight legs, 13 receipts, 34 receipt artifacts, 34 downloadable receipt objects, 202 Store offers, and 149 shared event selections. The browser flight/receipt loaders do not add an owner-only filter. Receipt storage authorization was included, not only table access.
- Root opened Wallet → Store → Original → Show proof in the signed-in live Chrome app and visually verified the original receipt rendered.
- 75 focused startup, offline reopen, receipt, UI and flight regressions passed. Calendar/Wallet isolated browser checks passed at 390/1280: slow online checking retained the header and concealed unverified cached content; retry, saved fallback and offline receipt opening passed.
- Full pre-release test suite initially passed 801 tests. Text validation caught a temporary PM script placed at the worktree root; it was removed. Scratch browser scripts belong in ignored output directories.

## Intentional differences and limits

Kavi's signing/card workbench, ingestion controls and raw monitoring evidence stay private. Explicitly private notes, personal bookmarks and per-user review choices are not shared trip facts. Hotels are currently represented by shared application data, not a separate hotel table.

PM evidence is desktop-host responsive browser testing, not a fresh physical-iPhone certification. Existing user-reported airplane-mode success remains relevant; this audit cannot guarantee every network/device condition. No account sessions were cleared and no offline cache was purged.

Minor existing source/provenance labels and the lodging explanatory footer are nonblocking copy cleanup. No broad redesign is included this week.

Local screenshots: `C:/Users/kavig/AppData/Local/Temp/magiccon-onsite-audit/`. Private receipt screenshots are not published.

## Shared announcement repair

Migration `20261110180000` was applied atomically with migration-history registration after readiness passed. All four companion roles read 68 sanitized announcements, including 14 within seven days. Chris, Juan and Kyle each read zero raw findings and zero concepts. An outsider reads zero announcements; anonymous callers lack execute permission. The privileged helper has a fixed empty search path in the unexposed private schema; the public wrapper is security-invoker. No existing private-schema functions were exposed by the schema usage grant.

The hosted advisor connector was unavailable; direct catalog inspection verified the changed function grants, search paths and role behavior. This is scoped SQL verification, not a claim that the hosted advisor ran.

Four new regressions cover the companion loader, preserved operator path, discarded operational fields, independent review status and unchanged seven-day age. The 43-test integration run passed. Independent PM inspected a synthetic signed-in Chris flow through the actual RPC adapter at 390/1280: Home card and official-link drawer render without operational content, and no raw monitoring-table request is sent. These are isolated fixture credentials, not impersonation of Chris's live browser session.
