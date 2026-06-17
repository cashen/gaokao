const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function must(p){if(!fs.existsSync(path.join(root,p))){throw new Error('missing '+p)}}
['fenxi/index.html','fenxi/diagnostics.html','fenxi/VERSION.txt','fenxi/assets/theme-tokens.v297fix2.js','fenxi/assets/app.v297fix2.css','fenxi/assets/app.v297fix2.js','fenxi/assets/candidate-card-view.v297fix2.js'].forEach(must);
const index=fs.readFileSync(path.join(root,'fenxi/index.html'),'utf8');
const diag=fs.readFileSync(path.join(root,'fenxi/diagnostics.html'),'utf8');
if(!index.includes('V2.9.7.fix2｜状态就绪与路径色回调修正版')) throw new Error('index version missing');
if(!index.includes('assets/theme-tokens.v297fix2.js')) throw new Error('theme tokens not referenced');
if(!diag.includes('LN_THEME_TOKENS_V297')) throw new Error('diagnostics theme check missing');
const files=[...index.matchAll(/"(assets\/[^"?]+\.js)"/g)].map(m=>m[1]);
for(const f of files){must('fenxi/'+f)}
for(const f of fs.readdirSync(path.join(root,'fenxi/assets')).filter(x=>x.endsWith('.js')&&x.includes('v297'))){new Function(fs.readFileSync(path.join(root,'fenxi/assets',f),'utf8'));}
console.log('V2.9.7 validation passed');
