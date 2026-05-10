const fs=require('fs');
const path=require('path');
const root=process.cwd();
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1;}else console.log('OK:',msg);}
const required=[
'fenxi/index.html','fenxi/diagnostics.html','fenxi/VERSION.txt','functions/_middleware.js',
'fenxi/assets/interest-taxonomy.v2976.js','fenxi/assets/child-intent-interest-map.v2976.js','fenxi/assets/interest-match-engine.v2976.js','fenxi/assets/interest-weight-rules.v2976.js','fenxi/assets/path-explain-engine.v2976.js','fenxi/assets/child-interest-runtime.v2976.js','fenxi/assets/child-interest-ui.v2976.js','fenxi/assets/child-intent-ui.v2976.js','fenxi/assets/app.v2976.css'
];
required.forEach(f=>ok(fs.existsSync(path.join(root,f)),f+' exists'));
const index=fs.readFileSync(path.join(root,'fenxi/index.html'),'utf8');
ok(!fs.existsSync(path.join(root,'index.html')),'root index.html not included');
ok(index.includes('app.v2976.css'),'index uses v2976 css');
ok(index.includes('interest-taxonomy.v2976.js'),'index loads interest taxonomy');
ok(index.includes('child-interest-runtime.v2976.js'),'index loads v2976 runtime');
const ver=fs.readFileSync(path.join(root,'fenxi/VERSION.txt'),'utf8');
ok(ver.includes('V2.9.7.6'),'VERSION is V2.9.7.6');
const tax=fs.readFileSync(path.join(root,'fenxi/assets/interest-taxonomy.v2976.js'),'utf8');
ok(tax.includes('动物医学与生命科学') && tax.includes('人文法政') && tax.includes('电子信息与通信'),'taxonomy includes new directions');
const weight=fs.readFileSync(path.join(root,'fenxi/assets/interest-weight-rules.v2976.js'),'utf8');
ok(weight.includes('B:55') || weight.includes('B:55,'),'B cap exists');
const diag=fs.readFileSync(path.join(root,'fenxi/diagnostics.html'),'utf8');
ok(diag.includes('兴趣联动样例'),'diagnostics includes linkage sample');
if(process.exitCode) process.exit(process.exitCode);
