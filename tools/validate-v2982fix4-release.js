const fs=require('fs');
const path=require('path');
function read(p){return fs.readFileSync(path.join(__dirname,'..',p),'utf8')}
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1}else console.log('OK:',msg)}
const index=read('fenxi/index.html');
const version=read('fenxi/VERSION.txt');
const app2981f1=read('fenxi/assets/app.v2981fix1.js');
const app2981f2=read('fenxi/assets/app.v2981fix2.js');
const app2982=read('fenxi/assets/app.v2982.js');
const filter=read('fenxi/assets/filter-engine.v298fix1.js');
const hit=read('fenxi/assets/interest-hit-summary.v298.js');
const runtime=read('fenxi/assets/child-interest-runtime.v298fix1.js');
const policy=read('fenxi/assets/interaction-policy.v297fix2.js');
const scheduler=read('fenxi/assets/refresh-scheduler.v297fix2.js');
ok(version.includes('V2.9.8.2.fix4'),'VERSION is fix4');
ok(index.includes("VERSION='2982fix4-20260511'"),'index cache bust is fix4');
ok(index.includes('V2.9.8.2.fix4'),'index visible title is fix4');
ok(app2982.includes('v2982fix4') && app2982.includes('V2.9.8.2.fix4'),'app.v2982 marks fix4');
ok(!app2981f1.includes('new MutationObserver'),'legacy fix1 has no MutationObserver');
ok(!app2981f1.includes("wrap('renderCards'") && !app2981f1.includes('wrap("renderCards"'),'legacy fix1 does not wrap renderCards');
ok(!app2981f2.includes("wrap('renderCards'") && !app2981f2.includes('wrap("renderCards"'),'legacy fix2 does not wrap renderCards');
ok(!app2982.includes("wrap('renderCards'") && !app2982.includes('wrap("renderCards"'),'app.v2982 does not wrap renderCards');
ok(filter.includes('cheap filters first') && filter.includes('base.push(r)'),'applyFilters uses cheap-filter first stage');
const applyStart=filter.indexOf('function applyFilters(){');
const baseLoop=filter.indexOf('for(const r of base)', applyStart);
const scoreInApply=filter.indexOf('profileScore(r)', applyStart);
ok(scoreInApply > baseLoop, 'profileScore runs after base filtering');
ok(filter.includes('scheduleAggregate?.(filtered,800)'),'interest aggregate scheduled after filter');
ok(hit.includes('cachedAggregate') && hit.includes('scheduleAggregate'),'interest summary has cached/scheduled aggregate');
ok(runtime.includes('cachedAggregate') && !runtime.includes('aggregate?.()||{core'),'runtime summary does not call aggregate inline');
ok(policy.includes("'chip-change':{level:'soft',delay:800}"),'chip-change delay is 800ms');
ok(policy.includes("'child-interest-change':{level:'soft',delay:900}"),'child-interest-change delay is 900ms');
ok(scheduler.includes('Math.max(a.delay??180,b.delay??180)'),'scheduler keeps longer coalescing delay');
if(process.exitCode){process.exit(process.exitCode)}
console.log('All V2.9.8.2.fix4 checks passed.');
