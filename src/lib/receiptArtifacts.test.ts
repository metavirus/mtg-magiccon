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
})
