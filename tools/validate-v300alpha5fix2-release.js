const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1);} }
const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.alpha5.fix2｜孩子画像与专业画像回迁版'), 'version name not updated');
assert(version.includes('v300alpha5fix2-20260512'), 'version stamp not updated');
assert(version.includes('ln-v3-alpha5-fix2'), 'body class token missing');
['fenxi/v3/index.html','fenxi/v3/index.htm','fenxi/v3/debug.html','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(p=>{
  assert(exists(p), p+' missing');
  const s=read(p);
  assert(s.includes('ln-v3-alpha5-fix2'), p+' body class not alpha5fix2');
  assert(s.includes('v300alpha5fix2-20260512'), p+' stamp not alpha5fix2');
  assert(s.includes('/fenxi/v3/assets/js/adapters/student-profile-adapter.v3.js'), p+' missing student profile adapter');
  assert(s.includes('/fenxi/v3/assets/js/adapters/major-profile-adapter.v3.js'), p+' missing major profile adapter');
  assert(s.includes('/fenxi/v3/assets/js/adapters/decision-context-adapter.v3.js'), p+' missing decision context adapter');
  assert(s.includes('/fenxi/v3/assets/js/adapters/scenario-adapter.v3.js'), p+' missing scenario adapter');
});
[
 'fenxi/v3/assets/js/adapters/student-profile-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/major-profile-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/score-band-strategy-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/region-preference-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/decision-context-adapter.v3.js',
 'fenxi/v3/assets/js/adapters/scenario-adapter.v3.js',
 'fenxi/v3/docs/V3_alpha5fix2_孩子画像与专业画像回迁说明.md'
].forEach(p=>assert(exists(p),p+' missing'));
const store = read('fenxi/v3/assets/js/state-store.v3.js');
assert(store.includes('studentProfile'), 'state store missing studentProfile');
assert(store.includes('LN_V3_STUDENT_PROFILE.normalized'), 'state store does not normalize student profile');
const student = read('fenxi/v3/assets/js/adapters/student-profile-adapter.v3.js');
assert(student.includes('hardExclude: false'), 'student profile hardExclude false missing');
assert(student.includes('只用于调整提醒顺序'), 'student profile explanation missing');
const major = read('fenxi/v3/assets/js/adapters/major-profile-adapter.v3.js');
assert(major.includes('大数据管理与应用'), 'major profile data management rule missing');
assert(major.includes('动物医学属于农学门类'), 'animal medicine misread rule missing');
assert(major.includes('专业画像只用于解释和复核'), 'major profile non-hard-filter wording missing');
const child = read('fenxi/v3/assets/js/steps/step-child.v3.js');
assert(child.includes('孩子学习适配画像'), 'Step3 student profile panel missing');
assert(child.includes('专业画像与复核提醒'), 'Step3 major profile panel missing');
assert(child.includes('data-profile-field'), 'Step3 profile field binding missing');
const interest = read('fenxi/v3/assets/js/adapters/child-interest-adapter.v3.js');
assert(interest.includes('preview.majorProfile'), 'child preview missing majorProfile');
const scenario = read('fenxi/v3/assets/js/adapters/scenario-adapter.v3.js');
assert(scenario.includes('studentProfile'), 'scenario preview missing studentProfile');
assert(scenario.includes('majorProfile'), 'scenario preview missing majorProfile');
assert(scenario.includes('学习强度需复核'), 'scenario profile reason missing');
const debug = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(debug.includes('学生画像只调整提醒不硬筛'), 'pathmatrix student profile check missing');
assert(debug.includes('专业画像覆盖大数据易混提醒'), 'pathmatrix major profile check missing');
assert(debug.includes('Step3 学生画像写入且不硬筛'), 'mainflow profile write check missing');
assert(debug.includes('Step4 读取学生画像与专业画像'), 'mainflow scenario context profile check missing');
const debugChild = read('fenxi/v3/assets/js/debug/debug-step-child.v3.js');
assert(debugChild.includes('student-profile-adapter 存在'), 'debug child missing student profile check');
assert(debugChild.includes('专业易混提醒：动物医学不是医学门类'), 'debug child missing animal medicine check');
console.log('All V3.0.0.alpha5.fix2 checks passed.');
