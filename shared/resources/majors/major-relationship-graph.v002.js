import { buildUndergradGraduatePathway } from './undergrad-graduate-pathway.v001.js';
import { deriveMajorCatalogHierarchy } from './major-catalog-contract.js';

export const MAJOR_RELATIONSHIP_GRAPH_META = Object.freeze({
  version: 'major-relationship-graph-v002',
  policy: 'derive-from-canonical-undergraduate-hierarchy-and-existing-graduate-navigation',
  identityPolicy: 'undergraduate-hierarchy-uses-major-catalog-contract-derived-category-identity',
  undergraduateBoundary: '本科关系只从教育部2026本科专业目录中的门类、专业类和具体专业层级推导，不复制第二份专业目录。交叉学科中标准目录未单列专业类的专业，保持门类直接到具体专业，不补造1400专业类。',
  graduateBoundary: '研究生国家目录统一到学科门类、一级学科和专业学位类别；二级学科与专业领域由学位授予单位按有关规定在授权权限内自主设置与调整，因此本资源不得伪造全国统一二级学科树。',
  neighborBoundary: '相邻选择只表示同专业类或共享当前已验证的研究生升学导航方向，不代表课程相同、培养方案等价、就业等价或可无条件互相替代。'
});

function clean(value = '') {
  return String(value || '').trim();
}

