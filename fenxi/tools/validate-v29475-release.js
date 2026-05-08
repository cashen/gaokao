const fs=require('fs');
const path=require('path');
function read(p){return fs.readFileSync(path.join(__dirname,'..',p),'utf8')}
function assert(c,m){if(!c){throw new Error(m)}}
const html=read('index.html');
const currentJs=html.includes('assets/app.v29475fix.js')?'assets/app.v29475fix.js':'assets/app.v29475.js';
const currentCss=html.includes('assets/app.v29475fix.css')?'assets/app.v29475fix.css':'assets/app.v29475.css';
const js=read(currentJs);
const css=read(currentCss);
assert(html.includes('V2.9.4.7.5'),'HTML title/version missing');
assert(html.includes(currentJs),'HTML does not reference current JS');
assert(html.includes(currentCss),'HTML does not reference current CSS');
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
console.log('validate-v29475-release: OK (validated current entry: '+currentJs+')');
