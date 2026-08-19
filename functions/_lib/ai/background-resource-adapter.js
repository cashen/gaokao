import { loadAcademicBackgroundContextSnapshot } from '../academic-background-context-reader.js';
import {
  ACADEMIC_BACKGROUND_CONTEXT_RESOURCE,
  listMajorBackgroundSchools,
  listSchoolBackgroundMajors,
  normalizeBackgroundIdentityText,
  normalizeBackgroundScope,
  queryAcademicBackgroundContext,
  resolveSchoolMajorBackgroundContext
} from '../../../shared/resources/background/academic-background-context.v001.js';

export const AI_BACKGROUND_STATIC_RESOURCE = ACADEMIC_BACKGROUND_CONTEXT_RESOURCE;
export const AI_BACKGROUND_RESOURCE_ADAPTER_VERSION = 'ai-background-resource-adapter-v3992_3';

function clean(value, max = 220) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function unique(values = [], max = 32) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => clean(value, 180)).filter(Boolean))].slice(0, max);
}

export async function loadAiBackgroundSnapshot(context) {
  return loadAcademicBackgroundContextSnapshot(context);
}

function sourceMeta(snapshot = {}, scope = 'auto') {
  return {
    resourceVersion: snapshot.version || '',
    resourcePath: AI_BACKGROUND_STATIC_RESOURCE,
    generatedAt: snapshot.generatedAt || '',
    scope: normalizeBackgroundScope(scope),
    sourceScopes: snapshot.meta?.sourceScopes || ['liaoning', '211'],
    executionRole: snapshot.meta?.executionRole || 'derived-evidence-index-only',
    boundary: clean(snapshot.meta?.boundary || '只展示已发布背景证据资源中通过门禁的学校×专业关系；未显示不代表弱项。', 500)
  };
}

function primaryDirection(matches = []) {
  return unique(matches.flatMap(item => item.directions || []), 6).join(' / ');
}

function evidenceLevel(matches = []) {
  const rank = { primary: 3, secondary: 2, trajectory: 1 };
  return [...matches].sort((a, b) => (rank[b.level] || 0) - (rank[a.level] || 0))[0]?.level || 'trajectory';
}

function contextItemFromMajor(item = {}) {
  const matches = item.matches || [];
  const major = item.canonicalMajor?.name || '';
  return {
    major,
    canonicalMajor: item.canonicalMajor || null,
    direction: primaryDirection(matches) || major,
    entityKind: 'canonical_major_background',
    historyQueryable: Boolean(item.canonicalMajor?.code),
    admissionMajors: unique(matches.flatMap(match => match.admissionMajors || []), 16),
    school: item.school || '',
    schools: item.school ? [{ school: item.school, city: clean(matches[0]?.city || matches[0]?.displayLocation, 80), admissionMajors: unique(matches.flatMap(match => match.admissionMajors || []), 16) }] : [],
    schoolCount: item.school ? 1 : 0,
    scopesMatched: item.scopesMatched || unique(matches.map(match => match.scope), 4),
    primaryCount: matches.filter(match => match.level === 'primary').length,
    secondaryCount: matches.filter(match => match.level === 'secondary').length,
    recordCount: matches.length,
    evidence: item.evidence || [],
    sources: item.sources || [],
    overview: matches[0]?.note || '',
    boundary: '背景证据用于学校×专业复核；省内与211是证据视角，不相加成推荐分。'
  };
}

function contextItemFromSchool(item = {}) {
  const matches = item.matches || [];
  return {
    school: item.school || '',
    city: item.city || '',
    major: item.canonicalMajor?.name || '',
    canonicalMajor: item.canonicalMajor || null,
    direction: primaryDirection(matches) || item.canonicalMajor?.name || '专业背景',
    entityKind: 'school_major_background',
    historyQueryable: Boolean(item.canonicalMajor?.code),
    admissionMajors: unique(matches.flatMap(match => match.admissionMajors || []), 16),
    scopesMatched: item.scopesMatched || unique(matches.map(match => match.scope), 4),
    level: evidenceLevel(matches),
    evidence: item.evidence || [],
    sources: item.sources || [],
    overview: matches[0]?.note || '',
    boundary: '学校平台身份与具体专业背景分开；这里只表示当前有可核验的学校×专业证据。'
  };
}

