import { test, expect, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { Blob } from 'node:buffer'
import { uploadCatalogArtifacts } from './upload_atlanta_catalog_artifacts.mjs'
const bytes=Buffer.from('{"evidence":true}')
const sha256=createHash('sha256').update(bytes).digest('hex')
const artifact={captureId:'capture-id',objectPath:'capture-id/originals/'+sha256+'.json',sha256,bytes,byteSize:bytes.length,contentType:'application/json'}
function mock({body=bytes,publicBucket=false,binding=sha256}={}){
 const upload=vi.fn()
 const storageFrom={download:vi.fn().mockResolvedValue({data:new Blob([body]),error:null}),upload}
 const single=vi.fn().mockResolvedValue({data:{source_sha256:binding},error:null})
 const q={select:()=>q,eq:()=>q,single}
 return {client:{from:()=>q,storage:{getBucket:vi.fn().mockResolvedValue({data:{public:publicBucket},error:null}),from:()=>storageFrom}},upload,storageFrom}
}
test('existing immutable source is read back without replacement',async()=>{
 const {client,upload}=mock()
 expect(await uploadCatalogArtifacts(client,[artifact])).toEqual([{captureId:'capture-id',objectPath:artifact.objectPath,sha256,bytes:bytes.length,verified:true}])
 expect(upload).not.toHaveBeenCalled()
})
test('wrong checksum, binding or public bucket cannot claim verified upload',async()=>{
 await expect(uploadCatalogArtifacts(mock({body:Buffer.from('{}')}).client,[artifact])).rejects.toThrow('checksum')
 await expect(uploadCatalogArtifacts(mock({binding:'wrong'}).client,[artifact])).rejects.toThrow('capture')
 await expect(uploadCatalogArtifacts(mock({publicBucket:true}).client,[artifact])).rejects.toThrow('private')
})

test('missing bucket is provisioned private with bounded MIME policy and verified',async()=>{
 const {client}=mock()
 client.storage.getBucket.mockResolvedValueOnce({data:null,error:{statusCode:404}})
 client.storage.createBucket=vi.fn().mockResolvedValue({error:null})
 await uploadCatalogArtifacts(client,[artifact])
 expect(client.storage.createBucket).toHaveBeenCalledWith('private-catalog-artifacts',{public:false,fileSizeLimit:10*1024*1024,allowedMimeTypes:['application/json','application/pdf','image/png','image/jpeg','image/webp']})
 expect(client.storage.getBucket).toHaveBeenCalledTimes(2)
})
