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

An unrelated coverage gap does not discard successfully observed source evidence. The runtime stages those observed catches and verifies their consequences while retaining `awaiting_repair`. It still cannot send watched reopening emails or advance any accepted baseline until the complete-coverage gate passes.

## Durable state

The accepted public baseline still belongs to GitHub Actions. Its cache is backed by a 90-day retained `daily-magiccon-baseline` artifact containing the exact report, closure, digests and only the configured public baseline files. Recovery validates coverage, closure, hashes and file paths before replacing a missing/stale cache. No private Gmail state is included. If both copies are unavailable, fail before discovery rather than manufacture a cold roster/news release.

Pending work and email delivery receipts use a separate runtime cache and artifact retained even on failed runs. They cannot advance the accepted baseline. Workflow concurrency serializes writers. The supervisor must inspect these artifacts for green holds as well as failed runs, and must not dispatch repeated discovery over unresolved retained work.

## Completion and resilience

Schedule hydration is a separate consequence from source detection and Home publication. `monitoring/reviewed-source-projections.json` binds the six required schedule sources (Black Lotus, Panels, Meet & Greets, Gathering Grounds, the dedicated Family Magic feed and Council's Call) to exact reviewed source content/link hashes and the app-consumed JSON artifact digest. Every normal survey verifies these bindings, including zero-change reports. An empty feed is bound too: later publication must be ingested, not silently accepted. A missing or changed binding is `awaiting_repair`: reconcile all current sessions and operational details, preserve event IDs/personal selections, publish the updated app artifact and review together, then run normal cloud verification. An unchanged accepted source is not evidence that the app already contains its facts. Never clear a mismatch merely by copying hashes without inspecting and reconciling the complete source.

The single pinned October 13 pre-hydration checkpoint may be restored as predecessor evidence only. Its exact report digest, closure and public file digests remain checked; it cannot satisfy the current supervision/acceptance gate. New checkpoints must include complete app-projection coverage.

The current Black Lotus schedule is authoritative for active events. Removed slots must not remain selectable, appear in Plan/Calendar, or generate conflicts merely because someone previously committed. Preserve historical selections as stored history without resurrecting a removed source event or transferring the choice to another session.

The coverage gate runs inside acceptance, including zero-change reports. Missing linked pages, unfetched articles, invalid event-bound feeds or unresolved purchase availability cannot reach baseline acceptance. Closure version 2 binds the complete report digest and catch source/intake identities. Unknown catches cannot be renamed noise to close a run.

Public requests have bounded time/size budgets and small retries for transient failures. Parser/identity errors remain exact repair work. Database retries apply only to safe idempotent operations; non-idempotent inserts/RPCs must not be blindly repeated.

Watched reopening email keys bind event/state transition and accepted predecessor generation. A durable `sending` record precedes SMTP; delivered records suppress repeats even if a later acceptance/cache step fails. An explicit SMTP rejection can retry. A lost response remains uncertain and blocks blind resend until the supervisor checks available delivery evidence. SMTP cannot prove exactly-once delivery after an ambiguous response.

## Supervisor

### Model-service 429 recovery

An OpenAI 429 before the first tool call means supervision did not run. It is not an official-source fetch failure, accepted run, private search or healthy check. The daily GitHub survey remains independent of that model call. This repository cannot intercept or change Codex's pre-turn transport retries.

The existing supervisor now wakes hourly for bounded catch-up; daily public discovery and 24-hour Gmail freshness remain unchanged. Do not burst rediscovery or resend emails to recover a failed model turn. On each successful wake-up, inspect `.monitoring-state/private/supervisor-coverage.local.json` and recent failed scheduled turns. Missing/old completion means work is due, even when a prior chat response sounded healthy. Resolve the actual latest cloud/runtime work and due private lane before quiet completion.

After downloading the exact normal accepted artifacts and saving `gh run view <id> --json databaseId,status,conclusion,jobs` metadata into an ignored file, run `pnpm monitor:verify-supervision <report> <closure>`, then `pnpm monitor:record-supervision <artifact-directory> <run-metadata-json>`. The artifact-only recorder validates current reviewed projections, the exact retained checkpoint, 26-hour freshness, accepted receipt and all four terminal cloud steps. It keeps public and Gmail coverage separate. A due private search does not advance `lastComplete`; missing private capability remains named incomplete work, without discarding verified public coverage. The separate Gmail receipt still requires its canonical writer.

Failed checks retain the previous successful completion. Pre-tool failures leave its timestamp untouched and are therefore still due at the next wake-up. Only verified checks advance it. Notify for meaningful discoveries or unresolved/overdue work, not routine recovered transient throttling. Do not claim the OpenAI 429 itself is fixed: hourly recovery is conditional on the app running and a model request succeeding.

The existing supervisor checks every three hours, while public discovery remains once daily. It reads the latest operational receipt before using freshness or success labels, finishes ordinary retained review/repair in the same turn, and verifies the final normal artifacts plus `Run surveyor to terminal outcome`, `Verify complete coverage and consequences`, `Retain verified accepted baseline`, and `Save monitoring baseline` step outcomes. A successful pending run is not a quiet completion. Routine unchanged state stays quiet.

Private Gmail remains separate under `PRIVATE_MONITORING_COVERAGE.md`: search only when due, preserve actual capability/freshness and unresolved candidates, and never imply that public success published receipts or applied flight changes. Manual private payload publication remains deliberately authorized work.

## Verified activation

Implementation `000617c`, exact-source acceptance guard `150dc9f`, final integration `d318ac6`. All 534 tests passed. Cloud runs `37719204085` and `37719958435` accepted complete zero-change reports; cache-bypass run `37719424774` recovered the verified accepted artifact and runtime receipts without false discoveries. Each verified normal run retained its accepted checkpoint and saved the baseline. Final CI `37719958524` and Pages `37719958495` passed. The earlier red CI exposed a fixture's fabricated raw text hash and was corrected without relaxing the acceptance guard. The active saved supervisor uses this operational contract and a three-hour schedule.
