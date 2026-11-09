# Prize Wall automatic updates

Kavi authorized unattended official Prize Wall ingestion and publication on November 9, 2026, including listing images. This is a bounded exception to the old catalog operator-review requirement for the source-backed Prize Wall preview. It does not authorize synthetic inventory, stock assertions, personal balance changes, or automatic promotion into canonical catalog tables.

The existing daily surveyor invokes `prize-wall-sync.yml` as an independent job at its existing daily schedule. The workflow also supports manual cloud dispatch. No running computer, Codex turn, new secret, or Supabase write is required. An unrelated surveyor editorial/schedule hold cannot prevent this job from running; its receipt does not clear the surveyor's separate held baseline.

## Data path

1. Fetch the exact official Atlanta Prize Wall page with bounded HTTPS redirects and response sizes.
2. Parse clear named Prize Tix rows, optional categories, operational details and official catalog links. Keep starting costs distinct from exact costs.
3. Capture listing images and AEM responsive images in the inventory section. Exclude unrelated hero/old-event illustrations. Retain original source bytes and hashes in the GitHub run artifact before publication.
4. Associate explicit row images with their products. OCR image-only listings in a disposable, time-limited English Tesseract worker. Accept readable rows, including a Prize Tix column heading or a name wrapped above its price. Do not guess ambiguous numbers or conflicting amounts. Keep the original listing link available.
5. Keep clear changes even when another item or image fails. Retain omitted prior prices on incomplete extraction, visibly labeled Last listed. Fatal source/event mismatch or no usable content leaves the previous published snapshot untouched.
6. Compare semantic data and resource hashes. Unchanged checks do not rewrite the snapshot or redeploy. Changed data updates only `public/prize-wall/current.json`, passes the full release gate, commits without force, explicitly dispatches the existing Pages workflow, and verifies exact public JSON bytes.

The app bundles the snapshot, retaining the approved Prize Wall table and shared Prize Tix controls. Photos appear alongside explicitly associated products; catalog/board links open the organizer's original. Full source provenance remains in data and receipts rather than product copy.

PDF and external HTML catalogs are captured and linked automatically, but their rows are not currently extracted. Image OCR is best-effort, not a promise to correctly read every future board. Per-item warnings do not block other valid updates. Source artifacts are retained for 90 days; committed snapshots retain the exact source hash and row evidence.

## Recovery and verification

`receipt.json` distinguishes changed, unchanged and blocked extraction. `publication.json` distinguishes publicly verified data from a failed or pending deployment. The next run checks public bytes even on unchanged input, so it retries a prior failed dispatch/deploy without needing another source change. A concurrent push is never overwritten; the next run starts from main. GitHub failure notifications remain enabled. Item-level warnings are retained in the run, without emailing on routine unchanged content.

Budgets: 2 MiB source page, 12 MiB per resource, at most 60 resources/64 MiB aggregate before further resources are deferred, and at most six 90-second image OCR attempts per run. No model API calls or database transfer is introduced. A later unknown host is not fetched automatically.

Run `pnpm test scripts/lib/prize_wall_ingestion.test.ts scripts/lib/prize_wall_sync.test.ts` for source/partial-update/image/redirect/budget regressions. The November 9 real OCR smoke extracted both exact prices from a synthetic board, exercising the installed OCR engine rather than a mocked recognizer. The independent PM checks the actual current phone/desktop surface and synthetic future image/link state before release.
