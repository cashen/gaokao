function clean(value) { return String(value || '').replace(/[省市自治区特别行政区]/g, '').trim(); }
const GROUPS = {
  jiangzhehu: ['江苏','浙江','上海'],
  huazhong: ['湖北','湖南','河南'],
  southwest: ['四川','重庆','云南','贵州'],
  northwest: ['陕西','甘肃','青海','宁夏','新疆']
};
export function matchRegionRule(record, region) {
  const key = region || 'all';
  if (key === 'all') return true;
  const lnArea = record.lnArea || record.region || '';
  const province = clean(record.province || '');
  const city = clean(record.city || '');
  const groups = Array.isArray(record.regionGroups) ? record.regionGroups : [];
  if (groups.includes(key) || groups.includes(region)) return true;
  if (key === 'ln') return lnArea !== '省外' || province === '辽宁';
  if (key === 'outside') return lnArea === '省外' || (province && province !== '辽宁');
  if (key === 'shenyang') return lnArea === '沈阳' || city === '沈阳';
  if (key === 'dalian') return lnArea === '大连' || city === '大连';
  if (key === 'ln-other') return lnArea === '辽宁其他';
  if (key === 'beijing') return province === '北京';
  if (key === 'tianjin') return province === '天津';
  if (key === 'hebei') return province === '河北';
  if (key === 'shandong') return province === '山东';
  if (key === 'jilin') return province === '吉林';
  if (key === 'heilongjiang') return province === '黑龙江';
  if (key === 'guangdong') return province === '广东';
  if (GROUPS[key]) return GROUPS[key].includes(province);
  return true;
}
