const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(p){ return fs.readFileSync(path.join(root, p), 'utf8'); }
function assert(cond, msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1); } }
const html = read('index.html');
const js = read('assets/app.v29475fix3.js');
const css = read('assets/app.v29475fix3.css');
const readme = read('README.md');
assert(html.includes('app.v29475fix3.js'), 'index.html must reference app.v29475fix3.js');
assert(html.includes('app.v29475fix3.css'), 'index.html must reference app.v29475fix3.css');
assert(html.includes('V2.9.4.7.5.fix3'), 'index title/version missing fix3');
assert(js.includes("V2.9.4.7.5.fix3"), 'JS version missing fix3');
assert(js.includes('优先看'), 'primary badge text should be 优先看');
assert(!js.includes('<span>首选推荐</span>'), 'black-label primary wording should be removed from renderer');
assert(js.includes('backup-main-v29475fix3'), 'compact backup card main block missing');
assert(js.includes('compactTextV29475Fix3'), 'compact backup text helper missing');
const backupFn = js.slice(js.indexOf('function backupPlanItemV29475Fix2'), js.indexOf('function planStatsV29475Fix2'));
assert(!backupFn.includes('<p><b>为什么'), 'backup card should not render long why paragraph');
assert(!backupFn.includes('<p><b>风险'), 'backup card should not render long risk paragraph');
assert(css.includes('primary-kicker-v29475fix2 span'), 'primary badge CSS missing');
assert(!css.includes('background:#111827;color:#fff;font-size:11px;font-weight:900;padding:4px 8px'), 'old black primary badge CSS should not remain');
assert(css.includes('backup-main-v29475fix3'), 'compact backup CSS missing');
assert(css.includes('plan-backup-v29475fix2') && css.includes('padding:7px 8px'), 'backup card compact padding missing');
assert(css.includes('@media(max-width:560px)'), 'mobile responsive CSS missing');
assert(readme.includes('6. 新增 validate-v29475fix3-release.js'), 'README fix3 change list missing');
console.log('V2.9.4.7.5.fix3 release validation passed.');
