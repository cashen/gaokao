const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1); } }
const html = read('index.html');
const currentJs = html.includes('app.v29475fix3.js') ? 'assets/app.v29475fix3.js' : 'assets/app.v29475fix2.js';
const currentCss = html.includes('app.v29475fix3.css') ? 'assets/app.v29475fix3.css' : 'assets/app.v29475fix2.css';
const js = read(currentJs);
const css = read(currentCss);
const readme = read('README.md');
assert(html.includes(currentJs), 'index.html must reference current fix2/fix3 js');
assert(html.includes(currentCss), 'index.html must reference current fix2/fix3 css');
assert(html.includes('V2.9.4.7.5.fix'), 'index title/version missing fix line');
assert(js.includes('V2.9.4.7.5.fix'), 'JS version missing fix line');
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
assert(readme.includes('A/B/C'), 'README A/B/C description missing');
assert(readme.includes('A 看底线，B 看专业，C 看上限'), 'README product principle missing');
console.log('V2.9.4.7.5.fix2/fix3 compatibility validation passed.');
