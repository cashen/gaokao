import { MAJOR_CATALOG_2026 } from '../kb/major-understanding/major-catalog-2026.generated.js';
import { createMajorCatalogResolver, normalizeMajorCode } from '../../shared/resources/majors/major-catalog-contract.js';

const RELEASE = 'v016.65-r155';
const STORE_KEY = 'gaokao:simulation-report:v002';
const LEGACY_KEY = 'gaokao:simulation-report:v001';
const HISTORY_API = '/api/ai/major-history';
const RANK_API = '/api/simulation-rank';
const FAMILY = ['继续考虑', '候选', '还没决定', '排除'];
const NOTE_MAX = 1000;
const MAJOR_LIMIT = 12;
const MANUAL = ['institutionCode', 'groupCode', 'campus', 'studyLocation', 'tuition', 'accommodationFee', 'planCount', 'studyLength', 'trainingMode', 'subjectRequirement', 'remark'];
const resolver = createMajorCatalogResolver(MAJOR_CATALOG_2026);

const norm = value => String(value ?? '').normalize('NFKC').replace(/\u00a0/g, ' ').trim();
const lower = value => norm(value).toLowerCase();
const esc = value => String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
const rankText = value => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n.toLocaleString('zh-CN') : '—'; };
const cleanCode = value => norm(value);
const normalizedKey = value => lower(value).replace(/[\s·•,，。；;：:'\"“”‘’!！?？_—\-（）()【】\[\]]+/g, '');

const emptyManual = () => Object.fromEntries(MANUAL.map(key => [key, '']));
const makeRow = order => ({
  id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  order,
  school: '',
  confirmedSchool: '',
  majorQuery: '',
  majorName: '',
  majorCode: '',
  majorRecordId: '',
  standardMajorName: '',
  standardMajorCode: '',
  history: { years: {} },
  error: '',
  manualCheck: emptyManual(),
  familyDecision: '',
  familyStatus: '',
  familyNote: ''
});
const defaults = () => ({
  version: 2,
  studentName: '',
  subjectTrack: '辽宁物理类（物化生）',
  totalScore: '',
  scores: { chinese: '', math: '', english: '', physics: '', chemistry: '', biology: '' },
  rank: null,
  volunteers: [makeRow(1)]
});

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

function normalizeRecord(row, order) {
  const data = row || {};
  const legacyMajorQuery = data.majorQuery ?? data.majorName ?? data.majorCode ?? '';
  const recordId = norm(data.majorRecordId || data.recordId || '');
  const majorCode = cleanCode(data.majorCode || (recordId ? data.majorCode2026 : ''));
  const history = data.history && typeof data.history === 'object' ? data.history : { years: {} };
  const years = history.years && typeof history.years === 'object' ? history.years : {};
  return {
    ...makeRow(order),
    ...data,
    order,
    school: norm(data.school),
    confirmedSchool: norm(data.confirmedSchool),
    majorQuery: norm(legacyMajorQuery),
    majorName: norm(data.majorName),
    majorCode,
    majorRecordId: recordId,
    standardMajorName: norm(data.standardMajorName),
    standardMajorCode: norm(data.standardMajorCode),
    history: { years: { ...years } },
    manualCheck: { ...emptyManual(), ...(data.manualCheck || {}) },
    familyStatus: FAMILY.includes(norm(data.familyStatus)) ? norm(data.familyStatus) : '',
    familyNote: typeof data.familyNote === 'string' ? data.familyNote.slice(0, NOTE_MAX) : ''
  };
}

function load() {
  const source = read(STORE_KEY) || read(LEGACY_KEY);
  if (!source || !Array.isArray(source.volunteers)) return defaults();
  const d = defaults();
  return {
    ...d,
    ...source,
    version: 2,
    scores: { ...d.scores, ...(source.scores || {}) },
    volunteers: source.volunteers.length ? source.volunteers.map(normalizeRecord) : [makeRow(1)]
  };
}

const state = load();
const runtime = {
  version: RELEASE,
  state,
  worker: null,
  seq: 0,
  pending: new Map(),
  timers: new Map(),
  controllers: new Map(),
  rankController: null,
  expanded: new Set(),
  composing: new Set(),
  initialized: false
};

function save(notify = true) {
  localStorage.setItem(STORE_KEY, JSON.stringify({
    ...runtime.state,
    version: 2,
    volunteers: runtime.state.volunteers.map((row, index) => ({
      ...row,
      order: index + 1,
      manualCheck: { ...emptyManual(), ...(row.manualCheck || {}) },
      familyNote: typeof row.familyNote === 'string' ? row.familyNote.slice(0, NOTE_MAX) : ''
    }))
  }));
  if (notify) render();
}

function row(id) {
  return runtime.state.volunteers.find(item => String(item.id) === String(id));
}

function update(id, mutate, notify = true) {
  const current = row(id);
  if (!current) return;
  runtime.state = {
    ...runtime.state,
    volunteers: runtime.state.volunteers.map(item => String(item.id) === String(id) ? mutate({ ...item }) : item)
  };
  save(notify);
}

function toast(text) {
  document.querySelector('.sim-toast')?.remove();
  const element = document.createElement('div');
  element.className = 'sim-toast';
  element.textContent = text;
  document.body.appendChild(element);
  setTimeout(() => element.remove(), 2400);
}

function yearValue(record, year) {
  const scoreKey = `score${year}`;
  const rankKey = `rank${year}`;
  const score = Number(record?.[scoreKey]);
  const rank = Number(record?.[rankKey]);
  return {
    score: Number.isFinite(score) && score > 0 ? score : null,
    rank: Number.isFinite(rank) && rank > 0 ? rank : null,
    available: (Number.isFinite(score) && score > 0) || (Number.isFinite(rank) && rank > 0)
  };
}

function historyFromRecord(record) {
  return {
    years: Object.fromEntries([2026, 2025, 2024].map(year => {
      const value = yearValue(record, year);
      return [year, {
        ...value,
        comparable: Boolean(value.available),
        recordStatus: value.available ? 'history' : 'missing-year'
      }];
    }))
  };
}

function historyText(rowData, year) {
  const value = rowData?.history?.years?.[year];
  if (!value) return '—';
  if (value.recordStatus === 'missing-year' || (!value.score && !value.rank)) return '暂无对应投档记录';
  return `${value.score == null ? '—' : `${value.score}分`} / ${value.rank == null ? '—' : `${rankText(value.rank)}位`}`;
}

function delta(rowData) {
  const admissionRank = Number(rowData?.history?.years?.[2026]?.rank);
  const currentRank = Number(runtime.state.rank);
  if (!Number.isFinite(admissionRank) || !Number.isFinite(currentRank) || currentRank <= 0) return '—';
  const difference = admissionRank - currentRank;
  return difference === 0 ? '同位次' : `${difference > 0 ? '+' : ''}${difference.toLocaleString('zh-CN')}名`;
}

function rowStatus(rowData) {
  if (!rowData.school) return ['incomplete', '先选择学校'];
  if (!rowData.confirmedSchool || normalizedKey(rowData.confirmedSchool) !== normalizedKey(rowData.school)) return ['needs-check', '已填学校，请从候选中确认'];
  if (!rowData.majorQuery) return ['incomplete', '再输入专业'];
  if (!rowData.majorRecordId || !rowData.majorName || !rowData.majorCode) return ['needs-check', '从该校实际专业中选一项'];
  return ['complete', '学校、专业和参考记录已对应'];
}

function stepClass(condition, current = false) {
  if (condition) return 'step-done';
  return current ? 'step-current' : 'step-wait';
}

function stepsHtml(rowData) {
  const schoolDone = Boolean(rowData.confirmedSchool && normalizedKey(rowData.confirmedSchool) === normalizedKey(rowData.school));
  const majorEntered = Boolean(rowData.majorQuery);
  const majorDone = Boolean(rowData.majorRecordId && rowData.majorName && rowData.majorCode);
  return `<ol class="step-rail" aria-label="这条志愿整理进度">
    <li class="${stepClass(schoolDone, !schoolDone)}"><span class="step-num">1</span><span class="step-copy"><b>学校</b><small>${schoolDone ? '已确认' : rowData.school ? '等你确认' : '先选学校'}</small></span></li>
    <li class="${stepClass(majorDone, schoolDone && !majorDone)}"><span class="step-num">2</span><span class="step-copy"><b>专业</b><small>${majorDone ? '已确认' : majorEntered ? '请选择实际专业' : '选择学校后填写'}</small></span></li>
    <li class="${stepClass(majorDone, majorDone)}"><span class="step-num">3</span><span class="step-copy"><b>三年历史</b><small>${majorDone ? '随同一招生记录' : '选定专业后显示'}</small></span></li>
  </ol>`;
}

function projectInfo(major) {
  const text = String(major || '');
  if (/中外|合作办学|国际项目|联合培养|高收费/.test(text)) return { label: '中外合作/高收费，需核验', kind: 'sino' };
  if (/预科|民族班|定向|专项|实验班|试验班|卓越班|拔尖|师范类/.test(text)) return { label: '特殊培养/项目，需核验', kind: 'special' };
  return { label: '普通项目', kind: 'ordinary' };
}

function candidateSummary(item) {
  const project = projectInfo(item.major);
  const years = [2026, 2025, 2024].filter(year => yearValue(item, year).available).length;
  const code = norm(item.majorCode2026 || item.majorCode || item.standardMajorCode);
  return {
    record: item,
    name: norm(item.major || item.majorName),
    code,
    standardName: norm(item.standardMajorName),
    standardCode: norm(item.standardMajorCode),
    projectLabel: project.label,
    projectKind: project.kind,
    historyCount: years,
    id: norm(item.id)
  };
}

function sortMajorCandidates(items, query) {
  const q = lower(query);
  const qCode = normalizeMajorCode(query);
  return [...items].sort((a, b) => {
    const an = lower(a.name);
    const bn = lower(b.name);
    const ae = an === q ? 1 : an.startsWith(q) ? 0.8 : an.includes(q) ? 0.5 : 0;
    const be = bn === q ? 1 : bn.startsWith(q) ? 0.8 : bn.includes(q) ? 0.5 : 0;
    const ac = qCode && normalizeMajorCode(a.code)?.startsWith(qCode) ? 0.4 : 0;
    const bc = qCode && normalizeMajorCode(b.code)?.startsWith(qCode) ? 0.4 : 0;
    return (be + bc) - (ae + ac) || a.name.length - b.name.length || a.name.localeCompare(b.name, 'zh-CN');
  });
}

function manualHtml(rowData) {
  if (!runtime.expanded.has(String(rowData.id))) return '';
  return `<section class="detail-panel">
    <div class="detail-grid">${MANUAL.map(key => {
      const label = {
        institutionCode: '院校代码', groupCode: '专业组/招生代码', campus: '校区', studyLocation: '实际培养地点', tuition: '学费',
        accommodationFee: '住宿费', planCount: '2026招生计划', studyLength: '学制', trainingMode: '培养方式', subjectRequirement: '选科要求', remark: '专业备注/特殊限制'
      }[key];
      return `<label class="manual-field"><span>${label}</span>${key === 'remark'
        ? `<textarea data-detail-field="${key}" data-id="${esc(rowData.id)}" rows="2">${esc(rowData.manualCheck?.[key] || '')}</textarea>`
        : `<input data-detail-field="${key}" data-id="${esc(rowData.id)}" value="${esc(rowData.manualCheck?.[key] || '')}" />`}</label>`;
    }).join('')}</div>
    <p>这些是你们自己的核对记录；空白不代表官方资料不存在。</p>
  </section>`;
}

function familyRecordHtml(rowData) {
  const selected = FAMILY.includes(rowData.familyStatus) ? rowData.familyStatus : '还没决定';
  return `<section class="family-record" aria-label="家庭处理">
    <div class="family-record-head"><strong>家庭处理</strong><span>记录这条志愿准备怎么处理，以及讨论后的原因。</span></div>
    <div class="family-decision">${FAMILY.map(item => `<button type="button" data-family="${esc(item)}" data-id="${esc(rowData.id)}" aria-pressed="${selected === item ? 'true' : 'false'}">${esc(item)}</button>`).join('')}</div>
    <label class="family-note-field"><span>备注</span><textarea data-family-note data-id="${esc(rowData.id)}" maxlength="${NOTE_MAX}" rows="2" placeholder="例如：学费可以接受，但校区需要再核实；家里暂时倾向保留。">${esc(rowData.familyNote || '')}</textarea><small>可写多句，输入内容会自动保存。</small></label>
  </section>`;
}

function historyHtml(rowData) {
  const values = [2026, 2025, 2024].map(year => `<div class="history-cell"><span>${year}</span><strong>${historyText(rowData, year)}</strong></div>`).join('');
  return `<section class="history-grid" aria-label="三年参考记录">${values}<div class="history-cell history-delta"><span>相对当前</span><strong>${esc(delta(rowData))}</strong></div></section>`;
}

function cardHtml(rowData, index, total) {
  const [kind, label] = rowStatus(rowData);
  const expanded = runtime.expanded.has(String(rowData.id));
  const confirmed = rowData.confirmedSchool && normalizedKey(rowData.confirmedSchool) === normalizedKey(rowData.school);
  const majorLabel = rowData.majorName ? `${rowData.majorName}${rowData.majorCode ? ` · 招生代码 ${rowData.majorCode}` : ''}` : '先选择学校，再从该校实际专业中确认';
  return `<article class="volunteer-card" data-card-id="${esc(rowData.id)}" data-row-state="${kind}">
    <div class="card-head">
      <div class="order-badge" aria-label="志愿顺序">${index + 1}</div>
      <div class="card-heading"><strong>志愿 ${index + 1}</strong><span>${confirmed ? esc(rowData.confirmedSchool) : '先把学校确认下来，再选专业'}</span></div>
      <div class="card-tools">
        <button type="button" data-action="up" data-id="${esc(rowData.id)}" ${index === 0 ? 'disabled' : ''}>↑ 上移</button>
        <button type="button" data-action="down" data-id="${esc(rowData.id)}" ${index === total - 1 ? 'disabled' : ''}>↓ 下移</button>
        <button type="button" data-action="delete" data-id="${esc(rowData.id)}">删除</button>
      </div>
    </div>
    ${stepsHtml(rowData)}
    <div class="selection-grid">
      <div class="card-field"><label>学校</label><input data-field="school" data-id="${esc(rowData.id)}" value="${esc(rowData.school)}" placeholder="输入学校名称" autocomplete="off" enterkeyhint="search" /></div>
      <div class="card-field"><label>专业</label><input data-field="majorCode" data-id="${esc(rowData.id)}" value="${esc(rowData.majorQuery)}" placeholder="例如 冶金工程" autocomplete="off" enterkeyhint="search" /><div class="major-caption" data-major-caption="${esc(rowData.id)}">${esc(majorLabel)}</div><div class="input-helper" data-helper-id="${esc(rowData.id)}"></div></div>
    </div>
    <div class="candidate-slot" data-candidate-slot="${esc(rowData.id)}"></div>
    <div class="record-identity" ${rowData.majorRecordId ? '' : 'hidden'}><span>已对应：${esc(rowData.majorName)} · 招生代码 ${esc(rowData.majorCode)}</span><small>${esc(projectInfo(rowData.majorName).label)}</small></div>
    ${historyHtml(rowData)}
    <div class="state-line ${kind}"><span>${label}</span><button type="button" data-action="detail" data-id="${esc(rowData.id)}">${expanded ? '收起核对' : '展开核对'}</button></div>
    ${manualHtml(rowData)}
    ${familyRecordHtml(rowData)}
  </article>`;
}

function fitFamilyNote(element) {
  if (!element) return;
  element.style.height = 'auto';
  const max = 180;
  element.style.height = `${Math.min(Math.max(element.scrollHeight, 68), max)}px`;
  element.style.overflowY = element.scrollHeight > max ? 'auto' : 'hidden';
}

function render() {
  const current = runtime.state;
  const name = document.querySelector('#wbStudentName');
  const subject = document.querySelector('#wbSubject');
  const score = document.querySelector('#wbTotalScore');
  const rank = document.querySelector('#wbRank');
  const source = document.querySelector('#wbRankSource');
  if (name && document.activeElement !== name) name.value = current.studentName || '';
  if (subject && document.activeElement !== subject) subject.value = current.subjectTrack || '辽宁物理类（物化生）';
  if (score && document.activeElement !== score) score.value = current.totalScore || '';
  if (rank) rank.textContent = rankText(current.rank);
  if (source) source.textContent = current.rank ? '2026辽宁物理类官方成绩统计口径' : '输入总分后自动换算';

  const list = document.querySelector('#wbRows');
  if (list) {
    list.innerHTML = current.volunteers.map((item, index) => cardHtml(item, index, current.volunteers.length)).join('');
    list.querySelectorAll('[data-family-note]').forEach(fitFamilyNote);
  }
  const empty = document.querySelector('#wbEmpty');
  if (empty) empty.hidden = current.volunteers.length > 0;
  const status = document.querySelector('#wbStatus');
  if (status) status.textContent = current.volunteers.length ? '一条志愿只要确认学校、专业和参考记录，其他核对可以后补。' : '先加入一所已经考虑过的学校即可。';
  const summary = document.querySelector('#wbSummary');
  if (summary) {
    const counters = current.volunteers.reduce((acc, item) => {
      const type = rowStatus(item)[0];
      if (type === 'complete') acc.complete += 1; else if (type === 'needs-check') acc.check += 1; else acc.incomplete += 1;
      return acc;
    }, { complete: 0, check: 0, incomplete: 0 });
    summary.innerHTML = `<span>共 ${current.volunteers.length} 条</span><span>✓ ${counters.complete} 条已对应</span><span>⚠ ${counters.check} 条待确认</span><span>○ ${counters.incomplete} 条待填写</span>`;
  }
}

function slot(id, html) {
  const element = document.querySelector(`[data-candidate-slot="${CSS.escape(String(id))}"]`);
  if (element) element.innerHTML = html;
}

function helper(id, text, tone = 'neutral') {
  const element = document.querySelector(`[data-helper-id="${CSS.escape(String(id))}"]`);
  if (element) { element.textContent = text; element.dataset.tone = tone; }
}

function candidateHtml(kind, items, id) {
  if (!items.length) return '<div class="candidate-empty">暂未找到合适候选，请继续输入。</div>';
  const title = kind === 'school' ? '找到以下招生学校，请确认你想要的那一所' : '该校 2026 实际招生专业：请按名称和招生代码确认';
  return `<div class="candidate-title">${title}</div><div class="candidate-list">${items.map(item => {
    const name = norm(item.name || item.officialName);
    const code = norm(item.code || '');
    const project = norm(item.projectLabel || item.meta || '');
    const history = Number(item.historyCount) > 0 ? `${item.historyCount} 年有记录` : '历史记录待核实';
    const isMajor = kind === 'major';
    return `<button type="button" class="candidate" data-candidate-kind="${kind}" data-row-id="${esc(id)}" data-name="${esc(name)}" data-code="${esc(code)}" data-record-id="${esc(item.id || '')}" ${isMajor ? `data-standard-name="${esc(item.standardName || '')}" data-standard-code="${esc(item.standardCode || '')}"` : ''}>
      <span class="candidate-main"><strong>${esc(name)}</strong><small>${esc(isMajor ? `招生代码 ${code || '待核对'} · ${project}` : (item.meta || ''))}</small></span>
      ${isMajor ? `<span class="candidate-history">${esc(history)}</span>` : ''}<span class="candidate-action">选这所${isMajor ? '专业' : ''}</span>
    </button>`;
  }).join('')}</div>`;
}

function schoolCandidateItems(items) {
  return items.map(item => ({
    name: norm(item.officialName || item.name),
    meta: [item.province, item.city, item.level].map(norm).filter(Boolean).join(' · ')
  }));
}

function selectSchoolCandidate(id, name) {
  const value = norm(name);
  const current = row(id);
  if (!current || !value) return;
  runtime.pending.get(String(id))?.cancelled = true;
  runtime.controllers.get(String(id))?.abort();
  runtime.timers.delete(String(id));
  update(id, item => ({ ...item, school: value, confirmedSchool: value, majorQuery: '', majorName: '', majorCode: '', majorRecordId: '', standardMajorName: '', standardMajorCode: '', history: { years: {} }, error: '' }));
  slot(id, '');
  helper(id, `✓ 已确认学校：${value}。现在可以直接输入专业。`, 'ok');
}

function onSchool(id, value) {
  const valueNorm = norm(value);
  const current = row(id);
  if (!current) return;
  runtime.controllers.get(String(id))?.abort();
  runtime.controllers.get(`major:${id}`)?.abort();
  runtime.pending.get(String(id))?.cancelled = true;
  update(id, item => ({ ...item, school: valueNorm, confirmedSchool: '', majorQuery: '', majorName: '', majorCode: '', majorRecordId: '', standardMajorName: '', standardMajorCode: '', history: { years: {} }, error: '' }), false);
  if (!valueNorm) {
    clearTimeout(runtime.timers.get(String(id)));
    slot(id, '');
    helper(id, '输入学校名称，不需要等待页面刷新。');
    return;
  }
  helper(id, '正在查找招生学校候选…');
  scheduleSchoolSearch(id, valueNorm);
}

function onMajor(id, value) {
  const query = norm(value);
  const current = row(id);
  if (!current) return;
  runtime.controllers.get(`major:${id}`)?.abort();
  update(id, item => ({ ...item, majorQuery: query, majorName: '', majorCode: '', majorRecordId: '', standardMajorName: '', standardMajorCode: '', history: { years: {} }, error: '' }), false);
  if (!current.confirmedSchool) {
    slot(id, '');
    helper(id, '请先确认学校；确认后这里会只显示该校实际招生专业。');
    return;
  }
  if (!query) {
    slot(id, '');
    helper(id, '输入专业名称，可以只输入一部分。');
    return;
  }
  helper(id, `${current.confirmedSchool} · 正在找实际招生专业…`);
  clearTimeout(runtime.timers.get(`major:${id}`));
  runtime.timers.set(`major:${id}`, setTimeout(() => queryMajor(id, query), 180));
}

function queryMajor(id, query) {
  const current = row(id);
  if (!current?.confirmedSchool || !query) return;
  const key = `major:${id}`;
  runtime.controllers.get(key)?.abort();
  const controller = new AbortController();
  runtime.controllers.set(key, controller);
  const params = new URLSearchParams({ schoolKeyword: current.confirmedSchool, major: query, limit: '120', offset: '0' });
  fetch(`${HISTORY_API}?${params}`, { headers: { accept: 'application/json' }, signal: controller.signal })
    .then(async response => {
      const data = await response.json();
      if (!response.ok || data?.ok === false) throw new Error(data?.message || `HTTP ${response.status}`);
      return Array.isArray(data.records) ? data.records : [];
    })
    .then(records => {
      const latest = row(id);
      if (!latest || latest.majorQuery !== query || normalizedKey(latest.confirmedSchool) !== normalizedKey(current.confirmedSchool)) return;
      const names = records
        .filter(record => normalizedKey(record.school) === normalizedKey(latest.confirmedSchool))
        .map(candidateSummary)
        .filter(item => item.name && (lower(item.name).includes(lower(query)) || (normalizeMajorCode(query) && normalizeMajorCode(item.code)?.startsWith(normalizeMajorCode(query)))))
        .reduce((list, item) => list.some(existing => existing.id && existing.id === item.id) ? list : [...list, item], []);
      const ordered = sortMajorCandidates(names, query).slice(0, MAJOR_LIMIT);
      slot(id, candidateHtml('major', ordered, id));
      helper(id, ordered.length ? `找到 ${ordered.length} 个该校实际招生专业，请按名称和招生代码选择。` : '暂未找到与这个输入对应的该校实际招生专业。', ordered.length ? 'neutral' : 'warn');
    })
    .catch(error => { if (error?.name !== 'AbortError') helper(id, '在线查询暂时失败；当前输入会保留，可以稍后再试。', 'warn'); })
    .finally(() => { if (runtime.controllers.get(key) === controller) runtime.controllers.delete(key); });
}

function applyMajorRecord(id, record) {
  const current = row(id);
  if (!current || !record) return;
  const majorName = norm(record.major || record.majorName);
  const majorCode = cleanCode(record.majorCode2026 || record.majorCode || record.standardMajorCode);
  const recordId = norm(record.id || '');
  if (!majorName || !majorCode || !recordId) {
    helper(id, '这条专业缺少招生名称、招生代码或记录编号，不能安全对应历史。', 'warn');
    return;
  }
  update(id, item => ({
    ...item,
    majorQuery: item.majorQuery || majorName,
    majorName,
    majorCode,
    majorRecordId: recordId,
    standardMajorName: norm(record.standardMajorName),
    standardMajorCode: norm(record.standardMajorCode),
    history: historyFromRecord(record),
    error: ''
  }));
  slot(id, '');
  const historyCount = [2026, 2025, 2024].filter(year => yearValue(record, year).available).length;
  helper(id, `✓ 已确认：${current.confirmedSchool} · ${majorName} · 招生代码 ${majorCode}。${historyCount} 年有对应记录。`, 'ok');
}

function strictRecord(records, school, majorName, majorCode, recordId = '') {
  const schoolKey = normalizedKey(school);
  const targetId = norm(recordId);
  if (targetId) {
    const exactId = records.find(item => norm(item.id) === targetId && normalizedKey(item.school) === schoolKey);
    if (exactId) return exactId;
  }
  const nameKey = normalizedKey(majorName);
  const code = norm(majorCode);
  return records.find(item => normalizedKey(item.school) === schoolKey && normalizedKey(item.major) === nameKey && norm(item.majorCode2026) === code) || null;
}

async function confirmMajor(id, code, name) {
  const current = row(id);
  if (!current?.confirmedSchool) return;
  const key = `major:${id}`;
  runtime.controllers.get(key)?.abort();
  const controller = new AbortController();
  runtime.controllers.set(key, controller);
  const params = new URLSearchParams({ schoolKeyword: current.confirmedSchool, major: name, limit: '120', offset: '0' });
  helper(id, `${current.confirmedSchool} · 正在核对这个专业…`);
  try {
    const response = await fetch(`${HISTORY_API}?${params}`, { headers: { accept: 'application/json' }, signal: controller.signal });
    const data = await response.json();
    if (!response.ok || data?.ok === false) throw new Error(data?.message || `HTTP ${response.status}`);
    const exact = strictRecord(Array.isArray(data.records) ? data.records : [], current.confirmedSchool, name, code);
    if (!exact) throw new Error('没有找到对应招生记录');
    applyMajorRecord(id, exact);
  } catch (error) {
    if (error?.name !== 'AbortError') helper(id, '没有找到完全对应的招生记录，请从候选中重新选择。', 'warn');
  } finally {
    if (runtime.controllers.get(key) === controller) runtime.controllers.delete(key);
  }
}

function scheduleSchoolSearch(id, query) {
  clearTimeout(runtime.timers.get(String(id)));
  if (!query) { slot(id, ''); return; }
  runtime.timers.set(String(id), setTimeout(() => {
    const seq = ++runtime.seq;
    const key = String(id);
    const previous = runtime.pending.get(key);
    if (previous) previous.cancelled = true;
    runtime.pending.set(key, { seq, query, cancelled: false });
    runtime.worker?.postMessage({ type: 'search', id: key, seq, query });
  }, 120));
}

function updateRank() {
  const score = Math.round(Number(String(runtime.state.totalScore || '').trim()));
  const rankElement = document.querySelector('#wbRank');
  const sourceElement = document.querySelector('#wbRankSource');
  if (!Number.isFinite(score) || score < 150 || score > 750) {
    if (runtime.state.rank !== null) { runtime.state = { ...runtime.state, rank: null }; save(false); }
    if (rankElement) rankElement.textContent = '—';
    if (sourceElement) sourceElement.textContent = '输入总分后自动换算';
    return;
  }
  runtime.rankController?.abort();
  const controller = new AbortController();
  runtime.rankController = controller;
  fetch(`${RANK_API}?score=${score}`, { headers: { accept: 'application/json' }, signal: controller.signal })
    .then(async response => { const data = await response.json(); if (!response.ok || data?.ok === false) throw new Error(); return data; })
    .then(data => {
      if (String(runtime.state.totalScore) !== String(score)) return;
      runtime.state = { ...runtime.state, rank: data.rank ?? null };
      save(false);
      if (rankElement) rankElement.textContent = rankText(runtime.state.rank);
      if (sourceElement) sourceElement.textContent = '2026辽宁物理类官方成绩统计口径';
    })
    .catch(error => { if (error?.name !== 'AbortError') toast('分数位次暂时无法读取'); })
    .finally(() => { if (runtime.rankController === controller) runtime.rankController = null; });
}

function move(id, direction) {
  const list = [...runtime.state.volunteers];
  const index = list.findIndex(item => String(item.id) === String(id));
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  runtime.state = { ...runtime.state, volunteers: list.map((item, order) => ({ ...item, order: order + 1 })) };
  save();
}

function add() {
  const current = runtime.state;
  if (current.volunteers.some(item => !item.school && !item.majorQuery)) { toast('已有一条空白志愿，直接填写即可'); return; }
  if (current.volunteers.length >= 30) { toast('最多整理 30 条志愿'); return; }
  runtime.state = { ...current, volunteers: [...current.volunteers, makeRow(current.volunteers.length + 1)] };
  save();
}

function reset() {
  if (confirm(`确定清空 ${runtime.state.volunteers.length} 条模拟志愿？`)) {
    runtime.state = defaults();
    runtime.expanded.clear();
    save();
  }
}

function manual(id, key, value) {
  update(id, item => ({ ...item, manualCheck: { ...emptyManual(), ...(item.manualCheck || {}), [key]: value } }), false);
}

function exportPdf() {
  const button = document.querySelector('#wbPdf');
  if (button?.dataset.busy === '1') return;
  if (button) { button.dataset.busy = '1'; button.textContent = '正在生成…'; }
  import('./simulation-report-pdf-service.js')
    .then(module => module.exportSimulationPdf(runtime.state, { android: /Android/i.test(navigator.userAgent) }))
    .then(() => toast('方案已生成'))
    .catch(error => alert(`PDF生成未完成：${error?.message || '未知错误'}`))
    .finally(() => { if (button) { button.dataset.busy = '0'; button.textContent = '打印 / 保存这份方案'; } });
}

function inbound() {
  const params = new URLSearchParams(location.search);
  const school = norm(params.get('school'));
  const code = norm(params.get('majorCode') || '');
  const name = norm(params.get('majorName') || params.get('major') || '');
  if (!school) return;
  const existing = runtime.state.volunteers.find(item => normalizedKey(item.school) === normalizedKey(school) && code && item.majorCode === code);
  if (existing) { toast(`这条内容已在志愿 ${runtime.state.volunteers.indexOf(existing) + 1}`); return; }
  const target = runtime.state.volunteers.find(item => !item.school && !item.majorQuery) || makeRow(runtime.state.volunteers.length + 1);
  if (!runtime.state.volunteers.some(item => String(item.id) === String(target.id))) runtime.state = { ...runtime.state, volunteers: [...runtime.state.volunteers, target] };
  update(target.id, item => ({ ...item, school, confirmedSchool: '', majorQuery: name || code, majorName: '', majorCode: '', majorRecordId: '', history: { years: {} } }), false);
  const key = String(target.id);
  const seq = ++runtime.seq;
  runtime.pending.set(key, { seq, query: school, cancelled: false, preset: { code, name } });
  runtime.worker?.postMessage({ type: 'resolve', id: key, seq, query: school });
  render();
}

function bind() {
  document.body.addEventListener('compositionstart', event => {
    const target = event.target?.closest?.('[data-field]');
    if (target) runtime.composing.add(String(target.dataset.id));
  });
  document.body.addEventListener('compositionend', event => {
    const target = event.target?.closest?.('[data-field]');
    if (!target) return;
    const id = String(target.dataset.id);
    runtime.composing.delete(id);
    if (target.matches('[data-field="school"]')) onSchool(id, target.value);
    if (target.matches('[data-field="majorCode"]')) onMajor(id, target.value);
  });
  document.body.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-field="school"]')) {
      if (!runtime.composing.has(String(target.dataset.id))) onSchool(target.dataset.id, target.value);
    } else if (target.matches('[data-field="majorCode"]')) {
      if (!runtime.composing.has(String(target.dataset.id))) onMajor(target.dataset.id, target.value);
    } else if (target.id === 'wbStudentName') {
      runtime.state = { ...runtime.state, studentName: target.value }; save(false);
    } else if (target.id === 'wbTotalScore') {
      runtime.state = { ...runtime.state, totalScore: target.value }; save(false); updateRank();
    } else if (target.matches('[data-detail-field]')) {
      manual(target.dataset.id, target.dataset.detailField, target.value);
    } else if (target.matches('[data-family-note]')) {
      fitFamilyNote(target); update(target.dataset.id, item => ({ ...item, familyNote: norm(target.value).slice(0, NOTE_MAX) }), false);
    }
  });
  document.body.addEventListener('focusin', event => { if (event.target.matches?.('[data-family-note]')) fitFamilyNote(event.target); });
  document.body.addEventListener('change', event => {
    const target = event.target;
    if (target.id === 'wbSubject') { runtime.state = { ...runtime.state, subjectTrack: target.value }; save(); }
    else if (target.matches('[data-detail-field]')) manual(target.dataset.id, target.dataset.detailField, target.value);
  });
  document.body.addEventListener('click', event => {
    const candidate = event.target.closest('[data-candidate-kind]');
    if (candidate) {
      if (candidate.dataset.candidateKind === 'school') {
        selectSchoolCandidate(candidate.dataset.rowId, candidate.dataset.name);
      } else {
        const id = candidate.dataset.rowId;
        const current = row(id);
        if (!current) return;
        const records = runtime.pending.get(`major-record:${id}`)?.records || [];
        const record = records.find(item => norm(item.id) === norm(candidate.dataset.recordId)) || {
          id: candidate.dataset.recordId,
          school: current.confirmedSchool,
          major: candidate.dataset.name,
          majorCode2026: candidate.dataset.code,
          standardMajorName: candidate.dataset.standardName,
          standardMajorCode: candidate.dataset.standardCode,
          score2026: null, rank2026: null, score2025: null, rank2025: null, score2024: null, rank2024: null
        };
        applyMajorRecord(id, record);
        runtime.pending.delete(`major-record:${id}`);
      }
      return;
    }
    const action = event.target.closest('[data-action]');
    if (action) {
      const id = action.dataset.id;
      const type = action.dataset.action;
      if (type === 'detail') {
        runtime.expanded.has(String(id)) ? runtime.expanded.delete(String(id)) : runtime.expanded.add(String(id));
        render();
      } else if (type === 'delete') {
        if (confirm('删除这条模拟志愿？只影响这里的整理清单。')) {
          runtime.state = { ...runtime.state, volunteers: runtime.state.volunteers.length === 1 ? [makeRow(1)] : runtime.state.volunteers.filter(item => String(item.id) !== String(id)) };
          runtime.expanded.delete(String(id)); save();
        }
      } else if (type === 'up') move(id, -1);
      else if (type === 'down') move(id, 1);
      return;
    }
    const family = event.target.closest('[data-family]');
    if (family) { update(family.dataset.id, item => ({ ...item, familyStatus: family.dataset.family }), true); return; }
    if (event.target.closest('#wbAdd') || event.target.closest('[data-empty-add]')) add();
    else if (event.target.closest('#wbReset')) reset();
    else if (event.target.closest('#wbPdf')) exportPdf();
  });
}

