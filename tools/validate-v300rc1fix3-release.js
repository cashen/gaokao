const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1); } }
const files = [
  'fenxi/v3/index.html',
  'fenxi/v3/index.htm',
  'fenxi/v3/debug.html',
  'fenxi/v3/debug.htm',
  'fenxi/v3/debug/index.html',
  'fenxi/v3/assets/js/version.v3.js'
];
for (const f of files) {
  const s = read(f);
  assert(s.includes('v300rc1fix4-20260512'), f + ' missing rc1fix3 stamp');
  assert(!s.includes('v300rc1fix2-20260512'), f + ' still contains rc1fix2 stamp');
}
assert(exists('fenxi/v3/assets/js/adapters/qualification-filter-adapter.v3.js'), 'qualification adapter missing');
assert(read('fenxi/v3/assets/js/adapters/qualification-filter-adapter.v3.js').includes('少数民族'), 'qualification patterns missing minority');
assert(read('fenxi/v3/assets/js/adapters/family-filter-adapter.v3.js').includes('removed.qualification'), 'family filter missing qualification removed');
assert(read('fenxi/v3/assets/js/steps/step-family.v3.js').includes('v3IncludeQualification'), 'Step2 UI missing qualification toggle');
assert(read('fenxi/v3/assets/js/debug/debug-selftest.v3.js').includes('资格型计划默认过滤策略存在'), 'debug selftest missing qualification checks');
assert(read('fenxi/v3/assets/js/adapters/release-readiness-adapter.v3.js').includes('rc1fix4-scoreband-major-guard'), 'release readiness stage not updated');
console.log('All V3.0.0.rc1.fix4 checks passed.');
