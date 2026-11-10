import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'
let upgraded = false
let followup = false
const prefix = '/mtg-magiccon'
const legacy = "self.addEventListener('activate', e => e.waitUntil(self.clients.claim())); self.addEventListener('fetch', e => { if(e.request.mode==='navigate') e.respondWith(new Response('<h1>Legacy</h1>',{headers:{'Content-Type':'text/html'}})); });"
const server = createServer(async (req,res)=>{
  const pathname = new URL(req.url,'http://localhost').pathname
  if (!pathname.startsWith(prefix + '/')) {res.statusCode=404; return res.end()}
  const path = pathname.slice(prefix.length)
  try {
    if (!upgraded && path === '/sw.js') {res.setHeader('Content-Type','text/javascript'); return res.end(legacy)}
    if (!upgraded && path === '/') {res.setHeader('Content-Type','text/html'); return res.end('<h1>Legacy</h1>')}
    const file = path === '/' ? '/index.html' : path
    const bytes = await readFile('dist'+file)
    if (file.endsWith('.js')) res.setHeader('Content-Type','text/javascript')
    if (file.endsWith('.html')) res.setHeader('Content-Type','text/html')
    if (file.endsWith('.css')) res.setHeader('Content-Type','text/css')
    res.end(followup && path === '/sw.js' ? bytes.toString() + '\n// follow-up build' : bytes)
  } catch {res.statusCode=404;res.end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const origin='http://127.0.0.1:'+server.address().port
let browser
try{
 browser=await chromium.launch()
 const context=await browser.newContext({viewport:{width:390,height:844}})
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin ? r.continue() : r.abort())
 const page=await context.newPage()
 await page.goto(origin + prefix + '/')
 await page.evaluate(async()=>{
   localStorage.setItem('session-fixture','keep')
   const offline=await caches.open('magiccon-test-offline-data')
   await offline.put('./fixture-data',new Response('keep'))
   const previous=await caches.open('workbox-precache-v2-legacy-fixture')
   await previous.put('./assets/legacy-AbCd12.js',new Response('legacy-chunk'))
   await navigator.serviceWorker.register('./sw.js')
   await navigator.serviceWorker.ready
 })
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
 upgraded=true
 await page.evaluate(async()=>{
   const ready = new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>reject(new Error('Replacement worker did not take control')),12000)
     navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timeout);resolve()},{once:true})
   })
   const registration = await navigator.serviceWorker.ready
   await registration.update()
   await ready
 })
 assert.equal(await page.evaluate(()=>fetch('./assets/legacy-AbCd12.js').then(r=>r.text())), 'legacy-chunk')
 assert.equal(await page.evaluate(()=>localStorage.getItem('session-fixture')), 'keep')
 assert.equal(await page.evaluate(()=>caches.match('./fixture-data').then(r=>r.text())), 'keep')
 await context.setOffline(true)
 await page.reload()
 assert.equal(await page.title(),'MagicCon Companion')
 assert.equal(await page.evaluate(()=>localStorage.getItem('session-fixture')), 'keep')
 await context.setOffline(false)
 followup=true
 await page.evaluate(async()=>{
   const registration = await navigator.serviceWorker.ready
   await registration.update()
 })
 await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting))
 console.log('Legacy worker upgraded without a page handshake; legacy assets, session marker and offline data survived; app shell reopened offline.')
}finally{
 try { await browser?.close() }
 finally { server.close() }
}
