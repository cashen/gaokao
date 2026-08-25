export const DECISION_CONTEXT_VERSION = 'decision-context-v0.01';
export const DECISION_CONTEXT_QUERY_KEY = 'dc';
export const DECISION_CONTEXT_META = Object.freeze({
  version: DECISION_CONTEXT_VERSION,
  maxEncodedLength: 4600,
  policy: 'readonly-same-origin-bounded-idempotent'
});

const SURFACES = new Set(['ln-rank', 'aiplus', 'tongxue', 'major-path']);
const ACTIONS = new Set([
  'view_major_history',
  'view_major_path',
  'view_student_voice',
  'add_to_family_plan',
  'ask_family_advisor',
  'return_to_source'
]);
const PROJECT_MODES = new Set(['all', 'ordinary-only', 'sino-only']);
const RETURN_PREFIXES = ['/ln-rank/', '/aiplus/', '/tongxue/', '/major-path/'];
const LIMITS = Object.freeze({
  text: 160,
  code: 32,
  array: 8,
  candidate: 24,
  snapshot: 8,
  question: 180,
  evidence: 180
});

function clean(value = '', limit = LIMITS.text) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function cleanCode(value = '') {
  return clean(value, LIMITS.code).replace(/[^0-9A-Za-z_-]/g, '').slice(0, LIMITS.code);
}

function cleanArray(value, mapper = item => clean(item), limit = LIMITS.array) {
  return Array.isArray(value)
    ? value.map(mapper).filter(Boolean).slice(0, limit)
    : [];
}

