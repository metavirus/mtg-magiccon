import { supabase } from './supabase'

export const RECEIPT_ARTIFACT_BUCKET = 'private-receipt-artifacts'

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

export async function downloadReceiptArtifact(artifact: ReceiptArtifact) {
  if (!supabase) throw new Error('Private proof requires an authenticated Supabase session.')
  if (artifact.bucket_id !== RECEIPT_ARTIFACT_BUCKET) throw new Error('Receipt artifact bucket is not approved.')
  const { data, error } = await supabase.storage.from(artifact.bucket_id).download(artifact.object_path)
  if (error) throw error
  if (artifact.mime_type !== 'text/html') return URL.createObjectURL(data)
  const source = await data.text()
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'">`
  const safeSource = /<head(?:\s[^>]*)?>/i.test(source)
    ? source.replace(/<head(\s[^>]*)?>/i, match => `${match}${policy}`)
    : `${policy}${source}`
  return URL.createObjectURL(new Blob([safeSource], { type: 'text/html' }))
}
