import { state } from '../../state/app-state.js?v=3961_0';
import {
  resolveCompactSchoolResource,
  buildTongxueSchoolHref
} from '../../../../shared/resources/schools/school-resource-center.js?v=3961_0';
import {
  createSelectionPoolAdapter,
  refreshSelectionPool
} from '../selection-pool/index.v3961_0.js?v=3961_0';

const MODE_SCORE = 'score-bands';
const MODE_SCHOOL = 'school-all';
const API_PATH = '/api/school-majors';
const selectionPool = createSelectionPoolAdapter();
const recordMap = new Map();
let activeController = null;
let requestSequence = 0;
let mounted = false;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('zh-CN') : '—';
}

function currentSchoolInput() {
  return String(document.getElementById('schoolKeyword')?.value || '').trim();
}

function currentMajorKeyword() {
  return String(document.getElementById('majorKeyword')?.value || '').trim();
}

function currentScore() {
  const raw = String(document.getElementById('candidateScore')?.value || '').replace(/[^0-9.]/g, '');
  if (!raw) return null;
  const score = Math.round(Number(raw));
  return Number.isFinite(score) && score >= 1 && score <= 750 ? score : null;
}

function injectStylesheet() {
  if (document.querySelector('link[data-school-all-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/ln-rank/css/school-all-mode.v3962_0.css?v=3962_0';
  link.dataset.schoolAllStyle = 'v3962';
  document.head.appendChild(link);
}

function ensureModeMount() {
  let mount = document.getElementById('schoolViewModeMount');
  if (mount) return mount;
  const grid = document.querySelector('.search-grid-top');
  if (!grid) return null;
  mount = document.createElement('section');
  mount.id = 'schoolViewModeMount';
  mount.className = 'school-view-mode';
  mount.setAttribute('aria-label', '指定学校查看方式');
  mount.innerHTML = `
    <div class="school-view-mode__head">
      <div><b>指定学校以后，选择怎么看</b><span>分数附近用于初选；全部招生专业用于看清同一学校内部的专业结构。</span></div>
    </div>
    <div class="school-view-mode__buttons" role="group" aria-label="学校查看方式">
      <button type="button" data-school-view-mode="${MODE_SCORE}" class="is-active" aria-pressed="true">按我的分数附近看</button>
      <button type="button" data-school-view-mode="${MODE_SCHOOL}" aria-pressed="false">看该校全部招生专业</button>
    </div>
    <p id="schoolResolveStatus" class="school-resolve-status">输入学校后，可查看该校在辽宁2026物理类投档表中的全部招生记录。</p>`;
  grid.insertAdjacentElement('afterend', mount);
  return mount;
}

function ensureWorkspace() {
  let panel = document.getElementById('schoolAllResultsPanel');
  if (panel) return panel;
  const scorePanel = document.getElementById('resultsPanel');
  if (!scorePanel) return null;
  panel = document.createElement('section');
  panel.id = 'schoolAllResultsPanel';
  panel.className = 'panel school-all-results-shell';
  panel.hidden = true;
  panel.innerHTML = `
    <header class="school-all-results-head">
      <div>
        <p class="school-all-kicker">指定学校 · 全部招生专业</p>
        <h2 id="schoolAllTitle">先输入一所学校</h2>
        <p id="schoolAllMeta">展示范围是辽宁2026普通类本科批物理类投档记录，不是学校全国全部本科专业。</p>
      </div>
      <div class="school-all-head-actions">
        <label>排序
          <select id="schoolAllSort">
            <option value="score-desc">投档位置从高到低</option>
            <option value="score-asc">投档位置从低到高</option>
          </select>
        </label>
        <button id="schoolAllBack" type="button">只看我的分数附近</button>
      </div>
    </header>
    <div id="schoolAllContent" class="school-all-content" aria-live="polite"></div>`;
  scorePanel.insertAdjacentElement('afterend', panel);
  return panel;
}

function resolveSchoolSelection() {
  const input = currentSchoolInput();
  const resolved = resolveCompactSchoolResource(input);
  state.schoolSelection = {
    status: input ? 'resolved' : 'empty',
    input,
    entityId: resolved?.entityId || '',
    displayName: resolved?.school || input,
    entityType: resolved?.entityType || '',
    parentEntityId: ''
  };
  return state.schoolSelection;
}

function updateUrl() {
  const url = new URL(location.href);
  if (state.resultMode === MODE_SCHOOL) {
    url.searchParams.set('mode', MODE_SCHOOL);
    const school = state.schoolSelection?.displayName || currentSchoolInput();
    if (school) url.searchParams.set('school', school);
    else url.searchParams.delete('school');
    if (state.schoolSelection?.entityId) url.searchParams.set('schoolEntity', state.schoolSelection.entityId);
    else url.searchParams.delete('schoolEntity');
    const score = currentScore();
    if (score) url.searchParams.set('score', String(score));
    else url.searchParams.delete('score');
  } else {
    url.searchParams.delete('mode');
    url.searchParams.delete('schoolEntity');
    url.searchParams.delete('school');
  }
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

function positionText(record) {
  const delta = Number(record.scoreDelta2026 ?? record.scoreDelta);
  if (!Number.isFinite(delta)) return '输入参考分数后，可查看历史位置关系';
  if (delta > 0) return `比参考分数高 ${fmt(delta)} 分`;
  if (delta < 0) return `比参考分数低 ${fmt(Math.abs(delta))} 分`;
  return '与参考分数相同';
}

function positionTone(record) {
  const delta = Number(record.scoreDelta2026 ?? record.scoreDelta);
  if (!Number.isFinite(delta)) return 'is-neutral';
  if (delta > 0) return 'is-higher';
  if (delta < 0) return 'is-lower';
  return 'is-near';
}

function recordKey(record) {
  return String(record.id || [record.schoolCode2026, record.majorCode2026, record.school, record.major].filter(Boolean).join('|'));
}

function historyLine(record) {
  const parts = [];
  if (Number.isFinite(Number(record.score2025))) parts.push(`2025：${fmt(record.score2025)}分`);
  if (Number.isFinite(Number(record.score2024))) parts.push(`2024：${fmt(record.score2024)}分`);
  return parts.length ? parts.join('｜') : '2025、2024暂无严格同口径记录';
}

function reviewPoints(record) {
  const rows = [];
  if (Array.isArray(record.specialProject?.reviewPoints)) rows.push(...record.specialProject.reviewPoints);
  if (Array.isArray(record.reviewPoints)) rows.push(...record.reviewPoints);
  if (/类|试验班|实验班|大类/.test(String(record.major || ''))) rows.push('大类分流与可选专业');
  if (record.displayLocation || record.geoEntity) rows.push('培养校区与办学地点');
  if (record.isSinoForeign || record.isHighFee) rows.push('学费、培养方式与证书说明');
  return [...new Set(rows.filter(Boolean))].slice(0, 4);
}

function renderRecord(record) {
  const key = recordKey(record);
  recordMap.set(key, record);
  const selected = selectionPool.has(record);
  const tags = [
    ...(Array.isArray(record.schoolTierTags) ? record.schoolTierTags : []),
    record.natureLabel,
    record.displayLocation,
    record.projectLabel
  ].filter(Boolean).slice(0, 5);
  const verify = reviewPoints(record);
  const tongxueHref = buildTongxueSchoolHref({
    school: record.school,
    entityId: record.schoolEntity?.entityId || state.schoolSelection?.entityId || ''
  });
  return `
    <article class="school-major-row ${positionTone(record)}" data-school-record="${escapeHtml(key)}">
      <div class="school-major-main">
        <div class="school-major-title-line">
          <h3>${escapeHtml(record.major || '专业名称待核验')}</h3>
          ${record.specialProject?.hasSpecialProject ? '<span class="school-major-special">特殊项目</span>' : ''}
        </div>
        <div class="school-major-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="school-major-mobile-facts">
          <b>2026最低投档 ${fmt(record.score2026 ?? record.score)}分</b>
          <span>约第 ${fmt(record.rank2026 ?? record.rank)} 位</span>
        </div>
      </div>
      <div class="school-major-score">
        <b>${fmt(record.score2026 ?? record.score)}分</b>
        <span>约第 ${fmt(record.rank2026 ?? record.rank)} 位</span>
      </div>
      <div class="school-major-position">
        <b>${escapeHtml(positionText(record))}</b>
        <span>${escapeHtml(record.statusLabel || record.position || '历史位置参考')}</span>
      </div>
      <div class="school-major-actions">
        <button type="button" data-school-selection-action="${selected ? 'remove' : 'add'}" data-school-record-key="${escapeHtml(key)}" class="${selected ? 'is-selected' : ''}">${selected ? '已加入，点击移除' : '加入已选专业'}</button>
        <details>
          <summary>查看详情</summary>
          <div class="school-major-detail">
            <p><b>历史对照：</b>${escapeHtml(historyLine(record))}</p>
            <p><b>项目与代码：</b>${escapeHtml(record.projectLabel || '普通招生记录')}｜院校代码 ${escapeHtml(record.schoolCode2026 || '待核验')}｜专业代码 ${escapeHtml(record.majorCode2026 || '待核验')}</p>
            ${verify.length ? `<p><b>继续确认：</b>${verify.map(escapeHtml).join(' / ')}</p>` : ''}
            ${tongxueHref ? `<a href="${escapeHtml(tongxueHref)}">查看该校公开评论摘要</a>` : ''}
          </div>
        </details>
      </div>
    </article>`;
}

function renderCandidates(payload) {
  const content = document.getElementById('schoolAllContent');
  if (!content) return;
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  content.innerHTML = `
    <section class="school-all-message is-warning">
      <b>${escapeHtml(payload?.message || '没有精确找到这所学校')}</b>
      <p>学校本部、分校和招生校区不能混在一起，请选择准确名称。</p>
      ${candidates.length ? `<div class="school-candidate-list">${candidates.map(item => `<button type="button" data-school-candidate="${escapeHtml(item.school)}"><span>${escapeHtml(item.school)}</span><em>${fmt(item.count)}条记录</em></button>`).join('')}</div>` : '<p>请检查学校名称，或先切回分数附近模式。</p>'}
    </section>`;
}

function renderLoading() {
  const content = document.getElementById('schoolAllContent');
  if (content) content.innerHTML = '<div class="school-all-message"><b>正在读取该校全部招生专业…</b><p>会保留学校本部、分校、校区和特殊项目的原始区别。</p></div>';
}

function renderSchoolData() {
  const panel = ensureWorkspace();
  const data = state.schoolAll.data;
  const content = document.getElementById('schoolAllContent');
  const title = document.getElementById('schoolAllTitle');
  const meta = document.getElementById('schoolAllMeta');
  if (!panel || !content) return;
  if (!data) {
    title.textContent = state.schoolSelection?.displayName || '先输入一所学校';
    meta.textContent = '展示范围是辽宁2026普通类本科批物理类投档记录，不是学校全国全部本科专业。';
    content.innerHTML = '<div class="school-all-message"><b>准备查看学校全部招生专业</b><p>输入并确认学校后，点击上方按钮。参考分数可以不填。</p></div>';
    return;
  }

  const records = Array.isArray(data.records) ? data.records : [];
  const summary = data.summary || {};
  const total = Number(data.meta?.filteredTotal || records.length);
  const school = data.meta?.school || state.schoolSelection?.displayName || currentSchoolInput();
  title.textContent = school;
  meta.textContent = `辽宁2026物理类招生记录 ${fmt(total)} 条｜最低投档分范围 ${fmt(summary.minScore)}—${fmt(summary.maxScore)} 分`;
  recordMap.clear();
  content.innerHTML = `
    <section class="school-all-boundary">${escapeHtml(data.meta?.dataBoundary || '')}</section>
    <section class="school-all-summary" aria-label="学校全部专业概览">
      <div><span>全部记录</span><b>${fmt(total)}</b></div>
      <div><span>普通记录</span><b>${fmt(summary.regularCount)}</b></div>
      <div><span>特殊项目</span><b>${fmt(summary.specialCount)}</b></div>
      <div><span>${data.meta?.candidateScore ? `参考分数 ${fmt(data.meta.candidateScore)}` : '参考分数'}</span><b>${data.meta?.candidateScore ? `${fmt(summary.nearCount)} 条接近` : '未填写'}</b></div>
    </section>
    <div class="school-major-list">${records.map(renderRecord).join('')}</div>
    ${data.meta?.pagination?.hasMore ? '<button id="schoolAllLoadMore" class="school-all-load-more" type="button">继续加载该校专业</button>' : '<p class="school-all-complete">该校符合当前专业关键词的记录已全部加载完成。</p>'}`;
}

function mergeRecords(previous, incoming) {
  const seen = new Set();
  return [...(previous || []), ...(incoming || [])].filter(record => {
    const key = recordKey(record);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildParams(offset = 0) {
  const school = resolveSchoolSelection();
  const params = new URLSearchParams({
    school: school.displayName || school.input,
    majorKeyword: currentMajorKeyword(),
    sort: state.schoolAll.sort || 'score-desc',
    offset: String(offset),
    limit: String(state.schoolAll.limit || 40)
  });
  if (school.entityId) params.set('schoolEntityId', school.entityId);
  const score = currentScore();
  if (score) params.set('candidateScore', String(score));
  return params;
}

async function fetchSchoolData({ append = false } = {}) {
  const school = currentSchoolInput();
  if (!school) {
    state.schoolAll.error = '请先输入一所学校。';
    syncModeUi();
    document.getElementById('schoolKeyword')?.focus();
    return;
  }

  const previous = state.schoolAll.data;
  const offset = append ? Number(previous?.meta?.pagination?.nextOffset || 0) : 0;
  requestSequence += 1;
  const requestId = requestSequence;
  activeController?.abort?.();
  activeController = new AbortController();
  state.schoolAll.loading = !append;
  state.schoolAll.loadingMore = append;
  state.schoolAll.error = null;
  if (!append) renderLoading();
  syncModeUi();

  try {
    const response = await fetch(`${API_PATH}?${buildParams(offset).toString()}`, {
      signal: activeController.signal,
      headers: { accept: 'application/json' }
    });
    const payload = await response.json().catch(() => ({}));
    if (requestId !== requestSequence) return;
    if (!response.ok || !payload?.ok) {
      if (payload?.code === 'school_not_resolved') {
        state.schoolAll.data = null;
        renderCandidates(payload);
        return;
      }
      throw new Error(payload?.userMessage || payload?.message || `请求失败（${response.status}）`);
    }
    state.schoolSelection.status = 'resolved';
    state.schoolSelection.displayName = payload.meta?.school || state.schoolSelection.displayName;
    state.schoolSelection.entityId = payload.meta?.schoolEntity?.entityId || state.schoolSelection.entityId;
    state.schoolAll.data = append
      ? {
          ...payload,
          records: mergeRecords(previous?.records, payload.records),
          meta: { ...payload.meta, filteredTotal: payload.meta?.filteredTotal ?? previous?.meta?.filteredTotal }
        }
      : payload;
    state.schoolAll.offset = Number(state.schoolAll.data?.records?.length || 0);
    state.schoolAll.dirty = false;
    renderSchoolData();
    refreshSelectionPool(state);
    updateUrl();
  } catch (error) {
    if (error?.name === 'AbortError' || requestId !== requestSequence) return;
    state.schoolAll.error = error?.message || '学校全部专业暂时没有读取成功。';
    const content = document.getElementById('schoolAllContent');
    if (content) content.innerHTML = `<div class="school-all-message is-error"><b>这次没有读取成功</b><p>${escapeHtml(state.schoolAll.error)}</p><button type="button" data-school-retry>重新尝试</button></div>`;
  } finally {
    if (requestId === requestSequence) {
      state.schoolAll.loading = false;
      state.schoolAll.loadingMore = false;
      syncModeUi();
    }
  }
}

function setMode(mode, { updateHistory = true } = {}) {
  state.resultMode = mode === MODE_SCHOOL ? MODE_SCHOOL : MODE_SCORE;
  if (state.resultMode === MODE_SCHOOL) resolveSchoolSelection();
  syncModeUi();
  if (updateHistory) updateUrl();
}

function syncModeUi() {
  const schoolMode = state.resultMode === MODE_SCHOOL;
  document.body.dataset.resultMode = state.resultMode;
  ensureWorkspace().hidden = !schoolMode;
  document.querySelectorAll('[data-school-view-mode]').forEach(button => {
    const active = button.dataset.schoolViewMode === state.resultMode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const selection = resolveSchoolSelection();
  const status = document.getElementById('schoolResolveStatus');
  if (status) {
    status.textContent = selection.input
      ? `当前学校：${selection.displayName}${selection.entityId ? '（已按学校实体区分）' : ''}`
      : '输入学校后，可查看该校在辽宁2026物理类投档表中的全部招生记录。';
  }

  if (!schoolMode) return;
  const button = document.getElementById('queryButton');
  const guide = document.getElementById('queryGuide');
  const label = selection.displayName || selection.input || '该校';
  if (button) {
    button.disabled = Boolean(state.schoolAll.loading || !selection.input);
    button.textContent = state.schoolAll.loading
      ? '正在读取全部招生专业…'
      : state.schoolAll.data && state.schoolAll.dirty
        ? '按新条件更新学校专业'
        : `查看${label}全部招生专业`;
    button.className = `query-button ${button.disabled ? 'is-waiting' : 'is-ready is-primary'}`;
  }
  if (guide) {
    guide.textContent = selection.input
      ? '参考分数可以不填；填写后只增加历史位置关系，不会减少该校专业数量。'
      : '请先输入学校，例如东北大学。';
  }
  const dirtyBar = document.getElementById('mobileDirtyBar');
  if (dirtyBar) {
    const show = Boolean(state.schoolAll.data && state.schoolAll.dirty && !state.schoolAll.loading);
    dirtyBar.hidden = !show;
    dirtyBar.classList.toggle('is-visible', show);
    const text = dirtyBar.querySelector('.mobile-dirty-text');
    const action = dirtyBar.querySelector('button');
    if (text) text.textContent = '学校查看条件已变化';
    if (action) action.textContent = '更新学校专业';
  }
}

function markSchoolDirty() {
  if (state.resultMode !== MODE_SCHOOL) return;
  state.schoolAll.dirty = Boolean(state.schoolAll.data);
  syncModeUi();
  updateUrl();
}

function bindEvents() {
  document.addEventListener('click', event => {
    const modeButton = event.target.closest('[data-school-view-mode]');
    if (modeButton) {
      event.preventDefault();
      setMode(modeButton.dataset.schoolViewMode);
      if (state.resultMode === MODE_SCHOOL) renderSchoolData();
      return;
    }

    if (state.resultMode !== MODE_SCHOOL) return;
    const queryButton = event.target.closest('#queryButton, #mobileDirtyButton');
    if (queryButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      fetchSchoolData();
      return;
    }
    const back = event.target.closest('#schoolAllBack');
    if (back) {
      event.preventDefault();
      setMode(MODE_SCORE);
      return;
    }
    const candidate = event.target.closest('[data-school-candidate]');
    if (candidate) {
      const input = document.getElementById('schoolKeyword');
      if (input) input.value = candidate.dataset.schoolCandidate || '';
      state.filters.schoolKeyword = input?.value || '';
      resolveSchoolSelection();
      fetchSchoolData();
      return;
    }
    const action = event.target.closest('[data-school-selection-action]');
    if (action) {
      const record = recordMap.get(action.dataset.schoolRecordKey || '');
      if (!record) return;
      const result = action.dataset.schoolSelectionAction === 'remove'
        ? selectionPool.remove(recordKey(record))
        : selectionPool.add(record);
      if (result?.ok === false) {
        action.title = result.message || '暂时无法加入已选专业';
        return;
      }
      renderSchoolData();
      refreshSelectionPool(state);
      return;
    }
    if (event.target.closest('#schoolAllLoadMore')) {
      fetchSchoolData({ append: true });
      return;
    }
    if (event.target.closest('[data-school-retry]')) fetchSchoolData();
  }, true);

  document.addEventListener('keydown', event => {
    if (state.resultMode !== MODE_SCHOOL || event.key !== 'Enter') return;
    if (!event.target.closest('#candidateScore, #schoolKeyword, #majorKeyword')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    fetchSchoolData();
  }, true);

  document.getElementById('schoolKeyword')?.addEventListener('input', () => {
    resolveSchoolSelection();
    markSchoolDirty();
  });
  document.getElementById('majorKeyword')?.addEventListener('input', markSchoolDirty);
  document.getElementById('candidateScore')?.addEventListener('input', markSchoolDirty);
  document.getElementById('schoolAllSort')?.addEventListener('change', event => {
    state.schoolAll.sort = event.target.value === 'score-asc' ? 'score-asc' : 'score-desc';
    if (state.resultMode === MODE_SCHOOL && state.schoolAll.data) fetchSchoolData();
  });
  window.addEventListener('lnrank-selection-pool-updated', () => {
    if (state.resultMode === MODE_SCHOOL && state.schoolAll.data) renderSchoolData();
  });
  document.addEventListener('gaokao:workspace-state', syncModeUi);
}

function restoreFromUrl() {
  const params = new URLSearchParams(location.search);
  const school = params.get('school') || '';
  const score = params.get('score') || '';
  if (school) {
    const input = document.getElementById('schoolKeyword');
    if (input) input.value = school;
    state.filters.schoolKeyword = school;
  }
  if (score && !document.getElementById('candidateScore')?.value) {
    const input = document.getElementById('candidateScore');
    if (input) input.value = score;
  }
  resolveSchoolSelection();
  if (params.get('mode') === MODE_SCHOOL && school) {
    setMode(MODE_SCHOOL, { updateHistory: false });
    fetchSchoolData();
  }
}

export function mountSchoolAllMode() {
  if (mounted) return;
  mounted = true;
  injectStylesheet();
  ensureModeMount();
  ensureWorkspace();
  bindEvents();
  restoreFromUrl();
  syncModeUi();
  globalThis.__GAOKAO_SCHOOL_ALL_MODE__ = Object.freeze({
    version: 'school-all-mode-v3962',
    getState: () => ({
      resultMode: state.resultMode,
      schoolSelection: { ...state.schoolSelection },
      schoolAll: {
        loading: state.schoolAll.loading,
        loadingMore: state.schoolAll.loadingMore,
        dirty: state.schoolAll.dirty,
        total: state.schoolAll.data?.meta?.filteredTotal || 0
      }
    }),
    setMode,
    submit: fetchSchoolData
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountSchoolAllMode, { once: true });
} else {
  mountSchoolAllMode();
}
