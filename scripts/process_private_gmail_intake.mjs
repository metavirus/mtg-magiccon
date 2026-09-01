import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { buildManualReceiptPublicationResult, planPrivateGmailIntake } from './lib/private_gmail_intake.mjs'

const FLIGHT_ITINERARY = 'atlanta-2026-delta-hogfbx'
const CANONICAL_PROJECT_REF = 'pavjsexxbueuzhzgemgy'
const RECEIPT_ARTIFACT_BUCKET = 'private-receipt-artifacts'

const inputPath = process.argv[2]
const raw = inputPath && inputPath !== '-'
  ? await fs.readFile(inputPath, 'utf8')
  : await new Promise((resolve, reject) => {
      let body = ''
      process.stdin.setEncoding('utf8')
      const finish = () => {
        process.stdin.pause()
        resolve(body.trim())
      }
      process.stdin.on('data', chunk => {
        body += chunk
        if (body.includes('\n')) finish()
      })
      process.stdin.on('end', finish)
      process.stdin.on('error', reject)
    })

let message
try {
  message = JSON.parse(raw)
} catch {
  console.log(JSON.stringify({ status: 'not_covered', kind: 'unknown', sourceMessageId: null, reason: 'normalized_input_invalid_json' }))
  process.exit(0)
}

const plan = planPrivateGmailIntake(message)
if (plan.status !== 'covered') {
  console.log(JSON.stringify(plan))
  process.exit(0)
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!supabaseUrl || !secretKey) {
  console.log(JSON.stringify({ status: 'not_covered', kind: plan.kind, sourceMessageId: plan.sourceMessageId, reason: 'canonical_writer_credentials_unavailable' }))
  process.exit(0)
}
if (!supabaseUrl.includes(`${CANONICAL_PROJECT_REF}.supabase.co`) || !secretKey.startsWith('sb_secret_')) {
  console.log(JSON.stringify({ status: 'not_covered', kind: plan.kind, sourceMessageId: plan.sourceMessageId, reason: 'canonical_writer_identity_unverified' }))
  process.exit(0)
}

const client = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
const owner = await client.from('companion_members').select('user_id').eq('person_key', 'kavi').eq('active', true).not('user_id', 'is', null)
if (owner.error) throw owner.error
if (owner.data?.length !== 1) {
  console.log(JSON.stringify({ status: 'not_covered', kind: plan.kind, sourceMessageId: plan.sourceMessageId, reason: 'canonical_owner_binding_ambiguous' }))
  process.exit(0)
}
const ownerId = owner.data[0].user_id

