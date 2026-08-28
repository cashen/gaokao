#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
let pass=0,fail=0;
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){return fs.existsSync(path.join(root,p));}
function ok(name,cond){if(cond){pass++;console.log('PASS',name);}else{fail++;console.error('FAIL',name);}}
function checkJsonDir(dir){let count=0;function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const st=fs.statSync(p);if(st.isDirectory())walk(p);else if(f.endsWith('.json')){JSON.parse(fs.readFileSync(p,'utf8'));count++;}}}walk(path.join(root,dir));return count;}
function extractIndexData(index){
  const m=index.match(/const filesRulesBundled=(\[[\s\S]*?\]);\n\s*const filesRulesLegacy=(\[[\s\S]*?\]);\n\s*const uiBundleGroups=(\[[\s\S]*?\]);/);
  if(!m)throw new Error('filesRulesBundled/filesRulesLegacy/uiBundleGroups not found');
  const bundled=JSON.parse(m[1]);
  const legacy=JSON.parse(m[2]);
  const groups=JSON.parse(m[3]);
  function apply(list){
    const out=[];
    for(let i=0;i<list.length;){
      let matched=false;
      for(const g of groups){
        const seq=g.files||[];
        if(seq.length && list.slice(i,i+seq.length).join('\n')===seq.join('\n')){out.push(g.bundle);i+=seq.length;matched=true;break;}
      }
      if(!matched){out.push(list[i]);i++;}
    }
    return out;
  }
  return {bundled,legacy,groups,finalBundled:apply(bundled),finalLegacy:apply(legacy)};
}
const index=read('index.html');
const debugHtml=read('debug.html');
const selftest=read('assets/debug-selftest.v2983fix12.js');
const version=read('VERSION.txt');
console.log('V2.91RC0.ui-core1 release validation');
ok('VERSION.txt 版本正确',/V2\.91RC0\.ui-core1/.test(version)&&/291rc0-ui-core1-20260513/.test(version));
ok('index 标题版本正确',/V2\.91RC0\.ui-core1/.test(index));
ok('index 全局版本变量正确',/__LN_TOOL_VERSION='V2\.91RC0\.ui-core1'/.test(index)&&/__LN_TOOL_STAMP='291rc0-ui-core1-20260513'/.test(index));
ok('rules bundle 仍为 rules-core1',/LN_RULES_BUNDLE_VERSION = '291rc0-rules-core1-20260513'/.test(index));
ok('ui bundle 开关存在',/LN_UI_BUNDLE_OPT = true/.test(index)&&/LN_UI_BUNDLE_VERSION = '291rc0-ui-core1-20260513'/.test(index));
ok('debug 标题版本正确',/Debug Report｜V2\.91RC0\.ui-core1/.test(debugHtml));
ok('debug 自测缓存戳正确',/debug-selftest\.v2983fix12\.js\?v=291rc0-ui-core1-20260513/.test(debugHtml));
ok('debug selftest 版本默认值正确',/V2\.91RC0\.ui-core1/.test(selftest)&&/291rc0-ui-core1-20260513/.test(selftest));
ok('debug selftest 包含 rules-core 检查步骤',/rules-core1 分段规则包加载与导出检查/.test(selftest));
ok('debug selftest 包含 ui-core 检查步骤',/ui-core1 分段 UI 包加载与导出检查/.test(selftest));
const arrays=extractIndexData(index);
ok('rules-core1 bundled 基础数组 63 个',arrays.bundled.length===63);
ok('legacy 基础数组 84 个',arrays.legacy.length===84);
ok('ui bundle 后默认 files 为 54 个',arrays.finalBundled.length===54);
ok('ui bundle 后 legacy fallback 为 75 个',arrays.finalLegacy.length===75);
ok('ui bundle 在 rules-core1 基线上减少 9 个 JS 请求',arrays.bundled.length-arrays.finalBundled.length===9);
const bundles={
 'assets/ui-form-step-core.v291rc0ui1.js':['assets/child-interest-ui.v298fix1.js','assets/child-intent-ui.v2981.js','assets/scenario-ui.v298.js'],
 'assets/ui-result-basic-core.v291rc0ui1.js':['assets/abc-view.v298.js','assets/candidate-card-view.v298.js'],
 'assets/ui-candidate-detail-early-core.v291rc0ui1.js':['assets/candidate-tag-ui.v2981.js','assets/detail-card-ui.v2981.js'],
 'assets/ui-notice-profile-early-core.v291rc0ui1.js':['assets/notice-compact-ui.v2981fix1.js','assets/profile-interest-summary.v2981fix1.js'],
 'assets/ui-detail-notice-late-core.v291rc0ui1.js':['assets/detail-card-lite-ui.v2981fix2.js','assets/notice-compact-ui.v2981fix2.js'],
 'assets/ui-late-interaction-core.v291rc0ui1.js':['assets/abc-light-ui.v2983fix3.js','assets/interest-interaction-lite.v2983fix3.js','assets/interest-drawer-slim.v2983fix4.js','assets/module-step-priority.v2983fix3.js'],
};
for(const [b,files] of Object.entries(bundles)){
  ok(`${b} 存在`,exists(b));
  const txt=read(b);
  ok(`${b} 版本标记正确`,/291rc0-ui-core1-20260513/.test(txt));
  for(const f of files){ok(`${b} 包含 ${f}`,txt.includes(`BEGIN ${f}`)&&txt.includes(`END ${f}`));}
  ok(`${b} 被默认 final files 引用`,arrays.finalBundled.includes(b));
}
for(const files of Object.values(bundles)){
  for(const f of files){
    ok(`final files 不再直接加载 ${f}`,!arrays.finalBundled.includes(f));
    ok(`rules-core1 基础数组仍保留 ${f}`,arrays.bundled.includes(f));
  }
}
[
 'assets/rules-path-early-core.v291rc0rules1.js','assets/rules-interest-core.v291rc0rules1.js','assets/rules-path-core.v291rc0rules1.js','assets/rules-decision-core.v291rc0rules1.js','assets/rules-detail-model-early-core.v291rc0rules1.js','assets/rules-detail-export-late-core.v291rc0rules1.js',
 'assets/compute-pipeline.v2983.js','assets/plan-engine.v297fix2.js','assets/filter-engine.v298fix1.js','assets/data-engine.v297fix2.js','assets/render.v2981.js','assets/app.v2981.js','assets/app.v2983.js','assets/safeperf.v29rc1.js','assets/interact-stability.v29rc1.js','assets/interact-dedupe.v29rc2.js'
].forEach(f=>ok(`${f} 仍在 final files 中`,arrays.finalBundled.includes(f)));
ok('无 fenxi/v3 目录',!exists('v3'));
[
 'docs/V2.91RC0.ui-core1_更新说明.md','docs/V2.91RC0.ui-core1_验证清单.md','docs/V2.91RC0.rules-core1_更新说明.md','docs/JS_CORE_DEPENDENCY_MAP.md','docs/BASELINE.md','docs/ROLLBACK.md','docs/TEST_MATRIX.md','docs/PERFORMANCE_BUDGET.md'
].forEach(f=>ok(`${f} 存在`,exists(f)));
let jsCount=0;function walkJs(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const st=fs.statSync(p);if(st.isDirectory())walkJs(p);else if(f.endsWith('.js')){jsCount++;new Function(fs.readFileSync(p,'utf8'));}}}walkJs(path.join(root,'assets'));ok('assets JS 语法检查通过',jsCount>0);
const jsonCount=checkJsonDir('data');ok('data JSON 可解析',jsonCount>0);
const manifest=JSON.parse(read('data/manifest.json'));let total=0;for(const c of manifest.chunks||[]){const fp=c.file||c.path||c.url;if(fp){const chunk=JSON.parse(read(fp));const arr=Array.isArray(chunk)?chunk:(chunk.records||chunk.data||[]);total+=arr.length;}}ok('manifest totalRecords 与分块条数一致',!manifest.totalRecords || total===manifest.totalRecords);
console.log(`\nV2.91RC0.ui-core1 validate: ${pass}/${pass+fail} passed`);
if(fail)process.exit(1);