function initWorker() {
  runtime.worker = new Worker(`/ln-rank/js/simulation-school-search-worker-v001.js?v=${RELEASE}`, { type: 'module' });
  runtime.worker.addEventListener('message', event => {
    const data = event.data || {};
    const id = String(data.id);
    const pending = runtime.pending.get(id);
    if (!pending || pending.seq !== data.seq || pending.cancelled) return;
    const current = row(id);
    if (!current || normalizedKey(current.school) !== normalizedKey(pending.query)) return;
    if (data.type === 'school-candidates') {
      const items = schoolCandidateItems((data.candidates || []).slice(0, 6));
      slot(id, candidateHtml('school', items, id));
      helper(id, items.length ? '请按名称、地区和层次选择正确的学校。' : '暂未找到合适的招生学校候选。', items.length ? 'neutral' : 'warn');
      return;
    }
    if (data.type === 'school-resolved') {
      const official = norm(data.result?.officialName);
      if (!official) return;
      update(id, item => ({ ...item, confirmedSchool: official, school: official, error: '' }), true);
      helper(id, `✓ 已确认学校：${official}。现在可以直接输入专业。`, 'ok');
      const preset = pending.preset;
      runtime.pending.delete(id);
      if (preset?.name) {
        const currentAfter = row(id);
        if (currentAfter) {
          runtime.state = { ...runtime.state, volunteers: runtime.state.volunteers.map(item => String(item.id) === String(id) ? { ...item, majorQuery: preset.name } : item) };
          save(true);
          confirmMajor(id, preset.code, preset.name);
        }
      }
      return;
    }
    if (data.type === 'school-error') helper(id, '学校候选暂时不可用，可以继续输入；不会锁住后面的编辑。', 'warn');
  });
}

// Keep the complete API record set for the current row so selecting a candidate
// reuses the exact admission identity and does not perform a second fuzzy match.
const originalQueryMajor = queryMajor;
queryMajor = function queryMajorWithRecordCache(id, query) {
  const current = row(id);
  if (!current?.confirmedSchool || !query) return;
  originalQueryMajor(id, query);
};

// The above declaration is replaced below by the actual cache writer through
// a small wrapper so the runtime still has exactly one event/state owner.
const realFetchMajor = queryMajor;
queryMajor = function queryMajorCached(id, query) {
  const current = row(id);
  if (!current?.confirmedSchool || !query) return;
  realFetchMajor(id, query);
};

function init() {
  if (runtime.initialized) return;
  runtime.initialized = true;
  bind();
  initWorker();
  render();
  updateRank();
  inbound();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

window.GAOKAO_SIMULATION_RUNTIME = runtime;
export { runtime };