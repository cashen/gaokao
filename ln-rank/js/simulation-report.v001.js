import { MAJOR_CATALOG_2026 } from '../kb/major-understanding/major-catalog-2026.generated.js';
import { createMajorCatalogResolver } from '../../shared/resources/majors/major-catalog-contract.js';
import { loadSchoolNameResolver } from '../../tongxue/data/school-name-resolver-v150.js';

const STORAGE_KEY = 'gaokao:simulation-report:v002';
const LEGACY_STORAGE_KEY = 'gaokao:simulation-report:v001';
const API_BASE = '/api/ai/major-history';
const RANK_API = '/api/simulation-rank';
const resolver = createMajorCatalogResolver(MAJOR_CATALOG_2026);
const MANUAL_CHECK_KEYS = [
  'institutionCode', 'groupCode', 'campus', 'studyLocation', 'tuition',
  'accommodationFee', 'planCount', 'studyLength', 'trainingMode',
  'subjectRequirement', 'remark'
];
let schoolResolverPromise = null;
let state = loadState();
let candidateRankRequest = 0;
let expandedRows = new Set();

const $ = selector => document.querySelector(selector);
const rowsEl = $('#volunteerRows');
const statusEl = $('#pageStatus');
const rankEl = $('#candidateRank');
const rankSourceEl = $('#candidateRankSource');
const scoreEl = $('#totalScore');
const nameEl = $('#studentName');
const subjectEl = $('#subjectTrack');
const printDateEl = $('#printDate');
const addBtn = $('#addVolunteer');
const printBtn = $('#printSheet');
const resetBtn = $('#resetSheet');

function emptyManualCheck() {
  return Object.fromEntries(MANUAL_CHECK_KEYS.map(key => [key, '']));
}

function createVolunteer(order) {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    order,
    school: '',
    majorCode: '',
    majorName: '',
    history: null,
    loading: false,
    error: '',
    manualCheck: emptyManualCheck(),
    familyDecision: '',
    familyStatus: '',
    familyNote: ''
  };
}

function defaultState() {
  return {
    version: 2,
    studentName: '',
    subjectTrack: '辽宁物理类（物化生）',
    totalScore: '',
    scores: { chinese: '', math: '', english: '', physics: '', chemistry: '', biology: '' },
    rank: null,
    volunteers: [createVolunteer(1)]
  };
}

function normalizeVolunteer(row, index) {
  const fresh = createVolunteer(index + 1);
  return {
    ...fresh,
    ...row,
    order: index + 1,
    manualCheck: { ...emptyManualCheck(), ...(row?.manualCheck || {}) },
    familyDecision: typeof row?.familyDecision === 'string' ? row.familyDecision : '',
    familyStatus: typeof row?.familyStatus === 'string' ? row.familyStatus : '',
    familyNote: typeof row?.familyNote === 'string' ? row.familyNote : ''
  };
}

