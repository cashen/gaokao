const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1);} }
const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.alpha6.fix3｜Debug一键总检与复制流程简化版'), 'version name not updated');
assert(version.includes('v300alpha6fix3-20260512'), 'version stamp not updated');
assert(version.includes('ln-v3-alpha6-fix3'), 'body class token missing');
['fenxi/v3/index.html','fenxi/v3/index.htm','fenxi/v3/debug.html','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(p=>{
  assert(exists(p), p+' missing');
  const s=read(p);
  assert(s.includes('ln-v3-alpha6-fix3'), p+' body class not alpha6fix3');
  assert(s.includes('v300alpha6fix3-20260512'), p+' stamp not alpha6fix3');
  assert(s.includes('?v=v300alpha6fix3-20260512'), p+' cache bust query missing');
});
const debugHtml = read('fenxi/v3/debug.html');
assert(debugHtml.includes('data-debug-run="oneclick"'), 'oneclick button missing');
assert(debugHtml.includes('一键总检：路径矩阵 + 主流程'), 'oneclick label missing');
assert(debugHtml.includes('高级分项自测（备用）'), 'advanced tests fallback missing');
const selftest = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(selftest.includes("if (type === 'oneclick')"), 'oneclick run dispatch missing');
assert(selftest.includes('模式：oneclick'), 'oneclick report mode missing');
assert(selftest.includes('路径矩阵自测'), 'combined matrix section missing');
assert(selftest.includes('主流程自测'), 'combined mainflow section missing');
const panel = read('fenxi/v3/assets/js/debug/debug-panel.v3.js');
assert(panel.includes('正在运行一键总检'), 'panel oneclick running text missing');
assert(panel.includes('scrollIntoView'), 'panel oneclick scroll missing');
const scenario = read('fenxi/v3/assets/js/adapters/scenario-adapter.v3.js');
assert(scenario.includes('省内公办稳妥应压住普通就业叙事'), 'business baseline calibration missing');
const plans = read('fenxi/v3/assets/js/adapters/plans-adapter.v3.js');
assert(plans.includes('孩子路径方案'), 'plans adapter baseline missing');
console.log('All V3.0.0.alpha6.fix3 checks passed.');
