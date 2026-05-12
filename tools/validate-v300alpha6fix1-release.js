const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1);} }
const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.alpha6.fix1｜A/B/C方案包重构与缓存校验修正版'), 'version name not updated');
assert(version.includes('v300alpha6fix1-20260512'), 'version stamp not updated');
assert(version.includes('ln-v3-alpha6-fix1'), 'body class token missing');
['fenxi/v3/index.html','fenxi/v3/index.htm','fenxi/v3/debug.html','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(p=>{
  assert(exists(p), p+' missing');
  const s=read(p);
  assert(s.includes('ln-v3-alpha6-fix1'), p+' body class not alpha6fix1');
  assert(s.includes('v300alpha6fix1-20260512'), p+' stamp not alpha6fix1');
  assert(s.includes('?v=v300alpha6fix1-20260512'), p+' cache bust query missing');
  assert(s.includes('/fenxi/v3/assets/js/adapters/plans-adapter.v3.js?v=v300alpha6fix1-20260512'), p+' missing versioned plans adapter script');
  assert(s.includes('/fenxi/v3/assets/js/adapters/scenario-adapter.v3.js?v=v300alpha6fix1-20260512'), p+' missing versioned scenario adapter');
});
[
 'fenxi/v3/assets/js/adapters/student-profile-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/major-profile-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/decision-context-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/scenario-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/plans-adapter.v3.js',
 'fenxi/v3/assets/js/steps/step-plans.v3.js',
 'fenxi/v3/docs/V3_alpha6fix1_ABC方案包缓存校验修复说明.md'
].forEach(p=>assert(exists(p),p+' missing'));
const scenario = read('fenxi/v3/assets/js/adapters/scenario-adapter.v3.js');
assert(scenario.includes('v3-family-path-preview-only'), 'scenario adapter not family path version');
assert(scenario.includes('province_public'), 'scenario adapter missing province_public path');
assert(scenario.includes('scoreBand'), 'scenario adapter missing scoreBand context');
const plans = read('fenxi/v3/assets/js/adapters/plans-adapter.v3.js');
assert(plans.includes('LN_V3_PLANS_ADAPTER'), 'plans adapter global missing');
assert(plans.includes('v3-plans-preview-only'), 'plans preview reason missing');
assert(plans.includes('守底线方案'), 'default A plan wording missing');
assert(plans.includes('孩子路径方案'), 'default B plan wording missing');
assert(plans.includes('上限探索方案'), 'default C plan wording missing');
assert(plans.includes('证据等级'), 'evidence wording missing');
const debug = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(debug.includes('Step4 不是旧简化场景矩阵'), 'anti-regression matrix check missing');
assert(debug.includes('Step4 未回退旧 grid 简化逻辑'), 'anti-regression mainflow check missing');
assert(debug.includes('Step5 方案包预览已生成'), 'mainflow Step5 package check missing');
assert(debug.includes('Step5 A/B/C 方案矩阵覆盖路径数'), 'pathmatrix Step5 plan matrix missing');
console.log('All V3.0.0.alpha6.fix1 checks passed.');
