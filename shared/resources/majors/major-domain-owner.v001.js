import {
  createMajorCatalogResolver,
  normalizeMajorCode,
  normalizeMajorText
} from './major-catalog-contract.js';

export const MAJOR_DOMAIN_OWNER_META = Object.freeze({
  version: 'major-domain-owner-v001',
  policy: 'one-canonical-catalog-many-separated-adapters',
  scope: 'all-undergraduate-majors',
  pipeline: Object.freeze([
    'major-identity',
    'major-knowledge',
    'school-major-relationship',
    'admission-history',
    'student-experience',
    'human-answer'
  ]),
  boundary: '专业目录只负责身份与目录层级；专业知识、学校关系、招生历史和学生体验通过各自既有 owner 注入，不能互相替代。'
});

function text(value = '') {
  return String(value == null ? '' : value).trim();
}

function inputValues(input = {}) {
  if (Array.isArray(input.majors)) return input.majors.filter(Boolean);
  if (input.major != null) return [input.major];
  if (input.majorCode != null) return [input.majorCode];
  return [];
}

function aliasIndex(rows = []) {
  const index = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = normalizeMajorText(row.pattern || row.alias || row.name || '');
    if (!key) continue;
    const codes = [...new Set((row.targetCodes || row.candidateCodes || [])
      .map(normalizeMajorCode)
      .filter(Boolean))];
    const current = index.get(key) || [];
    index.set(key, [...new Set([...current, ...codes])]);
  }
  return index;
}

function identityFromResolved(resolved) {
  if (!resolved || resolved.kind !== 'major' || !resolved.item) return null;
  const item = resolved.item;
  return Object.freeze({
    code: normalizeMajorCode(item.code),
    name: text(item.name),
    categoryCode: text(item.categoryCode || item.majorClassCode),
    categoryName: text(item.categoryName || item.majorClass),
    disciplineCode: text(item.disciplineCode),
    disciplineName: text(item.disciplineName || item.discipline || item.degreeCategory),
    catalogYear: Number(item.catalogYear || 2026),
    matchType: resolved.matchType || 'exact',
    confidence: Number(resolved.confidence || 0)
  });
}

function unavailableLayer(owner, request) {
  return Object.freeze({
    status: 'unavailable',
    owner: owner || '',
    request
  });
}

async function invokeLayer(adapter, request, owner) {
  if (typeof adapter !== 'function') return unavailableLayer(owner, request);
  try {
    const value = await adapter(request);
    return Object.freeze({
      status: 'available',
      owner: owner || '',
      data: value == null ? null : value,
      request
    });
  } catch (error) {
    return Object.freeze({
      status: 'error',
      owner: owner || '',
      message: text(error?.message || error),
      request
    });
  }
}

