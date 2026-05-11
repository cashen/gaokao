const fs=require('fs');
const path=require('path');
const root=process.cwd();
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function exists(p){return fs.existsSync(path.join(root,p));}
function assert(ok,msg){if(!ok){console.error('FAIL:',msg);process.exitCode=1;}}
const index=read('fenxi/index.html');
const debug=read('fenxi/debug.html');
const app=read('fenxi/assets/app.v2983.js');
const compute=read('fenxi/assets/compute-pipeline.v2983.js');
const runtime=read('fenxi/assets/debug-runtime.v2983.js');
const self=read('fenxi/assets/debug-selftest.v2983fix12.js');
const version=read('fenxi/VERSION.txt');
assert(exists('fenxi/assets/debug-selftest.v2983fix12.js'),'debug selftest script exists');
assert(index.includes('V2.9.8.3.fix12'),'index version fix12');
assert(index.includes('2983fix12-20260511'),'index stamp fix12');
assert(index.includes('INLINE_BOOT_SCRIPTS'),'inline boot scripts exists');
assert(index.includes('assets/config.v297fix2.js') && index.includes("src:'inline:'+file"),'config inline marker exists');
assert(!index.includes('const files=["assets/config.v297fix2.js"'),'config removed from network boot queue');
assert(debug.includes('V2.9.8.3.fix12'),'debug title fix12');
assert(debug.includes('debug-selftest.v2983fix12.js'),'debug loads selftest');
assert(app.includes('v2983fix12'),'body class contains v2983fix12');
assert(app.includes('分块等待与自测误报收敛修正版'),'app title updated');
assert(compute.includes("computePipeline:'v2983fix12'"),'compute pipeline flag fix12');
assert(compute.includes("version:'V2.9.8.3.fix12'"),'compute pipeline version fix12');
assert(runtime.includes('V2.9.8.3.fix12'),'debug runtime default version fix12');
assert(self.includes('runSmokeSelfTest'),'selftest quick button binding');
assert(self.includes('runDeepSelfTest'),'selftest deep button binding');
assert(self.includes('ln_v2983_selftest_report'),'selftest report key');
assert(self.includes('manualOnly-fast-interest'),'manualOnly fast interest test present');
assert(self.includes('sampleUnexpectedKept'),'region hard assertion present');
assert(self.includes('maxCases=96'),'deep matrix safety cap present');
assert(self.includes('waitDataForCurrentRank'),'selftest waits for data chunks');
assert(self.includes('selfTestDataWait'),'selftest data wait debug detail present');
assert(compute.includes('markDataWaiting'),'main page data waiting guard present');
assert(compute.includes('dataWaiting:true'),'data waiting debug flag present');
assert(version.includes('V2.9.8.3.fix12'),'VERSION fix12');
assert(exists('docs/V2.9.8.3.fix12_分块等待与自测误报收敛修正版说明.md'),'root docs fix12 exists');
assert(exists('fenxi/docs/V2.9.8.3.fix12_分块等待与自测误报收敛修正版说明.md'),'fenxi docs fix12 exists');
const topItems=fs.readdirSync(root).filter(x=>!['fenxi','functions','docs','tools'].includes(x));
assert(topItems.length===0,'fenxi-only update: no root extra items: '+topItems.join(','));
if(process.exitCode){process.exit(process.exitCode);}else{console.log('All V2.9.8.3.fix12 checks passed.');}
