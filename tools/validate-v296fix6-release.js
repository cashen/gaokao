const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');const fenxi=path.join(root,'fenxi');
const required=['assets/qualification-gate-rules.v297.js','assets/qualification-gate.v297.js','assets/qualification-gate-ui.v297.js','assets/app.v297.js','assets/filter-engine.v297.js','assets/plan-engine.v297.js','assets/candidate-card-view.v297.js','assets/render.v297.js'];
for(const f of required){if(!fs.existsSync(path.join(fenxi,f))){throw new Error('missing '+f);}}
const idx=fs.readFileSync(path.join(fenxi,'index.html'),'utf8');
for(const f of required.slice(0,3)){if(!idx.includes(f)){throw new Error('index not referencing '+f);}}
const diag=fs.readFileSync(path.join(fenxi,'diagnostics.html'),'utf8');
for(const name of ['LN_QUALIFICATION_GATE_RULES_V296','LN_QUALIFICATION_GATE_V296','LN_QUALIFICATION_GATE_UI_V296']){if(!diag.includes(name)){throw new Error('diagnostics missing '+name);}}
console.log('V2.9.7 validation passed');
