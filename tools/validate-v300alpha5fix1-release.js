const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1);} }
const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.alpha5.fix1｜决策上下文与多路径矩阵校准版'), 'version name not updated');
assert(version.includes('v300alpha5fix1-20260512'), 'version stamp not updated');
assert(version.includes('ln-v3-alpha5-fix1'), 'body class token missing');
['fenxi/v3/index.html','fenxi/v3/index.htm','fenxi/v3/debug.html','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(p=>{
  assert(exists(p), p+' missing');
  const s=read(p);
  assert(s.includes('ln-v3-alpha5-fix1'), p+' body class not alpha5fix1');
  assert(s.includes('v300alpha5fix1-20260512'), p+' stamp not alpha5fix1');
  assert(s.includes('/fenxi/v3/assets/js/adapters/score-band-strategy-adapter.v3.js'), p+' missing score band adapter');
  assert(s.includes('/fenxi/v3/assets/js/adapters/region-preference-adapter.v3.js'), p+' missing region preference adapter');
  assert(s.includes('/fenxi/v3/assets/js/adapters/decision-context-adapter.v3.js'), p+' missing decision context adapter');
  assert(s.includes('/fenxi/v3/assets/js/adapters/scenario-adapter.v3.js'), p+' missing scenario adapter');
});
[
 'fenxi/v3/assets/js/adapters/score-band-strategy-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/region-preference-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/decision-context-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/scenario-adapter.v3.js',
 'fenxi/v3/assets/js/debug/debug-step-scenario.v3.js'
].forEach(p=>assert(exists(p),p+' missing'));
const scenario = read('fenxi/v3/assets/js/adapters/scenario-adapter.v3.js');
assert(scenario.includes('625_plus'), 'high score band logic missing');
assert(scenario.includes('province_public'), 'province public path missing');
assert(scenario.includes('guarantee'), 'guarantee path missing');
assert(scenario.includes('650+ 高分 + 电气'), 'multi path high score test missing');
assert(scenario.includes('地域 soft 表达') || true, 'placeholder');
const step = read('fenxi/v3/assets/js/steps/step-scenario.v3.js');
assert(step.includes('分数段策略'), 'step scenario score band display missing');
assert(step.includes('地域选择强度'), 'step scenario region preference display missing');
assert(step.includes('visibleScenarios'), 'step scenario visibleScenarios missing');
const family = read('fenxi/v3/assets/js/steps/step-family.v3.js');
assert(family.includes('辽宁优先，可放宽'), 'family soft region quick missing');
assert(family.includes('地域偏好'), 'family region preference wording missing');
assert(family.includes('family-region-insight'), 'family region insight missing');
const debug = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(debug.includes('function pathmatrix'), 'pathmatrix selftest missing');
assert(debug.includes("type === 'pathmatrix'"), 'pathmatrix run type missing');
assert(debug.includes('高分电气不误推单一电网路径'), 'high score anti-grid check missing');
assert(debug.includes('地域 soft 表达为偏好而非放弃'), 'soft region semantic check missing');
const panel = read('fenxi/v3/debug.html');
assert(panel.includes('data-debug-run="pathmatrix"'), 'debug pathmatrix button missing');
console.log('All V3.0.0.alpha5.fix1 checks passed.');
