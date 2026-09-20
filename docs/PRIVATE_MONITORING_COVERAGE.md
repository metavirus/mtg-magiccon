# Private Gmail search coverage

Updated: 2026-09-19

The daily Codex heartbeat attempts one read-only Gmail check when its last complete search is older than 24 hours. Extra heartbeat turns reuse a fresh complete receipt. Gmail is a separate capability from the successful public cloud surveyor. A missing connector produces `not_checked`, not mailbox freshness. Never modify Gmail, dispatch the manual receipt publisher, or imply that search proves receipt ingestion or flight application.

The private operational receipt lives at `.monitoring-state/private/gmail-coverage.local.json` (ignored). It contains the last attempt, last complete search with all query IDs/windows/counts, capability status, and unresolved candidate reasons. This file is local operational metadata, not canonical personal data, a public-source baseline, or a cloud receipt artifact. Never commit it, copy it into a cloud workflow cache, or use it as a replacement for private source evidence. If absent, report the checkpoint as unknown and search all three canonical queries from August 1, 2026 through the current check; earlier mailbox history is outside that bootstrap claim.

Use every query in `monitoring/gmail-watch-queries.json`. For subsequent checks, start two calendar days before `lastSuccessfulSearchThrough` to overlap Gmail's date boundary. Record the actual lower bound and a common checked-through timestamp fixed before the searches began. Finish pagination for each query and inspect relevant candidates. A zero-result query counts only when pagination is complete. Any failed/truncated query leaves the attempt `partial` and does not move the successful checkpoint.

Write a small attempt JSON into an ignored private path, then run:

```powershell
node scripts/record_private_monitoring_coverage.mjs .monitoring-state/private/gmail-attempt.local.json
```

Attempt fields:

- `checkedAt`: ISO UTC time at completion; `status`: `checked`, `partial`, or `not_checked`; `capability`: `available` or `unavailable`; `reason`: required when incomplete.
- `queries`: one record per completed or partial query, with canonical `id`, ISO `after`, ISO `checkedThrough`, integer `matchCount`, and boolean `paginationComplete`. `checked` requires all three queries with complete pagination. `not_checked` has no query records.
- `unresolvedCandidates`: new or updated `{key, reason}` records, where `key` is SHA-256 of the stable private message reference. Use bounded reason codes such as `manual_payload_review_required`, `source_identity_ambiguous`, `canonical_writer_credentials_unavailable`, or `presentation_verification_required`; keep actual private evidence in its separate private lane. Do not put subjects, addresses, reservation numbers, bodies, or QR data in the receipt.
- `resolvedCandidateKeys`: only the exact keys whose consequence or deliberate no-action disposition was verified this turn. Existing unresolved keys survive quiet searches and unavailable connectors. A fresh search checkpoint never closes a candidate's intake debt.

The writer validates windows and query completeness, preserves the previous success on partial/skipped checks, and atomically replaces the receipt. Public workflow status and private search status must remain separate in any report. Persist every attempted or skipped due check; stay quiet when unchanged and non-actionable. Notify for a new meaningful candidate, new/lapsed private capability, or a concrete required action, without publishing private contents.

## Exact heartbeat prompt addition

Append this paragraph to the existing cloud-only supervision prompt; preserve the cloud freshness, closure, dispatch, notification and private-publication restrictions:

> Track private Gmail coverage separately using docs/PRIVATE_MONITORING_COVERAGE.md and the ignored .monitoring-state/private/gmail-coverage.local.json receipt. Attempt all three canonical gmail-watch-queries once daily when the last complete private search is older than 24 hours, or reuse its fresh receipt. Use the documented overlapping search window, finish pagination, and record checked/partial/not_checked plus capability, query IDs, checked-through times, and unresolved candidate reasons through scripts/record_private_monitoring_coverage.mjs. Missing capability never advances private freshness; retain previous success and unresolved candidates. Public cloud success does not mean Gmail was checked. Do not modify Gmail or dispatch the manual receipt payload publisher. Search success is not receipt publication, flight application, shared download, or Wallet verification. Keep routine unchanged status quiet; notify only for a meaningful change, failure, or required action.