function finiteNumber(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function validDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function allowedReturnPath(pathname = '') {
  return RETURN_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function sanitizeDecisionReturnTarget(value, { origin = globalThis.location?.origin || 'https://gaokao.powers.org.cn' } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return '/ln-rank/';
  let url;
  let expectedOrigin;
  try {
    expectedOrigin = new URL(origin).origin;
    url = new URL(raw, expectedOrigin);
  } catch {
    return '/ln-rank/';
  }
  if (url.origin !== expectedOrigin || !allowedReturnPath(url.pathname)) return '/ln-rank/';
  return `${url.pathname}${url.search}${url.hash}`.slice(0, 900);
}

function normalizeRecord(record = {}) {
  if (!record || typeof record !== 'object') return null;
  const normalized = {
    id: clean(record.id || record.recordId, LIMITS.code),
    school: clean(record.school),
    schoolCode: cleanCode(record.schoolCode),
    major: clean(record.major || record.standardMajor),
    majorCode: cleanCode(record.majorCode),
    regionLabel: clean(record.regionLabel, 80),
    score: finiteNumber(record.score, 0, 1000),
    rank: finiteNumber(record.rank, 1, 100000000)
  };
  return Object.values(normalized).some(Boolean) ? normalized : null;
}

function normalizeEvidence(item = {}) {
  if (typeof item === 'string') return { kind: 'reference', label: clean(item, LIMITS.evidence) };
  if (!item || typeof item !== 'object') return null;
  const kind = clean(item.kind, 40);
  const label = clean(item.label || item.name, LIMITS.evidence);
  const ref = clean(item.ref || item.url, LIMITS.evidence);
  return kind || label || ref ? { kind, label, ref } : null;
}

export function validateDecisionContext(input = {}) {
  const raw = input && typeof input === 'object' ? input : {};
  const sourceSurface = SURFACES.has(raw.sourceSurface) ? raw.sourceSurface : '';
  const sourceAction = ACTIONS.has(raw.sourceAction) ? raw.sourceAction : '';
  const normalized = {
    contractVersion: DECISION_CONTEXT_VERSION,
    contextId: clean(raw.contextId, 80),
    sourceSurface,
    sourceAction,
    createdAt: validDate(raw.createdAt),
    returnTo: sanitizeDecisionReturnTarget(raw.returnTo),
    province: clean(raw.province, 40),
    admissionYear: finiteNumber(raw.admissionYear, 2000, 2100),
    track: clean(raw.track, 60),
    score: finiteNumber(raw.score, 0, 1000),
    rank: finiteNumber(raw.rank, 1, 100000000),
    regionKeys: cleanArray(raw.regionKeys, item => clean(item, 50), 8),
    regionLabel: clean(raw.regionLabel, 100),
    school: clean(raw.school),
    schoolCode: cleanCode(raw.schoolCode),
    major: clean(raw.major),
    majorCode: cleanCode(raw.majorCode),
    majorKeywords: cleanArray(raw.majorKeywords, item => clean(item, 80), 8),
    projectMode: PROJECT_MODES.has(raw.projectMode) ? raw.projectMode : '',
    candidateIds: cleanArray(raw.candidateIds, item => clean(item, LIMITS.candidate), 8),
    selectionSnapshot: Array.isArray(raw.selectionSnapshot)
      ? raw.selectionSnapshot.map(normalizeRecord).filter(Boolean).slice(0, LIMITS.snapshot)
      : [],
    pendingQuestions: cleanArray(raw.pendingQuestions, item => clean(item, LIMITS.question), 8),
    evidenceRefs: Array.isArray(raw.evidenceRefs)
      ? raw.evidenceRefs.map(normalizeEvidence).filter(Boolean).slice(0, LIMITS.array)
      : []
  };
  if (!normalized.contextId) normalized.contextId = contextKey(normalized);
  if (!normalized.createdAt) normalized.createdAt = new Date().toISOString();
  return Object.freeze(normalized);
}

export function createDecisionContext(input = {}) {
  return validateDecisionContext(input);
}

export function contextKey(input = {}) {
  const raw = input && typeof input === 'object' ? input : {};
  const stable = [
    raw.sourceSurface || '',
    raw.sourceAction || '',
    raw.returnTo || '',
    raw.admissionYear || '',
    raw.track || '',
    raw.score ?? '',
    raw.rank ?? '',
    raw.regionLabel || '',
    raw.schoolCode || raw.school || '',
    raw.majorCode || raw.major || '',
    ...(Array.isArray(raw.candidateIds) ? raw.candidateIds : [])
  ].join('|');
  let hash = 2166136261;
  for (let index = 0; index < stable.length; index += 1) {
    hash ^= stable.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `dc-${(hash >>> 0).toString(36)}`;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = globalThis.btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = globalThis.atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export function encodeDecisionContext(input = {}) {
  const normalized = validateDecisionContext(input);
  const bytes = new TextEncoder().encode(JSON.stringify(normalized));
  const encoded = bytesToBase64Url(bytes);
  return encoded.length <= DECISION_CONTEXT_META.maxEncodedLength ? encoded : '';
}

export function decodeDecisionContext(value = '') {
  const encoded = String(value || '').trim();
  if (!encoded || encoded.length > DECISION_CONTEXT_META.maxEncodedLength) return null;
  try {
    const bytes = base64UrlToBytes(encoded);
    const decoded = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(decoded);
    const normalized = validateDecisionContext(parsed);
    return normalized.sourceSurface && normalized.sourceAction ? normalized : null;
  } catch {
    return null;
  }
}

export function decisionContextFromLocation(locationLike = globalThis.location) {
  try {
    const url = new URL(locationLike?.href || String(locationLike || ''), 'https://gaokao.powers.org.cn');
    return decodeDecisionContext(url.searchParams.get(DECISION_CONTEXT_QUERY_KEY));
  } catch {
    return null;
  }
}

export function withDecisionContext(path = '/', context = null, { origin = globalThis.location?.origin || 'https://gaokao.powers.org.cn' } = {}) {
  const target = sanitizeDecisionReturnTarget(path, { origin });
  const encoded = context ? encodeDecisionContext(context) : '';
  if (!encoded) return target;
  const url = new URL(target, origin);
  url.searchParams.set(DECISION_CONTEXT_QUERY_KEY, encoded);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function summarizeDecisionContext(context = null) {
  const normalized = context ? validateDecisionContext(context) : null;
  if (!normalized) return Object.freeze({ title: '', lines: [], note: '' });
  const location = [normalized.province, normalized.admissionYear, normalized.track, normalized.regionLabel].filter(Boolean).join(' · ');
  const subject = [normalized.school, normalized.major].filter(Boolean).join(' · ');
  const lines = [location, subject].filter(Boolean);
  const note = normalized.sourceSurface === 'tongxue'
    ? '同学你好：一次查看一个具体专业'
    : normalized.sourceSurface === 'ln-rank'
      ? '来自专业初选：当前支持多个已确认专业'
      : '本轮只读上下文，不自动修改家庭方案';
  return Object.freeze({ title: '你刚才带着这些条件过来', lines, note });
}
