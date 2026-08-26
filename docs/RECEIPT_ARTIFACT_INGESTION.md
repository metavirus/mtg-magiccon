# Receipt Artifact Ingestion

Receipts should be ingested once, then rendered from durable app artifacts. The UI should not keep returning to Gmail just because a Wallet card, badge proof, QR popover, or receipt detail needs to change.

## Rule

When a MagicCon-relevant receipt is found, capture both:

1. **Original proof artifact** — a full, showable receipt render that preserves the email or source page as a person would expect to see it.
2. **Extracted receipt facts** — the small structured payload the app uses for fast display, filtering, links, QR/code surfaces, person bubbles, and notes.

After ingestion, normal interface work reads the ingested artifact and facts. Gmail, Leap, Square, Delta, hotel sites, or other sources are only revisited when ingesting a new receipt, refreshing a stale receipt, or resolving a conflict.

## Minimum artifact bundle

Each ingested receipt should have:

- stable receipt id;
- source system and source reference, such as Gmail message/thread id or source URL;
- retrieval timestamp;
- receipt type: `badge`, `ticketed_play`, `store`, `travel`, `hotel`, or `other`;
- title, vendor/provider, receipt date, amount, currency, and confidence;
- people involved using the global person-bubble identity language (`Ka`, `J`, `C`, future `Ky`);
- line items when available, with quantities, prices, exact attendee assignments, and related catalog/event links when known;
- QR/code artifacts when present, including the visible alphanumeric code beneath the QR;
- original proof artifact path;
- extracted `Info` payload for the fast-use view;
- sensitivity note for anything that should later move to private storage.

## Current POC storage

For the fixture-backed GitHub Pages preview, receipt artifacts may temporarily live under `public/` so the interface can prove the retrieval experience.

This is acceptable only as a personal-app shortcut. The durable 1.5/v2 target is private Supabase Storage, with app-side access gated by the logged-in owner/session. The app should still treat the artifact bundle shape the same way so moving storage does not require redesigning Wallet.

## Wallet rendering contract

Every receipt detail should expose:

- **Info** — extracted facts, QR/code, line items, person bubbles, useful links, and contextual notes.
- **Original** — the full showable original artifact, scrollable when necessary. Cropped QR snippets or summary images are not enough for this mode.

A single order may authorize multiple active companion identities. Keep one original artifact, grant each explicitly bound attendee read access, and apply purchase locks to each attendee's exact event selections. Do not manufacture duplicate receipts merely because an order contains multiple tickets.

For ticketed-play lines, retain the event's Companion code with the exact event binding. A purchaser's Calendar detail should show the code prominently, support one-tap copy, and link to the official Companion app surface. Do not invent an undocumented prefilled-join deep link.

Badge pills, receipt-feed rows, Activity receipt observations, and future monitoring intake cards should all route to the same receipt object instead of each building their own proof display.

## Ingestion checklist

Before marking a receipt as ingested:

- The Info view has the useful facts, not screenshot clutter.
- The Original view opens the full receipt artifact.
- The QR and visible code match the original receipt when a QR/code exists.
- Person bubbles are small universal bubbles, not one-off pills.
- The receipt is represented in one stable object that the UI can reuse.
- No ordinary UI component needs to query Gmail to render the receipt.
