import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const PROJECT_REF = 'pavjsexxbueuzhzgemgy'
const BUCKET = 'private-receipt-artifacts'
const apply = process.argv.includes('--apply')
const supabaseUrl = process.env.SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!supabaseUrl?.includes(`${PROJECT_REF}.supabase.co`) || !secretKey?.startsWith('sb_secret_')) {
  throw new Error('Canonical SUPABASE_URL and SUPABASE_SECRET_KEY are required.')
}

const client = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
const legacy = await client.from('wallet_receipts').select('id,receipt_date,original_html').not('original_html', 'is', null)
if (legacy.error) throw legacy.error
const planned = []

for (const receipt of legacy.data ?? []) {
  const bytes = Buffer.from(receipt.original_html, 'utf8')
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const objectPath = `${receipt.id}/original/legacy-original.html`
  planned.push({ receiptId: receipt.id, objectPath, byteSize: bytes.byteLength, sha256 })
  if (!apply) continue

  const existing = await client.from('receipt_artifacts').select('id,object_path,sha256')
    .eq('receipt_id', receipt.id).eq('artifact_role', 'original').eq('display_order', 1).maybeSingle()
  if (existing.error) throw existing.error
  let manifest = existing.data
  if (manifest && manifest.sha256 !== sha256) throw new Error(`Legacy original conflicts with existing immutable proof for receipt ${receipt.id}.`)
  if (!manifest) {
    const upload = await client.storage.from(BUCKET).upload(objectPath, bytes, { contentType: 'text/html', upsert: false })
    if (upload.error) throw upload.error
    const inserted = await client.from('receipt_artifacts').insert({
      receipt_id: receipt.id, artifact_role: 'original', bucket_id: BUCKET, object_path: objectPath,
      mime_type: 'text/html', byte_size: bytes.byteLength, sha256, display_label: 'Original source email',
      display_order: 1, captured_at: receipt.receipt_date,
    }).select('id,object_path,sha256').single()
    if (inserted.error) {
      await client.storage.from(BUCKET).remove([objectPath])
      throw inserted.error
    }
    manifest = inserted.data
  }

  const downloaded = await client.storage.from(BUCKET).download(manifest.object_path)
  if (downloaded.error) throw downloaded.error
  const storedHash = createHash('sha256').update(Buffer.from(await downloaded.data.arrayBuffer())).digest('hex')
  if (manifest.sha256 !== sha256 || storedHash !== sha256) throw new Error(`Legacy artifact readback failed for receipt ${receipt.id}.`)
  const cleared = await client.from('wallet_receipts').update({ original_html: null, updated_at: new Date().toISOString() })
    .eq('id', receipt.id).not('original_html', 'is', null).select('id,original_html').single()
  if (cleared.error || cleared.data.original_html !== null) throw cleared.error ?? new Error(`Legacy HTML clear readback failed for receipt ${receipt.id}.`)
}

console.log(JSON.stringify({ status: apply ? 'applied' : 'validated', receiptCount: planned.length, receipts: planned }))
