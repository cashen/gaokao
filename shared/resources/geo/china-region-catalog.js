export const REGION_OPTIONS = Object.freeze([
  Object.freeze({ key: 'all', label: '不限' }),
  Object.freeze({ key: 'ln', label: '辽宁省内' }),
  Object.freeze({ key: 'shenyang', label: '沈阳' }),
  Object.freeze({ key: 'dalian', label: '大连' }),
  Object.freeze({ key: 'ln-other', label: '辽宁其他' }),
  Object.freeze({ key: 'outside', label: '省外' }),
  Object.freeze({ key: 'beijing', label: '北京' }),
  Object.freeze({ key: 'tianjin', label: '天津' }),
  Object.freeze({ key: 'hebei', label: '河北' }),
  Object.freeze({ key: 'shandong', label: '山东' }),
  Object.freeze({ key: 'jilin', label: '吉林' }),
  Object.freeze({ key: 'heilongjiang', label: '黑龙江' }),
  Object.freeze({ key: 'jiangzhehu', label: '江浙沪' }),
  Object.freeze({ key: 'guangdong', label: '广东' }),
  Object.freeze({ key: 'huazhong', label: '华中' }),
  Object.freeze({ key: 'southwest', label: '西南' }),
  Object.freeze({ key: 'northwest', label: '西北' })
]);

export const REGION_GROUPS = Object.freeze({
  jiangzhehu: Object.freeze(['江苏', '浙江', '上海']),
  huazhong: Object.freeze(['湖北', '湖南', '河南']),
  southwest: Object.freeze(['四川', '重庆', '云南', '贵州']),
  northwest: Object.freeze(['陕西', '甘肃', '青海', '宁夏', '新疆'])
});

const DIRECT_PROVINCES = Object.freeze({
  beijing: '北京',
  tianjin: '天津',
  hebei: '河北',
  shandong: '山东',
  jilin: '吉林',
  heilongjiang: '黑龙江',
  guangdong: '广东'
});

export function normalizeProvinceName(value) {
  return String(value || '')
    .replace(/(壮族|回族|维吾尔)自治区$/g, '')
    .replace(/特别行政区$/g, '')
    .replace(/[省市自治区]/g, '')
    .trim();
}

export function normalizeCityName(value) {
  return String(value || '').replace(/市$|地区$|自治州$|盟$/g, '').trim();
}

export function getLiaoningAreaLabel(record = {}, fallback = '') {
  const province = normalizeProvinceName(record.province);
  const city = normalizeCityName(record.city);
  if (!province) return String(fallback || '').trim();
  if (province !== '辽宁') return '省外';
  if (city === '沈阳') return '沈阳';
  if (city === '大连') return '大连';
  return '辽宁其他';
}

export function deriveRegionGroups(record = {}) {
  const province = normalizeProvinceName(record.province);
  const city = normalizeCityName(record.city);
  const groups = [];
  if (province === '辽宁') {
    groups.push('ln', '辽宁省内');
    if (city === '沈阳') groups.push('shenyang', '沈阳');
    else if (city === '大连') groups.push('dalian', '大连');
    else groups.push('ln-other', '辽宁其他');
  } else if (province) {
    groups.push('outside', '省外', province);
  }
  for (const [key, provinces] of Object.entries(REGION_GROUPS)) {
    if (provinces.includes(province)) groups.push(key, getRegionLabel(key));
  }
  for (const [key, value] of Object.entries(DIRECT_PROVINCES)) {
    if (value === province) groups.push(key);
  }
  return [...new Set(groups.filter(Boolean))];
}

export function getRegionOption(key) {
  return REGION_OPTIONS.find(item => item.key === String(key || 'all')) || REGION_OPTIONS[0];
}

export function getRegionLabel(key) {
  return getRegionOption(key).label;
}

export function matchRegionRule(record = {}, region = 'all') {
  const key = String(region || 'all');
  if (key === 'all') return true;
  const lnArea = String(record.lnArea || record.region || '').trim();
  const province = normalizeProvinceName(record.province);
  const city = normalizeCityName(record.city);
  const groups = Array.isArray(record.regionGroups) ? record.regionGroups : [];

  if (groups.includes(key) || groups.includes(region)) return true;
  if (key === 'ln') return province ? province === '辽宁' : lnArea !== '省外';
  if (key === 'outside') return province ? province !== '辽宁' : lnArea === '省外';
  if (key === 'shenyang') return lnArea === '沈阳' || city === '沈阳';
  if (key === 'dalian') return lnArea === '大连' || city === '大连';
  if (key === 'ln-other') {
    if (province && province !== '辽宁') return false;
    if (lnArea) return lnArea === '辽宁其他';
    return province === '辽宁' && !['沈阳', '大连'].includes(city);
  }
  if (DIRECT_PROVINCES[key]) return province === DIRECT_PROVINCES[key];
  if (REGION_GROUPS[key]) return REGION_GROUPS[key].includes(province);
  return true;
}
