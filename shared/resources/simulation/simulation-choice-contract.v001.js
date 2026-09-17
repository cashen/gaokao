const SCHEMA_VERSION = 'simulation-choice-v001';
const YEARS = [2026, 2025, 2024];
const FAMILY_STATUS = ['继续考虑', '候选', '还没决定', '排除'];
const SOURCE_MODULES = ['simulation', 'ln-rank', 'tongxue', 'major-path', 'aiplus', 'unknown'];

const text = value => String(value ?? '').normalize('NFKC').replace(/\u00a0/g, ' ').trim();
const freeText = value => String(value ?? '').replace(/\u00a0/g, ' ').trim();
const key = value => text(value).toLowerCase().replace(/[\s·•,，。；;：:'"“”‘’!！?？_—\-（）()【】\[\]]+/g, '');
const now = () => new Date().toISOString();

function projectIdentity(record = {}) {
  const major = text(record.major || record.majorName);
  const isSino = /中外|合作办学|国际项目|联合培养|高收费/.test(major);
  const isSpecial = /预科|民族班|定向|专项|实验班|试验班|卓越班|拔尖|师范类/.test(major);
  return { kind: isSino ? 'sino' : isSpecial ? 'special' : 'ordinary', label: isSino ? '中外合作/高收费（需核验）' : isSpecial ? '特殊培养/项目（需核验）' : '普通项目' };
}

function canonicalAdmissionIdentity(value = {}) {
  const recordId = text(value.majorRecordId || value.recordId);
  const schoolCode = text(value.schoolCode || value.schoolCode2026);
  const majorCode2026 = text(value.majorCode2026 || value.majorCode);
  if (recordId) return { kind: 'majorRecordId', value: recordId };
  if (schoolCode && majorCode2026) return { kind: 'schoolCode+majorCode2026', value: `${schoolCode}::${majorCode2026}` };
  return { kind: 'incomplete', value: '' };
}

function yearStatus(value) {
  const score = Number(value?.score), rank = Number(value?.rank);
  const hasScore = Number.isFinite(score) && score > 0, hasRank = Number.isFinite(rank) && rank > 0;
  if (value?.status === 'loading' || value?.status === 'error') return value.status;
  return hasScore || hasRank ? 'history' : 'missing';
}
function normalizeYear(value, recordId = '') {
  const score = Number(value?.score), rank = Number(value?.rank);
  return { status: yearStatus(value), score: Number.isFinite(score) && score > 0 ? score : null, rank: Number.isFinite(rank) && rank > 0 ? rank : null, recordId: text(value?.recordId || recordId) };
}
function normalizeHistory(value, recordId = '') {
  const source = value?.years || value || {};
  const status = ['idle', 'loading', 'ready', 'error'].includes(text(value?.status)) ? text(value.status) : 'ready';
  return { status, recordId: text(value?.recordId || recordId), years: Object.fromEntries(YEARS.map(year => [year, normalizeYear(source[year], recordId)])), updatedAt: text(value?.updatedAt) || now() };
}
function normalizeSource(value, fallback = 'simulation') {
  const raw = value && typeof value === 'object' ? value : { module: value };
  const module = SOURCE_MODULES.includes(text(raw.module)) ? text(raw.module) : fallback;
  return { module, entry: text(raw.entry || 'manual') || 'manual', href: text(raw.href || ''), capturedAt: text(raw.capturedAt) || now() };
}
function normalizeSimulationChoice(input = {}, options = {}) {
  const recordId = text(input.majorRecordId || input.recordId);
  const schoolCode = text(input.schoolCode || input.schoolCode2026);
  const majorCode2026 = text(input.majorCode2026 || input.majorCode);
  const school = text(input.school || input.confirmedSchool);
  const confirmedSchool = text(input.confirmedSchool || (recordId && school ? school : ''));
  const major = text(input.major || input.majorName);
  const createdAt = text(input.createdAt) || now(), updatedAt = text(input.updatedAt) || now();
  const inferredProject = projectIdentity({ major });
  const admissionProject = { ...inferredProject, ...(input.admissionProject && typeof input.admissionProject === 'object' ? input.admissionProject : {}), schoolCode2026: schoolCode, majorCode2026, majorRecordId: recordId };
  const canonical = canonicalAdmissionIdentity({ majorRecordId: recordId, schoolCode, majorCode2026 });
  const history = normalizeHistory(input.threeYearHistory || input.history, recordId);
  const state = text(input.state) || (canonical.value && major && majorCode2026 ? 'record-confirmed' : confirmedSchool ? 'school-confirmed' : school ? 'school-entered' : 'empty');
  return {
    schemaVersion: SCHEMA_VERSION, id: text(input.id) || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : 1, school, confirmedSchool, schoolCode,
    majorQuery: text(input.majorQuery), major, majorCode2026, majorRecordId: recordId,
    standardMajorName: text(input.standardMajorName), standardMajorCode: text(input.standardMajorCode), admissionProject,
    canonicalAdmissionKey: canonical.value, threeYearHistory: history,
    familyStatus: FAMILY_STATUS.includes(text(input.familyStatus)) ? text(input.familyStatus) : '还没决定',
    familyNote: freeText(input.familyNote).slice(0, Number(options.noteMax) || 1000), source: normalizeSource(input.source, options.sourceModule || 'simulation'),
    state, error: freeText(input.error), createdAt, updatedAt
  };
}
function isComplete(choice) {
  const value = normalizeSimulationChoice(choice), canonical = canonicalAdmissionIdentity(value), historyIdentity = value.threeYearHistory.recordId;
  const historyMatches = value.majorRecordId ? historyIdentity === value.majorRecordId : historyIdentity === canonical.value;
  return Boolean(value.school && value.confirmedSchool && value.major && value.majorCode2026 && canonical.value && historyMatches);
}
function buildSimulationChoiceHref(choice = {}, options = {}) {
  const normalized = normalizeSimulationChoice(choice, options);
  const href = new URL(options.base || '/ln-rank/simulation-report.html', 'https://gaokao.powers.org.cn');
  href.searchParams.set('school', normalized.school);
  if (normalized.schoolCode) href.searchParams.set('schoolCode', normalized.schoolCode);
  if (normalized.major) href.searchParams.set('majorName', normalized.major);
  if (normalized.majorCode2026) href.searchParams.set('majorCode2026', normalized.majorCode2026);
  if (normalized.majorRecordId) href.searchParams.set('majorRecordId', normalized.majorRecordId);
  href.searchParams.set('source', normalized.source.module); href.searchParams.set('entry', normalized.source.entry);
  return `${href.pathname}${href.search}`;
}
function parseSimulationChoiceHref(locationLike = globalThis.location) {
  const href = String(locationLike?.href || locationLike || ''), url = new URL(href, 'https://gaokao.powers.org.cn');
  const schoolCode = text(url.searchParams.get('schoolCode')), majorCode2026 = text(url.searchParams.get('majorCode2026') || url.searchParams.get('majorCode'));
  const majorRecordId = text(url.searchParams.get('majorRecordId') || url.searchParams.get('recordId'));
  return { school: text(url.searchParams.get('school')), schoolCode, major: text(url.searchParams.get('majorName') || url.searchParams.get('major')), majorCode2026, majorRecordId,
    source: normalizeSource({ module: url.searchParams.get('source'), entry: url.searchParams.get('entry'), href: `${url.pathname}${url.search}` }),
    hasChoiceIdentity: Boolean(majorRecordId || (schoolCode && majorCode2026)) };
}
function writeSimulationChoiceHref(choice = {}, options = {}) {
  const href = buildSimulationChoiceHref(choice, options), url = new URL(href, 'https://gaokao.powers.org.cn'), current = new URL(globalThis.location?.href || 'https://gaokao.powers.org.cn/ln-rank/simulation-report.html');
  current.search = url.search; const next = `${current.pathname}${current.search}${current.hash}`;
  if (options.replace !== false && globalThis.history?.replaceState) globalThis.history.replaceState({ ...(globalThis.history.state || {}), simulationChoice: normalizeSimulationChoice(choice, options) }, '', next);
  return next;
}
export { SCHEMA_VERSION, YEARS, FAMILY_STATUS, canonicalAdmissionIdentity, normalizeSimulationChoice, normalizeHistory, projectIdentity, isComplete, buildSimulationChoiceHref, parseSimulationChoiceHref, writeSimulationChoiceHref, freeText };
