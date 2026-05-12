#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const required = [
  'fenxi/v3/index.html',
  'fenxi/v3/debug.html',
  'fenxi/v3/assets/js/version.v3.js',
  'fenxi/v3/assets/js/adapters/legacy-rulebook-adapter.v3.js',
  'fenxi/v3/assets/js/adapters/professional-path-engine.v3.js',
  'fenxi/v3/assets/js/adapters/profile-score-engine.v3.js',
  'fenxi/v3/assets/js/adapters/compute-core.v3.js',
  'fenxi/v3/assets/js/adapters/advanced-filter-adapter.v3.js',
  'fenxi/v3/assets/js/adapters/state-invalidation-adapter.v3.js',
  'fenxi/v3/assets/js/adapters/device-adapter.v3.js',
  'fenxi/v3/assets/js/adapters/scenario-adapter-rc2.v3.js',
  'fenxi/v3/assets/js/adapters/plans-adapter-rc2.v3.js',
  'fenxi/v3/assets/js/adapters/candidates-adapter-rc2.v3.js',
  'fenxi/v3/assets/js/steps/step-child-profile-rc2.v3.js',
  'fenxi/v3/assets/js/steps/step-scenario-rc2.v3.js',
  'fenxi/v3/assets/js/steps/step-plans-rc2.v3.js',
  'fenxi/v3/assets/js/steps/step-candidates-rc2.v3.js',
  'fenxi/v3/assets/js/debug/path-matrix-debug.v3.js',
  'fenxi/v3/assets/css/rc2-core.v3.css',
  'fenxi/v3/docs/V3_rc2_旧版路径规则与候选池计算迁移说明.md'
];
let fail = 0;
function ok(name, cond, detail='') {
  if (cond) console.log('PASS｜' + name + (detail ? '｜' + detail : ''));
  else { console.error('FAIL｜' + name + (detail ? '｜' + detail : '')); fail++; }
}
for (const f of required) ok('文件存在 ' + f, fs.existsSync(path.join(root, f)));
const index = fs.readFileSync(path.join(root, 'fenxi/v3/index.html'), 'utf8');
const debug = fs.readFileSync(path.join(root, 'fenxi/v3/debug.html'), 'utf8');
ok('入口版本戳 rc2', /v300rc2-20260512/.test(index));
ok('入口 body class rc2', /ln-v3-rc2/.test(index));
ok('入口引入 rulebook', /legacy-rulebook-adapter\.v3\.js/.test(index));
ok('入口引入 compute-core', /compute-core\.v3\.js/.test(index));
ok('入口引入 RC2 step overrides', /step-scenario-rc2\.v3\.js/.test(index) && /step-candidates-rc2\.v3\.js/.test(index));
ok('debug 引入 path matrix', /path-matrix-debug\.v3\.js/.test(debug));
ok('不包含旧版根入口', !fs.existsSync(path.join(root, 'fenxi/index.html')) || !/V3\.0\.0\.rc2/.test(fs.readFileSync(path.join(root, 'fenxi/index.html'), 'utf8')));
const jsFiles = required.filter(f => f.endsWith('.js'));
for (const f of jsFiles) {
  const {spawnSync} = require('child_process');
  const r = spawnSync(process.execPath, ['--check', path.join(root, f)], {encoding:'utf8'});
  ok('JS语法 ' + f, r.status === 0, (r.stderr||'').split('\n')[0]);
}
const rb = fs.readFileSync(path.join(root,'fenxi/v3/assets/js/adapters/legacy-rulebook-adapter.v3.js'),'utf8');
ok('12个场景路径源码可见', (rb.match(/id:'/g)||[]).length >= 12);
ok('9个目标路径源码可见', /TARGET_PATHS/.test(rb) && /postgrad/.test(rb));
ok('8个专业路径源码可见', /PROFESSIONAL_PATHS/.test(rb) && /accounting/.test(rb) && /machine/.test(rb));
if (fail) {
  console.error('\n校验失败：' + fail + ' 项');
  process.exit(1);
}
console.log('\nV3.0.0.rc2 release validation PASS');
