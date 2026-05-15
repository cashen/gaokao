#!/usr/bin/env node
const fs=require('fs');const path=require('path');const root=process.cwd();let pass=0,fail=0;
function ok(c,m){if(c){console.log('PASS',m);pass++;}else{console.error('FAIL',m);fail++;}}
function read(f){return fs.readFileSync(path.join(root,f),'utf8');}
function has(f,pat,msg){const p=path.join(root,f);ok(fs.existsSync(p),f+' exists');if(fs.existsSync(p))ok(pat.test(read(f)),msg);}
has('fenxi/index.html',/export-md\.v291rc0md5fix1\.js/,'index loads md5fix1 js');
has('fenxi/index.html',/export-md\.v291rc0md5fix1\.css/,'index loads md5fix1 css');
has('fenxi/index.html',/family-read-frontfix\.v291rc0familyread1frontfix6\.css/,'index loads frontfix6 css');
has('fenxi/index.html',/family-read-frontfix\.v291rc0familyread1frontfix6\.js/,'index loads frontfix6 js');
ok(!/export-md\.v291rc0md3\.css/.test(read('fenxi/index.html')),'index no longer loads md3 css');
has('fenxi/assets/export-md.v291rc0md5fix1.js',/function safeInsert\(/,'md5fix1 has safeInsert');
has('fenxi/assets/export-md.v291rc0md5fix1.js',/h\.parentNode===cand|querySelector\(':scope > h2'\)/,'md5fix1 checks h2 direct parent');
has('fenxi/assets/family-read-frontfix.v291rc0familyread1frontfix6.css',/橙棕色全面收口|\[class\*=\"actions\"\] button/,'frontfix6 has orange/brown cleanup');
['fenxi/assets/export-md.v291rc0md5fix1.js','fenxi/assets/family-read-frontfix.v291rc0familyread1frontfix6.js'].forEach(f=>{try{new Function(read(f));ok(true,f+' syntax');}catch(e){console.error(e);ok(false,f+' syntax');}});
console.log(`RESULT PASS ${pass} / FAIL ${fail}`);process.exit(fail?1:0);
