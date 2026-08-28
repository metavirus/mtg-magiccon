import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const CANONICAL_PROJECT_REF = 'pavjsexxbueuzhzgemgy'
const BUCKET = 'private-receipt-artifacts'
const ALLOWED_ROLES = new Set(['original', 'qr', 'transfer'])
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf', 'text/html'])
const MAX_BYTES = 10 * 1024 * 1024
const isMissing = error => Boolean(error) && (error.status === 404 || error.statusCode === '404' || /not found/i.test(error.message ?? ''))

const manifestPath = process.argv.find(argument => !argument.startsWith('--') && argument !== process.argv[0] && argument !== process.argv[1])
const apply = process.argv.includes('--apply')
if (!manifestPath) throw new Error('Usage: node scripts/migrate_private_receipt_artifacts.mjs <ignored-manifest.json> [--apply]')

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
if (manifest.projectRef !== CANONICAL_PROJECT_REF || manifest.bucket !== BUCKET || !Array.isArray(manifest.artifacts) || !manifest.artifacts.length) {
  throw new Error('Manifest must target the canonical project and private receipt bucket with at least one artifact.')
}
const receiptPatches = Array.isArray(manifest.receiptPatches) ? manifest.receiptPatches : []
for (const patch of receiptPatches) {
  if (!/^[0-9a-f-]{36}$/i.test(patch.receiptId ?? '') || !Number.isInteger(patch.lineIndex) || patch.lineIndex < 0) throw new Error('Every private receipt patch requires an exact receiptId and non-negative lineIndex.')
  if (typeof patch.orderCode !== 'string' || !patch.orderCode.trim()) throw new Error('Every private receipt patch requires a nonblank orderCode.')
  let orderUrl
  try { orderUrl = new URL(patch.orderUrl) } catch { throw new Error('Every private receipt patch requires a valid orderUrl.') }
  if (orderUrl.protocol !== 'https:' || orderUrl.hostname !== 'conventions.leapevent.tech' || !orderUrl.pathname.startsWith('/c/')) throw new Error('Private orderUrl must be an approved Leap HTTPS order path.')
}

const prepared = []
for (const artifact of manifest.artifacts) {
  if (!/^[0-9a-f-]{36}$/i.test(artifact.receiptId ?? '')) throw new Error('Every artifact requires an exact receiptId from canonical readback.')
  if (!ALLOWED_ROLES.has(artifact.role)) throw new Error(`Unsupported artifact role: ${artifact.role}`)
  if (!ALLOWED_MIME_TYPES.has(artifact.mimeType)) throw new Error(`Unsupported MIME type: ${artifact.mimeType}`)
  if (!Number.isInteger(artifact.displayOrder) || artifact.displayOrder < 1 || !String(artifact.displayLabel ?? '').trim()) throw new Error('Every artifact requires a positive displayOrder and displayLabel.')
  if (Number.isNaN(Date.parse(artifact.capturedAt))) throw new Error('Every artifact requires capturedAt.')
  const bytes = await fs.readFile(artifact.localPath)
  if (!bytes.length || bytes.length > MAX_BYTES) throw new Error(`Artifact size is outside the 1-${MAX_BYTES} byte boundary: ${artifact.localPath}`)
  const filename = path.basename(artifact.localPath).replace(/[^a-zA-Z0-9._-]/g, '-')
  const objectPath = `${artifact.receiptId}/${artifact.role}/${filename}`
  prepared.push({ ...artifact, bytes, byteSize: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), objectPath })
}

if (!apply) {
  console.log(JSON.stringify({ status: 'validated', apply: false, bucket: BUCKET, artifacts: prepared.map(({ bytes: _bytes, ...artifact }) => artifact), receiptPatchIds: receiptPatches.map(patch => patch.receiptId) }, null, 2))
  process.exit(0)
}

const supabaseUrl = process.env.SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!supabaseUrl?.includes(`${CANONICAL_PROJECT_REF}.supabase.co`) || !secretKey?.startsWith('sb_secret_')) {
  throw new Error('Apply requires canonical SUPABASE_URL and SUPABASE_SECRET_KEY.')
}

const client = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
const bucketRead = await client.storage.getBucket(BUCKET)
const bucketMissing = isMissing(bucketRead.error)
if (bucketRead.error && !bucketMissing) throw bucketRead.error
if (!bucketRead.data) {
  const created = await client.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES, allowedMimeTypes: [...ALLOWED_MIME_TYPES] })
  if (created.error) throw created.error
} else if (bucketRead.data.public) {
  throw new Error(`${BUCKET} exists but is public; refusing to upload.`)
}

