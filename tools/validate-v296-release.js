const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const FENXI = path.join(ROOT, 'fenxi');
function must(p){ if(!fs.existsSync(path.join(ROOT,p))) throw new Error('missing '+p); }
function read(p){ return fs.readFileSync(path.join(ROOT,p),'utf8'); }
['fenxi/index.html','fenxi/diagnostics.html','fenxi/VERSION.txt','functions/_middleware.js'].forEach(must);
const index=read('fenxi/index.html');
if(!index.includes('V2.9.6｜控制区收纳与交互性能优化版')) throw new Error('version text missing in index');
const m=index.match(/const files=\[(.*?)\];/s); if(!m) throw new Error('loader files not found');
const files=[...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
files.forEach(f=>must('fenxi/'+f));
['assets/interaction-policy.v296.js','assets/refresh-scheduler.v296.js','assets/state-snapshot.v296.js','assets/candidate-cache.v296.js','assets/drawer.v296.js','assets/child-interest-runtime.v296.js','assets/child-interest-ui.v296.js','assets/scenario-ui.v296.js','assets/abc-view.v296.js'].forEach(f=>must('fenxi/'+f));
const diag=read('fenxi/diagnostics.html');
['LN_REFRESH_SCHEDULER_V296','LN_STATE_SNAPSHOT_V296','LN_CANDIDATE_CACHE_V296','LN_CHILD_INTEREST_UI_V296','LN_SCENARIO_UI_V296','LN_ABC_VIEW_V296'].forEach(k=>{if(!diag.includes(k)) throw new Error('diagnostics missing '+k);});
console.log('V2.9.6 validation passed');
