#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg){ if(cond){ pass++; } else { fail++; console.error('FAIL:', msg); } }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function walk(dir, arr=[]){ if(!fs.existsSync(dir)) return arr; for(const ent of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir, ent.name); if(ent.isDirectory()) walk(p, arr); else arr.push(p); } return arr; }

ok(exists('index.html'), 'index exists');
ok(exists('debug.html'), 'debug exists');
ok(exists('VERSION.txt'), 'VERSION exists');
ok(read('VERSION.txt').includes('V2.91RC0.model-audit1'), 'VERSION model-audit1');
ok(read('index.html').includes('V2.91RC0.model-audit1'), 'index model-audit1');
ok(read('debug.html').includes('V2.91RC0.model-audit1'), 'debug model-audit1');
ok(read('index.html').includes("LN_MODEL_AUDIT_VERSION = '291rc0-model-audit1-20260513'"), 'index model audit version');
ok(read('index.html').includes('assets/model-audit.v291rc0modelaudit1.js'), 'index loads model audit asset');
ok(exists('assets/model-audit.v291rc0modelaudit1.js'), 'model audit asset exists');
ok(read('assets/model-audit.v291rc0modelaudit1.js').includes('doesModifyFormula'), 'model audit policy embedded');
ok(exists('docs/JSON_MODEL_DEPENDENCY_MAP.md'), 'JSON model dependency doc exists');
ok(exists('docs/JSON_MODEL_AUDIT_DATA.v291rc0modelaudit1.json'), 'JSON model audit data exists');
ok(read('assets/debug-selftest.v2983fix12.js').includes('model-audit1 JSON模型审计注册表检查'), 'debug selftest model audit step exists');

const audit = JSON.parse(read('docs/JSON_MODEL_AUDIT_DATA.v291rc0modelaudit1.json'));
ok(audit.version === '291rc0-model-audit1-20260513', 'audit data version');
ok(audit.policy && audit.policy.doesModifyFormula === false, 'audit does not modify formula');
ok(audit.policy && audit.policy.doesModifyData === false, 'audit does not modify data');
ok(audit.policy && audit.policy.doesLazyLoad === false, 'audit does not lazy load');
ok(audit.policy && audit.policy.doesShard === false, 'audit does not shard');
ok(Array.isArray(audit.files) && audit.files.length >= 50, 'audit files >= 50');
ok(audit.summary && audit.summary.topHeavy && audit.summary.topHeavy.length >= 6, 'audit heavy files recorded');
['data/confusable_major_model/confusable_major_detected_pairs_v29462.json','data/major_name_model/admission_to_catalog_map_v2944.json','data/major_name_model/admission_major_raw_v2944.json','data/taxonomy_runtime/admission_major_review_v2942.json'].forEach(f=>ok(audit.files.some(x=>x.path===f), 'audit includes '+f));

// Ensure key core chain remains.
['assets/compute-pipeline.v2983.js','assets/filter-engine.v298fix1.js','assets/plan-engine.v297fix2.js','assets/rules-interest-core.v291rc0rules1.js','assets/ui-form-step-core.v291rc0ui1.js','assets/app-coordinator.v291rc0coord1.js','assets/interact-stability.v29rc1.js','assets/interact-dedupe.v29rc2.js','assets/safeperf.v29rc1.js'].forEach(f=>ok(exists(f), 'key active file remains '+f));

ok(exists('pendingdel/README.md'), 'pendingdel remains');
ok(exists('pendingdel/pendingdel-manifest.json'), 'pendingdel manifest remains');
const pd = JSON.parse(read('pendingdel/pendingdel-manifest.json'));
ok(pd.counts && pd.counts.total === 67, 'pendingdel total remains 67');

// Syntax and JSON parse.
for (const f of walk(path.join(root,'assets')).filter(p=>p.endsWith('.js')).concat(walk(path.join(root,'pendingdel')).filter(p=>p.endsWith('.js')))){
  try { new Function(fs.readFileSync(f,'utf8')); pass++; } catch(e){ fail++; console.error('FAIL JS syntax', f, e.message); }
}
for (const f of walk(root).filter(p=>p.endsWith('.json'))){
  try { JSON.parse(fs.readFileSync(f,'utf8')); pass++; } catch(e){ fail++; console.error('FAIL JSON parse', f, e.message); }
}
console.log(`V2.91RC0.model-audit1 validate: ${pass}/${pass+fail} passed`);
if(fail) process.exit(1);
