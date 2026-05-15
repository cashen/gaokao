#!/usr/bin/env node
const fs=require('fs'); const path=require('path'); const crypto=require('crypto');
const root=path.resolve(__dirname,'..'); let pass=0, fail=0;
function ok(name, cond, detail=''){ if(cond){pass++; console.log('PASS',name,detail);} else {fail++; console.error('FAIL',name,detail);} }
function exists(p){return fs.existsSync(path.join(root,p));}
function text(p){return fs.readFileSync(path.join(root,p),'utf8');}
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');}
const idx=text('index.html');
const ver=text('VERSION.txt');
ok('version txt V2.93RC1.fix1', /V2\.93RC1\.fix1/.test(ver));
ok('index title V2.93RC1.fix1', /V2\.93RC1\.fix1/.test(idx));
ok('stamp 293rc1fix1', /293rc1fix1-20260515/.test(idx) && /293rc1fix1-20260515/.test(ver));
ok('body class v293rc1fix1', /v293rc1fix1/.test(idx));
ok('normalized base function exists', /function normalizedToolBaseV293RC1Fix1\(\)/.test(idx));
ok('candidateBases uses normalized base', /function candidateBases\(\)[\s\S]*normalizedToolBaseV293RC1Fix1\(\)[\s\S]*return uniq\(\[base\]\)/.test(idx));
ok('no root asset fallback in candidateBases', !/return uniq\(\[[^\]]*'\/'/.test(idx));
ok('no absolute /assets hardcode', !/["']\/assets\//.test(idx));
ok('boot path debug marker exists', /__LN_BOOT_PATH_STANDARDIZED_V293RC1FIX1/.test(idx));
ok('domain agnostic marker exists', /domainAgnostic:true/.test(idx));
ok('root fallback disabled marker exists', /rootFallback:false/.test(idx) && /noRootFallback:true/.test(idx));
['assets/infra-core.v293rc1.js','assets/app-postmain.v293rc1.js','assets/family-read-final.v293rc1.js','assets/app-runtime.v293rc1.js','assets/model-light.v293rc1.js','assets/app-final.v293rc1.css'].forEach(p=>ok('exists '+p, exists(p)));
ok('default loads infra bundle', /assets\/infra-core\.v293rc1\.js/.test(idx));
ok('default loads app runtime bundle', /assets\/app-runtime\.v293rc1\.js/.test(idx));
ok('merge opt rollback exists', /LN_V293RC1_MERGE_OPT/.test(idx));
['assets/compute-pipeline.v2983.js','assets/filter-engine.v298fix1.js','assets/plan-engine.v297fix2.js','assets/region-filter-rules.v2983fix5.js','assets/rules-closure.v291rc0closure5fix1.js','data/rank_2025_physics.json'].forEach(p=>ok('immutable present '+p, exists(p) && fs.statSync(path.join(root,p)).size>100));
['assets/infra-core.v293rc1.js','assets/app-postmain.v293rc1.js','assets/family-read-final.v293rc1.js','assets/app-runtime.v293rc1.js','assets/model-light.v293rc1.js'].forEach(p=>{ try{ new Function(text(p)); ok('syntax '+p,true); }catch(e){ ok('syntax '+p,false,e.message); }});
const arr=idx.match(/const filesRulesBundled=(\[.*?\]);/); const files=arr?JSON.parse(arr[1]):[];
ok('boot js count <= 50', files.length<=50, String(files.length));
const css=[...idx.matchAll(/<link[^>]+href="\.\/assets\/([^"]+\.css)\?/g)].map(m=>m[1]);
ok('css count <= 3', css.length<=3, String(css.length));
// Pure reference cases for the normalized base policy.
function infer(path){
  if(path.endsWith('/')) return path;
  const last=path.slice(path.lastIndexOf('/')+1);
  if(last==='fenxi') return path+'/';
  if(/\.[a-z0-9]{1,10}$/i.test(last)) return path.replace(/\/[^\/]*$/, '/') || '/';
  return path.replace(/\/[^\/]*$/, '/') || '/';
}
const cases={
  '/fenxi/':'/fenxi/',
  '/fenxi':'/fenxi/',
  '/fenxi/index.html':'/fenxi/',
  '/fenxi/diagnostics':'/fenxi/',
  '/abc/fenxi/':'/abc/fenxi/',
  '/abc/fenxi':'/abc/fenxi/',
  '/abc/fenxi/diagnostics':'/abc/fenxi/'
};
for(const [input,expected] of Object.entries(cases)) ok('base case '+input, infer(input)===expected, infer(input));
console.log(`RESULT PASS ${pass} / FAIL ${fail}`); process.exit(fail?1:0);
