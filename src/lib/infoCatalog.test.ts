import { describe, expect, it } from 'vitest'
import { infoCatalogPreviewEnabled, priorEventCatalogs } from './infoCatalog'

describe('Info catalog preview', () => {
  it('stays hidden without the explicit QA mode', () => {
    expect(infoCatalogPreviewEnabled('?qa=sale-open')).toBe(false)
    expect(infoCatalogPreviewEnabled('')).toBe(false)
  })

  it('appears only for the catalog QA mode', () => {
    expect(infoCatalogPreviewEnabled('?qa=sale-open,info-catalogs')).toBe(true)
  })

  it('keeps each precedent catalog source-backed', () => {
    expect(priorEventCatalogs.map(catalog => catalog.id)).toEqual(['show-store', 'black-lotus', 'prize-wall'])
    expect(priorEventCatalogs.every(catalog => catalog.sourceUrl.startsWith('https://') && catalog.items.length > 0)).toBe(true)
  })
})
