const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const required=[
 'fenxi/index.html','fenxi/diagnostics.html','fenxi/VERSION.txt','functions/_middleware.js',
 'fenxi/assets/catalog-interest-binding.v298.js','fenxi/assets/candidate-catalog-normalizer.v298.js','fenxi/assets/catalog-match-engine.v298.js','fenxi/assets/interest-hit-summary.v298.js','fenxi/assets/interest-weight-rules.v298.js','fenxi/assets/child-interest-runtime.v298.js','fenxi/assets/child-interest-ui.v298.js','fenxi/assets/child-intent-ui.v298.js','fenxi/assets/path-explain-engine.v298.js','fenxi/assets/export.v298.js','fenxi/assets/app.v298.js','fenxi/assets/app.v298.css'
];
let ok=true;
for(const f of required){const p=path.join(root,f); if(!fs.existsSync(p)){console.error('missing',f); ok=false;}}
const idx=fs.readFileSync(path.join(root,'fenxi/index.html'),'utf8');
['catalog-interest-binding.v298.js','catalog-match-engine.v298.js','child-interest-runtime.v298.js','path-explain-engine.v298.js','export.v298.js','app.v298.js'].forEach(x=>{if(!idx.includes(x)){console.error('index missing ref',x); ok=false;}});
const ver=fs.readFileSync(path.join(root,'fenxi/VERSION.txt'),'utf8');
if(!ver.includes('V2.9.8')){console.error('VERSION not V2.9.8'); ok=false;}
if(fs.existsSync(path.join(root,'index.html'))){console.error('root index exists in fenxi-only package workspace'); ok=false;}
process.exit(ok?0:1);
