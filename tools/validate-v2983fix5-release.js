const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1;}else{console.log('OK:',msg);}}
const idx=read('fenxi/index.html');
const version=read('fenxi/VERSION.txt');
const compute=read('fenxi/assets/compute-pipeline.v2983.js');
const region=read('fenxi/assets/region-filter-rules.v2983fix5.js');
const filter=read('fenxi/assets/filter-engine.v298fix1.js');
const app=read('fenxi/assets/app.v2983.js');
ok(version.includes('V2.9.8.3.fix5'),'VERSION is fix5');
ok(idx.includes("2983fix5-20260511"),'index version stamp is fix5');
ok(idx.includes('region-filter-rules.v2983fix5.js'),'index loads region filter rules');
ok(region.includes('LN_REGION_FILTER_RULES_V2983FIX5'),'region rules global exists');
ok(region.includes("mode==='hard'"),'region hard rule exists');
ok(compute.includes('regionCollector'),'compute uses region collector');
ok(compute.includes('regionFilterDebug'),'compute emits regionFilterDebug');
ok(compute.indexOf('regionCollector') < compute.indexOf('const f=ctx.filters'),'region filter runs before ordinary filters');
ok(filter.includes('region-chip-change'),'province chips use region-chip-change');
ok(filter.includes('1300'),'region chip debounce is 1300ms');
ok(app.includes('v2983fix5'),'body/app version marks fix5');
ok(app.includes("P['region-chip-change']"),'interaction policy contains region-chip-change');
ok(idx.includes('childInterest'),'family baseline next step still points to childInterest');
if(process.exitCode){process.exit(process.exitCode);}else{console.log('All V2.9.8.3.fix5 checks passed.');}
