# Receipt Artifact Ingestion

Receipts should be ingested once, then rendered from durable app artifacts. The UI should not keep returning to Gmail just because a Wallet card, badge proof, QR popover, or receipt detail needs to change.

## Rule

When a MagicCon-relevant receipt is found, capture both:

1. **Original proof artifact** — one full, showable receipt render that preserves the email or source page as a person would expect to see it. For Gmail sources, this means the Gmail print context as well as the message body: account, subject, sender, recipient, timestamp, and the complete receipt. The storage format may be a full-height image or PDF; the user experience is the simple Ctrl-P view, not a format-specific workflow.
2. **Extracted receipt facts** — the small structured payload the app uses for fast display, filtering, links, QR/code surfaces, person bubbles, and notes.

After ingestion, normal interface work reads the ingested artifact and facts. Gmail, Leap, Square, Delta, hotel sites, or other sources are only revisited when ingesting a new receipt, refreshing a stale receipt, or resolving a conflict.

The canonical upload transport is the JWT-protected `receipt-proof-ingest` Edge Function. It accepts one self-contained proof from the signed-in Kavi operator, validates receipt binding, type, size, and SHA-256, uploads immutably, inserts one manifest row, and downloads the stored object for checksum readback. Agent ingestion must call this authenticated lane directly; it must never drive a visible desktop file chooser.

The tracked GitHub Actions workflow is not Gmail automation and is not the normal proof-upload transport. `Manual receipt payload publisher (recovery)` is a deliberately dispatched recovery lane for one already-reviewed, normalized, encrypted receipt payload. It does not discover Gmail messages, parse a mailbox, or run on a schedule. Its archival HTML write and database readbacks prove only that the supplied payload was published. Its result must remain `payload_published` with `completion.status: verification_required`; neither a green workflow nor successful database writes certify that receipt ingestion is complete.

Presentation is separately fail-closed. Without a declared passing proof-bundle review, the result must report `presentation.status: not_certified`. A passing declaration requires a review timestamp and reviewer plus explicit confirmation that the bundle is complete, the receipt is readable, and every operational QR either passed validation or is not applicable. Only that exact declaration may produce `presentation.status: declared_validated`, and even then shared authenticated download and Wallet rendering remain outstanding completion checks. Historical receipt assets must not be assumed readable or operational merely because they exist in Storage.

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

## Private Storage contract

All real receipt, badge, QR, transfer, travel, and hotel proof belongs in the single private Supabase Storage bucket `private-receipt-artifacts`. No proof artifact belongs under `public/`, in the PWA precache, in a durable public URL, or in fixture preview data.

`public.receipt_artifacts` is the attendee-aware manifest. Each immutable row binds one Storage object to one `wallet_receipts` row and records its role (`original`, `qr`, or `transfer`), private bucket/path, MIME type, byte size, SHA-256, display label/order, and capture time. Object paths use `<receipt-id>/<role>/<filename>`. A multi-page original uses one row per page and increasing display order; one order still remains one receipt.

The manifest has forced RLS. An authenticated viewer may read a manifest/object only when they own the receipt or their user id is bound to an active `companion_members` identity explicitly named in that receipt's `attendee_person_keys`. Anonymous users receive no table or object access. Authenticated browser clients receive `SELECT` only on the manifest and the corresponding `storage.objects` download policy; they receive no upload, update, or delete policy. Trusted intake using the canonical secret/service lane owns writes.

The app downloads authorized objects with Supabase Storage `download()` and renders short-lived blob URLs, revoking them when the view closes. It does not call `getPublicUrl()` or keep signed URLs in durable state. After authenticated device hydration, every authorized receipt artifact is retained in the private device pack for read-only offline use. Preview or unauthenticated mode retains the stable `Info` / `Original` / `Transfer` tabs but shows an honest sign-in/unmigrated message instead of substituting public proof.

Gmail-backed proof must be self-contained before intake so Gmail's provenance chrome and externally hosted receipt assets survive offline. The default is one full-height Gmail proof image: it is easy to generate, scrolls naturally in the accepted Original modal, and has no browser PDF dependency. Preserve retrieved source HTML as an archival fallback when useful, but do not present it once a primary Gmail proof exists. Do not split a new email into page images or extract separate QR files unless an actual product need requires it.