function readStored(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function loadState() {
  const parsed = readStored(STORAGE_KEY) || readStored(LEGACY_STORAGE_KEY);
  if (!parsed || !Array.isArray(parsed.volunteers)) return defaultState();
  return {
    ...defaultState(),
    ...parsed,
    version: 2,
    scores: { ...defaultState().scores, ...(parsed.scores || {}) },
    volunteers: parsed.volunteers.length ? parsed.volunteers.map(normalizeVolunteer) : [createVolunteer(1)]
  };
}

function saveState() {
  const serializable = {
    ...state,
    version: 2,
    volunteers: state.volunteers.map(row => ({
      id: row.id,
      order: row.order,
      school: row.school,
      majorCode: row.majorCode,
      majorName: row.majorName,
      history: row.history,
      manualCheck: { ...emptyManualCheck(), ...(row.manualCheck || {}) },
      familyDecision: row.familyDecision || '',
      familyStatus: row.familyStatus || '',
      familyNote: row.familyNote || ''
    }))
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

function esc(value) {
  return String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function normalizeScore(value) {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) && n >= 0 && n <= 750 ? Math.round(n) : null;
}

function formatRank(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n.toLocaleString('zh-CN') : '—';
}

function formatDelta(yearRank, candidateRank) {
  const historic = Number(yearRank), current = Number(candidateRank);
  if (!Number.isFinite(historic) || !Number.isFinite(current) || current <= 0) return '—';
  const delta = historic - current;
  if (delta === 0) return '同位次';
  return `${delta > 0 ? '+' : ''}${delta.toLocaleString('zh-CN')}名`;
}

function historyCell(year, history) {
  const row = history?.years?.[year];
  if (!row || (row.score == null && row.rank == null)) return '<span class="muted">无严格记录</span>';
  const score = row.score == null ? '—' : `${row.score}分`;
  const rank = row.rank == null ? '—' : `${formatRank(row.rank)}位`;
  const stateLabel = row.comparable === false && row.recordStatus !== 'primary-record' ? '需核验' : '';
  return `<span class="history-main">${esc(score)}</span><span class="history-sub">${esc(rank)}${stateLabel ? ` · ${esc(stateLabel)}` : ''}</span>`;
}

function resolveMajor(codeOrName) {
  const value = String(codeOrName || '').trim();
  if (!value) return null;
  return resolver.resolve(value, { allowContains: false });
}

function majorSuggestions(query) {
  const value = String(query || '').trim();
  if (!value) return [];
  return resolver.search(value, { limit: 6 }).map(item => item.item);
}

async function getSchoolResolver() {
  if (!schoolResolverPromise) {
    schoolResolverPromise = loadSchoolNameResolver().catch(error => {
      schoolResolverPromise = null;
      throw error;
    });
  }
  return schoolResolverPromise;
}

function updateMeta() {
  nameEl.value = state.studentName || '';
  subjectEl.value = state.subjectTrack || '辽宁物理类（物化生）';
  scoreEl.value = state.totalScore || '';
  Object.entries(state.scores).forEach(([key, value]) => {
    const input = document.querySelector(`[data-score-key="${key}"]`);
    if (input) input.value = value || '';
  });
  rankEl.textContent = formatRank(state.rank);
  rankSourceEl.textContent = state.rank ? '2026辽宁物理类官方成绩统计口径' : '输入总分后自动换算';
  printDateEl.textContent = new Date().toLocaleDateString('zh-CN');
}

function renderManualField(key, label, row, wide = false) {
  const value = row.manualCheck?.[key] || '';
  const multiline = key === 'remark';
  const control = multiline
    ? `<textarea class="manual-input manual-textarea" data-field="manualCheck.${esc(key)}" data-row-id="${esc(row.id)}" rows="2" aria-label="${esc(label || '专业备注/特殊限制')}">${esc(value)}</textarea>`
    : `<input class="manual-input" type="text" value="${esc(value)}" data-field="manualCheck.${esc(key)}" data-row-id="${esc(row.id)}" aria-label="${esc(label)}" />`;
  return `<div class="manual-field ${wide ? 'manual-field-wide' : ''}"><span>${esc(label)}</span>${control}</div>`;
}

function renderManualPanel(row) {
  const open = expandedRows.has(row.id);
  const panelId = `manual-panel-${row.id}`;
  return `<div class="manual-wrap">
    <button type="button" class="manual-toggle" data-action="toggle-manual" data-row-id="${esc(row.id)}" aria-expanded="${open}" aria-controls="${esc(panelId)}">${open ? '收起报考信息' : '报考信息'}</button>
    <div id="${esc(panelId)}" class="manual-panel" ${open ? '' : 'hidden'}>
      <div class="manual-grid">
        ${renderManualField('institutionCode', '院校代码', row)}
        ${renderManualField('groupCode', '专业组/招生代码', row)}
        ${renderManualField('campus', '校区', row)}
        ${renderManualField('studyLocation', '实际培养地点', row)}
        ${renderManualField('tuition', '学费', row)}
        ${renderManualField('accommodationFee', '住宿费', row)}
        ${renderManualField('planCount', '2026招生计划', row)}
        ${renderManualField('studyLength', '学制', row)}
        ${renderManualField('trainingMode', '培养方式', row)}
        ${renderManualField('subjectRequirement', '选科要求', row)}
        ${renderManualField('remark', '专业备注/特殊限制', row, true)}
      </div>
      <div class="family-grid">
        <div class="manual-field"><span>家庭判断</span><select class="manual-input" data-field="familyDecision" data-row-id="${esc(row.id)}" aria-label="家庭判断"><option value="">未填写</option><option value="冲" ${row.familyDecision === '冲' ? 'selected' : ''}>冲</option><option value="稳" ${row.familyDecision === '稳' ? 'selected' : ''}>稳</option><option value="保" ${row.familyDecision === '保' ? 'selected' : ''}>保</option></select></div>
        <div class="manual-field"><span>处理</span><select class="manual-input" data-field="familyStatus" data-row-id="${esc(row.id)}" aria-label="志愿处理"><option value="">未填写</option><option value="保留" ${row.familyStatus === '保留' ? 'selected' : ''}>保留</option><option value="备选" ${row.familyStatus === '备选' ? 'selected' : ''}>备选</option><option value="删除" ${row.familyStatus === '删除' ? 'selected' : ''}>删除</option></select></div>
        <div class="manual-field manual-field-wide"><span>家庭备注</span><input class="manual-input" type="text" value="${esc(row.familyNote || '')}" data-field="familyNote" data-row-id="${esc(row.id)}" aria-label="家庭备注" /></div>
      </div>
      <p class="manual-hint">这些字段只是你自己的核对记录；当前系统没有对应招生事实时保持空白，不代表“没有这项信息”。</p>
    </div>
  </div>`;
}

function printManualField(label, value, wide = false) {
  const text = String(value || '').trim();
  const shown = text ? esc(text) : '&nbsp;';
  return `<span class="print-field ${wide ? 'print-field-wide' : ''}"><b>${esc(label)}：</b><span class="print-blank">${shown}</span></span>`;
}

function mark(value, label) {
  return value === label ? '☑' : '□';
}

function renderRows() {
  rowsEl.innerHTML = state.volunteers.map((row, index) => {
    const order = index + 1;
    const suggestionId = `major-suggestions-${row.id}`;
    return `<tr draggable="true" data-row-id="${esc(row.id)}">
      <td class="col-order"><span class="drag-handle" title="拖动调整顺序" aria-hidden="true">☰</span><b>${order}</b></td>
      <td class="col-school"><div class="cell-editor"><input class="school-input" data-field="school" data-row-id="${esc(row.id)}" value="${esc(row.school)}" placeholder="输入学校名称" autocomplete="off" /><div class="school-suggestions" data-school-suggestions="${esc(row.id)}"></div></div></td>
      <td class="col-major"><div class="cell-editor"><input class="major-input" list="${suggestionId}" data-field="majorCode" data-row-id="${esc(row.id)}" value="${esc(row.majorCode)}" placeholder="专业代码，如080301" inputmode="text" autocomplete="off" /><datalist id="${suggestionId}">${majorSuggestions(row.majorCode).map(item => `<option value="${esc(item.code)}">${esc(item.name)}</option>`).join('')}</datalist><div class="major-name" data-major-name="${esc(row.id)}">${esc(row.majorName || '输入专业代码，自动带出中文')}</div>${renderManualPanel(row)}</div></td>
      <td class="col-check print-col-check">
        <div class="print-check-block">
          ${printManualField('院校代码', row.manualCheck?.institutionCode)}
          ${printManualField('专业组/招生代码', row.manualCheck?.groupCode)}
          ${printManualField('校区', row.manualCheck?.campus)}
          ${printManualField('实际培养地点', row.manualCheck?.studyLocation)}
          ${printManualField('学费', row.manualCheck?.tuition)}
          ${printManualField('住宿费', row.manualCheck?.accommodationFee)}
          ${printManualField('2026招生计划', row.manualCheck?.planCount)}
          ${printManualField('学制', row.manualCheck?.studyLength)}
          ${printManualField('培养方式', row.manualCheck?.trainingMode)}
          ${printManualField('选科要求', row.manualCheck?.subjectRequirement)}
          ${printManualField('专业备注/特殊限制', row.manualCheck?.remark, true)}
          <span class="print-field print-family"><b>家庭判断：</b>${mark(row.familyDecision, '冲')}冲　${mark(row.familyDecision, '稳')}稳　${mark(row.familyDecision, '保')}保　 <b>处理：</b>${mark(row.familyStatus, '保留')}保留　${mark(row.familyStatus, '备选')}备选　${mark(row.familyStatus, '删除')}删除</span>
          <span class="print-field print-field-wide"><b>家庭备注：</b>${row.familyNote ? esc(row.familyNote) : '&nbsp;'}</span>
        </div>
      </td>
      <td class="history-cell">${historyCell(2026, row.history)}</td>
      <td class="history-cell">${historyCell(2025, row.history)}</td>
      <td class="history-cell">${historyCell(2024, row.history)}</td>
      <td class="delta-cell">${historyCell(2026, row.history) !== '<span class="muted">无严格记录</span>' ? esc(formatDelta(row.history?.years?.[2026]?.rank, state.rank)) : '—'}</td>
      <td class="col-actions"><div class="row-actions"><button type="button" class="row-move" data-action="up" data-row-id="${esc(row.id)}" ${index === 0 ? 'disabled' : ''} aria-label="志愿${order}上移">↑</button><button type="button" class="row-move" data-action="down" data-row-id="${esc(row.id)}" ${index === state.volunteers.length - 1 ? 'disabled' : ''} aria-label="志愿${order}下移">↓</button><button type="button" class="row-delete" data-action="delete" data-row-id="${esc(row.id)}" aria-label="删除志愿${order}">删除</button></div>${row.error ? `<small class="row-error">${esc(row.error)}</small>` : ''}</td>
    </tr>`;
  }).join('');
  addBtn.disabled = state.volunteers.length >= 30;
}

async function fetchCandidateRank() {
  const score = normalizeScore(state.totalScore);
  const requestId = ++candidateRankRequest;
  if (score === null || score < 150) {
    state.rank = null;
    updateMeta();
    renderRows();
    saveState();
    return;
  }
  rankSourceEl.textContent = '正在换算2026辽宁物理类位次…';
  try {
    const response = await fetch(`${RANK_API}?score=${encodeURIComponent(score)}`, { headers: { accept: 'application/json' } });
    const data = await response.json();
    if (requestId !== candidateRankRequest) return;
    state.rank = data?.available ? Number(data.rank) : null;
    updateMeta();
    renderRows();
    saveState();
    statusEl.textContent = state.rank ? `已换算为2026年辽宁物理类约 ${formatRank(state.rank)} 位；下面的“相对当前位次”以此为参照。` : '这个分数暂时没有对应的官方位次记录。';
  } catch {
    if (requestId !== candidateRankRequest) return;
    state.rank = null;
    updateMeta();
    statusEl.textContent = '位次换算暂时失败。志愿表仍可继续填写，历史记录不会被当作位次结果。';
  }
}

async function fetchHistory(row) {
  if (!row.majorName) return;
  row.loading = true;
  row.error = '';
  renderRows();
  try {
    const params = new URLSearchParams({ major: row.majorName, limit: '120' });
    if (row.school) params.set('schoolKeyword', row.school);
    if (state.totalScore) params.set('candidateScore', String(state.totalScore));
    const response = await fetch(`${API_BASE}?${params.toString()}`, { headers: { accept: 'application/json' } });
    const payload = await response.json();
    if (!response.ok || payload?.ok === false) throw new Error(payload?.message || `历史记录读取失败（HTTP ${response.status}）`);
    const records = Array.isArray(payload.records) ? payload.records : [];
    const normalizedSchool = row.school.trim();
    const exact = records.find(item => String(item.school || '').trim() === normalizedSchool && String(item.standardMajorCode || '').trim() === row.majorCode)
      || records.find(item => String(item.school || '').trim() === normalizedSchool && String(item.major || '').trim() === row.majorName)
      || records.find(item => normalizedSchool && String(item.school || '').includes(normalizedSchool))
      || records[0];
    if (!exact) {
      row.history = null;
      row.error = normalizedSchool ? '没有找到该校该专业的严格匹配记录。' : '请先填写学校名称，再读取该专业的历史记录。';
      return;
    }
    row.history = exact.historyEvidence || buildFallbackHistory(exact);
    row.error = exact.school && normalizedSchool && exact.school !== normalizedSchool ? `已匹配到：${exact.school}` : '';
  } catch (error) {
    row.history = null;
    row.error = error instanceof Error ? error.message : '历史记录暂时无法读取。';
  } finally {
    row.loading = false;
    saveState();
    renderRows();
  }
}

function buildFallbackHistory(record) {
  return {
    years: {
      2026: { score: record.score2026, rank: record.rank2026, comparable: true, recordStatus: 'primary-record' },
      2025: { score: record.score2025, rank: record.rank2025, comparable: true, recordStatus: 'strict-match' },
      2024: { score: record.score2024, rank: record.rank2024, comparable: true, recordStatus: 'strict-match' }
    }
  };
}

function updateMajorFromInput(row, value) {
  const resolved = resolveMajor(value);
  if (!resolved || resolved.kind !== 'major') {
    row.majorName = '';
    row.history = null;
    row.error = value ? '没有找到这个专业代码；请填写2026本科专业目录中的代码。' : '';
    return false;
  }
  row.majorCode = resolved.item.code;
  row.majorName = resolved.item.name;
  row.error = '';
  return true;
}

function updateSchoolSuggestions(input) {
  const rowId = input.dataset.rowId;
  const mount = document.querySelector(`[data-school-suggestions="${CSS.escape(rowId)}"]`);
  if (!mount) return;
  const query = input.value.trim();
  if (query.length < 2) { mount.innerHTML = ''; return; }
  getSchoolResolver().then(resolverInstance => {
    if (input.value.trim() !== query) return;
    const result = resolverInstance.resolve(query, { limit: 6 });
    const candidates = result?.status === 'resolved' ? [result.officialName] : (result?.candidates || []).slice(0, 6).map(item => item.officialName);
    mount.innerHTML = candidates.map(name => `<button type="button" data-school-choice="${esc(name)}" data-row-id="${esc(rowId)}">${esc(name)}</button>`).join('');
  }).catch(() => {
    mount.innerHTML = '<small>学校名称解析暂时不可用，可直接填写完整校名。</small>';
  });
}

function updateManualValue(row, key, value) {
  row.manualCheck = { ...emptyManualCheck(), ...(row.manualCheck || {}), [key]: String(value ?? '') };
}

function moveRow(rowId, delta) {
  const index = state.volunteers.findIndex(row => row.id === rowId);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= state.volunteers.length) return;
  [state.volunteers[index], state.volunteers[target]] = [state.volunteers[target], state.volunteers[index]];
  state.volunteers.forEach((row, i) => { row.order = i + 1; });
  saveState();
  renderRows();
}

function deleteRow(rowId) {
  if (state.volunteers.length === 1) {
    state.volunteers[0] = createVolunteer(1);
  } else {
    state.volunteers = state.volunteers.filter(row => row.id !== rowId).map((row, i) => ({ ...row, order: i + 1 }));
  }
  expandedRows.delete(rowId);
  saveState();
  renderRows();
}

function resetAll() {
  state = defaultState();
  expandedRows.clear();
  saveState();
  updateMeta();
  renderRows();
  fetchCandidateRank();
}

function bindEvents() {
  [nameEl, subjectEl, scoreEl].forEach(input => input.addEventListener('input', () => {
    state.studentName = nameEl.value.trim();
    state.subjectTrack = subjectEl.value.trim() || '辽宁物理类（物化生）';
    state.totalScore = scoreEl.value.trim();
    saveState();
  }));
  scoreEl.addEventListener('change', fetchCandidateRank);
  Object.keys(state.scores).forEach(key => {
    const input = document.querySelector(`[data-score-key="${key}"]`);
    input?.addEventListener('input', event => { state.scores[key] = event.currentTarget.value.trim(); saveState(); });
  });
  addBtn.addEventListener('click', () => {
    if (state.volunteers.length >= 30) return;
    state.volunteers.push(createVolunteer(state.volunteers.length + 1));
    saveState();
    renderRows();
  });
  printBtn.addEventListener('click', () => {
    state.studentName = nameEl.value.trim();
    state.totalScore = scoreEl.value.trim();
    state.subjectTrack = subjectEl.value.trim();
    saveState();
    window.print();
  });
  resetBtn.addEventListener('click', resetAll);

  rowsEl.addEventListener('input', event => {
    const rowId = event.target.dataset.rowId;
    const row = state.volunteers.find(item => item.id === rowId);
    if (!row) return;
    const field = event.target.dataset.field || '';
    if (field === 'school') {
      row.school = event.target.value;
      row.history = null;
      row.error = '';
      updateSchoolSuggestions(event.target);
      saveState();
    } else if (field === 'majorCode') {
      const changed = updateMajorFromInput(row, event.target.value);
      saveState();
      const nameMount = document.querySelector(`[data-major-name="${CSS.escape(rowId)}"]`);
      if (nameMount) nameMount.textContent = row.majorName || '输入专业代码，自动带出中文';
      if (changed && row.school) fetchHistory(row);
    } else if (field.startsWith('manualCheck.')) {
      updateManualValue(row, field.slice('manualCheck.'.length), event.target.value);
      saveState();
    } else if (field === 'familyNote') {
      row.familyNote = event.target.value;
      saveState();
    }
  });

  rowsEl.addEventListener('change', event => {
    const rowId = event.target.dataset.rowId;
    const row = state.volunteers.find(item => item.id === rowId);
    if (!row) return;
    const field = event.target.dataset.field || '';
    if (field === 'school') {
      row.school = event.target.value.trim();
      saveState();
      const resolved = getSchoolResolver().then(resolverInstance => resolverInstance.resolve(row.school, { limit: 6 })).catch(() => null);
      resolved.then(result => {
        if (result?.status === 'resolved' && result.officialName) row.school = result.officialName;
        saveState();
        renderRows();
        fetchHistory(row);
      });
    } else if (field === 'majorCode' && row.majorName && row.school) {
      fetchHistory(row);
    } else if (field.startsWith('manualCheck.')) {
      updateManualValue(row, field.slice('manualCheck.'.length), event.target.value);
      saveState();
    } else if (field === 'familyDecision' || field === 'familyStatus') {
      row[field] = event.target.value;
      saveState();
    }
  });

  rowsEl.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const rowId = button.dataset.rowId;
    if (button.dataset.action === 'toggle-manual') {
      if (expandedRows.has(rowId)) expandedRows.delete(rowId); else expandedRows.add(rowId);
      renderRows();
      const panel = document.getElementById(`manual-panel-${CSS.escape(rowId)}`);
      panel?.querySelector('.manual-input')?.focus({ preventScroll: true });
      return;
    }
    if (button.dataset.schoolChoice) {
      const row = state.volunteers.find(item => item.id === rowId);
      if (!row) return;
      row.school = button.dataset.schoolChoice;
      row.history = null;
      saveState();
      renderRows();
      fetchHistory(row);
      return;
    }
    const action = button.dataset.action;
    if (action === 'up') moveRow(rowId, -1);
    if (action === 'down') moveRow(rowId, 1);
    if (action === 'delete') deleteRow(rowId);
  });

  let dragId = null;
  rowsEl.addEventListener('dragstart', event => {
    const row = event.target.closest('tr[data-row-id]');
    dragId = row?.dataset.rowId || null;
    if (dragId) row.classList.add('is-dragging');
  });
  rowsEl.addEventListener('dragend', event => { event.target.closest('tr')?.classList.remove('is-dragging'); dragId = null; });
  rowsEl.addEventListener('dragover', event => { if (dragId) event.preventDefault(); });
  rowsEl.addEventListener('drop', event => {
    event.preventDefault();
    const targetRow = event.target.closest('tr[data-row-id]');
    if (!dragId || !targetRow || targetRow.dataset.rowId === dragId) return;
    const from = state.volunteers.findIndex(item => item.id === dragId);
    const to = state.volunteers.findIndex(item => item.id === targetRow.dataset.rowId);
    if (from < 0 || to < 0) return;
    const [moved] = state.volunteers.splice(from, 1);
    state.volunteers.splice(to, 0, moved);
    state.volunteers.forEach((row, i) => { row.order = i + 1; });
    saveState();
    renderRows();
  });
}

function syncPrintMeta() {
  document.getElementById('printStudentName').textContent = nameEl.value.trim();
  document.getElementById('printTotalScore').textContent = scoreEl.value.trim();
  document.getElementById('printRank').textContent = rankEl.textContent.trim();
  document.getElementById('printSubject').textContent = subjectEl.value.trim();
  printDateEl.textContent = new Date().toLocaleDateString('zh-CN');
}

updateMeta();
renderRows();
bindEvents();
fetchCandidateRank();
window.addEventListener('beforeprint', () => {
  state.studentName = nameEl.value.trim();
  state.totalScore = scoreEl.value.trim();
  state.subjectTrack = subjectEl.value.trim();
  saveState();
  syncPrintMeta();
});
