import {
  SCHOOL_QUERY_CONTRACT_VERSION,
  SCHOOL_QUERY_INTENTS,
  SCHOOL_QUERY_POLICY,
  SCHOOL_QUERY_STATUSES,
  normalizeSchoolQueryIntent,
  normalizeSchoolQueryPage,
  schoolQueryPagination
} from './school-query-contract.v3969_0.js';
import {
  findSchoolEntityByName,
  getSchoolEntity,
  entitySourceQuery,
  publicSchoolEntity
} from './school-identity-center.js';

export function normalizeUnifiedSchoolName(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[（【\[]/g, '(')
    .replace(/[）】\]]/g, ')')
    .replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '')
    .trim();
}

export function admissionEntityIdForName(value) {
  const normalized = normalizeUnifiedSchoolName(value);
  return normalized ? `admission:${normalized}` : '';
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function publicEntityForName(name) {
  return publicSchoolEntity(findSchoolEntityByName(name));
}

function rowSearchNames(row = {}) {
  return unique([
    row.officialName,
    ...(Array.isArray(row.admissionNames) ? row.admissionNames : []),
    ...(Array.isArray(row.searchNames) ? row.searchNames : [])
  ]);
}

function availabilityIndexes(directory = {}) {
  const rows = Array.isArray(directory?.schools) ? directory.schools : [];
  const byName = new Map();
  const byEntity = new Map();
  for (const row of rows) {
    for (const name of rowSearchNames(row)) {
      const key = normalizeUnifiedSchoolName(name);
      if (key && !byName.has(key)) byName.set(key, row);
    }
    if (row.entityId && !byEntity.has(row.entityId)) byEntity.set(row.entityId, row);
  }
  return { rows, byName, byEntity };
}

function availabilityForOfficialName(officialName, indexes) {
  const entity = findSchoolEntityByName(officialName);
  if (entity?.entityId && indexes.byEntity.has(entity.entityId)) return indexes.byEntity.get(entity.entityId);
  const names = unique([
    officialName,
    entitySourceQuery(entity, officialName),
    entity?.displayName,
    ...(Array.isArray(entity?.aliases) ? entity.aliases : [])
  ]);
  for (const name of names) {
    const row = indexes.byName.get(normalizeUnifiedSchoolName(name));
    if (row) return row;
  }
  return null;
}

function matchPriority(matchType = '') {
  const key = String(matchType || '');
  if (/official_exact/.test(key)) return 0;
  if (/alias_exact|entity_alias_exact|entity_group/.test(key)) return 1;
  if (/official_prefix|alias_prefix/.test(key)) return 2;
  if (/entity/.test(key)) return 3;
  if (/official_contains|alias_contains|name_fragment/.test(key)) return 4;
  if (/region/.test(key)) return 5;
  if (/initial/.test(key)) return 6;
  return 7;
}

function candidateFromRow(row, {
  officialName = '',
  score = 0,
  matchType = 'admission-directory',
  intent = SCHOOL_QUERY_INTENTS.SCHOOL,
  matchReason = ''
} = {}) {
  const entity = row?.entityId ? getSchoolEntity(row.entityId) : findSchoolEntityByName(officialName || row?.officialName);
  const publicEntity = publicSchoolEntity(entity) || publicEntityForName(officialName || row?.officialName);
  const displayName = officialName || row?.officialName || row?.admissionNames?.[0] || '';
  const entityId = row?.entityId || publicEntity?.entityId || admissionEntityIdForName(displayName);
  return Object.freeze({
    school: displayName,
    officialName: displayName,
    admissionName: row?.admissionNames?.[0] || displayName,
    admissionNames: Object.freeze([...(row?.admissionNames || [])]),
    count: Number(row?.recordCount2026 || 0),
    recordCount2026: Number(row?.recordCount2026 || 0),
    score: Number(score || 0),
    matchType,
    matchReason,
    queryIntent: intent,
    entityId,
    entityType: row?.entityType || publicEntity?.entityType || 'official_school',
    parentEntityId: row?.parentEntityId || publicEntity?.parentEntityId || '',
    province: row?.province || publicEntity?.province || '',
    city: row?.city || publicEntity?.city || '',
    hasLiaoningPhysics2026Records: true
  });
}

function compareCandidates(a, b) {
  return matchPriority(a.matchType) - matchPriority(b.matchType)
    || Number(b.score || 0) - Number(a.score || 0)
    || String(a.officialName || '').length - String(b.officialName || '').length
    || String(a.officialName || '').localeCompare(String(b.officialName || ''), 'zh-CN')
    || Number(b.recordCount2026 || 0) - Number(a.recordCount2026 || 0);
}

function dedupeCandidates(candidates = []) {
  const seen = new Set();
  const rows = [];
  for (const candidate of candidates) {
    const key = candidate.entityId || normalizeUnifiedSchoolName(candidate.admissionName || candidate.officialName);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push(candidate);
  }
  return rows.sort(compareCandidates);
}

function paginateCandidates(candidates, page) {
  const normalized = normalizeSchoolQueryPage(page);
  const rows = candidates.slice(normalized.offset, normalized.offset + normalized.limit);
  return Object.freeze({
    candidates: Object.freeze(rows),
    pagination: schoolQueryPagination(candidates.length, normalized)
  });
}

function exactResolvedCandidate(resolution, indexes) {
  if (resolution?.status !== 'resolved' || !resolution.resolvedName) return null;
  const row = availabilityForOfficialName(resolution.resolvedName, indexes);
  if (!row) return null;
  return candidateFromRow(row, {
    officialName: resolution.resolvedName,
    score: resolution.confidence || 1,
    matchType: resolution.matchType || 'official_exact',
    intent: SCHOOL_QUERY_INTENTS.SCHOOL,
    matchReason: '按全站统一学校目录解析为唯一学校。'
  });
}

function resolverCandidates(resolver, query, indexes, limit = 5000) {
  const rows = resolver?.search?.(query, { limit }) || [];
  return dedupeCandidates(rows.map(item => {
    const row = availabilityForOfficialName(item.officialName, indexes);
    if (!row) return null;
    return candidateFromRow(row, {
      officialName: item.officialName,
      score: item.score,
      matchType: item.matchType,
      intent: SCHOOL_QUERY_INTENTS.SCHOOL,
      matchReason: '按正式校名、简称、首字母或学校实体匹配。'
    });
  }).filter(Boolean));
}

function regionCandidates(resolver, query, indexes, limit = 5000) {
  const result = resolver?.regionQuery?.(query, { limit });
  if (!result) return null;
  const candidates = dedupeCandidates((result.candidates || []).map(item => {
    const row = availabilityForOfficialName(item.officialName, indexes);
    if (!row) return null;
    return candidateFromRow(row, {
      officialName: item.officialName,
      score: item.score,
      matchType: item.matchType || 'region_match',
      intent: SCHOOL_QUERY_INTENTS.REGION,
      matchReason: `学校地域属于${result.region?.label || result.region?.city || result.region?.province || '该地区'}，且存在辽宁2026物理类投档记录。`
    });
  }).filter(Boolean));
  return Object.freeze({ ...result, candidates });
}

function schoolNameFragmentCandidates(query, indexes) {
  const needle = normalizeUnifiedSchoolName(query);
  if (!needle) return [];
  const candidates = [];
  for (const row of indexes.rows) {
    const matched = rowSearchNames(row).find(name => normalizeUnifiedSchoolName(name).includes(needle));
    if (!matched) continue;
    const officialName = row.officialName || matched;
    const target = normalizeUnifiedSchoolName(matched);
    const prefix = target.startsWith(needle);
    const coverage = Math.min(1, needle.length / Math.max(1, target.length));
    candidates.push(candidateFromRow(row, {
      officialName,
      score: prefix ? 0.82 + coverage * 0.14 : 0.66 + coverage * 0.2,
      matchType: prefix ? 'official_prefix' : 'name_fragment',
      intent: SCHOOL_QUERY_INTENTS.SCHOOL_NAME,
      matchReason: `校名或招生名称中包含“${String(query || '').trim()}”。`
    }));
  }
  return dedupeCandidates(candidates);
}

function interpretation(intent, label, note, candidates, page) {
  const paged = paginateCandidates(candidates, page);
  return Object.freeze({
    intent,
    label,
    note,
    total: candidates.length,
    candidates: paged.candidates,
    pagination: paged.pagination
  });
}

export function resolveUnifiedSchoolQuery({
  query,
  resolver,
  admissionDirectory,
  intent = SCHOOL_QUERY_INTENTS.AUTO,
  offset = 0,
  limit = SCHOOL_QUERY_POLICY.defaultCandidateLimit
} = {}) {
  const input = String(query || '').trim();
  const normalizedIntent = normalizeSchoolQueryIntent(intent);
  const page = normalizeSchoolQueryPage({ offset, limit });
  const indexes = availabilityIndexes(admissionDirectory);
  const base = Object.freeze({
    contractVersion: SCHOOL_QUERY_CONTRACT_VERSION,
    executionOwner: SCHOOL_QUERY_POLICY.executionOwner,
    admissionScope: SCHOOL_QUERY_POLICY.admissionScope,
    input,
    intent: normalizedIntent,
    directoryVersion: admissionDirectory?.version || '',
    directorySourceHash: admissionDirectory?.sourceHash || ''
  });
  if (!input) return Object.freeze({ ...base, status: SCHOOL_QUERY_STATUSES.EMPTY, candidates: Object.freeze([]), interpretations: Object.freeze([]) });

  const resolution = resolver?.resolve?.(input, { limit: SCHOOL_QUERY_POLICY.maximumCandidateLimit }) || null;
  const exact = exactResolvedCandidate(resolution, indexes);
  if (exact) {
    return Object.freeze({
      ...base,
      status: SCHOOL_QUERY_STATUSES.RESOLVED,
      resolvedSchool: exact,
      candidates: Object.freeze([exact]),
      interpretations: Object.freeze([]),
      pagination: schoolQueryPagination(1, page)
    });
  }

  const region = regionCandidates(resolver, input, indexes, SCHOOL_QUERY_POLICY.maximumCandidateLimit);
  const nameFragments = schoolNameFragmentCandidates(input, indexes);
  const searched = region ? [] : resolverCandidates(resolver, input, indexes, SCHOOL_QUERY_POLICY.maximumCandidateLimit);

  if (normalizedIntent === SCHOOL_QUERY_INTENTS.REGION && region) {
    const paged = paginateCandidates(region.candidates, page);
    return Object.freeze({ ...base, status: region.candidates.length ? SCHOOL_QUERY_STATUSES.CANDIDATES : SCHOOL_QUERY_STATUSES.NOT_AVAILABLE, region: region.region, candidates: paged.candidates, pagination: paged.pagination, interpretations: Object.freeze([]) });
  }
  if (normalizedIntent === SCHOOL_QUERY_INTENTS.SCHOOL_NAME) {
    const paged = paginateCandidates(nameFragments, page);
    return Object.freeze({ ...base, status: nameFragments.length ? SCHOOL_QUERY_STATUSES.CANDIDATES : SCHOOL_QUERY_STATUSES.NOT_FOUND, candidates: paged.candidates, pagination: paged.pagination, interpretations: Object.freeze([]) });
  }

  if (region && region.candidates.length && nameFragments.length) {
    const regionLabel = region.region?.label || region.region?.city || region.region?.province || input;
    const interpretations = Object.freeze([
      interpretation(SCHOOL_QUERY_INTENTS.REGION, `位于${regionLabel}的招生学校`, '按统一学校地域目录筛选，并只保留辽宁2026物理类有投档记录的学校。', region.candidates, page),
      interpretation(SCHOOL_QUERY_INTENTS.SCHOOL_NAME, `校名中包含“${input}”`, '只按正式校名、招生名称和明确别名解释，不把地域词自动当作学校名。', nameFragments, page)
    ]);
    return Object.freeze({
      ...base,
      status: SCHOOL_QUERY_STATUSES.AMBIGUOUS,
      ambiguityType: 'region-or-school-name',
      region: region.region,
      candidates: Object.freeze(dedupeCandidates(interpretations.flatMap(item => item.candidates))),
      interpretations
    });
  }

  const candidates = region?.candidates?.length ? region.candidates : (searched.length ? searched : nameFragments);
  if (candidates.length) {
    const paged = paginateCandidates(candidates, page);
    return Object.freeze({
      ...base,
      status: SCHOOL_QUERY_STATUSES.CANDIDATES,
      region: region?.region || null,
      candidates: paged.candidates,
      pagination: paged.pagination,
      interpretations: Object.freeze([])
    });
  }

  return Object.freeze({
    ...base,
    status: resolution?.status === 'resolved' ? SCHOOL_QUERY_STATUSES.NOT_AVAILABLE : SCHOOL_QUERY_STATUSES.NOT_FOUND,
    resolvedName: resolution?.resolvedName || '',
    candidates: Object.freeze([]),
    interpretations: Object.freeze([]),
    pagination: schoolQueryPagination(0, page)
  });
}

export function acceptedAdmissionSchoolNames(queryResult = {}) {
  const candidates = queryResult?.status === SCHOOL_QUERY_STATUSES.RESOLVED
    ? [queryResult.resolvedSchool]
    : (Array.isArray(queryResult?.candidates) ? queryResult.candidates : []);
  return new Set(candidates.flatMap(candidate => candidate?.admissionNames || [candidate?.admissionName]).map(normalizeUnifiedSchoolName).filter(Boolean));
}
