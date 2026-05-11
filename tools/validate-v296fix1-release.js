const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
function must(p){ if(!fs.existsSync(path.join(ROOT,p))) throw new Error('missing '+p); }
function read(p){ return fs.readFileSync(path.join(ROOT,p),'utf8'); }
['fenxi/index.html','fenxi/diagnostics.html','fenxi/VERSION.txt','functions/_middleware.js'].forEach(must);
const index=read('fenxi/index.html');
if(!index.includes('V2.9.6.fix2｜认证后模型加载与诊断补全修正版')) throw new Error('version text missing in index');
const m=index.match(/const files=\[(.*?)\];/s); if(!m) throw new Error('loader files not found');
const files=[...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
files.forEach(f=>must('fenxi/'+f));
['assets/interaction-policy.v296fix2.js','assets/refresh-scheduler.v296fix2.js','assets/state-snapshot.v296fix2.js','assets/candidate-cache.v296fix2.js','assets/drawer.v296fix2.js','assets/child-interest-runtime.v296fix2.js','assets/child-interest-ui.v296fix2.js','assets/scenario-ui.v296fix2.js','assets/abc-view.v296fix2.js','assets/app.v296fix2.js'].forEach(f=>must('fenxi/'+f));
const app=read('fenxi/assets/app.v296fix2.js');
if(!app.includes('function requestRefreshV296')) throw new Error('requestRefreshV296 not defined');
if(!app.includes('window.__LN_AUTO_REFRESH_DIRECT__')) throw new Error('scheduler direct hook missing');
if(!app.includes('document.body.dataset.diagnostics')) throw new Error('diagnostics guard missing');
const diag=read('fenxi/diagnostics.html');
['LN_REFRESH_SCHEDULER_V296','LN_STATE_SNAPSHOT_V296','LN_CANDIDATE_CACHE_V296','LN_CHILD_INTEREST_UI_V296','LN_SCENARIO_UI_V296','LN_ABC_VIEW_V296','LN_APP'].forEach(k=>{if(!diag.includes(k)) throw new Error('diagnostics missing '+k);});
console.log('V2.9.6.fix2 validation passed');
