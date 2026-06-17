#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const root=process.cwd();
const stamp='v300rc4-20260513';
let checks=[];
function ok(name,cond){checks.push({name,ok:!!cond});}
function read(file){const p=path.join(root,file);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';}
function has(file,s){return read(file).includes(s);}
function exists(file){return fs.existsSync(path.join(root,file));}
[
 'fenxi/v3/assets/js/adapters/legacy-fenxi-rc4.v3.js',
 'fenxi/v3/assets/js/adapters/plans-adapter-rc4.v3.js',
 'fenxi/v3/assets/js/adapters/candidates-adapter-rc4.v3.js',
 'fenxi/v3/assets/js/adapters/report-export-rc4.v3.js',
 'fenxi/v3/assets/js/steps/step-rank-rc4.v3.js',
 'fenxi/v3/assets/js/steps/step-family-rc4.v3.js',
 'fenxi/v3/assets/js/steps/step-child-rc4.v3.js',
 'fenxi/v3/assets/js/steps/step-plans-rc4.v3.js',
 'fenxi/v3/assets/js/steps/step-candidates-rc4.v3.js',
 'fenxi/v3/assets/css/rc4-core.v3.css',
 'fenxi/v3/assets/js/debug/rc4-debug.v3.js',
 'fenxi/v3/docs/V3_rc4_旧版公式回归与家庭端展示重排说明.md'
].forEach(f=>ok('存在 '+f,exists(f)));
ok('index 版本戳 rc4',has('fenxi/v3/index.html',stamp));
ok('debug 版本戳 rc4',has('fenxi/v3/debug.html',stamp));
ok('version 保留 ln2026',has('fenxi/v3/assets/js/version.v3.js',"accessCode: 'ln2026'"));
ok('旧版公式区间存在',has('fenxi/v3/assets/js/adapters/legacy-fenxi-rc4.v3.js','chong:[.88,.97]')&&has('fenxi/v3/assets/js/adapters/legacy-fenxi-rc4.v3.js','safe:[1.18,1.35]'));
ok('Step1 去测试样例',!has('fenxi/v3/assets/js/steps/step-rank-rc4.v3.js','填入测试样例'));
ok('候选页 Tab 存在',has('fenxi/v3/assets/js/steps/step-candidates-rc4.v3.js','推荐先看')&&has('fenxi/v3/assets/js/steps/step-candidates-rc4.v3.js','筛选条件'));
let pass=checks.filter(x=>x.ok).length;
checks.forEach((x,i)=>console.log(`${x.ok?'PASS':'FAIL'} ${String(i+1).padStart(2,'0')} ${x.name}`));
console.log(`\n${pass}/${checks.length} checks passed`);
if(pass!==checks.length)process.exit(1);