`wallet_receipts.original_html` is a legacy transition field only. New intake writes the original source HTML as a private Storage artifact and stores `null` in that field. Purge legacy HTML only after every affected receipt has manifest, object, checksum, owner, and attendee readback.

## Wallet rendering contract

Every receipt detail should expose:

- **Info** — extracted facts, QR/code, line items, person bubbles, useful links, and contextual notes.
- **Original** — the full showable original artifact, scrollable when necessary. Cropped QR snippets or summary images are not enough for this mode.
- **Transfer** — the full Gmail-print transfer confirmation when a later email changes the assigned attendee. A forwarded message retains both the forwarding Gmail header and the embedded original-message header.

A single order may authorize multiple active companion identities. Keep one original artifact, grant each explicitly bound attendee read access, and apply purchase locks to each attendee's exact event selections. Do not manufacture duplicate receipts merely because an order contains multiple tickets.

For ticketed-play lines, retain the event's Companion code with the exact event binding. The receipt is evidence for discovering the code, but the code itself is public event data: normalize it into `ticketed_play_public_companion_codes`, where every viewer can read it without receipt or purchaser authorization. Calendar detail shows the public event code prominently, supports one-tap copy, and links to the official Companion app surface. The receipt original, QR, attendee identity, and purchase evidence remain private. Do not invent an undocumented prefilled-join deep link.

Badge pills, receipt-feed rows, Activity receipt observations, and future monitoring intake cards should all route to the same receipt object instead of each building their own proof display.

## Ingestion checklist

Before marking a receipt as ingested:

- The Info view has the useful facts, not screenshot clutter.
- The Original view opens the full receipt artifact.
- Gmail originals visibly retain account, subject, sender, recipient, and timestamp context; a raw body-only HTML render does not pass.
- The proof visibly includes the QR and code when the email contains them; extracted structured code fields match the source.
- Person bubbles are small universal bubbles, not one-off pills.
- The receipt is represented in one stable object that the UI can reuse.
- No ordinary UI component needs to query Gmail to render the receipt.
- The canonical project is `pavjsexxbueuzhzgemgy`, the bucket is private, and the object path starts with the exact receipt id.
- SHA-256, byte size, MIME type, capture time, label, and display order match the uploaded bytes.
- Every active signed-in companion can download shared receipt proof; anonymous visitors cannot list or download it.
- No normal authenticated client can insert, update, delete, or overwrite manifest rows or Storage objects.
- The app uses authenticated `download()`/blob URLs, its authenticated device pack includes every authorized artifact role, and the public build contains no receipt proof filename or public PWA precache entry.
- A manual normalized-payload publication has been followed by the required showable-original, authenticated shared-download, and Wallet Info/Original rendering checks. The publisher's archival HTML artifact and database readbacks alone do not satisfy this checklist.

## Legacy migration state

The 2026-08-28 migration is complete in canonical project `pavjsexxbueuzhzgemgy`: 15 proof objects have checksum-matched manifest rows, the private bucket has a non-repeatable completion marker, and zero receipts retain inline `original_html`. Active signed-in companions share receipt evidence; anonymous visitors remain blocked. The one-shot workflow and historical-recovery scripts were removed after verified completion.

The tracked public proof files and their PWA precache entries are removed from the current app. They previously existed in public Git history, so this migration prevents current serving and future bundle exposure but does not retroactively make those historical bytes secret. Rewriting repository history or rotating event credentials is a separate, explicitly authorized security operation.

Keep `pnpm artifacts:migrate-private -- <ignored-manifest-path>` and `pnpm artifacts:migrate-legacy-html` only as guarded recovery tools until a later reviewed migration drops the legacy column. Every use still requires a dry run, canonical server credentials, immutable upload, downloaded checksum readback, and owner/attendee visibility proof.

Keep `pnpm receipts:publish-normalized-payload -- <ignored-payload-path>` only as the manual normalized-payload recovery publisher used by the tracked workflow. The legacy `pnpm intake:private-gmail` command remains an alias for operator compatibility, not a claim that the repository reads Gmail or completes receipt ingestion automatically. A publisher result is intentionally incomplete until the three verification checks named above pass.
