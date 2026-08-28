#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const errors = [];
const checks = [];
function ok(name, cond, msg){ checks.push({name, ok:!!cond, msg:msg||''}); if(!cond) errors.push(`${name}${msg?': '+msg:''}`); }
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel){ return fs.existsSync(path.join(root, rel)); }
function sha(rel){ return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex'); }

ok('no fenxi/v3', !exists('v3'), 'V3 branch must not be included');
ok('VERSION exists', exists('VERSION.txt'));
const version = exists('VERSION.txt') ? read('VERSION.txt') : '';
ok('VERSION is interact2', /V2\.9RC\.fix-interact2/.test(version));
ok('stamp is interact2', /29rc-interact2-20260513/.test(version));

ok('index exists', exists('index.html'));
const index = exists('index.html') ? read('index.html') : '';
ok('index title interact2', /V2\.9RC\.fix-interact2/.test(index));
ok('tool stamp interact2', /__LN_TOOL_STAMP='29rc-interact2-20260513'/.test(index));
ok('dedupe opt declared', /LN_INTERACT_DEDUPE_OPT\s*=\s*true/.test(index));
ok('dedupe version declared', /LN_INTERACT_DEDUPE_VERSION\s*=\s*'29rc-interact2-20260513'/.test(index));
ok('dedupe script loaded', /assets\/interact-dedupe\.v29rc2\.js/.test(index));
ok('interact1 still loaded before interact2', index.indexOf('assets/interact-stability.v29rc1.js') >= 0 && index.indexOf('assets/interact-stability.v29rc1.js') < index.indexOf('assets/interact-dedupe.v29rc2.js'));

ok('dedupe asset exists', exists('assets/interact-dedupe.v29rc2.js'));
const dedupe = exists('assets/interact-dedupe.v29rc2.js') ? read('assets/interact-dedupe.v29rc2.js') : '';
ok('dedupe exposes version', /29rc-interact2-20260513/.test(dedupe));
ok('dedupe wraps applyFilters', /window\.applyFilters\s*=\s*wrapped/.test(dedupe));
ok('dedupe has fingerprint guard', /getFilterFingerprint/.test(dedupe) && /direct-duplicate/.test(dedupe));
ok('dedupe has debug detail', /interactDedupe/.test(dedupe));

ok('safeperf still exists', exists('assets/safeperf.v29rc1.js'));
ok('interact1 still exists', exists('assets/interact-stability.v29rc1.js'));
ok('compute-pipeline exists', exists('assets/compute-pipeline.v2983.js'));
ok('plan-engine exists', exists('assets/plan-engine.v297fix2.js'));
ok('filter-engine exists', exists('assets/filter-engine.v298fix1.js'));

ok('docs update exists', exists('docs/V2.9RC.fix-interact2_更新说明.md'));
ok('docs checklist exists', exists('docs/V2.9RC.fix-interact2_验证清单.md'));

ok('manifest exists', exists('data/manifest.json'));
ok('rank exists', exists('data/rank_2025_physics.json'));
ok('taxonomy runtime exists', exists('data/taxonomy_runtime/major_taxonomy.json'));
ok('school geo exists', exists('data/school_geo_model/school_geo_reference_v29471.json'));

// Parse all JSON under data.
function walk(dir){
  let out=[];
  for(const name of fs.readdirSync(dir)){
    const p = path.join(dir,name);
    const st = fs.statSync(p);
    if(st.isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
}
for(const p of walk(path.join(root,'data')).filter(p=>p.endsWith('.json'))){
  try{ JSON.parse(fs.readFileSync(p,'utf8')); }
  catch(e){ errors.push(`JSON parse failed: ${path.relative(root,p)} ${e.message}`); }
}

// Syntax check selected new/runtime JS by compiling.
for(const rel of ['assets/interact-dedupe.v29rc2.js','assets/interact-stability.v29rc1.js','assets/safeperf.v29rc1.js']){
  try{ new Function(read(rel)); }
  catch(e){ errors.push(`JS syntax failed: ${rel} ${e.message}`); }
}

console.log(`V2.9RC.fix-interact2 validate: ${checks.filter(c=>c.ok).length}/${checks.length} passed`);
for(const c of checks){ console.log(`${c.ok?'✓':'✗'} ${c.name}${c.msg?' - '+c.msg:''}`); }
if(errors.length){ console.error('\nErrors:'); errors.forEach(e=>console.error(' - '+e)); process.exit(1); }
console.log('All checks passed.');