for (const artifact of prepared) {
  const receipt = await client.from('wallet_receipts').select('id').eq('id', artifact.receiptId).single()
  if (receipt.error) throw new Error(`Receipt binding failed for ${artifact.receiptId}: ${receipt.error.message}`)
  const row = {
    receipt_id: artifact.receiptId,
    artifact_role: artifact.role,
    bucket_id: BUCKET,
    object_path: artifact.objectPath,
    mime_type: artifact.mimeType,
    byte_size: artifact.byteSize,
    sha256: artifact.sha256,
    display_label: artifact.displayLabel,
    display_order: artifact.displayOrder,
    captured_at: artifact.capturedAt,
  }
  const existingManifest = await client.from('receipt_artifacts').select('id,receipt_id,object_path,mime_type,byte_size,sha256')
    .eq('bucket_id', BUCKET).eq('object_path', artifact.objectPath).maybeSingle()
  if (existingManifest.error) throw existingManifest.error
  if (existingManifest.data && (
    existingManifest.data.receipt_id !== artifact.receiptId
    || existingManifest.data.mime_type !== artifact.mimeType
    || Number(existingManifest.data.byte_size) !== artifact.byteSize
    || existingManifest.data.sha256 !== artifact.sha256
  )) throw new Error(`Existing manifest conflicts with ${artifact.objectPath}`)

  let uploadedNewObject = false
  let objectReadback = await client.storage.from(BUCKET).download(artifact.objectPath)
  const objectMissing = isMissing(objectReadback.error)
  if (objectReadback.error && !objectMissing) throw objectReadback.error
  if (!objectReadback.data) {
    const upload = await client.storage.from(BUCKET).upload(artifact.objectPath, artifact.bytes, { contentType: artifact.mimeType, upsert: false })
    if (upload.error) throw upload.error
    uploadedNewObject = true
    objectReadback = await client.storage.from(BUCKET).download(artifact.objectPath)
    if (objectReadback.error) throw objectReadback.error
  }
  const storedHash = createHash('sha256').update(Buffer.from(await objectReadback.data.arrayBuffer())).digest('hex')
  if (storedHash !== artifact.sha256) {
    if (uploadedNewObject) await client.storage.from(BUCKET).remove([artifact.objectPath])
    throw new Error(`Storage checksum conflicts with ${artifact.objectPath}`)
  }

  let manifest = existingManifest.data
  if (!manifest) {
    const inserted = await client.from('receipt_artifacts').insert(row).select('id,receipt_id,object_path,mime_type,byte_size,sha256').single()
    if (inserted.error) {
      if (uploadedNewObject) await client.storage.from(BUCKET).remove([artifact.objectPath])
      throw inserted.error
    }
    manifest = inserted.data
  }
  if (manifest.object_path !== artifact.objectPath || manifest.sha256 !== artifact.sha256) throw new Error(`Manifest readback failed for ${artifact.objectPath}`)
}

for (const patch of receiptPatches) {
  const receipt = await client.from('wallet_receipts').select('id,line_items').eq('id', patch.receiptId).single()
  if (receipt.error) throw receipt.error
  if (!Array.isArray(receipt.data.line_items) || !receipt.data.line_items[patch.lineIndex]) throw new Error(`Private receipt patch line is unavailable for ${patch.receiptId}.`)
  const lineItems = receipt.data.line_items.map((line, index) => index === patch.lineIndex
    ? { ...line, order_code: patch.orderCode.trim(), order_url: patch.orderUrl }
    : line)
  const updated = await client.from('wallet_receipts').update({ line_items: lineItems, updated_at: new Date().toISOString() })
    .eq('id', patch.receiptId).select('id,line_items').single()
  if (updated.error) throw updated.error
  const proofLine = updated.data.line_items?.[patch.lineIndex]
  if (proofLine?.order_code !== patch.orderCode.trim() || proofLine?.order_url !== patch.orderUrl) throw new Error(`Private receipt patch readback failed for ${patch.receiptId}.`)
}

console.log(JSON.stringify({ status: 'applied', bucket: BUCKET, artifactCount: prepared.length, receiptPatchCount: receiptPatches.length }))