function routeRecords(pathway = {}) {
  return [
    ...(pathway.academic || []).map(item => ({ ...item, routeKind: 'academic' })),
    ...(pathway.professional || []).map(item => ({ ...item, routeKind: 'professional' }))
  ];
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function sortMajors(items = []) {
  return [...items].sort((a, b) => String(a.code).localeCompare(String(b.code), 'zh-CN'));
}

function immutableMajor(major = {}) {
  const hierarchy = deriveMajorCatalogHierarchy(major);
  return Object.freeze({
    code: hierarchy.code,
    name: hierarchy.name,
    discipline: hierarchy.disciplineName,
    disciplineCode: hierarchy.disciplineCode,
    majorClass: hierarchy.categoryName,
    majorClassCode: hierarchy.categoryCode,
    categoryIsUnlisted: hierarchy.categoryIsUnlisted
  });
}

function classIdentity(major = {}) {
  return clean(major.majorClassCode);
}

function disciplineIdentity(major = {}) {
  return clean(major.disciplineCode) || `name:${clean(major.discipline)}`;
}

function sharedRoutes(a = {}, b = {}) {
  const aAcademic = new Map((a.academic || []).map(item => [item.code, item]));
  const aProfessional = new Map((a.professional || []).map(item => [item.code, item]));
  const academic = (b.academic || []).filter(item => aAcademic.has(item.code));
  const professional = (b.professional || []).filter(item => aProfessional.has(item.code));
  return Object.freeze({
    academic: Object.freeze(academic.map(item => Object.freeze({ code: item.code, name: item.name, kind: 'academic' }))),
    professional: Object.freeze(professional.map(item => Object.freeze({ code: item.code, name: item.name, kind: 'professional' })))
  });
}

function sharedCount(shared = {}) {
  return (shared.academic?.length || 0) + (shared.professional?.length || 0);
}

function relationLabel({ sameClass = false, shared = {} } = {}) {
  const count = sharedCount(shared);
  if (sameClass && count > 0) return '同专业类 · 升学方向有交叉';
  if (sameClass) return '同一本科专业类';
  if (count > 1) return '跨专业类 · 多个升学方向交叉';
  return '跨专业类 · 升学方向交叉';
}

export function createMajorRelationshipGraphResolver(rows = []) {
  const majors = (Array.isArray(rows) ? rows : []).filter(item => item?.code && item?.name).map(immutableMajor);
  const byCode = new Map(majors.map(item => [item.code, item]));
  const byClass = new Map();
  const byDiscipline = new Map();
  const classCodeByName = new Map();
  const disciplineKeyByName = new Map();

  for (const major of majors) {
    const classKey = classIdentity(major);
    const disciplineKey = disciplineIdentity(major);
    if (classKey) {
      if (!byClass.has(classKey)) byClass.set(classKey, []);
      byClass.get(classKey).push(major);
      if (major.majorClass && !classCodeByName.has(major.majorClass)) classCodeByName.set(major.majorClass, classKey);
    }
    if (!byDiscipline.has(disciplineKey)) byDiscipline.set(disciplineKey, []);
    byDiscipline.get(disciplineKey).push(major);
    if (major.discipline && !disciplineKeyByName.has(major.discipline)) disciplineKeyByName.set(major.discipline, disciplineKey);
  }
  for (const [key, items] of byClass) byClass.set(key, sortMajors(items));
  for (const [key, items] of byDiscipline) byDiscipline.set(key, sortMajors(items));

  const pathwayByCode = new Map();
  const routeIndex = new Map();
  for (const major of majors) {
    const pathway = buildUndergradGraduatePathway(major);
    pathwayByCode.set(major.code, pathway);
    for (const route of routeRecords(pathway)) {
      const list = routeIndex.get(route.code) || [];
      list.push(major.code);
      routeIndex.set(route.code, list);
    }
  }

  function resolveMajor(input) {
    if (!input) return null;
    if (typeof input === 'string') return byCode.get(clean(input)) || majors.find(item => item.name === clean(input)) || null;
    return byCode.get(clean(input.code)) || majors.find(item => item.name === clean(input.name)) || null;
  }

  function relationship(source, target) {
    const a = resolveMajor(source);
    const b = resolveMajor(target);
    if (!a || !b || a.code === b.code) return null;
    const aClass = classIdentity(a);
    const bClass = classIdentity(b);
    const sameClass = Boolean(aClass && bClass && aClass === bClass);
    const shared = sharedRoutes(pathwayByCode.get(a.code), pathwayByCode.get(b.code));
    if (!sameClass && sharedCount(shared) === 0) return null;
    return Object.freeze({
      source: a,
      target: b,
      sameClass,
      sameDiscipline: disciplineIdentity(a) === disciplineIdentity(b),
      shared,
      sharedRouteCount: sharedCount(shared),
      relationTypes: Object.freeze([
        ...(sameClass ? ['same_undergraduate_major_class'] : []),
        ...(shared.academic.length ? ['shared_academic_navigation'] : []),
        ...(shared.professional.length ? ['shared_professional_navigation'] : [])
      ]),
      label: relationLabel({ sameClass, shared }),
      boundary: MAJOR_RELATIONSHIP_GRAPH_META.neighborBoundary
    });
  }

  function buildMajorGraph(input, { crossLimit = 10 } = {}) {
    const major = resolveMajor(input);
    if (!major) return null;
    const pathway = pathwayByCode.get(major.code);
    const classKey = classIdentity(major);
    const siblings = classKey ? (byClass.get(classKey) || []).filter(item => item.code !== major.code) : [];
    const siblingRelations = siblings.map(item => relationship(major, item)).filter(Boolean);

    const candidateCodes = new Set();
    for (const route of routeRecords(pathway)) {
      for (const code of routeIndex.get(route.code) || []) {
        if (code !== major.code) candidateCodes.add(code);
      }
    }
    const crossRelations = [...candidateCodes]
      .map(code => relationship(major, byCode.get(code)))
      .filter(item => item && !item.sameClass)
      .filter(item => item.sameDiscipline || item.sharedRouteCount >= 2)
      .sort((a, b) => b.sharedRouteCount - a.sharedRouteCount || Number(b.sameDiscipline) - Number(a.sameDiscipline) || a.target.code.localeCompare(b.target.code, 'zh-CN'));

    return Object.freeze({
      version: MAJOR_RELATIONSHIP_GRAPH_META.version,
      focus: major,
      hierarchy: Object.freeze({
        discipline: Object.freeze({ code: major.disciplineCode, name: major.discipline }),
        majorClass: Object.freeze({ code: major.majorClassCode, name: major.majorClass, isUnlisted: major.categoryIsUnlisted }),
        major
      }),
      pathway,
      siblings: Object.freeze(siblings),
      siblingRelations: Object.freeze(siblingRelations),
      crossNeighbors: Object.freeze(crossRelations.slice(0, Math.max(0, crossLimit))),
      crossNeighborTotal: crossRelations.length,
      boundaries: MAJOR_RELATIONSHIP_GRAPH_META
    });
  }

  function buildClassGraph(classNameOrCode = '') {
    const raw = clean(classNameOrCode);
    const classKey = byClass.has(raw) ? raw : classCodeByName.get(raw);
    const items = classKey ? (byClass.get(classKey) || []) : [];
    if (!items.length) return null;
    const first = items[0];
    const routeMap = new Map();
    for (const major of items) {
      for (const route of routeRecords(pathwayByCode.get(major.code))) {
        const existing = routeMap.get(route.code) || { code: route.code, name: route.name, kind: route.routeKind, count: 0 };
        existing.count += 1;
        routeMap.set(route.code, existing);
      }
    }
    const routes = [...routeMap.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code, 'zh-CN'));
    return Object.freeze({
      version: MAJOR_RELATIONSHIP_GRAPH_META.version,
      discipline: Object.freeze({ code: first.disciplineCode, name: first.discipline }),
      majorClass: Object.freeze({ code: first.majorClassCode, name: first.majorClass }),
      majors: Object.freeze(items),
      commonGraduateRoutes: Object.freeze(routes.map(item => Object.freeze({ ...item, coverage: `${item.count}/${items.length}` }))),
      boundaries: MAJOR_RELATIONSHIP_GRAPH_META
    });
  }

  function buildDisciplineGraph(disciplineNameOrCode = '') {
    const raw = clean(disciplineNameOrCode);
    const disciplineKey = byDiscipline.has(raw) ? raw : disciplineKeyByName.get(raw);
    const items = disciplineKey ? (byDiscipline.get(disciplineKey) || []) : [];
    if (!items.length) return null;
    const first = items[0];
    const categories = new Map();
    const directMajors = [];
    for (const major of items) {
      if (!major.majorClassCode) {
        directMajors.push(major);
        continue;
      }
      const existing = categories.get(major.majorClassCode) || {
        code: major.majorClassCode,
        name: major.majorClass,
        majors: []
      };
      existing.majors.push(major);
      categories.set(major.majorClassCode, existing);
    }
    return Object.freeze({
      version: MAJOR_RELATIONSHIP_GRAPH_META.version,
      discipline: Object.freeze({ code: first.disciplineCode, name: first.discipline }),
      categories: Object.freeze([...categories.values()].map(item => Object.freeze({ ...item, majors: Object.freeze(sortMajors(item.majors)) }))),
      directMajors: Object.freeze(sortMajors(directMajors)),
      boundaries: MAJOR_RELATIONSHIP_GRAPH_META
    });
  }

  function buildCandidateGraph(candidates = []) {
    const resolved = unique((candidates || []).map(item => clean(item?.code || item))).map(code => byCode.get(code)).filter(Boolean);
    const groups = new Map();
    for (const major of resolved) {
      const classKey = classIdentity(major);
      const key = `${disciplineIdentity(major)}|${classKey || 'unlisted'}`;
      if (!groups.has(key)) groups.set(key, {
        discipline: major.discipline,
        disciplineCode: major.disciplineCode,
        majorClass: major.majorClass,
        majorClassCode: major.majorClassCode,
        categoryIsUnlisted: major.categoryIsUnlisted,
        majors: []
      });
      groups.get(key).majors.push(major);
    }
    return Object.freeze({
      version: MAJOR_RELATIONSHIP_GRAPH_META.version,
      groups: Object.freeze([...groups.values()].map(group => Object.freeze({ ...group, majors: Object.freeze(sortMajors(group.majors)) }))),
      candidateCount: resolved.length,
      boundaries: MAJOR_RELATIONSHIP_GRAPH_META
    });
  }

  function stats() {
    return Object.freeze({
      majors: majors.length,
      disciplines: byDiscipline.size,
      majorClasses: byClass.size,
      directDisciplineMajors: majors.filter(item => !item.majorClassCode).length,
      routeCodesIndexed: routeIndex.size,
      version: MAJOR_RELATIONSHIP_GRAPH_META.version
    });
  }

  return Object.freeze({
    meta: MAJOR_RELATIONSHIP_GRAPH_META,
    buildMajorGraph,
    buildClassGraph,
    buildDisciplineGraph,
    buildCandidateGraph,
    relationship,
    stats
  });
}
