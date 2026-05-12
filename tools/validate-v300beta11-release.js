const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1);} }
const stamp='v300beta11-20260512';
const version=read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.beta11｜发布候选护栏与受控试用检查版'),'version name');
assert(version.includes(stamp),'version stamp');
assert(version.includes('ln-v3-beta11'),'body class token');
['fenxi/v3/index.html','fenxi/v3/debug.html'].forEach(file=>{
  const s=read(file);
  assert(s.includes(stamp), file+' cache stamp');
  assert(!s.includes('v300beta10-20260512'), file+' old stamp removed');
  assert(s.includes('release-readiness-adapter.v3.js'), file+' release adapter included');
});
const adapter=read('fenxi/v3/assets/js/adapters/release-readiness-adapter.v3.js');
assert(adapter.includes('beta11-release-readiness-guard'),'release adapter stage');
assert(adapter.includes('canOpenControlledTrial'),'controlled trial guard');
assert(adapter.includes('canReplaceOldFenxi: false'),'no replace old fenxi');
const debug=read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(debug.includes('V3.0.0.beta11'),'debug version check updated');
assert(debug.includes('发布候选护栏适配器存在'),'debug adapter check');
assert(debug.includes('发布候选护栏最终通过'),'debug final readiness check');
console.log('All V3.0.0.beta11 checks passed.');
