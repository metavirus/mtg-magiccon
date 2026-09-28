import { createHash } from 'node:crypto'

const RECEIPT_TYPES = new Set(['badge', 'ticketed_play', 'store', 'travel', 'hotel', 'other'])
const MAX_ORIGINAL_IMAGE_BYTES = 10 * 1024 * 1024
const FLIGHT_ITINERARY = 'atlanta-2026-delta-hogfbx'
const EXPECTED_TRAVELERS = ['juan', 'kavi']

const covered = (kind, sourceMessageId, operation) => ({
  status: 'covered',
  kind,
  sourceMessageId,
  operation,
})

const notCovered = (kind, sourceMessageId, reason) => ({
  status: 'not_covered',
  kind: kind ?? 'unknown',
  sourceMessageId: sourceMessageId ?? null,
  reason,
})

const nonblank = value => typeof value === 'string' && value.trim().length > 0
const validTimestamp = value => nonblank(value) && !Number.isNaN(Date.parse(value))
const explicitBoolean = value => typeof value === 'boolean'

function exactTravelerMatch(value) {
  if (!Array.isArray(value)) return false
  return [...new Set(value.map(item => String(item).trim().toLowerCase()))].sort().join(',') === EXPECTED_TRAVELERS.join(',')
}

function baseEnvelope(message) {
  const source = message?.source
  if (source?.system !== 'gmail') return notCovered(message?.kind, source?.messageId, 'source_not_gmail')
  if (!nonblank(source.messageId)) return notCovered(message?.kind, null, 'missing_stable_message_id')
  if (!validTimestamp(source.receivedAt)) return notCovered(message?.kind, source.messageId, 'missing_received_time')
  if (message?.mailboxOwnerPersonKey !== 'kavi') return notCovered(message?.kind, source.messageId, 'mailbox_identity_ambiguous')
  return null
}

function receiptOriginal(source) {
  const attachment = source.originalAttachment
  if (attachment == null) {
    if (!nonblank(source.originalHtml)) return { reason: 'receipt_original_or_currency_missing' }
    return { artifact: { role: 'original', mimeType: 'text/html', contents: source.originalHtml, encoding: 'utf8', capturedAt: source.receivedAt } }
  }
  if (nonblank(source.originalHtml)) return { reason: 'receipt_original_ambiguous' }
  if (!['image/png', 'image/jpeg'].includes(attachment.mimeType)) return { reason: 'receipt_original_image_type_invalid' }
  const filename = attachment.filename
  const extensionMatches = attachment.mimeType === 'image/png' ? /\.png$/i : /\.jpe?g$/i
  if (typeof filename !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,179}$/.test(filename)
    || filename.includes('..') || !extensionMatches.test(filename)) return { reason: 'receipt_original_filename_invalid' }
  const encoded = attachment.bytesBase64
  if (typeof encoded !== 'string' || !encoded.length || encoded.length > Math.ceil(MAX_ORIGINAL_IMAGE_BYTES / 3) * 4) {
    return { reason: 'receipt_original_image_size_invalid' }
  }
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.toString('base64') !== encoded) return { reason: 'receipt_original_base64_invalid' }
  if (!bytes.length || bytes.length > MAX_ORIGINAL_IMAGE_BYTES) return { reason: 'receipt_original_image_size_invalid' }
  const signatureMatches = attachment.mimeType === 'image/png'
    ? bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
      && bytes.subarray(8, 16).equals(Buffer.from('0000000d49484452', 'hex'))
      && bytes.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'))
    : bytes.length >= 5 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9
  if (!signatureMatches) return { reason: 'receipt_original_image_signature_invalid' }
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (attachment.sha256 !== sha256) return { reason: 'receipt_original_checksum_mismatch' }
  return { artifact: { role: 'original', mimeType: attachment.mimeType, contents: encoded, encoding: 'base64', filename, sha256, capturedAt: source.receivedAt } }
}

