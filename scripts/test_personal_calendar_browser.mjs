import assert from 'node:assert/strict'
import fs from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { chromium } from 'playwright'
import { preview } from 'vite'
// Run against a built artifact; every external request is intercepted below.
const out = join(tmpdir(), 'magiccon-personal-calendar-proof') + '/'
fs.mkdirSync(out, {recursive:true})
const server = await preview({configFile:false,base:'/mtg-magiccon/',build:{outDir:resolve(process.argv[2] ?? 'dist')},preview:{host:'127.0.0.1',port:0,strictPort:true}})
const origin = `http://127.0.0.1:${server.httpServer.address().port}`
const browser = await chromium.launch()
try {
for (const viewport of [{width:390,height:844},{width:1280,height:900}]) {
 const rows=[], notes=[], writes=[], errors=[]
 let offline=false
 const context=await browser.newContext({viewport})
 await context.addInitScript(()=>localStorage.setItem('sb-pavjsexxbueuzhzgemgy-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'fixture-kavi',aud:'authenticated',role:'authenticated',email:'kavi@example.invalid',user_metadata:{full_name:'Kavi'}}})))
 await context.route('**/*', async route=>{
  const request=route.request(), url=new URL(request.url()), table=url.pathname.split('/').at(-1), method=request.method()
  if(url.origin===origin)return route.continue()
  if(offline)return route.abort()
  if(!url.hostname.endsWith('.supabase.co'))return route.abort()
  let body=[]
  if(table==='companion_members')body=['kavi','juan','chris','kyle'].map((key,i)=>({person_key:key,display_name:key[0].toUpperCase()+key.slice(1),bubble_label:key.slice(0,2),bubble_color:['blue','green','purple','orange'][i],badge_tier:'black_lotus',black_lotus_entitled:true,auth_email:key+'@example.invalid',user_id:'fixture-'+key,sort_order:i+1}))
  if(table==='user_selections')body=[{owner_id:'fixture-kavi',object_id:'onboarding-tour',selection_key:'completed',selection_value:'true'}]
  if(table==='personal_calendar_events'){
   if(method==='POST'){const data=request.postDataJSON();body={id:data.id??crypto.randomUUID(),...data};rows.push(body);writes.push({table,method,data})}
   else if(method==='PATCH'){const data=request.postDataJSON(), id=url.searchParams.get('id').slice(3);body=rows.find(x=>x.id===id);Object.assign(body,data);writes.push({table,method,data})}
   else if(method==='DELETE'){const id=url.searchParams.get('id').slice(3);body={id};rows.splice(rows.findIndex(x=>x.id===id),1);writes.push({table,method})}
   else body=rows
  }
  if(table==='personal_notes'){
   if(method==='POST'){const data=request.postDataJSON();body={id:'note-'+notes.length,...data};notes.push(body);writes.push({table,method,data})}else body=notes
  }
  if(table==='note_mentions'&&method==='POST'){const data=request.postDataJSON();body=data;writes.push({table,method,data})}
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
 })
 let page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message))
 await page.clock.setFixedTime(new Date('2026-11-11T16:00:00Z'))
 const shot=async name=>{await page.screenshot({path:out+viewport.width+'-'+name+'.png'});fs.writeFileSync(out+viewport.width+'-'+name+'.txt',await page.locator('body').innerText())}
 await page.goto(origin+'/mtg-magiccon/?auth=1#calendar')
 await page.getByRole('button',{name:'+ Add event',exact:true}).waitFor()
 await shot('calendar-peer')
 await page.getByRole('button',{name:'+ Add event',exact:true}).click()
 await shot('opened'); let dialog=page.getByRole('dialog')
 assert.equal(await dialog.getByRole('combobox').inputValue(),'private')
 await dialog.getByLabel('Title',{exact:true}).fill('Dinner with friends')
 await dialog.getByLabel('Date',{exact:true}).fill('2026-11-13')
 await dialog.getByLabel('Start (ET)',{exact:true}).fill('18:00')
 await dialog.getByLabel('End (ET)',{exact:true}).fill('19:00')
 await shot('create-private')
 await dialog.getByRole('button',{name:'Save event',exact:true}).click()
 await dialog.getByText('Private · only you',{exact:true}).waitFor()
 assert.equal(rows[0].visibility,'private')
 await shot('detail-private')
 await dialog.locator('textarea').fill('@Juan private event reminder.')
 assert.equal(await dialog.getByText('Will notify',{exact:true}).count(),0,'A nonreader must never be promised notification')
 await dialog.getByRole('button',{name:'Save note',exact:true}).click()
 await page.waitForTimeout(150)
 assert.equal(writes.filter(x=>x.table==='note_mentions').length,0)
 await dialog.getByRole('button',{name:'Edit event',exact:true}).click()
 await dialog.getByRole('button',{name:/Juan/}).click()
 await dialog.getByRole('button',{name:'Save event',exact:true}).click()
 await dialog.getByText('Private · invited people can view',{exact:true}).waitFor()
 await dialog.locator('textarea').fill('@Juan @Chris dinner reminder.')
 const preview=dialog.getByLabel('Recognized mentions')
 assert((await preview.innerText()).includes('@Juan'))
 assert(!(await preview.innerText()).includes('@Chris'))
 await shot('detail-invited')
 await dialog.locator('textarea').fill('')
 await dialog.getByRole('button',{name:'Edit event',exact:true}).click()
 await dialog.getByRole('combobox').selectOption('shared')
 await shot('edit-shared')
 await dialog.getByRole('button',{name:'Save event',exact:true}).click()
 await dialog.getByText('Shared with trip companions',{exact:true}).waitFor()
 assert.equal(rows[0].visibility,'shared');assert.deepEqual(rows[0].invited_user_ids,['fixture-juan'])
 await dialog.locator('textarea').fill('@Juan meet in the lobby.')
 await dialog.getByText('Will notify',{exact:true}).waitFor()
 await shot('detail-notes')
 await dialog.getByRole('button',{name:'Save note',exact:true}).click()
 await page.waitForTimeout(150)
 assert.equal(writes.filter(x=>x.table==='note_mentions').length,1)
 assert.equal(writes.find(x=>x.table==='note_mentions').data[0].mentioned_user_id,'fixture-juan')
 await dialog.locator('textarea').fill('@Juan private note on a shared event.')
 await dialog.getByRole('checkbox').check()
 assert.equal(await dialog.getByText('Will notify',{exact:true}).count(),0)
 await dialog.getByRole('button',{name:'Save note',exact:true}).click()
 await page.waitForTimeout(150)
 assert.equal(writes.filter(x=>x.table==='note_mentions').length,1,'Private notes must not notify')
 await dialog.getByRole('button',{name:'Edit event',exact:true}).click()
 await dialog.getByLabel('Title',{exact:true}).fill('Canceled edit')
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
 assert.equal(rows[0].title,'Dinner with friends')
 await dialog.getByRole('button',{name:'Close event',exact:true}).click()
 await page.locator('.calendar-surface').getByRole('button',{name:/Dinner with friends/}).scrollIntoViewIfNeeded()
 await shot('calendar-with-event')
 await page.locator('.calendar-surface').getByRole('button',{name:/Dinner with friends/}).click()
 // Personal rows share chronological ordering with fixed convention milestones.
 for(const [start,end,before,after] of [['08:00','08:15','Dinner with friends','Black Lotus lounge opens'],['20:00','21:00','Show floor closes','Dinner with friends']]) {
  await dialog.getByRole('button',{name:'Edit event',exact:true}).click()
  await dialog.getByLabel('Start (ET)',{exact:true}).fill(start)
  await dialog.getByLabel('End (ET)',{exact:true}).fill(end)
  await dialog.getByRole('button',{name:'Save event',exact:true}).click()
  await dialog.getByRole('button',{name:'Close event',exact:true}).click()
  const calendarText=await page.locator('.calendar-surface').innerText()
  assert(calendarText.indexOf(before)<calendarText.indexOf(after),`${start} event must sort with convention milestones`)
  await page.locator('.calendar-surface').getByRole('button',{name:/Dinner with friends/}).click()
 }
 await dialog.getByRole('button',{name:'Remove event',exact:true}).click()
 await dialog.getByRole('button',{name:'Keep',exact:true}).click()
 assert.equal(rows.length,1)
 await shot('detail-saved')
 await dialog.getByRole('button',{name:'Remove event',exact:true}).click()
 await dialog.getByRole('button',{name:'Remove',exact:true}).click()
 await page.getByRole('button',{name:'+ Add event',exact:true}).click()
 await dialog.getByLabel('Title',{exact:true}).fill('Offline dinner')
 await dialog.getByLabel('Date',{exact:true}).fill('2026-11-13')
 await dialog.getByRole('button',{name:'Save event',exact:true}).click()
 await dialog.getByRole('button',{name:'Close event',exact:true}).click()
 await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller))
 await page.waitForTimeout(300)
 const beforeOfflineWrites=writes.length
 await page.close();offline=true;await context.setOffline(true)
 page=await context.newPage();page.setDefaultTimeout(10000)
 page.on('pageerror',e=>errors.push(e.message))
 const network=await context.newCDPSession(page)
 await page.clock.setFixedTime(new Date('2026-11-11T16:00:00Z'))
 await page.goto(origin+'/mtg-magiccon/?auth=1#calendar')
 // Chromium can restore navigator.onLine when a service-worker-controlled document
 // opens. Reapply the browser's offline state to that document and verify adoption.
 await network.send('Network.overrideNetworkState',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0})
 assert.equal(await page.evaluate(()=>navigator.onLine),false)
 await page.locator('.calendar-surface').getByRole('button',{name:/Offline dinner/}).click()
 dialog=page.getByRole('dialog')
 await shot('offline-reopen')
 assert(await dialog.getByRole('button',{name:'Edit event',exact:true}).isDisabled())
 assert(await dialog.locator('textarea').isDisabled())
 assert.equal(writes.length,beforeOfflineWrites,'Offline reopen must not write')
 assert.deepEqual(errors,[])
 fs.writeFileSync(out+viewport.width+'-result.json',JSON.stringify({viewport,writes,errors},null,2))
 console.log(viewport.width,'PASS create/private/shared/people/notes/mentions/chronology/edit-cancel/delete-cancel/delete/offline reopen; evidence:',out)
 await context.close()
}
} finally {await browser.close();await server.close()}
