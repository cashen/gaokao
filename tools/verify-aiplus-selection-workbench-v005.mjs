import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const html = read('aiplus/index.html');
const js = read('aiplus/selection-workbench.v005.js');
const css = read('aiplus/selection-workbench.v005.css');
const status = read('docs/architecture/AIPLUS-SELECTION-DIAGNOSIS-STATUS.md');
const selectionJsAsset = '/aiplus/selection-workbench.v005.js?v=005_0&fdw=003_0';
const selectionCssAsset = '/aiplus/selection-workbench.v005.css?v=005_0&fdw=003_0';

assert(html.includes('data-ai-selection-workbench="aiplus-selection-workbench-v0.05"'), 'AIPLuS selection workbench identity missing');
assert(html.split(selectionJsAsset).length - 1 === 1, 'selection workbench JS must have one additive entry owner');
assert(html.split(selectionCssAsset).length - 1 === 1, 'selection workbench CSS must have one additive entry owner');
assert(html.includes('自选诊断 v0.05'), 'selection workbench footer identity missing');

assert(js.includes("from '/ln-rank/js/feature/selection-pool/store.v3967_0.js?v=3967_0'"), 'must reuse canonical LN selection-pool store owner directly');
assert(js.includes("from '/ln-rank/js/feature/selection-pool/analysis.v3967_0.js?v=3967_0'"), 'must reuse canonical LN selection diagnosis owner directly');
assert(js.includes("from '/aiplus/history-store.v3992_4.js?v=002_4&fdw=003_0'"), 'must read current AIPLuS workspace through existing history owner');
assert(js.includes('buildPathAnalysis'), 'must reuse existing path-analysis diagnosis owner');
assert(js.includes('addPoolItem'), 'AIPLuS must be able to add a real school-major record to canonical selection pool');
assert(js.includes('removePoolItem'), 'AIPLuS must expose canonical pool removal');
assert(js.includes('movePoolItem'), 'AIPLuS must preserve user-owned manual ordering');
assert(js.includes('savePoolItems(proposeSelectionOrder'), 'suggested ordering must commit through canonical pool owner');
assert(!js.includes('localStorage.setItem'), 'selection workbench must not create/write a second localStorage truth');
assert(!js.includes('aiplusFavorites'), 'must not introduce an AIPLuS-only favorites store');
assert(!js.includes('张雪峰'), 'named-person opinion must not become a hidden diagnosis owner');

assert(js.includes('function appendCandidateRecords'), 'candidate binding must use the existing candidates result owner');
assert(js.includes('Array.isArray(result?.candidates?.records)'), 'historical result collections must not be promoted into current selections');
assert(js.includes('const score2026 = finite(record.score2026)'), 'candidate binding must require explicit 2026 score evidence');
assert(js.includes('if (score == null && cardRank == null) return null'), 'candidate card must carry a score/rank anchor');
assert(js.includes('return exact.length === 1 ? exact[0] : null'), 'candidate card must resolve to exactly one current record');
assert(!js.includes('|| matches[0]'), 'ambiguous school-major matches must fail closed');
assert(!js.includes("['records', 'candidates', 'history'"), 'history collections must not be traversed as current selection candidates');

for (const label of ['录取位置', '就业路径证据', '家庭成本', '学校平台']) {
  assert(js.includes(label), `missing sorting lens: ${label}`);
}
for (const label of ['顺序诊断', '学校集中度', '专业集中度', '家庭成本', '就业/升学路径证据', '证据完整度']) {
  assert(js.includes(label), `missing diagnosis dimension: ${label}`);
}
assert(js.includes('这是“证据覆盖度”而不是就业率排名'), 'employment lens must expose its evidence boundary');
assert(js.includes('只调整“我的自选”讨论顺序，不会替你提交正式志愿'), 'suggested order must require explicit user confirmation');
assert(js.includes("document.querySelector('#importSelection')?.click()"), 'deep family-advisor diagnosis must reuse existing read-only selection snapshot bridge');

assert(css.includes('.selection-workbench'), 'selection workbench styles missing');
assert(css.includes('@media(max-width:960px)'), 'Pad responsive boundary missing');
assert(css.includes('@media(max-width:560px)'), 'Android/mobile responsive boundary missing');

assert(status.includes('唯一自选 truth'), 'architecture handoff must name the canonical selection truth');
assert(status.includes('不是就业率排名'), 'architecture handoff must preserve employment-evidence boundary');
assert(status.includes('Draft → exact-head Preview → Ready'), 'release handoff must preserve formal release gate');

console.log('AIPLuS selection workbench v0.05 source contract: PASS');
