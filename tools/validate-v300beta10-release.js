const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1); } }

const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.beta10｜旧版正式计算双轨对比增强版'), 'version name missing');
assert(version.includes('v300beta10-20260512'), 'version stamp missing');
assert(version.includes('ln-v3-beta10'), 'body class missing');

const index = read('fenxi/v3/index.html');
const debug = read('fenxi/v3/debug.html');
assert(index.includes('v300beta10-20260512'), 'index cache stamp missing');
assert(debug.includes('v300beta10-20260512'), 'debug cache stamp missing');
assert(!index.includes('v300beta9-20260512'), 'index still has beta9 stamp');
assert(!debug.includes('v300beta9-20260512'), 'debug still has beta9 stamp');

const legacy = read('fenxi/v3/assets/js/adapters/legacy-compute-adapter.v3.js');
assert(legacy.includes("mode: 'dual-track-preflight'"), 'dual-track mode missing');
assert(legacy.includes("stage: 'beta10-dual-track-compare'"), 'beta10 static plan missing');
assert(legacy.includes('buildDiffSamples'), 'diff sample builder missing');
assert(legacy.includes('reasonCategories'), 'reason categories missing');
assert(legacy.includes('replacementAllowed: false'), 'replacement guard missing');

const selftest = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(selftest.includes('V3.0.0.beta10'), 'debug version check missing');
assert(selftest.includes('旧版正式计算双轨对比策略存在'), 'dual track selftest missing');
assert(selftest.includes('旧版正式计算差异样本已生成'), 'diff sample selftest missing');
assert(selftest.includes('旧版正式计算原因分类已生成'), 'reason category selftest missing');
assert(selftest.includes('正式 compute 接入护栏仍关闭替换'), 'formal guard selftest missing');

const doc = read('fenxi/v3/docs/V3_beta10_旧版正式计算双轨对比增强说明.md');
assert(doc.includes('不主动调用旧 applyFilters'), 'doc safety missing');

console.log('All V3.0.0.beta10 checks passed.');
