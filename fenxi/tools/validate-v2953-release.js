const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const must=[
 'index.html',
 'assets/config.v2953.js','assets/rules.v2953.js','assets/data-engine.v2953.js','assets/filter-engine.v2953.js','assets/plan-engine.v2953.js','assets/render.v2953.js','assets/selection.v2953.js','assets/export.v2953.js','assets/app.v2953.js','assets/app.v2953.css',
 'assets/major-name-model.v2946.js','assets/confusable-major-model.v29462.js',
 'data/manifest.json','data/rank_2025_physics.json'
];
for(const f of must){ if(!fs.existsSync(path.join(root,f))) throw new Error('missing '+f); }
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const s of ['config.v2953.js','rules.v2953.js','data-engine.v2953.js','filter-engine.v2953.js','plan-engine.v2953.js','render.v2953.js','selection.v2953.js','export.v2953.js','app.v2953.js']){ if(!html.includes(s)) throw new Error('index missing '+s); }
if(/onclick=/.test(html)) throw new Error('index still contains onclick');
const app=fs.readFileSync(path.join(root,'assets/app.v2953.js'),'utf8');
if(!app.includes('handleActionV2953')) throw new Error('app action delegate missing');
if(!app.includes('startV2953')) throw new Error('app start missing');
const rules=fs.readFileSync(path.join(root,'assets/rules.v2953.js'),'utf8');
for(const k of ['scenarioPresets','preferenceRules','baselineRules','planRules','pathRules','reviewRules']){ if(!rules.includes(k)) throw new Error('rules missing '+k); }
console.log('V2.9.5.3 release validation passed');
