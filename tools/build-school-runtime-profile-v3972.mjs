import fs from 'node:fs';
import path from 'node:path';
import { resolveSchoolProfile, normalizeSchoolProfileName } from '../shared/resources/schools/school-profile-center.js';

const manifestPath = 'fenxi/data/ln-rank-2026/manifest.json';
const outputPath = process.env.SCHOOL_RUNTIME_PROFILE_OUTPUT || '/tmp/school-runtime-profile.generated.js';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const schoolRecords = new Map();

function text(value) { return String(value == null ? '' : value).trim(); }
function natureTypeFromRecord(record = {}) {
  const value = text(record.schoolNatureLabel || record.natureLabel || record.nature || record.natureRaw || record['院校性质']);
  if (/民办|独立/.test(value)) return 'private';
  if (/合作办学/.test(value)) return 'cooperative';
  if (/公办/.test(value)) return 'public';
  return 'unknown';
}
function cleanProvince(value) { return text(value).replace(/省$|市$|自治区$|特别行政区$/g, ''); }
function cleanCity(value) { return text(value).replace(/市$|地区$|自治州$|盟$/g, ''); }
function displayLocation(province, city, area = '') {
  const p = cleanProvince(province);
  const c = cleanCity(city);
  if (p && c && p !== c) return `${p} · ${c}`;
  return c || p || text(area) || '地域待核验';
}

for (const chunk of manifest.chunks || []) {
  const file = path.join('fenxi', String(chunk.file || chunk.path || '').replace(/^\/+/, ''));
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  const records = Array.isArray(payload) ? payload : (Array.isArray(payload.records) ? payload.records : []);
  for (const record of records) {
    const school = text(record.school || record.schoolName || record['院校名称'] || record['学校名称']);
    if (school && !schoolRecords.has(school)) schoolRecords.set(school, record);
  }
}

function compact(profile = {}, requestedName = '') {
  return [
    profile.school || requestedName,
    profile.standardSchoolName || profile.school || requestedName,
    profile.parentSchoolName || '',
    profile.province || '',
    profile.city || '',
    profile.displayLocation || '',
    profile.natureType || 'unknown',
    Boolean(profile.is985),
    Boolean(profile.is211),
    Boolean(profile.isNon985211),
    Array.isArray(profile.schoolTierTags) ? profile.schoolTierTags : [],
    profile.entityType || 'official_school',
    profile.entityTypeLabel || '',
    profile.entityId || '',
    Array.isArray(profile.regionGroups) ? profile.regionGroups : [],
    profile.confidence || '',
    profile.sourceName || '',
    profile.sourceUrl || '',
    profile.sourceAsOfDate || '',
    profile.matchNote || '',
    profile.schoolIdentifier || '',
    profile.doubleNonDefinition || '非985且非211；不等同于非双一流'
  ];
}

const rows = [];
const rowBySignature = new Map();
const index = {};
const fallbackSchools = [];
for (const school of [...schoolRecords.keys()].sort((a, b) => a.localeCompare(b, 'zh-CN'))) {
  const raw = schoolRecords.get(school) || {};
  const fallback = {
    school,
    province: raw.schoolProvince || raw.province || raw['省份'] || raw['学校省份'] || '',
    city: raw.schoolCity || raw.city || raw['城市'] || raw['学校城市'] || raw['所在地'] || '',
    natureType: natureTypeFromRecord(raw),
    natureLabel: raw.schoolNatureLabel || raw.natureLabel || raw.nature || '',
    schoolIdentifier: raw.schoolCode2026 || raw.schoolIdentifier || '',
    confidence: 'low'
  };
  let profile = resolveSchoolProfile(school, fallback);
  if (!profile) {
    fallbackSchools.push(school);
    const province = cleanProvince(fallback.province);
    const city = cleanCity(fallback.city);
    const natureType = fallback.natureType;
    profile = {
      school,
      standardSchoolName: school,
      parentSchoolName: '',
      province,
      city,
      displayLocation: displayLocation(province, city, raw.lnArea || raw['辽宁区域'] || raw['地域']),
      natureType,
      is985: false,
      is211: false,
      isNon985211: false,
      schoolTierTags: [],
      entityType: 'official_school',
      entityTypeLabel: '',
      entityId: '',
      regionGroups: [],
      confidence: 'low',
      sourceName: '2026 辽宁投档记录字段回退',
      sourceUrl: '',
      sourceAsOfDate: '2026',
      matchNote: '该校未匹配统一画像中心，地域和性质按投档记录字段显示，需继续核验。',
      schoolIdentifier: fallback.schoolIdentifier,
      doubleNonDefinition: '非985且非211；不等同于非双一流'
    };
  }
  const row = compact(profile, school);
  const signature = JSON.stringify(row);
  let rowIndex = rowBySignature.get(signature);
  if (rowIndex == null) {
    rowIndex = rows.length;
    rows.push(row);
    rowBySignature.set(signature, rowIndex);
  }
  index[normalizeSchoolProfileName(school)] = rowIndex;
  for (const alias of profile?.aliases || []) {
    const key = normalizeSchoolProfileName(alias);
    if (key && index[key] == null) index[key] = rowIndex;
  }
}

