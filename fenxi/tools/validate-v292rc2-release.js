#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=process.cwd();
let pass=0,fail=0;
function ok(cond,msg){ if(cond){console.log('PASS',msg);pass++;} else {console.error('FAIL',msg);fail++;} }
function pth(p){return path.join(root,p);}
function exists(p){return fs.existsSync(pth(p));}
function read(p){return fs.readFileSync(pth(p),'utf8');}
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(pth(p))).digest('hex');}
function has(p,re,msg){ok(exists(p),p+' exists'); if(exists(p)) ok(re.test(read(p)),msg||`${p} has ${re}`);}
function notHas(p,re,msg){ok(exists(p),p+' exists'); if(exists(p)) ok(!re.test(read(p)),msg||`${p} does not have ${re}`);}
function syntax(p){try{new Function(read(p)); ok(true,p+' syntax');}catch(e){console.error(e); ok(false,p+' syntax');}}

const html=read('fenxi/index.html');
has('fenxi/VERSION.txt',/V2\.92RC2｜启动顺序、监听去重与第6步布局定版/,'VERSION.txt is RC2');
has('fenxi/index.html',/V2\.92RC2｜启动顺序、监听去重与第6步布局定版/,'index title/header is RC2');
has('fenxi/index.html',/LN_DELAY_APP_START_V292RC2\s*=\s*true/,'index delays app start until all patches are loaded');
has('fenxi/index.html',/preloadRemainingV292RC2/,'index preloads remaining scripts after active base is known');
has('fenxi/index.html',/__LN_BOOT_ALL_SCRIPTS_READY_V292RC2/,'index marks all boot scripts ready');
has('fenxi/index.html',/LN_APP\.start\(\)/,'boot loader starts app after the full patch chain is loaded');

['export-md.v292rc2.css','stability-clean.v292rc2.css'].forEach(f=>has('fenxi/index.html',new RegExp(f.replace('.','\\.')+'\\?v=292rc2-20260515'),`index loads ${f}`));
['detail-lazy.v292rc2.js','render-events.v292rc2.js','export-md.v292rc2.js','stability-clean.v292rc2.js','interact-dedupe.v292rc2.js'].forEach(f=>has('fenxi/index.html',new RegExp(f.replace('.','\\.')),`boot loads ${f}`));
['detail-lazy.v292rc.js','export-md.v292rc.js','stability-clean.v292rc.js','export-md.v292rc1.js','stability-clean.v292rc1.js','interact-dedupe.v29rc2.js'].forEach(f=>ok(!html.includes('assets/'+f),`old runtime script not loaded: ${f}`));

const orderNames=['app.v2981.js','detail-lazy.v292rc2.js','rules-final-decision.v292rc1.js','render-events.v292rc2.js','export-md.v292rc2.js','stability-clean.v292rc2.js','interact-dedupe.v292rc2.js'];
const positions=Object.fromEntries(orderNames.map(x=>[x,html.indexOf('assets/'+x)]));
for(const x of orderNames) ok(positions[x]>=0,`order marker exists ${x}`);
ok(positions['app.v2981.js'] < positions['detail-lazy.v292rc2.js'],'app file may load before patches but app start is delayed');
ok(positions['detail-lazy.v292rc2.js'] < positions['render-events.v292rc2.js'],'detail lazy loads before render events');
ok(positions['rules-final-decision.v292rc1.js'] < positions['render-events.v292rc2.js'],'final decision loads before render events');
ok(positions['render-events.v292rc2.js'] < positions['export-md.v292rc2.js'],'render events load before export md');

has('fenxi/assets/app.v2981.js',/startDelayed:!!window\.LN_DELAY_APP_START_V292RC2/,'app exposes delayed start state');
has('fenxi/assets/app.v2981.js',/__LN_APP_START_PENDING_V292RC2=true/,'app does not auto-start while boot chain is incomplete');
has('fenxi/assets/app.v2981.js',/v292rc2:true/,'app debug marks rc2 deferred state');
notHas('fenxi/assets/app.v2981.js',/if\(!document\.body \|\| document\.body\.dataset\.diagnostics !== '1'\) startV2953Fix5\(\);/,'old immediate app start removed');

has('fenxi/assets/interact-dedupe.v292rc2.js',/routedToScheduler:true/,'dedupe routes control refresh through scheduler');
has('fenxi/assets/interact-dedupe.v292rc2.js',/ensureDataForCurrentRank/,'dedupe documents data chunk protection path');
has('fenxi/assets/interact-dedupe.v292rc2.js',/filterSubjectGroup/,'dedupe fingerprint uses current subject group id');
has('fenxi/assets/interact-dedupe.v292rc2.js',/filterTaxConfidence/,'dedupe fingerprint uses current taxonomy confidence id');
has('fenxi/assets/interact-dedupe.v292rc2.js',/filterSchoolTier/,'dedupe fingerprint uses current school tier id');
has('fenxi/assets/interact-dedupe.v292rc2.js',/filterFeeType/,'dedupe fingerprint uses current fee type id');
has('fenxi/assets/interact-dedupe.v292rc2.js',/targetCities/,'dedupe fingerprint uses current city input id');

