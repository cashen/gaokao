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

function isLegacyLocalSnapshot(snapshot = {}) {
  return snapshot?.version === 'local-strength-static-v3971_2';
}

function sourceMeta(snapshot = {}, scope = 'auto') {
  const legacyMeta = snapshot.academicBackgroundMeta && typeof snapshot.academicBackgroundMeta === 'object'
    ? snapshot.academicBackgroundMeta
    : {};
  return {
    ...legacyMeta,
    resourceVersion: snapshot.version || '',
    resourcePath: AI_BACKGROUND_STATIC_RESOURCE,
    generatedAt: snapshot.generatedAt || '',
    dataYear: Number(snapshot.meta?.dataYear || 2026),
    scope: normalizeBackgroundScope(scope),
    sourceScopes: snapshot.meta?.sourceScopes || (isLegacyLocalSnapshot(snapshot) ? ['liaoning'] : ['liaoning', '211']),
    executionRole: snapshot.meta?.executionRole || (isLegacyLocalSnapshot(snapshot) ? 'legacy-pure-function-compatibility-only' : 'derived-evidence-index-only'),
    boundary: clean(legacyMeta.boundary || snapshot.meta?.boundary || '只展示已发布背景证据资源中通过门禁的学校×专业关系；未显示不代表弱项。', 500)
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

function recordSchool(record = {}) {
  return clean(record.schoolIdentity || record.school, 140);
}

function recordCity(record = {}) {
  return clean(record.city || record.displayLocation, 80);
}

function recordLevel(record = {}) {
  return clean(record.level || record.background?.level, 30) || 'trajectory';
}

function recordAdmissionMajors(record = {}) {
  if (Array.isArray(record.admissionMajors) && record.admissionMajors.length) return unique(record.admissionMajors, 24);
  return unique([record.standardMajor?.name, record.major], 24);
}

function recordDirections(record = {}) {
  const admissionNames = new Set(recordAdmissionMajors(record).map(normalizeBackgroundIdentityText));
  const canonicalName = normalizeBackgroundIdentityText(record.canonicalMajor?.name || '');
  const source = Array.isArray(record.directions) && record.directions.length
    ? record.directions
    : [record.background?.direction, record.background?.label];
  return unique(source, 16).filter(direction => {
    const normalized = normalizeBackgroundIdentityText(direction);
    if (!normalized) return false;
    // A real admissions/canonical major must never be downgraded into a non-queryable background direction.
    return normalized !== canonicalName && !admissionNames.has(normalized);
  });
}

function evidenceKey(item = {}) {
  return clean(item.evidenceId || `${item.sourceId || ''}|${item.evidenceType || ''}|${item.detail || ''}`, 700);
}

function sourceKey(item = {}) {
  return clean(item.sourceId || item.url || item.sourceUrl || `${item.title || ''}|${item.year || ''}`, 700);
}

function groupBackgroundDirections(records = []) {
  const byDirection = new Map();
  for (const record of records || []) {
    const admissions = recordAdmissionMajors(record);
    const school = recordSchool(record);
    for (const direction of recordDirections(record)) {
      const key = normalizeBackgroundIdentityText(direction);
      if (!key) continue;
      let item = byDirection.get(key);
      if (!item) {
        item = {
          major: direction,
          direction,
          entityKind: 'background_direction',
          historyQueryable: false,
          admissionMajors: new Map(),
          schools: new Map(),
          scopes: new Set(),
          evidence: new Map(),
          sources: new Map(),
          primaryCount: 0,
          secondaryCount: 0,
          recordCount: 0,
          overview: clean(record.note || record.background?.label || record.background?.evidenceLabel, 220)
        };
        byDirection.set(key, item);
      }
      for (const major of admissions) item.admissionMajors.set(normalizeBackgroundIdentityText(major), major);
      if (school) {
        const schoolKey = normalizeBackgroundIdentityText(school);
        let schoolItem = item.schools.get(schoolKey);
        if (!schoolItem) {
          schoolItem = { school, city: recordCity(record), admissionMajors: new Map() };
          item.schools.set(schoolKey, schoolItem);
        }
        for (const major of admissions) schoolItem.admissionMajors.set(normalizeBackgroundIdentityText(major), major);
      }
      if (record.scope) item.scopes.add(clean(record.scope, 24));
      for (const evidence of record.evidence || []) {
        const eKey = evidenceKey(evidence);
        if (eKey && !item.evidence.has(eKey)) item.evidence.set(eKey, evidence);
      }
      for (const source of record.sources || []) {
        const sKey = sourceKey(source);
        if (sKey && !item.sources.has(sKey)) item.sources.set(sKey, source);
      }
      if (recordLevel(record) === 'primary') item.primaryCount += 1;
      else item.secondaryCount += 1;
      item.recordCount += 1;
    }
  }
  return [...byDirection.values()].map(item => ({
    ...item,
    admissionMajors: [...item.admissionMajors.values()],
    schools: [...item.schools.values()].map(school => ({ ...school, admissionMajors: [...school.admissionMajors.values()] })),
    schoolCount: item.schools.size,
    scopesMatched: [...item.scopes],
    evidence: [...item.evidence.values()],
    sources: [...item.sources.values()],
    boundary: '背景方向是对同一批已核验学校×canonical专业证据的解释投影，不是招生专业名，也不能直接作为查分键。'
  })).sort((a, b) => String(a.direction).localeCompare(String(b.direction), 'zh-CN'));
}

function legacySchoolMetaMap(snapshot = {}) {
  return new Map((snapshot.schools || []).map(item => [normalizeBackgroundIdentityText(item?.officialName), item]));
}

function legacyRegionAllows(meta = {}, regionKeys = ['all']) {
  const keys = Array.isArray(regionKeys) && regionKeys.length ? regionKeys : ['all'];
  if (keys.includes('all') || keys.includes('ln') || keys.includes('province:辽宁')) return true;
  const city = clean(meta?.city, 80);
  if (keys.includes('shenyang') && city.includes('沈阳')) return true;
  if (keys.includes('dalian') && city.includes('大连')) return true;
  if (keys.includes('ln-other') && city && !city.includes('沈阳') && !city.includes('大连')) return true;
  return false;
}

function legacyScopedRecords(snapshot = {}, { school = '', regionKeys = ['all'] } = {}) {
  const schoolNeedle = normalizeBackgroundIdentityText(school);
  const metaBySchool = legacySchoolMetaMap(snapshot);
  return (snapshot.records || []).filter(record => {
    const currentSchool = recordSchool(record);
    if (schoolNeedle && normalizeBackgroundIdentityText(currentSchool) !== schoolNeedle) return false;
    const meta = metaBySchool.get(normalizeBackgroundIdentityText(currentSchool)) || { city: recordCity(record) };
    return legacyRegionAllows(meta, regionKeys);
  });
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
        directions: new Set(),
        primaryCount: 0,
        secondaryCount: 0,
        recordCount: 0,
        evidenceCount: 0
      };
      byMajor.set(code, item);
    }
    for (const major of record.admissionMajors || []) item.admissionMajors.add(clean(major, 180));
    const school = recordSchool(record);
    if (school) item.schools.set(normalizeBackgroundIdentityText(school), { school, city: recordCity(record), admissionMajors: unique(record.admissionMajors || [], 12) });
    item.scopes.add(record.scope);
    for (const direction of record.directions || []) item.directions.add(clean(direction, 180));
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
    direction: [...item.directions][0] || item.major,
    directions: [...item.directions],
    schoolCount: item.schools.size
  }));
}

