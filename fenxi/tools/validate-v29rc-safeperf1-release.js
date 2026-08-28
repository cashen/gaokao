#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const checks = [];
function ok(name, pass, detail='') { checks.push({name, pass, detail}); }
function exists(rel){ return fs.existsSync(path.join(root, rel)); }
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function jsonOk(rel){ try{ JSON.parse(read(rel)); return true; }catch(e){ return false; } }

ok('不存在 fenxi/v3 目录', !exists('v3'));
ok('VERSION.txt 存在', exists('VERSION.txt'));
ok('VERSION.txt 版本正确', exists('VERSION.txt') && /V2\.9RC\.fix-safeperf1/.test(read('VERSION.txt')));
ok('index.html 存在', exists('index.html'));
ok('index.html 版本显示正确', exists('index.html') && /V2\.9RC\.fix-safeperf1/.test(read('index.html')));
ok('LN_SAFE_PERF_OPT 开关存在', exists('index.html') && /LN_SAFE_PERF_OPT\s*=\s*true/.test(read('index.html')));
ok('safeperf asset 存在', exists('assets/safeperf.v29rc1.js'));
ok('safeperf asset 已加载', exists('index.html') && /assets\/safeperf\.v29rc1\.js/.test(read('index.html')));
ok('major loader 已去 no-store', exists('assets/major-name-model.v2946.js') && !/major-name-model[\s\S]*cache:'no-store'/.test('major-name-model'+read('assets/major-name-model.v2946.js')));
ok('confusable loader 已去 no-store', exists('assets/confusable-major-model.v29462.js') && !/confusable-major-model[\s\S]*cache:'no-store'/.test('confusable-major-model'+read('assets/confusable-major-model.v29462.js')));
ok('debug runtime 存在', exists('assets/debug-runtime.v2983.js'));
ok('debug runtime 含 resourceSummary', exists('assets/debug-runtime.v2983.js') && /topSlow/.test(read('assets/debug-runtime.v2983.js')) && /safePerf/.test(read('assets/debug-runtime.v2983.js')));
ok('compute-pipeline 主文件存在', exists('assets/compute-pipeline.v2983.js'));
ok('plan-engine 主文件存在', exists('assets/plan-engine.v297fix2.js'));
ok('taxonomy_runtime 保留', exists('data/taxonomy_runtime/major_taxonomy.json') && exists('data/taxonomy_runtime/admission_major_review_v2942.json'));
ok('school_geo_model 保留', exists('data/school_geo_model/school_geo_reference_v29471.json'));
ok('manifest 保留且可解析', exists('data/manifest.json') && jsonOk('data/manifest.json'));
ok('rank_2025_physics 保留且可解析', exists('data/rank_2025_physics.json') && jsonOk('data/rank_2025_physics.json'));
ok('docs 更新说明存在', exists('docs/V2.9RC.fix-safeperf1_更新说明.md'));
ok('docs 验证清单存在', exists('docs/V2.9RC.fix-safeperf1_验证清单.md'));

const manifest = JSON.parse(read('data/manifest.json'));
const chunks = (manifest.chunks || []);
ok('manifest chunks 非空', chunks.length > 0, String(chunks.length));
for (const c of chunks) {
  const rel = c.file || c.path;
  ok('chunk 存在: '+rel, !!rel && exists(rel));
  if (rel && exists(rel)) ok('chunk 可解析: '+rel, jsonOk(rel));
}

// JavaScript syntax check by new Function; this catches syntax errors in standalone assets.
const jsFiles = [
  'assets/safeperf.v29rc1.js',
  'assets/major-name-model.v2946.js',
  'assets/confusable-major-model.v29462.js',
  'assets/debug-runtime.v2983.js',
  'assets/compute-pipeline.v2983.js',
  'assets/plan-engine.v297fix2.js'
];
for (const rel of jsFiles) {
  try { new Function(read(rel)); ok('JS 语法通过: '+rel, true); }
  catch(e){ ok('JS 语法通过: '+rel, false, e.message); }
}

const pass = checks.filter(x=>x.pass).length;
const fail = checks.filter(x=>!x.pass);
console.log(`V2.9RC.fix-safeperf1 validate: ${pass}/${checks.length} passed`);
for (const c of checks) console.log(`${c.pass?'✅':'❌'} ${c.name}${c.detail ? ' - '+c.detail : ''}`);
if (fail.length) process.exit(1);
