import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const html = read('aiplus/index.html');
const js = read('aiplus/selection-workbench.v005.js');
const css = read('aiplus/selection-workbench.v005.css');
const historyStore = read('aiplus/history-store.v3992_4.js');
const workflow = read('.github/workflows/verify-aiplus-selection-workbench-v005.yml');
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

assert(historyStore.includes('async function ensureCurrentSession(value)'), 'history owner must keep guarded legacy session migration');
const loadCurrentStart = historyStore.indexOf('export async function loadCurrentWorkspace()');
const saveCurrentStart = historyStore.indexOf('export async function saveCurrentWorkspace');
assert(loadCurrentStart >= 0 && saveCurrentStart > loadCurrentStart, 'history workspace read/write owner boundaries missing');
const loadCurrentBody = historyStore.slice(loadCurrentStart, saveCurrentStart);
assert(!loadCurrentBody.includes('saveCurrentWorkspace('), 'loadCurrentWorkspace must never rewrite current workspace from a stale read');
assert(loadCurrentBody.includes('ensureCurrentSession(value)'), 'loadCurrentWorkspace may only perform guarded missing-session migration');
const migrationStart = historyStore.indexOf('async function ensureCurrentSession(value)');
const migrationBody = historyStore.slice(migrationStart, loadCurrentStart);
assert(migrationBody.includes('store.get(CURRENT_KEY)'), 'session migration must re-read canonical current before writing');
assert(migrationBody.includes('current.id!==value.id'), 'session migration must abort when the current family workspace changed');
assert(!migrationBody.includes('store.put(clone(current),CURRENT_KEY)'), 'session migration must never write canonical current');
assert(historyStore.includes('let prunePromise=null'), 'history pruning must have one single-flight owner');
assert(historyStore.includes('function schedulePruneSessions()'), 'history owner must schedule bounded pruning outside the critical save transaction');
assert(historyStore.includes('if(prunePromise)return prunePromise'), 'history pruning must dedupe concurrent maintenance work');
const listHistoryStart = historyStore.indexOf('export async function listWorkspaceHistory');
const saveCurrentBody = historyStore.slice(saveCurrentStart, listHistoryStart);
assert(saveCurrentBody.includes('store.put(snapshot,CURRENT_KEY)'), 'saveCurrentWorkspace must atomically persist canonical current');
assert(saveCurrentBody.includes('store.put(snapshot,`${SESSION_PREFIX}${workspace.id}`)'), 'saveCurrentWorkspace must atomically persist the matching session');
assert(saveCurrentBody.includes('if(prune)schedulePruneSessions();'), 'history pruning must start only after the canonical current/session transaction completes');
assert(!saveCurrentBody.includes('await pruneSessions()'), 'history pruning must not block the family profile critical save path');

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
assert(css.includes('.selection-diagnosis-grid{display:grid;grid-template-columns:1fr;'), 'narrow decision rail diagnosis must stay single-column');
assert(css.includes('.selection-workbench-item{display:grid;grid-template-columns:24px minmax(0,1fr);'), 'selection item content must keep a readable narrow-rail column');
assert(css.includes('.selection-workbench-item-actions{grid-column:2;'), 'selection item actions must move below content instead of squeezing school-major text');
assert(css.includes('.selection-sorter-controls{display:flex;flex-direction:column;'), 'selection sorter controls must stack in the narrow decision rail');
assert(css.includes('@media(max-width:560px)'), 'Android/mobile responsive boundary missing');

assert(workflow.includes('Wait for coherent exact-main Production graph'), 'production gate must wait for a coherent AIPLuS feature graph, not only HTML/API identity');
assert(workflow.includes("selection_js_path='/aiplus/selection-workbench.v005.js?v=005_0&fdw=003_0'"), 'production readiness must fetch the exact selection JS asset referenced by HTML');
assert(workflow.includes("selection_css_path='/aiplus/selection-workbench.v005.css?v=005_0&fdw=003_0'"), 'production readiness must fetch the exact selection CSS asset referenced by HTML');
assert(workflow.includes('src=\\"${selection_js_path}\\"'), 'production readiness must bind the live HTML to the exact selection JS asset path');
assert(workflow.includes('href=\\"${selection_css_path}\\"'), 'production readiness must bind the live HTML to the exact selection CSS asset path');
assert(workflow.includes("AIPLUS_SELECTION_WORKBENCH_VERSION = 'aiplus-selection-workbench-v0.05'"), 'production readiness must verify the selection JS runtime identity before browser execution');
assert(workflow.includes(".selection-diagnosis-grid{display:grid;grid-template-columns:1fr"), 'production readiness must verify the selection CSS layout contract before browser execution');

assert(status.includes('唯一自选 truth'), 'architecture handoff must name the canonical selection truth');
assert(status.includes('不是就业率排名'), 'architecture handoff must preserve employment-evidence boundary');
assert(status.includes('读操作不得变成 stale writer'), 'architecture handoff must preserve non-clobbering workspace read ownership');
assert(status.includes('Draft → exact-head Preview → Ready'), 'release handoff must preserve formal release gate');
assert(status.includes('页面 + API + 当前 Selection Workbench JS/CSS 资产'), 'architecture handoff must record the production asset-readiness contract');

console.log('AIPLuS selection workbench v0.05 source contract: PASS');
