#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const root=process.cwd();
let pass=0,fail=0;
function ok(cond,msg){if(cond){console.log('PASS',msg);pass++;}else{console.error('FAIL',msg);fail++;}}
function has(file,pat,msg){const p=path.join(root,file); ok(fs.existsSync(p),file+' exists'); if(fs.existsSync(p)){const s=fs.readFileSync(p,'utf8'); ok(pat.test(s),msg||(`${file} matches ${pat}`));}}
has('fenxi/index.html',/rules-closure\.v291rc0closure5\.js/,'index loads closure5');
has('fenxi/index.html',/export-md\.v291rc0md4\.js/,'index loads md4');
has('fenxi/index.html',/family-read-frontfix\.v291rc0familyread1frontfix3\.js/,'index loads frontfix3');
has('fenxi/assets/rules-closure.v291rc0closure5.js',/C 组只放小冲|eligible\(r,type\)|noForcedFill/,'closure5 has ABC eligibility policy');
has('fenxi/assets/export-md.v291rc0md4.js',/v291rc0md4|强保底|高成本兜底观察|finalWhy/,'md4 has final-role output policy');
has('fenxi/assets/family-read-frontfix.v291rc0familyread1frontfix3.css',/ln-access-ready|guide-nav|abc-segment-v296/,'frontfix3 styles login and step nav');
['fenxi/assets/rules-closure.v291rc0closure5.js','fenxi/assets/export-md.v291rc0md4.js','fenxi/assets/family-read-frontfix.v291rc0familyread1frontfix3.js'].forEach(f=>{try{new Function(fs.readFileSync(path.join(root,f),'utf8')); ok(true,f+' syntax');}catch(e){console.error(e); ok(false,f+' syntax');}});
console.log(`RESULT PASS ${pass} / FAIL ${fail}`);
process.exit(fail?1:0);
