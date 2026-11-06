import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const download = vi.fn()
const NativeURL = globalThis.URL

vi.mock('./supabase', () => ({
  supabase: { storage: { from: vi.fn(() => ({ download })) } },
}))

describe('private receipt artifacts', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:private-proof') })
  })

  it('downloads through the authenticated private bucket and returns a blob URL', async () => {
    download.mockResolvedValue({ data: new Blob(['proof']), error: null })
    const { downloadReceiptArtifact, RECEIPT_ARTIFACT_BUCKET } = await import('./receiptArtifacts')
    const result = await downloadReceiptArtifact({
      id: 'artifact-id', artifact_role: 'original', bucket_id: RECEIPT_ARTIFACT_BUCKET,
      object_path: 'receipt-id/original/page-1.png', mime_type: 'image/png',
      display_label: 'Original page 1', display_order: 1,
    })
    expect(download).toHaveBeenCalledWith('receipt-id/original/page-1.png')
    expect(result).toBe('blob:private-proof')
  })

  it('rejects an unapproved bucket before making a request', async () => {
    const { downloadReceiptArtifact } = await import('./receiptArtifacts')
    await expect(downloadReceiptArtifact({
      id: 'artifact-id', artifact_role: 'qr', bucket_id: 'public-proof', object_path: 'qr.png',
      mime_type: 'image/png', display_label: 'QR', display_order: 1,
    })).rejects.toThrow('not approved')
    expect(download).not.toHaveBeenCalled()
  })

  it('reopens an owner-scoped proof from the device cache while offline', async () => {
    const createObjectURL = vi.fn(() => 'blob:offline-proof')
    vi.stubGlobal('URL', Object.assign(NativeURL, { createObjectURL }))
    vi.stubGlobal('navigator', { onLine: false })
    const match = vi.fn().mockResolvedValue(new Response(new Blob(['cached proof'], { type: 'image/png' })))
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match }) })
    const { downloadReceiptArtifact, RECEIPT_ARTIFACT_BUCKET } = await import('./receiptArtifacts')
    const result = await downloadReceiptArtifact({
      id: 'artifact-id', artifact_role: 'qr', bucket_id: RECEIPT_ARTIFACT_BUCKET,
      object_path: 'receipt-id/qr.png', mime_type: 'image/png', display_label: 'Order QR', display_order: 1,
    }, 'owner-1')
    expect(result).toBe('blob:offline-proof')
    expect(match).toHaveBeenCalledWith(expect.stringContaining('/__offline_wallet/owner-1/artifact-id'))
    expect(download).not.toHaveBeenCalled()
  })

  it('audits every expected private artifact instead of a selected role subset', async () => {
    vi.stubGlobal('URL', NativeURL)
    const match = vi.fn()
      .mockResolvedValueOnce(new Response('original'))
      .mockResolvedValueOnce(new Response('qr'))
      .mockResolvedValueOnce(undefined)
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match }) })
    const { auditReceiptArtifactCache, RECEIPT_ARTIFACT_BUCKET } = await import('./receiptArtifacts')
    const artifacts = [
      { id: 'original', artifact_role: 'original' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'original.html', mime_type: 'text/html', display_label: 'Original', display_order: 1 },
      { id: 'qr', artifact_role: 'qr' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'qr.png', mime_type: 'image/png', display_label: 'QR', display_order: 2 },
      { id: 'transfer', artifact_role: 'transfer' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'transfer.png', mime_type: 'image/png', display_label: 'Transfer', display_order: 3 },
    ]
    await expect(auditReceiptArtifactCache(artifacts, 'owner-1')).resolves.toEqual({ expected: 3, cached: 2 })
    expect(match).toHaveBeenCalledTimes(3)
  })

  it('opens saved proof immediately despite a stalled online download and warms without downloading again', async () => {
    vi.stubGlobal('URL', Object.assign(NativeURL, { createObjectURL: vi.fn(() => 'blob:saved-proof') }))
    vi.stubGlobal('navigator', { onLine: true })
    download.mockImplementation(() => new Promise(() => {}))
    const { downloadReceiptArtifact, primeReceiptArtifactCache, receiptArtifactCacheKey, RECEIPT_ARTIFACT_BUCKET } = await import('./receiptArtifacts')
    const artifact = { id: 'saved', artifact_role: 'original' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'original.png', mime_type: 'image/png', display_label: 'Original', display_order: 1 }
    const match = vi.fn(async (key: string) => key === receiptArtifactCacheKey('owner-1', artifact.id) ? new Response('saved original') : undefined)
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match }) })
    await expect(downloadReceiptArtifact(artifact, 'owner-1')).resolves.toBe('blob:saved-proof')
    await primeReceiptArtifactCache(artifact, 'owner-1')
    await primeReceiptArtifactCache(artifact, 'owner-1')
    expect(download).not.toHaveBeenCalled()
    download.mockResolvedValue({ data: new Blob(['other owner proof']), error: null })
    await downloadReceiptArtifact(artifact, 'owner-2')
    expect(download).toHaveBeenCalledOnce()
  })

  it('displays a successful download after quota failure while the warmer and audit report incomplete storage', async () => {
    vi.stubGlobal('URL', Object.assign(NativeURL, { createObjectURL: vi.fn(() => 'blob:online-proof') }))
    vi.stubGlobal('navigator', { onLine: true })
    download.mockResolvedValue({ data: new Blob(['online proof']), error: null })
    const put = vi.fn().mockRejectedValue(new DOMException('Full', 'QuotaExceededError'))
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue({ match: vi.fn().mockResolvedValue(undefined), put }) })
    const { downloadReceiptArtifact, primeReceiptArtifactCache, auditReceiptArtifactCache, RECEIPT_ARTIFACT_BUCKET } = await import('./receiptArtifacts')
    const artifact = { id: 'uncached', artifact_role: 'original' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'original.png', mime_type: 'image/png', display_label: 'Original', display_order: 1 }
    await expect(downloadReceiptArtifact(artifact, 'owner-1')).resolves.toBe('blob:online-proof')
    expect(put).toHaveBeenCalledOnce()
    await expect(primeReceiptArtifactCache(artifact, 'owner-1')).rejects.toThrow('could not be saved')
    await expect(auditReceiptArtifactCache([artifact], 'owner-1')).resolves.toEqual({ expected: 1, cached: 0 })
    vi.stubGlobal('caches', { open: vi.fn().mockRejectedValue(new DOMException('Denied', 'SecurityError')) })
    await expect(downloadReceiptArtifact(artifact, 'owner-1')).resolves.toBe('blob:online-proof')
    await expect(auditReceiptArtifactCache([artifact], 'owner-1')).resolves.toEqual({ expected: 1, cached: 0 })
  })

  it('blocks remote resources when rendering preserved source HTML', async () => {
    let renderedBlob: Blob | undefined
    vi.stubGlobal('URL', { createObjectURL: vi.fn((blob: Blob) => { renderedBlob = blob; return 'blob:safe-html' }) })
    download.mockResolvedValue({ data: { text: async () => '<html><head></head><body><img src="https://tracker.example/pixel"></body></html>' }, error: null })
    const { downloadReceiptArtifact, RECEIPT_ARTIFACT_BUCKET } = await import('./receiptArtifacts')
    await downloadReceiptArtifact({
      id: 'artifact-id', artifact_role: 'original', bucket_id: RECEIPT_ARTIFACT_BUCKET,
      object_path: 'receipt-id/original/email.html', mime_type: 'text/html',
      display_label: 'Original email', display_order: 1,
    })
    const renderedText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(renderedBlob!)
    })
    expect(renderedText).toContain("default-src 'none'")
  })

  it('prefers one primary Gmail proof over archival HTML and legacy page slices', async () => {
    const { selectReceiptArtifactsForDisplay, RECEIPT_ARTIFACT_BUCKET } = await import('./receiptArtifacts')
    const artifacts = [
      { id: 'raw', artifact_role: 'original' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'receipt/original/email.html', mime_type: 'text/html', display_label: 'Archived source HTML', display_order: 1 },
      { id: 'page-1', artifact_role: 'original' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'receipt/original/page-1.png', mime_type: 'image/png', display_label: 'Gmail print page 1', display_order: 2 },
      { id: 'proof', artifact_role: 'original' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'receipt/original/gmail-proof.png', mime_type: 'image/png', display_label: 'Gmail proof', display_order: 3 },
      { id: 'qr', artifact_role: 'qr' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'receipt/qr/order.png', mime_type: 'image/png', display_label: 'Order QR', display_order: 1 },
    ]
    expect(selectReceiptArtifactsForDisplay(artifacts, ['original']).map(artifact => artifact.id)).toEqual(['proof'])
  })

  it('prefers a readable Gmail page set over a microscopic full-height proof', async () => {
    const { selectReceiptArtifactsForDisplay, RECEIPT_ARTIFACT_BUCKET } = await import('./receiptArtifacts')
    const artifacts = [
      { id: 'proof', artifact_role: 'transfer' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'receipt/transfer/gmail-proof.png', mime_type: 'image/png', display_label: 'Gmail proof - transfer confirmation', display_order: 1 },
      { id: 'page-1', artifact_role: 'transfer' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'receipt/transfer/page-1.png', mime_type: 'image/png', display_label: 'Transfer email page 1 of 2', display_order: 2 },
      { id: 'page-2', artifact_role: 'transfer' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'receipt/transfer/page-2.png', mime_type: 'image/png', display_label: 'Transfer email page 2 of 2', display_order: 3 },
    ]
    expect(selectReceiptArtifactsForDisplay(artifacts, ['transfer']).map(artifact => artifact.id)).toEqual(['page-1', 'page-2'])
  })

  it('keeps archival HTML as a last-resort display when no page images exist', async () => {
    const { selectReceiptArtifactsForDisplay, RECEIPT_ARTIFACT_BUCKET } = await import('./receiptArtifacts')
    const raw = { id: 'raw', artifact_role: 'transfer' as const, bucket_id: RECEIPT_ARTIFACT_BUCKET, object_path: 'receipt/transfer/email.html', mime_type: 'text/html', display_label: 'Archived source HTML', display_order: 1 }
    expect(selectReceiptArtifactsForDisplay([raw], ['transfer'])).toEqual([raw])
  })

  it('keeps Gmail provenance fields mandatory in the single-proof renderer', () => {
    const renderer = readFileSync(join(process.cwd(), 'scripts/render_gmail_print_artifact.mjs'), 'utf8')
    expect(renderer).toContain("['account', 'date', 'from', 'subject', 'to', 'html']")
    expect(renderer).toContain('Gmail - ${escapeHtml(source.subject)}')
    expect(renderer).toContain('To: ${escapeHtml(source.to)}')
    expect(renderer).toContain('${escapeHtml(source.from)}')
    expect(renderer).toContain('${escapeHtml(source.date)}')
    expect(renderer).toContain('fullPage: true')
    expect(renderer).not.toContain('pdftoppm')
    expect(renderer).not.toContain('qrPaths')
  })

  it('keeps proof ingestion authenticated, operator-bound, immutable, and checksum-verified', () => {
    const intake = readFileSync(join(process.cwd(), 'supabase/functions/receipt-proof-ingest/index.ts'), 'utf8')
    expect(intake).toContain('admin.auth.getUser(token)')
    expect(intake).toContain('.eq("person_key", "kavi")')
    expect(intake).toContain('upsert: false')
    expect(intake).toContain('artifact_checksum_invalid')
    expect(intake).toContain('artifact_readback_mismatch')
    expect(intake).not.toContain('getPublicUrl')
  })

  it('has no public URL or embedded-original fallback in the Wallet implementation', () => {
    const app = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')
    const publicText = readdirSync(join(process.cwd(), 'public'))
      .filter(name => /\.(?:html|json|svg|txt)$/i.test(name))
      .map(name => readFileSync(join(process.cwd(), 'public', name), 'utf8'))
      .join('\n')
    const trackedBundleSources = `${app}\n${publicText}\n${readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')}`
    expect(app).not.toContain('getPublicUrl(')
    expect(app).not.toContain('original_html')
    expect(app).not.toContain('mobile/get_qr')
    expect(app).not.toMatch(/\.\/black-lotus-order-|\.\/juan-premium-order-original/)
    expect(app).not.toMatch(/const\s+order(?:Code|Url)\s*=/)
    expect(app).not.toMatch(/order_(?:code|url)\s*:\s*['"`]/)
    expect(trackedBundleSources).not.toContain('conventions.leapevent.tech/c/')
    expect(app).toContain('line?.order_code')
    expect(app).toContain('line?.order_url')
  })

  it('hydrates the complete proof pack after authentication without opening Wallet', () => {
    const app = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')
    expect(app.includes('refreshed.flatMap(receipt => receipt.receipt_artifacts)')).toBe(true)
    expect(app).toContain('completeProofPack.map(artifact => primeReceiptArtifactCache(artifact, currentOwnerId))')
    expect(app).not.toMatch(/completeProofPack\s*=.*\.filter\(artifact\s*=>\s*artifact\.artifact_role/s)
    expect(app).toMatch(/const \{ receipts: walletReceipts,[^\n]*proofPack: offlineProofPack \} = useWalletReceipts\(effectiveOwnerId, surface\)/)
  })

  it('renders Chris transfer as a full Gmail proof instead of shrinking it into the QR card', () => {
    const app = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')
    expect(app).toContain('roles={[\'transfer\']} title="Chris’s Black Lotus transfer confirmation"')
    expect(app).not.toContain("roles={['qr', 'transfer']}")
  })
})
