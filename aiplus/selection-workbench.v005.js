import {
  addPoolItem,
  getPoolItems,
  itemId,
  majorFamily,
  movePoolItem,
  removePoolItem,
  savePoolItems
} from '/ln-rank/js/feature/selection-pool/store.v3967_0.js?v=3967_0';
import { buildPathAnalysis } from '/ln-rank/js/feature/selection-pool/analysis.v3967_0.js?v=3967_0';
import { loadCurrentWorkspace } from '/aiplus/history-store.v3992_4.js?v=002_4&fdw=003_0';

export const AIPLUS_SELECTION_WORKBENCH_VERSION = 'aiplus-selection-workbench-v0.05';

const BAND_ORDER = Object.freeze({ upper: 0, near: 1, steady: 2, unknown: 3, outside: 4 });
const BAND_TEXT = Object.freeze({ upper: '稍高', near: '主要参考', steady: '低分侧', unknown: '待确认', outside: '窗口外' });
const LENSES = Object.freeze([
  { key: 'position', label: '录取位置' },
  { key: 'employment_evidence', label: '就业路径证据' },
  { key: 'cost', label: '家庭成本' },
  { key: 'platform', label: '学校平台' }
]);

function clean(value, max = 180) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function rank(value) {
  const n = finite(value);
  return n && n > 0 ? Math.round(n) : null;
}

function node(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== '') el.textContent = String(text);
  return el;
}

function normalizedBand(item = {}) {
  const key = clean(item.poolBand?.key || item.bandKey || item.band, 30);
  return BAND_ORDER[key] == null ? 'unknown' : key;
}

function currentScore(workspace = {}) {
  const n = finite(workspace?.examContext?.score);
  return n && n > 0 ? Math.round(n) : null;
}

function explicitPreferences(workspace = {}) {
  const hard = Array.isArray(workspace?.hardConstraints) ? workspace.hardConstraints : [];
  const explicit = workspace?.decisionProfile?.explicit || {};
  const priorities = Array.isArray(explicit.priorities) ? explicit.priorities : [];
  return {
    city: hard.some(item => ['regionInclude', 'regionExclude'].includes(item?.key)) ? 'explicit' : '',
    major: hard.some(item => ['majorInclude', 'majorExclude'].includes(item?.key)) || priorities.includes('major') ? 'explicit' : '',
    cost: explicit.familyResourceSensitivity === 'resource_sensitive' || priorities.includes('cost') ? 'explicit' : ''
  };
}

function pathEvidenceScore(item = {}) {
  let score = 0;
  if (item?.trajectoryChain?.matched) score += 4;
  if (item?.localStrongChain?.matched) score += 3;
  if (item?.localStrengthMark?.matched) score += 2;
  if (item?.majorUnderstanding?.matched) score += 2;
  if (Array.isArray(item?.reviewPoints)) score += Math.min(2, item.reviewPoints.filter(Boolean).length);
  if (item?.historyEvidence && typeof item.historyEvidence === 'object') score += 1;
  return score;
}

function platformScore(item = {}) {
  if (item.is985) return 4;
  if (item.is211) return 3;
  if (item.isPublicSchool) return 1;
  return 0;
}

function costScore(item = {}) {
  let score = 0;
  if (item.isHighFee || item.isSinoForeign) score -= 4;
  if (item.isPrivateSchool) score -= 2;
  if (item.isPublicSchool) score += 2;
  if (clean(item.costRiskLevel, 20) === 'high') score -= 2;
  return score;
}

function withinBandCompare(a, b, lens) {
  if (lens === 'employment_evidence') {
    const delta = pathEvidenceScore(b) - pathEvidenceScore(a);
    if (delta) return delta;
  }
  if (lens === 'cost') {
    const delta = costScore(b) - costScore(a);
    if (delta) return delta;
  }
  if (lens === 'platform') {
    const delta = platformScore(b) - platformScore(a);
    if (delta) return delta;
  }
  const as = finite(a.score2026 ?? a.score);
  const bs = finite(b.score2026 ?? b.score);
  if (as != null && bs != null && as !== bs) return bs - as;
  const ar = rank(a.rank2026 ?? a.rank);
  const br = rank(b.rank2026 ?? b.rank);
  if (ar != null && br != null && ar !== br) return ar - br;
  return Number(a.userOrder || 9999) - Number(b.userOrder || 9999);
}

