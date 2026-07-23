import { resolveSchoolProfile } from '../../shared/resources/schools/school-profile-center.js';
import { normalizeSchoolGeo } from './school-geo-normalizer.js';

function text(value) { return String(value == null ? '' : value).trim(); }
function normalizeProvince(value) { return text(value).replace(/省$|市$|自治区$|特别行政区$/g, ''); }
function normalizeCity(value) { return text(value).replace(/市$|地区$|自治州$|盟$/g, ''); }
function lnAreaFromProvinceCity(province, city, fallback = '') {
  if (province !== '辽宁') return province ? '省外' : fallback;
  if (city === '沈阳') return '沈阳';
  if (city === '大连') return '大连';
  return '辽宁其他';
}
function rawLocation(raw = {}) {
  return {
    province: normalizeProvince(raw.schoolProvince || raw.province || raw['省份'] || raw['学校省份']),
    city: normalizeCity(raw.schoolCity || raw.city || raw['城市'] || raw['学校城市'] || raw['所在地']),
    lnArea: text(raw.lnArea || raw['辽宁区域'] || raw['地域'])
  };
}
function fromProfile(profile, rawLoc) {
  const province = normalizeProvince(profile.province);
  const city = normalizeCity(profile.city);
  return {
    lnArea: lnAreaFromProvinceCity(province, city, rawLoc.lnArea),
    province,
    city,
    displayLocation: profile.displayLocation || (province && city ? `${province} · ${city}` : province || city || '地域待核验'),
    locationSource: 'school-profile-center',
    locationConfidence: profile.confidence || 'high',
    locationWarning: profile.entityType === 'official_school' ? '' : '地域按该分校或校区实际办学地显示；具体专业就读地点仍需核验当年招生计划。',
    geoEntity: profile.school || '',
    schoolCanonical: profile.standardSchoolName || profile.school || '',
    regionGroups: profile.regionGroups || [],
    geoSourceMethod: 'official-2026-school-profile',
    geoSourceName: profile.sourceName || '教育部全国普通高等学校名单',
    geoSourceUrl: profile.sourceUrl || '',
    geoSourceYear: 2026,
    geoMatchNote: profile.matchNote || '',
    schoolIdentifier: profile.schoolIdentifier || '',
    natureHint: profile.natureLabel || '',
    schoolProfile: profile
  };
}

export function normalizeLocation(raw, school, major = '') {
  const rawLoc = rawLocation(raw);
  const profile = resolveSchoolProfile(school, rawLoc);
  if (profile) return fromProfile(profile, rawLoc);

  const geo = normalizeSchoolGeo(school, major);
  if (geo) {
    return {
      lnArea: lnAreaFromProvinceCity(geo.province, geo.city, rawLoc.lnArea),
      province: geo.province,
      city: geo.city,
      displayLocation: geo.displayLocation,
      locationSource: geo.locationSource,
      locationConfidence: geo.locationConfidence,
      locationWarning: geo.locationWarning,
      geoEntity: geo.geoEntity,
      schoolCanonical: geo.schoolCanonical,
      regionGroups: geo.regionGroups,
      geoSourceMethod: geo.geoSourceMethod || '',
      geoSourceName: geo.geoSourceName || '',
      geoSourceUrl: geo.geoSourceUrl || '',
      geoSourceYear: geo.geoSourceYear || '',
      geoMatchNote: geo.geoMatchNote || '',
      schoolIdentifier: geo.schoolIdentifier || '',
      natureHint: geo.natureHint || ''
    };
  }
  if (rawLoc.province) {
    return {
      lnArea: rawLoc.lnArea || lnAreaFromProvinceCity(rawLoc.province, rawLoc.city),
      province: rawLoc.province,
      city: rawLoc.city,
      displayLocation: rawLoc.city ? `${rawLoc.province} · ${rawLoc.city}` : rawLoc.province,
      locationSource: 'record-fallback',
      locationConfidence: rawLoc.city ? 'medium' : 'low',
      locationWarning: rawLoc.city ? '学校未进入统一资料中心，地域来自记录字段。' : '城市字段待核验',
      geoEntity: '', schoolCanonical: '', regionGroups: []
    };
  }
  return {
    lnArea: rawLoc.lnArea,
    province: '', city: '',
    displayLocation: rawLoc.lnArea || '地域待核验',
    locationSource: rawLoc.lnArea ? 'ln-area' : 'missing',
    locationConfidence: 'low',
    locationWarning: '地域待核验',
    geoEntity: '', schoolCanonical: '', regionGroups: []
  };
}
