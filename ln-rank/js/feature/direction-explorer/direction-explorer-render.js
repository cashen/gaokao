import { QUESTION_SECTIONS } from './direction-explorer-data.js?v=3923';
import { buildDirectionExplorerResult } from './direction-explorer-engine.js?v=3923';
import { loadDirectionExplorerState, saveDirectionExplorerState, updateDirectionExplorerState, clearDirectionExplorerAll, clearDirectionExplorerApplied } from './direction-explorer-state.js?v=3923';

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function uniq(list = []) { return [...new Set(list.map(x => String(x || '').trim()).filter(Boolean))]; }
function splitWords(value = '') { return String(value || '').split(/[，,、/；;|\s]+/).map(x => x.trim()).filter(Boolean); }
function resultCard(title, desc, items = [], className = '') {
  const tags = items.length ? items.map(x => `<span>${escapeHtml(x.label || x)}</span>`).join('') : '<em>暂时没有明显方向</em>';
  return `<div class="direction-result-card ${className}"><b>${escapeHtml(title)}</b><p>${escapeHtml(desc)}</p><div class="direction-result-tags">${tags}</div></div>`;
}
function hasDifferentExisting(existing = '', keywords = []) {
  const current = splitWords(existing);
  if (!current.length) return false;
  const next = new Set(keywords);
  return current.some(x => !next.has(x));
}

