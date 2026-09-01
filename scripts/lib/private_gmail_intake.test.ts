import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildManualReceiptPublicationResult, planPrivateGmailIntake, summarizePrivateIntake } from './private_gmail_intake.mjs'

const source = {
  system: 'gmail', messageId: 'gmail-123', threadId: 'thread-1', receivedAt: '2026-08-25T18:00:00Z',
  subject: 'Receipt', originalHtml: '<html><body>private proof 4111<img src=https://conventions.leapevent.tech/mobile/get_qr/1fadddfd-c8eb-4164-bbf9-ddea3295a593></body></html>',
}

describe('private Gmail intake', () => {
  it('does not manufacture verified confidence when a normalized receipt omits it', () => {
    const planned = planPrivateGmailIntake({
      kind: 'receipt',
      mailboxOwnerPersonKey: 'kavi',
      source,
      receipt: { receiptType: 'other', title: 'Order', vendor: 'Vendor', receiptDate: source.receivedAt, amount: 1, currency: 'USD', attendeePersonKey: 'kavi', lineItems: [] },
    })
    expect(planned).toMatchObject({ status: 'covered', operation: { receipt: { confidence: 'needs_review' } } })
  })

  it('keeps the tracked workflow manual, receipt-only, and incomplete until product verification', () => {
    const workflow = readFileSync(join(process.cwd(), '.github/workflows/private-gmail-intake.yml'), 'utf8')
    const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf8')
    const monitoringContract = readFileSync(join(process.cwd(), 'docs/MONITORING_HYDRATION_CONTRACT.md'), 'utf8')
    const monitoringDesign = readFileSync(join(process.cwd(), 'docs/MVP_MONITORING_AGENT_DESIGN.md'), 'utf8')
    expect(workflow).toContain('name: Manual receipt payload publisher (recovery)')
    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).not.toMatch(/\n\s*(schedule|push|pull_request):/)
    expect(workflow).toContain("throw 'Manual receipt publisher refuses non-receipt payloads.'")
    expect(workflow).toContain('pnpm --silent receipts:publish-normalized-payload')
    expect(workflow).toContain("$result.status -ne 'payload_published'")
    expect(workflow).toContain("$result.completion.status -ne 'verification_required'")
    expect(workflow).toContain('It does not certify that the receipt has a showable original')
    expect(packageJson).toContain('"receipts:publish-normalized-payload"')
    expect(monitoringContract).toContain('It is not a heartbeat, monitor, mailbox watcher, or automatic ingestion job.')
    expect(monitoringDesign).toContain('Do not dispatch the manual receipt publisher from the daily run.')
    expect(monitoringDesign).not.toContain('Treat only `applied` as closure')
  })

  it('reports manual receipt payload publication without claiming ingestion completion', () => {
    const result = buildManualReceiptPublicationResult({
      sourceMessageId: 'gmail-123', receiptId: 'receipt-1', artifactIds: ['artifact-1'],
      attendeeCount: 2, purchaseLockCount: 3, publishedCompanionCodeCount: 1,
    })
    expect(result).toMatchObject({
      status: 'payload_published',
      kind: 'receipt',
      lane: 'manual_normalized_receipt_payload_recovery',
      completion: {
        status: 'verification_required',
        reason: 'database_and_storage_readback_does_not_certify_receipt_ingestion_complete',
      },
      presentation: {
        status: 'not_certified',
        reason: 'proof_bundle_readability_and_operational_qr_validation_not_declared',
      },
    })
    expect(result.completion.requiredChecks).toEqual([
      'proof_bundle_readability_and_operational_qr',
      'authenticated_shared_download',
      'wallet_info_and_original_rendering',
    ])
    expect(JSON.stringify(result)).not.toContain('"status":"complete"')
    expect(JSON.stringify(result)).not.toContain('"status":"applied"')
  })

  it('accepts only a complete declared presentation validation and still requires product checks', () => {
    const validation = {
      status: 'passed', validatedAt: '2026-08-31T22:00:00Z', validatedBy: 'manual visual audit',
      bundleComplete: true, readabilityPassed: true, operationalQrStatus: 'passed',
    }
    const planned = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source,
      receipt: { receiptType: 'other', title: 'Order', vendor: 'Vendor', receiptDate: source.receivedAt, amount: 1, currency: 'USD', attendeePersonKey: 'kavi', lineItems: [], proofBundleValidation: validation },
    })
    expect(planned).toMatchObject({ status: 'covered', operation: { proofBundleValidation: validation } })
    if (planned.status !== 'covered') return
    const result = buildManualReceiptPublicationResult({
      sourceMessageId: planned.sourceMessageId, receiptId: 'receipt-1', artifactIds: ['artifact-1'],
      attendeeCount: 1, purchaseLockCount: 0, publishedCompanionCodeCount: 0,
      proofBundleValidation: planned.operation.proofBundleValidation,
    })
    expect(result.presentation).toEqual({ status: 'declared_validated', validation })
    expect(result.completion).toMatchObject({ status: 'verification_required' })
    expect(result.completion.requiredChecks).toEqual(['authenticated_shared_download', 'wallet_info_and_original_rendering'])

    const invalid = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source,
      receipt: { receiptType: 'other', title: 'Order', vendor: 'Vendor', receiptDate: source.receivedAt, amount: 1, currency: 'USD', attendeePersonKey: 'kavi', lineItems: [], proofBundleValidation: { ...validation, readabilityPassed: false } },
    })
    expect(invalid).toMatchObject({ status: 'not_covered', reason: 'proof_bundle_validation_invalid' })
  })

  it('keeps receipt writes on the server-secret Storage lane with no direct SQL fallback', () => {
    const executor = readFileSync(join(process.cwd(), 'scripts/process_private_gmail_intake.mjs'), 'utf8')
    expect(executor).toContain('SUPABASE_SECRET_KEY')
    expect(executor).toContain("reason: 'canonical_writer_credentials_unavailable'")
    expect(executor).not.toContain('SUPABASE_DB_URL')
    expect(executor).not.toContain('spawnSync')
    expect(executor).toContain(".update(receiptFacts).eq('id', existingReceipt.data.id)")
    expect(executor).not.toContain('upsert(receipt')
    expect(executor.indexOf('.download(artifactManifest.object_path)')).toBeLessThan(executor.indexOf("update({ original_html: null"))
  })

  it('deduplicates receipts by stable source identity and binds exact ticketed events', () => {
    const result = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source,
      receipt: { receiptType: 'ticketed_play', title: 'MagicCon order', vendor: 'Leap', receiptDate: '2026-08-25T18:00:00Z', amount: 80, currency: 'usd', attendeePersonKey: 'kavi', lineItems: [{ title: 'Sealed', eventId: 'ticketed-944015' }] },
    })
    expect(result.status).toBe('covered')
    if (result.status !== 'covered') return
    expect(result.sourceMessageId).toBe('gmail-123')
    expect(result.operation.eventIds).toEqual(['ticketed-944015'])
    expect(result.operation.receipt.source_message_id).toBe('gmail-123')
    expect(result.operation.receipt.original_html).toBeNull()
    expect(result.operation.artifact).toMatchObject({ role: 'original', mimeType: 'text/html', contents: source.originalHtml })
    expect(result.operation.artifact).not.toHaveProperty('qrSourceUrl')
  })

  it('fails closed for ambiguous receipt attendee or event binding', () => {
    const ambiguousPerson = planPrivateGmailIntake({ kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source, receipt: { receiptType: 'badge', attendeePersonKey: 'juan' } })
    expect(ambiguousPerson).toMatchObject({ status: 'not_covered', reason: 'attendee_identity_ambiguous' })
    const ambiguousEvent = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source,
      receipt: { receiptType: 'ticketed_play', title: 'Order', vendor: 'Leap', receiptDate: source.receivedAt, amount: 1, currency: 'USD', attendeePersonKey: 'kavi', lineItems: [{ title: 'Unknown event' }] },
    })
    expect(ambiguousEvent).toMatchObject({ status: 'not_covered', reason: 'ticketed_event_binding_ambiguous' })
  })

  it('keeps a ticketed receipt covered without manufacturing a separate QR artifact', () => {
    const result = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source: { ...source, originalHtml: '<html>no qr</html>' },
      receipt: { receiptType: 'ticketed_play', title: 'Order', vendor: 'Leap', receiptDate: source.receivedAt, amount: 80, currency: 'USD', attendeePersonKeys: ['kavi'], lineItems: [{ title: 'League', eventId: 'ticketed-944091', attendeePersonKeys: ['kavi'] }] },
    })
    expect(result).toMatchObject({ status: 'covered', operation: { eventIds: ['ticketed-944091'] } })
  })

  it('binds one shared order to multiple known attendees and preserves per-line assignments', () => {
    const result = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source,
      receipt: { receiptType: 'ticketed_play', title: 'Shared order', vendor: 'Leap', receiptDate: source.receivedAt, amount: 200, currency: 'USD', attendeePersonKeys: ['kavi', 'juan'], lineItems: [{ title: 'Sealed', eventId: 'ticketed-944015', price: 100, quantity: 2, code: 'ABC1234', attendeePersonKeys: ['kavi', 'juan'] }] },
    })
    expect(result).toMatchObject({ status: 'covered', operation: { attendeePersonKeys: ['kavi', 'juan'], receipt: { attendee_person_keys: ['kavi', 'juan'] } } })
    expect(summarizePrivateIntake(result)).toMatchObject({ consequence: { attendeeCount: 2, purchaseLockCount: 2 } })
  })

  it('covers an explicitly assigned companion-only ticketed-play order', () => {
    const result = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source,
      receipt: { receiptType: 'ticketed_play', title: 'Juan · Ticketed Play order', vendor: 'Leap', receiptDate: source.receivedAt, amount: 200, currency: 'USD', attendeePersonKeys: ['juan'], lineItems: [{ title: 'Commander and Cocktails', eventId: 'ticketed-944111', price: 200, quantity: 1, code: '563MXW5', attendeePersonKeys: ['juan'] }] },
    })
    expect(result).toMatchObject({ status: 'covered', operation: { attendeePersonKeys: ['juan'], receipt: { attendee_person_keys: ['juan'] } } })
    expect(summarizePrivateIntake(result)).toMatchObject({ consequence: { attendeeCount: 1, purchaseLockCount: 1 } })
  })

  it('fails closed when a shared line names an attendee outside the receipt or its quantity disagrees', () => {
    const base = { receiptType: 'ticketed_play', title: 'Shared order', vendor: 'Leap', receiptDate: source.receivedAt, amount: 200, currency: 'USD', attendeePersonKeys: ['kavi', 'juan'] }
    expect(planPrivateGmailIntake({ kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source, receipt: { ...base, lineItems: [{ title: 'Sealed', eventId: 'ticketed-944015', attendeePersonKeys: ['kavi', 'chris'] }] } })).toMatchObject({ status: 'not_covered', reason: 'ticketed_line_attendee_binding_ambiguous' })
    expect(planPrivateGmailIntake({ kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source, receipt: { ...base, lineItems: [{ title: 'Sealed', eventId: 'ticketed-944015', quantity: 1 }] } })).toMatchObject({ status: 'not_covered', reason: 'ticketed_line_quantity_mismatch' })
  })

  it('does not expose private original HTML in summaries', () => {
    const result = planPrivateGmailIntake({
      kind: 'receipt', mailboxOwnerPersonKey: 'kavi', source,
      receipt: { receiptType: 'other', title: 'Order', vendor: 'Vendor', receiptDate: source.receivedAt, amount: 1, currency: 'USD', attendeePersonKey: 'kavi', lineItems: [] },
    })
    expect(JSON.stringify(summarizePrivateIntake(result))).not.toContain('private proof')
    expect(JSON.stringify(summarizePrivateIntake(result))).not.toContain('4111')
  })

  it('covers a complete routine flight change and rejects identity ambiguity', () => {
    const flight = {
      kind: 'flight', mailboxOwnerPersonKey: 'kavi', source,
      flight: {
        itineraryKey: 'atlanta-2026-delta-hogfbx', confidence: 0.97,
        matchEvidence: { confirmation_code: 'HOGFBX', carrier: 'Delta Air Lines', travelers: ['kavi', 'juan'], changed_legs_complete: true, cancellation_or_rebooking: false, airline_assigned_replacement: false },
        update: { legs: [{ leg_key: 'outbound', flight_number: 'DL 329', departure_airport: 'SNA', arrival_airport: 'ATL', departure_at: '2026-11-11T22:00:00Z', arrival_at: '2026-11-12T02:16:00Z' }] },
      },
    }
    expect(planPrivateGmailIntake(flight)).toMatchObject({ status: 'covered', kind: 'flight' })
    expect(planPrivateGmailIntake({ ...flight, flight: { ...flight.flight, matchEvidence: { ...flight.flight.matchEvidence, travelers: ['kavi'] } } })).toMatchObject({ status: 'not_covered', reason: 'flight_identity_ambiguous' })
  })

  it('fails closed for an unstable airline replacement', () => {
    const result = planPrivateGmailIntake({
      kind: 'flight', mailboxOwnerPersonKey: 'kavi', source,
      flight: {
        itineraryKey: 'atlanta-2026-delta-hogfbx', confidence: 0.99,
        matchEvidence: { confirmation_code: 'HOGFBX', carrier: 'Delta', travelers: ['kavi', 'juan'], changed_legs_complete: true, cancellation_or_rebooking: true, airline_assigned_replacement: true, user_action_required: false, unresolved_choice: false, same_itinerary: true, same_travelers: true, same_carrier: true, same_dates: false, same_routes: true },
        update: { legs: [{ leg_key: 'outbound', flight_number: 'DL 1', departure_airport: 'SNA', arrival_airport: 'ATL', departure_at: '2026-11-12T22:00:00Z', arrival_at: '2026-11-13T02:00:00Z' }] },
      },
    })
    expect(result).toMatchObject({ status: 'not_covered', reason: 'replacement_stability_ambiguous' })
  })
})
