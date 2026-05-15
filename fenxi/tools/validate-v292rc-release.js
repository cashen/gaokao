#!/usr/bin/env node
const fs=require('fs');const path=require('path');
const root=process.cwd();let pass=0,fail=0;
function ok(c,m){if(c){console.log('PASS',m);pass++;}else{console.error('FAIL',m);fail++;}}
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){ok(fs.existsSync(path.join(root,p)),p+' exists');}
['fenxi/assets/stability-clean.v292rc.css','fenxi/assets/stability-clean.v292rc.js','fenxi/assets/detail-lazy.v292rc.js','fenxi/assets/rules-final-decision.v292rc.js','fenxi/assets/export-md.v292rc.js','fenxi/assets/export-md.v292rc.css'].forEach(exists);
const idx=read('fenxi/index.html');
ok(/V2\.92RC/.test(idx),'index version V2.92RC');
ok(/stability-clean\.v292rc\.css/.test(idx),'index loads stability css');
ok(/export-md\.v292rc\.css/.test(idx),'index loads export md css');
ok(/detail-lazy\.v292rc\.js/.test(idx),'index loads detail lazy js');
ok(/rules-final-decision\.v292rc\.js/.test(idx),'index loads final decision js');
ok(/export-md\.v292rc\.js/.test(idx),'index loads export md js');
ok(/stability-clean\.v292rc\.js/.test(idx),'index loads stability js');
ok(!/family-read-frontfix\.v291rc0familyread1frontfix6\.js/.test(idx),'old frontfix6 js not loaded');
ok(!/export-md\.v291rc0md5fix1\.js/.test(idx),'old export md5fix1 js not loaded');
const bootLines=idx.split(/\n/).filter(l=>/filesRules(Bundled|Legacy)=/.test(l)).join('\n');
ok(!/interaction-policy\.v297fix2\.js/.test(bootLines),'interaction-policy not in external boot list');
['fenxi/assets/stability-clean.v292rc.js','fenxi/assets/detail-lazy.v292rc.js','fenxi/assets/rules-final-decision.v292rc.js','fenxi/assets/export-md.v292rc.js'].forEach(f=>{try{new Function(read(f));ok(true,f+' syntax');}catch(e){console.error(e);ok(false,f+' syntax');}});
const css=read('fenxi/assets/stability-clean.v292rc.css');
ok(/#candidateArea[\s\S]*grid-template-columns:minmax\(0,1fr\) 320px/.test(css),'candidate area layout rule exists');
ok(/grid-template-columns:1fr!important/.test(css),'candidate cards default single column');
ok(!/#8f6335|#7a552b|#b9874a|#c79045|#d97706/.test(css),'known brown/orange values absent in stability css');
ok(fs.existsSync(path.join(root,'fenxi/docs/V2.92RC_更新说明.md')),'docs update exists');
ok(fs.existsSync(path.join(root,'fenxi/docs/V2.92RC_验证清单.md')),'docs checklist exists');
ok(fs.existsSync(path.join(root,'fenxi/docs/V2.92RC_回退说明.md')),'docs rollback exists');
console.log(`RESULT PASS ${pass} / FAIL ${fail}`);process.exit(fail?1:0);
