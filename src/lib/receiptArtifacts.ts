import { supabase } from './supabase'

export const RECEIPT_ARTIFACT_BUCKET = 'private-receipt-artifacts'
export const RECEIPT_ARTIFACT_CACHE = 'magiccon-private-receipt-artifacts-v1'

export type ReceiptArtifactRole = 'original' | 'qr' | 'transfer'

export type ReceiptArtifact = {
  id: string
  artifact_role: ReceiptArtifactRole
  bucket_id: string
  object_path: string
  mime_type: string
  display_label: string
  display_order: number
}

export function receiptArtifactCacheKey(ownerId: string, artifactId: string) {
  return new URL(`./__offline_wallet/${encodeURIComponent(ownerId)}/${encodeURIComponent(artifactId)}`, window.location.href).toString()
}

async function cachedReceiptArtifact(ownerId: string, artifact: ReceiptArtifact) {
  if (!('caches' in globalThis)) return null
  const cache = await caches.open(RECEIPT_ARTIFACT_CACHE)
  const response = await cache.match(receiptArtifactCacheKey(ownerId, artifact.id))
  return response?.blob() ?? null
}

async function cacheReceiptArtifact(ownerId: string, artifact: ReceiptArtifact, data: Blob) {
  if (!('caches' in globalThis)) return
  const cache = await caches.open(RECEIPT_ARTIFACT_CACHE)
  await cache.put(receiptArtifactCacheKey(ownerId, artifact.id), new Response(data, {
    headers: { 'Content-Type': artifact.mime_type, 'Cache-Control': 'private, max-age=31536000' },
  }))
}

async function receiptArtifactBlob(artifact: ReceiptArtifact, ownerId?: string) {
  if (!supabase) throw new Error('Private proof requires an authenticated Supabase session.')
  if (artifact.bucket_id !== RECEIPT_ARTIFACT_BUCKET) throw new Error('Receipt artifact bucket is not approved.')
  if (ownerId && typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = await cachedReceiptArtifact(ownerId, artifact)
    if (cached) return cached
  }
  const { data, error } = await supabase.storage.from(artifact.bucket_id).download(artifact.object_path)
  if (error) {
    const cached = ownerId ? await cachedReceiptArtifact(ownerId, artifact) : null
    if (cached) return cached
    throw error
  }
  if (ownerId) await cacheReceiptArtifact(ownerId, artifact, data)
  return data
}

export async function primeReceiptArtifactCache(artifact: ReceiptArtifact, ownerId: string) {
  await receiptArtifactBlob(artifact, ownerId)
}

export async function downloadReceiptArtifact(artifact: ReceiptArtifact, ownerId?: string) {
  const data = await receiptArtifactBlob(artifact, ownerId)
  if (artifact.mime_type !== 'text/html') return URL.createObjectURL(data)
  const source = await data.text()
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'">`
  const safeSource = /<head(?:\s[^>]*)?>/i.test(source)
    ? source.replace(/<head(\s[^>]*)?>/i, match => `${match}${policy}`)
    : `${policy}${source}`
  return URL.createObjectURL(new Blob([safeSource], { type: 'text/html' }))
}
