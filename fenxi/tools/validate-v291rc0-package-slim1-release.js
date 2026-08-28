#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
function ok(cond, msg){ if(cond){ pass++; } else { fail++; console.error('FAIL:', msg); } }
function exists(p){ return fs.existsSync(path.join(root, p)); }
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }

ok(exists('index.html'), 'index.html exists');
ok(exists('debug.html'), 'debug.html exists');
ok(exists('VERSION.txt'), 'VERSION.txt exists');
ok(read('VERSION.txt').includes('V2.91RC0.package-slim1'), 'VERSION package-slim1');
ok(read('index.html').includes('V2.91RC0.package-slim1'), 'index package-slim1');
ok(read('debug.html').includes('V2.91RC0.package-slim1'), 'debug package-slim1');

ok(exists('pendingdel/README.md'), 'pendingdel README exists');
ok(exists('pendingdel/pendingdel-manifest.json'), 'pendingdel manifest exists');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'pendingdel','pendingdel-manifest.json'),'utf8'));
ok(manifest.version === 'V2.91RC0.package-slim1', 'manifest version');
ok(manifest.counts && manifest.counts.js === 62, 'manifest js count 62');
ok(manifest.counts && manifest.counts.css === 5, 'manifest css count 5');
ok(manifest.counts && manifest.counts.total === 67, 'manifest total count 67');

for (const f of manifest.files){
  ok(!exists(f.from.replace(/^fenxi\//,'')), 'retired removed from active assets: '+f.from);
  ok(fs.existsSync(path.join(root,'..',f.to)), 'retired exists in pendingdel: '+f.to);
}

// Ensure key active files remain.
[
'assets/compute-pipeline.v2983.js',
'assets/filter-engine.v298fix1.js',
'assets/plan-engine.v297fix2.js',
'assets/rules-interest-core.v291rc0rules1.js',
'assets/ui-form-step-core.v291rc0ui1.js',
'assets/app-coordinator.v291rc0coord1.js',
'assets/interact-stability.v29rc1.js',
'assets/interact-dedupe.v29rc2.js',
'assets/safeperf.v29rc1.js'
].forEach(f=>ok(exists(f), 'key active file remains: '+f));

// Ensure rollback files from rules/ui bundle still remain.
[
'assets/interest-taxonomy.v298.js',
'assets/child-intent-translator.v298fix1.js',
'assets/catalog-match-engine.v298.js',
'assets/path-explain-engine.v298.js',
'assets/admission-safety-rules.v2981.js',
'assets/abc-view.v298.js',
'assets/candidate-card-view.v298.js',
'assets/child-interest-ui.v298fix1.js',
'assets/scenario-ui.v298.js',
'assets/abc-light-ui.v2983fix3.js',
'assets/interest-drawer-slim.v2983fix4.js'
].forEach(f=>ok(exists(f), 'rollback-only file remains: '+f));

// Syntax check JS in active assets and pendingdel.
function walk(dir, arr=[]){
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})){
    const p=path.join(dir, ent.name);
    if(ent.isDirectory()) walk(p, arr); else arr.push(p);
  }
  return arr;
}
const activeAssetDir = path.join(root, 'assets');
const pendingAssetDir = path.join(root, 'pendingdel', 'assets');
const jsFiles = walk(activeAssetDir).filter(p=>p.endsWith('.js')).concat(walk(pendingAssetDir).filter(p=>p.endsWith('.js')));
for (const f of jsFiles){
  try { new Function(fs.readFileSync(f,'utf8')); pass++; } catch(e){ fail++; console.error('FAIL: JS syntax', f, e.message); }
}

// JSON parse check.
for (const f of walk(root).filter(p=>p.endsWith('.json')).concat(walk(path.join(root,'pendingdel')).filter(p=>p.endsWith('.json')))){
  try { JSON.parse(fs.readFileSync(f,'utf8')); pass++; } catch(e){ fail++; console.error('FAIL: JSON parse', f, e.message); }
}

console.log(`V2.91RC0.package-slim1 validate: ${pass}/${pass+fail} passed`);
if(fail) process.exit(1);
