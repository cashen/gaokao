const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1); } }
assert(exists('fenxi/v3/index.html'), 'fenxi/v3/index.html missing');
assert(exists('fenxi/v3/debug.html'), 'fenxi/v3/debug.html missing');
assert(exists('fenxi/v3/debug.htm'), 'fenxi/v3/debug.htm missing');
assert(exists('fenxi/v3/debug/index.html'), 'fenxi/v3/debug/index.html missing');
assert(exists('fenxi/v3/assets/js/debug/debug-selftest.v3.js'), 'debug-selftest missing');
assert(exists('fenxi/v3/assets/js/debug/debug-runtime.v3.js'), 'debug-runtime missing');
assert(exists('fenxi/v3/assets/js/debug/debug-panel.v3.js'), 'debug-panel missing');
assert(exists('fenxi/v3/assets/js/adapters/family-filter-adapter.v3.js'), 'family-filter-adapter missing');
const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.alpha4.fix4'), 'version name not fix4');
assert(version.includes('v300alpha4fix4-20260512'), 'version stamp not fix4');
assert(version.includes('ln-v3-alpha4-fix4'), 'body class not fix4');
const debug = read('fenxi/v3/debug.html');
assert(debug.includes('data-debug-run="mainflow"'), 'mainflow debug button missing');
assert(debug.includes('debugTraceBox'), 'trace box missing');
const selftest = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(selftest.includes("type === 'mainflow'"), 'mainflow run branch missing');
assert(selftest.includes('一键主流程参数固定'), 'mainflow checks missing');
assert(selftest.includes('Step2 保存后进入 Step3'), 'step2 route check missing');
assert(selftest.includes('真实命中模式收窄到 matchedRows'), 'manualOnly strict check missing');
const runtime = read('fenxi/v3/assets/js/debug/debug-runtime.v3.js');
assert(runtime.includes('addTrace'), 'debug trace add missing');
assert(runtime.includes('trace: getTrace()'), 'snapshot trace missing');
const panel = read('fenxi/v3/assets/js/debug/debug-panel.v3.js');
assert(panel.includes('LN_V3_LAST_DEBUG_REPORT'), 'copy last report support missing');
const family = read('fenxi/v3/assets/js/adapters/family-filter-adapter.v3.js');
assert(!family.includes('var filtered = filterRecords(records, family);\n    var removed = filtered.removed;\n    var unmatchedKept = filtered.unmatchedKept;\n    var sampleUnexpectedKept = filtered.sampleUnexpectedKept;\n    var kept = filtered.records;\n    return { records: kept'), 'recursive filterRecords block still present');
assert(family.includes('records.forEach(function (record)'), 'non-recursive family filter missing');
console.log('All V3.0.0.alpha4.fix4 checks passed.');
