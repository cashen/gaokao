#!/usr/bin/env node
const fs=require('fs'); const path=require('path'); const crypto=require('crypto');
const root=path.resolve(__dirname,'..'); let pass=0, fail=0;
function ok(name, cond, detail=''){ if(cond){pass++; console.log('PASS',name,detail);} else {fail++; console.error('FAIL',name,detail);} }
function exists(p){return fs.existsSync(path.join(root,p));}
function text(p){return fs.readFileSync(path.join(root,p),'utf8');}
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');}
const idx=text('index.html');
const ver=text('VERSION.txt');
ok('version txt V2.93RC1', /V2\.93RC1/.test(ver));
ok('index title V2.93RC1', /V2\.93RC1/.test(idx));
ok('body class v293rc1', /v293rc1/.test(idx));
['assets/infra-core.v293rc1.js','assets/app-postmain.v293rc1.js','assets/family-read-final.v293rc1.js','assets/app-runtime.v293rc1.js','assets/model-light.v293rc1.js','assets/app-final.v293rc1.css'].forEach(p=>ok('exists '+p, exists(p)));
ok('default loads infra bundle', /assets\/infra-core\.v293rc1\.js/.test(idx));
ok('default loads app runtime bundle', /assets\/app-runtime\.v293rc1\.js/.test(idx));
ok('default loads postmain bundle', /assets\/app-postmain\.v293rc1\.js/.test(idx));
ok('default css merged', /app-final\.v293rc1\.css/.test(idx));
ok('old rc2 runtime not default loaded', !/filesRulesBundled=.*detail-lazy\.v292rc2/.test(idx));
ok('old rc2 export not default loaded', !/filesRulesBundled=.*export-md\.v292rc2/.test(idx));
ok('old confusable light not default loaded', !/filesRulesBundled=.*confusable-light\.v292rc1/.test(idx));
ok('merge opt rollback exists', /LN_V293RC1_MERGE_OPT/.test(idx));
ok('runtime debug marker exists', /LN_RUNTIME_V293RC1/.test(text('assets/app-runtime.v293rc1.js')));
ok('does not rename compute pipeline', exists('assets/compute-pipeline.v2983.js'));
ok('does not rename filter engine', exists('assets/filter-engine.v298fix1.js'));
ok('does not rename plan engine', exists('assets/plan-engine.v297fix2.js'));
ok('does not rename closure5fix1', exists('assets/rules-closure.v291rc0closure5fix1.js'));
// Guard known immutable files are still present and not empty.
['assets/compute-pipeline.v2983.js','assets/filter-engine.v298fix1.js','assets/plan-engine.v297fix2.js','assets/region-filter-rules.v2983fix5.js','assets/rules-closure.v291rc0closure5fix1.js','data/rank_2025_physics.json'].forEach(p=>ok('immutable present '+p, exists(p) && fs.statSync(path.join(root,p)).size>100));
// Syntax check merged JS using Function constructor after removing HTML/script assumptions is still syntax valid.
['assets/infra-core.v293rc1.js','assets/app-postmain.v293rc1.js','assets/family-read-final.v293rc1.js','assets/app-runtime.v293rc1.js','assets/model-light.v293rc1.js'].forEach(p=>{ try{ new Function(text(p)); ok('syntax '+p,true); }catch(e){ ok('syntax '+p,false,e.message); }});
const arr=idx.match(/const filesRulesBundled=(\[.*?\]);/); const files=arr?JSON.parse(arr[1]):[];
ok('boot js count <= 50', files.length<=50, String(files.length));
const css=[...idx.matchAll(/<link[^>]+href="\.\/assets\/([^"]+\.css)\?/g)].map(m=>m[1]);
ok('css count <= 3', css.length<=3, String(css.length));
console.log(`RESULT PASS ${pass} / FAIL ${fail}`); process.exit(fail?1:0);