has('fenxi/assets/render-events.v292rc2.js',/ln:cards-rendered/,'render events dispatch cards event');
has('fenxi/assets/render-events.v292rc2.js',/ln:abc-rendered/,'render events dispatch abc event');
has('fenxi/assets/export-md.v292rc2.js',/exportMdObserver:'events-only'/,'export md uses event-only refresh');
notHas('fenxi/assets/export-md.v292rc2.js',/MutationObserver/,'export md rc2 has no MutationObserver');
notHas('fenxi/assets/export-md.v292rc2.js',/setInterval/,'export md rc2 has no interval polling');
has('fenxi/assets/export-md.v292rc2.js',/querySelector\(':scope > \.rightPanel'\)/,'selected md button targets right panel only');
notHas('fenxi/assets/export-md.v292rc2.js',/var side=cand\|\|cand/,'export md no longer falls back to candidateArea as button host');

has('fenxi/assets/stability-clean.v292rc2.css',/#candidateArea\.step6,#candidateArea\.candidate-step-v292rc2/,'candidateArea grid locked by rc2 css');
has('fenxi/assets/stability-clean.v292rc2.css',/#candidateArea\.step6:before,#candidateArea\.candidate-step-v292rc2:before/,'candidateArea pseudo label disabled by rc2 css');
has('fenxi/assets/stability-clean.v292rc2.css',/grid-template-columns:minmax\(0,1fr\) minmax\(280px,340px\)/,'step6 right rail width is constrained');
has('fenxi/assets/stability-clean.v292rc2.js',/candidateAreaGridFixed:true/,'stability clean debug flag records grid fix');

const protectedHashes={
 'fenxi/assets/compute-pipeline.v2983.js':'e13b600b1344168b8f362a05b81d3280c20bb114bdcd20b39a57e8a53ce48425',
 'fenxi/assets/filter-engine.v298fix1.js':'554534209df5090ffc56bb43d44d3dfc008cf28a77b136932ccb1a3e73a4e5cc',
 'fenxi/assets/plan-engine.v297fix2.js':'6784b9d103cbaf33277bffff3b4711cbea6b97748563fad6d2d0c60fc3c29069',
 'fenxi/assets/region-filter-rules.v2983fix5.js':'ae05166286f1fea36f3e4d3f34574872eaff028f5770b27b52c54fc0bf095610',
 'fenxi/assets/rules-closure.v291rc0closure5fix1.js':'faf96db641241b001301153d406ac0ecffaa84ba52011962cb4c87e44635cfc8',
 'fenxi/data/rank_2025_physics.json':'1ada0679fe13c57810f0ec26a3fe020adae9b363776393b597b4dc85b0d02d81',
 'fenxi/data/chunks/rank_00000_10000.json':'ced980c815d501c6f65664320f9be9eef7ca5dc1d1a5b4e9843010137a6b0433',
 'fenxi/data/chunks/rank_10000_20000.json':'38d12adffdacb21858314148c6511d15deb69ad977409a41a8937f2afe2f3a79',
 'fenxi/data/chunks/rank_20000_30000.json':'dde7d3d44e24e2c615a318a51e3a093d4ca0188bcf9528be89641d0c89994233',
 'fenxi/data/chunks/rank_30000_50000.json':'4ca151e5f8b61d52dc3f4cce0c9d3fde138f05ef5a762adccefc79abc9b69b2e',
 'fenxi/data/chunks/rank_50000_80000.json':'e62360e0c59441be98a781db346bce0b1f1dbfa6718c3d96465269e827b613c7',
 'fenxi/data/chunks/rank_80000_plus.json':'0dfcfed3e9e712ca4617535478b23643d759cae8bce86b80c775861d42ac5f3f'
};
for(const [file,expected] of Object.entries(protectedHashes)) ok(exists(file)&&sha(file)===expected,`protected core/data unchanged: ${file}`);

['fenxi/assets/app.v2981.js','fenxi/assets/detail-lazy.v292rc2.js','fenxi/assets/render-events.v292rc2.js','fenxi/assets/export-md.v292rc2.js','fenxi/assets/stability-clean.v292rc2.js','fenxi/assets/interact-dedupe.v292rc2.js','fenxi/assets/rules-final-decision.v292rc1.js'].forEach(syntax);

const loaded=[...html.matchAll(/"(assets\/[^"]+\.js)"/g)].map(m=>m[1]);
loaded.forEach(f=>ok(exists('fenxi/'+f),`loaded script exists: ${f}`));
console.log(`RESULT PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
