#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const idx = fs.readFileSync(path.join(root,'index.html'),'utf8');
let pass=0, fail=0;
function ok(cond,msg){ if(cond){console.log('PASS',msg);pass++;}else{console.error('FAIL',msg);fail++;} }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function sha(p){ return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex'); }
ok(idx.includes('V2.93RC1.mainline.fix1｜核心JSON加载韧性修正版'),'index version is V2.93RC1.mainline.fix1');
ok(idx.includes('293rc1-mainline-fix1-20260515'),'index stamp is fix1');
ok(idx.includes('LN_BOOT_PRELOAD_V293RC1_MAINLINE = false'),'bulk script preload disabled by default');
ok(idx.includes('LN_JSON_RETRY_ATTEMPTS_V293RC1_MAINLINE_FIX1'),'json retry attempts flag exists');
ok(!idx.includes('infra-core.v293rc1.js'),'no infra-core boot entry');
ok(!idx.includes('model-light.v293rc1.js'),'no model-light boot entry');
ok(!idx.includes('app-runtime.v293rc1.js'),'no app-runtime boot entry');
ok(!/['"]\/assets\//.test(idx),'no root /assets reference in index');
['assets/app.v2981.js','assets/data-engine.v297fix2.js','assets/detail-lazy.v292rc1.js','assets/export-md.v292rc1.js','assets/stability-clean.v292rc1.js','assets/interact-dedupe.v29rc2.js'].forEach(f=>ok(exists(f),f+' exists'));
const de=read('assets/data-engine.v297fix2.js');
ok(de.includes('LN_JSON_RETRY_VERSION_V293RC1_MAINLINE_FIX1'),'data-engine has json retry version marker');
ok(de.includes('fetchJsonTextWithRetryV293RC1MainlineFix1'),'data-engine uses fetch text retry helper');
ok(de.includes('返回HTML，疑似部署缺文件或站点fallback'),'data-engine detects HTML fallback');
ok(de.includes('LN_DATA_ENGINE_JSON_RETRY_V293RC1_MAINLINE_FIX1'),'data-engine exposes retry debug marker');
const app=read('assets/app.v2981.js');
ok(app.includes('LN_CORE_JSON_SEQUENTIAL_V293RC1_MAINLINE_FIX1'),'app has sequential core json switch');
ok(app.includes('coreJsonSequential'), 'app writes core json sequential debug flag');
ok(app.includes('__LN_APP_STARTED_V293RC1_MAINLINE'),'app start idempotent guard remains');
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
