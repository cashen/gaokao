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
const self=read('fenxi/assets/debug-selftest.v2983fix11.js');
const version=read('fenxi/VERSION.txt');
assert(exists('fenxi/assets/debug-selftest.v2983fix11.js'),'debug selftest script exists');
assert(index.includes('V2.9.8.3.fix11'),'index version fix11');
assert(index.includes('2983fix11-20260511'),'index stamp fix11');
assert(index.includes('INLINE_BOOT_SCRIPTS'),'inline boot scripts exists');
assert(index.includes('assets/config.v297fix2.js') && index.includes("src:'inline:'+file"),'config inline marker exists');
assert(!index.includes('const files=["assets/config.v297fix2.js"'),'config removed from network boot queue');
assert(debug.includes('V2.9.8.3.fix11'),'debug title fix11');
assert(debug.includes('debug-selftest.v2983fix11.js'),'debug loads selftest');
assert(app.includes('v2983fix11'),'body class contains v2983fix11');
assert(app.includes('Config启动配置内联与自测启动修正版'),'app title updated');
assert(compute.includes("computePipeline:'v2983fix11'"),'compute pipeline flag fix11');
assert(compute.includes("version:'V2.9.8.3.fix11'"),'compute pipeline version fix11');
assert(runtime.includes('V2.9.8.3.fix11'),'debug runtime default version fix11');
assert(self.includes('runSmokeSelfTest'),'selftest quick button binding');
assert(self.includes('runDeepSelfTest'),'selftest deep button binding');
assert(self.includes('ln_v2983_selftest_report'),'selftest report key');
assert(self.includes('manualOnly-fast-interest'),'manualOnly fast interest test present');
assert(self.includes('sampleUnexpectedKept'),'region hard assertion present');
assert(self.includes('maxCases=96'),'deep matrix safety cap present');
assert(version.includes('V2.9.8.3.fix11'),'VERSION fix11');
assert(exists('docs/V2.9.8.3.fix11_Config启动配置内联与自测启动修正版说明.md'),'root docs fix11 exists');
assert(exists('fenxi/docs/V2.9.8.3.fix11_Config启动配置内联与自测启动修正版说明.md'),'fenxi docs fix11 exists');
const topItems=fs.readdirSync(root).filter(x=>!['fenxi','functions','docs','tools'].includes(x));
assert(topItems.length===0,'fenxi-only update: no root extra items: '+topItems.join(','));
if(process.exitCode){process.exit(process.exitCode);}else{console.log('All V2.9.8.3.fix11 checks passed.');}
