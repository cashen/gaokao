import { state } from '../../state/app-state.v3963_1.js?v=3963_1';
import {
  buildTongxueSchoolHref
} from '../../../../shared/resources/schools/school-resource-center.js?v=3990_2&r=r036-major-history-rank-lazy';
import { UI_ACTION_COPY } from '../../../../shared/ui/contracts/action-contract.v3970_0.js?v=3970_0-hc001';
import {
  createSelectionPoolAdapter,
  refreshSelectionPool
} from '../selection-pool/index.v3964_0.js?v=3964_0';
import { compactHistoryScoreText, renderCurrentScoreRank, renderThreeYearEvidenceDetail } from '../major-pool/history-score-render.v3967_0.js?v=3967_0';
import { scoreQueryValue } from '../../query/human-query-input-protocol.v001.js?v=3990_2';

const MODE_SCHOOL = 'school-all';
const API_PATH = '/api/school-majors';
const REQUIRED_STATIC_IDS = Object.freeze([
  'schoolAllResultsPanel',
  'schoolAllTitle',
  'schoolAllMeta',
  'schoolAllContent',
  'schoolAllSort',
  'schoolAllBack'
]);
const ACTION_COPY = Object.freeze({
  add: UI_ACTION_COPY.addSelectedMajor?.label || '加入已选',
  remove: UI_ACTION_COPY.removeSelectedMajor?.label || '移出已选',
  detail: UI_ACTION_COPY.inspectDetails?.label || '查看详情',
  collapse: UI_ACTION_COPY.inspectDetails?.expandedLabel || '收起详情',
  reviews: '大学生说学校',
  retry: UI_ACTION_COPY.retry?.label || '重新尝试'
});

const selectionPool = createSelectionPoolAdapter();
const recordMap = new Map();
let activeController = null;
let requestSequence = 0;
let expandedRecordKey = '';
let mounted = false;

const byId = id => document.getElementById(id);

function assertStaticStructure() {
  const missing = REQUIRED_STATIC_IDS.filter(id => !byId(id));
  if (missing.length) throw new Error(`school-all static structure missing: ${missing.join(', ')}`);
}

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

function liveFieldValue(id, fallback = '') {
  const field = byId(id);
  return String(field ? field.value : fallback == null ? '' : fallback).trim();
}

function currentSchoolInput() {
  return liveFieldValue('schoolKeyword', state.filters.schoolKeyword);
}

function currentMajorKeyword() {
  return liveFieldValue('majorKeyword', state.filters.majorKeyword);
}

function currentScore() {
  return scoreQueryValue(byId('candidateScore')?.value || '');
}

function emitSchoolState(reason) {
  document.dispatchEvent(new CustomEvent('gaokao:school-search-state', {
    detail: Object.freeze({
      reason,
      loading: Boolean(state.schoolAll.loading || state.schoolAll.loadingMore),
      dirty: Boolean(state.schoolAll.dirty),
      hasResult: Boolean(state.schoolAll.data),
      error: state.schoolAll.error || '',
      total: Number(state.schoolAll.data?.meta?.filteredTotal || 0)
    })
  }));
}

function positionText(record) {
  const rankGap = Number(record.rankGap2026 ?? record.rankGap);
  if (Number.isFinite(rankGap)) {
    if (rankGap > 0) return `历史位次靠前 ${fmt(rankGap)} 位`;
    if (rankGap < 0) return `历史位次靠后 ${fmt(Math.abs(rankGap))} 位`;
    return '与参考位次相同';
  }
  return '填写参考分数后对照2026位次';
}

function positionTone(record) {
  const key = String(record.bandKey || '');
  if (key === 'upper') return 'is-higher';
  if (key === 'near') return 'is-near';
  if (key === 'steady') return 'is-lower';
  return 'is-neutral';
}

