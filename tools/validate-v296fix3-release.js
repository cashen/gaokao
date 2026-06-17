const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const fenxi = path.join(root, 'fenxi');
const required = [
  'index.html','diagnostics.html','VERSION.txt',
  'assets/config.v296fix3.js','assets/rules.v296fix3.js','assets/interaction-policy.v296fix3.js',
  'assets/perf-monitor.v296fix3.js','assets/candidate-cache.v296fix3.js','assets/state-snapshot.v296fix3.js',
  'assets/refresh-scheduler.v296fix3.js','assets/drawer.v296fix3.js',
  'assets/child-interest-rules.v296fix3.js','assets/child-interest-runtime.v296fix3.js','assets/child-interest-ui.v296fix3.js',
  'assets/scenario-ui.v296fix3.js','assets/abc-view.v296fix3.js','assets/candidate-card-view.v296fix3.js',
  'assets/data-engine.v296fix3.js','assets/filter-engine.v296fix3.js','assets/plan-engine.v296fix3.js',
  'assets/render.v296fix3.js','assets/selection.v296fix3.js','assets/export.v296fix3.js','assets/app.v296fix3.js','assets/app.v296fix3.css'
];
let ok = true;
for (const rel of required) {
  const p = path.join(fenxi, rel);
  if (!fs.existsSync(p)) { console.error('Missing:', rel); ok=false; }
}
const idx = fs.readFileSync(path.join(fenxi,'index.html'),'utf8');
for (const rel of required.filter(x=>x.startsWith('assets/'))) {
  if (!idx.includes(rel)) { console.error('index missing ref:', rel); ok=false; }
}
const diag = fs.readFileSync(path.join(fenxi,'diagnostics.html'),'utf8');
for (const name of ['LN_ABC_VIEW_V296','LN_CANDIDATE_CARD_VIEW_V296','LN_PLAN_ENGINE','LN_APP']) {
  if (!diag.includes(name)) { console.error('diagnostics missing module:', name); ok=false; }
}
const plan = fs.readFileSync(path.join(fenxi,'assets/plan-engine.v296fix3.js'),'utf8');
for (const marker of ['renderPlanABCViewOnly','LN_CANDIDATE_CARD_VIEW_V296','planScoreV296Fix3Compute']) {
  if (!plan.includes(marker)) { console.error('plan-engine missing marker:', marker); ok=false; }
}
if (!ok) process.exit(1);
console.log('V2.9.6.fix3 validation passed');
