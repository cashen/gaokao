const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1);} }
const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.alpha8｜反事实比较与条件放宽建议版'), 'version name not updated');
assert(version.includes('v300alpha8-20260512'), 'version stamp not updated');
assert(version.includes('ln-v3-alpha8'), 'body class token missing');
['fenxi/v3/index.html','fenxi/v3/index.htm','fenxi/v3/debug.html','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(p=>{
  assert(exists(p), p+' missing');
  const s=read(p);
  assert(s.includes('ln-v3-alpha8'), p+' body class not alpha8');
  assert(s.includes('v300alpha8-20260512'), p+' stamp not alpha8');
  assert(s.includes('?v=v300alpha8-20260512'), p+' cache bust query missing');
  assert(s.includes('counterfactual-adapter.v3.js'), p+' counterfactual adapter script missing');
});
const cf = read('fenxi/v3/assets/js/adapters/counterfactual-adapter.v3.js');
assert(cf.includes('v3-counterfactual-preview-only'), 'counterfactual preview reason missing');
assert(cf.includes('region-hard-to-soft'), 'region hard to soft card missing');
assert(cf.includes('manual-only-off'), 'manualOnly off card missing');
assert(cf.includes('reject-high-fee'), 'reject high fee card missing');
assert(cf.includes('LN_V3_COUNTERFACTUAL_ADAPTER'), 'counterfactual adapter export missing');
const stepCandidates = read('fenxi/v3/assets/js/steps/step-candidates.v3.js');
assert(stepCandidates.includes('条件变化对照'), 'counterfactual section title missing');
assert(stepCandidates.includes('counterfactual-card'), 'counterfactual card UI missing');
assert(stepCandidates.includes('只做比较，不替你改选择'), 'counterfactual principle copy missing');
const selftest = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(selftest.includes('V3.0.0.alpha8'), 'debug quick version not alpha8');
assert(selftest.includes('反事实比较适配器存在'), 'debug counterfactual adapter check missing');
assert(selftest.includes('Step6 反事实比较已生成'), 'debug counterfactual generation check missing');
assert(selftest.includes('Step6 地域 hard→soft 对照存在'), 'debug region counterfactual check missing');
assert(selftest.includes('Step6 关闭真实命中可恢复底线池对照存在'), 'debug manualOnly counterfactual check missing');
const css = read('fenxi/v3/assets/css/steps.v3.css');
assert(css.includes('counterfactual-card'), 'counterfactual CSS missing');
assert(exists('fenxi/v3/docs/V3_alpha8_反事实比较与条件放宽建议说明.md'), 'alpha8 doc missing');
console.log('All V3.0.0.alpha8 checks passed.');
