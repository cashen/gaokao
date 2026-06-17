const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
const checks=[];
function check(name, ok){ checks.push([name, !!ok]); }
const index=read('fenxi/index.html');
check('VERSION txt is V2.9.8.1', read('fenxi/VERSION.txt').includes('V2.9.8.1'));
check('index title updated', index.includes('V2.9.8.1｜学生画像、兴趣闭环与候选证据卡增强版'));
check('index uses app.v2981.css', index.includes('assets/app.v2981.css'));
const required=[
 'fenxi/assets/student-profile-rules.v2981.js',
 'fenxi/assets/student-profile-ui.v2981.js',
 'fenxi/assets/profile-interest-bridge-rules.v2981.js',
 'fenxi/assets/admission-safety-rules.v2981.js',
 'fenxi/assets/admission-evidence-rules.v2981.js',
 'fenxi/assets/candidate-decision-tags.v2981.js',
 'fenxi/assets/candidate-tradeoff-rules.v2981.js',
 'fenxi/assets/abc-decision-card-model.v2981.js',
 'fenxi/assets/detail-candidate-card-model.v2981.js',
 'fenxi/assets/candidate-tag-ui.v2981.js',
 'fenxi/assets/abc-decision-ui.v2981.js',
 'fenxi/assets/detail-card-ui.v2981.js',
 'fenxi/assets/export-decision-fields.v2981.js',
 'fenxi/assets/child-intent-ui.v2981.js',
 'fenxi/assets/render.v2981.js',
 'fenxi/assets/export.v2981.js',
 'fenxi/assets/app.v2981.js'
];
required.forEach(f=>check('exists '+f, exists(f) && index.includes(f.replace('fenxi/',''))));
check('student profile V2976 alias fixed', read('fenxi/assets/student-profile-rules.v2981.js').includes('LN_STUDENT_PROFILE_RULES_V2976=api'));
check('profile bridge influences child intent UI', read('fenxi/assets/child-intent-ui.v2981.js').includes('LN_PROFILE_INTEREST_BRIDGE_V2981'));
check('A/B/C decision UI overrides renderer', read('fenxi/assets/abc-decision-ui.v2981.js').includes('window.renderPlanABC=renderPlanABCV2981'));
check('detail cards inject decision tags', read('fenxi/assets/render.v2981.js').includes('LN_DETAIL_CARD_UI_V2981'));
check('tag click UI supports one explanation panel', read('fenxi/assets/candidate-tag-ui.v2981.js').includes('data-tag-detail-box'));
check('export includes decision fields', read('fenxi/assets/export.v2981.js').includes('录取安全标签') && read('fenxi/assets/export.v2981.js').includes('LN_EXPORT_DECISION_FIELDS_V2981'));
check('diagnostics includes v2981 modules', read('fenxi/diagnostics.html').includes('LN_ABC_DECISION_UI_V2981'));
check('middleware protects /data', read('functions/_middleware.js').includes("pathname === '/data'") && read('functions/_middleware.js').includes("pathname.startsWith('/data/')"));
check('doc exists', exists('docs/V2.9.8.1_学生画像兴趣闭环与候选证据卡增强版说明.md'));
let failed=0;
for(const [name,ok] of checks){ console.log(`${ok?'✅':'❌'} ${name}`); if(!ok) failed++; }
if(failed){ console.error(`\n${failed} checks failed.`); process.exit(1); }
console.log(`\nAll ${checks.length} V2.9.8.1 checks passed.`);
