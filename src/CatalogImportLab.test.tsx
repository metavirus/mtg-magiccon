import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CatalogImportLab } from './CatalogImportLab'
import { catalogImportPreviewBatch } from './lib/catalogImportPreview'

afterEach(() => vi.unstubAllGlobals())

describe('CatalogImportLab review contract', () => {
  it('carries source variants and purchasing rules through review into promotion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const batch = structuredClone(catalogImportPreviewBatch)
    batch.manifest.catalog!.fixture_only = false
    batch.manifest.items = [{ ...batch.manifest.items![0], variant_key: 'large', variant_label: 'Large', variant_sku: 'SKU-L', variant_attributes: { Size: 'Large' }, purchase_limit: 2, eligibility_note: 'VIP', pickup_note: 'Lounge' }]
    batch.decisions = [{ sourceItemKey: batch.manifest.items[0].source_item_key!, decision: 'pending', identityStatus: 'exact_variant', reviewedBy: 'operator-kavi', reviewedAt: '2026-10-31T12:00:00Z' }]
    const promote = vi.fn().mockResolvedValue(undefined)
    render(<CatalogImportLab initialBatch={batch} canPromote promoting={false} onPromote={promote} />)
    expect(screen.getByLabelText('Variant options (JSON)')).toHaveValue('{"Size":"Large"}')
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    fireEvent.click(screen.getByRole('button', { name: 'Promote reviewed batch' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm canonical promotion' }))
    await waitFor(() => expect(promote).toHaveBeenCalledOnce())
    expect(promote.mock.calls[0][0].promotions[0]).toMatchObject({
      variant: { variantKey: 'large', label: 'Large', sku: 'SKU-L', attributes: { Size: 'Large' } },
      offer: { purchaseLimit: 2, eligibilityNote: 'VIP', pickupNote: 'Lounge' },
    })
  })
})
