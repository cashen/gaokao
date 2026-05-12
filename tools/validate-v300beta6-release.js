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
const legacy = read('fenxi/v3/assets/js/adapters/legacy-compute-adapter.v3.js');
const versionTxt = read('fenxi/v3/VERSION.txt');
assert(idx.includes('v300beta6-20260512'), 'index cache stamp should be beta6');
assert(idx2.includes('v300beta6-20260512'), 'index.htm cache stamp should be beta6');
assert(dbg.includes('v300beta6-20260512'), 'debug cache stamp should be beta6');
assert(ver.includes('V3.0.0.beta6｜旧版正式计算链路接入预备版'), 'version name beta6');
assert(ver.includes("stamp: 'v300beta6-20260512'"), 'version stamp beta6');
assert(ver.includes("bodyClass: 'ln-v3-beta6'"), 'body class beta6');
assert(idx.includes('legacy-compute-adapter.v3.js'), 'index loads legacy compute adapter');
assert(dbg.includes('legacy-compute-adapter.v3.js'), 'debug loads legacy compute adapter');
assert(exists('fenxi/v3/assets/js/adapters/legacy-compute-adapter.v3.js'), 'legacy compute adapter exists');
assert(legacy.includes('window.LN_V3_LEGACY_COMPUTE'), 'legacy compute global exists');
assert(legacy.includes('getBridgeStatus') && legacy.includes('buildInputSnapshot') && legacy.includes('compare') && legacy.includes('staticPlan'), 'legacy compute adapter exposes preflight methods');
assert(legacy.includes('replacementAllowed: false') && legacy.includes('previewOnly: true') && legacy.includes('active: false'), 'legacy compute adapter is protected by default');
assert(self.includes('V3.0.0.beta6'), 'debug selftest expects beta6');
assert(self.includes('旧版正式计算预备适配器存在'), 'debug pathmatrix checks legacy adapter');
assert(self.includes('旧版计算桥接默认不替换 V3 主链路'), 'debug checks safe bridge');
assert(self.includes('旧版正式计算链路预备对比已生成'), 'mainflow checks legacy compare');
assert(self.includes('旧版计算预备不替换当前 V3 候选结果'), 'mainflow checks no replacement');
assert(versionTxt.includes('V3.0.0.beta6'), 'VERSION.txt beta6');
assert(exists('fenxi/v3/docs/V3_beta6_旧版正式计算链路接入预备说明.md'), 'beta6 docs exist');
if (process.exitCode) process.exit(process.exitCode);
console.log('All V3.0.0.beta6 checks passed.');
