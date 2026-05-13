#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
let pass=0, fail=0;
function ok(name, cond){ if(cond){pass++; console.log('✓ '+name);} else {fail++; console.error('✗ '+name);} }
function walk(dir, arr=[]){ for(const f of fs.readdirSync(path.join(root,dir))){ const p=path.join(dir,f); const full=path.join(root,p); const st=fs.statSync(full); if(st.isDirectory()) walk(p,arr); else arr.push(p); } return arr; }
const idx=read('fenxi/index.html');
ok('index version model-lazy1', idx.includes('V2.91RC0.model-lazy1') && idx.includes('291rc0-model-lazy1-20260513'));
ok('model lazy flag declared', idx.includes('LN_MODEL_LAZY_OPT') && idx.includes('LN_MODEL_LAZY_VERSION'));
ok('model lazy script loaded', idx.includes('assets/model-lazy.v291rc0lazy1.js'));
ok('model audit remains loaded', idx.includes('assets/model-audit.v291rc0modelaudit1.js'));
ok('model lazy asset exists', exists('fenxi/assets/model-lazy.v291rc0lazy1.js'));
ok('app graduate catalog lazy patch exists', read('fenxi/assets/app.v2981.js').includes('lazyGraduateCatalogV291'));
ok('major name cold supplement exists', read('fenxi/assets/major-name-model.v2946.js').includes('loadMajorNameColdSupplementV2944'));
ok('confusable cold supplement exists', read('fenxi/assets/confusable-major-model.v29462.js').includes('loadConfusableMajorColdSupplementV2946'));
ok('debug selftest model lazy step exists', read('fenxi/assets/debug-selftest.v2983fix12.js').includes('model-lazy1 非首屏模型延后加载检查'));
ok('docs update exists', exists('fenxi/docs/V2.91RC0.model-lazy1_更新说明.md') && exists('fenxi/docs/V2.91RC0.model-lazy1_验证清单.md'));
['compute-pipeline.v2983.js','filter-engine.v298fix1.js','plan-engine.v297fix2.js','region-filter-rules.v2983fix5.js'].forEach(f=>ok('core engine preserved '+f, exists('fenxi/assets/'+f)));
// Syntax check all JS
for(const p of walk('fenxi/assets').filter(x=>x.endsWith('.js'))){ try{ new Function(read(p)); pass++; } catch(e){ fail++; console.error('✗ JS syntax '+p+': '+e.message); } }
// JSON parse check
for(const p of walk('fenxi/data').filter(x=>x.endsWith('.json'))){ try{ JSON.parse(read(p)); pass++; } catch(e){ fail++; console.error('✗ JSON parse '+p+': '+e.message); } }
console.log(`V2.91RC0.model-lazy1 validate: ${pass}/${pass+fail} passed`);
if(fail) process.exit(1);
