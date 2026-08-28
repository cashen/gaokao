import { QUESTION_SECTIONS, DIRECTION_BUCKETS } from './direction-explorer-data.js?v=3949_0';
import { buildDirectionExplorerResult, withDirectionSelection } from './direction-explorer-engine.js?v=3949_0';
import { loadDirectionExplorerState, saveDirectionExplorerState, updateDirectionExplorerState, clearDirectionExplorerAll, clearDirectionExplorerApplied } from './direction-explorer-state.js?v=3949_0';

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function uniq(list = []) { return [...new Set(list.map(x => String(x || '').trim()).filter(Boolean))]; }
function splitWords(value = '') { return String(value || '').split(/[，,、/；;|\s]+/).map(x => x.trim()).filter(Boolean); }
function compactDirectionLabel(item) { return item && typeof item === 'object' ? (item.shortLabel || item.label || '') : item; }
function compactTagList(items = [], limit = 4) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return '<em>暂时没有明显方向</em>';
  const visible = list.slice(0, limit);
  const tags = visible.map(x => `<span>${escapeHtml(compactDirectionLabel(x))}</span>`).join('');
  return tags + (list.length > limit ? `<span class="direction-more-tag">等 ${list.length} 个方向</span>` : '');
}
function hasDifferentExisting(existing = '', keywords = []) {
  const current = splitWords(existing);
  if (!current.length) return false;
  const next = new Set(keywords);
  return current.some(x => !next.has(x));
}
function allDirections(result = {}) { return [...(result.apply || []), ...(result.learn || []), ...(result.confirm || [])]; }
function directionSelectionCopy(count = 0) {
  if (count <= 0) return '还没选择方向。先勾选 1—3 个，再去查对应专业。';
  if (count === 1) return '已选 1 个方向，可以继续选，也可以去查专业。';
  if (count === 2) return '已选 2 个方向，适合拿去做专业查询。';
  if (count === 3) return '已选 3 个方向，已经够用了，下一步去查专业。';
  return '最多选 3 个方向，先取消一个再继续。';
}
function directionPanelActionCopy(count = 0) {
  return count <= 0 ? '先选方向' : '去查这些方向';
}
function directionDetail(item = {}, bucket = '') {
  const evidence = (item.evidence || []).slice(0, 3).join('、') || '来自本次选择的行为线索。';
  const majors = (item.majors || []).slice(0, 4).join('、') || '先看分数附近真实专业。';
  const confirm = (item.confirmNotes || item.confirmTemplate || []).slice(0, 2).join('；') || item.learn || '先了解课程、校区、培养模式和就业场景。';
  const summary = item.learn || evidence || '可以先作为家庭讨论线索。';
  const selectedClass = item.isSelected ? ' is-selected' : '';
  return `<article class="direction-detail-card${selectedClass}">
    <label class="direction-card-main"><input type="checkbox" data-direction-pick="${escapeHtml(item.id)}" ${item.isSelected ? 'checked' : ''}> <span class="direction-card-copy"><b>${escapeHtml(item.label)}</b><em>${escapeHtml(bucket || '可以先了解')}</em><small>${escapeHtml(summary)}</small></span></label>
    <details class="direction-card-details"><summary>展开看看</summary>
      <p><strong>为什么会出现：</strong>${escapeHtml(evidence)}</p>
      <p><strong>可以先看：</strong>${escapeHtml(majors)}</p>
      <p><strong>需要再确认：</strong>${escapeHtml(confirm)}</p>
    </details>
  </article>`;
}
function resultGroup(title, desc, items = [], bucketKey = '') {
  if (!items.length) return '';
  const bucket = DIRECTION_BUCKETS[bucketKey] || title;
  return `<div class="direction-result-card is-${escapeHtml(bucketKey)}"><b>${escapeHtml(title)}</b><p>${escapeHtml(desc)}</p><div class="direction-result-tags">${compactTagList(items, 4)}</div><div class="direction-detail-list">${items.map(x => directionDetail(x, bucket)).join('')}</div></div>`;
}
function markSelected(result = {}) {
  const selected = new Set(result.selectedDirectionIds || []);
  for (const item of allDirections(result)) item.isSelected = selected.has(item.id);
  return result;
}

