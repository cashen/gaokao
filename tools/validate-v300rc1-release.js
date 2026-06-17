const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1);} }
const stamp='v300rc1fix2-20260512';
const version=read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.rc1.fix2｜入口别名同步与分数位次护栏修正版'),'version name');
assert(version.includes(stamp),'version stamp');
assert(version.includes('ln-v3-rc1-fix2'),'body class token');
['fenxi/v3/index.html','fenxi/v3/debug.html'].forEach(file=>{
  const s=read(file);
  assert(s.includes(stamp), file+' cache stamp');
  assert(!s.includes('v300beta11-20260512'), file+' old beta11 stamp removed');
  assert(s.includes('release-readiness-adapter.v3.js'), file+' release adapter included');
});
const adapter=read('fenxi/v3/assets/js/adapters/release-readiness-adapter.v3.js');
assert(adapter.includes('rc1fix1-input-consistency-guard'),'release adapter stage');
assert(adapter.includes('canOpenControlledTrial'),'controlled trial guard');
assert(adapter.includes('canReplaceOldFenxi: false'),'no replace old fenxi');
const debug=read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(debug.includes('V3.0.0.rc1.fix2'),'debug version check updated');
assert(debug.includes('发布候选护栏适配器存在'),'debug adapter check');
assert(debug.includes('发布候选护栏最终通过'),'debug final readiness check');
assert(!debug.includes('V3.0.0.beta11'),'debug beta11 version check removed');
const versionTxt=read('fenxi/v3/VERSION.txt');
assert(versionTxt.includes('V3.0.0.rc1.fix2｜入口别名同步与分数位次护栏修正版'),'VERSION updated');
console.log('All V3.0.0.rc1.fix2 checks passed.');
