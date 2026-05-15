#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const idx = fs.readFileSync(path.join(root,'index.html'),'utf8');
let pass=0, fail=0;
function ok(cond,msg){ if(cond){console.log('PASS',msg);pass++;}else{console.error('FAIL',msg);fail++;} }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function sha(p){ return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'); }
ok(idx.includes('V2.93RC1｜主线文件回填与启动稳定版'),'index version is V2.93RC1 mainline');
ok(idx.includes('LN_DELAY_APP_START_V293RC1_MAINLINE'),'app start is delayed until current mainline files finish loading');
ok(!idx.includes('infra-core.v293rc1.js'),'no infra-core boot entry');
ok(!idx.includes('model-light.v293rc1.js'),'no model-light boot entry');
ok(!idx.includes('app-runtime.v293rc1.js'),'no app-runtime boot entry');
ok(!idx.includes('app-final.v293rc1.css'),'no app-final css entry');
ok(!/['"]\/assets\//.test(idx),'no root /assets reference in index');
['assets/app.v2981.js','assets/detail-lazy.v292rc1.js','assets/export-md.v292rc1.js','assets/export-md.v292rc1.css','assets/stability-clean.v292rc1.js','assets/stability-clean.v292rc1.css','assets/interact-dedupe.v29rc2.js'].forEach(f=>ok(exists(f),f+' exists'));
const app=fs.readFileSync(path.join(root,'assets/app.v2981.js'),'utf8');
ok(app.includes('LN_RENDER_EVENTS_V293RC1_MAINLINE'),'render event bridge backfilled into app.v2981.js');
ok(app.includes('__LN_APP_STARTED_V293RC1_MAINLINE'),'app start idempotent guard exists');
const emd=fs.readFileSync(path.join(root,'assets/export-md.v292rc1.js'),'utf8');
ok(emd.includes('293rc1-mainline'),'export-md current filename contains v293rc1 mainline code');
ok(emd.includes('events-only') || emd.includes('ln:cards-rendered'),'export-md uses render events');
const st=fs.readFileSync(path.join(root,'assets/stability-clean.v292rc1.js'),'utf8');
ok(st.includes('candidateAreaGridFixed') || st.includes('candidateAreaFixed'),'stability clean has candidate area guard');
const core=[
 'assets/compute-pipeline.v2983.js',
 'assets/filter-engine.v298fix1.js',
 'assets/plan-engine.v297fix2.js',
 'assets/region-filter-rules.v2983fix5.js',
 'assets/rules-closure.v291rc0closure5fix1.js',
 'data/rank_2025_physics.json'
];
core.forEach(f=>ok(exists(f),f+' protected file exists sha256='+sha(f).slice(0,12)));
console.log(`RESULT PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
