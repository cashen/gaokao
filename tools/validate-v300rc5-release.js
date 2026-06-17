#!/usr/bin/env node
const fs=require('fs');
const path=require('path');
const root=process.cwd();
const stamp='v300rc5-20260513';
let checks=[];
function ok(name,cond){checks.push({name,ok:!!cond});}
function read(f){const p=path.join(root,f);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';}
function exists(f){return fs.existsSync(path.join(root,f));}
function has(f,s){return read(f).includes(s);}
[
 'fenxi/v3/assets/js/adapters/legacy-fenxi-rc5.v3.js',
 'fenxi/v3/assets/js/adapters/plans-adapter-rc5.v3.js',
 'fenxi/v3/assets/js/adapters/candidates-adapter-rc5.v3.js',
 'fenxi/v3/assets/js/adapters/report-export-rc5.v3.js',
 'fenxi/v3/assets/js/steps/step-child-rc5.v3.js',
 'fenxi/v3/assets/js/steps/step-plans-rc5.v3.js',
 'fenxi/v3/assets/js/steps/step-candidates-rc5.v3.js',
 'fenxi/v3/assets/js/debug/rc5-debug.v3.js',
 'fenxi/v3/assets/css/rc5-core.v3.css',
 'fenxi/v3/docs/V3_rc5_候选闭环与精准专业参与计算说明.md'
].forEach(f=>ok('存在 '+f,exists(f)));
ok('index 版本戳 RC5',has('fenxi/v3/index.html',stamp));
ok('index 加载 RC5 overlay',has('fenxi/v3/index.html','legacy-fenxi-rc5.v3.js')&&has('fenxi/v3/index.html','step-candidates-rc5.v3.js'));
ok('debug 加载 RC5 debug',has('fenxi/v3/debug.html','rc5-debug.v3.js'));
ok('version 同步 RC5',has('fenxi/v3/assets/js/version.v3.js','V3.0.0.rc5')&&has('fenxi/v3/assets/js/version.v3.js',stamp));
ok('Step3 恢复展开具体专业',has('fenxi/v3/assets/js/steps/step-child-rc5.v3.js','展开具体专业')&&has('fenxi/v3/assets/js/steps/step-child-rc5.v3.js','data-toggle-major'));
ok('精准专业参与计算',has('fenxi/v3/assets/js/adapters/legacy-fenxi-rc5.v3.js','selectedMajors')&&has('fenxi/v3/assets/js/adapters/legacy-fenxi-rc5.v3.js','孩子精确点选'));
ok('农学动物医学方向进入主计算',has('fenxi/v3/assets/js/adapters/legacy-fenxi-rc5.v3.js','agri_animal_food')&&has('fenxi/v3/assets/js/adapters/legacy-fenxi-rc5.v3.js','动物医学'));
ok('候选加入自选池使用 freshList 兜底',has('fenxi/v3/assets/js/adapters/candidates-adapter-rc5.v3.js','freshList')&&has('fenxi/v3/assets/js/adapters/candidates-adapter-rc5.v3.js','rc5-shortlist-add'));
ok('候选页不把ABC作为更多筛选核心项',!has('fenxi/v3/assets/js/steps/step-candidates-rc5.v3.js','data-rc5-filter="plan"'));
ok('旧版高级筛选语义回归',has('fenxi/v3/assets/js/steps/step-candidates-rc5.v3.js','subjectGroup')&&has('fenxi/v3/assets/js/steps/step-candidates-rc5.v3.js','primary')&&has('fenxi/v3/assets/js/steps/step-candidates-rc5.v3.js','onlyKey'));
ok('导出写入自选池和精准专业',has('fenxi/v3/assets/js/adapters/report-export-rc5.v3.js','家庭已选候选')&&has('fenxi/v3/assets/js/adapters/report-export-rc5.v3.js','孩子精确点选专业'));
let pass=checks.filter(x=>x.ok).length;
checks.forEach((x,i)=>console.log(`${x.ok?'PASS':'FAIL'} ${String(i+1).padStart(2,'0')} ${x.name}`));
console.log(`\n${pass}/${checks.length} checks passed`);
if(pass!==checks.length)process.exit(1);
