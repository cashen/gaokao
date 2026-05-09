const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1); } }

const index = read('index.html');
assert(index.includes('V2.9.5.3.fix1｜访问码入口统一修正版'), 'index version missing');
assert(index.includes('./assets/app.v2953fix1.css'), 'index css not switched to fix1');
assert(index.includes('./assets/app.v2953fix1.js'), 'index js not switched to fix1');
assert(!index.includes('id="gateBox"'), 'old gateBox still exists in index');
assert(index.includes('id="accessCodeTop"'), 'top access input missing');
assert(index.includes('data-action="unlock-top"'), 'unlock-top action missing');
assert(!index.includes('id="accessCode"'), 'old accessCode input still exists');

const app = read('assets/app.v2953fix1.js');
assert(app.includes('function unlockAccess()'), 'unlockAccess missing');
assert(app.includes('bindAccessEnterV2953Fix1'), 'Enter binding missing');
assert(app.includes("case 'unlock-top':"), 'unlock-top case missing');
assert(app.includes("case 'unlock': return unlockAccess();"), 'unlock compatibility case missing');
assert(!app.includes('gateBox'), 'app fix1 still references gateBox');
assert(!app.includes('unlockFromTop'), 'old unlockFromTop remains');

const filter = read('assets/filter-engine.v2953.js');
assert(!/function\s+unlock\s*\(/.test(filter), 'filter-engine still defines unlock');
assert(filter.includes('访问码逻辑已统一迁移'), 'filter-engine migration comment missing');

assert(exists('assets/config.v2953.js'), 'config missing');
assert(exists('assets/rules.v2953.js'), 'rules missing');
assert(exists('assets/data-engine.v2953.js'), 'data-engine missing');
assert(exists('assets/filter-engine.v2953.js'), 'filter-engine missing');
assert(exists('assets/plan-engine.v2953.js'), 'plan-engine missing');
assert(exists('assets/render.v2953.js'), 'render missing');
assert(exists('assets/selection.v2953.js'), 'selection missing');
assert(exists('assets/export.v2953.js'), 'export missing');
assert(exists('assets/app.v2953fix1.css'), 'fix1 css missing');
assert(!exists('assets/app.v2953.js'), 'old app.v2953.js should not be in production package');
assert(!exists('assets/app.v2953.css'), 'old app.v2953.css should not be in production package');

console.log('V2.9.5.3.fix1 release validation passed');
