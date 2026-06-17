const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
function exists(p) { return fs.existsSync(path.join(root, p)); }
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } }

const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.beta2｜家长端阅读节奏与决策摘要栏版'), 'version name missing');
assert(version.includes('v300beta2-20260512'), 'version stamp missing');
assert(version.includes('ln-v3-beta2'), 'body class missing');
assert(version.includes('家长端决策摘要栏'), 'beta2 release note missing');

['fenxi/v3/index.html','fenxi/v3/debug.html','fenxi/v3/index.htm','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(file => {
  const html = read(file);
  assert(html.includes('v300beta2-20260512'), `${file} cache stamp missing`);
  assert(!html.includes('v300beta1-20260512'), `${file} stale beta1 cache found`);
});

['fenxi/v3/index.html','fenxi/v3/index.htm'].forEach(file => {
  const html = read(file);
  assert(html.includes('id="v3DecisionRibbon"'), `${file} decision ribbon missing`);
});

const shell = read('fenxi/v3/assets/js/wizard-shell.v3.js');
assert(shell.includes('renderDecisionRibbon'), 'renderDecisionRibbon missing');
assert(shell.includes('当前进度'), 'decision ribbon wording missing');
assert(shell.includes('下一步确认家庭底线'), 'next action wording missing');

const css = read('fenxi/v3/assets/css/shell.v3.css');
assert(css.includes('v3-decision-ribbon'), 'decision ribbon css missing');
assert(css.includes('decision-ribbon-grid'), 'decision ribbon grid css missing');

const debug = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(debug.includes('V3.0.0.beta2'), 'debug beta2 version check missing');
assert(debug.includes('家长端决策摘要渲染方法存在'), 'debug decision ribbon check missing');
assert(debug.includes('Step7 进度闭环完整'), 'debug progress closure check missing');

assert(exists('fenxi/v3/docs/V3_beta2_家长端阅读节奏与决策摘要栏说明.md'), 'beta2 docs missing');
console.log('All V3.0.0.beta2 checks passed.');
