const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exit(1);} console.log('OK:',msg)}
ok(read('fenxi/VERSION.txt').includes('V2.9.8.3.fix9'),'VERSION is fix9');
ok(read('fenxi/index.html').includes("2983fix9-20260511"),'index stamp is fix9');
ok(read('fenxi/index.html').includes('V2.9.8.3.fix9'),'visible title is fix9');
const cp=read('fenxi/assets/compute-pipeline.v2983.js');
ok(cp.includes('makeInterestFastHelper'),'fast interest helper exists');
ok(cp.includes('manualOnly-first'),'manualOnly interest is filtered before profile scoring');
ok(!cp.includes('manualOnly:ctx.child.manualOnly,scenario'), 'profileKey does not include manualOnly before scenario');
ok(cp.includes("computePipeline:'v2983fix9'"),'debug compute flag is fix9');
ok(cp.includes('interestFastFilter'),'debug interestFastFilter exists');
ok(cp.includes('fastInterestStats'),'debug fastInterestStats exists');
console.log('All V2.9.8.3.fix9 checks passed.');
