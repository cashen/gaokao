const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1);} }
const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.alpha5｜Step4场景选择与一键路径矩阵自测版'), 'version name not updated');
assert(version.includes('v300alpha5-20260512'), 'version stamp not updated');
assert(version.includes('ln-v3-alpha5'), 'body class token missing');
['fenxi/v3/index.html','fenxi/v3/index.htm','fenxi/v3/debug.html','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(p=>{
  assert(exists(p), p+' missing');
  const s=read(p);
  assert(s.includes('ln-v3-alpha5'), p+' body class not alpha5');
  assert(s.includes('v300alpha5-20260512'), p+' stamp not alpha5');
  assert(s.includes('/fenxi/v3/assets/js/adapters/scenario-adapter.v3.js'), p+' missing scenario adapter');
});
['fenxi/v3/assets/js/adapters/scenario-adapter.v3.js','fenxi/v3/assets/js/debug/debug-step-scenario.v3.js'].forEach(p=>assert(exists(p),p+' missing'));
const scenario = read('fenxi/v3/assets/js/adapters/scenario-adapter.v3.js');
assert(scenario.includes('matrix'), 'scenario matrix missing');
assert(scenario.includes('electric_energy'), 'scenario electric path missing');
assert(scenario.includes('recommended'), 'scenario recommendation missing');
const step = read('fenxi/v3/assets/js/steps/step-scenario.v3.js');
assert(step.includes('LN_V3_SCENARIO_ADAPTER'), 'step scenario not using adapter');
assert(step.includes('saveAndGoNext'), 'step scenario saveAndGoNext missing');
assert(step.includes('data-scenario-use-recommended'), 'step scenario recommended button missing');
const debug = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(debug.includes('V3.0.0.alpha5'), 'debug version check not alpha5');
assert(debug.includes('Step4 场景矩阵覆盖路径数'), 'mainflow scenario matrix check missing');
assert(debug.includes('Step4 保存后进入 Step5'), 'mainflow step4 route check missing');
assert(debug.includes("type === 'scenario'"), 'debug scenario type missing');
const panel = read('fenxi/v3/debug.html');
assert(panel.includes('data-debug-run="scenario"'), 'debug step4 button missing');
const state = read('fenxi/v3/assets/js/state-store.v3.js');
assert(state.includes('preview: null, locked: false'), 'scenario state not expanded');
assert(state.includes('v3-alpha5-scenario-preview'), 'compute reason not alpha5');
console.log('All V3.0.0.alpha5 checks passed.');