export function initDirectionExplorer({ entryMount, panelMount, getMajorKeyword, setMajorKeyword, onApplied, onCleared } = {}) {
  if (!entryMount || !panelMount) return null;
  let isOpen = false;
  let mergePrompt = false;
  let lastMode = 'empty';
  let actionHint = '';
  let highlightEntryTimer = null;
  const read = () => loadDirectionExplorerState();
  const write = (patch) => updateDirectionExplorerState(patch);
  const open = () => { isOpen = true; mergePrompt = false; actionHint = ''; render(); };
  const close = () => { isOpen = false; mergePrompt = false; actionHint = ''; render(); };
  const stepCount = QUESTION_SECTIONS.length;
  const setStep = (step) => { write({ uiStep: Math.max(0, Math.min(stepCount - 1, Number(step || 0))) }); render({ restoreScroll: false }); };
  const toggleAnswer = (questionKey, optionId) => {
    const state = read();
    const section = QUESTION_SECTIONS.flatMap(s => s.questions || []).find(q => q.key === questionKey);
    const answers = { ...(state.answers || {}) };
    if (section?.type === 'single') answers[questionKey] = [optionId];
    else {
      const list = new Set(Array.isArray(answers[questionKey]) ? answers[questionKey] : []);
      if (list.has(optionId)) list.delete(optionId); else list.add(optionId);
      answers[questionKey] = [...list];
    }
    write({ answers, result: null, applied: state.applied || null });
    render({ restoreScroll: true });
  };
  const generate = () => {
    const state = read();
    const result = buildDirectionExplorerResult(state.answers || {});
    saveDirectionExplorerState({ ...state, result, applied: state.applied || null });
    mergePrompt = false;
    actionHint = '方向讨论记录已生成。先勾选 1—3 个方向，再去查对应专业。';
    render();
    setTimeout(() => panelMount.querySelector('.direction-result')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
  };
  const toggleDirectionPick = (directionId) => {
    const state = read();
    const result = state.result || buildDirectionExplorerResult(state.answers || {});
    const current = new Set(result.selectedDirectionIds || []);
    if (current.has(directionId)) current.delete(directionId);
    else if (current.size >= 3) { actionHint = '最多选 3 个方向，先取消一个再继续。'; render(); return; }
    else current.add(directionId);
    const next = withDirectionSelection(result, [...current]);
    saveDirectionExplorerState({ ...state, result: next });
    actionHint = directionSelectionCopy(next.selectedDirectionIds.length);
    render({ restoreScroll: true });
  };
  const applyResult = (mode = null) => {
    const state = read();
    let result = state.result || buildDirectionExplorerResult(state.answers || {});
    const selectedIds = result.selectedDirectionIds || [];
    if (!selectedIds.length) { actionHint = '先选 1—3 个方向，再继续。'; render(); return; }
    result = withDirectionSelection(result, selectedIds);
    const keywords = uniq(result.queryKeywords || []);
    if (!keywords.length) { actionHint = '已选方向暂时没有可用关键词，可以重新选择方向。'; render(); return; }
    const existing = getMajorKeyword?.() || '';
    if (!mode && hasDifferentExisting(existing, keywords)) {
      mergePrompt = true;
      actionHint = '当前已经填了专业方向，请确认是追加还是替换。';
      render();
      setTimeout(() => panelMount.querySelector('.direction-merge-box')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
      return;
    }
    const current = splitWords(existing);
    const currentSet = new Set(current);
    const nextWords = mode === 'replace' ? keywords : uniq(current.concat(keywords));
    const nextValue = nextWords.slice(0, 12).join('/');
    const addedKeywords = mode === 'replace' ? keywords : keywords.filter(word => !currentSet.has(word));
    const applied = { visibleDirections: result.visibleDirections || [], selectedDirectionIds: result.selectedDirectionIds || [], keywords, addedKeywords, value: nextValue, appliedAt: Date.now(), mode: mode || (existing ? 'add' : 'replace') };
    saveDirectionExplorerState({ ...state, result, applied });
    setMajorKeyword?.(nextValue, { source: 'direction-explorer', mode: mode || (existing ? 'add' : 'replace'), applied });
    isOpen = false; mergePrompt = false; actionHint = '';
    onApplied?.(result, applied);
    render();
  };
  const clearApplied = () => { const before = read().applied; clearDirectionExplorerApplied(); onCleared?.(before); render(); };
  const clearAll = () => { clearDirectionExplorerAll(); mergePrompt = false; actionHint = ''; render(); };
  function entryHtml() {
    const state = read(); const applied = state.applied; const existing = getMajorKeyword?.() || ''; const mode = existing ? 'has-keyword' : 'empty'; lastMode = mode;
    if (applied?.visibleDirections?.length) {
      const visible = applied.visibleDirections.slice(0, 3).join(' / '); const suffix = applied.visibleDirections.length > 3 ? ' 等' : '';
      return `<div class="direction-entry is-applied" id="direction-explorer"><div><b>已带入讨论方向：</b><span>${escapeHtml(visible)}${suffix}</span></div><div class="direction-entry-actions"><button type="button" data-direction-open>调整</button><button type="button" data-direction-clear>清除</button></div></div>`;
    }
    return `<div class="direction-entry ${mode === 'empty' ? 'is-empty-keyword' : 'is-soft-link'}" id="direction-explorer"><div><b>${mode === 'empty' ? '方向不确定？' : '方向还想再看看？'}</b><span>先选 1—3 个可以继续了解的方向。</span></div><button type="button" data-direction-open>${mode === 'empty' ? '看看方向' : '调整一下'}</button></div>`;
  }
  function stepperHtml(step) {
    return `<div class="direction-stepper">${QUESTION_SECTIONS.map((s, i) => `<span class="${i === step ? 'is-current' : (i < step ? 'is-done' : '')}">${i + 1}. ${escapeHtml(s.stepTitle || s.title)}</span>`).join('')}</div>`;
  }
  function questionHtml() {
    const state = read(); const answers = state.answers || {}; const step = Math.max(0, Math.min(stepCount - 1, Number(state.uiStep || 0))); const section = QUESTION_SECTIONS[step];
    return `${stepperHtml(step)}<section class="direction-section"><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.desc || '')}</p>${(section.questions || []).map(q => {
      const selected = new Set(Array.isArray(answers[q.key]) ? answers[q.key] : []);
      return `<div class="direction-question"><h4>${escapeHtml(q.title)}</h4><div class="direction-chip-grid">${(q.options || []).map(opt => `<button type="button" class="direction-chip ${selected.has(opt.id) ? 'is-selected' : ''}" data-direction-answer="${escapeHtml(q.key)}" data-direction-option="${escapeHtml(opt.id)}">${escapeHtml(opt.label)}</button>`).join('')}</div></div>`;
    }).join('')}</section>`;
  }
  function resultHtml() {
    const state = read(); let result = state.result; if (!result) return '';
    result = markSelected(result);
    const selectedCount = (result.selectedDirectionIds || []).length;
    const selectionCopy = directionSelectionCopy(selectedCount);
    const merge = mergePrompt ? `<div class="direction-merge-box"><b>当前已经填了专业方向</b><p>为了避免误覆盖，先让你确认一下：可以追加本次方向，也可以替换成这次选择。</p><div><button type="button" data-direction-merge-cancel>先不改</button><button type="button" class="direction-primary" data-direction-apply-mode="add">追加方向</button><button type="button" data-direction-apply-mode="replace">替换为本次方向</button></div></div>` : '';
    const conflictList = (result.conflicts || []).slice(0, 4).map(x => `<li>${escapeHtml(x.message)}${x.action ? ` <b>${escapeHtml(x.action)}</b>` : ''}</li>`).join('');
    const familyList = (result.familyConstraints || []).slice(0, 4).map(x => `<li>${escapeHtml(x)}</li>`).join('');
    return `<section class="direction-result"><h3>方向讨论记录</h3><p>先选 1—3 个方向，下一步带到专业查询里验证。</p>
      <div class="direction-boundary-note">这里不是直接定专业，只是帮家里先圈出几个可以继续了解的方向。最后还要回到分数、学校、专业和孩子接受度一起看。</div>
      <div class="direction-selection-note"><b>已选 ${selectedCount}/3</b><span>${escapeHtml(selectionCopy)}</span></div>
      <div class="direction-result-grid">
        ${resultGroup('可以优先查看的方向', '有接触或行为线索，可以先带到专业查询里看看。', result.apply || [], 'apply')}
        ${resultGroup('可以先了解的方向', '接触少或信号较弱，先看课程和真实专业。', result.learn || [], 'learn')}
        ${resultGroup('需要先确认的方向', '兴趣、排斥或家庭诉求之间存在需要核验的点。', result.confirm || [], 'confirm')}
      </div>
      ${conflictList ? `<div class="direction-check-box"><b>需要先确认的矛盾点</b><ul>${conflictList}</ul></div>` : ''}
      ${familyList ? `<div class="direction-check-box is-family"><b>家庭约束提醒</b><ul>${familyList}</ul></div>` : ''}
      ${merge}</section>`;
  }
  function panelHtml() {
    const state = read(); const step = Math.max(0, Math.min(stepCount - 1, Number(state.uiStep || 0)));
    const hasResult = !!state.result;
    const selectedCount = state.result?.selectedDirectionIds?.length || 0;
    const applyDisabled = hasResult && selectedCount <= 0;
    const resultActionHtml = hasResult
      ? `<button type="button" data-direction-reset>重新选择</button><button type="button" class="direction-primary" data-direction-apply ${applyDisabled ? 'disabled aria-disabled="true"' : ''}>${escapeHtml(directionPanelActionCopy(selectedCount))}</button>`
      : `${step > 0 ? `<button type="button" data-direction-prev>上一步</button>` : ''}${step < stepCount - 1 ? `<button type="button" class="direction-primary" data-direction-next>下一步</button>` : `<button type="button" class="direction-primary" data-direction-generate>生成方向参考</button>`}<button type="button" data-direction-reset>清空选择</button>`;
    return `<div class="direction-panel-layer ${isOpen ? 'is-open' : ''}" ${isOpen ? '' : 'hidden'}><div class="direction-backdrop" data-direction-close></div><aside class="direction-panel ${hasResult ? 'has-result' : ''}" role="dialog" aria-modal="true" aria-label="孩子方向讨论助手"><div class="direction-panel-head"><div><h2>孩子方向讨论助手</h2><p>不是直接定专业，只是帮家里先圈出几个可以继续了解的方向。</p></div><button type="button" class="direction-close" data-direction-close aria-label="收起孩子方向讨论助手">收起</button></div><div class="direction-panel-body"><div class="direction-principle">先选 1—3 个方向，再去专业查询里验证。</div>${questionHtml()}${resultHtml()}</div>${actionHint ? `<div class="direction-action-hint" role="status">${escapeHtml(actionHint)}</div>` : ''}<div class="direction-panel-actions">${resultActionHtml}</div></aside></div>`;
  }
  function bindEntry() { entryMount.querySelectorAll('[data-direction-open]').forEach(btn => btn.addEventListener('click', open)); entryMount.querySelectorAll('[data-direction-clear]').forEach(btn => btn.addEventListener('click', clearApplied)); }
  function bindPanel() {
    panelMount.querySelectorAll('[data-direction-close]').forEach(btn => btn.addEventListener('click', close));
    panelMount.querySelectorAll('[data-direction-answer]').forEach(btn => btn.addEventListener('click', () => toggleAnswer(btn.dataset.directionAnswer, btn.dataset.directionOption)));
    panelMount.querySelector('[data-direction-prev]')?.addEventListener('click', () => setStep((read().uiStep || 0) - 1));
    panelMount.querySelector('[data-direction-next]')?.addEventListener('click', () => setStep((read().uiStep || 0) + 1));
    panelMount.querySelector('[data-direction-generate]')?.addEventListener('click', generate);
    panelMount.querySelector('[data-direction-apply]')?.addEventListener('click', () => applyResult());
    panelMount.querySelectorAll('[data-direction-pick]').forEach(input => input.addEventListener('change', () => toggleDirectionPick(input.dataset.directionPick)));
    panelMount.querySelectorAll('[data-direction-apply-mode]').forEach(btn => btn.addEventListener('click', () => applyResult(btn.dataset.directionApplyMode)));
    panelMount.querySelector('[data-direction-merge-cancel]')?.addEventListener('click', () => { mergePrompt = false; actionHint = '已保留当前专业方向。'; render(); });
    panelMount.querySelector('[data-direction-reset]')?.addEventListener('click', () => { const state = read(); saveDirectionExplorerState({ ...state, answers: {}, result: null, applied: state.applied || null, uiStep: 0 }); mergePrompt = false; actionHint = '已清空，可以重新选择方向。'; render(); });
  }
  function renderEntryOnly() { entryMount.innerHTML = entryHtml(); bindEntry(); }
  function render(options = {}) {
    const body = panelMount.querySelector('.direction-panel-body'); const oldScroll = options.restoreScroll && body ? body.scrollTop : null;
    entryMount.innerHTML = entryHtml(); panelMount.innerHTML = panelHtml(); document.body.classList.toggle('direction-panel-open', isOpen); bindEntry(); bindPanel();
    if (oldScroll != null) { const nextBody = panelMount.querySelector('.direction-panel-body'); if (nextBody) nextBody.scrollTop = oldScroll; }
  }
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isOpen) close(); });
  render();
  return { render, renderEntry: renderEntryOnly, open, close, getMode: () => lastMode, clearApplied, highlightEntry: () => { const el = entryMount.querySelector('.direction-entry'); if (!el) return; el.classList.add('is-highlight'); clearTimeout(highlightEntryTimer); highlightEntryTimer = setTimeout(() => el.classList.remove('is-highlight'), 1600); } };
}
