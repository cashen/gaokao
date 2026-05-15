#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
let pass=0,fail=0;
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){return fs.existsSync(path.join(root,p));}
function ok(name,cond){if(cond){pass++;console.log('PASS',name);}else{fail++;console.error('FAIL',name);}}
function sha(s){return crypto.createHash('sha256').update(s).digest('hex');}
function checkJsonDir(dir){let count=0;function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const st=fs.statSync(p);if(st.isDirectory())walk(p);else if(f.endsWith('.json')){JSON.parse(fs.readFileSync(p,'utf8'));count++;}}}walk(path.join(root,dir));return count;}
function extractFilesArray(index){const m=index.match(/const files=\(window\.LN_RULES_BUNDLE_OPT!==false\?(\[[\s\S]*?\]):(\[[\s\S]*?\])\);/);if(!m)throw new Error('files conditional array not found');return {bundled:JSON.parse(m[1]),legacy:JSON.parse(m[2])};}
const index=read('index.html');
const debugHtml=read('debug.html');
const selftest=read('assets/debug-selftest.v2983fix12.js');
const version=read('VERSION.txt');
console.log('V2.91RC0.rules-core1 release validation');
ok('VERSION.txt 版本正确',/V2\.91RC0\.rules-core1/.test(version)&&/291rc0-rules-core1-20260513/.test(version));
ok('index 标题版本正确',/V2\.91RC0\.rules-core1/.test(index));
ok('index 全局版本变量正确',/__LN_TOOL_VERSION='V2\.91RC0\.rules-core1'/.test(index)&&/__LN_TOOL_STAMP='291rc0-rules-core1-20260513'/.test(index));
ok('rules bundle 开关存在',/LN_RULES_BUNDLE_OPT\s*=\s*true/.test(index)&&/LN_RULES_BUNDLE_VERSION\s*=\s*'291rc0-rules-core1-20260513'/.test(index));
ok('debug 标题版本正确',/Debug Report｜V2\.91RC0\.rules-core1/.test(debugHtml));
ok('debug 自测缓存戳正确',/debug-selftest\.v2983fix12\.js\?v=291rc0-rules-core1-20260513/.test(debugHtml));
ok('debug selftest 版本默认值正确',/V2\.91RC0\.rules-core1/.test(selftest)&&/291rc0-rules-core1-20260513/.test(selftest));
ok('debug selftest 包含 rules-core 检查步骤',/rules-core1 分段规则包加载与导出检查/.test(selftest));
const arrays=extractFilesArray(index);
ok('legacy files 保留 84 个',arrays.legacy.length===84);
ok('bundled files 为 63 个',arrays.bundled.length===63);
ok('rules bundle 后减少 21 个 JS 请求',arrays.legacy.length-arrays.bundled.length===21);
const bundles={
 'assets/rules-path-early-core.v291rc0rules1.js':['assets/path-review-rules.v298.js','assets/major-misread-rules.v298.js'],
 'assets/rules-interest-core.v291rc0rules1.js':['assets/interest-taxonomy.v298.js','assets/child-intent-translator.v298fix1.js','assets/child-intent-interest-map.v298.js','assets/catalog-interest-binding.v298.js','assets/candidate-catalog-normalizer.v298.js','assets/catalog-match-engine.v298.js','assets/interest-hit-summary.v298.js','assets/interest-weight-rules.v298.js','assets/intent-conflict-rules.v298.js'],
 'assets/rules-path-core.v291rc0rules1.js':['assets/score-rank-band-rules.v298.js','assets/path-scenario-rules.v298.js','assets/path-explain-engine.v298.js'],
 'assets/rules-decision-core.v291rc0rules1.js':['assets/admission-safety-rules.v2981.js','assets/admission-evidence-rules.v2981.js','assets/candidate-decision-tags.v2981.js','assets/candidate-tradeoff-rules.v2981.js','assets/abc-decision-card-model.v2981.js','assets/detail-candidate-card-model.v2981.js'],
 'assets/rules-detail-model-early-core.v291rc0rules1.js':['assets/decision-reminder-dedupe.v2981fix1.js','assets/detail-card-lite-model.v2981fix1.js'],
 'assets/rules-detail-export-late-core.v291rc0rules1.js':['assets/student-profile-normalizer.v2981fix2.js','assets/campus-location-rules.v2981fix2.js','assets/parent-must-read-rules.v2981fix2.js','assets/export-decision-fields.v2981fix2.js','assets/decision-reminder-dedupe.v2981fix2.js'],
};
for(const [b,files] of Object.entries(bundles)){
  ok(`${b} 存在`,exists(b));
  const txt=read(b);
  ok(`${b} 版本标记正确`,/291rc0-rules-core1-20260513/.test(txt));
  for(const f of files){ok(`${b} 包含 ${f}`,txt.includes(`BEGIN ${f}`)&&txt.includes(`END ${f}`));}
  ok(`${b} 被 bundled files 引用`,arrays.bundled.includes(b));
}
for(const files of Object.values(bundles)){
  for(const f of files){ok(`bundled files 不再直接加载 ${f}`,!arrays.bundled.includes(f));ok(`legacy files 仍保留 ${f}`,arrays.legacy.includes(f));}
}
[
 'assets/compute-pipeline.v2983.js','assets/plan-engine.v297fix2.js','assets/filter-engine.v298fix1.js','assets/data-engine.v297fix2.js','assets/render.v2981.js','assets/app.v2981.js','assets/app.v2983.js','assets/safeperf.v29rc1.js','assets/interact-stability.v29rc1.js','assets/interact-dedupe.v29rc2.js'
].forEach(f=>ok(`${f} 仍在 bundled files 中`,arrays.bundled.includes(f)));
ok('无 fenxi/v3 目录',!exists('v3'));
[
 'docs/V2.91RC0.rules-core1_更新说明.md','docs/V2.91RC0.rules-core1_验证清单.md','docs/JS_CORE_DEPENDENCY_MAP.md','docs/BASELINE.md','docs/ROLLBACK.md','docs/TEST_MATRIX.md','docs/PERFORMANCE_BUDGET.md'
].forEach(f=>ok(`${f} 存在`,exists(f)));
let jsCount=0;function walkJs(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const st=fs.statSync(p);if(st.isDirectory())walkJs(p);else if(f.endsWith('.js')){jsCount++;new Function(fs.readFileSync(p,'utf8'));}}}walkJs(path.join(root,'assets'));ok('assets JS 语法检查通过',jsCount>0);
const jsonCount=checkJsonDir('data');ok('data JSON 可解析',jsonCount>0);
const manifest=JSON.parse(read('data/manifest.json'));let total=0;for(const c of manifest.chunks||[]){const fp=c.file||c.path||c.url;if(fp){const chunk=JSON.parse(read(fp));const arr=Array.isArray(chunk)?chunk:(chunk.records||chunk.data||[]);total+=arr.length;}}ok('manifest totalRecords 与分块条数一致',!manifest.totalRecords || total===manifest.totalRecords);
console.log(`\nV2.91RC0.rules-core1 validate: ${pass}/${pass+fail} passed`);
if(fail)process.exit(1);
