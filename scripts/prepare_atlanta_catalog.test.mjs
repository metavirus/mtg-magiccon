import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { prepareAtlantaCatalog } from './prepare_atlanta_catalog.mjs'
test('official batch preserves variant identity, independent prices, bytes and pending Lotus boundaries',async()=>{
 const output=await mkdtemp(path.join(tmpdir(),'atlanta-release-'))
 try {
  const args={reviewer:'test reviewer',reviewedAt:'2026-11-01T02:28:12.976Z',mediaBaseUrl:'https://example.com/app/',output}
  const result=await prepareAtlantaCatalog(args)
  const first=await readFile(path.join(output,'promotion-plan.json'),'utf8')
  const plan=JSON.parse(first)
  assert.equal(result.promotions,202)
  assert.equal(new Set(plan.promotions.map(x=>x.offer.offerKey)).size,202)
  assert.equal(new Set(plan.promotions.map(x=>x.product.canonicalKey)).size,60)
  assert.ok(plan.promotions.every(x=>x.variant?.variantKey && x.availabilityObservation.availability==='unknown' && x.offer.value.kind==='price'))
  assert.ok(plan.promotions.some(x=>x.variant.attributes.Size==='5XL'))
  assert.equal(plan.sourceCapture.originalFilename,'public-collection-page-0.json')
  assert.ok(plan.sourceCapture.originalPath.endsWith(plan.sourceCapture.sourceSha256+'.json'))
  const rules=JSON.parse(await readFile(path.join(output,'black-lotus-rules.json'),'utf8'))
  assert.equal(rules.items.length,8)
  assert.ok(rules.items.every(x=>!('price' in x)&&!('variantKey' in x)))
  await prepareAtlantaCatalog(args)
  assert.equal(await readFile(path.join(output,'promotion-plan.json'),'utf8'),first)
  await assert.rejects(prepareAtlantaCatalog({...args,mediaBaseUrl:'http://example.com/'}),/HTTPS/)
 } finally { await rm(output,{recursive:true,force:true}) }
})
