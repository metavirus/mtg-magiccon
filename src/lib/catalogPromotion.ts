import type { SupabaseClient } from '@supabase/supabase-js'
import type { CatalogPromotionPlan } from './catalogImport'

export interface CatalogPromotionReadbackItem {
  source_item_key: string
  offer_id: string
}

export interface CatalogPromotionReadback {
  status: 'applied'
  batch_key: string
  catalog_id: string
  source_capture_id: string
  promotions: CatalogPromotionReadbackItem[]
  promoted_count: number
  retained_review_count: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isPromotionReadback(value: unknown): value is CatalogPromotionReadback {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<CatalogPromotionReadback>
  return row.status === 'applied'
    && typeof row.batch_key === 'string'
    && typeof row.catalog_id === 'string'
    && UUID.test(row.catalog_id)
    && typeof row.source_capture_id === 'string'
    && UUID.test(row.source_capture_id)
    && Number.isInteger(row.promoted_count)
    && Number.isInteger(row.retained_review_count)
    && Array.isArray(row.promotions)
    && row.promotions.every(item => Boolean(item)
      && typeof item.source_item_key === 'string'
      && typeof item.offer_id === 'string'
      && UUID.test(item.offer_id))
}

export async function promoteCatalogPlan(
  client: SupabaseClient,
  plan: CatalogPromotionPlan,
): Promise<CatalogPromotionReadback> {
  const expectedSourceKeys = plan.promotions.map(item => item.sourceItemKey).sort()
  if (!plan.batchKey.trim() || expectedSourceKeys.length === 0) {
    throw new Error('Catalog promotion requires a non-empty reviewed plan.')
  }

  const result = await client.rpc('promote_catalog_batch', { p_plan: plan })
  if (result.error) throw result.error
  if (!isPromotionReadback(result.data)) {
    throw new Error('Catalog promotion returned an invalid readback.')
  }

  const actualSourceKeys = result.data.promotions.map(item => item.source_item_key).sort()
  if (
    result.data.batch_key !== plan.batchKey
    || result.data.promoted_count !== expectedSourceKeys.length
    || result.data.retained_review_count !== plan.retainedReviews.length
    || JSON.stringify(actualSourceKeys) !== JSON.stringify(expectedSourceKeys)
  ) {
    throw new Error('Catalog promotion readback did not match the reviewed plan.')
  }
  return result.data
}
