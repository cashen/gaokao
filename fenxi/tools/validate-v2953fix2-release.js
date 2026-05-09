const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1); } }
['index.html','assets/config.v2953.js','assets/rules.v2953.js','assets/data-engine.v2953.js','assets/filter-engine.v2953.js','assets/plan-engine.v2953.js','assets/render.v2953.js','assets/selection.v2953.js','assets/export.v2953.js','assets/app.v2953fix2.js','assets/app.v2953fix2.css'].forEach(p=>assert(fs.existsSync(path.join(root,p)),`missing ${p}`));
const html = read('index.html');
assert(html.includes('app.v2953fix2.js'), 'index must load app.v2953fix2.js');
assert(html.includes('app.v2953fix2.css'), 'index must load app.v2953fix2.css');
assert(!html.includes('app.v2953fix1.js'), 'index must not load fix1 js');
assert(!html.includes('gateBox'), 'old gateBox must be removed');
const data = read('assets/data-engine.v2953.js').slice(0,300);
assert(!data.includes('autoRefresh'), 'data-engine top must not reference autoRefresh');
assert(!read('assets/data-engine.v2953.js').includes('debouncedAutoRefresh'), 'data-engine must not declare debouncedAutoRefresh');
const render = read('assets/render.v2953.js');
assert(!/window\.LN_RENDER\s*=\s*\{[\s\S]*renderCards,\s*renderStructure/.test(render), 'render must not export renderStructure');
const app = read('assets/app.v2953fix2.js');
assert((app.match(/const debouncedAutoRefresh/g)||[]).length === 1, 'app must declare debouncedAutoRefresh once');
assert(app.includes('bindAccessEnterV2953Fix1'), 'app must keep enter unlock binding');
assert(app.includes("case 'unlock-top'"), 'app must handle unlock-top');
console.log('V2.9.5.3.fix2 validation passed');
