# Surveyor recovery and completion

The daily cloud workflow owns public discovery, staging, delivery, acceptance and recovery state. The scheduled Codex supervisor owns ordinary editorial interpretation and bounded source repairs. Kavi should receive useful findings or a demonstrated unresolved failure, rather than routine internal review requests.

## Operational receipt

Every runtime produces `run-receipt.json`. GitHub's conclusion alone is insufficient:

| Receipt | Next action | Accepted baseline |
| --- | --- | --- |
| `accepted` | Verify complete coverage, checkpoint retention and cache save; report meaningful app discoveries | Advanced |
| `awaiting_editorial` | Supervisor reviews the retained original report, publishes exact decisions and dispatches a normal run | Held |
| `awaiting_repair` | Supervisor resolves exact coverage/parser/source gaps, publishes bounded repair and dispatches normal verification | Held |
| `replay_verified` | Run normal verification; replay never counts as acceptance | Held |
| `failed` | Inspect exact failed phase and logs; repair/retry only the demonstrated cause | Held unless acceptance completed before checkpoint/cache failure; recover its verified checkpoint |

Expected holds finish the workflow successfully while remaining explicitly unfinished in the operational receipt. They preserve their original report, fingerprints, run ID and first-held time in `.surveyor-runtime`. Rechecking cannot reset the 24-hour resolution deadline. An overdue hold fails visibly. No generic `continue-on-error` or blanket notification suppression is used.

Normal runs restage retained editorial work first. If it remains pending they do no fresh discovery. Once resolved, the same run performs a fresh check, exact staging/readback, full coverage verification, watched email delivery, exact-report acceptance and checkpoint retention. Coverage repairs require a fresh check because old missing evidence cannot be invented by replay.

## Durable state

The accepted public baseline still belongs to GitHub Actions. Its cache is backed by a 90-day retained `daily-magiccon-baseline` artifact containing the exact report, closure, digests and only the configured public baseline files. Recovery validates coverage, closure, hashes and file paths before replacing a missing/stale cache. No private Gmail state is included. If both copies are unavailable, fail before discovery rather than manufacture a cold roster/news release.

Pending work and email delivery receipts use a separate runtime cache and artifact retained even on failed runs. They cannot advance the accepted baseline. Workflow concurrency serializes writers. The supervisor must inspect these artifacts for green holds as well as failed runs, and must not dispatch repeated discovery over unresolved retained work.

## Completion and resilience

The coverage gate runs inside acceptance, including zero-change reports. Missing linked pages, unfetched articles, invalid event-bound feeds or unresolved purchase availability cannot reach baseline acceptance. Closure version 2 binds the complete report digest and catch source/intake identities. Unknown catches cannot be renamed noise to close a run.

Public requests have bounded time/size budgets and small retries for transient failures. Parser/identity errors remain exact repair work. Database retries apply only to safe idempotent operations; non-idempotent inserts/RPCs must not be blindly repeated.

Watched reopening email keys bind event/state transition and accepted predecessor generation. A durable `sending` record precedes SMTP; delivered records suppress repeats even if a later acceptance/cache step fails. An explicit SMTP rejection can retry. A lost response remains uncertain and blocks blind resend until the supervisor checks available delivery evidence. SMTP cannot prove exactly-once delivery after an ambiguous response.

## Supervisor

The existing supervisor checks every three hours, while public discovery remains once daily. It reads the latest operational receipt before using freshness or success labels, finishes ordinary retained review/repair in the same turn, and verifies the final normal artifacts plus `Run surveyor to terminal outcome`, `Verify complete coverage and consequences`, `Retain verified accepted baseline`, and `Save monitoring baseline` step outcomes. A successful pending run is not a quiet completion. Routine unchanged state stays quiet.

Private Gmail remains separate under `PRIVATE_MONITORING_COVERAGE.md`: search only when due, preserve actual capability/freshness and unresolved candidates, and never imply that public success published receipts or applied flight changes. Manual private payload publication remains deliberately authorized work.
