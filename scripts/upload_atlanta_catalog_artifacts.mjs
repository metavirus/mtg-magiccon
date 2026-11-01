import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
const BUCKET='private-catalog-artifacts'
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
export async function validateCatalogUploads(manifestPath = 'research/merchandise/2026-10-31/storage-uploads.json') {
 const uploads=JSON.parse(await readFile(manifestPath,'utf8'))
 const exact = [['research/merchandise/2026-10-31/public-collection-page-0.json.capture','c09321e9-06e2-49de-a48e-b776f2021f78','59ec23858087b953ecda3d819da84deb3c6ae33c374ba606caa4d69439e952a9'],['research/merchandise/2026-10-31/black-lotus-rules.json','1c55dc8f-8c8e-4588-af4c-40a29e9d6b26','1a3e8931b7f905f25b255fa50483ecf2e9e52bfc2231d09202ba6e3b3dad6e58']]
 if (!Array.isArray(uploads)||uploads.length!==2) throw Error('Expected the two reviewed source artifacts')
 return Promise.all(uploads.map(async (item,index)=>{
  const [localPath,captureId,sourceHash] = exact[index]
  if(item.localPath!==localPath || item.objectPath!==`${captureId}/originals/${sourceHash}.json` || item.sha256!==sourceHash) throw Error('Upload exceeds reviewed two-source scope')
  if(item.bucket!==BUCKET||item.contentType!=='application/json'||item.upsert!==false||!/^([0-9a-f-]{36})\/originals\/([0-9a-f]{64})\.json$/.test(item.objectPath)||!item.objectPath.endsWith(item.sha256+'.json'))throw Error('Invalid immutable source binding')
  const bytes=await readFile(path.resolve(item.localPath))
  if(hash(bytes)!==item.sha256)throw Error('Local artifact checksum mismatch')
  JSON.parse(bytes.toString('utf8'))
  return {...item,bytes,byteSize:bytes.length,captureId:item.objectPath.split('/')[0]}
 }))
}
export async function uploadCatalogArtifacts(client, artifacts) {
 const bucket=await client.storage.getBucket(BUCKET)
 if(bucket.error&&!['404','400'].includes(String(bucket.error.statusCode)))throw Error('Cannot verify private catalog bucket')
 if(!bucket.data){
  const create=await client.storage.createBucket(BUCKET,{public:false,fileSizeLimit:10*1024*1024,allowedMimeTypes:['application/json','application/pdf','image/png','image/jpeg','image/webp']})
  if(create.error)throw Error('Could not provision private catalog bucket')
  const verifiedBucket=await client.storage.getBucket(BUCKET)
  if(verifiedBucket.error||!verifiedBucket.data||verifiedBucket.data.public)throw Error('Private bucket readback failed')
 }else if(bucket.data.public)throw Error('Catalog bucket must be private')
 const verified=[]
 for(const a of artifacts){
  const binding=await client.from('catalog_source_captures').select('id,source_sha256').eq('id',a.captureId).single()
  if(binding.error||binding.data?.source_sha256!==a.sha256)throw Error('Staged canonical capture does not match upload')
  let download=await client.storage.from(BUCKET).download(a.objectPath)
  if(download.error){
   if(!['404','400'].includes(String(download.error.statusCode)))throw Error('Cannot inspect immutable object')
   const upload=await client.storage.from(BUCKET).upload(a.objectPath,a.bytes,{contentType:a.contentType,upsert:false})
   if(upload.error)throw Error('Immutable artifact upload failed')
   download=await client.storage.from(BUCKET).download(a.objectPath)
  }
  if(download.error||!download.data||hash(Buffer.from(await download.data.arrayBuffer()))!==a.sha256)throw Error('Stored artifact checksum mismatch; no promotion authorized')
  verified.push({captureId:a.captureId,objectPath:a.objectPath,sha256:a.sha256,bytes:a.byteSize,verified:true})
 }
 return verified
}
if(process.argv[1]?.endsWith('upload_atlanta_catalog_artifacts.mjs')){
 if(process.argv.slice(2).some(a=>a!=='--apply')) throw Error('No arbitrary upload paths or URLs accepted')
 const artifacts=await validateCatalogUploads()
 if(!process.argv.includes('--apply'))console.log(JSON.stringify({status:'validated',apply:false,artifacts:artifacts.map(({bytes,...a})=>a)},null,2))
 else{
  if(process.env.SUPABASE_URL!=='https://pavjsexxbueuzhzgemgy.supabase.co'||!process.env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_'))throw Error('Apply requires canonical SUPABASE_URL and server-only SUPABASE_SECRET_KEY via existing operator environment')
  const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
  console.log(JSON.stringify({status:'verified',artifacts:await uploadCatalogArtifacts(client,artifacts)},null,2))
 }
}
