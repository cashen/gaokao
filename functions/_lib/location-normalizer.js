import { getSchoolLocation } from './school-location-map.js';

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

export function normalizeLocation(raw, school) {
  const rawProvince = normalizeProvince(raw.schoolProvince || raw.province || raw['省份'] || raw['学校省份']);
  const rawCity = normalizeCity(raw.schoolCity || raw.city || raw['城市'] || raw['学校城市'] || raw['所在地']);
  const rawLnArea = text(raw.lnArea || raw['辽宁区域'] || raw['地域']);
  const mapped = getSchoolLocation(school);

  let province = rawProvince;
  let city = rawCity;
  let source = '';
  let confidence = 'low';
  let warning = '';

  if (province && city) {
    source = 'record-city';
    confidence = 'high';
  } else if (mapped) {
    province = province || mapped.province;
    city = city || mapped.city;
    source = province && city && (rawProvince || rawCity) ? 'record-map-mixed' : 'school-location-map';
    confidence = mapped.confidence || 'medium';
    warning = mapped.warning || '';
  } else if (province) {
    source = 'record-province';
    confidence = 'medium';
    warning = '城市字段缺失';
  } else if (rawLnArea) {
    source = 'ln-area';
    confidence = 'low';
    warning = rawLnArea === '省外' ? '省外城市字段待核验' : '';
  } else {
    source = 'missing';
    confidence = 'low';
    warning = '地域待核验';
  }

  const lnArea = rawLnArea || lnAreaFromProvinceCity(province, city, '');
  const displayLocation = province && city ? `${province} · ${city}` : (province || lnArea || '地域待核验');

  return {
    lnArea,
    province,
    city,
    displayLocation,
    locationSource: source,
    locationConfidence: confidence,
    locationWarning: warning
  };
}
