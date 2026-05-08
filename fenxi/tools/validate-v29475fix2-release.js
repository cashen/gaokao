const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1); } }
const html = read('index.html');
const js = read('assets/app.v29475fix2.js');
const css = read('assets/app.v29475fix2.css');
const readme = read('README.md');
assert(html.includes('app.v29475fix2.js'), 'index.html must reference app.v29475fix2.js');
assert(html.includes('app.v29475fix2.css'), 'index.html must reference app.v29475fix2.css');
assert(html.includes('A/B/C 首选推荐与一键加入自选版'), 'index title/version missing fix2');
assert(js.includes("V2.9.4.7.5.fix2"), 'JS version missing fix2');
assert(js.includes('primaryPlanItemV29475Fix2'), 'primary card renderer missing');
assert(js.includes('backupPlanItemV29475Fix2'), 'backup card renderer missing');
assert(js.includes('addPlanGroupV29475Fix2'), 'add plan group function missing');
assert(js.includes('addAllPlansV29475Fix2'), 'add all plans function missing');
assert(js.includes('planPathCategoryV29475Fix2'), 'professional path category function missing');
assert(js.includes('candidateKeyV29475Fix2'), 'candidate de-dup key function missing');
assert(css.includes('plan-primary-v29475fix2'), 'primary card CSS missing');
assert(css.includes('plan-backup-v29475fix2'), 'backup card CSS missing');
assert(css.includes('@media(max-width:1280px)'), 'Pad responsive CSS missing');
assert(css.includes('@media(max-width:920px)'), 'Android/small responsive CSS missing');
assert(readme.includes('13 项修正 / 增强'), 'README change count missing');
assert(readme.includes('A 看底线，B 看专业，C 看上限'), 'README product principle missing');
console.log('V2.9.4.7.5.fix2 release validation passed.');
