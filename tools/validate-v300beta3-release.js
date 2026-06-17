const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }
function exists(p) { return fs.existsSync(path.join(root, p)); }
function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1); } }

const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.beta4｜家长端体验收口与移动端可用性增强版'), 'version name missing');
assert(version.includes('v300beta4-20260512'), 'version stamp missing');
assert(version.includes('ln-v3-beta4'), 'body class missing');
assert(version.includes('复核任务清单'), 'beta3 release note missing');

['fenxi/v3/index.html','fenxi/v3/debug.html','fenxi/v3/index.htm','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(file => {
  const html = read(file);
  assert(html.includes('v300beta4-20260512'), `${file} cache stamp missing`);
  assert(!html.includes('v300beta2-20260512'), `${file} stale beta2 cache found`);
  assert(!html.includes('ln-v3-beta2'), `${file} stale body class found`);
});

['fenxi/v3/index.html','fenxi/v3/index.htm'].forEach(file => {
  const html = read(file);
  assert(html.includes('id="v3DecisionRibbon"'), `${file} decision ribbon missing`);
  assert(html.includes('id="v3ReviewChecklist"'), `${file} review checklist section missing`);
  assert(html.includes('review-checklist-adapter.v3.js'), `${file} review checklist adapter script missing`);
});

['fenxi/v3/debug.html','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(file => {
  const html = read(file);
  assert(html.includes('review-checklist-adapter.v3.js'), `${file} review checklist adapter script missing`);
});

const adapter = read('fenxi/v3/assets/js/adapters/review-checklist-adapter.v3.js');
assert(adapter.includes('LN_V3_REVIEW_CHECKLIST'), 'review checklist adapter global missing');
assert(adapter.includes('复核学费 / 中外合作'), 'cost review task missing');
assert(adapter.includes('复核专业正主程度'), 'major review task missing');

const store = read('fenxi/v3/assets/js/state-store.v3.js');
assert(store.includes('reviewChecklist'), 'reviewChecklist state missing');

const shell = read('fenxi/v3/assets/js/wizard-shell.v3.js');
assert(shell.includes('renderDecisionRibbon'), 'renderDecisionRibbon missing');
assert(shell.includes('renderReviewChecklist'), 'renderReviewChecklist missing');
assert(shell.includes('复核清单'), 'review checklist wording missing');

const css = read('fenxi/v3/assets/css/shell.v3.css');
assert(css.includes('v3-decision-ribbon'), 'decision ribbon css missing');
assert(css.includes('v3-review-checklist'), 'review checklist css missing');
assert(css.includes('review-checklist-list'), 'review checklist list css missing');

const debug = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(debug.includes('V3.0.0.beta4'), 'debug beta3 version check missing');
assert(debug.includes('复核清单适配器存在'), 'debug review adapter check missing');
assert(debug.includes('Step6 复核任务清单已生成'), 'debug review generation check missing');
assert(debug.includes('Step7 进度闭环完整'), 'debug progress closure check missing');

assert(exists('fenxi/v3/docs/V3_beta3_复核任务清单与家长端收口说明.md'), 'beta3 docs missing');
console.log('All V3.0.0.beta4 checks passed.');
