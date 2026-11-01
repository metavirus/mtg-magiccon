import { describe, expect, it, vi } from 'vitest'
import { loadCatalogPurchaseRules, parseCatalogPurchaseRules } from './catalog'
const valid = {schemaVersion:1,kind:'black_lotus_purchase_rules',sourceKind:'official_email_reviewed_synopsis',sourcePublicationDate:'2026-10-26',opensAt:'2026-11-02T10:00:00-08:00',closesAt:'2026-11-08T10:00:00-08:00',checkoutLimit:1,pickup:'Black Lotus Lounge',rules:['One checkout'],items:[{canonicalKey:'product-a',name:'Product A',purchaseLimit:6,limitScope:'preorder'}]}
describe('canonical retained purchasing rules',()=>{
  it('retains named limits without inventing offers, prices or variants',()=>{expect(parseCatalogPurchaseRules(JSON.stringify(valid))).toEqual(valid)})
  it('rejects malformed, duplicate and unsupported rule state',()=>{
    for(const value of [{...valid,items:[...valid.items,...valid.items]},{...valid,checkoutLimit:2},{...valid,items:[{...valid.items[0],purchaseLimit:0}]},{...valid,items:[{...valid.items[0],limitScope:'all_variants'}]},{...valid,closesAt:valid.opensAt}]) expect(parseCatalogPurchaseRules(JSON.stringify(value))).toBeNull()
    expect(parseCatalogPurchaseRules('{')).toBeNull()
  })
  it('bounds the read and reports missing versus unreadable evidence',async()=>{
    const q:any={select:vi.fn(()=>q),eq:vi.fn(()=>q),order:vi.fn(()=>q),limit:vi.fn().mockResolvedValue({data:[{notes:JSON.stringify(valid)}],error:null})}
    const client:any={from:vi.fn(()=>q)}
    expect(await loadCatalogPurchaseRules(client,'magiccon_atlanta_2026')).toEqual({purchaseRules:valid,purchaseRulesStatus:'ready'})
    expect(q.limit).toHaveBeenCalledWith(1)
    expect(q.eq).toHaveBeenCalledWith('catalogs.event_key','magiccon_atlanta_2026')
    q.limit.mockResolvedValueOnce({data:[],error:null})
    expect(await loadCatalogPurchaseRules(client,'event')).toEqual({purchaseRulesStatus:'absent'})
    q.limit.mockResolvedValueOnce({data:[],error:{message:'denied'}})
    expect(await loadCatalogPurchaseRules(client,'event')).toEqual({purchaseRulesStatus:'unavailable'})
    q.limit.mockResolvedValueOnce({data:[{notes:'{}'}],error:null})
    expect(await loadCatalogPurchaseRules(client,'event')).toEqual({purchaseRulesStatus:'unavailable'})
  })
})
