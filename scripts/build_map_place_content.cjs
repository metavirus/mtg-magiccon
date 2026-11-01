const {validateMapRuntime}=require('./lib/map_preview_runtime.cjs');
// Rebuild only from maintained public sources. Never accepts owner events, purchases or interests.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const {sourceLocationIds:labels,blackLotusLoungeEventIds:lounge}=JSON.parse(read(repo+'/src/data/mapPlaceBindings.json'));
const programs=JSON.parse(read(repo+'/src/data/conventionPrograms.json')),bl=JSON.parse(read(repo+'/src/data/blackLotusSchedule-reviewed.json')),merch=JSON.parse(read(repo+'/research/merchandise/2026-10-31/normalized-merch-review.json'));
const time=s=>{const h=+s.slice(11,13),m=s.slice(14,16);return `${h%12||12}${m==='00'?'':':'+m} ${h<12?'AM':'PM'}`};
const events=programs.sessions.filter(s=>labels[s.location]).map(s=>({id:'program-'+s.id,title:s.title,day:({'2026-11-13':'Fri','2026-11-14':'Sat','2026-11-15':'Sun'})[s.startTime.slice(0,10)],time:time(s.startTime)+(s.startTime===s.endTime?'':'–'+time(s.endTime)),locationId:labels[s.location],detail:s.description,url:s.detailUrl}));
events.push(...bl.sessions.filter(s=>lounge.includes(s.id)).map(s=>({id:s.id,title:s.title,day:s.day,time:s.time,locationId:'black-lotus',detail:s.detail,url:bl.source.url})));
const media=JSON.parse(read(repo+'/src/lib/atlantaMerchMediaManifest.json'));
const profiles=JSON.parse(read(repo+'/src/data/mapPlaceProfiles.json')).profiles;
const products=[];
for(const list of merch.lists)for(const key of new Set(merch.listings.filter(r=>r.listKey===list.key).map(r=>r.productKey))){const p=merch.products.find(p=>p.productKey===key),rows=merch.listings.filter(r=>r.listKey===list.key&&r.productKey===key),prices=[...new Set(rows.filter(r=>r.price).map(r=>Number(r.price.amount)))];products.push({id:`review:${list.key}:${key}`,productId:key,locationId:list.family==='black_lotus'?'black-lotus':'show-store',name:p.name,price:prices.length===1?'$'+prices[0]:prices.length?'$'+Math.min(...prices)+'–$'+Math.max(...prices):null,limit:rows[0].purchaseLimit??null,availability:'unknown',image:media.images.find(image=>image.productKey===key)?'../'+media.images.find(image=>image.productKey===key).thumbnail.path:null});}
const content={schemaVersion:1,events,products,profiles};
for(const dir of [repo+'/public/map-preview',...process.argv.slice(2)]){validateMapRuntime(read(dir+'/app.js'));fs.writeFileSync(dir+'/place-content.json',JSON.stringify(content,null,2)+'\n');const hash=name=>crypto.createHash('sha256').update(read(dir+'/'+name)).digest('hex').slice(0,12);let app=read(dir+'/app.js').replace(/place-content.json\?v=[a-f0-9]+/,'place-content.json?v='+hash('place-content.json'));validateMapRuntime(app);fs.writeFileSync(dir+'/app.js',app);fs.writeFileSync(dir+'/index.html',read(dir+'/index.html').replace(/app.js\?v=[a-f0-9]+/,'app.js?v='+hash('app.js')))}
console.log('Map public content: '+events.length+' events, '+products.length+' product/location associations');
