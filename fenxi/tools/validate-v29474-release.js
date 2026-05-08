const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
function assert(cond,msg){if(!cond){console.error('FAIL:',msg);process.exit(1)}}
const html=read('index.html');
const js=read('assets/app.v29474.js');
const css=read('assets/app.v29474.css');
assert(html.includes('V2.9.4.7.4｜专项计划资格默认保护版'),'HTML title/version missing');
assert(html.includes('assets/app.v29474.js'),'HTML does not reference app.v29474.js');
assert(html.includes('assets/app.v29474.css'),'HTML does not reference app.v29474.css');
assert(html.includes('id="specialPlanStatus"'),'specialPlanStatus field missing');
assert(html.includes('specialPlanNoticeV29474'),'specialPlanNoticeV29474 missing');
assert(html.includes('id="exSpecial"'),'exSpecial counter missing');
assert(js.includes('function hasCollegeSpecialPlanV29474'),'special plan detector missing');
assert(js.includes('function specialPlanStatusV29474'),'special plan status function missing');
assert(js.includes('高校专项资格保护'),'funnel special plan protection missing');
assert(js.includes("exStats['高校专项隐藏']"),'special plan hidden stats missing');
assert(js.includes('isCollegeSpecialPlanV29474'),'record flag missing');
assert(js.includes('专项资格审核'),'review tag missing');
assert(css.includes('special-plan-notice-v29474'),'CSS special notice missing');
console.log('validate-v29474-release: OK');