function groupDiscovery(records = []) {
  const byMajor = new Map();
  for (const record of records) {
    const code = clean(record?.canonicalMajor?.code, 30);
    if (!code) continue;
    let item = byMajor.get(code);
    if (!item) {
      item = {
        major: record.canonicalMajor?.name || '',
        canonicalMajor: record.canonicalMajor || null,
        direction: record.canonicalMajor?.name || '',
        entityKind: 'canonical_major_background',
        historyQueryable: true,
        admissionMajors: new Set(),
        schools: new Map(),
        scopes: new Set(),
        primaryCount: 0,
        secondaryCount: 0,
        recordCount: 0,
        evidenceCount: 0
      };
      byMajor.set(code, item);
    }
    for (const major of record.admissionMajors || []) item.admissionMajors.add(clean(major, 180));
    const school = clean(record.schoolIdentity || record.school, 140);
    if (school) item.schools.set(normalizeBackgroundIdentityText(school), { school, city: clean(record.city || record.displayLocation, 80), admissionMajors: unique(record.admissionMajors || [], 12) });
    item.scopes.add(record.scope);
    if (record.level === 'primary') item.primaryCount += 1;
    else item.secondaryCount += 1;
    item.recordCount += 1;
    item.evidenceCount += Array.isArray(record.evidence) ? record.evidence.length : 0;
  }
  return [...byMajor.values()].map(item => ({
    ...item,
    admissionMajors: [...item.admissionMajors],
    schools: [...item.schools.values()],
    scopesMatched: [...item.scopes],
    schoolCount: item.schools.size,
    evidenceScore: item.primaryCount * 5 + item.secondaryCount * 2 + item.evidenceCount + item.schools.size
  }));
}

export function backgroundDiscoveryFromSnapshot(snapshot, { limit = 12, regionKeys = ['ln'], scope = 'auto' } = {}) {
  const resolved = queryAcademicBackgroundContext(snapshot, { scope, regionKeys, limit: 500 });
  const items = resolved.ok
    ? groupDiscovery(resolved.records).sort((a, b) => b.evidenceScore - a.evidenceScore || String(a.major).localeCompare(String(b.major), 'zh-CN'))
    : [];
  return {
    items: items.slice(0, Math.max(6, Math.min(20, Number(limit || 12)))),
    totalWithEvidence: items.length,
    scope: normalizeBackgroundScope(scope),
    meta: sourceMeta(snapshot, scope)
  };
}

export function schoolBackgroundFromSnapshot(snapshot, school, { scope = 'auto', major = '', majorCode = '' } = {}) {
  if (major || majorCode) {
    const exact = resolveSchoolMajorBackgroundContext(snapshot, { school, majorName: major, majorCode, scope });
    const items = exact.matched ? [contextItemFromMajor({ school: exact.school, canonicalMajor: exact.canonicalMajor, matches: exact.matches, scopesMatched: exact.scopesMatched, evidence: exact.evidence, sources: exact.sources })] : [];
    return { items, exact, scope: normalizeBackgroundScope(scope), meta: sourceMeta(snapshot, scope) };
  }
  const resolved = listSchoolBackgroundMajors(snapshot, { school, scope, limit: 120 });
  const items = resolved.ok ? resolved.items.map(contextItemFromMajor) : [];
  return { items, scope: normalizeBackgroundScope(scope), meta: sourceMeta(snapshot, scope) };
}

export function schoolBackgroundDirectionFromSnapshot(snapshot, school, direction, { scope = 'auto' } = {}) {
  const needle = normalizeBackgroundIdentityText(direction);
  if (!needle) return null;
  return schoolBackgroundFromSnapshot(snapshot, school, { scope }).items.find(item => {
    const values = [item.major, item.direction, ...(item.admissionMajors || [])].map(normalizeBackgroundIdentityText);
    return values.some(value => value === needle || (value.length >= 4 && needle.includes(value)) || (needle.length >= 4 && value.includes(needle)));
  }) || null;
}

export function majorBackgroundFromSnapshot(snapshot, major, { scope = 'auto', regionKeys = ['all'], majorCode = '' } = {}) {
  const resolved = listMajorBackgroundSchools(snapshot, { majorName: major, majorCode, scope, regionKeys, limit: 160 });
  const items = resolved.ok ? resolved.items.map(contextItemFromSchool) : [];
  return { items, total: resolved.total || 0, scope: normalizeBackgroundScope(scope), meta: sourceMeta(snapshot, scope), boundary: resolved.boundary || '' };
}

function candidateMajorIdentity(record = {}) {
  const code = clean(record?.standardMajor?.code, 30).toUpperCase();
  const name = clean(record?.standardMajor?.name || record?.major, 180);
  return { majorCode: code, majorName: name };
}

export function matchCandidateBackgrounds(snapshot, candidateRecords = [], { scope = 'auto' } = {}) {
  const matched = [];
  for (const record of candidateRecords || []) {
    const major = candidateMajorIdentity(record);
    const context = resolveSchoolMajorBackgroundContext(snapshot, {
      school: record?.school || record?.schoolName || '',
      ...major,
      scope
    });
    if (!context.matched) continue;
    matched.push({
      record,
      background: {
        scope: normalizeBackgroundScope(scope),
        scopesMatched: context.scopesMatched,
        level: evidenceLevel(context.matches),
        direction: primaryDirection(context.matches) || context.canonicalMajor?.name || major.majorName,
        canonicalMajor: context.canonicalMajor,
        evidence: context.evidence,
        sources: context.sources,
        boundary: context.boundary
      }
    });
  }
  return { items: matched, scope: normalizeBackgroundScope(scope), meta: sourceMeta(snapshot, scope) };
}
