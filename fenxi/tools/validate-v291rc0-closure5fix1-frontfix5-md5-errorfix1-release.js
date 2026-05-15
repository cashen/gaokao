#!/usr/bin/env node
const fs=require('fs');const path=require('path');const root=process.cwd();let pass=0,fail=0;function ok(c,m){if(c){console.log('PASS',m);pass++;}else{console.error('FAIL',m);fail++;}}function read(f){return fs.readFileSync(path.join(root,f),'utf8')}function has(file,pat,msg){const p=path.join(root,file);ok(fs.existsSync(p),file+' exists');if(fs.existsSync(p))ok(pat.test(read(file)),msg)}
has('fenxi/index.html',/rules-closure\.v291rc0closure5fix1\.js/,'index loads closure5fix1');
has('fenxi/index.html',/family-read-frontfix\.v291rc0familyread1frontfix5\.js/,'index loads frontfix5');
has('fenxi/index.html',/export-md\.v291rc0md5\.js/,'index loads md5');
ok(!/export-md\.v291rc0md3\.js/.test(read('fenxi/index.html')),'index does not load md3');
ok(!/family-read-frontfix\.v291rc0familyread1frontfix1\.js/.test(read('fenxi/index.html')),'index does not load frontfix1 js');
ok(!/family-read-frontfix\.v291rc0familyread1frontfix1\.css/.test(read('fenxi/index.html')),'index does not load frontfix1 css');
has('fenxi/assets/export-md.v291rc0md5.js',/近线匹配|501–1500|1501–5000|5001–12000/,'md5 has new rank band policy');
has('fenxi/assets/rules-closure.v291rc0closure5fix1.js',/risk:'near'|近线匹配/,'closure5fix1 has near-line layer');
has('fenxi/assets/family-read-frontfix.v291rc0familyread1frontfix5.css',/全局去棕色|#f6f9fb|#244e6a/,'frontfix5 has no-brown override');
['fenxi/assets/rules-closure.v291rc0closure5fix1.js','fenxi/assets/export-md.v291rc0md5.js','fenxi/assets/family-read-frontfix.v291rc0familyread1frontfix5.js'].forEach(f=>{try{new Function(read(f));ok(true,f+' syntax')}catch(e){console.error(e);ok(false,f+' syntax')}});
console.log(`RESULT PASS ${pass} / FAIL ${fail}`);process.exit(fail?1:0);
