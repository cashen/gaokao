const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');
const must = [
  'index.html','diagnostics.html','README.md','VERSION.txt',
  'assets/config.v2953fix3.js','assets/rules.v2953fix3.js','assets/data-engine.v2953fix3.js','assets/filter-engine.v2953fix3.js','assets/plan-engine.v2953fix3.js','assets/render.v2953fix3.js','assets/selection.v2953fix3.js','assets/export.v2953fix3.js','assets/app.v2953fix3.js','assets/app.v2953fix3.css',
  'assets/major-name-model.v2946.js','assets/confusable-major-model.v29462.js',
  'data/manifest.json','data/rank_2025_physics.json'
];
function assert(cond,msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1);} }
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
for(const p of must) assert(fs.existsSync(path.join(root,p)), 'missing '+p);
const html = read('index.html');
for(const f of ['config.v2953fix3.js','rules.v2953fix3.js','data-engine.v2953fix3.js','filter-engine.v2953fix3.js','plan-engine.v2953fix3.js','render.v2953fix3.js','selection.v2953fix3.js','export.v2953fix3.js','app.v2953fix3.js','app.v2953fix3.css']){
  assert(html.includes(f), 'index missing '+f);
}
for(const old of ['data-engine.v2953.js','render.v2953.js','app.v2953fix1.js','app.v2953fix2.js','app.v2953.js']){
  assert(!html.includes(old), 'index still references old '+old);
}
const assets = fs.readdirSync(path.join(root,'assets'));
for(const f of assets){
  assert(!/^app\.v2953(?:\.js|\.css)$/.test(f), 'old app v2953 present '+f);
  assert(!/^app\.v2953fix[12](?:\.js|\.css)$/.test(f), 'old app fix present '+f);
  assert(!/^(config|rules|data-engine|filter-engine|plan-engine|render|selection|export)\.v2953\.js$/.test(f), 'old module present '+f);
}
assert((html.match(/onclick=/g)||[]).length===0, 'index contains inline onclick');
const data = read('assets/data-engine.v2953fix3.js');
assert(!/autoRefresh|debouncedAutoRefresh/.test(data), 'data-engine must not reference autoRefresh/debouncedAutoRefresh');
const render = read('assets/render.v2953fix3.js');
const renderExport = render.slice(render.lastIndexOf('window.LN_RENDER'));
assert(!/renderStructure/.test(renderExport), 'render must not export renderStructure');
const app = read('assets/app.v2953fix3.js');
assert(!/const\s+debouncedAutoRefresh/.test(app), 'app must not declare const debouncedAutoRefresh');
assert(/window\.debouncedAutoRefreshV2953Fix3/.test(app), 'app missing cache-safe debounced function');
assert(/function\s+unlockAccess/.test(app), 'app missing unlockAccess');
assert(/startV2953Fix3/.test(app), 'app missing fix3 start');
const diag = read('diagnostics.html');
assert(diag.includes('config.v2953fix3.js') && diag.includes('render.v2953fix3.js'), 'diagnostics does not load fix3 modules');
// Syntax check all JS files in current assets only.
for(const f of assets.filter(x=>x.endsWith('.js'))){
  cp.execFileSync(process.execPath, ['--check', path.join(root,'assets',f)], {stdio:'pipe'});
}
console.log('V2.9.5.3.fix3 release validation passed');
