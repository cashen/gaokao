const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exitCode=1; } }
const idx = read('fenxi/v3/index.html');
const idx2 = read('fenxi/v3/index.htm');
const dbg = read('fenxi/v3/debug.html');
const ver = read('fenxi/v3/assets/js/version.v3.js');
const self = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
const step = read('fenxi/v3/assets/js/steps/step-candidates.v3.js');
const adapter = read('fenxi/v3/assets/js/adapters/candidate-compare-adapter.v3.js');
const css = read('fenxi/v3/assets/css/steps.v3.css');
assert(idx.includes('v300beta5-20260512'), 'index cache stamp should be beta5');
assert(idx2.includes('v300beta5-20260512'), 'index.htm cache stamp should be beta5');
assert(dbg.includes('v300beta5-20260512'), 'debug cache stamp should be beta5');
assert(ver.includes('V3.0.0.beta5｜详细卡片比较能力增强版'), 'version name beta5');
assert(ver.includes("stamp: 'v300beta5-20260512'"), 'version stamp beta5');
assert(ver.includes("bodyClass: 'ln-v3-beta5'"), 'body class beta5');
assert(idx.includes('candidate-compare-adapter.v3.js'), 'index loads candidate compare adapter');
assert(dbg.includes('candidate-compare-adapter.v3.js'), 'debug loads candidate compare adapter');
assert(exists('fenxi/v3/assets/js/adapters/candidate-compare-adapter.v3.js'), 'candidate compare adapter exists');
assert(adapter.includes('window.LN_V3_CANDIDATE_COMPARE'), 'candidate compare global exists');
assert(adapter.includes('filterCards') && adapter.includes('compareRows') && adapter.includes('staticPlan'), 'compare adapter exposes core methods');
assert(step.includes('candidate-compare-toolbar'), 'step candidates has compare toolbar');
assert(step.includes('data-candidates-filter'), 'step candidates has filter buttons');
assert(step.includes('data-candidates-sort'), 'step candidates has sort select');
assert(step.includes('candidate-compare-table'), 'step candidates has compare table');
assert(css.includes('candidate-compare-toolbar'), 'css contains compare toolbar');
assert(css.includes('candidate-compare-table'), 'css contains compare table');
assert(self.includes('V3.0.0.beta5'), 'debug selftest expects beta5');
assert(self.includes('候选比较适配器存在'), 'debug tests candidate compare adapter');
assert(self.includes('Step6 卡片筛选排序能力已接入'), 'mainflow tests filter/sort');
assert(self.includes('Step6 横向比较表可生成'), 'mainflow tests compare table');
assert(exists('fenxi/v3/docs/V3_beta5_详细卡片比较能力增强说明.md'), 'beta5 docs exist');
if (process.exitCode) process.exit(process.exitCode);
console.log('All V3.0.0.beta5 checks passed.');
