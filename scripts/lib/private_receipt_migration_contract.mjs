import { createHash } from 'node:crypto'

export const LEGACY_RECEIPT_COMMIT = 'cd84772'
export const RECEIPT_MIGRATION_MARKER = '_migration/private-receipts-cd84772.json'

export function deterministicReceiptId(sourceMessageId) {
  const hex = createHash('md5').update(`magiccon:wallet_receipt:gmail_legacy_capture:${sourceMessageId}`).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export const LEGACY_BADGE_RECEIPTS = {
  blackLotus: {
    receiptId: deterministicReceiptId('1868171070359890707'),
    capturedAt: '2026-06-16T09:19:00-07:00',
  },
  juanPremium: {
    receiptId: deterministicReceiptId('1868173301829594110'),
    capturedAt: '2026-06-16T09:54:00-07:00',
  },
}

export const LEGACY_PUBLIC_ARTIFACTS = [
  ...[1, 2, 3, 4, 5].map(page => ({
    sourcePath: `public/black-lotus-order-original-page-${page}.png`, receiptId: LEGACY_BADGE_RECEIPTS.blackLotus.receiptId,
    role: 'original', mimeType: 'image/png', displayLabel: `Original email page ${page} of 5`, displayOrder: page,
    capturedAt: LEGACY_BADGE_RECEIPTS.blackLotus.capturedAt,
  })),
  { sourcePath: 'public/black-lotus-order-original-summary.png', receiptId: LEGACY_BADGE_RECEIPTS.blackLotus.receiptId, role: 'original', mimeType: 'image/png', displayLabel: 'Original email summary crop', displayOrder: 6, capturedAt: LEGACY_BADGE_RECEIPTS.blackLotus.capturedAt },
  { sourcePath: 'public/black-lotus-order-qr.png', receiptId: LEGACY_BADGE_RECEIPTS.blackLotus.receiptId, role: 'qr', mimeType: 'image/png', displayLabel: 'Showable Black Lotus order QR', displayOrder: 1, capturedAt: LEGACY_BADGE_RECEIPTS.blackLotus.capturedAt },
  { sourcePath: 'public/black-lotus-order-original-qr.png', receiptId: LEGACY_BADGE_RECEIPTS.blackLotus.receiptId, role: 'qr', mimeType: 'image/png', displayLabel: 'Original email QR crop', displayOrder: 2, capturedAt: LEGACY_BADGE_RECEIPTS.blackLotus.capturedAt },
  { sourcePath: 'public/juan-premium-order-original.html', receiptId: LEGACY_BADGE_RECEIPTS.juanPremium.receiptId, role: 'original', mimeType: 'text/html', displayLabel: 'Original source email', displayOrder: 1, capturedAt: LEGACY_BADGE_RECEIPTS.juanPremium.capturedAt },
]

export function expectedLegacyObjectPaths() {
  return LEGACY_PUBLIC_ARTIFACTS.map(artifact => `${artifact.receiptId}/${artifact.role}/${artifact.sourcePath.split('/').at(-1)}`)
}
