const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exitCode=1; } }
const files = [
  'fenxi/v3/index.html',
  'fenxi/v3/index.htm',
  'fenxi/v3/debug.html',
  'fenxi/v3/debug.htm',
  'fenxi/v3/debug/index.html',
  'fenxi/v3/assets/js/version.v3.js',
  'fenxi/v3/VERSION.txt'
];
for(const f of files){
  assert(fs.existsSync(path.join(root,f)), `${f} exists`);
  const s = read(f);
  assert(s.includes('v300rc1fix2-20260512'), `${f} has rc1.fix2 stamp`);
  assert(!s.includes('v300beta9-20260512'), `${f} has no stale beta9 stamp`);
  assert(!s.includes('v300rc1-20260512'), `${f} has no stale rc1 stamp`);
}
assert(read('fenxi/v3/assets/js/version.v3.js').includes('V3.0.0.rc1.fix2'), 'version shortName rc1.fix2');
assert(read('fenxi/v3/assets/js/adapters/legacy-data-adapter.v3.js').includes('checkRankScoreConsistency'), 'rank/score consistency guard exists');
assert(read('fenxi/v3/assets/js/debug/debug-selftest.v3.js').includes('56548/650 必须拦截'), 'debug conflict sample exists');
assert(read('fenxi/v3/assets/js/debug/debug-selftest.v3.js').includes('56548/500 可以通过'), 'debug valid sample exists');
console.log('All V3.0.0.rc1.fix2 checks passed.');
