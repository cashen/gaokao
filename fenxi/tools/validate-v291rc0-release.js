#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;
const results = [];

function ok(name, cond, note='') {
  if (cond) { pass++; results.push(`PASS｜${name}${note ? '｜' + note : ''}`); }
  else { fail++; results.push(`FAIL｜${name}${note ? '｜' + note : ''}`); }
}
function exists(rel){ return fs.existsSync(path.join(root, rel)); }
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function sha(rel){ return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex'); }
function walk(dir){
  const out=[];
  function rec(d){
    for (const n of fs.readdirSync(d)) {
      const p=path.join(d,n);
      const st=fs.statSync(p);
      if(st.isDirectory()) rec(p); else out.push(p);
    }
  }
  rec(path.join(root, dir));
  return out;
}

console.log('V2.91RC0 release validation');

ok('VERSION.txt 存在', exists('VERSION.txt'));
ok('VERSION.txt 版本正确', exists('VERSION.txt') && /V2\.91RC0/.test(read('VERSION.txt')) && /291rc0-20260513/.test(read('VERSION.txt')));

ok('index.html 存在', exists('index.html'));
const index = exists('index.html') ? read('index.html') : '';
ok('index 页面标题为 V2.91RC0', /辽宁物理类高考志愿初选工具 V2\.91RC0/.test(index));
ok('index 全局版本变量为 V2.91RC0', /__LN_TOOL_VERSION='V2\.91RC0'/.test(index) && /__LN_TOOL_STAMP='291rc0-20260513'/.test(index));
ok('index 保留 lineage', /__LN_TOOL_LINEAGE/.test(index) && /safePerf/.test(index) && /interact2/.test(index));

ok('debug.html 存在', exists('debug.html'));
const debugHtml = exists('debug.html') ? read('debug.html') : '';
ok('debug 标题为 V2.91RC0', /Debug Report｜V2\.91RC0/.test(debugHtml));
ok('debug 自测脚本缓存戳为 291rc0', /debug-selftest\.v2983fix12\.js\?v=291rc0-20260513/.test(debugHtml));

ok('debug-selftest 存在', exists('assets/debug-selftest.v2983fix12.js'));
const selftest = exists('assets/debug-selftest.v2983fix12.js') ? read('assets/debug-selftest.v2983fix12.js') : '';
ok('debug-selftest 读取当前版本变量', /window\.__LN_TOOL_VERSION\|\|'V2\.91RC0'/.test(selftest) && /window\.__LN_TOOL_STAMP\|\|'291rc0-20260513'/.test(selftest));

ok('无 fenxi/v3 目录', !exists('v3'));

const critical = {
  'assets/compute-pipeline.v2983.js': 'e13b600b1344168b8f362a05b81d3280c20bb114bdcd20b39a57e8a53ce48425',
  'assets/plan-engine.v297fix2.js': '6784b9d103cbaf33277bffff3b4711cbea6b97748563fad6d2d0c60fc3c29069',
  'assets/filter-engine.v298fix1.js': '554534209df5090ffc56bb43d44d3dfc008cf28a77b136932ccb1a3e73a4e5cc',
  'assets/interact-dedupe.v29rc2.js': 'f855710256b37809868fe754b783a40433c2e8214d94de94d85ac5823f1cfa46',
  'assets/interact-stability.v29rc1.js': 'e5bb2149244f68644076f85b38276eeb42e8a98708efa20c846844ed5d622b31',
  'assets/safeperf.v29rc1.js': '0558d6ab7a2f6253443928e84d4fd2b1bcaca07f5ed844996b03d3c52489b7d4'
};
for (const [rel, expected] of Object.entries(critical)) {
  ok(`${rel} 存在`, exists(rel));
  ok(`${rel} 哈希未变`, exists(rel) && sha(rel) === expected, exists(rel) ? sha(rel) : 'missing');
}

const docs = [
  'docs/BASELINE.md',
  'docs/ROLLBACK.md',
  'docs/TEST_MATRIX.md',
  'docs/PERFORMANCE_BUDGET.md',
  'docs/JS_CORE_DEPENDENCY_MAP.md',
  'docs/V2.91RC0_更新说明.md',
  'docs/V2.91RC0_验证清单.md'
];
for (const d of docs) ok(`${d} 存在`, exists(d));

ok('safeperf 开关存在', /LN_SAFE_PERF_OPT/.test(index));
ok('interact1 开关存在', /LN_INTERACT_FIX_OPT/.test(index));
ok('interact2 开关存在', /LN_INTERACT_DEDUPE_OPT/.test(index));

let jsSyntaxOk = true;
let jsCount = 0;
for (const f of walk('assets').filter(p => p.endsWith('.js'))) {
  jsCount++;
  try { new Function(fs.readFileSync(f, 'utf8')); }
  catch (e) { jsSyntaxOk = false; results.push(`JS_SYNTAX_FAIL｜${path.relative(root,f)}｜${e.message}`); }
}
ok('assets JS 语法检查通过', jsSyntaxOk, `${jsCount} files`);

let jsonOk = true;
let jsonCount = 0;
for (const f of walk('data').filter(p => p.endsWith('.json'))) {
  jsonCount++;
  try { JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { jsonOk = false; results.push(`JSON_FAIL｜${path.relative(root,f)}｜${e.message}`); }
}
ok('data JSON 可解析', jsonOk, `${jsonCount} files`);

const manifest = exists('data/manifest.json') ? JSON.parse(read('data/manifest.json')) : null;
if (manifest && Array.isArray(manifest.chunks)) {
  let total = 0;
  let chunksOk = true;
  for (const c of manifest.chunks) {
    const f = c.file || c.path;
    if (!f || !exists(f)) chunksOk = false;
    else {
      const chunk = JSON.parse(read(f));
      if (Array.isArray(chunk)) total += chunk.length;
      else if (Array.isArray(chunk.records)) total += chunk.records.length;
    }
  }
  ok('manifest chunks 文件完整', chunksOk, `chunks=${manifest.chunks.length}`);
  ok('manifest totalRecords 与分块条数一致', Number(manifest.totalRecords || 0) === total, `manifest=${manifest.totalRecords} actual=${total}`);
} else {
  ok('manifest 可读且有 chunks', false);
}

for (const r of results) console.log(r);
console.log(`\nV2.91RC0 validate: ${pass}/${pass+fail} passed`);
if (fail) process.exit(1);
