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
const regression = read('fenxi/v3/assets/js/adapters/regression-samples-adapter.v3.js');
const versionTxt = read('fenxi/v3/VERSION.txt');
assert(idx.includes('v300beta9-20260512'), 'index cache stamp beta9');
assert(idx2.includes('v300beta9-20260512'), 'index.htm cache stamp beta9');
assert(dbg.includes('v300beta9-20260512'), 'debug cache stamp beta9');
assert(idx.includes('regression-samples-adapter.v3.js'), 'index loads regression adapter');
assert(dbg.includes('regression-samples-adapter.v3.js'), 'debug loads regression adapter');
assert(ver.includes('V3.0.0.beta9｜多路径真实样本回归版'), 'version name beta9');
assert(ver.includes("stamp: 'v300beta9-20260512'"), 'version stamp beta9');
assert(ver.includes("bodyClass: 'ln-v3-beta9'"), 'body class beta9');
assert(regression.includes('beta9-real-path-regression'), 'regression static plan stage');
assert(regression.includes('high_platform_electric') && regression.includes('hotword_misread_cs_470'), 'regression sample coverage');
assert(regression.includes('window.LN_V3_REGRESSION_SAMPLES'), 'regression global exported');
assert(self.includes('V3.0.0.beta9'), 'debug selftest expects beta9');
assert(self.includes('多路径真实样本回归适配器存在'), 'debug checks regression adapter');
assert(self.includes('多路径真实样本回归策略存在'), 'debug checks regression static plan');
assert(self.includes('多路径真实样本回归已通过'), 'debug checks regression run');
assert(self.includes('主流程后多路径真实样本回归仍通过'), 'mainflow checks regression after full route');
assert(versionTxt.includes('V3.0.0.beta9'), 'VERSION.txt beta9');
assert(exists('fenxi/v3/docs/V3_beta9_多路径真实样本回归说明.md'), 'beta9 docs exist');
if (process.exitCode) process.exit(process.exitCode);
console.log('All V3.0.0.beta9 checks passed.');
