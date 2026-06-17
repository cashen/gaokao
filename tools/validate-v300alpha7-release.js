const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exit(1);} }
const version = read('fenxi/v3/assets/js/version.v3.js');
assert(version.includes('V3.0.0.alpha7｜详细候选卡片与自选池版'), 'version name not updated');
assert(version.includes('v300alpha7-20260512'), 'version stamp not updated');
assert(version.includes('ln-v3-alpha7'), 'body class token missing');
['fenxi/v3/index.html','fenxi/v3/index.htm','fenxi/v3/debug.html','fenxi/v3/debug.htm','fenxi/v3/debug/index.html'].forEach(p=>{
  assert(exists(p), p+' missing');
  const s=read(p);
  assert(s.includes('ln-v3-alpha7'), p+' body class not alpha7');
  assert(s.includes('v300alpha7-20260512'), p+' stamp not alpha7');
  assert(s.includes('?v=v300alpha7-20260512'), p+' cache bust query missing');
  assert(s.includes('candidates-adapter.v3.js'), p+' candidates adapter script missing');
});
const candAdapter = read('fenxi/v3/assets/js/adapters/candidates-adapter.v3.js');
assert(candAdapter.includes('v3-candidates-detail-preview-only'), 'candidate preview reason missing');
assert(candAdapter.includes('nextReview'), 'candidate review checklist missing');
assert(candAdapter.includes('LN_V3_CANDIDATES_ADAPTER'), 'candidate adapter export missing');
assert(candAdapter.includes('shortlist:add') && candAdapter.includes('shortlist:remove'), 'shortlist add/remove missing');
const stepCandidates = read('fenxi/v3/assets/js/steps/step-candidates.v3.js');
assert(stepCandidates.includes('详细候选 & 自选池'), 'Step6 title missing');
assert(stepCandidates.includes('candidate-detail-card'), 'candidate card UI missing');
assert(stepCandidates.includes('data-shortlist-toggle'), 'shortlist toggle UI missing');
assert(stepCandidates.includes('复核清单'), 'review checklist UI missing');
const selftest = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
assert(selftest.includes('V3.0.0.alpha7'), 'debug quick version not alpha7');
assert(selftest.includes('详细候选适配器存在'), 'debug candidate adapter check missing');
assert(selftest.includes('Step6 详细候选卡片已生成'), 'Step6 generation check missing');
assert(selftest.includes('Step6 自选池可加入候选'), 'shortlist add check missing');
assert(selftest.includes('主流程最终停在 Step6'), 'final Step6 check missing');
const css = read('fenxi/v3/assets/css/steps.v3.css');
assert(css.includes('candidate-detail-card'), 'candidate CSS missing');
assert(css.includes('shortlist-mini-list'), 'shortlist CSS missing');
assert(exists('fenxi/v3/docs/V3_alpha7_详细候选卡片与自选池说明.md'), 'alpha7 doc missing');
console.log('All V3.0.0.alpha7 checks passed.');
