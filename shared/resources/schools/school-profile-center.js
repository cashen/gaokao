import {
  SCHOOL_PROFILE_SOURCE_META,
  SCHOOL_PROFILE_ROWS,
  SCHOOL_PROFILE_ALIASES
} from './school-profile-data.20260617-v3957.js';
import {
  findSchoolEntityByName,
  getSchoolEntity,
  publicSchoolEntity
} from '../../../tongxue/data/school-entities-v150.js';
import { deriveRegionGroups } from '../geo/china-region-catalog.js';

function text(value) {
  return String(value == null ? '' : value).trim();
}

function cleanProvince(value) {
  return text(value).replace(/省$|市$|自治区$|特别行政区$/g, '');
}

function cleanCity(value) {
  return text(value).replace(/市$|地区$|自治州$|盟$/g, '');
}

function displayLocation(provinceValue, cityValue) {
  const province = cleanProvince(provinceValue);
  const city = cleanCity(cityValue);
  if (province && city && province !== city) return `${province} · ${city}`;
  return city || province || '地域待核验';
}

export function normalizeSchoolProfileName(value) {
  return text(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[（【\[]/g, '(')
    .replace(/[）】\]]/g, ')')
    .replace(/[\s·•,，。；;：:'"“”‘’!！?？_—-]+/g, '')
    .trim();
}

function natureLabel(type) {
  if (type === 'public') return '公办';
  if (type === 'private') return '民办';
  if (type === 'cooperative') return '合作办学';
  return '性质待核验';
}

function entityTypeLabel(type) {
  return ({
    official_school: '',
    branch_school: '分校',
    admission_campus: '招生校区',
    ordinary_campus: '校区'
  })[type] || '';
}

function tierTags(is985, is211) {
  if (is985) return Object.freeze(['985', '211']);
  if (is211) return Object.freeze(['211']);
  return Object.freeze(['双非（非985/211）']);
}

function profileFromRow(row) {
  const [
    school,
    schoolIdentifier,
    competentDepartment,
    province,
    city,
    educationLevel,
    natureType,
    officialRemark,
    is985Raw,
    is211Raw
  ] = row;
  const is985 = Boolean(is985Raw);
  const is211 = Boolean(is211Raw || is985Raw);
  const isNon985211 = !is985 && !is211;
  return Object.freeze({
    school,
    standardSchoolName: school,
    parentSchoolName: '',
    schoolIdentifier,
    competentDepartment,
    province: cleanProvince(province),
    city: cleanCity(city),
    displayLocation: displayLocation(province, city),
    educationLevel,
    natureType,
    natureLabel: natureLabel(natureType),
    officialRemark,
    is985,
    is211,
    isNon985211,
    schoolTierTags: tierTags(is985, is211),
    entityType: 'official_school',
    entityTypeLabel: '',
    entityId: '',
    regionGroups: Object.freeze(deriveRegionGroups({ province, city })),
    sourceVersion: SCHOOL_PROFILE_SOURCE_META.version,
    sourceAsOfDate: SCHOOL_PROFILE_SOURCE_META.asOfDate,
    sourceName: '教育部全国普通高等学校名单',
    sourceUrl: SCHOOL_PROFILE_SOURCE_META.source.schoolListPageUrl,
    source985Url: SCHOOL_PROFILE_SOURCE_META.source.source985Url,
    source211Url: SCHOOL_PROFILE_SOURCE_META.source.source211Url,
    confidence: 'high',
    doubleNonDefinition: SCHOOL_PROFILE_SOURCE_META.doubleNonDefinition
  });
}

function specialProfile({ school, aliases, province, city, is985 = false, is211 = false, sourceUrl }) {
  return Object.freeze({
    school,
    aliases: Object.freeze(aliases || []),
    standardSchoolName: school,
    parentSchoolName: '',
    schoolIdentifier: '',
    competentDepartment: '中央军委',
    province: cleanProvince(province),
    city: cleanCity(city),
    displayLocation: displayLocation(province, city),
    educationLevel: '本科',
    natureType: 'public',
    natureLabel: '公办',
    officialRemark: '军队院校；普通高考招生资格和培养方式以当年招生章程为准',
    is985: Boolean(is985),
    is211: Boolean(is211 || is985),
    isNon985211: !is985 && !is211,
    schoolTierTags: tierTags(Boolean(is985), Boolean(is211 || is985)),
    entityType: 'official_school',
    entityTypeLabel: '',
    entityId: '',
    regionGroups: Object.freeze(deriveRegionGroups({ province, city })),
    sourceVersion: SCHOOL_PROFILE_SOURCE_META.version,
    sourceAsOfDate: '2026-07-23',
    sourceName: '学校官方招生信息',
    sourceUrl,
    source985Url: SCHOOL_PROFILE_SOURCE_META.source.source985Url,
    source211Url: SCHOOL_PROFILE_SOURCE_META.source.source211Url,
    confidence: 'high',
    matchNote: '该校不在教育部普通高校名单主表中，名称和所在地按学校官方招生信息补充。',
    doubleNonDefinition: SCHOOL_PROFILE_SOURCE_META.doubleNonDefinition
  });
}

export const SCHOOL_PROFILE_SPECIALS = Object.freeze([
  specialProfile({
    school: '中国人民解放军国防科技大学',
    aliases: ['国防科技大学', '中国人民解放军国防科学技术大学', '国防科学技术大学'],
    province: '湖南',
    city: '长沙',
    is985: true,
    is211: true,
    sourceUrl: 'https://www.nudt.edu.cn/bkzs/xxgk/zsjz/e92b19fd22dd4ca9ab9f255e5db4603d.htm'
  }),
  specialProfile({
    school: '中国人民解放军海军军医大学',
    aliases: ['海军军医大学', '第二军医大学', '中国人民解放军第二军医大学'],
    province: '上海',
    city: '上海',
    is211: true,
    sourceUrl: 'https://www.smmu.edu.cn/'
  }),
  specialProfile({
    school: '中国人民解放军空军军医大学',
    aliases: ['空军军医大学', '第四军医大学', '中国人民解放军第四军医大学'],
    province: '陕西',
    city: '西安',
    is211: true,
    sourceUrl: 'https://www.fmmu.edu.cn/zhaosheng/info/1016/1692.htm'
  })
]);

const byName = new Map();
for (const row of SCHOOL_PROFILE_ROWS) {
  const profile = profileFromRow(row);
  byName.set(normalizeSchoolProfileName(profile.school), profile);
}
for (const profile of SCHOOL_PROFILE_SPECIALS) {
  for (const name of [profile.school, ...profile.aliases]) {
    byName.set(normalizeSchoolProfileName(name), profile);
  }
}

const aliasMap = new Map();
for (const row of SCHOOL_PROFILE_ALIASES) {
  const [raw, standard] = row;
  const rawKey = normalizeSchoolProfileName(raw);
  const standardKey = normalizeSchoolProfileName(standard);
  if (rawKey && standardKey && !aliasMap.has(rawKey)) aliasMap.set(rawKey, standardKey);
}

function directProfile(name) {
  const key = normalizeSchoolProfileName(name);
  if (!key) return null;
  return byName.get(key) || byName.get(aliasMap.get(key)) || null;
}

function entityBaseProfile(entity) {
  if (!entity) return null;
  const parent = entity.parentEntityId ? getSchoolEntity(entity.parentEntityId) : null;
  const candidates = [
    entity.officialCatalogName,
    parent?.officialCatalogName,
    parent?.displayName,
    entity.sourceQuery,
    entity.displayName
  ].filter(Boolean);
  for (const name of candidates) {
    const profile = directProfile(name);
    if (profile) return profile;
  }
  return null;
}

function entityProfile(entity, fallbackName = '') {
  if (!entity) return null;
  const base = entityBaseProfile(entity);
  const publicEntity = publicSchoolEntity(entity) || {};
  const parent = entity.parentEntityId ? getSchoolEntity(entity.parentEntityId) : null;
  const province = cleanProvince(publicEntity.province || entity.province || base?.province);
  const city = cleanCity(publicEntity.city || entity.city || base?.city);
  const standardSchoolName = text(base?.standardSchoolName || entity.officialCatalogName || parent?.displayName || entity.displayName || fallbackName);
  const displayName = text(entity.displayName || fallbackName || standardSchoolName);
  const natureType = base?.natureType || 'unknown';
  const is985 = Boolean(base?.is985);
  const is211 = Boolean(base?.is211 || base?.is985);
  const isNon985211 = base ? (!is985 && !is211) : false;
  const schoolTierTags = base?.schoolTierTags || Object.freeze([]);
  const type = entity.entityType || 'official_school';
  return Object.freeze({
    ...(base || {}),
    school: displayName,
    standardSchoolName,
    parentSchoolName: text(parent?.displayName || ''),
    province,
    city,
    displayLocation: displayLocation(province, city),
    natureType,
    natureLabel: natureLabel(natureType),
    is985,
    is211,
    isNon985211,
    schoolTierTags,
    entityType: type,
    entityTypeLabel: entityTypeLabel(type),
    entityId: entity.entityId || '',
    regionGroups: Object.freeze(deriveRegionGroups({ province, city })),
    confidence: base ? 'high' : 'medium',
    sourceName: base?.sourceName || '同学你好校区实体表',
    sourceUrl: base?.sourceUrl || '',
    matchNote: type === 'official_school' ? '' : '层级与办学性质继承母体学校；地域按该分校或校区实际办学地显示。'
  });
}

export function resolveSchoolProfile(name, fallback = {}) {
  const school = text(name || fallback.school || fallback.schoolName);
  if (!school) return null;
  const entity = findSchoolEntityByName(school);
  if (entity) return entityProfile(entity, school);
  const direct = directProfile(school);
  if (direct) return direct;

  const fallbackNatureType = ['public', 'private', 'cooperative'].includes(fallback.natureType)
    ? fallback.natureType
    : 'unknown';
  const fallbackProvince = cleanProvince(fallback.province);
  const fallbackCity = cleanCity(fallback.city);
  if (!fallbackProvince && !fallbackCity && fallbackNatureType === 'unknown') return null;
  return Object.freeze({
    school,
    standardSchoolName: text(fallback.standardSchoolName || school),
    parentSchoolName: '',
    schoolIdentifier: text(fallback.schoolIdentifier),
    competentDepartment: '',
    province: fallbackProvince,
    city: fallbackCity,
    displayLocation: displayLocation(fallbackProvince, fallbackCity),
    educationLevel: '',
    natureType: fallbackNatureType,
    natureLabel: natureLabel(fallbackNatureType),
    officialRemark: '',
    is985: Boolean(fallback.is985),
    is211: Boolean(fallback.is211 || fallback.is985),
    isNon985211: Boolean(fallback.isNon985211),
    schoolTierTags: Object.freeze(Array.isArray(fallback.schoolTierTags) ? fallback.schoolTierTags.filter(Boolean) : []),
    entityType: 'official_school',
    entityTypeLabel: '',
    entityId: '',
    regionGroups: Object.freeze(deriveRegionGroups({ province: fallbackProvince, city: fallbackCity })),
    sourceVersion: SCHOOL_PROFILE_SOURCE_META.version,
    sourceAsOfDate: SCHOOL_PROFILE_SOURCE_META.asOfDate,
    sourceName: '记录字段回退',
    sourceUrl: '',
    confidence: 'low',
    doubleNonDefinition: SCHOOL_PROFILE_SOURCE_META.doubleNonDefinition
  });
}

export function getSchoolProfileDisplayTags(profileOrName) {
  const profile = typeof profileOrName === 'string' ? resolveSchoolProfile(profileOrName) : profileOrName;
  if (!profile) return [];
  const tags = [
    ...(Array.isArray(profile.schoolTierTags) ? profile.schoolTierTags : []),
    profile.natureLabel,
    profile.entityTypeLabel,
    profile.displayLocation
  ];
  return [...new Set(tags.filter(Boolean))];
}

export { SCHOOL_PROFILE_SOURCE_META };
