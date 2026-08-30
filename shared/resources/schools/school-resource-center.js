import {
  getSchoolEntity,
  findSchoolEntityByName,
  publicSchoolEntity,
  isEntitySourceAvailable
} from './school-identity-center.js';

export const SCHOOL_RESOURCE_PATHS = Object.freeze({
  tongxueDirectoryModule: '/tongxue/data/school-name-resolver-v150.js',
  tongxueDirectoryData: '/tongxue/data/school-search-index.20260617-v150.json',
  sharedSchoolIdentity: '/shared/resources/schools/school-identity-center.js'
});

let tongxueDirectoryPromise = null;

export function normalizeSchoolName(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[（【\[]/g, '(')
    .replace(/[）】\]]/g, ')')
    .replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '')
    .trim();
}

export function isCampusLikeSchoolName(value) {
  return /校区|分校|研究院/.test(String(value || ''));
}

function cleanCampusLabel(value) {
  return String(value || '')
    .replace(/^(?:办学地点|实际校区|所在校区|校区|分校)[：:]\s*/g, '')
    .replace(/^学校标签[：:]\s*/g, '')
    .trim();
}

function compactEntityResult(entity, fallbackSchool = '') {
  if (!entity || !isEntitySourceAvailable(entity)) return null;
  const publicEntity = publicSchoolEntity(entity);
  return Object.freeze({
    school: publicEntity?.displayName || entity.displayName || fallbackSchool,
    entityId: publicEntity?.entityId || entity.entityId || '',
    entityType: publicEntity?.entityType || entity.entityType || 'official_school',
    sourceStatus: publicEntity?.sourceStatus || entity.sourceStatus || 'direct',
    source: 'shared-school-identity-center'
  });
}

export function resolveCompactSchoolResource(name) {
  const school = String(name || '').trim();
  if (!school) return null;
  const entity = findSchoolEntityByName(school);
  if (entity) return compactEntityResult(entity, school);
  if (isCampusLikeSchoolName(school)) return null;
  return Object.freeze({
    school,
    entityId: '',
    entityType: 'official_school',
    sourceStatus: 'directory_resolve_on_open',
    source: 'ordinary-school-fallback'
  });
}

function combinedCampusCandidates(baseSchool, campusLabel) {
  const base = String(baseSchool || '').trim();
  const campus = cleanCampusLabel(campusLabel);
  if (!base || !campus) return [];
  const baseNorm = normalizeSchoolName(base);
  const campusNorm = normalizeSchoolName(campus);
  if (!campusNorm || campusNorm.includes(baseNorm) || baseNorm.includes(campusNorm)) return [campus];
  return [
    `${base}${campus}`,
    `${base}（${campus}）`,
    `${base}(${campus})`
  ];
}

export function resolveCardSchoolResource(candidates = []) {
  const rows = [...new Set((Array.isArray(candidates) ? candidates : [candidates])
    .map(value => String(value || '').trim())
    .filter(Boolean))];
  if (!rows.length) return null;

  const baseSchool = [...rows].reverse().find(row => !isCampusLikeSchoolName(row)) || rows.at(-1) || '';
  const campusRows = rows.filter(isCampusLikeSchoolName);

  for (const row of campusRows) {
    const direct = findSchoolEntityByName(row);
    const resolved = compactEntityResult(direct, row);
    if (resolved) return resolved;
  }

  for (const campus of campusRows) {
    for (const combined of combinedCampusCandidates(baseSchool, campus)) {
      const entity = findSchoolEntityByName(combined);
      const resolved = compactEntityResult(entity, combined);
      if (resolved) return resolved;
    }
  }

  for (const row of rows) {
    const entity = findSchoolEntityByName(row);
    const resolved = compactEntityResult(entity, row);
    if (resolved) return resolved;
  }

  return resolveCompactSchoolResource(baseSchool || rows.at(-1));
}

function canonicalSchoolEntity(school, entityId = '') {
  const requestedId = String(entityId || '').trim();
  const requestedEntity = requestedId ? getSchoolEntity(requestedId) : null;
  return requestedEntity || findSchoolEntityByName(String(school || '').trim()) || null;
}

export function buildTongxueSchoolHref({ school, entityId = '' } = {}) {
  const name = String(school || '').trim();
  if (!name) return '';
  const entity = canonicalSchoolEntity(name, entityId);
  const params = new URLSearchParams({ school: entity?.displayName || name });
  if (entity?.entityId) params.set('entity', entity.entityId);
  return `/tongxue/?${params.toString()}`;
}

export function buildSchoolAllHref({ school, entityId = '', majorKeyword = '', score = '', focus = '' } = {}) {
  const name = String(school || '').trim();
  if (!name) return '';
  const entity = canonicalSchoolEntity(name, entityId);
  const params = new URLSearchParams({ mode: 'school-all', school: entity?.displayName || name });
  if (entity?.entityId) params.set('schoolEntity', entity.entityId);
  const major = String(majorKeyword || '').trim();
  if (major) params.set('majorKeyword', major);
  const scoreText = String(score || '').replace(/[^0-9]/g, '');
  if (scoreText) params.set('score', scoreText);
  if (focus === 'school-all') return `/ln-rank/?${params.toString()}#schoolAllResultsPanel`;
  return `/ln-rank/?${params.toString()}`;
}

export async function loadTongxueSchoolDirectory() {
  if (!tongxueDirectoryPromise) {
    tongxueDirectoryPromise = import('../../../tongxue/data/school-name-resolver-v150.js')
      .then(module => module.loadSchoolCatalog())
      .catch(error => {
        tongxueDirectoryPromise = null;
        throw error;
      });
  }
  return tongxueDirectoryPromise;
}

export function clearTongxueDirectoryCacheForTest() {
  tongxueDirectoryPromise = null;
}
