
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const required=[
 'index.html','diagnostics.html','assets/config.v2954fix3.js','assets/rules.v2954fix3.js','assets/data-engine.v2954fix3.js','assets/filter-engine.v2954fix3.js','assets/plan-engine.v2954fix3.js','assets/render.v2954fix3.js','assets/selection.v2954fix3.js','assets/export.v2954fix3.js','assets/app.v2954fix3.js','fenxi/index.html','fenxi/diagnostics.html','fenxi/assets/config.v2954fix3.js','fenxi/assets/plan-engine.v2954fix3.js'
];
for(const f of required){if(!fs.existsSync(path.join(root,f))){throw new Error('Missing '+f)}}
for(const f of required.filter(x=>x.endsWith('.js'))){new Function(fs.readFileSync(path.join(root,f),'utf8'));}
const idx=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(idx.includes('访问码：ln2025')||idx.includes('模块缓存隔离与运行时校验版')) throw new Error('Old exposed text found');
const plan=fs.readFileSync(path.join(root,'assets/plan-engine.v2954fix3.js'),'utf8');
if(!plan.includes('scenarioPlanAdjustmentV2954Fix2')) throw new Error('scenario plan adjustment missing');
if(!plan.includes('sc += scenarioPlanAdjustmentV2954Fix2')) throw new Error('scenario adjustment not applied');
const rules=fs.readFileSync(path.join(root,'assets/rules.v2954fix3.js'),'utf8');
if(!rules.includes("preference:{priority:'medical'")) throw new Error('medical priority not fixed');
const app=fs.readFileSync(path.join(root,'assets/app.v2954fix3.js'),'utf8');
if(!app.includes('highFeeRejectTouchedV2954Fix2')) throw new Error('high fee reject protection missing');
console.log('V2.9.5.4.fix3 validation passed');
