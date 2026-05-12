#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const root=process.cwd();
const stamp='v300rc3-20260512';
let checks=[];
function ok(name,cond,detail=''){checks.push({name,ok:!!cond,detail});}
function has(file,s){return fs.existsSync(path.join(root,file))&&fs.readFileSync(path.join(root,file),'utf8').includes(s);}
const files=[
 'fenxi/v3/assets/js/adapters/legacy-fenxi-rc3.v3.js',
 'fenxi/v3/assets/js/adapters/plans-adapter-rc3.v3.js',
 'fenxi/v3/assets/js/adapters/candidates-adapter-rc3.v3.js',
 'fenxi/v3/assets/js/steps/step-plans-rc3.v3.js',
 'fenxi/v3/assets/js/steps/step-candidates-rc3.v3.js',
 'fenxi/v3/assets/js/debug/rc3-debug.v3.js',
 'fenxi/v3/assets/css/rc3-core.v3.css',
 'fenxi/v3/docs/V3_rc3_旧版fenxi逻辑完整复刻说明.md'
];
files.forEach(f=>ok('存在 '+f,fs.existsSync(path.join(root,f))));
ok('index 版本戳 rc3',has('fenxi/v3/index.html',stamp));
ok('debug 版本戳 rc3',has('fenxi/v3/debug.html',stamp));
ok('index 加载 rc3 engine',has('fenxi/v3/index.html','legacy-fenxi-rc3.v3.js'));
ok('index 加载 rc3 plans',has('fenxi/v3/index.html','plans-adapter-rc3.v3.js'));
ok('index 加载 rc3 candidates',has('fenxi/v3/index.html','candidates-adapter-rc3.v3.js'));
ok('index 加载 rc3 steps',has('fenxi/v3/index.html','step-candidates-rc3.v3.js'));
ok('debug 加载 rc3 debug',has('fenxi/v3/debug.html','rc3-debug.v3.js'));
ok('没有覆盖旧版 fenxi/index.html',!fs.existsSync(path.join(root,'fenxi/index.html')));
ok('rc3 compute 声明旧版逻辑',has('fenxi/v3/assets/js/adapters/legacy-fenxi-rc3.v3.js','先')||has('fenxi/v3/assets/js/adapters/legacy-fenxi-rc3.v3.js','rankRole'));
ok('rc3 A/B/C 语义',has('fenxi/v3/assets/js/adapters/plans-adapter-rc3.v3.js','A 守底线')&&has('fenxi/v3/assets/js/adapters/plans-adapter-rc3.v3.js','B 看专业')&&has('fenxi/v3/assets/js/adapters/plans-adapter-rc3.v3.js','C 看上限'));
ok('候选复核和自选池分离',has('fenxi/v3/assets/js/steps/step-candidates-rc3.v3.js','家庭自选池')&&has('fenxi/v3/assets/js/steps/step-candidates-rc3.v3.js','不是自选'));
ok('高级筛选不污染基础池',has('fenxi/v3/assets/js/steps/step-candidates-rc3.v3.js','基础候选不被本页筛选污染'));
let pass=checks.filter(x=>x.ok).length;
checks.forEach((x,i)=>console.log(`${x.ok?'PASS':'FAIL'} ${String(i+1).padStart(2,'0')} ${x.name}${x.detail?' '+x.detail:''}`));
console.log(`\n${pass}/${checks.length} checks passed`);
if(pass!==checks.length)process.exit(1);