export function backgroundDiscoveryFromSnapshot(snapshot, { limit = 12, regionKeys = ['ln'], scope = 'auto' } = {}) {
  const records = isLegacyLocalSnapshot(snapshot)
    ? legacyScopedRecords(snapshot, { regionKeys })
    : queryAcademicBackgroundContext(snapshot, { scope, regionKeys, limit: 500 }).records || [];
  const directionItems = groupBackgroundDirections(records);
  // Direction labels remain a non-queryable presentation projection. If a source has no distinct direction labels,
  // fall back to canonical-major evidence rather than silently treating a major name as a direction.
  const items = directionItems.length
    ? directionItems
    : groupDiscovery(records).sort((a, b) => String(a.major).localeCompare(String(b.major), 'zh-CN'));
  return {
    items: items.slice(0, Math.max(6, Math.min(20, Number(limit || 12)))),
    totalWithEvidence: items.length,
    scope: normalizeBackgroundScope(scope),
    meta: sourceMeta(snapshot, scope)
  };
}

function uniqueRelatedSchoolMajorContext(snapshot, { school = '', major = '', majorCode = '', scope = 'auto' } = {}) {
  const exact = resolveSchoolMajorBackgroundContext(snapshot, { school, majorName: major, majorCode, scope });
  if (exact.matched || majorCode || !major) return exact;
  const related = queryAcademicBackgroundContext(snapshot, {
    school,
    majorName: major,
    scope,
    limit: 40,
    majorMatchMode: 'related'
  });
  if (!related.ok || !related.records.length) return exact;
  const byCode = new Map();
  for (const record of related.records) {
    const code = clean(record?.canonicalMajor?.code, 30).toUpperCase();
    if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, record.canonicalMajor);
  }
  if (byCode.size !== 1) {
    return {
      ...exact,
      code: byCode.size > 1 ? 'background_major_ambiguous' : exact.code,
      ambiguousCanonicalMajors: [...byCode.values()],
      requestedMajor: clean(major, 180)
    };
  }
  const canonicalMajor = [...byCode.values()][0];
  return resolveSchoolMajorBackgroundContext(snapshot, {
    school,
    majorCode: canonicalMajor.code,
    majorName: canonicalMajor.name,
    scope
  });
}