function receiptPlan(message) {
  const receipt = message.receipt
  const source = message.source
  if (!receipt || !RECEIPT_TYPES.has(receipt.receiptType)) return notCovered('receipt', source.messageId, 'receipt_type_unmapped')
  const hasExplicitAttendeeSet = Array.isArray(receipt.attendeePersonKeys)
  const attendeePersonKeys = hasExplicitAttendeeSet
    ? [...new Set(receipt.attendeePersonKeys.map(value => String(value).trim().toLowerCase()).filter(Boolean))]
    : nonblank(receipt.attendeePersonKey) ? [receipt.attendeePersonKey.trim().toLowerCase()] : []
  const explicitCompanionReceipt = ['ticketed_play', 'hotel'].includes(receipt.receiptType) && hasExplicitAttendeeSet
  if (!attendeePersonKeys.length || (!attendeePersonKeys.includes(message.mailboxOwnerPersonKey) && !explicitCompanionReceipt)) {
    return notCovered('receipt', source.messageId, 'attendee_identity_ambiguous')
  }
  if (![receipt.title, receipt.vendor].every(nonblank) || !validTimestamp(receipt.receiptDate)) {
    return notCovered('receipt', source.messageId, 'receipt_binding_incomplete')
  }
  if (typeof receipt.amount !== 'number' || !Number.isFinite(receipt.amount) || receipt.amount < 0) {
    return notCovered('receipt', source.messageId, 'receipt_amount_invalid')
  }
  if (!nonblank(receipt.currency)) {
    return notCovered('receipt', source.messageId, 'receipt_original_or_currency_missing')
  }
  const original = receiptOriginal(source)
  if (original.reason) return notCovered('receipt', source.messageId, original.reason)
  if (receipt.confidence != null && !['verified', 'high', 'needs_review'].includes(receipt.confidence)) {
    return notCovered('receipt', source.messageId, 'receipt_confidence_invalid')
  }
  if (!Array.isArray(receipt.lineItems)) return notCovered('receipt', source.messageId, 'receipt_line_items_missing')

  let proofBundleValidation = null
  if (receipt.proofBundleValidation != null) {
    const validation = receipt.proofBundleValidation
    if (validation.status !== 'passed'
      || !validTimestamp(validation.validatedAt)
      || !nonblank(validation.validatedBy)
      || validation.bundleComplete !== true
      || validation.readabilityPassed !== true
      || !['passed', 'not_applicable'].includes(validation.operationalQrStatus)) {
      return notCovered('receipt', source.messageId, 'proof_bundle_validation_invalid')
    }
    proofBundleValidation = {
      status: 'passed',
      validatedAt: validation.validatedAt,
      validatedBy: validation.validatedBy.trim(),
      bundleComplete: true,
      readabilityPassed: true,
      operationalQrStatus: validation.operationalQrStatus,
    }
  }

  const eventIds = []
  if (receipt.receiptType === 'ticketed_play') {
    if (!receipt.lineItems.length) return notCovered('receipt', source.messageId, 'ticketed_receipt_has_no_lines')
    for (const item of receipt.lineItems) {
      if (!nonblank(item?.eventId) || !/^ticketed-\d+$/.test(item.eventId)) {
        return notCovered('receipt', source.messageId, 'ticketed_event_binding_ambiguous')
      }
      const lineAttendees = Array.isArray(item.attendeePersonKeys)
        ? [...new Set(item.attendeePersonKeys.map(value => String(value).trim().toLowerCase()).filter(Boolean))]
        : attendeePersonKeys
      if (!lineAttendees.length || lineAttendees.some(personKey => !attendeePersonKeys.includes(personKey))) {
        return notCovered('receipt', source.messageId, 'ticketed_line_attendee_binding_ambiguous')
      }
      if (item.quantity != null && (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity !== lineAttendees.length)) {
        return notCovered('receipt', source.messageId, 'ticketed_line_quantity_mismatch')
      }
      eventIds.push(item.eventId)
    }
  }

  return covered('receipt', source.messageId, {
    receipt: {
      source_system: 'gmail',
      source_message_id: source.messageId,
      source_thread_id: nonblank(source.threadId) ? source.threadId : null,
      receipt_type: receipt.receiptType,
      title: receipt.title.trim(),
      vendor: receipt.vendor.trim(),
      receipt_date: receipt.receiptDate,
      amount: receipt.amount,
      currency: receipt.currency.trim().toUpperCase(),
      attendee_person_key: attendeePersonKeys[0],
      attendee_person_keys: attendeePersonKeys,
      line_items: receipt.lineItems.map(item => ({
        event_id: item.eventId,
        title: item.title,
        price: item.price,
        quantity: item.quantity ?? (Array.isArray(item.attendeePersonKeys) ? item.attendeePersonKeys.length : attendeePersonKeys.length),
        code: nonblank(item.code) ? item.code.trim().toUpperCase() : undefined,
        attendee_person_keys: Array.isArray(item.attendeePersonKeys) ? [...new Set(item.attendeePersonKeys.map(value => String(value).trim().toLowerCase()).filter(Boolean))] : attendeePersonKeys,
      })),
      original_html: null,
      confidence: receipt.confidence ?? 'needs_review',
    },
    artifact: original.artifact,
    eventIds: [...new Set(eventIds)].sort(),
    attendeePersonKeys,
    proofBundleValidation,
  })
}