export function createMajorDomainOwner(options = {}) {
  const resolver = options.resolver || createMajorCatalogResolver(
    options.majorRows || [],
    options.categories || []
  );
  const aliases = aliasIndex(options.aliases || []);
  const owners = Object.freeze({
    knowledge: text(options.knowledgeOwner || 'major-knowledge-owner'),
    schoolMajor: text(options.schoolMajorOwner || 'school-major-relationship-owner'),
    admission: text(options.admissionOwner || 'admission-history-owner'),
    experience: text(options.experienceOwner || 'student-experience-owner')
  });

  function resolveIdentity(value, { allowContains = false } = {}) {
    const raw = text(typeof value === 'object' ? value.code || value.name : value);
    if (!raw) return Object.freeze({ status: 'missing', query: raw, major: null, candidates: [] });

    const exact = resolver.resolve(raw, { allowContains: false });
    const exactIdentity = identityFromResolved(exact);
    if (exactIdentity) return Object.freeze({ status: 'resolved', query: raw, major: exactIdentity, candidates: [exactIdentity] });

    const aliasCodes = aliases.get(normalizeMajorText(raw)) || [];
    const aliasMajors = aliasCodes.map(code => resolver.findByCode(code)).filter(Boolean).map(item => identityFromResolved({
      kind: 'major',
      item,
      matchType: 'alias_exact',
      confidence: 88
    }));
    if (aliasMajors.length === 1) {
      return Object.freeze({ status: 'resolved', query: raw, major: aliasMajors[0], candidates: aliasMajors });
    }
    if (aliasMajors.length > 1) {
      return Object.freeze({ status: 'ambiguous', query: raw, major: null, candidates: aliasMajors });
    }

    const fallback = allowContains ? identityFromResolved(resolver.resolve(raw, { allowContains: true })) : null;
    if (fallback) return Object.freeze({ status: 'resolved', query: raw, major: fallback, candidates: [fallback] });

    const category = resolver.resolve(raw, { allowContains: false });
    if (category?.kind === 'category') {
      const candidates = (category.item.codes || [])
        .map(code => resolver.findByCode(code))
        .filter(Boolean)
        .map(item => identityFromResolved({ kind: 'major', item, matchType: 'category_child', confidence: 72 }));
      return Object.freeze({ status: 'ambiguous', query: raw, major: null, candidates });
    }
    return Object.freeze({ status: 'unresolved', query: raw, major: null, candidates: [] });
  }

  function resolveMany(values = [], optionsForResolve = {}) {
    const results = values.map(value => resolveIdentity(value, optionsForResolve));
    const unresolved = results.filter(item => item.status !== 'resolved');
    if (unresolved.length) {
      return Object.freeze({
        status: 'needs-clarification',
        results: Object.freeze(results),
        majors: Object.freeze([]),
        unresolved: Object.freeze(unresolved)
      });
    }
    const byCode = new Map();
    for (const result of results) byCode.set(result.major.code, result.major);
    return Object.freeze({
      status: 'resolved',
      results: Object.freeze(results),
      majors: Object.freeze([...byCode.values()])
    });
  }

  async function planQuestion(input = {}) {
    const scope = text(input.scope || (input.region ? 'province-major' : input.school ? 'school-major' : 'major'));
    const resolved = resolveMany(inputValues(input), { allowContains: Boolean(input.allowContains) });
    if (resolved.status !== 'resolved') {
      return Object.freeze({
        status: 'needs-clarification',
        scope,
        query: input,
        identity: resolved,
        layers: Object.freeze({})
      });
    }

    const request = Object.freeze({
      scope,
      majorCodes: Object.freeze(resolved.majors.map(item => item.code)),
      majors: resolved.majors,
      region: text(input.region),
      school: text(input.school),
      includeCooperation: input.includeCooperation !== false,
      sort: text(input.sort || 'score-desc'),
      page: Number.isFinite(Number(input.page)) ? Math.max(0, Number(input.page)) : 0,
      pageSize: Number.isFinite(Number(input.pageSize)) ? Math.max(1, Number(input.pageSize)) : 40
    });

    const [knowledge, schoolMajor, admission, experience] = await Promise.all([
      invokeLayer(options.knowledgeResolver, request, owners.knowledge),
      invokeLayer(options.schoolMajorResolver, request, owners.schoolMajor),
      invokeLayer(options.admissionResolver, request, owners.admission),
      invokeLayer(options.experienceResolver, request, owners.experience)
    ]);

    return Object.freeze({
      status: 'ok',
      scope,
      query: input,
      identity: Object.freeze({
        status: 'resolved',
        majors: resolved.majors
      }),
      layers: Object.freeze({ knowledge, schoolMajor, admission, experience }),
      boundaries: MAJOR_DOMAIN_OWNER_META
    });
  }

  return Object.freeze({
    meta: MAJOR_DOMAIN_OWNER_META,
    owners,
    resolveIdentity,
    resolveMany,
    planQuestion,
    planProvinceMajorQuery: input => planQuestion({ ...input, scope: 'province-major' }),
    planSchoolMajorQuery: input => planQuestion({ ...input, scope: 'school-major' })
  });
}
