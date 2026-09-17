import { SCHEMA_VERSION, FAMILY_STATUS, YEARS, canonicalAdmissionIdentity, normalizeSimulationChoice, normalizeHistory, buildSimulationChoiceHref, parseSimulationChoiceHref, writeSimulationChoiceHref, projectIdentity, freeText } from '../../shared/resources/simulation/simulation-choice-contract.v001.js';

const RELEASE = 'v016.67-r157';
const STORE_KEY = 'gaokao:simulation-report:v002';
const LEGACY_KEY = 'gaokao:simulation-report:v001';
const HISTORY_API = '/api/ai/major-history';
const RANK_API = '/api/simulation-rank';
const NOTE_MAX = 1000;
const MAJOR_LIMIT = 12;
const MANUAL = ['institutionCode', 'groupCode', 'campus', 'studyLocation', 'tuition', 'accommodationFee', 'planCount', 'studyLength', 'trainingMode', 'subjectRequirement', 'remark'];
const norm = value => String(value ?? '').normalize('NFKC').replace(/\u00a0/g, ' ').trim();
const lower = value => norm(value).toLowerCase();
const normalizedKey = value => lower(value).replace(/[\s·•,，。；;：:'"“”‘’!！?？_—\-（）()【】\[\]]+/g, '');
const esc = value => String(value ?? '').replace(/[&<>\"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
const rankText = value => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n.toLocaleString('zh-CN') : '—'; };
const emptyManual = () => Object.fromEntries(MANUAL.map(key => [key, '']));
const now = () => new Date().toISOString();

function blankChoice(order = 1) {
  return normalizeSimulationChoice({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, order, state: 'empty', familyStatus: '还没决定', familyNote: '', threeYearHistory: { status: 'idle', years: {} }, source: { module: 'simulation', entry: 'manual', capturedAt: now() }, manualCheck: emptyManual() }, { noteMax: NOTE_MAX });
}
function defaults() {
  return { version: 3, schemaVersion: SCHEMA_VERSION, studentName: '', subjectTrack: '辽宁物理类（物化生）', totalScore: '', scores: { chinese: '', math: '', english: '', physics: '', chemistry: '', biology: '' }, rank: null, volunteers: [blankChoice(1)] };
}
function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function normalizeChoice(source, order, fallbackSource = 'simulation') {
  const value = normalizeSimulationChoice(source, { noteMax: NOTE_MAX, sourceModule: fallbackSource });
  return { ...value, order, manualCheck: { ...emptyManual(), ...(source?.manualCheck || {}) } };
}
function load() {
  const source = read(STORE_KEY) || read(LEGACY_KEY); if (!source || !Array.isArray(source.volunteers)) return defaults();
  const base = defaults(); return { ...base, ...source, version: 3, schemaVersion: SCHEMA_VERSION, scores: { ...base.scores, ...(source.scores || {}) }, volunteers: source.volunteers.length ? source.volunteers.map((item, index) => normalizeChoice(item, index + 1)) : [blankChoice(1)] };
}
const runtime = { version: RELEASE, state: load(), worker: null, seq: 0, pending: new Map(), timers: new Map(), controllers: new Map(), rankController: null, expanded: new Set(), composing: new Set(), initialized: false };
function save(notify = true) {
  runtime.state = { ...runtime.state, version: 3, schemaVersion: SCHEMA_VERSION, volunteers: runtime.state.volunteers.map((item, index) => ({ ...normalizeChoice(item, index + 1), manualCheck: { ...emptyManual(), ...(item.manualCheck || {}) }, updatedAt: now() })) };
  localStorage.setItem(STORE_KEY, JSON.stringify(runtime.state)); if (notify) render();
}
function row(id) { return runtime.state.volunteers.find(item => String(item.id) === String(id)); }
function update(id, mutate, notify = true) {
  if (!row(id)) return;
  runtime.state = { ...runtime.state, volunteers: runtime.state.volunteers.map(item => String(item.id) === String(id) ? normalizeChoice(mutate({ ...item }), item.order) : item) };
  save(notify);
}
function toast(text) { document.querySelector('.sim-toast')?.remove(); const element = document.createElement('div'); element.className = 'sim-toast'; element.textContent = text; document.body.appendChild(element); setTimeout(() => element.remove(), 2400); }
function rowStatus(item) {
  if (!item.school) return ['incomplete', '先选择学校'];
  if (!item.confirmedSchool || normalizedKey(item.confirmedSchool) !== normalizedKey(item.school)) return ['needs-check', '已填学校，请从候选中确认'];
  if (!item.majorQuery) return ['incomplete', '再输入专业'];
  if (!item.majorRecordId || !item.major || !item.majorCode2026) return ['needs-check', '从该校实际专业中选一项'];
  if (item.state === 'history-error') return ['needs-check', '历史记录暂时无法获取'];
  return ['complete', '学校、专业和参考记录已对应'];
}
function historyText(item, year) {
  const value = item?.threeYearHistory?.years?.[year]; if (!value) return '暂无对应投档记录';
  if (value.status === 'loading') return '正在查询…'; if (value.status === 'error') return '暂时无法获取，请稍后重试';
  if (value.status === 'missing' || (!value.score && !value.rank)) return '暂无对应投档记录';
  return `${value.score == null ? '—' : `${value.score}分`} / ${value.rank == null ? '—' : `${rankText(value.rank)}位`}`;
}
function delta(item) { const admissionRank = Number(item?.threeYearHistory?.years?.[2026]?.rank), currentRank = Number(runtime.state.rank); if (!Number.isFinite(admissionRank) || !Number.isFinite(currentRank) || currentRank <= 0) return '—'; const difference = admissionRank - currentRank; return difference === 0 ? '同位次' : `${difference > 0 ? '+' : ''}${difference.toLocaleString('zh-CN')}名`; }
function step(done, current) { return done ? 'step-done' : current ? 'step-current' : 'step-wait'; }
function stepsHtml(item) {
  const schoolDone = Boolean(item.confirmedSchool && normalizedKey(item.confirmedSchool) === normalizedKey(item.school)), majorEntered = Boolean(item.majorQuery), majorDone = Boolean(item.majorRecordId && item.major && item.majorCode2026);
  return `<ol class="step-rail" aria-label="这条志愿整理进度"><li class="${step(schoolDone, !schoolDone)}"><span class="step-num">1</span><span class="step-copy"><b>学校</b><small>${schoolDone ? '已确认' : item.school ? '等你确认' : '先选学校'}</small></span></li><li class="${step(majorDone, schoolDone && !majorDone)}"><span class="step-num">2</span><span class="step-copy"><b>专业</b><small>${majorDone ? '已确认' : majorEntered ? '请选择实际专业' : '选择学校后填写'}</small></span></li><li class="${step(majorDone, majorDone)}"><span class="step-num">3</span><span class="step-copy"><b>三年历史</b><small>${item.threeYearHistory?.status === 'error' ? '查询失败，可稍后重试' : majorDone ? '随同一招生记录' : '选定专业后显示'}</small></span></li></ol>`;
}
function manualHtml(item) {
  if (!runtime.expanded.has(String(item.id))) return '';
  return `<section class="detail-panel"><div class="detail-grid">${MANUAL.map(key => { const label = { institutionCode: '院校代码', groupCode: '专业组/招生代码', campus: '校区', studyLocation: '实际培养地点', tuition: '学费', accommodationFee: '住宿费', planCount: '2026招生计划', studyLength: '学制', trainingMode: '培养方式', subjectRequirement: '选科要求', remark: '专业备注/特殊限制' }[key]; return `<label class="manual-field"><span>${label}</span>${key === 'remark' ? `<textarea data-detail-field="${key}" data-id="${esc(item.id)}" rows="2">${esc(item.manualCheck?.[key] || '')}</textarea>` : `<input data-detail-field="${key}" data-id="${esc(item.id)}" value="${esc(item.manualCheck?.[key] || '')}" />`}</label>`; }).join('')}</div><p>这些是你们自己的核对记录；空白不代表官方资料不存在。</p></section>`;
}
function familyHtml(item) {
  const selected = FAMILY_STATUS.includes(item.familyStatus) ? item.familyStatus : '还没决定';
  return `<section class="family-record" aria-label="家庭处理"><div class="family-record-head"><strong>家庭处理</strong><span>记录这条志愿准备怎么处理，以及讨论后的原因。</span></div><div class="family-decision">${FAMILY_STATUS.map(value => `<button type="button" data-family="${esc(value)}" data-id="${esc(item.id)}" aria-pressed="${selected === value ? 'true' : 'false'}">${esc(value)}</button>`).join('')}</div><label class="family-note-field"><span>备注</span><textarea data-family-note data-id="${esc(item.id)}" maxlength="${NOTE_MAX}" rows="2" placeholder="例如：学费可以接受，但校区需要再核实；家里暂时倾向保留。">${esc(item.familyNote || '')}</textarea><small>可写多句，输入内容会自动保存。</small></label></section>`;
}
function historyHtml(item) { return `<section class="history-grid" aria-label="三年参考记录">${YEARS.map(year => `<div class="history-cell"><span>${year}</span><strong>${historyText(item, year)}</strong></div>`).join('')}<div class="history-cell history-delta"><span>相对当前</span><strong>${esc(delta(item))}</strong></div></section>`; }
function cardHtml(item, index, total) {
  const [kind, label] = rowStatus(item), expanded = runtime.expanded.has(String(item.id)), confirmed = item.confirmedSchool && normalizedKey(item.confirmedSchool) === normalizedKey(item.school), majorLabel = item.major ? `${item.major} · 招生代码 ${item.majorCode2026}` : '选学校后，这里只显示该校实际招生专业', identity = canonicalAdmissionIdentity(item);
  return `<article class="volunteer-card" data-card-id="${esc(item.id)}" data-row-state="${kind}"><div class="card-head"><div class="order-badge">${index + 1}</div><div class="card-heading"><strong>志愿 ${index + 1}</strong><span>${confirmed ? esc(item.confirmedSchool) : '学校确认后才能选择专业'}</span></div><div class="card-tools"><button type="button" data-action="up" data-id="${esc(item.id)}" ${index === 0 ? 'disabled' : ''}>↑ 上移</button><button type="button" data-action="down" data-id="${esc(item.id)}" ${index === total - 1 ? 'disabled' : ''}>↓ 下移</button><button type="button" data-action="delete" data-id="${esc(item.id)}">删除</button></div></div>${stepsHtml(item)}<div class="selection-grid"><div class="card-field"><label>学校</label><input data-field="school" data-id="${esc(item.id)}" value="${esc(item.school)}" placeholder="输入学校名称" autocomplete="off" enterkeyhint="search" /></div><div class="card-field"><label>专业</label><input data-field="majorCode" data-id="${esc(item.id)}" value="${esc(item.majorQuery || '')}" placeholder="例如 冶金工程" autocomplete="off" enterkeyhint="search" /><div class="major-caption">${esc(majorLabel)}</div><div class="input-helper" data-helper-id="${esc(item.id)}"></div></div></div><div class="candidate-slot" data-candidate-slot="${esc(item.id)}"></div><div class="record-identity" ${item.majorRecordId ? '' : 'hidden'}><span>已对应：${esc(item.major)} · 招生代码 ${esc(item.majorCode2026)}</span><small>${esc(projectIdentity(item).label)} · ${identity.kind}: ${esc(identity.value)}</small></div>${historyHtml(item)}<div class="state-line ${kind}"><span>${label}</span><button type="button" data-action="detail" data-id="${esc(item.id)}">${expanded ? '收起核对' : '展开核对'}</button></div>${manualHtml(item)}${familyHtml(item)}</article>`;
}
function fitFamilyNote(element) { if (!element) return; element.style.height = 'auto'; const max = 180; element.style.height = `${Math.min(Math.max(element.scrollHeight, 68), max)}px`; element.style.overflowY = element.scrollHeight > max ? 'auto' : 'hidden'; }
function render() {
  const s = runtime.state, name = document.querySelector('#wbStudentName'), subject = document.querySelector('#wbSubject'), score = document.querySelector('#wbTotalScore'), rank = document.querySelector('#wbRank'), source = document.querySelector('#wbRankSource');
  if (name && document.activeElement !== name) name.value = s.studentName || ''; if (subject && document.activeElement !== subject) subject.value = s.subjectTrack || '辽宁物理类（物化生）'; if (score && document.activeElement !== score) score.value = s.totalScore || ''; if (rank) rank.textContent = rankText(s.rank); if (source) source.textContent = s.rank ? '2026辽宁物理类官方成绩统计口径' : '输入总分后自动换算';
  const list = document.querySelector('#wbRows'); if (list) { list.innerHTML = s.volunteers.map((item, index) => cardHtml(item, index, s.volunteers.length)).join(''); list.querySelectorAll('[data-family-note]').forEach(fitFamilyNote); }
  const empty = document.querySelector('#wbEmpty'); if (empty) empty.hidden = s.volunteers.length > 0;
  const status = document.querySelector('#wbStatus'); if (status) status.textContent = s.volunteers.length ? '一条志愿只要确认学校、专业和参考记录，其他核对可以后补。' : '先加入一所已经考虑过的学校即可。';
  const summary = document.querySelector('#wbSummary'); if (summary) { const count = s.volunteers.reduce((acc, item) => { const [kind] = rowStatus(item); if (kind === 'complete') acc.complete++; else if (kind === 'needs-check') acc.check++; else acc.incomplete++; return acc; }, { complete: 0, check: 0, incomplete: 0 }); summary.innerHTML = `<span>共 ${s.volunteers.length} 条</span><span>✓ ${count.complete} 条已对应</span><span>⚠ ${count.check} 条待确认</span><span>○ ${count.incomplete} 条待填写</span>`; }
}
function slot(id, html) { const element = document.querySelector(`[data-candidate-slot="${CSS.escape(String(id))}"]`); if (element) element.innerHTML = html; }
function helper(id, text, tone = 'neutral') { const element = document.querySelector(`[data-helper-id="${CSS.escape(String(id))}"]`); if (element) { element.textContent = text; element.dataset.tone = tone; } }
function candidateHtml(kind, items, id) { if (!items.length) return '<div class="candidate-empty">暂未找到合适候选，请继续输入。</div>'; const title = kind === 'school' ? '找到以下招生学校，请确认你想要的那一所' : '该校 2026 实际招生专业：请按名称和招生代码确认'; return `<div class="candidate-title">${title}</div><div class="candidate-list">${items.map(item => `<button type="button" class="candidate" data-candidate-kind="${kind}" data-row-id="${esc(id)}" data-name="${esc(item.name)}" data-record-id="${esc(item.id || '')}" data-code="${esc(item.code || '')}"><span class="candidate-main"><strong>${esc(item.name)}</strong><small>${esc(item.meta || '')}</small></span>${kind === 'major' ? `<span class="candidate-history">${esc(item.historyText || '')}</span>` : ''}<span class="candidate-action">选择</span></button>`).join('')}</div>`; }
function scheduleSchoolSearch(id, query) { clearTimeout(runtime.timers.get(String(id))); if (!query) { slot(id, ''); return; } runtime.timers.set(String(id), setTimeout(() => { const seq = ++runtime.seq, key = String(id), previous = runtime.pending.get(key); if (previous) previous.cancelled = true; runtime.pending.set(key, { seq, query, cancelled: false }); runtime.worker?.postMessage({ type: 'search', id: key, seq, query }); }, 120)); }
function clearUrl() { if (!globalThis.history?.replaceState) return; const current = new URL(location.href); ['school', 'schoolCode', 'majorName', 'majorCode2026', 'majorCode', 'majorRecordId', 'source', 'entry'].forEach(key => current.searchParams.delete(key)); history.replaceState({ ...(history.state || {}), simulationChoice: null }, '', `${current.pathname}${current.search}${current.hash}`); }
function onSchool(id, value) {
  const query = norm(value); if (!row(id)) return; runtime.controllers.get(String(id))?.abort(); runtime.controllers.get(`major:${id}`)?.abort(); const pending = runtime.pending.get(String(id)); if (pending) pending.cancelled = true;
  update(id, item => ({ ...item, school: query, confirmedSchool: '', schoolCode: '', majorQuery: '', major: '', majorCode2026: '', majorRecordId: '', standardMajorName: '', standardMajorCode: '', admissionProject: {}, canonicalAdmissionKey: '', threeYearHistory: normalizeHistory({ status: 'idle', years: {} }), state: query ? 'school-entered' : 'empty', error: '' }), false); clearUrl();
  if (!query) { clearTimeout(runtime.timers.get(String(id))); slot(id, ''); helper(id, '输入学校名称，不需要等待页面刷新。'); return; } helper(id, '正在查找招生学校候选…'); scheduleSchoolSearch(id, query);
}
function onMajor(id, value) {
  const query = norm(value), current = row(id); if (!current) return; runtime.controllers.get(`major:${id}`)?.abort();
  update(id, item => ({ ...item, majorQuery: query, major: '', majorCode2026: '', majorRecordId: '', standardMajorName: '', standardMajorCode: '', admissionProject: { ...item.admissionProject, majorCode2026: '', majorRecordId: '' }, canonicalAdmissionKey: '', threeYearHistory: normalizeHistory({ status: 'idle', years: {} }), state: item.confirmedSchool ? (query ? 'major-searching' : 'school-confirmed') : 'school-entered', error: '' }), false); clearUrl();
  if (!current.confirmedSchool) { slot(id, ''); helper(id, '请先确认学校；确认后这里只显示该校实际招生专业。'); return; } if (!query) { slot(id, ''); helper(id, '输入专业名称，可以只输入一部分。'); return; }
  helper(id, `${current.confirmedSchool} · 正在找实际招生专业…`); clearTimeout(runtime.timers.get(`major:${id}`)); runtime.timers.set(`major:${id}`, setTimeout(() => queryMajor(id, query), 180));
}
async function queryMajor(id, query) {
  const current = row(id); if (!current?.confirmedSchool || !query) return; const key = `major:${id}`; runtime.controllers.get(key)?.abort(); const controller = new AbortController(); runtime.controllers.set(key, controller);
  try {
    update(id, item => ({ ...item, state: 'history-loading', threeYearHistory: normalizeHistory({ status: 'loading', years: {} }) }), false);
    const params = new URLSearchParams({ schoolKeyword: current.confirmedSchool, major: query, limit: '120', offset: '0' }); const response = await fetch(`${HISTORY_API}?${params}`, { headers: { accept: 'application/json' }, signal: controller.signal }); const data = await response.json(); if (!response.ok || data?.ok === false) throw new Error(data?.message || `HTTP ${response.status}`);
    const records = Array.isArray(data.records) ? data.records : [], latest = row(id); if (!latest || latest.majorQuery !== query || normalizedKey(latest.confirmedSchool) !== normalizedKey(current.confirmedSchool)) return; const queryKey = normalizedKey(query), codeQuery = queryKey.replace(/\D/g, '') ? queryKey : '';
    const candidates = records.filter(record => normalizedKey(record.school) === normalizedKey(latest.confirmedSchool)).map(record => {
      const name = norm(record.major), code = norm(record.majorCode2026 || record.majorCode || ''), nameKey = normalizedKey(name), codeKey = normalizedKey(code); const exactName = nameKey === queryKey, prefixName = nameKey.startsWith(queryKey), containName = nameKey.includes(queryKey), exactCode = Boolean(codeQuery && codeKey === queryKey), prefixCode = Boolean(codeQuery && codeKey.startsWith(queryKey));
      const historyCount = YEARS.filter(year => { const score = Number(record[`score${year}`]), rank = Number(record[`rank${year}`]); return (Number.isFinite(score) && score > 0) || (Number.isFinite(rank) && rank > 0); }).length;
      return { ...record, id: norm(record.id), name, code, score: (exactName ? 10000 : prefixName ? 8000 : containName ? 6000 : 0) + (exactCode ? 4000 : prefixCode ? 2000 : 0), historyText: `${historyCount} 年有记录 · ${projectIdentity(record).label}`, meta: `招生代码 ${code || '待核对'} · ${projectIdentity(record).label}` };
    }).filter(item => item.name && item.id && item.score > 0).sort((a, b) => b.score - a.score || a.name.length - b.name.length || a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id, 'zh-CN')).filter((item, index, list) => list.findIndex(other => other.id === item.id) === index).slice(0, MAJOR_LIMIT);
    runtime.pending.set(`major-record:${id}`, { query, records: candidates }); update(id, item => ({ ...item, state: candidates.length ? 'major-results' : 'major-search-empty', threeYearHistory: normalizeHistory({ status: 'idle', years: {} }) }), false); slot(id, candidateHtml('major', candidates, id)); helper(id, candidates.length ? `找到 ${candidates.length} 个该校实际招生专业，请按名称和招生代码选择。` : '暂未找到与这个输入对应的该校实际招生专业。', candidates.length ? 'neutral' : 'warn');
  } catch (error) {
    if (error?.name !== 'AbortError') { update(id, item => ({ ...item, state: 'history-error', error: `暂时无法获取，请稍后重试：${String(error?.message || '查询失败')}`, threeYearHistory: normalizeHistory({ status: 'error', years: {} }) }), false); slot(id, ''); helper(id, '暂时无法获取，请稍后重试。没有把请求失败当成“无记录”。', 'warn'); }
  } finally { if (runtime.controllers.get(key) === controller) runtime.controllers.delete(key); save(false); }
}
function yearFromRecord(record, year) { const score = Number(record?.[`score${year}`]), rank = Number(record?.[`rank${year}`]), hasScore = Number.isFinite(score) && score > 0, hasRank = Number.isFinite(rank) && rank > 0; return { status: hasScore || hasRank ? 'history' : 'missing', score: hasScore ? score : null, rank: hasRank ? rank : null, recordId: norm(record?.id) }; }
function historyFromRecord(record) { const recordId = norm(record?.id); return { status: 'ready', recordId, years: Object.fromEntries(YEARS.map(year => [year, yearFromRecord(record, year)])) }; }
function applyMajorRecord(id, record, sourceEntry = 'manual') {
  const current = row(id), recordId = norm(record?.id), name = norm(record?.major), code = norm(record?.majorCode2026 || record?.majorCode || ''); if (!current || !recordId || !name || !code) { helper(id, '这条专业缺少招生名称、招生代码或记录编号，不能安全对应历史。', 'warn'); return false; }
  const normalized = normalizeSimulationChoice({ ...current, school: norm(record.school || current.school), schoolCode: norm(record.schoolCode2026 || current.schoolCode), majorQuery: current.majorQuery || name, major: name, majorCode2026: code, majorRecordId: recordId, standardMajorName: norm(record.standardMajorName), standardMajorCode: norm(record.standardMajorCode), admissionProject: { ...projectIdentity(record), schoolCode2026: norm(record.schoolCode2026 || current.schoolCode), majorCode2026: code, majorRecordId: recordId }, canonicalAdmissionKey: canonicalAdmissionIdentity({ majorRecordId: recordId, schoolCode: record.schoolCode2026 || current.schoolCode, majorCode2026: code }).value, threeYearHistory: historyFromRecord(record), state: 'record-confirmed', error: '', source: { module: current.source?.module || 'simulation', entry: sourceEntry, capturedAt: now() }, updatedAt: now() }, { noteMax: NOTE_MAX });
  runtime.state = { ...runtime.state, volunteers: runtime.state.volunteers.map(item => String(item.id) === String(id) ? { ...normalized, manualCheck: { ...emptyManual(), ...(current.manualCheck || {}) } } : item) }; save(true); slot(id, ''); writeSimulationChoiceHref(normalized, { replace: true, noteMax: NOTE_MAX }); const count = YEARS.filter(year => normalized.threeYearHistory.years[year].status === 'history').length; helper(id, `✓ 已确认：${normalized.school} · ${name} · 招生代码 ${code}。${count} 年有对应记录。`, 'ok'); return true;
}
function selectSchoolCandidate(id, name, code = '') { const value = norm(name); if (!value || !row(id)) return; const pending = runtime.pending.get(String(id)); if (pending) pending.cancelled = true; runtime.controllers.get(String(id))?.abort(); clearTimeout(runtime.timers.get(String(id))); update(id, item => ({ ...item, school: value, confirmedSchool: value, schoolCode: norm(code), majorQuery: '', major: '', majorCode2026: '', majorRecordId: '', standardMajorName: '', standardMajorCode: '', admissionProject: {}, canonicalAdmissionKey: '', threeYearHistory: normalizeHistory({ status: 'idle', years: {} }), state: 'school-confirmed', error: '' })); clearUrl(); helper(id, `✓ 已确认学校：${value}。现在可以直接输入专业。`, 'ok'); }
async function loadExactInbound(id, link) {
  const current = row(id); if (!current || !link.majorRecordId || !link.major) return; const key = `inbound:${id}`; runtime.controllers.get(key)?.abort(); const controller = new AbortController(); runtime.controllers.set(key, controller);
  update(id, item => ({ ...item, school: link.school, confirmedSchool: link.school, schoolCode: link.schoolCode, majorQuery: link.major, state: 'history-loading', error: '', threeYearHistory: normalizeHistory({ status: 'loading', years: {} }) }), false);
  try {
    const params = new URLSearchParams({ schoolKeyword: link.school, major: link.major, limit: '120', offset: '0' }); const response = await fetch(`${HISTORY_API}?${params}`, { headers: { accept: 'application/json' }, signal: controller.signal }); const data = await response.json(); if (!response.ok || data?.ok === false) throw new Error(data?.message || `HTTP ${response.status}`);
    const exact = (Array.isArray(data.records) ? data.records : []).find(record => norm(record.id) === link.majorRecordId && (!link.majorCode2026 || norm(record.majorCode2026) === link.majorCode2026) && (!link.schoolCode || norm(record.schoolCode2026) === link.schoolCode) && normalizedKey(record.school) === normalizedKey(link.school) && norm(record.major) === link.major);
    if (!exact) { update(id, item => ({ ...item, state: 'record-missing', error: '没有找到这条招生记录；页面没有用模糊专业替代。', threeYearHistory: normalizeHistory({ status: 'ready', recordId: link.majorRecordId, years: {} }, link.majorRecordId) })); helper(id, '没有找到这条具体招生记录；页面没有改用近似专业代替。请回原模块重新确认。', 'warn'); return; }
    applyMajorRecord(id, { ...exact, schoolCode2026: exact.schoolCode2026 || link.schoolCode }, 'deep-link'); toast('已按招生记录编号恢复这条志愿');
  } catch (error) { if (error?.name !== 'AbortError') { update(id, item => ({ ...item, state: 'history-error', error: `暂时无法获取，请稍后重试：${String(error?.message || '查询失败')}`, threeYearHistory: normalizeHistory({ status: 'error', years: {} }, link.majorRecordId) }), false); helper(id, '暂时无法获取，请稍后重试。深链身份已经保留，没有降级成模糊匹配。', 'warn'); } }
  finally { if (runtime.controllers.get(key) === controller) runtime.controllers.delete(key); save(false); }
}
function inbound() {
  const link = parseSimulationChoiceHref(location); if (!link.school) return; let target = link.majorRecordId ? runtime.state.volunteers.find(item => item.majorRecordId === link.majorRecordId) : null; if (!target) target = runtime.state.volunteers.find(item => !item.school && !item.majorQuery) || null; if (!target) { target = blankChoice(runtime.state.volunteers.length + 1); runtime.state = { ...runtime.state, volunteers: [...runtime.state.volunteers, target] }; }
  const id = String(target.id); if (link.majorRecordId && link.major) { void loadExactInbound(id, link); return; }
  update(id, item => ({ ...item, school: link.school, confirmedSchool: link.schoolCode ? link.school : '', schoolCode: link.schoolCode, majorQuery: link.major, source: link.source, state: link.schoolCode ? 'school-confirmed' : 'school-entered' }));
  if (link.major) { slot(id, ''); helper(id, link.schoolCode ? '已带入学校，请从该校实际招生专业中选择。' : '已带入学校，请先确认学校候选，再选择实际招生专业。'); if (link.schoolCode) void queryMajor(id, link.major); }
}
function updateRank() {
  const score = Math.round(Number(String(runtime.state.totalScore || '').trim())), rankElement = document.querySelector('#wbRank'), sourceElement = document.querySelector('#wbRankSource'); if (!Number.isFinite(score) || score < 150 || score > 750) { if (runtime.state.rank !== null) { runtime.state = { ...runtime.state, rank: null }; save(false); } if (rankElement) rankElement.textContent = '—'; if (sourceElement) sourceElement.textContent = '输入总分后自动换算'; return; }
  runtime.rankController?.abort(); const controller = new AbortController(); runtime.rankController = controller; fetch(`${RANK_API}?score=${score}`, { headers: { accept: 'application/json' }, signal: controller.signal }).then(async response => { const data = await response.json(); if (!response.ok || data?.ok === false) throw new Error(); return data; }).then(data => { if (String(runtime.state.totalScore) !== String(score)) return; runtime.state = { ...runtime.state, rank: data.rank ?? null }; save(false); if (rankElement) rankElement.textContent = rankText(runtime.state.rank); if (sourceElement) sourceElement.textContent = '2026辽宁物理类官方成绩统计口径'; }).catch(error => { if (error?.name !== 'AbortError') toast('分数位次暂时无法读取'); }).finally(() => { if (runtime.rankController === controller) runtime.rankController = null; });
}
function move(id, direction) { const list = [...runtime.state.volunteers], i = list.findIndex(item => String(item.id) === String(id)), j = i + direction; if (i < 0 || j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; runtime.state = { ...runtime.state, volunteers: list.map((item, index) => ({ ...item, order: index + 1, updatedAt: now() })) }; save(); }
function add() { const s = runtime.state; if (s.volunteers.some(item => !item.school && !item.majorQuery)) { toast('已有一条空白志愿，直接填写即可'); return; } if (s.volunteers.length >= 30) { toast('最多整理 30 条志愿'); return; } runtime.state = { ...s, volunteers: [...s.volunteers, blankChoice(s.volunteers.length + 1)] }; save(); }
function reset() { if (confirm(`确定清空 ${runtime.state.volunteers.length} 条模拟志愿？`)) { runtime.state = defaults(); runtime.expanded.clear(); clearUrl(); save(); } }
function manual(id, key, value) { update(id, item => ({ ...item, manualCheck: { ...emptyManual(), ...(item.manualCheck || {}), [key]: value } }), false); }
function exportPdf() { const button = document.querySelector('#wbPdf'); if (button?.dataset.busy === '1') return; if (button) { button.dataset.busy = '1'; button.textContent = '正在生成…'; } import('./simulation-report-pdf-service.js').then(module => module.exportSimulationPdf(runtime.state, { android: /Android/i.test(navigator.userAgent) })).then(() => toast('方案已生成')).catch(error => alert(`PDF生成未完成：${error?.message || '未知错误'}`)).finally(() => { if (button) { button.dataset.busy = '0'; button.textContent = '打印 / 保存这份方案'; } }); }
function initWorker() {
  runtime.worker = new Worker(`/ln-rank/js/simulation-school-search-worker-v001.js?v=${RELEASE}`, { type: 'module' });
  runtime.worker.addEventListener('message', event => {
    const data = event.data || {}, id = String(data.id), pending = runtime.pending.get(id); if (!pending || pending.seq !== data.seq || pending.cancelled) return; const current = row(id); if (!current || normalizedKey(current.school) !== normalizedKey(pending.query)) return;
    if (data.type === 'school-candidates') { const items = (data.candidates || []).slice(0, 6).map(item => ({ name: norm(item.officialName || item.name), code: norm(item.schoolCode2026 || item.schoolCode || ''), meta: [item.province, item.city, item.level].map(norm).filter(Boolean).join(' · ') })); slot(id, candidateHtml('school', items, id)); helper(id, items.length ? '请按名称、地区和层次选择正确的学校。' : '暂未找到合适的招生学校候选。', items.length ? 'neutral' : 'warn'); }
    else if (data.type === 'school-resolved') { const official = norm(data.result?.officialName); if (!official) return; selectSchoolCandidate(id, official, norm(data.result?.schoolCode2026 || data.result?.schoolCode || '')); runtime.pending.delete(id); }
    else if (data.type === 'school-error') helper(id, '学校候选暂时不可用，可以继续输入；不会锁住后面的编辑。', 'warn');
  });
}
function bind() {
  document.body.addEventListener('compositionstart', event => { const target = event.target?.closest?.('[data-field]'); if (target) runtime.composing.add(String(target.dataset.id)); });
  document.body.addEventListener('compositionend', event => { const target = event.target?.closest?.('[data-field]'); if (!target) return; const id = String(target.dataset.id); runtime.composing.delete(id); if (target.matches('[data-field="school"]')) onSchool(id, target.value); else if (target.matches('[data-field="majorCode"]')) onMajor(id, target.value); });
  document.body.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-field="school"]')) { if (!runtime.composing.has(String(target.dataset.id))) onSchool(target.dataset.id, target.value); }
    else if (target.matches('[data-field="majorCode"]')) { if (!runtime.composing.has(String(target.dataset.id))) onMajor(target.dataset.id, target.value); }
    else if (target.id === 'wbStudentName') { runtime.state = { ...runtime.state, studentName: target.value }; save(false); }
    else if (target.id === 'wbTotalScore') { runtime.state = { ...runtime.state, totalScore: target.value }; save(false); updateRank(); }
    else if (target.matches('[data-detail-field]')) manual(target.dataset.id, target.dataset.detailField, target.value);
    else if (target.matches('[data-family-note]')) { fitFamilyNote(target); update(target.dataset.id, item => ({ ...item, familyNote: freeText(target.value).slice(0, NOTE_MAX) }), false); }
  });
  document.body.addEventListener('focusin', event => { if (event.target.matches?.('[data-family-note]')) fitFamilyNote(event.target); });
  document.body.addEventListener('change', event => { const target = event.target; if (target.id === 'wbSubject') { runtime.state = { ...runtime.state, subjectTrack: target.value }; save(); } else if (target.matches('[data-detail-field]')) manual(target.dataset.id, target.dataset.detailField, target.value); });
  document.body.addEventListener('click', event => {
    const candidate = event.target.closest('[data-candidate-kind]');
    if (candidate) { const id = candidate.dataset.rowId; if (candidate.dataset.candidateKind === 'school') selectSchoolCandidate(id, candidate.dataset.name, candidate.dataset.code || ''); else { const cache = runtime.pending.get(`major-record:${id}`), record = cache?.records?.find(item => norm(item.id) === norm(candidate.dataset.recordId)); if (record) applyMajorRecord(id, record, 'manual'); else helper(id, '这条专业候选已过期，请重新输入专业。', 'warn'); } return; }
    const action = event.target.closest('[data-action]');
    if (action) { const id = action.dataset.id, type = action.dataset.action; if (type === 'detail') { runtime.expanded.has(String(id)) ? runtime.expanded.delete(String(id)) : runtime.expanded.add(String(id)); render(); } else if (type === 'delete') { if (confirm('删除这条模拟志愿？只影响这里的整理清单。')) { runtime.state = { ...runtime.state, volunteers: runtime.state.volunteers.length === 1 ? [blankChoice(1)] : runtime.state.volunteers.filter(item => String(item.id) !== String(id)) }; runtime.expanded.delete(String(id)); save(); } } else if (type === 'up') move(id, -1); else if (type === 'down') move(id, 1); return; }
    const family = event.target.closest('[data-family]'); if (family) { update(family.dataset.id, item => ({ ...item, familyStatus: family.dataset.family }), true); return; }
    if (event.target.closest('#wbAdd') || event.target.closest('[data-empty-add]')) add(); else if (event.target.closest('#wbReset')) reset(); else if (event.target.closest('#wbPdf')) exportPdf();
  });
}
function init() { if (runtime.initialized) return; runtime.initialized = true; bind(); initWorker(); render(); updateRank(); inbound(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
window.GAOKAO_SIMULATION_RUNTIME = runtime;
window.GAOKAO_SIMULATION_CHOICE = { buildSimulationChoiceHref };
export { runtime, buildSimulationChoiceHref, normalizeSimulationChoice, canonicalAdmissionIdentity };
