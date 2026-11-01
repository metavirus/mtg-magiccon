import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildCatalogPromotionPlan } from '../src/lib/catalogImport.ts'
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const json = async p => JSON.parse(await readFile(p, 'utf8'))
const literal = value => "'" + String(value).replaceAll("'", "''") + "'"
const uuid = value => { const x = sha(value); return `${x.slice(0,8)}-${x.slice(8,12)}-4${x.slice(13,16)}-a${x.slice(17,20)}-${x.slice(20,32)}` }
export async function prepareAtlantaCatalog({ reviewer, reviewedAt, mediaBaseUrl, output }) {
  if (!reviewer?.trim() || !Number.isFinite(Date.parse(reviewedAt))) throw Error('Explicit reviewer and reviewedAt required')
  const base = new URL(mediaBaseUrl)
  if (base.protocol !== 'https:') throw Error('Packaged media requires published HTTPS base')
  const root = 'research/merchandise/2026-10-31/'
  const data = await json(root + 'normalized-merch-review.json')
  const categories = await json(root + 'reviewed-categories.json')
  const media = await json('src/lib/atlantaMerchMediaManifest.json')
  const originalPath = root + 'public-collection-page-0.json.capture'
  const original = await readFile(originalPath)
  const originalHash = sha(original)
  if (originalHash !== data.sources.find(s => s.id === 'official-merch-page').sha256) throw Error('Original source hash mismatch')
  const raw = JSON.parse(original).data.collection
  if (raw.products.pageInfo.hasNextPage || raw.products.nodes.length !== 60 || data.variants.length !== 202) throw Error('Unexpected collection scope')
  const show = data.lists.find(x => x.family === 'show_store')
  const publicRows = data.listings.filter(x => x.listKey === show.key)
  const catalogKey = show.key
  const captureId = uuid(catalogKey + ':' + originalHash)
  const catalogId = uuid(catalogKey)
  const source = { source_kind: 'official_web', source_url: data.sources[0].url, source_label: 'Official Atlanta merchandise collection · October 31, 2026', observed_on: '2026-10-31', original_filename: 'public-collection-page-0.json', original_path: `originals/${originalHash}.json`, original_sha256: originalHash, rights_note: 'First-party source retained for personal trip catalog evidence; exact response bytes.' }
  const manifest = { schema_version: 1, catalog: {catalog_key:catalogKey,event_key:'magiccon_atlanta_2026',family:'show_store',purpose:'inventory',title:show.title,fixture_only:false}, source, items: [] }
  const decisions = []
  for (const [index,row] of publicRows.entries()) {
    const product = data.products.find(p => p.productKey === row.productKey)
    const variant = data.variants.find(v => v.variantKey === row.variantKey && v.productKey === row.productKey)
    const image = media.images.find(m => m.productKey === row.productKey)
    const category = categories.products.find(c => c.productKey === row.productKey)?.category
    const sourceProduct = raw.products.nodes.find(p => p.id === product?.sourceProductId)
    const sourceVariant = sourceProduct?.variants.nodes.find(v => v.id === variant?.sourceVariantId)
    if (!variant || !image || !category || !sourceProduct || !sourceVariant || sourceProduct.images.pageInfo.hasNextPage || sourceProduct.variants.pageInfo.hasNextPage || !sourceProduct.images.nodes.some(i => i.url === image.sourceUrl) || sourceProduct.title !== product.name || sourceVariant.title !== variant.label || sourceVariant.sku !== variant.sku || JSON.stringify(sourceVariant.selectedOptions) !== JSON.stringify(variant.options) || sourceVariant.price.amount !== row.price.amount || sourceVariant.price.currencyCode !== row.price.currency) throw Error(`Unreconciled source identity/value ${row.listingKey}`)
    for (const asset of [image.thumbnail, image.original]) if (sha(await readFile(path.join('public',asset.path))) !== asset.sha256) throw Error(`Packaged media hash mismatch ${asset.path}`)
    manifest.items.push({source_item_key:row.listingKey,name:product.name,display_price:`${row.price.currency} ${row.price.amount}`,variant_key:variant.variantKey,variant_label:variant.label,variant_sku:variant.sku ?? undefined,variant_attributes:Object.fromEntries(variant.options.map(o=>[o.name,o.value]))})
    const minor = Number(row.price.amount)*100
    if (!Number.isInteger(minor)) throw Error(`Non-exact money value ${row.price.amount}`)
    decisions.push({sourceItemKey:row.listingKey,reviewedBy:reviewer,reviewedAt,decision:'approve',identityStatus:'exact_variant',canonicalKey:product.productKey,offerKey:row.listingKey,productName:product.name,category,variantKey:variant.variantKey,variantLabel:variant.label,variantSku:variant.sku ?? undefined,variantAttributes:Object.fromEntries(variant.options.map(o=>[o.name,o.value])),value:{kind:'price',amountMinor:minor,currency:row.price.currency},presentationMedia:{decision:'approved',quality:'high_quality',matchStatus:'exact_product',mediaRole:'product_image',source:'external',externalUrl:new URL(image.thumbnail.path,base).href,sourceProvider:'MagicCon official product asset; faithful packaged WebP',sourceUrl:image.sourceUrl,sha256:image.thumbnail.sha256,reviewNote:`Original SHA-256 ${image.sourceOriginal.sha256}; detail ${new URL(image.original.path,base).href}; media manifest source ${media.sourceSha256}`},availability:{status:'unknown',observedAt:data.observedAt,eventDay:'2026-10-31'},sortOrder:index})
  }
  const batch = {batchKey:'atlanta-2026-show-store-20261031-v1',manifest,decisions}
  const result = buildCatalogPromotionPlan(batch)
  if (result.status !== 'ready') throw Error(JSON.stringify(result))
  const bl = data.lists.find(x=>x.family==='black_lotus')
  const rules = {schemaVersion:1,kind:'black_lotus_purchase_rules',sourceKind:'official_email_reviewed_synopsis',sourcePublicationDate:'2026-10-26',opensAt:bl.opensAt,closesAt:bl.closesAt,checkoutLimit:1,pickup:bl.pickup,rules:bl.rules,items:data.listings.filter(x=>x.listKey===bl.key).map(row=>({canonicalKey:row.productKey,name:data.products.find(p=>p.productKey===row.productKey).name,purchaseLimit:row.purchaseLimit,limitScope:row.limitScope}))}
  const rulesBytes = JSON.stringify(rules,null,2)+'\n'
  const rulesHash = sha(rulesBytes), blCatalogId = uuid(bl.key), blCaptureId = uuid(bl.key+':'+rulesHash)
  const auth = `select set_config('request.jwt.claim.sub',(select user_id::text from public.companion_members where person_key='kavi' and active),true);\nset local role authenticated;\n`
  const stage = `begin;\n${auth}insert into public.catalogs(id,event_key,family,purpose,title,published) values (${literal(catalogId)},'magiccon_atlanta_2026','show_store','inventory',${literal(show.title)},false) on conflict do nothing;\ninsert into public.catalog_source_captures(id,catalog_id,capture_kind,source_label,source_url,source_sha256,captured_by,captured_at,effective_at,notes) values (${literal(captureId)},${literal(catalogId)},'official_web',${literal(source.source_label)},${literal(source.source_url)},${literal(originalHash)},auth.uid(),${literal(data.observedAt)},'2026-10-31',${literal(JSON.stringify({identityKey:catalogKey+':'+originalHash,intakeSourceKind:'official_web',originalFilename:source.original_filename,originalPath:source.original_path,rightsNote:source.rights_note}))}) on conflict do nothing;\ninsert into public.catalogs(id,event_key,family,purpose,title,published,opens_at,closes_at) values (${literal(blCatalogId)},'magiccon_atlanta_2026','black_lotus','inventory','Black Lotus purchasing',false,${literal(bl.opensAt)},${literal(bl.closesAt)}) on conflict do nothing;\ninsert into public.catalog_source_captures(id,catalog_id,capture_kind,source_label,source_sha256,captured_by,captured_at,effective_at,notes) values (${literal(blCaptureId)},${literal(blCatalogId)},'manual_entry','Black Lotus purchasing rules · October 26, 2026',${literal(rulesHash)},auth.uid(),${literal(reviewedAt)},'2026-10-26',${literal(JSON.stringify(rules))}) on conflict do nothing;\ninsert into public.catalog_media(source_capture_id,media_role,purpose,match_status,bucket_id,object_path,mime_type,sha256) values (${literal(blCaptureId)},'source_original','evidence','unreviewed','private-catalog-artifacts',${literal(blCaptureId+'/originals/'+rulesHash+'.json')},'application/json',${literal(rulesHash)}) on conflict do nothing;\ncommit;\n`
  const promote = `begin;\n${auth}select public.promote_catalog_batch(${literal(JSON.stringify(result.plan))}::jsonb);\ncommit;\n`
  const uploads = [{localPath:originalPath,bucket:'private-catalog-artifacts',objectPath:captureId+'/originals/'+originalHash+'.json',sha256:originalHash,contentType:'application/json',upsert:false},{localPath:path.join(output,'black-lotus-rules.json'),bucket:'private-catalog-artifacts',objectPath:blCaptureId+'/originals/'+rulesHash+'.json',sha256:rulesHash,contentType:'application/json',upsert:false}]
  await mkdir(output,{recursive:true})
  for (const [name,value] of Object.entries({'review-batch.json':JSON.stringify(batch,null,2)+'\n','promotion-plan.json':JSON.stringify(result.plan,null,2)+'\n','black-lotus-rules.json':rulesBytes,'storage-uploads.json':JSON.stringify(uploads,null,2)+'\n','01-stage-source.sql':stage,'03-promote.sql':promote})) await writeFile(path.join(output,name),value)
  return {products:60,variants:202,promotions:result.plan.promotions.length,blackLotusRules:rules.items.length,catalogId,captureId,blCatalogId,blCaptureId,sourceHash:originalHash,output}
}
if (process.argv[1]?.endsWith('prepare_atlanta_catalog.mjs')) {
  const args = Object.fromEntries(process.argv.slice(2).map((v,i,a)=>v.startsWith('--')?[v.slice(2),a[i+1]]:null).filter(Boolean))
  if (args['approve-exact-public'] !== 'yes') throw Error('Requires explicit --approve-exact-public yes after source, image and canonical identity review; no fuzzy matches are approved')
  console.log(JSON.stringify(await prepareAtlantaCatalog({reviewer:args.reviewer,reviewedAt:args['reviewed-at'],mediaBaseUrl:args['media-base-url'],output:args.output ?? '.codex-local/catalog-release/atlanta-2026'}),null,2))
}
