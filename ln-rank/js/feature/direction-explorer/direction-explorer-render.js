import { QUESTION_SECTIONS, DIRECTION_BUCKETS } from './direction-explorer-data.js?v=3943_0';
import { buildDirectionExplorerResult, withDirectionSelection } from './direction-explorer-engine.js?v=3943_0';
import { loadDirectionExplorerState, saveDirectionExplorerState, updateDirectionExplorerState, clearDirectionExplorerAll, clearDirectionExplorerApplied } from './direction-explorer-state.js?v=3943_0';

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
function directionDetail(item = {}, bucket = '') {
  const evidence = (item.evidence || []).slice(0, 3).join('、') || '来自本次选择的行为线索。';
  const majors = (item.majors || []).slice(0, 4).join('、') || '先看分数附近真实专业。';
  const confirm = (item.confirmNotes || item.confirmTemplate || []).slice(0, 2).join('；') || item.learn || '先了解课程、校区、培养模式和就业场景。';
  return `<div class="direction-detail-card">
    <div class="direction-pick-line"><label><input type="checkbox" data-direction-pick="${escapeHtml(item.id)}" ${item.isSelected ? 'checked' : ''}> <b>${escapeHtml(item.label)}</b></label><span>${escapeHtml(bucket)}</span></div>
    <p><strong>为什么出现：</strong>${escapeHtml(evidence)}</p>
    <p><strong>可以先看：</strong>${escapeHtml(majors)}</p>
    <p><strong>需要确认：</strong>${escapeHtml(confirm)}</p>
  </div>`;
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
    actionHint = '方向讨论记录已生成。请先勾选 1-3 个方向，再应用到专业查询。';
    render();
    setTimeout(() => panelMount.querySelector('.direction-result')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);
  };
  const toggleDirectionPick = (directionId) => {
    const state = read();
    const result = state.result || buildDirectionExplorerResult(state.answers || {});
    const current = new Set(result.selectedDirectionIds || []);
    if (current.has(directionId)) current.delete(directionId);
    else if (current.size >= 3) { actionHint = '方向太多会让专业池变散，建议先选 1-3 个最想讨论的方向。'; render(); return; }
    else current.add(directionId);
    const next = withDirectionSelection(result, [...current]);
    saveDirectionExplorerState({ ...state, result: next });
    actionHint = next.selectedDirectionIds.length ? `已选择 ${next.selectedDirectionIds.length} 个方向。` : '还没有选择要应用到查询的方向。';
    render({ restoreScroll: true });
  };
  const applyResult = (mode = null) => {
    const state = read();
    let result = state.result || buildDirectionExplorerResult(state.answers || {});
    const selectedIds = result.selectedDirectionIds || [];
    if (!selectedIds.length) { actionHint = '请先勾选 1-3 个方向，再应用到专业查询。'; render(); return; }
    result = withDirectionSelection(result, selectedIds);
    const keywords = uniq(result.queryKeywords || []);
    if (!keywords.length) { actionHint = '已选方向还没有可用关键词，请调整方向。'; render(); return; }
    const existing = getMajorKeyword?.() || '';
    if (!mode && hasDifferentExisting(existing, keywords)) {
      mergePrompt = true;
      actionHint = '当前已有专业关键词，默认不修改；请确认追加还是替换。';
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
      return `<div class="direction-entry is-applied" id="direction-explorer"><div><b>已加入讨论方向：</b><span>${escapeHtml(visible)}${suffix}</span></div><div class="direction-entry-actions"><button type="button" data-direction-open>调整</button><button type="button" data-direction-clear>清除</button></div></div>`;
    }
    return `<div class="direction-entry ${mode === 'empty' ? 'is-empty-keyword' : 'is-soft-link'}" id="direction-explorer"><div><b>${mode === 'empty' ? '方向不确定？' : '方向还想再看看？'}</b><span>先找 1-3 个可讨论方向，不替孩子定专业。</span></div><button type="button" data-direction-open>${mode === 'empty' ? '找几个方向' : '调整一下'}</button></div>`;
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
    const merge = mergePrompt ? `<div class="direction-merge-box"><b>当前已经有专业关键词</b><p>为了避免误覆盖，默认先不修改。你可以追加本次方向，也可以替换为本次方向。</p><div><button type="button" data-direction-merge-cancel>只查看不改</button><button type="button" class="direction-primary" data-direction-apply-mode="add">追加方向关键词</button><button type="button" data-direction-apply-mode="replace">替换为本次方向</button></div></div>` : '';
    const conflictList = (result.conflicts || []).slice(0, 4).map(x => `<li>${escapeHtml(x.message)}${x.action ? ` <b>${escapeHtml(x.action)}</b>` : ''}</li>`).join('');
    const familyList = (result.familyConstraints || []).slice(0, 4).map(x => `<li>${escapeHtml(x)}</li>`).join('');
    return `<section class="direction-result"><h3>方向讨论记录</h3><p>${escapeHtml(result.summary || '下面不是定向结论，只是方向讨论路标。')}</p><div class="direction-boundary-note">不是正式结论，也不替孩子定专业。请先勾选 1-3 个方向，再回到分数附近专业池验证。</div>
      <div class="direction-selection-note">已选择 <b>${selectedCount}</b> 个方向，最多 3 个。${selectedCount ? '应用后最多写入 9 个关键词。' : '还没有选择要应用到查询的方向。'}</div>
      <div class="direction-result-grid">
        ${resultGroup('可以先放进查询', '有接触或行为线索，且暂未发现明显冲突。', result.apply || [], 'apply')}
        ${resultGroup('建议先了解', '接触少或信号较弱，先看课程和真实专业。', result.learn || [], 'learn')}
        ${resultGroup('需要先确认', '兴趣、排斥或家庭诉求之间存在需要核验的点。', result.confirm || [], 'confirm')}
      </div>
      ${conflictList ? `<div class="direction-check-box"><b>需要先确认的矛盾点</b><ul>${conflictList}</ul></div>` : ''}
      ${familyList ? `<div class="direction-check-box is-family"><b>家庭约束提醒</b><ul>${familyList}</ul></div>` : ''}
      ${merge}</section>`;
  }
  function panelHtml() {
    const state = read(); const step = Math.max(0, Math.min(stepCount - 1, Number(state.uiStep || 0)));
    const hasResult = !!state.result;
    return `<div class="direction-panel-layer ${isOpen ? 'is-open' : ''}" ${isOpen ? '' : 'hidden'}><div class="direction-backdrop" data-direction-close></div><aside class="direction-panel" role="dialog" aria-modal="true" aria-label="孩子方向讨论助手"><div class="direction-panel-head"><div><h2>孩子方向讨论助手</h2><p>不做正式结论，不替孩子定专业；只帮家里找几个可讨论方向。</p></div><button type="button" class="direction-close" data-direction-close aria-label="收起孩子方向讨论助手">收起</button></div><div class="direction-panel-body"><div class="direction-principle">没接触过，不代表要排除；家庭诉求只作为约束，不直接变成孩子兴趣。</div>${questionHtml()}${resultHtml()}</div>${actionHint ? `<div class="direction-action-hint" role="status">${escapeHtml(actionHint)}</div>` : ''}<div class="direction-panel-actions">${step > 0 ? `<button type="button" data-direction-prev>上一步</button>` : ''}${step < stepCount - 1 ? `<button type="button" class="direction-primary" data-direction-next>下一步</button>` : (hasResult ? `<button type="button" class="direction-primary" data-direction-apply>应用到专业查询</button>` : `<button type="button" class="direction-primary" data-direction-generate>生成方向参考</button>`)}<button type="button" data-direction-reset>${hasResult ? '重新选择' : '清空选择'}</button><button type="button" data-direction-close>收起</button></div></aside></div>`;
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
    panelMount.querySelector('[data-direction-merge-cancel]')?.addEventListener('click', () => { mergePrompt = false; actionHint = '保持原有关键词不变。'; render(); });
    panelMount.querySelector('[data-direction-reset]')?.addEventListener('click', () => { const state = read(); saveDirectionExplorerState({ ...state, answers: {}, result: null, applied: state.applied || null, uiStep: 0 }); mergePrompt = false; actionHint = '已清空，可以重新选择。'; render(); });
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
