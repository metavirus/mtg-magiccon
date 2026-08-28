import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { expectedLegacyObjectPaths, LEGACY_BADGE_RECEIPTS, RECEIPT_MIGRATION_MARKER } from './lib/private_receipt_migration_contract.mjs'

const PROJECT_REF = 'pavjsexxbueuzhzgemgy'
const BUCKET = 'private-receipt-artifacts'
const isMissing = error => Boolean(error) && (error.status === 404 || error.statusCode === '404' || /not found/i.test(error.message ?? ''))
const mode = process.argv[2]
if (!['--preflight', '--complete'].includes(mode)) throw new Error('Use --preflight or --complete.')
const supabaseUrl = process.env.SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!supabaseUrl?.includes(`${PROJECT_REF}.supabase.co`) || !secretKey?.startsWith('sb_secret_')) throw new Error('Canonical server credentials are required.')
const client = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

const marker = await client.storage.from(BUCKET).download(RECEIPT_MIGRATION_MARKER)
const markerMissing = isMissing(marker.error)
if (!marker.error) throw new Error('Private receipt migration is already marked complete; refusing rerun.')
if (!markerMissing) throw marker.error
if (mode === '--preflight') {
  console.log(JSON.stringify({ status: 'ready', completed: false }))
  process.exit(0)
}

const legacyHtml = await client.from('wallet_receipts').select('id', { count: 'exact', head: true }).not('original_html', 'is', null)
if (legacyHtml.error) throw legacyHtml.error
if (legacyHtml.count !== 0) throw new Error(`Legacy HTML remains on ${legacyHtml.count} receipt rows.`)

const receiptIds = [LEGACY_BADGE_RECEIPTS.blackLotus.receiptId, LEGACY_BADGE_RECEIPTS.juanPremium.receiptId]
const receipts = await client.from('wallet_receipts').select('id,line_items').in('id', receiptIds)
if (receipts.error || receipts.data?.length !== 2) throw receipts.error ?? new Error('Deterministic badge receipts are incomplete.')
for (const receipt of receipts.data) {
  const proof = receipt.line_items?.find(line => line.order_code || line.order_url)
  if (!proof?.order_code || !proof?.order_url) throw new Error(`Private order proof fields are incomplete for receipt ${receipt.id}.`)
}

const manifests = await client.from('receipt_artifacts').select('id,receipt_id,bucket_id,object_path,byte_size,sha256')
if (manifests.error) throw manifests.error
const expectedPaths = new Set(expectedLegacyObjectPaths())
if ((manifests.data ?? []).filter(row => expectedPaths.has(row.object_path)).length !== expectedPaths.size) throw new Error('Historical public artifact manifest set is incomplete.')
if ((manifests.data ?? []).filter(row => row.object_path.endsWith('/original/legacy-original.html')).length !== 6) throw new Error('Expected six legacy database HTML artifacts.')

for (const row of manifests.data ?? []) {
  if (row.bucket_id !== BUCKET) throw new Error(`Unexpected receipt artifact bucket for ${row.id}.`)
  const object = await client.storage.from(BUCKET).download(row.object_path)
  if (object.error) throw object.error
  const bytes = Buffer.from(await object.data.arrayBuffer())
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== row.sha256 || bytes.byteLength !== Number(row.byte_size)) throw new Error(`Artifact checksum readback failed for ${row.id}.`)
}

const markerBody = Buffer.from(JSON.stringify({ migration: 'private-receipts-cd84772', completedAt: new Date().toISOString(), artifactCount: manifests.data?.length ?? 0, legacyHtmlRemaining: 0 }))
const marked = await client.storage.from(BUCKET).upload(RECEIPT_MIGRATION_MARKER, markerBody, { contentType: 'application/json', upsert: false })
if (marked.error) throw marked.error
console.log(JSON.stringify({ status: 'complete', artifactCount: manifests.data?.length ?? 0, legacyHtmlRemaining: 0, marker: RECEIPT_MIGRATION_MARKER }))
