export const ACADEMIC_BACKGROUND_CONTEXT_VERSION = 'academic-background-context-v0.01';
export const ACADEMIC_BACKGROUND_CONTEXT_RESOURCE = '/ln-rank/data/background-context/background-context-index.v001.json';
export const ACADEMIC_BACKGROUND_CONTEXT_RESOURCE_VERSION = 'academic-background-context-static-v0.01';
export const ACADEMIC_BACKGROUND_CONTEXT_SCOPES = Object.freeze(['liaoning', '211']);

function clean(value, max = 500) {
  return String(value == null ? '' : value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function normalizeBackgroundIdentityText(value) {
  return clean(value, 300)
    .toLowerCase()
    .replace(/[（【\[]/g, '(')
    .replace(/[）】\]]/g, ')')
    .replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '');
}

export function normalizeBackgroundScope(value = 'auto') {
  const raw = clean(value, 40).toLowerCase();
  if (raw === '211' || /(?:^|[^0-9])211(?:[^0-9]|$)/.test(raw)) return '211';
  if (['liaoning', 'local', 'ln', 'province:辽宁', '辽宁', '辽宁省', '省内'].includes(raw)) return 'liaoning';
  return 'auto';
}

export function backgroundScopesFor(value = 'auto') {
  const scope = normalizeBackgroundScope(value);
  return scope === 'auto' ? [...ACADEMIC_BACKGROUND_CONTEXT_SCOPES] : [scope];
}

export function validateAcademicBackgroundContextSnapshot(snapshot = {}) {
  return Boolean(
    snapshot
    && snapshot.version === ACADEMIC_BACKGROUND_CONTEXT_RESOURCE_VERSION
    && Array.isArray(snapshot.records)
    && snapshot.meta?.executionRole === 'derived-evidence-index-only'
    && ACADEMIC_BACKGROUND_CONTEXT_SCOPES.every(scope => Number(snapshot.meta?.scopeCounts?.[scope] || 0) > 0)
  );
}

function majorMatches(record = {}, { majorCode = '', majorName = '', matchMode = 'exact' } = {}) {
  const code = clean(majorCode, 30).toUpperCase();
  if (code) return clean(record?.canonicalMajor?.code, 30).toUpperCase() === code;
  const name = normalizeBackgroundIdentityText(majorName);
  if (!name) return true;
  const canonical = normalizeBackgroundIdentityText(record?.canonicalMajor?.name);
  if (canonical === name) return true;
  if (matchMode !== 'related') return false;
  const values = [record?.canonicalMajor?.name, ...(record?.admissionMajors || []), ...(record?.directions || [])]
    .map(normalizeBackgroundIdentityText)
    .filter(Boolean);
  return values.some(value => value.includes(name) || (name.length >= 4 && value.length >= 4 && name.includes(value)));
}

function schoolMatches(record = {}, school = '') {
  const target = normalizeBackgroundIdentityText(school);
  if (!target) return true;
  return [record.schoolIdentity, record.school]
    .some(value => normalizeBackgroundIdentityText(value) === target);
}

function regionAllows(record = {}, regionKeys = ['all']) {
  const keys = Array.isArray(regionKeys) && regionKeys.length ? regionKeys : ['all'];
  if (keys.includes('all')) return true;
  const province = clean(record.province, 80);
  const city = clean(record.city, 80);
  const display = clean(record.displayLocation, 120);
  for (const raw of keys) {
    const key = clean(raw, 100);
    if (!key) continue;
    if (['ln', 'province:辽宁', '辽宁', '辽宁省'].includes(key) && (province.includes('辽宁') || display.includes('辽宁'))) return true;
    if (key === 'shenyang' && (city.includes('沈阳') || display.includes('沈阳'))) return true;
    if (key === 'dalian' && (city.includes('大连') || display.includes('大连'))) return true;
    if (key === 'ln-other' && (province.includes('辽宁') || display.includes('辽宁')) && !city.includes('沈阳') && !city.includes('大连')) return true;
    if (key.startsWith('province:') && (province.includes(key.slice(9)) || display.includes(key.slice(9)))) return true;
    if (key.startsWith('city:') && (city.includes(key.slice(5)) || display.includes(key.slice(5)))) return true;
  }
  return false;
}

function evidenceKey(item = {}) {
  return [
    clean(item.sourceId, 120), clean(item.evidenceType, 120), clean(item.disciplineCode, 80),
    clean(item.disciplineName, 180), clean(item.grade, 40), clean(item.evidenceYear, 30), clean(item.detail, 500)
  ].join('|');
}

function sourceKey(item = {}) {
  return [clean(item.sourceId, 120), clean(item.url || item.sourceUrl, 500), clean(item.year || item.evidenceYear, 30)].join('|');
}

function dedupeMatches(matches = []) {
  const evidence = new Map();
  const sources = new Map();
  for (const match of matches) {
    for (const item of match.evidence || []) {
      const key = evidenceKey(item);
      if (!key.replace(/\|/g, '')) continue;
      const existing = evidence.get(key);
      if (existing) {
        existing.scopes = [...new Set([...(existing.scopes || []), match.scope])];
      } else {
        evidence.set(key, { ...item, scopes: [match.scope] });
      }
    }
    for (const item of match.sources || []) {
      const key = sourceKey(item);
      if (!key.replace(/\|/g, '')) continue;
      const existing = sources.get(key);
      if (existing) {
        existing.scopes = [...new Set([...(existing.scopes || []), match.scope])];
      } else {
        sources.set(key, { ...item, scopes: [match.scope] });
      }
    }
  }
  return { evidence: [...evidence.values()], sources: [...sources.values()] };
}

export function queryAcademicBackgroundContext(snapshot = {}, {
  school = '', majorCode = '', majorName = '', scope = 'auto', regionKeys = ['all'], limit = 200, majorMatchMode = 'exact'
} = {}) {
  if (!validateAcademicBackgroundContextSnapshot(snapshot)) {
    return { ok: false, code: 'background_context_invalid', scope: normalizeBackgroundScope(scope), records: [] };
  }
  const scopes = new Set(backgroundScopesFor(scope));
  const records = snapshot.records.filter(record =>
    scopes.has(record.scope)
    && schoolMatches(record, school)
    && majorMatches(record, { majorCode, majorName, matchMode: majorMatchMode })
    && regionAllows(record, regionKeys)
  ).slice(0, Math.max(1, Math.min(500, Number(limit || 200))));
  return { ok: true, scope: normalizeBackgroundScope(scope), requestedScopes: [...scopes], records };
}

export function resolveSchoolMajorBackgroundContext(snapshot = {}, {
  school = '', majorCode = '', majorName = '', scope = 'auto'
} = {}) {
  const query = queryAcademicBackgroundContext(snapshot, { school, majorCode, majorName, scope, limit: 20 });
  if (!query.ok) return { ...query, matched: false, matches: [], evidence: [], sources: [] };
  const matches = query.records;
  const deduped = dedupeMatches(matches);
  const major = matches[0]?.canonicalMajor || (majorCode || majorName ? { code: clean(majorCode, 30).toUpperCase(), name: clean(majorName, 180) } : null);
  return {
    ok: true,
    matched: matches.length > 0,
    scope: query.scope,
    requestedScopes: query.requestedScopes,
    school: matches[0]?.schoolIdentity || clean(school, 140),
    canonicalMajor: major,
    matches,
    scopesMatched: [...new Set(matches.map(item => item.scope))],
    evidence: deduped.evidence,
    sources: deduped.sources,
    boundary: '省内背景与211背景是不同证据视角，不相加成强弱分；没有命中只表示当前资源没有达到展示门禁的证据。'
  };
}

export function listMajorBackgroundSchools(snapshot = {}, {
  majorCode = '', majorName = '', scope = 'auto', regionKeys = ['all'], limit = 120
} = {}) {
  const query = queryAcademicBackgroundContext(snapshot, { majorCode, majorName, scope, regionKeys, limit: 500, majorMatchMode: majorCode ? 'exact' : 'related' });
  if (!query.ok) return { ...query, items: [] };
  const bySchool = new Map();
  for (const record of query.records) {
    const key = `${normalizeBackgroundIdentityText(record.schoolIdentity || record.school)}|${clean(record?.canonicalMajor?.code, 30).toUpperCase()}`;
    const current = bySchool.get(key) || {
      school: record.schoolIdentity || record.school,
      province: record.province || '', city: record.city || '', displayLocation: record.displayLocation || '',
      canonicalMajor: record.canonicalMajor, matches: []
    };
    current.matches.push(record);
    bySchool.set(key, current);
  }
  const items = [...bySchool.values()].map(item => {
    const deduped = dedupeMatches(item.matches);
    return {
      ...item,
      scopesMatched: [...new Set(item.matches.map(record => record.scope))],
      evidence: deduped.evidence,
      sources: deduped.sources
    };
  }).sort((a, b) =>
    String(a.school).localeCompare(String(b.school), 'zh-CN')
    || String(a.canonicalMajor?.code || '').localeCompare(String(b.canonicalMajor?.code || ''))
  ).slice(0, Math.max(1, Math.min(200, Number(limit || 120))));
  return {
    ok: true,
    scope: query.scope,
    requestedScopes: query.requestedScopes,
    items,
    total: items.length,
    schoolCount: new Set(items.map(item => normalizeBackgroundIdentityText(item.school))).size,
    boundary: '这是通过证据门禁的学校×专业背景集合，不是学校排名；未显示学校不等于该专业弱。'
  };
}

export function listSchoolBackgroundMajors(snapshot = {}, { school = '', scope = 'auto', limit = 120 } = {}) {
  if (!validateAcademicBackgroundContextSnapshot(snapshot)) return { ok: false, code: 'background_context_invalid', items: [] };
  const scopes = new Set(backgroundScopesFor(scope));
  const rows = snapshot.records.filter(record => scopes.has(record.scope) && schoolMatches(record, school));
  const byMajor = new Map();
  for (const record of rows) {
    const key = clean(record?.canonicalMajor?.code, 30).toUpperCase();
    if (!key) continue;
    const current = byMajor.get(key) || { canonicalMajor: record.canonicalMajor, school: record.schoolIdentity || record.school, matches: [] };
    current.matches.push(record);
    byMajor.set(key, current);
  }
  const items = [...byMajor.values()].map(item => {
    const deduped = dedupeMatches(item.matches);
    return { ...item, scopesMatched: [...new Set(item.matches.map(record => record.scope))], evidence: deduped.evidence, sources: deduped.sources };
  }).sort((a, b) => String(a.canonicalMajor?.name || '').localeCompare(String(b.canonicalMajor?.name || ''), 'zh-CN'))
    .slice(0, Math.max(1, Math.min(200, Number(limit || 120))));
  return { ok: true, scope: normalizeBackgroundScope(scope), items, total: byMajor.size };
}
