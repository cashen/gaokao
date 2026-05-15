#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const root=process.cwd();
let pass=0,fail=0;
function ok(cond,msg){ if(cond){console.log('PASS',msg);pass++;} else {console.error('FAIL',msg);fail++;} }
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){return fs.existsSync(path.join(root,p));}
function has(p,re,msg){ok(exists(p),p+' exists'); if(exists(p)) ok(re.test(read(p)),msg||`${p} has ${re}`);}

has('fenxi/index.html',/V2\.92RC1｜加载性能与第6步布局收口版/,'index title is V2.92RC1');
has('fenxi/index.html',/export-md\.v292rc1\.css\?v=292rc1-20260515/,'index loads export-md rc1 css');
has('fenxi/index.html',/stability-clean\.v292rc1\.css\?v=292rc1-20260515/,'index loads stability-clean rc1 css');
has('fenxi/index.html',/confusable-light\.v292rc1\.js/,'boot loads confusable light overlay');
has('fenxi/index.html',/detail-lazy\.v292rc1\.js/,'boot loads detail lazy rc1');
has('fenxi/index.html',/rules-final-decision\.v292rc1\.js/,'boot loads final decision rc1');
has('fenxi/index.html',/export-md\.v292rc1\.js/,'boot loads export-md rc1');
has('fenxi/index.html',/stability-clean\.v292rc1\.js/,'boot loads stability clean rc1');
const html=read('fenxi/index.html');
ok(!/detail-lazy\.v292rc\.js/.test(html),'old detail-lazy v292rc not loaded');
ok(!/export-md\.v292rc\.js/.test(html),'old export-md v292rc not loaded');
ok(!/stability-clean\.v292rc\.js/.test(html),'old stability-clean v292rc not loaded');

has('fenxi/assets/app.v2981.js',/V2\.92RC1：启动只等待“计算必需的专业学科核心”/,'app boot uses rc1 core model split');
has('fenxi/assets/app.v2981.js',/loadJsonFile\(DATA_FILES\.taxonomy,'专业学科映射（核心）'\)/,'app loads taxonomy core only');
ok(!/await window\.loadMajorNameModelV2944/.test(read('fenxi/assets/app.v2981.js')),'major name model is not awaited in boot');

has('fenxi/assets/confusable-light.v292rc1.js',/loadConfusableMajorFullV2946/,'confusable full loader exists');
has('fenxi/assets/detail-lazy.v292rc1.js',/loadConfusableMajorFullV2946\('detail-expand'\)/,'detail lazy loads full confusable on expand');
has('fenxi/assets/export-md.v292rc1.js',/var side=cand\.querySelector\('\.rightPanel'\)/,'selected md button goes to right panel');
ok(!/observe\(document\.body/.test(read('fenxi/assets/export-md.v292rc1.js')),'export-md no longer observes document.body');
has('fenxi/assets/stability-clean.v292rc1.css',/#candidateArea\.step-card:before\{content:none!important;display:none!important;\}/,'candidateArea pseudo label disabled');

['fenxi/assets/app.v2981.js','fenxi/assets/data-engine.v297fix2.js','fenxi/assets/confusable-light.v292rc1.js','fenxi/assets/detail-lazy.v292rc1.js','fenxi/assets/rules-final-decision.v292rc1.js','fenxi/assets/export-md.v292rc1.js','fenxi/assets/stability-clean.v292rc1.js'].forEach(f=>{
  try{new Function(read(f)); ok(true,f+' syntax');}catch(e){console.error(e); ok(false,f+' syntax');}
});

console.log(`RESULT PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