if (plan.kind === 'receipt') {
  if (plan.operation.eventIds.length) {
    const eventBinding = await client.from('ticketed_play_current_availability').select('event_id').in('event_id', plan.operation.eventIds)
    if (eventBinding.error || new Set((eventBinding.data ?? []).map(row => row.event_id)).size !== plan.operation.eventIds.length) {
      console.log(JSON.stringify({ status: 'not_covered', kind: plan.kind, sourceMessageId: plan.sourceMessageId, reason: 'canonical_event_binding_unavailable' }))
      process.exit(0)
    }
  }
  const attendeeBindings = await client.from('companion_members').select('person_key,user_id').in('person_key', plan.operation.attendeePersonKeys).eq('active', true).not('user_id', 'is', null)
  if (attendeeBindings.error) throw attendeeBindings.error
  const attendeeOwners = new Map((attendeeBindings.data ?? []).map(row => [row.person_key, row.user_id]))
  if (attendeeOwners.size !== plan.operation.attendeePersonKeys.length || plan.operation.attendeePersonKeys.some(personKey => !attendeeOwners.get(personKey))) {
    console.log(JSON.stringify({ status: 'not_covered', kind: plan.kind, sourceMessageId: plan.sourceMessageId, reason: 'canonical_attendee_binding_unavailable' }))
    process.exit(0)
  }
  const existingReceipt = await client.from('wallet_receipts').select('id').eq('owner_id', ownerId)
    .eq('source_system', plan.operation.receipt.source_system).eq('source_message_id', plan.operation.receipt.source_message_id).maybeSingle()
  if (existingReceipt.error) throw existingReceipt.error
  const { original_html: _legacyOriginal, ...receiptFacts } = plan.operation.receipt
  const receipt = { owner_id: ownerId, ...receiptFacts }
  const write = existingReceipt.data
    ? await client.from('wallet_receipts').update(receiptFacts).eq('id', existingReceipt.data.id)
      .select('id,source_message_id,attendee_person_key,attendee_person_keys').single()
    : await client.from('wallet_receipts').insert(receipt)
      .select('id,source_message_id,attendee_person_key,attendee_person_keys').single()
  if (write.error) throw write.error
  const safeMessageId = plan.sourceMessageId.replace(/[^a-zA-Z0-9._-]/g, '-')
  const artifactSpecs = [{
    role: plan.operation.artifact.role,
    bytes: Buffer.from(plan.operation.artifact.contents, 'utf8'),
    mimeType: plan.operation.artifact.mimeType,
    filename: `${safeMessageId}.html`,
    displayLabel: 'Archival source HTML from reviewed payload',
    displayOrder: 1,
  }]
  const artifactManifests = []
  const uploadedPaths = []
  const insertedManifestIds = []
  try {
    for (const artifact of artifactSpecs) {
      const artifactPath = `${write.data.id}/${artifact.role}/${artifact.filename}`
      const artifactHash = createHash('sha256').update(artifact.bytes).digest('hex')
      const existingArtifact = await client.from('receipt_artifacts').select('id,object_path,sha256')
        .eq('receipt_id', write.data.id).eq('artifact_role', artifact.role).eq('display_order', artifact.displayOrder).maybeSingle()
      if (existingArtifact.error) throw existingArtifact.error
      if (existingArtifact.data && existingArtifact.data.sha256 !== artifactHash) throw new Error(`Receipt ${artifact.role} changed; retain both sources through explicit review instead of overwriting proof.`)
      let artifactManifest = existingArtifact.data
      if (!artifactManifest) {
        const artifactUpload = await client.storage.from(RECEIPT_ARTIFACT_BUCKET).upload(artifactPath, artifact.bytes, {
          contentType: artifact.mimeType,
          upsert: false,
        })
        if (artifactUpload.error) throw artifactUpload.error
        uploadedPaths.push(artifactPath)
        const insertedArtifact = await client.from('receipt_artifacts').insert({
          receipt_id: write.data.id,
          artifact_role: artifact.role,
          bucket_id: RECEIPT_ARTIFACT_BUCKET,
          object_path: artifactPath,
          mime_type: artifact.mimeType,
          byte_size: artifact.bytes.byteLength,
          sha256: artifactHash,
          display_label: artifact.displayLabel,
          display_order: artifact.displayOrder,
          captured_at: plan.operation.artifact.capturedAt,
        }).select('id,object_path,sha256').single()
        if (insertedArtifact.error) throw insertedArtifact.error
        artifactManifest = insertedArtifact.data
        insertedManifestIds.push(artifactManifest.id)
      }
      if (artifactManifest.object_path !== artifactPath || artifactManifest.sha256 !== artifactHash) throw new Error('Receipt artifact manifest readback failed.')
      const artifactDownload = await client.storage.from(RECEIPT_ARTIFACT_BUCKET).download(artifactManifest.object_path)
      if (artifactDownload.error) throw artifactDownload.error
      const storedHash = createHash('sha256').update(Buffer.from(await artifactDownload.data.arrayBuffer())).digest('hex')
      if (storedHash !== artifactHash) throw new Error('Receipt artifact checksum readback failed.')
      artifactManifests.push(artifactManifest)
    }
    const clearedLegacy = await client.from('wallet_receipts').update({ original_html: null, updated_at: new Date().toISOString() })
      .eq('id', write.data.id).select('id,original_html').single()
    if (clearedLegacy.error || clearedLegacy.data.original_html !== null) throw clearedLegacy.error ?? new Error('Receipt legacy HTML clear readback failed.')
  } catch (error) {
    if (uploadedPaths.length) await client.storage.from(RECEIPT_ARTIFACT_BUCKET).remove(uploadedPaths)
    if (insertedManifestIds.length && existingReceipt.data) await client.from('receipt_artifacts').delete().in('id', insertedManifestIds)
    if (!existingReceipt.data) await client.from('wallet_receipts').delete().eq('id', write.data.id)
    throw error
  }
  const selections = plan.operation.attendeePersonKeys.flatMap(personKey => plan.operation.eventIds.flatMap(eventId => [
    ['state', 'committed'], ['purchased', 'true'], ['purchase_locked', 'true'],
  ].map(([selection_key, selection_value]) => ({
    owner_id: attendeeOwners.get(personKey),
    object_id: `explore-${eventId}`,
    object_kind: 'event',
    selection_key,
    selection_value,
    metadata: { source_system: 'gmail', source_message_id: plan.sourceMessageId, wallet_receipt_id: write.data.id },
    updated_at: new Date().toISOString(),
  }))))
  if (selections.length) {
    const locks = await client.from('user_selections').upsert(selections, { onConflict: 'owner_id,object_id,selection_key' })
    if (locks.error) throw locks.error
  }
  const readback = await client.from('wallet_receipts').select('id,source_message_id,attendee_person_key,attendee_person_keys').eq('owner_id', ownerId).eq('source_system', 'gmail').eq('source_message_id', plan.sourceMessageId).single()
  if (readback.error) throw readback.error
  const attendeeOwnerIds = [...new Set(attendeeOwners.values())]
  const lockReadback = plan.operation.eventIds.length
    ? await client.from('user_selections').select('owner_id,object_id,selection_key,selection_value').in('owner_id', attendeeOwnerIds).in('object_id', plan.operation.eventIds.map(eventId => `explore-${eventId}`)).in('selection_key', ['state', 'purchased', 'purchase_locked'])
    : { data: [], error: null }
  if (lockReadback.error) throw lockReadback.error
  const expectedLockCount = plan.operation.eventIds.length * attendeeOwnerIds.length * 3
  if ((lockReadback.data?.length ?? 0) !== expectedLockCount) throw new Error('Receipt applied without complete purchase-lock readback.')
  const companionCodes = new Map(plan.operation.receipt.line_items
    .filter(line => line.event_id && line.code)
    .map(line => [line.event_id, line.code]))
  for (const [eventId, companionCode] of companionCodes) {
    const publishedCode = await client.from('ticketed_play_public_companion_codes')
      .upsert({ event_id: eventId, companion_code: companionCode, updated_at: new Date().toISOString() }, { onConflict: 'event_id' })
      .select('event_id,companion_code')
      .single()
    if (publishedCode.error || publishedCode.data.companion_code !== companionCode) {
      throw publishedCode.error ?? new Error('Receipt applied without public Companion code readback.')
    }
  }
  console.log(JSON.stringify(buildManualReceiptPublicationResult({
    sourceMessageId: plan.sourceMessageId,
    receiptId: readback.data.id,
    artifactIds: artifactManifests.map(artifact => artifact.id),
    attendeeCount: attendeeOwnerIds.length,
    purchaseLockCount: plan.operation.eventIds.length * attendeeOwnerIds.length,
    publishedCompanionCodeCount: companionCodes.size,
    proofBundleValidation: plan.operation.proofBundleValidation,
  })))
} else {
  const applied = await client.rpc(plan.operation.rpc, plan.operation.args)
  if (applied.error) throw applied.error
  const [legs, evidence, signal] = await Promise.all([
    client.from('trip_flight_legs').select('leg_key,flight_number,departure_airport,arrival_airport,departure_at,arrival_at').eq('itinerary_key', FLIGHT_ITINERARY),
    client.from('trip_flight_source_evidence').select('id,source_ref').eq('source_kind', 'gmail').eq('source_ref', plan.sourceMessageId).maybeSingle(),
    client.from('monitoring_concepts').select('id,attention_state').eq('owner_id', ownerId).eq('concept_key', 'atlanta:trip:flight:hogfbx').maybeSingle(),
  ])
  if (legs.error) throw legs.error
  if (evidence.error) throw evidence.error
  if (signal.error) throw signal.error
  if (!evidence.data) throw new Error('Flight executor returned without retained source-evidence readback.')
  console.log(JSON.stringify({ status: 'applied', kind: 'flight', sourceMessageId: plan.sourceMessageId, executorResult: applied.data, legCount: legs.data?.length ?? 0, evidenceRetained: true, signalPresent: Boolean(signal.data) }))
}