const source = `import { deriveRegionGroups } from '../../shared/resources/geo/china-region-catalog.js';

export const SCHOOL_RUNTIME_PROFILE_VERSION = 'school-runtime-profile-v3972_0';
const ROWS = Object.freeze(${JSON.stringify(rows)});
const INDEX = Object.freeze(${JSON.stringify(index)});

function text(value) { return String(value == null ? '' : value).trim(); }
function cleanProvince(value) { return text(value).replace(/省$|市$|自治区$|特别行政区$/g, ''); }
function cleanCity(value) { return text(value).replace(/市$|地区$|自治州$|盟$/g, ''); }
function displayLocation(provinceValue, cityValue) {
  const province = cleanProvince(provinceValue);
  const city = cleanCity(cityValue);
  if (province && city && province !== city) return \`${'${province}'} · ${'${city}'}\`;
  return city || province || '地域待核验';
}
function natureLabel(type) {
  if (type === 'public') return '公办';
  if (type === 'private') return '民办';
  if (type === 'cooperative') return '合作办学';
  return '性质待核验';
}
export function normalizeRuntimeSchoolName(value) {
  return text(value).normalize('NFKC').toLowerCase()
    .replace(/[（【\\[]/g, '(').replace(/[）】\\]]/g, ')')
    .replace(/[\\s·•,，。；;：:'\"“”‘’!！?？_—-]+/g, '').trim();
}
function expand(row) {
  if (!row) return null;
  const [school, standardSchoolName, parentSchoolName, province, city, savedDisplayLocation, natureType, is985, is211, isNon985211, schoolTierTags, entityType, entityTypeLabel, entityId, regionGroups, confidence, sourceName, sourceUrl, sourceAsOfDate, matchNote, schoolIdentifier, doubleNonDefinition] = row;
  return {
    school, standardSchoolName, parentSchoolName, province, city,
    displayLocation: savedDisplayLocation || displayLocation(province, city),
    natureType, natureLabel: natureLabel(natureType), is985, is211, isNon985211,
    schoolTierTags: Array.isArray(schoolTierTags) ? [...schoolTierTags] : [],
    entityType, entityTypeLabel, entityId,
    regionGroups: Array.isArray(regionGroups) ? [...regionGroups] : [],
    confidence, sourceName, sourceUrl, sourceAsOfDate, matchNote, schoolIdentifier,
    doubleNonDefinition
  };
}
export function resolveRuntimeSchoolProfile(name, fallback = {}) {
  const school = text(name || fallback.school || fallback.schoolName);
  const key = normalizeRuntimeSchoolName(school);
  const row = key && Number.isInteger(INDEX[key]) ? ROWS[INDEX[key]] : null;
  if (row) return expand(row);
  const province = cleanProvince(fallback.schoolProvince || fallback.province || fallback['省份'] || fallback['学校省份']);
  const city = cleanCity(fallback.schoolCity || fallback.city || fallback['城市'] || fallback['学校城市'] || fallback['所在地']);
  const rawNature = text(fallback.schoolNatureLabel || fallback.natureLabel || fallback.nature || fallback.natureRaw);
  const natureType = fallback.natureType === 'private' || /民办|独立/.test(rawNature)
    ? 'private'
    : fallback.natureType === 'cooperative' || /合作办学/.test(rawNature)
      ? 'cooperative'
      : fallback.natureType === 'public' || /公办/.test(rawNature)
        ? 'public'
        : 'unknown';
  if (!school && !province && !city && natureType === 'unknown') return null;
  const is985 = Boolean(fallback.is985);
  const is211 = Boolean(fallback.is211 || fallback.is985);
  const schoolTierTags = Array.isArray(fallback.schoolTierTags)
    ? fallback.schoolTierTags.filter(Boolean)
    : (is985 ? ['985', '211'] : (is211 ? ['211'] : []));
  return {
    school,
    standardSchoolName: text(fallback.standardSchoolName || school),
    parentSchoolName: text(fallback.parentSchoolName),
    province,
    city,
    displayLocation: displayLocation(province, city),
    natureType,
    natureLabel: natureLabel(natureType),
    is985,
    is211,
    isNon985211: Boolean(fallback.isNon985211 || (!is985 && !is211 && schoolTierTags.length === 0)),
    schoolTierTags,
    entityType: fallback.entityType || 'official_school',
    entityTypeLabel: fallback.entityTypeLabel || '',
    entityId: fallback.entityId || '',
    regionGroups: Array.isArray(fallback.regionGroups) && fallback.regionGroups.length
      ? [...fallback.regionGroups]
      : deriveRegionGroups({ province, city }),
    confidence: fallback.confidence || (province || city ? 'medium' : 'low'),
    sourceName: fallback.sourceName || '记录字段回退',
    sourceUrl: fallback.sourceUrl || '',
    sourceAsOfDate: fallback.sourceAsOfDate || '',
    matchNote: fallback.matchNote || '',
    schoolIdentifier: fallback.schoolIdentifier || '',
    doubleNonDefinition: fallback.doubleNonDefinition || '非985且非211；不等同于非双一流'
  };
}
export function getRuntimeSchoolProfileDisplayTags(profileOrName) {
  const profile = typeof profileOrName === 'string' ? resolveRuntimeSchoolProfile(profileOrName) : profileOrName;
  if (!profile) return [];
  return [...new Set([...(profile.schoolTierTags || []), profile.natureLabel, profile.entityTypeLabel, profile.displayLocation].filter(Boolean))];
}
export function getRuntimeSchoolProfileDiagnostics() {
  return { version: SCHOOL_RUNTIME_PROFILE_VERSION, indexedNames: Object.keys(INDEX).length, profileRows: ROWS.length };
}
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, source);
const report = {
  version: 'school-runtime-profile-v3972_0',
  outputPath,
  outputBytes: Buffer.byteLength(source),
  admissionSchoolNames: schoolRecords.size,
  indexedNames: Object.keys(index).length,
  profileRows: rows.length,
  fallbackCount: fallbackSchools.length,
  fallbackSchools
};
console.log(JSON.stringify(report, null, 2));
if (Object.keys(index).length < schoolRecords.size) throw new Error('Runtime school profile index is incomplete');
