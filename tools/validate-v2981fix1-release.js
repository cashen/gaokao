const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
const checks=[];
function check(name, ok){ checks.push([name, !!ok]); }
const index=read('fenxi/index.html');
const version=read('fenxi/VERSION.txt');
check('VERSION txt is V2.9.8.1.fix1', version.includes('V2.9.8.1.fix1'));
check('index visible title is fix1', index.includes('辽宁物理类高考志愿初选工具 V2.9.8.1.fix1｜信息层级收敛与决策卡轻量化修正版'));
check('index uses fix1 css', index.includes('assets/app.v2981fix1.css'));
check('index cache version fix1', index.includes("const VERSION='2981fix1-20260510'"));
const required=[
 'fenxi/assets/selection-context-summary.v2981fix1.js',
 'fenxi/assets/context-summary-ui.v2981fix1.js',
 'fenxi/assets/notice-compact-rules.v2981fix1.js',
 'fenxi/assets/notice-compact-ui.v2981fix1.js',
 'fenxi/assets/profile-interest-summary.v2981fix1.js',
 'fenxi/assets/decision-reminder-dedupe.v2981fix1.js',
 'fenxi/assets/detail-card-lite-model.v2981fix1.js',
 'fenxi/assets/detail-card-lite-ui.v2981fix1.js',
 'fenxi/assets/app.v2981fix1.js',
 'fenxi/assets/app.v2981fix1.css'
];
required.forEach(f=>check('exists and loaded '+f, exists(f) && (f.endsWith('.css') ? index.includes('assets/app.v2981fix1.css') : index.includes(f.replace('fenxi/','')))));
check('standalone advanced rules hidden, not removed unsafely', read('fenxi/assets/app.v2981fix1.css').includes('#mentorRules{display:none'));
check('current context summary exists', read('fenxi/assets/selection-context-summary.v2981fix1.js').includes('当前口径') || read('fenxi/assets/context-summary-ui.v2981fix1.js').includes('当前口径'));
check('qualification notice compacted', read('fenxi/assets/notice-compact-rules.v2981fix1.js').includes('资格入口：普通考生口径'));
check('rank band notice compacted', read('fenxi/assets/notice-compact-rules.v2981fix1.js').includes('位次带宽：'));
check('advisor diagnosis compacted', read('fenxi/assets/app.v2981fix1.js').includes('diagnosis-compact-v2981fix1'));
check('compact notice detail preserves expanded state', read('fenxi/assets/notice-compact-ui.v2981fix1.js').includes('restoreDetail') && read('fenxi/assets/notice-compact-ui.v2981fix1.js').includes('activeKey') && read('fenxi/assets/notice-compact-ui.v2981fix1.js').includes('aria-expanded'));
check('profile and interest summary merged', read('fenxi/assets/profile-interest-summary.v2981fix1.js').includes('孩子画像与兴趣'));
check('detail card lite model exists', read('fenxi/assets/detail-card-lite-model.v2981fix1.js').includes('mainJudgement'));
check('detail card lite UI limits tags to four', read('fenxi/assets/detail-card-lite-ui.v2981fix1.js').includes('max:4'));
check('detail card default has main judgement', read('fenxi/assets/detail-card-lite-ui.v2981fix1.js').includes('主判断'));
check('reminder dedupe exists', read('fenxi/assets/decision-reminder-dedupe.v2981fix1.js').includes('primary'));
check('diagnostics includes fix1 modules', read('fenxi/diagnostics.html').includes('LN_APP_V2981FIX1') && read('fenxi/diagnostics.html').includes('selection-context-summary.v2981fix1.js'));
check('middleware protects /fenxi/data and /data', read('functions/_middleware.js').includes("pathname.startsWith('/fenxi/data/')") && read('functions/_middleware.js').includes("pathname.startsWith('/data/')"));
check('doc exists', exists('docs/V2.9.8.1.fix1_信息层级收敛与决策卡轻量化修正版说明.md'));
check('audit script exists', exists('tools/audit-v2981fix1-unused-code.js'));
let failed=0;
for(const [name,ok] of checks){ console.log(`${ok?'✅':'❌'} ${name}`); if(!ok) failed++; }
if(failed){ console.error(`\n${failed} checks failed.`); process.exit(1); }
console.log(`\nAll ${checks.length} V2.9.8.1.fix1 checks passed.`);