export function proposeSelectionOrder(items = [], lens = 'position') {
  const source = Array.isArray(items) ? [...items] : [];
  const unlocked = source.filter(item => !item?.locked).sort((a, b) => {
    const bandDelta = (BAND_ORDER[normalizedBand(a)] ?? 9) - (BAND_ORDER[normalizedBand(b)] ?? 9);
    return bandDelta || withinBandCompare(a, b, lens);
  });
  let cursor = 0;
  return source.map(item => item?.locked ? item : unlocked[cursor++]);
}

function topCount(items, getter) {
  const counts = new Map();
  for (const item of items) {
    const key = clean(getter(item), 140);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
}

function orderInversions(items = []) {
  let previous = -1;
  let inversions = 0;
  for (const item of items) {
    const current = BAND_ORDER[normalizedBand(item)] ?? 9;
    if (previous > current) inversions += 1;
    previous = current;
  }
  return inversions;
}

export function buildSelectionDiagnostics(items = [], workspace = {}) {
  const list = Array.isArray(items) ? items : [];
  const base = buildPathAnalysis({
    items: list,
    candidateScore: currentScore(workspace),
    explicitPreferences: explicitPreferences(workspace)
  });
  const cards = [];
  const push = (key, title, level, summary, detail = '') => cards.push({ key, title, level, summary, detail });

  const inversions = orderInversions(list);
  push(
    'order',
    '顺序诊断',
    inversions ? 'medium' : 'low',
    inversions ? `当前有 ${inversions} 处前后层级倒置，建议先看“建议讨论顺序”。` : '当前顺序没有明显的冲稳保层级倒置。',
    '这里检查的是讨论顺序，不替代正式志愿表的最终人工排序。'
  );

  const [topSchool, topSchoolCount] = topCount(list, item => item.school);
  if (list.length >= 5 && topSchoolCount >= Math.ceil(list.length * 0.5)) {
    push('school_concentration', '学校集中度', 'medium', `“${topSchool}”占 ${topSchoolCount}/${list.length}，需要确认是主动偏好还是无意识扎堆。`);
  } else {
    push('school_concentration', '学校集中度', 'low', '暂未发现单一学校过度占位。');
  }

  const [topMajorFamily, topFamilyCount] = topCount(list, item => majorFamily(item.major));
  const explicitMajor = explicitPreferences(workspace).major;
  if (!explicitMajor && list.length >= 6 && topMajorFamily && topFamilyCount >= Math.ceil(list.length * 0.65)) {
    push('major_concentration', '专业集中度', 'medium', `专业主要集中在“${topMajorFamily}”，但家庭还没有明确锁定单一方向。`);
  } else {
    push('major_concentration', '专业集中度', 'low', topMajorFamily ? `当前主方向是“${topMajorFamily}”，集中度与已记录偏好未见明显冲突。` : '专业方向仍较分散。');
  }

  const explicit = workspace?.decisionProfile?.explicit || {};
  const resourceSensitive = explicit.familyResourceSensitivity === 'resource_sensitive' || (explicit.priorities || []).includes('cost');
  const highCost = list.filter(item => item.isHighFee || item.isSinoForeign || item.isPrivateSchool || clean(item.costRiskLevel, 20) === 'high');
  push(
    'cost',
    '家庭成本',
    resourceSensitive && highCost.length ? 'high' : highCost.length ? 'medium' : 'low',
    highCost.length ? `当前有 ${highCost.length} 项属于中外合作、高收费、民办或高成本风险，需要逐项确认家庭是否接受。` : '当前未识别出明确的高收费/中外/民办成本风险项。',
    resourceSensitive ? '家庭已表达成本敏感，因此高成本项会被提高警示级别。' : '未记录明确成本底线时，只提示事实，不替家庭删除。'
  );

  const employmentFirst = explicit.primaryGoal === 'employment_stability' || (explicit.priorities || []).includes('employment') || (explicit.careerTargets || []).length;
  const evidenceReady = list.filter(item => pathEvidenceScore(item) >= 3).length;
  push(
    'employment_path',
    '就业/升学路径证据',
    employmentFirst && evidenceReady < Math.ceil(list.length * 0.6) ? 'medium' : 'low',
    list.length ? `${evidenceReady}/${list.length} 项已有较完整的专业链、本地强链、专业理解或历史证据可继续做路径判断。` : '尚无自选项，无法做就业/升学路径诊断。',
    '这是“证据覆盖度”而不是就业率排名；没有可靠事实时不会用名人观点或模型记忆替代。'
  );

  const unresolved = Number(base?.stats?.unresolvedCount || 0);
  push('evidence', '证据完整度', unresolved ? 'medium' : 'low', unresolved ? `${unresolved} 项仍有办学性质、费用、历史对应或位置证据待确认。` : '当前自选项的基础位置与性质证据未见明显缺口。');

  return { version: AIPLUS_SELECTION_WORKBENCH_VERSION, base, cards };
}

function compactCurrentCandidate(record = {}) {
  const score2026 = finite(record.score2026);
  if (score2026 == null) return null;
  const school = clean(record.school || record.schoolName, 120);
  const major = clean(record.major || record.majorName, 180);
  if (!school || !major) return null;
  const rank2026 = rank(record.rank2026);
  return {
    ...record,
    school,
    major,
    score2026,
    rank2026,
    score: score2026,
    rank: rank2026,
    displayLocation: clean(record.displayLocation || record.city || record.province, 80),
    bandKey: clean(record.bandKey || record.band, 30),
    dataYear: 2026,
    primaryYear: 2026
  };
}

function appendCandidateRecords(result, out) {
  const records = Array.isArray(result?.candidates?.records) ? result.candidates.records : [];
  for (const record of records.slice(0, 160)) {
    const compact = compactCurrentCandidate(record);
    if (compact) out.push(compact);
  }
}

function workspaceCandidateRecords(workspace = {}) {
  const out = [];
  appendCandidateRecords(workspace.lastResult, out);
  for (const task of (workspace.tasks || []).slice(0, 12)) appendCandidateRecords(task?.result, out);
  const seen = new Set();
  return out.filter(record => {
    const key = `${record.id || ''}|${record.school}|${record.major}|${record.score2026}|${record.rank2026 ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function recordFromCard(card, records) {
  const school = clean(card.querySelector('.candidate-school')?.textContent, 120);
  const major = clean(card.querySelector('.candidate-major')?.textContent, 180);
  if (!school || !major) return null;
  const reference = clean(card.querySelector('.reference-main')?.textContent, 220);
  const scoreMatch = reference.match(/(\d{3})\s*分/);
  const rankMatch = reference.match(/([\d,]+)\s*位/);
  const score = scoreMatch ? Number(scoreMatch[1]) : null;
  const cardRank = rankMatch ? Number(rankMatch[1].replace(/,/g, '')) : null;
  if (score == null && cardRank == null) return null;
  const exact = records.filter(record => record.school === school
    && record.major === major
    && (score == null || record.score2026 === score)
    && (cardRank == null || record.rank2026 === cardRank));
  return exact.length === 1 ? exact[0] : null;
}

function severityLabel(level) {
  return level === 'high' ? '先处理' : level === 'medium' ? '要确认' : '正常';
}

function bandLabel(item) {
  return BAND_TEXT[normalizedBand(item)] || '待确认';
}

let panel = null;
let statusNode = null;
let observer = null;
let candidateDecorationScheduled = false;
let renderSequence = 0;
let currentLens = 'position';
let actionStatus = '';

function renderPoolItem(item, index, total) {
  const row = node('article', 'selection-workbench-item');
  const order = node('span', 'selection-workbench-order', String(index + 1));
  const main = node('div', 'selection-workbench-item-main');
  main.append(node('strong', '', `${item.school || '学校待核'} · ${item.major || '专业待核'}`));
  const meta = [];
  if (finite(item.score2026 ?? item.score) != null) meta.push(`${finite(item.score2026 ?? item.score)}分`);
  if (rank(item.rank2026 ?? item.rank) != null) meta.push(`${rank(item.rank2026 ?? item.rank).toLocaleString('zh-CN')}位`);
  meta.push(bandLabel(item));
  main.append(node('span', '', meta.join(' · ')));
  const actions = node('div', 'selection-workbench-item-actions');
  const up = node('button', '', '↑');
  up.type = 'button';
  up.disabled = index === 0;
  up.title = '上移';
  const down = node('button', '', '↓');
  down.type = 'button';
  down.disabled = index === total - 1;
  down.title = '下移';
  const remove = node('button', 'is-remove', '移除');
  remove.type = 'button';
  up.addEventListener('click', () => movePoolItem(item.id, 'up'));
  down.addEventListener('click', () => movePoolItem(item.id, 'down'));
  remove.addEventListener('click', () => {
    if (!confirm(`从自选移除“${item.school} · ${item.major}”？`)) return;
    actionStatus = '已从自选移除；学校和专业讨论仍保留在家庭顾问里。';
    removePoolItem(item.id);
  });
  actions.append(up, down, remove);
  row.append(order, main, actions);
  return row;
}

function ensurePanel() {
  if (panel?.isConnected) return panel;
  const history = document.querySelector('#historyPanel');
  if (!history) return null;
  panel = node('section', 'decision-rail-section selection-workbench');
  panel.id = 'selectionWorkbench';
  panel.setAttribute('aria-labelledby', 'selectionWorkbenchTitle');
  const historyArchive = history.querySelector('.decision-history-card');
  history.insertBefore(panel, historyArchive || null);
  return panel;
}

async function renderWorkbench() {
  const seq = ++renderSequence;
  const root = ensurePanel();
  if (!root) return;
  const workspace = await loadCurrentWorkspace().catch(() => null) || {};
  if (seq !== renderSequence) return;
  const items = getPoolItems();
  const diagnosis = buildSelectionDiagnostics(items, workspace);
  root.replaceChildren();

  const head = node('div', 'selection-workbench-head');
  const titleWrap = node('div');
  const title = node('h2', '', '我的自选');
  title.id = 'selectionWorkbenchTitle';
  titleWrap.append(title, node('span', '', items.length ? `${items.length} 个学校×专业` : '把真正愿意读的项目留下来'));
  const planLink = node('a', 'selection-workbench-plan-link', '打开家庭方案');
  planLink.href = '/ln-rank/selection-pool.html';
  head.append(titleWrap, planLink);
  root.append(head);

  const defaultStatus = items.length ? 'AIPLuS 与专业初选共用同一个自选池，不复制第二份收藏。' : '在回答中的真实 2026 学校×专业卡片上点“加入自选”。';
  statusNode = node('p', 'selection-workbench-status', actionStatus || defaultStatus);
  statusNode.setAttribute('aria-live', 'polite');
  root.append(statusNode);
  actionStatus = '';

  if (items.length) {
    const list = node('div', 'selection-workbench-list');
    items.slice(0, 12).forEach((item, index) => list.append(renderPoolItem(item, index, items.length)));
    if (items.length > 12) {
      const more = node('a', 'selection-workbench-more', `其余 ${items.length - 12} 项在家庭方案中管理 →`);
      more.href = '/ln-rank/selection-pool.html';
      list.append(more);
    }
    root.append(list);
  }

  const diagnosisBox = node('details', 'selection-diagnosis');
  diagnosisBox.open = Boolean(items.length);
  diagnosisBox.append(node('summary', '', `自选诊断 · ${diagnosis.base?.summary || '等待加入自选'}`));
  const grid = node('div', 'selection-diagnosis-grid');
  for (const card of diagnosis.cards) {
    const item = node('article', `selection-diagnosis-card is-${card.level}`);
    item.append(
      node('div', 'selection-diagnosis-card-head', card.title),
      node('span', 'selection-diagnosis-level', severityLabel(card.level)),
      node('p', '', card.summary)
    );
    if (card.detail) item.append(node('p', 'selection-diagnosis-detail', card.detail));
    grid.append(item);
  }
  diagnosisBox.append(grid);
  if (diagnosis.base?.risks?.length) {
    const risks = node('div', 'selection-diagnosis-risks');
    risks.append(node('strong', '', '结构提醒'));
    const ul = node('ul');
    diagnosis.base.risks.slice(0, 6).forEach(text => ul.append(node('li', '', text)));
    risks.append(ul);
    diagnosisBox.append(risks);
  }
  root.append(diagnosisBox);

  const sorting = node('details', 'selection-sorter');
  sorting.append(node('summary', '', '建议讨论顺序'));
  const controls = node('div', 'selection-sorter-controls');
  const select = node('select');
  select.setAttribute('aria-label', '自选排序视角');
  for (const lens of LENSES) {
    const option = node('option', '', lens.label);
    option.value = lens.key;
    option.selected = lens.key === currentLens;
    select.append(option);
  }
  const preview = node('ol', 'selection-sort-preview');
  const mountPreview = () => {
    currentLens = select.value;
    preview.replaceChildren();
    proposeSelectionOrder(items, currentLens).slice(0, 10).forEach(item => preview.append(node('li', '', `${item.school} · ${item.major} · ${bandLabel(item)}`)));
  };
  select.addEventListener('change', mountPreview);
  const apply = node('button', 'selection-sort-apply', '采用这个讨论顺序');
  apply.type = 'button';
  apply.disabled = items.length < 2;
  apply.addEventListener('click', () => {
    if (!confirm('只调整“我的自选”讨论顺序，不会替你提交正式志愿。采用这个顺序吗？')) return;
    actionStatus = `已采用“${LENSES.find(item => item.key === currentLens)?.label || '录取位置'}”讨论顺序；正式志愿顺序仍由你决定。`;
    savePoolItems(proposeSelectionOrder(getPoolItems(), currentLens));
  });
  controls.append(select, apply);
  sorting.append(
    controls,
    node('p', 'selection-sort-note', '四种视角都先保持稍高→主要参考→低分侧层级，只在同层内调整。锁定项目保持原位置。就业视角按已有路径证据完整度排序，不冒充就业率排名。'),
    preview
  );
  mountPreview();
  root.append(sorting);

  const ask = node('button', 'selection-diagnosis-ask', '让家庭顾问继续解释这份自选');
  ask.type = 'button';
  ask.disabled = !items.length;
  ask.addEventListener('click', () => {
    document.querySelector('#importSelection')?.click();
    const input = document.querySelector('#promptInput');
    if (!input) return;
    input.value = '请结合我已经确认的家庭条件，解释并诊断当前自选：重点检查录取结构、志愿顺序、学校和专业集中度、家庭成本、就业与升学路径、证据缺口；不要把没有依据的就业率或个人观点当事实。';
    document.querySelector('#promptForm')?.requestSubmit();
  });
  root.append(ask);
}

function updateCandidateButton(button, selected) {
  const text = selected ? '✓ 已自选' : '＋ 加入自选';
  const pressed = String(selected);
  if (button.textContent !== text) button.textContent = text;
  if (button.disabled !== selected) button.disabled = selected;
  if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
}

async function decorateCandidateCards() {
  const workspace = await loadCurrentWorkspace().catch(() => null) || {};
  const records = workspaceCandidateRecords(workspace);
  const poolIds = new Set(getPoolItems().map(item => item.id));
  for (const card of document.querySelectorAll('.candidate-item')) {
    const existing = card.querySelector('.selection-add-button');
    const record = recordFromCard(card, records);
    if (!record) {
      existing?.remove();
      continue;
    }
    const id = itemId(record);
    const selected = poolIds.has(id);
    if (existing) {
      updateCandidateButton(existing, selected);
      continue;
    }
    const button = node('button', 'selection-add-button');
    button.type = 'button';
    updateCandidateButton(button, selected);
    button.addEventListener('click', () => {
      const result = addPoolItem(record);
      actionStatus = result.message || (result.ok ? '已加入自选。' : '暂时无法加入自选。');
      updateCandidateButton(button, result.ok || getPoolItems().some(item => item.id === id));
      renderWorkbench().catch(() => {});
    });
    const head = card.querySelector('.candidate-head') || card;
    head.append(button);
  }
}

async function refreshAll() {
  await renderWorkbench();
  await decorateCandidateCards();
}

function nodeContainsCandidate(nodeValue) {
  if (!(nodeValue instanceof Element)) return false;
  return nodeValue.matches('.candidate-item') || Boolean(nodeValue.querySelector('.candidate-item'));
}

function scheduleCandidateDecoration() {
  if (candidateDecorationScheduled) return;
  candidateDecorationScheduled = true;
  queueMicrotask(() => {
    candidateDecorationScheduled = false;
    decorateCandidateCards().catch(() => {});
  });
}

function startObserver() {
  const conversation = document.querySelector('#conversationStream');
  if (!conversation || observer) return;
  observer = new MutationObserver(mutations => {
    const addedCandidate = mutations.some(mutation => [...mutation.addedNodes].some(nodeContainsCandidate));
    if (addedCandidate) scheduleCandidateDecoration();
  });
  observer.observe(conversation, { childList: true, subtree: true });
}

export async function mountSelectionWorkbench() {
  document.body.dataset.aiSelectionWorkbench = AIPLUS_SELECTION_WORKBENCH_VERSION;
  await refreshAll();
  startObserver();
  window.addEventListener('lnrank-selection-pool-updated', refreshAll);
  window.addEventListener('storage', event => {
    if (event.key === 'lnRank.selectionPool.lnPhysics.2026.v3951') refreshAll();
  });
}

mountSelectionWorkbench().catch(error => {
  console.error('[AIPLuS selection workbench]', error);
});