export function schoolBackgroundFromSnapshot(snapshot, school, { scope = 'auto', major = '', majorCode = '' } = {}) {
  if (isLegacyLocalSnapshot(snapshot)) {
    const items = groupBackgroundDirections(legacyScopedRecords(snapshot, { school })).map(item => ({ ...item, school: clean(school, 140) }));
    return { items, scope: 'liaoning', meta: sourceMeta(snapshot, 'liaoning') };
  }
  if (major || majorCode) {
    const exact = uniqueRelatedSchoolMajorContext(snapshot, { school, major, majorCode, scope });
    const items = exact.matched ? [contextItemFromMajor({ school: exact.school, canonicalMajor: exact.canonicalMajor, matches: exact.matches, scopesMatched: exact.scopesMatched, evidence: exact.evidence, sources: exact.sources })] : [];
    return { items, exact, scope: normalizeBackgroundScope(scope), meta: sourceMeta(snapshot, scope) };
  }
  const resolvedRecords = queryAcademicBackgroundContext(snapshot, { school, scope, limit: 500 });
  const directions = resolvedRecords.ok ? groupBackgroundDirections(resolvedRecords.records) : [];
  if (directions.length) return { items: directions.map(item => ({ ...item, school: clean(school, 140) })), scope: normalizeBackgroundScope(scope), meta: sourceMeta(snapshot, scope) };
  const resolved = listSchoolBackgroundMajors(snapshot, { school, scope, limit: 120 });
  const items = resolved.ok ? resolved.items.map(contextItemFromMajor) : [];
  return { items, scope: normalizeBackgroundScope(scope), meta: sourceMeta(snapshot, scope) };
}

export function schoolBackgroundDirectionFromSnapshot(snapshot, school, direction, { scope = 'auto' } = {}) {
  const needle = normalizeBackgroundIdentityText(direction);
  if (!needle) return null;
  return schoolBackgroundFromSnapshot(snapshot, school, { scope }).items.find(item => item.entityKind === 'background_direction' && normalizeBackgroundIdentityText(item.direction) === needle) || null;
}

export function majorBackgroundFromSnapshot(snapshot, major, { scope = 'auto', regionKeys = ['all'], majorCode = '' } = {}) {
  if (isLegacyLocalSnapshot(snapshot)) {
    const needle = normalizeBackgroundIdentityText(major);
    const records = legacyScopedRecords(snapshot, { regionKeys }).filter(record => {
      const majors = recordAdmissionMajors(record).map(normalizeBackgroundIdentityText);
      const directions = recordDirections(record).map(normalizeBackgroundIdentityText);
      return needle && (majors.some(value => value.includes(needle) || needle.includes(value)) || directions.some(value => value.includes(needle) || needle.includes(value)));
    });
    const items = groupBackgroundDirections(records);
    return { items, total: items.length, schoolCount: new Set(items.flatMap(item => item.schools.map(school => school.school))).size, scope: 'liaoning', meta: sourceMeta(snapshot, 'liaoning'), boundary: sourceMeta(snapshot, 'liaoning').boundary };
  }
  const resolved = queryAcademicBackgroundContext(snapshot, {
    majorName: major,
    majorCode,
    scope,
    regionKeys,
    limit: 500,
    majorMatchMode: majorCode ? 'exact' : 'related'
  });
  const records = resolved.ok ? resolved.records : [];
  const directionItems = groupBackgroundDirections(records);
  const items = directionItems.length
    ? directionItems
    : groupDiscovery(records).sort((a, b) => String(a.major).localeCompare(String(b.major), 'zh-CN'));
  const schoolCount = new Set(items.flatMap(item => item.schools || []).map(item => normalizeBackgroundIdentityText(item.school))).size;
  return {
    items,
    total: items.length,
    schoolCount,
    scope: normalizeBackgroundScope(scope),
    meta: sourceMeta(snapshot, scope),
    boundary: '这是通过证据门禁的学校×专业背景集合，不是学校排名；未显示学校不等于该专业弱。'
  };
}

function candidateMajorIdentity(record = {}) {
  const code = clean(record?.standardMajor?.code || record?.standardMajorCode, 30).toUpperCase();
  const name = clean(record?.standardMajor?.name || record?.standardMajorName || record?.major, 180);
  return { majorCode: code, majorName: name };
}

export function matchCandidateBackgrounds(snapshot, candidateRecords = [], { scope = 'auto' } = {}) {
  if (isLegacyLocalSnapshot(snapshot)) {
    const byKey = new Map();
    for (const record of snapshot.records || []) {
      const school = normalizeBackgroundIdentityText(recordSchool(record));
      for (const admissionMajor of recordAdmissionMajors(record)) {
        const key = `${school}|${normalizeBackgroundIdentityText(admissionMajor)}`;
        if (school && !byKey.has(key)) byKey.set(key, { level: recordLevel(record), direction: recordDirections(record)[0] || admissionMajor, boundary: sourceMeta(snapshot, 'liaoning').boundary });
      }
    }
    const items = [];
    for (const record of candidateRecords || []) {
      const major = candidateMajorIdentity(record), key = `${normalizeBackgroundIdentityText(record?.school || record?.schoolName)}|${normalizeBackgroundIdentityText(major.majorName)}`;
      const background = byKey.get(key);
      if (background) items.push({ record, background });
    }
    return { items, scope: 'liaoning', meta: sourceMeta(snapshot, 'liaoning') };
  }
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
