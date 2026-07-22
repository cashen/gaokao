import {
  findSchoolEntityByName,
  publicSchoolEntity,
  isEntitySourceAvailable
} from '../../../tongxue/data/school-entities-v150.js';

export const SCHOOL_RESOURCE_PATHS = Object.freeze({
  tongxueDirectoryModule: '/tongxue/data/school-name-resolver-v150.js',
  tongxueDirectoryData: '/tongxue/data/school-search-index.20260617-v150.json',
  tongxueCompactEntities: '/tongxue/data/school-entities-v150.js'
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

export function resolveCompactSchoolResource(name) {
  const school = String(name || '').trim();
  if (!school) return null;
  const entity = findSchoolEntityByName(school);
  if (!entity) {
    if (isCampusLikeSchoolName(school)) return null;
    return Object.freeze({
      school,
      entityId: '',
      entityType: 'official_school',
      sourceStatus: 'directory_resolve_on_open',
      source: 'ordinary-school-fallback'
    });
  }
  if (!isEntitySourceAvailable(entity)) return null;
  const publicEntity = publicSchoolEntity(entity);
  return Object.freeze({
    school: publicEntity?.displayName || entity.displayName || school,
    entityId: publicEntity?.entityId || entity.entityId || '',
    entityType: publicEntity?.entityType || entity.entityType || 'official_school',
    sourceStatus: publicEntity?.sourceStatus || entity.sourceStatus || 'direct',
    source: 'compact-entity-table'
  });
}

export function resolveCardSchoolResource(candidates = []) {
  const rows = [...new Set((Array.isArray(candidates) ? candidates : [candidates])
    .map(value => String(value || '').trim())
    .filter(Boolean))];
  const fallback = rows.at(-1) || '';
  for (const row of rows) {
    const resolved = resolveCompactSchoolResource(row);
    if (resolved?.source === 'compact-entity-table') return resolved;
  }
  return resolveCompactSchoolResource(fallback);
}

export function buildTongxueSchoolHref({ school, entityId = '' } = {}) {
  const name = String(school || '').trim();
  if (!name) return '';
  const params = new URLSearchParams({ school: name });
  if (entityId) params.set('entity', String(entityId));
  return `/tongxue/?${params.toString()}`;
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
