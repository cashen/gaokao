import { SCHOOL_GEO_DB, SCHOOL_GEO_SOURCE_META } from './school-geo-db.js';
import { compactSchoolName, looseSchoolName, findByAlias } from './school-alias-map.js';

function text(value) { return String(value == null ? '' : value).trim(); }
function displayLocation(item) { return item.province && item.city ? `${item.province} · ${item.city}` : (item.province || '地域待核验'); }

function makeResult(item, { matchedBy, rawSchool }) {
  if (!item) return null;
  return {
    geoEntity: item.canonical,
    schoolCanonical: item.standardSchoolName || item.canonical,
    province: item.province,
    city: item.city,
    displayLocation: displayLocation(item),
    locationSource: matchedBy || item.sourceMethod || 'school-geo-db',
    locationConfidence: item.confidence || 'medium',
    locationWarning: item.locationWarning || item.matchNote || '',
    regionGroups: item.groups || [],
    rawSchool: rawSchool || '',
    geoSourceMethod: item.sourceMethod || '',
    geoSourceName: item.sourceName || '',
    geoSourceUrl: item.sourceUrl || '',
    geoSourceYear: item.sourceYear || '',
    geoMatchNote: item.matchNote || '',
    schoolIdentifier: item.schoolIdentifier || '',
    natureHint: item.natureHint || ''
  };
}

const CAMPUS_PATTERNS = [
  { re: /东北大学.*秦皇岛|东北大学.*河北/, canonical: '东北大学秦皇岛分校' },
  { re: /哈尔滨工业大学.*深圳|哈工大.*深圳/, canonical: '哈尔滨工业大学(深圳)' },
  { re: /哈尔滨工业大学.*威海|哈工大.*威海/, canonical: '哈尔滨工业大学(威海)' },
  { re: /山东大学.*威海/, canonical: '山东大学威海分校' },
  { re: /北京交通大学.*威海/, canonical: '北京交通大学(威海校区)' },
  { re: /北京师范大学.*珠海/, canonical: '北京师范大学(珠海校区)' },
  { re: /中国人民大学.*苏州/, canonical: '中国人民大学(苏州校区)' },
  { re: /电子科技大学.*沙河/, canonical: '电子科技大学(沙河校区)' },
  { re: /合肥工业大学.*宣城/, canonical: '合肥工业大学(宣城校区)' },
  { re: /华北电力大学.*保定/, canonical: '华北电力大学(保定)' },
  { re: /中国石油大学.*克拉玛依/, canonical: '中国石油大学(北京)克拉玛依校区' },
  { re: /大连理工大学.*盘锦/, canonical: '大连理工大学(盘锦校区)' }
];

function findCanonical(canonical) { return SCHOOL_GEO_DB.find(item => item.canonical === canonical) || null; }

function matchCampusRule(school, major) {
  const target = `${compactSchoolName(school)} ${compactSchoolName(major)}`;
  for (const rule of CAMPUS_PATTERNS) if (rule.re.test(target)) return findCanonical(rule.canonical);
  return null;
}

function fuzzyMatch(school) {
  const rawLoose = looseSchoolName(school);
  if (!rawLoose) return null;
  const sorted = [...SCHOOL_GEO_DB].sort((a, b) => b.canonical.length - a.canonical.length);
  for (const item of sorted) {
    const names = [item.canonical, ...(item.aliases || [])].map(looseSchoolName).filter(Boolean);
    for (const name of names) {
      if (rawLoose === name || rawLoose.includes(name) || name.includes(rawLoose)) return item;
    }
  }
  return null;
}

export function normalizeSchoolGeo(school, major = '') {
  const rawSchool = text(school);
  const campus = matchCampusRule(rawSchool, major);
  if (campus) return makeResult(campus, { matchedBy: 'campus-rule', rawSchool });

  const alias = findByAlias(rawSchool);
  if (alias) return makeResult(alias, { matchedBy: 'fenxi-geo-alias', rawSchool });

  const fuzzy = fuzzyMatch(rawSchool);
  if (fuzzy) return makeResult(fuzzy, { matchedBy: 'fenxi-geo-fuzzy', rawSchool });

  return null;
}

export function getSchoolGeoDbSize() { return SCHOOL_GEO_DB.length; }
export function getSchoolGeoSourceMeta() { return SCHOOL_GEO_SOURCE_META; }
