import { SCHOOL_GEO_DB } from './school-geo-db.js';

export function compactSchoolName(value) {
  return String(value || '')
    .replace(/[\s　]/g, '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .trim();
}

export function looseSchoolName(value) {
  return compactSchoolName(value)
    .replace(/[()（）]/g, '')
    .trim();
}

const CAMPUS_KEYS = ['秦皇岛','威海','深圳','珠海','苏州','宣城','保定','克拉玛依','盘锦','沙河','荣昌','烟台','宏福'];
function hasCampusToken(value) {
  const s = compactSchoolName(value);
  return CAMPUS_KEYS.some(k => s.includes(k));
}

const ALIAS_MAP = new Map();

function addAlias(name, item) {
  const compact = compactSchoolName(name);
  const loose = looseSchoolName(name);
  if (compact && !ALIAS_MAP.has(compact)) ALIAS_MAP.set(compact, item);
  if (loose && !ALIAS_MAP.has(loose)) ALIAS_MAP.set(loose, item);
}

// Longer campus names first, parent names later.
const sorted = [...SCHOOL_GEO_DB].sort((a, b) => b.canonical.length - a.canonical.length);
for (const item of sorted) {
  const names = [item.canonical, ...(item.aliases || [])];
  for (const name of names) addAlias(name, item);
}

export function findByAlias(name) {
  const compact = compactSchoolName(name);
  const loose = looseSchoolName(name);
  const direct = ALIAS_MAP.get(compact) || ALIAS_MAP.get(loose) || null;
  if (!direct) return null;

  // If the raw name contains a campus token, never return a parent entry without that token.
  if (hasCampusToken(name) && !hasCampusToken(direct.canonical)) return null;
  return direct;
}

export function aliasCount() { return ALIAS_MAP.size; }
