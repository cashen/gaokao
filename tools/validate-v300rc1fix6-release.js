#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const stamp = 'v300rc1fix6-20260512';
const version = 'V3.0.0.rc1.fix6';
const files = [
  'fenxi/v3/index.html',
  'fenxi/v3/index.htm',
  'fenxi/v3/debug.html',
  'fenxi/v3/debug.htm',
  'fenxi/v3/debug/index.html',
  'fenxi/v3/assets/js/version.v3.js',
  'fenxi/v3/assets/js/adapters/path-explanation-adapter.v3.js',
  'fenxi/v3/assets/js/adapters/scenario-adapter.v3.js',
  'fenxi/v3/assets/js/steps/step-scenario.v3.js',
  'fenxi/v3/assets/css/path-explanation.v3.css',
  'fenxi/v3/VERSION.txt'
];
function read(rel){ return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assert(ok, msg){ if(!ok){ console.error('FAIL:', msg); process.exitCode = 1; } else { console.log('PASS:', msg); } }
files.forEach(rel => assert(fs.existsSync(path.join(root, rel)), rel + ' exists'));
['fenxi/v3/index.html','fenxi/v3/index.htm','fenxi/v3/debug.html','fenxi/v3/debug.htm','fenxi/v3/debug/index.html','fenxi/v3/assets/js/version.v3.js','fenxi/v3/VERSION.txt'].forEach(rel => {
  const s = read(rel);
  assert(s.includes(stamp), rel + ' stamp synced');
  assert(s.includes(version), rel + ' version synced');
  assert(!s.includes('v300rc1fix5-20260512'), rel + ' old fix5 stamp removed');
});
['fenxi/v3/index.html','fenxi/v3/index.htm','fenxi/v3/debug.html','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(rel => {
  const s = read(rel);
  assert(s.includes('assets/js/adapters/path-explanation-adapter.v3.js'), rel + ' loads path explanation adapter');
  assert(s.indexOf('path-explanation-adapter.v3.js') < s.indexOf('scenario-adapter.v3.js'), rel + ' path explanation loads before scenario adapter');
  assert(s.includes('assets/css/path-explanation.v3.css'), rel + ' loads path explanation CSS');
});
const scenario = read('fenxi/v3/assets/js/adapters/scenario-adapter.v3.js');
assert(scenario.includes('LN_V3_PATH_EXPLANATION_ADAPTER'), 'scenario adapter uses path explanation adapter');
assert(scenario.includes('closeCall') && scenario.includes('cardExplanations'), 'scenario preview exposes closeCall and cardExplanations');
assert(scenario.includes('fix6：路径解释适配器存在'), 'debug matrix includes path explanation assertion');
assert(scenario.includes('不改变原推荐权重'), 'debug matrix includes no-weight-change assertion');
const step = read('fenxi/v3/assets/js/steps/step-scenario.v3.js');
assert(step.includes('加分因素'), 'step scenario renders plus factors');
assert(step.includes('扣分因素'), 'step scenario renders minus factors');
assert(step.includes('对 A/B/C 的影响'), 'step scenario renders ABC impact');
assert(step.includes('并列 / 接近提醒'), 'step scenario renders close-call notice');
const pathAdapter = read('fenxi/v3/assets/js/adapters/path-explanation-adapter.v3.js');
assert(pathAdapter.includes('平台优先与强专业优先当前接近'), 'close-call copy exists');
assert(pathAdapter.includes('noWeightChange: true'), 'path explanation declares no weight change');
assert(!fs.existsSync(path.join(root, 'fenxi/index.html')), 'old /fenxi/index.html not included in update package');
if (process.exitCode) process.exit(process.exitCode);
console.log('All V3.0.0.rc1.fix6 package checks passed.');