function recordKey(record) {
  return String(record.id || [
    record.schoolCode2026,
    record.majorCode2026,
    record.school,
    record.major,
    record.score2026 ?? record.score
  ].filter(Boolean).join('|'));
}

function detailDomId(key) {
  let hash = 2166136261;
  for (const char of String(key)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `school-major-detail-${(hash >>> 0).toString(36)}`;
}

function historyLine(record) {
  return compactHistoryScoreText(record) || '2025、2024暂无严格同口径记录';
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
  const detailId = detailDomId(key);
  const expanded = expandedRecordKey === key;
  const selected = selectionPool.has(record);
  recordMap.set(key, record);
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
  const why = record.matchReason
    ? `<p class="school-major-detail-wide"><b>为什么出现</b><span>${escapeHtml(record.matchReason)}</span></p>`
    : '';
  const standardMajorCode = record.standardMajor?.code || record.codes?.standardMajorCode || '';
  const standardMajorName = record.standardMajor?.name || '';
  return `<article data-ui-component="school-results" class="ui-card school-major-row ${positionTone(record)} ${expanded ? 'is-expanded' : ''}" data-school-record="${escapeHtml(key)}" data-major-code="${escapeHtml(standardMajorCode)}" data-major-name="${escapeHtml(standardMajorName)}">
    <div class="school-major-main">
      <div class="school-major-title-line"><h3>${escapeHtml(record.major || '专业名称待核验')}</h3>${record.specialProject?.hasSpecialProject ? '<span class="ui-chip ui-chip--compact ui-chip--warning">特殊项目</span>' : ''}</div>
      <div class="school-major-tags">${tags.map(tag => `<span class="ui-chip ui-chip--compact">${escapeHtml(tag)}</span>`).join('')}</div>
    </div>
    <div class="school-major-score">${renderCurrentScoreRank(record)}</div>
    <div class="school-major-position"><b>${escapeHtml(positionText(record))}</b><span>${escapeHtml(record.statusLabel || record.position || '历史位次参考')}</span></div>
    <div class="school-major-actions">
      <button type="button" data-school-selection-action="${selected ? 'remove' : 'add'}" data-school-record-key="${escapeHtml(key)}" class="ui-button ui-button--compact ui-button--secondary ${selected ? 'is-selected' : ''}" aria-pressed="${selected}">${selected ? ACTION_COPY.remove : ACTION_COPY.add}</button>
      <button type="button" data-school-detail-toggle="${escapeHtml(key)}" class="ui-button ui-button--compact ui-button--tertiary" aria-expanded="${expanded}" aria-controls="${detailId}">${expanded ? ACTION_COPY.collapse : ACTION_COPY.detail}</button>
      ${tongxueHref ? `<a class="ui-button ui-button--compact ui-button--tertiary school-major-review-link" href="${escapeHtml(tongxueHref)}" aria-label="看看这所学校的大学生怎么说"><span class="school-major-review-link__brand">${ACTION_COPY.reviews}</span><small>看看这所学校的大学生怎么说</small><span aria-hidden="true">→</span></a>` : ''}
    </div>
    <section id="${detailId}" class="school-major-detail" data-school-detail-panel="${escapeHtml(key)}" ${expanded ? '' : 'hidden'}>
      <div class="school-major-detail-grid">
        ${renderThreeYearEvidenceDetail(record)}
        <p><b>项目与代码</b><span>${escapeHtml(record.projectLabel || '普通项目记录')}｜院校代码 ${escapeHtml(record.schoolCode2026 || '待核验')}｜专业代码 ${escapeHtml(record.majorCode2026 || '待核验')}</span></p>
        ${why}
        ${verify.length ? `<p class="school-major-detail-wide"><b>继续确认</b><span>${verify.map(escapeHtml).join(' / ')}</span></p>` : ''}
      </div>
    </section>
  </article>`;
}

function renderCandidateButtons(candidates = []) {
  return candidates.map(item => `<button class="ui-button ui-button--compact ui-button--secondary" type="button" data-school-candidate="${escapeHtml(item.school || item.officialName)}" data-school-entity-id="${escapeHtml(item.entityId || '')}" data-school-entity-type="${escapeHtml(item.entityType || '')}" data-school-parent-entity-id="${escapeHtml(item.parentEntityId || '')}"><span>${escapeHtml(item.school || item.officialName)}</span><small>${escapeHtml(item.city || item.province || item.matchReason || '')}</small><em>${fmt(item.count ?? item.recordCount2026)}条记录</em></button>`).join('');
}

function renderCandidates(payload) {
  const query = payload?.query || {};
  const interpretations = Array.isArray(query.interpretations) ? query.interpretations : [];
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const groups = interpretations.length
    ? interpretations.map(item => `<section class="school-candidate-group" data-school-query-intent="${escapeHtml(item.intent || '')}"><header><h3>${escapeHtml(item.label || '候选学校')}</h3><p>${escapeHtml(item.note || '')}｜共 ${fmt(item.total)} 所，当前全部列出可选学校。</p></header><div class="school-candidate-list">${renderCandidateButtons(item.candidates || [])}</div></section>`).join('')
    : (candidates.length ? `<section class="school-candidate-group"><header><h3>候选学校</h3><p>共 ${fmt(payload?.candidateTotal ?? candidates.length)} 所；记录数量只作说明，不决定名称匹配顺序。</p></header><div class="school-candidate-list">${renderCandidateButtons(candidates)}</div></section>` : '');
  const ambiguity = query.ambiguityType === 'region-or-school-name'
    ? '<p class="school-candidate-boundary">这个词既可能是城市，也可能只是校名的一部分。这里不会替你默认选择，请从下面确认准确学校。</p>'
    : '<p class="school-candidate-boundary">学校本部、分校和招生校区不能混在一起，请选择准确名称。</p>';
  byId('schoolAllContent').innerHTML = `<section class="ui-state ui-state--pending school-all-message"><b>${escapeHtml(payload?.message || '没有精确确认这所学校')}</b>${ambiguity}${groups || '<p>请检查学校名称，或切回按分数查看。</p>'}</section>`;
}

function renderLoading() {
  byId('schoolAllContent').innerHTML = '<div class="ui-state ui-state--loading school-all-message"><b>正在读取该校全部最低分记录…</b><p>会保留学校本部、分校、校区和特殊项目的原始区别。</p></div>';
}

function recordGroup(title, note, records, className = '') {
  if (!records.length) return '';
  return `<section class="school-record-group ${className}">
    <header class="school-record-group-head"><h3>${escapeHtml(title)}（${fmt(records.length)}）</h3><p>${escapeHtml(note)}</p></header>
    <div class="school-major-list">${records.map(renderRecord).join('')}</div>
  </section>`;
}

function renderSchoolData() {
  const data = state.schoolAll.data;
  const content = byId('schoolAllContent');
  const title = byId('schoolAllTitle');
  const meta = byId('schoolAllMeta');
  if (!data) {
    expandedRecordKey = '';
    title.textContent = state.schoolSelection?.displayName || currentSchoolInput() || '先输入一所学校';
    meta.textContent = '展示范围是辽宁2026普通类本科批物理类投档记录，不是学校全国全部本科专业。';
    content.innerHTML = '<div class="ui-state school-all-message"><b>准备查看学校全部最低分记录</b><p>先输入准确学校名称。参考分数可以不填；填写后会优先显示离2026历史位次更近的记录。</p></div>';
    return;
  }
  const records = Array.isArray(data.records) ? data.records : [];
  if (expandedRecordKey && !records.some(record => recordKey(record) === expandedRecordKey)) expandedRecordKey = '';
  const summary = data.summary || {};
  const total = Number(data.meta?.filteredTotal || records.length);
  const school = data.meta?.school || state.schoolSelection?.displayName || currentSchoolInput();
  const keyword = String(data.keywordQuery?.rawKeywords?.join(' / ') || '').trim();
  title.textContent = school;
  meta.textContent = `辽宁2026物理类专业名称约 ${fmt(summary.uniqueMajorCount)} 个｜最低分记录 ${fmt(total)} 条｜最低投档分 ${fmt(summary.minScore)}—${fmt(summary.maxScore)} 分${keyword ? `｜方向：${keyword}` : ''}`;
  recordMap.clear();
  const regular = records.filter(record => !record.specialProject?.hasSpecialProject);
  const special = records.filter(record => record.specialProject?.hasSpecialProject);
  const nearest = summary.nearestRecord;
  const nearestText = nearest
    ? `${nearest.major || '该记录'}｜约第 ${fmt(nearest.rank2026)} 位`
    : '未填写参考分数';
  const groupedRecords = regular.length || special.length
    ? `${recordGroup('普通项目最低分记录', '先和孩子讨论课程与专业方向，再核验校区、学费和培养方式。', regular)}
      ${recordGroup('需要单独核验的特殊项目', '资格、批次、服务年限、学费或培养方式可能不同，不能和普通记录直接混排。', special, 'is-special')}`
    : '<div class="ui-state ui-state--pending school-all-message"><b>当前条件下没有找到这所学校的辽宁最低分记录</b><p>这不一定代表学校没有招生，可能是 2026 年辽宁物理类没有对应投档记录，也可能是专业关键词或项目条件过窄。</p><p>可以减少专业关键词，或清空专业方向后再查看该校的辽宁记录。</p></div>';
  content.innerHTML = `<section class="ui-state school-all-boundary">${escapeHtml(data.meta?.dataBoundary || '')}</section>
    <section class="ui-card school-all-summary" aria-label="学校全部专业概览">
      <div><span>专业名称</span><b>${fmt(summary.uniqueMajorCount)}</b></div>
      <div><span>最低分记录</span><b>${fmt(total)}</b></div>
      <div><span>普通 / 特殊</span><b>${fmt(summary.regularCount)} / ${fmt(summary.specialCount)}</b></div>
      <div><span>${data.meta?.candidateScore ? `参考 ${fmt(data.meta.candidateScore)} 分附近` : '参考位次'}</span><b>${escapeHtml(nearestText)}</b></div>
    </section>
    <div class="school-record-groups">
      ${groupedRecords}
    </div>
    ${data.meta?.pagination?.hasMore ? '<button id="schoolAllLoadMore" class="ui-button ui-button--compact ui-button--secondary school-all-load-more" type="button">继续加载该校专业</button>' : '<p class="school-all-complete">该校符合当前专业关键词的最低分记录已全部加载完成。</p>'}`;
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

function buildResolveParams() {
  const params = new URLSearchParams({
    school: currentSchoolInput(),
    schoolIntent: 'school',
    resolveOnly: '1',
    candidateOffset: '0',
    candidateLimit: '200'
  });
  if (state.schoolSelection?.entityId) params.set('schoolEntityId', state.schoolSelection.entityId);
  return params;
}

function applyResolvedSchoolSelection(payload) {
  const meta = payload?.meta || {};
  const entity = meta.schoolEntity || {};
  if (!entity.entityId) return false;
  const displayName = String(meta.school || entity.displayName || currentSchoolInput()).trim();
  state.schoolSelection = {
    status: 'resolved',
    input: displayName,
    entityId: String(entity.entityId),
    displayName,
    entityType: String(entity.entityType || ''),
    parentEntityId: String(entity.parentEntityId || '')
  };
  const input = byId('schoolKeyword');
  if (input) input.value = displayName;
  state.filters.schoolKeyword = displayName;
  state.filters.schoolEntityId = state.schoolSelection.entityId;
  return true;
}

function renderSchoolResolveLoading() {
  byId('schoolAllContent').innerHTML = '<div class="ui-state ui-state--loading school-all-message"><b>正在确认学校名称…</b><p>确认本部、分校或校区后，才会读取这所学校的历史专业记录。</p><p>上一轮已确认的结果会保留；确认成功后再更新为新学校。</p></div>';
}

async function preflightSchoolSelection({ submit = true } = {}) {
  const school = currentSchoolInput();
  if (!school) {
    state.schoolAll.error = '请先输入一所学校。';
    emitSchoolState('school-required');
    byId('schoolKeyword')?.focus();
    return false;
  }
  requestSequence += 1;
  const requestId = requestSequence;
  activeController?.abort?.();
  activeController = new AbortController();
  state.schoolAll.loading = true;
  state.schoolAll.loadingMore = false;
  state.schoolAll.error = null;
  state.schoolAll.dirty = Boolean(state.schoolAll.data);
  renderSchoolResolveLoading();
  emitSchoolState('school-resolve-start');
  try {
    const response = await fetch(`${API_PATH}?${buildResolveParams().toString()}`, {
      signal: activeController.signal,
      headers: { accept: 'application/json' }
    });
    const payload = await response.json().catch(() => ({}));
    if (requestId !== requestSequence) return false;
    if (!response.ok || !payload?.ok) {
      if (['school_not_resolved', 'school_query_requires_choice'].includes(payload?.code)) {
        state.schoolSelection.status = 'unresolved';
        renderCandidates(payload);
        return false;
      }
      throw new Error(payload?.userMessage || payload?.message || `请求失败（${response.status}）`);
    }
    if (!applyResolvedSchoolSelection(payload)) {
      state.schoolSelection.status = 'unresolved';
      renderCandidates({
        ok: false,
        code: 'school_query_requires_choice',
        message: '请从候选中选择准确学校。',
        query: { status: 'not-found', candidates: [] },
        candidates: []
      });
      return false;
    }
    if (submit) {
      await fetchSchoolData();
    } else {
      renderSchoolData();
    }
    return true;
  } catch (error) {
    if (error?.name === 'AbortError' || requestId !== requestSequence) return false;
    state.schoolAll.error = error?.message || '学校名称暂时没有确认成功。';
    const preserved = state.schoolAll.data ? '<p>上一轮已确认的结果仍保留，本次没有覆盖它。</p>' : '';
    byId('schoolAllContent').innerHTML = `<div class="ui-state ui-state--error school-all-message"><b>这次没有确认成功</b><p>${escapeHtml(state.schoolAll.error)}</p>${preserved}<div class="ui-state-actions"><button class="ui-button ui-button--compact ui-button--secondary" type="button" data-school-retry>${ACTION_COPY.retry}</button></div></div>`;
    return false;
  } finally {
    if (requestId === requestSequence) {
      state.schoolAll.loading = false;
      state.schoolAll.loadingMore = false;
      emitSchoolState('school-resolve-finish');
    }
  }
}

function buildParams(offset = 0) {
  const selection = state.schoolSelection || {};
  const params = new URLSearchParams({
    school: selection.displayName || selection.input || currentSchoolInput(),
    majorKeyword: currentMajorKeyword(),
    sort: state.schoolAll.sort || (currentScore() ? 'position-near' : 'score-desc'),
    offset: String(offset),
    limit: String(state.schoolAll.limit || 40)
  });
  if (selection.entityId) params.set('schoolEntityId', selection.entityId);
  const score = currentScore();
  if (score) params.set('candidateScore', String(score));
  return params;
}

async function fetchSchoolData({ append = false } = {}) {
  if (!state.schoolSelection?.entityId) return preflightSchoolSelection({ submit: true });
  const school = currentSchoolInput();
  if (!school) {
    state.schoolAll.error = '请先输入一所学校。';
    emitSchoolState('school-required');
    byId('schoolKeyword')?.focus();
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
  emitSchoolState(append ? 'load-more-start' : 'query-start');
  try {
    const response = await fetch(`${API_PATH}?${buildParams(offset).toString()}`, {
      signal: activeController.signal,
      headers: { accept: 'application/json' }
    });
    const payload = await response.json().catch(() => ({}));
    if (requestId !== requestSequence) return;
    if (!response.ok || !payload?.ok) {
      if (['school_not_resolved', 'school_query_requires_choice'].includes(payload?.code)) {
              state.schoolAll.dirty = false;
        state.schoolSelection.status = 'unresolved';
        renderCandidates(payload);
        return;
      }
      throw new Error(payload?.userMessage || payload?.message || `请求失败（${response.status}）`);
    }
    applyResolvedSchoolSelection(payload);
    state.schoolSelection.status = 'resolved';
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
  } catch (error) {
    if (error?.name === 'AbortError' || requestId !== requestSequence) return;
    state.schoolAll.error = error?.message || '学校全部专业暂时没有读取成功。';
    byId('schoolAllContent').innerHTML = `<div class="ui-state ui-state--error school-all-message"><b>这次没有读取成功</b><p>${escapeHtml(state.schoolAll.error)}</p><div class="ui-state-actions"><button class="ui-button ui-button--compact ui-button--secondary" type="button" data-school-retry>${ACTION_COPY.retry}</button></div></div>`;
  } finally {
    if (requestId === requestSequence) {
      state.schoolAll.loading = false;
      state.schoolAll.loadingMore = false;
      emitSchoolState(append ? 'load-more-finish' : 'query-finish');
    }
  }
}

function toggleRecordDetail(button) {
  const key = String(button?.dataset.schoolDetailToggle || '');
  if (!key) return;
  const shouldOpen = button.getAttribute('aria-expanded') !== 'true';
  expandedRecordKey = shouldOpen ? key : '';
  document.querySelectorAll('[data-school-detail-toggle]').forEach(toggle => {
    const open = shouldOpen && toggle === button;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? ACTION_COPY.collapse : ACTION_COPY.detail;
    const panel = byId(toggle.getAttribute('aria-controls'));
    if (panel) panel.hidden = !open;
    toggle.closest('[data-school-record]')?.classList.toggle('is-expanded', open);
  });
}

function syncSelectionActions() {
  byId('schoolAllContent')?.querySelectorAll('[data-school-selection-action]').forEach(button => {
    const record = recordMap.get(button.dataset.schoolRecordKey || '');
    if (!record) return;
    const selected = selectionPool.has(record);
    button.dataset.schoolSelectionAction = selected ? 'remove' : 'add';
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? ACTION_COPY.remove : ACTION_COPY.add;
  });
}

function chooseCandidate(name, candidate = null) {
  const value = String(candidate?.officialName || name || '').trim();
  if (!value) return;
  const entityId = String(candidate?.entityId || '').trim();
  const input = byId('schoolKeyword');
  if (input) input.value = value;
  state.filters.schoolKeyword = value;
  state.filters.schoolEntityId = entityId;
  state.schoolSelection = {
    status: entityId ? 'resolved' : 'input',
    input: value,
    entityId,
    displayName: value,
    entityType: String(candidate?.entityType || ''),
    parentEntityId: String(candidate?.parentEntityId || '')
  };
  document.dispatchEvent(new CustomEvent('gaokao:school-candidate-selected', { detail: {
    school: value,
    entityId,
    entityType: state.schoolSelection.entityType,
    parentEntityId: state.schoolSelection.parentEntityId
  } }));
  preflightSchoolSelection({ submit: true });
}

function bindEvents() {
  byId('schoolAllContent')?.addEventListener('click', event => {
    const candidate = event.target.closest('[data-school-candidate]');
    if (candidate) {
      event.preventDefault();
      chooseCandidate(candidate.dataset.schoolCandidate, {
        officialName: candidate.dataset.schoolCandidate,
        entityId: candidate.dataset.schoolEntityId,
        entityType: candidate.dataset.schoolEntityType,
        parentEntityId: candidate.dataset.schoolParentEntityId
      });
      return;
    }
    const detailToggle = event.target.closest('[data-school-detail-toggle]');
    if (detailToggle) {
      event.preventDefault();
      toggleRecordDetail(detailToggle);
      return;
    }
    const action = event.target.closest('[data-school-selection-action]');
    if (action) {
      event.preventDefault();
      const record = recordMap.get(action.dataset.schoolRecordKey || '');
      if (!record) return;
      const result = action.dataset.schoolSelectionAction === 'remove'
        ? selectionPool.remove(recordKey(record))
        : selectionPool.add(record);
      if (result?.ok === false) {
        action.title = result.message || '暂时无法加入已选';
        return;
      }
      syncSelectionActions();
      refreshSelectionPool(state);
      return;
    }
    if (event.target.closest('#schoolAllLoadMore')) {
      event.preventDefault();
      fetchSchoolData({ append: true });
      return;
    }
    if (event.target.closest('[data-school-retry]')) {
      event.preventDefault();
      fetchSchoolData();
    }
  });

  byId('schoolAllSort')?.addEventListener('change', event => {
    const next = String(event.target.value || '');
    state.schoolAll.sort = ['position-near', 'score-asc', 'score-desc'].includes(next) ? next : 'position-near';
    state.schoolAll.dirty = Boolean(state.schoolAll.data);
    emitSchoolState('sort-changed');
    if (state.resultMode === MODE_SCHOOL && state.schoolAll.data) fetchSchoolData();
  });

  document.addEventListener('gaokao:school-search-needs-confirmation', () => {
    preflightSchoolSelection({ submit: true });
  });
  document.addEventListener('gaokao:school-search-submit', () => {
    if (!state.schoolSelection?.entityId) {
      preflightSchoolSelection({ submit: true });
      return;
    }
    fetchSchoolData();
  });
  document.addEventListener('gaokao:school-result-render', renderSchoolData);
  window.addEventListener('lnrank-selection-pool-updated', syncSelectionActions);
}

export function mountSchoolAllMode() {
  if (mounted) return globalThis.__GAOKAO_SCHOOL_ALL_MODE__;
  mounted = true;
  assertStaticStructure();
  bindEvents();
  renderSchoolData();
  globalThis.__GAOKAO_SCHOOL_ALL_MODE__ = Object.freeze({
    version: 'school-all-mode-v3969_2',
    mountPolicy: 'static-result-owner',
    sharedControlOwner: 'selection-workspace-orchestration-v3969_2',
    getState: () => ({
      resultMode: state.resultMode,
      schoolSelection: { ...state.schoolSelection },
      schoolAll: {
        loading: state.schoolAll.loading,
        loadingMore: state.schoolAll.loadingMore,
        dirty: state.schoolAll.dirty,
        expandedRecordKey,
        total: state.schoolAll.data?.meta?.filteredTotal || 0
      }
    }),
    submit: fetchSchoolData,
    render: renderSchoolData
  });
  if (state.resultMode === MODE_SCHOOL && currentSchoolInput()) fetchSchoolData();
  return globalThis.__GAOKAO_SCHOOL_ALL_MODE__;
}

let resolveSchoolModeReady;
let rejectSchoolModeReady;

export const schoolAllModeReady = new Promise((resolve, reject) => {
  resolveSchoolModeReady = resolve;
  rejectSchoolModeReady = reject;
});

function mountSchoolAllModeSafely() {
  try {
    resolveSchoolModeReady(mountSchoolAllMode());
  } catch (error) {
    mounted = false;
    rejectSchoolModeReady(error);
    throw error;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountSchoolAllModeSafely, { once: true });
} else {
  mountSchoolAllModeSafely();
}
