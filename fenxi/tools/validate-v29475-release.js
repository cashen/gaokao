const fs=require('fs');
const path=require('path');
function read(p){return fs.readFileSync(path.join(__dirname,'..',p),'utf8')}
function assert(c,m){if(!c){throw new Error(m)}}
const html=read('index.html');
const js=read('assets/app.v29475.js');
const css=read('assets/app.v29475.css');
assert(html.includes('V2.9.4.7.5｜预算宽路径与紧凑方案盘版'),'HTML title/version missing');
assert(html.includes('assets/app.v29475.js'),'HTML does not reference app.v29475.js');
assert(html.includes('assets/app.v29475.css'),'HTML does not reference app.v29475.css');
assert(html.includes('明确想看中外合作提档'),'budget coop option missing');
assert(html.includes('filterFeeType'),'fee type filter missing');
assert(html.includes('提档价值优先'),'lift sort option missing');
assert(js.includes('function normalizeMajorMainV29475'),'major main normalizer missing');
assert(js.includes('function majorMatchesV29475'),'major match function missing');
assert(js.includes('function isCoopProgramV29475'),'coop detector missing');
assert(js.includes('function pickSchemeBucketsV29475'),'multi-plan bucket picker missing');
assert(js.includes('function planColumnV29475'),'compact plan column renderer missing');
assert(js.includes("sortBy==='lift'"),'lift sort logic missing');
assert(js.includes('isCollegeSpecialPlanV29474'),'special plan protection missing');
assert(css.includes('plan-col-v29475'),'compact plan CSS missing');
assert(css.includes('fee-type-v29475'),'fee type CSS missing');
console.log('validate-v29475-release: OK');
