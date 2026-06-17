const fs = require('fs');
const path = require('path');
const root = process.cwd();
function ok(cond, msg){ if(!cond){ console.error('FAIL:', msg); process.exit(1); } }
function has(file, text){ const p=path.join(root,file); ok(fs.existsSync(p), file+' missing'); const s=fs.readFileSync(p,'utf8'); ok(s.includes(text), file+' missing text: '+text); }
[
  'fenxi/v3/index.html',
  'fenxi/v3/index.htm',
  'fenxi/v3/debug.html',
  'fenxi/v3/debug.htm',
  'fenxi/v3/debug/index.html',
  'fenxi/v3/assets/js/version.v3.js',
  'fenxi/v3/assets/js/adapters/plans-adapter.v3.js',
  'fenxi/v3/assets/js/steps/step-plans.v3.js',
  'fenxi/v3/assets/js/debug/debug-step-plans.v3.js',
  'fenxi/v3/assets/js/debug/debug-selftest.v3.js',
  'fenxi/v3/docs/V3_alpha6_Step5方案预览与一键主流测试说明.md'
].forEach(f => ok(fs.existsSync(path.join(root,f)), f+' missing'));
has('fenxi/v3/assets/js/version.v3.js', 'V3.0.0.alpha6｜Step5方案预览与一键主流测试版');
has('fenxi/v3/assets/js/version.v3.js', 'v300alpha6-20260512');
has('fenxi/v3/index.html', 'plans-adapter.v3.js');
has('fenxi/v3/debug.html', 'debug-step-plans.v3.js');
has('fenxi/v3/debug.html', 'Step5 方案自测');
has('fenxi/v3/assets/js/adapters/plans-adapter.v3.js', 'v3-plans-preview-only');
has('fenxi/v3/assets/js/steps/step-plans.v3.js', 'A/B/C 方案展示');
has('fenxi/v3/assets/js/debug/debug-selftest.v3.js', 'Step5 方案预览已生成');
has('fenxi/v3/assets/js/debug/debug-selftest.v3.js', "type === 'plans'");
has('fenxi/v3/assets/css/steps.v3.css', 'alpha6: Step5 A/B/C 方案预览');
console.log('All V3.0.0.alpha6 checks passed.');