function flightPlan(message) {
  const flight = message.flight
  const source = message.source
  const evidence = flight?.matchEvidence
  if (!flight || flight.itineraryKey !== FLIGHT_ITINERARY) return notCovered('flight', source.messageId, 'itinerary_binding_ambiguous')
  if (typeof flight.confidence !== 'number' || flight.confidence < 0.9) return notCovered('flight', source.messageId, 'confidence_below_threshold')
  if (!evidence || evidence.confirmation_code !== 'HOGFBX' || !/delta/i.test(evidence.carrier ?? '') || !exactTravelerMatch(evidence.travelers)) {
    return notCovered('flight', source.messageId, 'flight_identity_ambiguous')
  }
  for (const key of ['changed_legs_complete', 'cancellation_or_rebooking', 'airline_assigned_replacement']) {
    if (!explicitBoolean(evidence[key])) return notCovered('flight', source.messageId, `flight_guard_${key}_missing`)
  }
  if (!evidence.changed_legs_complete) return notCovered('flight', source.messageId, 'changed_legs_incomplete')
  if (evidence.cancellation_or_rebooking && !evidence.airline_assigned_replacement) return notCovered('flight', source.messageId, 'choice_or_cancellation_requires_review')
  if (evidence.airline_assigned_replacement) {
    const requiredTrue = ['same_itinerary', 'same_travelers', 'same_carrier', 'same_dates', 'same_routes']
    if (evidence.user_action_required !== false || evidence.unresolved_choice !== false || requiredTrue.some(key => evidence[key] !== true)) {
      return notCovered('flight', source.messageId, 'replacement_stability_ambiguous')
    }
  }
  const legs = flight.update?.legs
  if (!Array.isArray(legs) || !legs.length || legs.some(leg =>
    ![leg?.leg_key, leg?.flight_number, leg?.departure_airport, leg?.arrival_airport].every(nonblank)
    || !validTimestamp(leg.departure_at)
    || !validTimestamp(leg.arrival_at))) {
    return notCovered('flight', source.messageId, 'changed_leg_binding_incomplete')
  }
  return covered('flight', source.messageId, {
    rpc: 'apply_confident_flight_schedule_update',
    args: {
      p_itinerary_key: flight.itineraryKey,
      p_source_kind: 'gmail',
      p_source_ref: source.messageId,
      p_source_received_at: source.receivedAt,
      p_source_subject: nonblank(source.subject) ? source.subject : 'Delta itinerary update',
      p_confidence: flight.confidence,
      p_match_evidence: evidence,
      p_update: flight.update,
    },
  })
}

export function planPrivateGmailIntake(message) {
  const envelopeFailure = baseEnvelope(message)
  if (envelopeFailure) return envelopeFailure
  if (message.kind === 'receipt') return receiptPlan(message)
  if (message.kind === 'flight') return flightPlan(message)
  return notCovered(message.kind, message.source.messageId, 'intake_kind_unmapped')
}

export function summarizePrivateIntake(result) {
  if (result.status !== 'covered') return result
  return {
    status: result.status,
    kind: result.kind,
    sourceMessageId: result.sourceMessageId,
    consequence: result.kind === 'receipt'
      ? { walletReceipt: true, attendeeCount: result.operation.attendeePersonKeys.length, purchaseLockCount: result.operation.eventIds.length * result.operation.attendeePersonKeys.length }
      : { flightExecutor: result.operation.rpc },
  }
}

export function buildManualReceiptPublicationResult({
  sourceMessageId,
  receiptId,
  artifactIds,
  attendeeCount,
  purchaseLockCount,
  publishedCompanionCodeCount,
  proofBundleValidation = null,
}) {
  const presentation = proofBundleValidation
    ? { status: 'declared_validated', validation: proofBundleValidation }
    : { status: 'not_certified', reason: 'proof_bundle_readability_and_operational_qr_validation_not_declared' }
  return {
    status: 'payload_published',
    kind: 'receipt',
    lane: 'manual_normalized_receipt_payload_recovery',
    sourceMessageId,
    receiptId,
    artifactIds,
    attendeeCount,
    purchaseLockCount,
    publishedCompanionCodeCount,
    presentation,
    completion: {
      status: 'verification_required',
      reason: 'database_and_storage_readback_does_not_certify_receipt_ingestion_complete',
      requiredChecks: [
        ...(proofBundleValidation ? [] : ['proof_bundle_readability_and_operational_qr']),
        'authenticated_shared_download',
        'wallet_info_and_original_rendering',
      ],
    },
  }
}
