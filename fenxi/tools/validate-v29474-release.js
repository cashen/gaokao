const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
function assert(cond,msg){if(!cond){console.error('FAIL:',msg);process.exit(1)}}
const html=read('index.html');
const currentJs=html.includes('assets/app.v29475fix2.js')?'assets/app.v29475fix2.js':(html.includes('assets/app.v29475fix.js')?'assets/app.v29475fix.js':(html.includes('assets/app.v29475.js')?'assets/app.v29475.js':'assets/app.v29474.js'));
const currentCss=html.includes('assets/app.v29475fix2.css')?'assets/app.v29475fix2.css':(html.includes('assets/app.v29475fix.css')?'assets/app.v29475fix.css':(html.includes('assets/app.v29475.css')?'assets/app.v29475.css':'assets/app.v29474.css'));
const js=read(currentJs);
const css=read(currentCss);
assert(html.includes('id="specialPlanStatus"'),'specialPlanStatus field missing');
assert(html.includes('specialPlanNoticeV29474'),'specialPlanNoticeV29474 missing');
assert(html.includes('id="exSpecial"'),'exSpecial counter missing');
assert(js.includes('function hasCollegeSpecialPlanV29474'),'special plan detector missing in current JS');
assert(js.includes('function specialPlanStatusV29474'),'special plan status function missing in current JS');
assert(js.includes('高校专项资格保护'),'funnel special plan protection missing in current JS');
assert(js.includes("exStats['高校专项隐藏']"),'special plan hidden stats missing in current JS');
assert(js.includes('isCollegeSpecialPlanV29474'),'record flag missing in current JS');
assert(js.includes('专项资格审核'),'review tag missing in current JS');
assert(css.includes('special-plan-notice-v29474'),'CSS special notice missing in current CSS');
console.log('validate-v29474-release: OK (validated current entry: '+currentJs+')');
