#!/usr/bin/env node
const fs=require('fs');const path=require('path');const root=process.cwd();let pass=0,fail=0;function ok(c,m){if(c){console.log('PASS',m);pass++;}else{console.error('FAIL',m);fail++;}}function has(file,pat,msg){const p=path.join(root,file);ok(fs.existsSync(p),file+' exists');if(fs.existsSync(p)){const s=fs.readFileSync(p,'utf8');ok(pat.test(s),msg||(`${file} matches ${pat}`));}}
has('fenxi/index.html',/family-read-frontfix\.v291rc0familyread1frontfix4\.css/,'index loads frontfix4 css');
has('fenxi/index.html',/family-read-frontfix\.v291rc0familyread1frontfix4\.js/,'index loads frontfix4 js');
has('fenxi/index.html',/V2\.91RC0\.rules-closure5\.family-read1\.frontfix4\.export-md4/,'index title updated');
has('fenxi/assets/family-read-frontfix.v291rc0familyread1frontfix4.css',/detail-lite-actions-v2981fix2 button[\s\S]*background:#fff!important[\s\S]*color:var\(--ln-bluegray\)!important/,'frontfix4 unifies detail buttons');
has('fenxi/assets/family-read-frontfix.v291rc0familyread1frontfix4.js',/v291rc0familyread1frontfix4|detailCardWarmUnified/,'frontfix4 js debug flags');
['fenxi/assets/family-read-frontfix.v291rc0familyread1frontfix4.js'].forEach(f=>{try{new Function(fs.readFileSync(path.join(root,f),'utf8'));ok(true,f+' syntax');}catch(e){console.error(e);ok(false,f+' syntax');}});
console.log(`RESULT PASS ${pass} / FAIL ${fail}`);process.exit(fail?1:0);