export function initDirectionExplorer({ entryMount, panelMount, getMajorKeyword, setMajorKeyword, onApplied, onCleared } = {}) {
  if (!entryMount || !panelMount) return null;
  let isOpen = false;
  let mergePrompt = false;
  let lastMode = 'empty';
  const read = () => loadDirectionExplorerState();
  const write = (patch) => updateDirectionExplorerState(patch);
  const open = () => { isOpen = true; mergePrompt = false; render(); };
  const close = () => { isOpen = false; mergePrompt = false; render(); };
  const toggleAnswer = (questionKey, optionId) => {
    const state = read();
    const answers = { ...(state.answers || {}) };
    const list = new Set(Array.isArray(answers[questionKey]) ? answers[questionKey] : []);
    if (list.has(optionId)) list.delete(optionId); else list.add(optionId);
    answers[questionKey] = [...list];
    write({ answers });
    render();
  };
  const generate = () => {
    const state = read();
    const result = buildDirectionExplorerResult(state.answers || {});
    saveDirectionExplorerState({ ...state, result, applied: state.applied || null });
    mergePrompt = false;
    render();
  };
  const applyResult = (mode = null) => {
    const state = read();
    const result = state.result || buildDirectionExplorerResult(state.answers || {});
    const keywords = uniq(result.queryKeywords || []);
    if (!keywords.length) return;
    const existing = getMajorKeyword?.() || '';
    if (!mode && hasDifferentExisting(existing, keywords)) {
      mergePrompt = true;
      render();
      return;
    }
    const current = splitWords(existing);
    const currentSet = new Set(current);
    const nextWords = mode === 'replace' ? keywords : uniq(current.concat(keywords));
    const nextValue = nextWords.slice(0, 18).join('/');
    const addedKeywords = mode === 'replace' ? keywords : keywords.filter(word => !currentSet.has(word));
    const applied = { visibleDirections: result.visibleDirections || [], keywords, addedKeywords, value: nextValue, appliedAt: Date.now(), mode: mode || (existing ? 'add' : 'replace') };
    saveDirectionExplorerState({ ...state, result, applied });
    setMajorKeyword?.(nextValue, { source: 'direction-explorer', mode: mode || (existing ? 'add' : 'replace'), applied });
    isOpen = false;
    mergePrompt = false;
    onApplied?.(result, applied);
    render();
  };
  const clearApplied = () => {
    const before = read().applied;
    clearDirectionExplorerApplied();
    onCleared?.(before);
    render();
  };
  const clearAll = () => { clearDirectionExplorerAll(); mergePrompt = false; render(); };

  function entryHtml() {
    const state = read();
    const applied = state.applied;
    const existing = getMajorKeyword?.() || '';
    const mode = existing ? 'has-keyword' : 'empty';
    lastMode = mode;
    if (applied?.visibleDirections?.length) {
      return `<div class="direction-entry is-applied" id="direction-explorer">
        <div><b>已按方向小判断加入：</b><span>${escapeHtml(applied.visibleDirections.slice(0, 4).join(' / '))}</span></div>
        <div class="direction-entry-actions"><button type="button" data-direction-open>调整</button><button type="button" data-direction-clear>清除</button></div>
      </div>`;
    }
    const copy = mode === 'empty'
      ? '孩子方向还不确定？很多孩子不是不适合，只是还没接触过。'
      : '方向不确定？可以再找几个相近方向。';
    return `<div class="direction-entry ${mode === 'empty' ? 'is-empty-keyword' : 'is-soft-link'}" id="direction-explorer">
      <div><b>${mode === 'empty' ? '孩子方向还不确定？' : '方向还想再看看？'}</b><span>${escapeHtml(copy)}</span></div>
      <button type="button" data-direction-open>${mode === 'empty' ? '帮孩子找几个方向' : '调整一下'}</button>
    </div>`;
  }
  function questionHtml() {
    const state = read();
    const answers = state.answers || {};
    return QUESTION_SECTIONS.map(section => `<section class="direction-section"><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.desc || '')}</p>${(section.questions || []).map(q => {
      const selected = new Set(Array.isArray(answers[q.key]) ? answers[q.key] : []);
      return `<div class="direction-question"><h4>${escapeHtml(q.title)}</h4><div class="direction-chip-grid">${(q.options || []).map(opt => `<button type="button" class="direction-chip ${selected.has(opt.id) ? 'is-selected' : ''}" data-direction-answer="${escapeHtml(q.key)}" data-direction-option="${escapeHtml(opt.id)}">${escapeHtml(opt.label)}</button>`).join('')}</div></div>`;
    }).join('')}</section>`).join('');
  }
  function resultHtml() {
    const state = read();
    const result = state.result;
    if (!result) return '';
    const merge = mergePrompt ? `<div class="direction-merge-box"><b>当前已经有专业方向</b><p>可以把新方向加入一起查，也可以只用这次小判断的方向。</p><div><button type="button" class="direction-primary" data-direction-apply-mode="add">加入一起查</button><button type="button" data-direction-apply-mode="replace">只用新方向</button><button type="button" data-direction-merge-cancel>先不改</button></div></div>` : '';
    return `<section class="direction-result"><h3>方向参考</h3><p>${escapeHtml(result.summary || '先放到专业查询里看看，再结合分数附近真实专业讨论。')}</p>
      <div class="direction-result-grid">
        ${resultCard('更值得重点讨论', '可以优先放进专业查询里看看。', result.focus || [], 'is-focus')}
        ${resultCard('可以先了解', '接触不多的方向，不建议过早排除。', result.explore || [], 'is-explore')}
        ${resultCard('需要再确认', '不是直接排除，只是课程、场景或费用要提前看清楚。', result.confirm || [], 'is-confirm')}
      </div>${merge}</section>`;
  }
  function panelHtml() {
    const state = read();
    return `<div class="direction-panel-layer ${isOpen ? 'is-open' : ''}" ${isOpen ? '' : 'hidden'}>
      <div class="direction-backdrop" data-direction-close></div>
      <aside class="direction-panel" role="dialog" aria-modal="true" aria-label="孩子方向小判断">
        <div class="direction-panel-head"><div><h2>孩子方向小判断</h2><p>不是给孩子定专业，只是帮家里找几个值得讨论、可以先了解、需要再确认的方向。</p></div><button type="button" class="direction-close" data-direction-close aria-label="关闭">×</button></div>
        <div class="direction-panel-body">
          <div class="direction-principle">很多孩子不是不适合，只是还没接触过。这里不会因为“没感觉”就直接排除方向。</div>
          ${questionHtml()}
          ${resultHtml()}
        </div>
        <div class="direction-panel-actions">
          ${state.result ? `<button type="button" class="direction-primary" data-direction-apply>按这些方向查专业</button>` : `<button type="button" class="direction-primary" data-direction-generate>生成方向参考</button>`}
          <button type="button" data-direction-reset>${state.result ? '重新选择' : '清空选择'}</button>
          <button type="button" data-direction-close>先关闭</button>
        </div>
      </aside>
    </div>`;
  }
  function bindEntry() {
    entryMount.querySelectorAll('[data-direction-open]').forEach(btn => btn.addEventListener('click', open));
    entryMount.querySelectorAll('[data-direction-clear]').forEach(btn => btn.addEventListener('click', clearApplied));
  }
  function bindPanel() {
    panelMount.querySelectorAll('[data-direction-close]').forEach(btn => btn.addEventListener('click', close));
    panelMount.querySelectorAll('[data-direction-answer]').forEach(btn => btn.addEventListener('click', () => toggleAnswer(btn.dataset.directionAnswer, btn.dataset.directionOption)));
    panelMount.querySelector('[data-direction-generate]')?.addEventListener('click', generate);
    panelMount.querySelector('[data-direction-apply]')?.addEventListener('click', () => applyResult());
    panelMount.querySelectorAll('[data-direction-apply-mode]').forEach(btn => btn.addEventListener('click', () => applyResult(btn.dataset.directionApplyMode)));
    panelMount.querySelector('[data-direction-merge-cancel]')?.addEventListener('click', () => { mergePrompt = false; render(); });
    panelMount.querySelector('[data-direction-reset]')?.addEventListener('click', () => {
      const state = read();
      saveDirectionExplorerState({ ...state, answers: {}, result: null });
      mergePrompt = false;
      render();
    });
  }
  function render() {
    entryMount.innerHTML = entryHtml();
    panelMount.innerHTML = panelHtml();
    document.body.classList.toggle('direction-panel-open', isOpen);
    bindEntry();
    bindPanel();
  }
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isOpen) close(); });
  render();
  return { render, open, close, getMode: () => lastMode, clearApplied };
}
