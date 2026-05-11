const fs = require('fs');
const path = require('path');
const root = process.cwd();
const checks=[];
function ok(name, cond){checks.push([name, !!cond]); if(!cond) console.error('FAIL:', name);}
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
const idx=read('fenxi/index.html');
const version=read('fenxi/VERSION.txt');
ok('VERSION is fix2', version.includes('V2.9.8.1.fix2'));
ok('index visible title is fix2', idx.includes('V2.9.8.1.fix2') && idx.includes('画像前置、家长必读与详细卡稳定修正版'));
ok('index loads fix2 css', idx.includes('app.v2981fix2.css'));
ok('index loads fix2 app', idx.includes('app.v2981fix2.js'));
[
 'student-profile-normalizer.v2981fix2.js','campus-location-rules.v2981fix2.js','parent-must-read-rules.v2981fix2.js','export-decision-fields.v2981fix2.js','decision-reminder-dedupe.v2981fix2.js','profile-interest-summary.v2981fix2.js','detail-card-lite-model.v2981fix2.js','detail-card-lite-ui.v2981fix2.js','notice-compact-ui.v2981fix2.js','app.v2981fix2.js','app.v2981fix2.css'
].forEach(f=>ok('exists '+f, fs.existsSync(path.join(root,'fenxi/assets',f))));
const prof=read('fenxi/assets/student-profile-normalizer.v2981fix2.js');
ok('profile default neutral prevents unclear hot-word reminder', prof.includes("s.understanding==='hot_words'") && !prof.includes("s.understanding==='hot_words'||s.understanding==='unclear'"));
const summary=read('fenxi/assets/profile-interest-summary.v2981fix2.js');
ok('profile interest summary includes translated line', summary.includes('兴趣转译') && summary.includes('真实候选：正主'));
const pmr=read('fenxi/assets/parent-must-read-rules.v2981fix2.js');
ok('parent must read has universal match levels', pmr.includes("im.level==='review'") && pmr.includes("im.level==='related'") && pmr.includes("im.level==='core'"));
ok('parent must read has animal/environment specific reminder', pmr.includes('这不是动物医学正主方向') && pmr.includes('生态环境相关专业'));
const detail=read('fenxi/assets/detail-card-lite-ui.v2981fix2.js');
ok('detail card contains parent must-read label', detail.includes('家长必读'));
ok('detail card uses two-line evidence wrapper', detail.includes('detail-evidence-v2981fix2') && detail.includes('evidenceLines.y2025') && detail.includes('evidenceLines.safety'));
const css=read('fenxi/assets/app.v2981fix2.css');
ok('css hides legacy profile box', css.includes('#studentProfileBoxV2975') && css.includes('display:none'));
ok('css hides repeated legacy detail sections outside detailed mode', css.includes('path-reminder-v2975') && css.includes('card-meta-v29461'));
ok('css fixes evidence wrapping', css.includes('overflow-wrap:anywhere') && css.includes('grid-template-columns:1fr'));
const campus=read('fenxi/assets/campus-location-rules.v2981fix2.js');
ok('campus rule detects Panjin campus', campus.includes('盘锦校区') && campus.includes('就读地请复核'));
const notice=read('fenxi/assets/notice-compact-ui.v2981fix2.js');
ok('compact notice preserves open keys', notice.includes('openKeys') && notice.includes('高报师诊断说明'));
const exp=read('fenxi/assets/export-decision-fields.v2981fix2.js');
ok('export includes parent must-read', exp.includes('parentMustRead') && exp.includes('campusWarning'));
const diag=read('fenxi/diagnostics.html');
ok('diagnostics title is fix2', diag.includes('V2.9.8.1.fix2'));
ok('diagnostics loads fix2 files', diag.includes('parent-must-read-rules.v2981fix2.js') && diag.includes('app.v2981fix2.js'));
const mw=fs.existsSync(path.join(root,'functions/_middleware.js')) ? read('functions/_middleware.js') : '';
ok('middleware protects fenxi data', mw.includes('/fenxi/data') || mw.includes('fenxi/data'));
ok('middleware protects root data', mw.includes('/data'));
const top=fs.readdirSync(root).filter(x=>!x.startsWith('.')).sort().join('|');
ok('top-level fenxi-only directories', top === 'docs|fenxi|functions|tools');
const failed=checks.filter(x=>!x[1]);
if(failed.length){console.error(`${failed.length} checks failed`); process.exit(1);} else {console.log(`All ${checks.length} V2.9.8.1.fix2 checks passed.`);} 
