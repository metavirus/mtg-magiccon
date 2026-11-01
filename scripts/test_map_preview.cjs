require('./test_generated_typescript_guard.cjs');
// Input/camera regressions; rendered PM review is a separate acceptance gate.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const previewDir=require('path').join(__dirname,'../public/map-preview/');
const versionOf=name=>require('crypto').createHash('sha256').update(fs.readFileSync(previewDir+name,'utf8').replace(/\r\n/g,'\n')).digest('hex').slice(0,12);
const html=fs.readFileSync(previewDir+'index.html','utf8'),source=fs.readFileSync(previewDir+'app.js','utf8');
for(const asset of ['app.js','style.css'])assert(html.includes(asset+'?v='+versionOf(asset)),asset+' content hash');
assert(source.includes('data.json?v='+versionOf('data.json')),'data content hash');
const elements=new Map(),listeners={};
function el(s){if(!elements.has(s))elements.set(s,{style:{},clientWidth:375,clientHeight:450,value:'',innerHTML:'',setPointerCapture(){},setAttribute(k,v){this[k]=v},getBoundingClientRect(){return {width:this.clientWidth,height:this.clientHeight}},insertAdjacentHTML(){},scrollIntoView(){this.revealed=true},remove(){},click(){}});return elements.get(s)}
let mapWrites=0;Object.defineProperty(el('#map'),'innerHTML',{get(){return this.markup||''},set(v){mapWrites++;this.markup=v}});
const data=JSON.parse(fs.readFileSync(previewDir+'data.json','utf8')),originalDataSnapshot=JSON.stringify(data);
const context={URLSearchParams,document:{querySelector:el,addEventListener:(type,fn)=>{listeners[type]=fn}},fetch:async url=>({json:async()=>url.startsWith('place-content')?JSON.parse(fs.readFileSync(previewDir+'place-content.json','utf8')):data}),ResizeObserver:class{observe(){}},window:{},setTimeout:fn=>fn(),requestAnimationFrame:fn=>fn(),Date,console};
vm.createContext(context);vm.runInContext(source,context);
setImmediate(()=>{
 const api=context.window.mapStudy,p=api.places,by=id=>p.find(q=>q.id===id),state=()=>JSON.parse(JSON.stringify(api.getState())),stage=el('#stage');
 assert(api);assert.equal(el('#panel').hidden,true,'initial canvas has no drawer');
 api.choose('c101-showcase');assert.equal(el('#panel').hidden,false);assert(el('#panel').innerHTML.includes('Scheduled events'));const publicEvent=JSON.parse(fs.readFileSync(previewDir+'place-content.json','utf8')).events.find(e=>e.locationId==='c101-showcase');api.openEvent(publicEvent.id);assert.match(el('#panel').innerHTML,/Back to place/);assert(el('#panel').innerHTML.includes(publicEvent.title));assert(!el('#panel').innerHTML.includes('Scheduled events'),'public activation focuses event rather than append below list');api.dismissPanel();assert.equal(el('#panel').hidden,true);assert.equal(state().selected,null);
 api.choose('dragon-shield');listeners.keydown({key:'Escape',target:{matches:()=>false}});assert.equal(el('#panel').hidden,true,'Escape dismisses drawer');
 api.choose('dragon-shield');stage.onpointerdown({pointerId:9,button:0,clientX:1,clientY:1,target:{closest:()=>null}});stage.onpointerup({pointerId:9});assert.equal(el('#panel').hidden,true,'blank map tap dismisses drawer');
 api.choose('show-store');assert(el('#panel').innerHTML.includes('Products'));assert(el('#panel').innerHTML.includes('Jace Reversible Hoodie'));assert(!el('#panel').innerHTML.includes('review_pending'));
 api.choose('black-lotus');assert(el('#panel').innerHTML.includes('Black Lotus Lounge'));assert(el('#panel').innerHTML.includes('Preorder limit:'));
 api.go('floor');stage.clientHeight=300;api.resizeCamera();assert(Math.abs(state().box[2]/state().box[3]-375/300)<.00001);stage.clientHeight=450;api.resizeCamera();
 // Responsive layout can cross several width/height states during one resize.
 for(const [w,h]of [[1110,640],[1280,640],[375,640],[375,409],[1110,409],[1110,640],[375,409]]){stage.clientWidth=w;stage.clientHeight=h;api.resizeCamera();const b=state().box;assert(b[2]>=1100,'overview remains complete across desktop/phone resize');assert(b[3]>=970);assert(el('#minus').disabled)}
 stage.clientWidth=375;stage.clientHeight=450;api.resizeCamera();
 const target=(id,attr='id')=>({id:'',dataset:{[attr]:id},closest:s=>s==='button'||s==='[data-event]'||s==='[data-public-event]'||s==='[data-clear-event]'?null:{dataset:{[attr]:id}},matches:()=>true});
 const input={api:id=>api.choose(id),pointer:id=>{stage.onpointerdown({pointerId:1,button:0,clientX:10,clientY:10,target:target(id)});stage.onpointerup({pointerId:1});},click:id=>listeners.click({target:target(id)}),keyboard:id=>listeners.keydown({key:'Enter',target:target(id),preventDefault(){}}),space:id=>listeners.keydown({key:' ',target:target(id),preventDefault(){}}),list:id=>listeners.click({target:target(id,'select')}),search:id=>{el('#search').oninput({target:{value:by(id).name}});listeners.click({target:target(id,'select')});}};
 const ordinary=p.filter(q=>api.interactionPolicy(q).camera==='preserve');
 for(const start of ['floor','marketplace','manual'])for(const [name,activate]of Object.entries(input))for(const place of ordinary){
  api.go(start==='manual'?'floor':start);if(start==='manual')api.zoom(.31);
  const before=state();activate(place.id);const after=state(),label=`${start}/${name}/${place.id}`;
  assert.equal(after.selected,place.id,label);assert.equal(after.detailMode,before.detailMode,label+' LOD');assert.equal(after.area,before.area,label+' context');
  if(name==='search'||name==='list'){assert.equal(after.box[2],before.box[2],label+' width');assert.equal(after.box[3],before.box[3],label+' height')}else assert.deepEqual(after.box,before.box,label+' camera');
  if(!place.level&&!place.unbound)assert(el('#map').innerHTML.includes('data-id="'+place.id+'"'),label+' selected geometry');
  for(const unbound of p.filter(q=>q.unbound))assert(!el('#map').innerHTML.includes('data-id="'+unbound.id+'"'),'unplaced artist never creates a map target');
 }
 for(const group of ['rooms','play','facilities'])for(const start of ['floor','marketplace']){api.go(start);const before=state();api.go(group);assert.deepEqual(state().box,before.box,group+' filter camera');assert.equal(state().detailMode,before.detailMode)}
 for(const id of ['marketplace','art-of-magic','magic-experiences',p.find(q=>q.kind==='island').id])for(const activate of Object.values(input)){api.go('floor');activate(id);assert(state().box[2]<1100,id+' dense entry')}
 api.go('marketplace');const vendorMap=el('#map').innerHTML;api.choose('c103');for(const v of p.filter(q=>q.kind==='vendor'))assert.equal(el('#map').innerHTML.includes('data-id="'+v.id+'"'),vendorMap.includes('data-id="'+v.id+'"'));
 // Offscreen directory destinations reveal the complete tile without zooming or changing LOD.
 api.go('marketplace');const directoryBefore=state();input.list('nerd-gear-pink-bunny');const directoryAfter=state(),directoryTarget=by('nerd-gear-pink-bunny');assert.equal(directoryAfter.box[2],directoryBefore.box[2]);assert.equal(directoryAfter.box[3],directoryBefore.box[3]);assert.equal(directoryAfter.detailMode,'market');assert(directoryTarget.x>=directoryAfter.box[0]&&directoryTarget.x+directoryTarget.width<=directoryAfter.box[0]+directoryAfter.box[2]);assert(directoryTarget.y>=directoryAfter.box[1]&&directoryTarget.y+directoryTarget.height<=directoryAfter.box[1]+directoryAfter.box[3]);const visibleBox=state().box;input.list('nerd-gear-pink-bunny');assert.deepEqual(state().box,visibleBox,'visible directory selection preserves exact camera');
 api.go('art-of-magic');api.choose(p.find(q=>q.name==='Winona Nelson').id);for(const island of p.filter(q=>q.kind==='island'))assert(el('#map').innerHTML.includes('data-id="'+island.id+'"'),'artist selection keeps groups');
 api.go('marketplace');api.choose('dragon-shield');
 for(const id of ['dragon-shield',null]){const before=state();stage.onpointerdown({pointerId:2,clientX:200,clientY:200,target:id?target(id):{closest:()=>null}});stage.onpointermove({pointerId:2,clientX:140,clientY:150});stage.onpointerup({pointerId:2});assert(state().box[0]>before.box[0]);assert(state().box[1]>before.box[1]);assert.equal(state().selected,null);assert.equal(state().panelOpen,false)}
 const beforeResize=state().box;api.resizeCamera();assert.deepEqual(state().box,beforeResize);stage.clientHeight=430;api.resizeCamera();assert.equal(state().box[2],beforeResize[2]);assert.equal(state().box[1]+state().box[3]/2,beforeResize[1]+beforeResize[3]/2);
 // Drawer layout changes must preserve the exact world point under the grabbed pointer.
 const panel=el('#panel');let hidden=panel.hidden;Object.defineProperty(panel,'hidden',{configurable:true,get(){return hidden},set(v){hidden=v;stage.clientHeight=v?450:240}});
 api.go('marketplace');api.choose('dragon-shield');api.resizeCamera();const grabbed=state().box,worldX=grabbed[0]+150*grabbed[2]/375,worldY=grabbed[1]+120*grabbed[3]/240;
 stage.onpointerdown({pointerId:40,clientX:150,clientY:120,target:target('dragon-shield')});stage.onpointermove({pointerId:40,clientX:90,clientY:80});stage.onpointerup({pointerId:40});const dragged=state().box;
 assert(Math.abs(dragged[0]+90*dragged[2]/375-worldX)<1e-9,'drawer reclaim preserves horizontal world anchor');assert(Math.abs(dragged[1]+80*dragged[3]/450-worldY)<1e-9,'drawer reclaim preserves vertical world anchor');assert.equal(state().selected,null);
 delete panel.hidden;panel.hidden=hidden;stage.clientHeight=450;api.resizeCamera();
 // Semantic cameras replace arbitrary scale increments; every dense target returns in <=2 outward actions.
 for(const id of ['marketplace','art-of-magic','magic-experiences']){api.go('floor');api.go(id);assert.equal(state().cameraView,id);api.zoom(1.5);assert.equal(state().cameraView,'floor')}
 api.go('art-of-magic');const artistArea=state().box;api.zoom(.65);assert.equal(state().cameraView,'artist-group');assert(el('#plus').disabled);api.zoom(1.5);assert.equal(state().cameraView,'art-of-magic');assert.deepEqual(state().box,artistArea);api.zoom(1.5);assert.equal(state().cameraView,'floor');
 api.zoom(.65);assert.equal(state().cameraView,'marketplace');assert(el('#plus').disabled);const readable=state().box;api.zoom(.65);assert.deepEqual(state().box,readable,'no arbitrary tiny intervals');
 api.go('magic-experiences');const activityMarkup=el('#map').innerHTML;assert(activityMarkup.includes('>Bloomburrow</text>'),'narrow activity retains complete readable name');assert(!activityMarkup.includes('Bloomb…'));
 // One wheel gesture, regardless of event count, advances only one purpose view.
 api.go('art-of-magic');for(let i=0;i<20;i++)el('#map').onwheel({deltaY:-100,preventDefault(){}});assert.equal(state().cameraView,'artist-group');
 // Drag moves only viewBox/minimap, never reconstructing labels or selectable geometry.
 api.go('marketplace');const geometry=el('#map').innerHTML,writesBefore=mapWrites;stage.onpointerdown({pointerId:41,clientX:200,clientY:200,target:{closest:()=>null}});for(let i=1;i<=12;i++)stage.onpointermove({pointerId:41,clientX:200-i*3,clientY:200-i*2});assert.equal(el('#map').innerHTML,geometry);assert.equal(mapWrites,writesBefore,'no geometry reconstruction during twelve pointer moves');stage.onpointercancel({pointerId:41});assert.equal(state().selected,null);stage.onpointerup({pointerId:41});assert.equal(state().selected,null);
 api.zoom(100);assert.equal(state().area,'floor');assert.equal(state().detailMode,null);assert(el('#minus').disabled);const overview=state().box;api.zoom(1.5);assert.deepEqual(state().box,overview);
 api.go('marketplace');for(let i=0;i<20;i++)api.pan(-1);assert.equal(state().box[0],328);for(let i=0;i<20;i++)api.pan(1);assert(state().box[0]+state().box[2]>=644.9);
 assert.equal(p.filter(q=>q.kind==='artist'&&!q.unbound).length,59);assert.equal(p.filter(q=>q.unbound).length,7);assert(p.filter(q=>q.unbound).every(q=>q.x===undefined));assert.equal(p.filter(q=>q.kind==='island').length,18);assert(by('c102-spindown').x>by('c101-showcase').x+by('c101-showcase').width);assert.equal(by('ticketed-play-upper').path,'M646 280 H800 V332 H990 V470 H646 Z');assert(by('ticketed-play-extension').y>by('ticketed-play-upper').y+by('ticketed-play-upper').height);assert.equal(by('show-store').level,5);assert.equal(by('show-store').room,'Thomas Murphy Ballroom');
 assert.equal(data.zones.find(q=>q.id==='morning-queue').width,94);assert.equal(by('morning-queue').width,44);for(const v of p.filter(q=>q.kind==='vendor')){assert(v.x>=340&&v.x+v.width<=635.01);assert(v.y>=157&&v.y+v.height<=339.01)}
 // Geometry regularization changes source edges, never identity, band membership or neighbor order.
 const original=data.marketplace.objects.filter(q=>q.kind==='vendor'&&q.names.length),vendors=p.filter(q=>q.kind==='vendor');
 assert.deepEqual(vendors.map(q=>q.id).sort(),original.map(q=>q.id).sort(),'every named source vendor exactly once');
 for(const a of vendors){assert.equal(a.width,29);assert([19,42].includes(a.height));assert.equal(a.x,340+a.displayColumn*33);assert.equal(a.y,157+a.displayBand*23);
  const source=original.find(q=>q.id===a.id);assert.equal(a.name,source.names.join(' / '));
  for(const b of vendors)if(a.id!==b.id)assert(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'no vendor overlap: '+a.id+'/'+b.id);
 }
 // Source band center order matters; source widths and tiny aisle offsets are deliberately not inherited.
 for(const a of original)for(const b of original){const aa=by(a.id),bb=by(b.id);if(aa.displayBand===bb.displayBand&&a.x+a.width/2<b.x+b.width/2)assert(aa.x<bb.x,'left/right order: '+a.id+'/'+b.id);if(aa.displayColumn===bb.displayColumn&&a.y<b.y)assert(aa.y<bb.y,'vertical order: '+a.id+'/'+b.id);}
 assert.equal(by('dragon-shield').displayBand,1);assert.equal(by('gamesgenic').displayBand,2);assert.equal(by('beadle-grimms').displayBand,1);assert(by('dragon-shield').x<by('beadle-grimms').x);assert.equal(by('dragon-shield').x,by('gamesgenic').x);
 const tall=['card-kingdom','stomping-grounds','cm-games'].map(by);assert.deepEqual(tall.map(q=>q.displayColumn),[4,5,6]);assert(tall.every(q=>q.displayBand===1&&q.height===42));
 assert.equal(by('pastimes').displayBand,0);assert.equal(by('tier-1').displayBand,0);assert(by('pastimes').x<by('tier-1').x);assert.equal(by('strike-zone').displayBand,1);assert.equal(by('manatrust').displayBand,7);
 api.go('marketplace');const detailMarkup=el('#map').innerHTML;assert(!/class="vendor-label"[^>]*>[^<]*…/.test(detailMarkup));
 const vendorLabels=[...detailMarkup.matchAll(/<text class="vendor-label"[^>]*font-size="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g)];assert.equal(vendorLabels.length,vendors.length,'all vendor names available at detail scale');assert.equal(new Set(vendorLabels.map(q=>q[1])).size,1,'one vendor screen font size');assert.equal(Number(vendorLabels[0][1])*375/state().box[2],12);assert(vendorLabels.every(q=>!q[2].includes('…')),'no vendor ellipses');assert.equal(JSON.stringify(data),originalDataSnapshot,'display transforms never mutate source geometry');
 assert(detailMarkup.includes('Radagast’s'));assert(detailMarkup.includes('Trading Cart'));assert(!detailMarkup.includes('Radagast…'));
 stage.clientWidth=1069;stage.clientHeight=720;api.resizeCamera();api.go('marketplace');assert(state().box[0]<=340&&state().box[0]+state().box[2]>=633,'desktop market fits all columns');stage.clientWidth=375;stage.clientHeight=450;api.resizeCamera();
 const w=p.find(q=>q.name==='Winona Nelson'),m=p.find(q=>q.name==='Mark Poole'),b=p.find(q=>q.name==='Ben Hill');assert(w.x>m.x&&w.y>b.y);assert(api.near(w).some(q=>q.name==='Mark Poole'));
 api.choose('morning-queue');assert(el('#panel').innerHTML.includes('Line up here before'));assert(!el('#map').innerHTML.includes('>WC<'));api.choose('wc-southart');api.go('floor');el('#back').onclick();assert.equal(state().selected,'wc-southart');
 api.setPersonalEvents([{id:'paid-test',title:'Paid event',day:'Fri',time:'1 PM',status:'paid',locationId:'c101-showcase',detail:'Paid detail'},{id:'commit-test',title:'Committed event',day:'Sat',time:'2 PM',status:'committed',locationId:'c101-showcase',detail:'Commit detail'},{id:'unplaced-test',title:'Unplaced event',day:'Sun',time:'3 PM',status:'paid',locationId:null,detail:'Unplaced detail'}]);
 api.choose('c101-showcase');assert.equal(api.eventsAt('c101-showcase').length,2);assert.match(el('#panel').innerHTML,/event-status paid/);assert.match(el('#panel').innerHTML,/event-status committed/);assert.match(el('#panel').innerHTML,/Sat · 2 PM/);api.openEvent('paid-test');assert.match(el('#panel').innerHTML,/Back to place/);assert.match(el('#panel').innerHTML,/Paid detail/);assert(!el('#map').innerHTML.includes('unplaced-test'));api.openEvents();assert.match(el('#panel').innerHTML,/Unplaced event/);api.openEvent('unplaced-test');assert.match(el('#panel').innerHTML,/Unplaced detail/);api.go('rooms');assert(!el('#panel').innerHTML.includes('Unplaced detail'));
 console.log(`PASS: ${ordinary.length} ordinary destinations × 7 input paths × 3 camera contexts; dense entry, filter cameras, neighbor LOD, gestures, resize, history, geometry/source invariants, events.`);
});
