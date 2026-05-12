const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
function exists(p) { return fs.existsSync(path.join(root, p)); }
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } }

const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.alpha9｜导出家庭讨论报告版'), 'version name missing');
assert(version.includes('v300alpha9-20260512'), 'version stamp missing');
assert(version.includes('ln-v3-alpha9'), 'body class missing');

['fenxi/v3/index.html','fenxi/v3/debug.html','fenxi/v3/index.htm','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(file => {
  const html = read(file);
  assert(html.includes('v300alpha9-20260512'), `${file} cache stamp missing`);
  assert(html.includes('report-export-adapter.v3.js'), `${file} report export adapter missing`);
  assert(!html.includes('v300alpha8-20260512'), `${file} stale alpha8 cache found`);
});

assert(exists('fenxi/v3/assets/js/adapters/report-export-adapter.v3.js'), 'report export adapter file missing');
const adapter = read('fenxi/v3/assets/js/adapters/report-export-adapter.v3.js');
assert(adapter.includes('LN_V3_REPORT_EXPORT'), 'LN_V3_REPORT_EXPORT global missing');
assert(adapter.includes('generate:'), 'report generate export missing');
assert(adapter.includes('copy:'), 'report copy export missing');
assert(adapter.includes('家庭讨论报告'), 'report copy missing expected wording');

const stepExport = read('fenxi/v3/assets/js/steps/step-export.v3.js');
assert(stepExport.includes('导出家庭讨论报告'), 'step export title missing');
assert(stepExport.includes('data-export-copy'), 'copy button missing');
assert(stepExport.includes('export-report-textarea'), 'report textarea missing');

const store = read('fenxi/v3/assets/js/state-store.v3.js');
assert(store.includes('exportReport'), 'exportReport state missing');

const debug = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(debug.includes('Step7 家庭讨论报告已生成'), 'debug Step7 export check missing');
assert(debug.includes('主流程最终停在导出页'), 'debug final export check missing');
assert(debug.includes('家庭讨论报告适配器存在'), 'debug adapter exists check missing');

assert(exists('fenxi/v3/docs/V3_alpha9_导出家庭讨论报告说明.md'), 'alpha9 docs missing');
console.log('All V3.0.0.alpha9 checks passed.');
