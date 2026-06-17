import { normalizeSchoolGeo } from './school-geo-normalizer.js';

function text(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeProvince(value) {
  return text(value).replace(/省$|市$|自治区$|特别行政区$/g, '');
}

function normalizeCity(value) {
  return text(value).replace(/市$|地区$|自治州$/g, '');
}

function lnAreaFromProvinceCity(province, city, fallback) {
  if (province !== '辽宁') return province ? '省外' : fallback || '';
  if (city === '沈阳') return '沈阳';
  if (city === '大连') return '大连';
  return '辽宁其他';
}

function rawLocation(raw) {
  const province = normalizeProvince(raw.schoolProvince || raw.province || raw['省份'] || raw['学校省份']);
  const city = normalizeCity(raw.schoolCity || raw.city || raw['城市'] || raw['学校城市'] || raw['所在地']);
  const lnArea = text(raw.lnArea || raw['辽宁区域'] || raw['地域']);
  return { province, city, lnArea };
}

export function normalizeLocation(raw, school, major = '') {
  const rawLoc = rawLocation(raw);
  const geo = normalizeSchoolGeo(school, major);

  // 校区/分校实体优先级最高，避免“东北大学秦皇岛”被误判为沈阳。
  if (geo && geo.locationSource === 'campus-rule') {
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

  // 原始记录已有精确省市时保留，但附带 geoEntity 方便报告说明。
  if (rawLoc.province && rawLoc.city) {
    const displayLocation = `${rawLoc.province} · ${rawLoc.city}`;
    return {
      lnArea: rawLoc.lnArea || lnAreaFromProvinceCity(rawLoc.province, rawLoc.city, ''),
      province: rawLoc.province,
      city: rawLoc.city,
      displayLocation,
      locationSource: geo ? 'record-city+geo' : 'record-city',
      locationConfidence: 'high',
      locationWarning: geo?.locationWarning || '',
      geoEntity: geo?.geoEntity || '',
      schoolCanonical: geo?.schoolCanonical || '',
      regionGroups: geo?.regionGroups || [],
      geoSourceMethod: geo?.geoSourceMethod || '',
      geoSourceName: geo?.geoSourceName || '',
      geoSourceUrl: geo?.geoSourceUrl || '',
      geoSourceYear: geo?.geoSourceYear || '',
      geoMatchNote: geo?.geoMatchNote || '',
      schoolIdentifier: geo?.schoolIdentifier || '',
      natureHint: geo?.natureHint || ''
    };
  }

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
      lnArea: rawLoc.lnArea || lnAreaFromProvinceCity(rawLoc.province, rawLoc.city, ''),
      province: rawLoc.province,
      city: rawLoc.city,
      displayLocation: rawLoc.city ? `${rawLoc.province} · ${rawLoc.city}` : rawLoc.province,
      locationSource: 'record-province',
      locationConfidence: 'medium',
      locationWarning: rawLoc.city ? '' : '城市字段缺失',
      geoEntity: '',
      schoolCanonical: '',
      regionGroups: []
    };
  }

  return {
    lnArea: rawLoc.lnArea,
    province: '',
    city: '',
    displayLocation: rawLoc.lnArea || '地域待核验',
    locationSource: rawLoc.lnArea ? 'ln-area' : 'missing',
    locationConfidence: 'low',
    locationWarning: rawLoc.lnArea === '省外' ? '省外城市字段待核验' : '地域待核验',
    geoEntity: '',
    schoolCanonical: '',
    regionGroups: []
  };
}
