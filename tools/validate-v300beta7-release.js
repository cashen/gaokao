const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(p){ return fs.readFileSync(path.join(root,p),'utf8'); }
function exists(p){ return fs.existsSync(path.join(root,p)); }
function assert(cond,msg){ if(!cond){ console.error('FAIL:',msg); process.exitCode=1; } }
const idx = read('fenxi/v3/index.html');
const idx2 = read('fenxi/v3/index.htm');
const dbg = read('fenxi/v3/debug.html');
const ver = read('fenxi/v3/assets/js/version.v3.js');
const self = read('fenxi/v3/assets/js/debug/debug-selftest.v3.js');
const ev = read('fenxi/v3/assets/js/adapters/evidence-adapter.v3.js');
const cand = read('fenxi/v3/assets/js/adapters/candidates-adapter.v3.js');
const step = read('fenxi/v3/assets/js/steps/step-candidates.v3.js');
const report = read('fenxi/v3/assets/js/adapters/report-export-adapter.v3.js');
const versionTxt = read('fenxi/v3/VERSION.txt');
assert(idx.includes('v300beta7-20260512'), 'index cache stamp beta7');
assert(idx2.includes('v300beta7-20260512'), 'index.htm cache stamp beta7');
assert(dbg.includes('v300beta7-20260512'), 'debug cache stamp beta7');
assert(ver.includes('V3.0.0.beta7｜证据等级与待核验体系增强版'), 'version name beta7');
assert(ver.includes("stamp: 'v300beta7-20260512'"), 'version stamp beta7');
assert(ver.includes("bodyClass: 'ln-v3-beta7'"), 'body class beta7');
assert(idx.includes('evidence-adapter.v3.js'), 'index loads evidence adapter');
assert(dbg.includes('evidence-adapter.v3.js'), 'debug loads evidence adapter');
assert(exists('fenxi/v3/assets/js/adapters/evidence-adapter.v3.js'), 'evidence adapter exists');
assert(ev.includes('window.LN_V3_EVIDENCE_ADAPTER'), 'evidence global exists');
assert(ev.includes('data_confirmed') && ev.includes('model_judgement') && ev.includes('needs_review') && ev.includes('missing_data'), 'four evidence buckets');
assert(cand.includes('dataEvidence') && cand.includes('evidenceSummary') && cand.includes('summarizeCards'), 'candidates attach evidence');
assert(step.includes('candidate-evidence-grid') && step.includes('evidenceSummary'), 'step candidates renders evidence');
assert(report.includes('证据：') && report.includes('evidenceStats'), 'report includes evidence');
assert(self.includes('V3.0.0.beta7'), 'debug selftest expects beta7');
assert(self.includes('证据等级适配器存在'), 'debug checks evidence adapter');
assert(self.includes('Step6 卡片带四类证据桶'), 'mainflow checks evidence buckets');
assert(self.includes('Step7 报告包含证据等级提示'), 'mainflow checks report evidence');
assert(versionTxt.includes('V3.0.0.beta7'), 'VERSION.txt beta7');
assert(exists('fenxi/v3/docs/V3_beta7_证据等级与待核验体系增强说明.md'), 'beta7 docs exist');
if (process.exitCode) process.exit(process.exitCode);
console.log('All V3.0.0.beta7 checks passed.');
