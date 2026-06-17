import { SCHOOL_GEO_REFERENCE, SCHOOL_GEO_SOURCE_META } from './school-geo-reference.generated.js';
import { SCHOOL_GEO_CAMPUS_OVERRIDES } from './school-geo-campus-overrides.js';

function unique(arr) {
  const out = [];
  for (const item of arr || []) if (item && !out.includes(item)) out.push(item);
  return out;
}

function groupsFor(province, city, original = []) {
  const groups = [...(original || [])];
  if (province === '辽宁') {
    groups.push('辽宁省内');
    if (city === '沈阳') groups.push('沈阳');
    else if (city === '大连') groups.push('大连');
    else groups.push('辽宁其他');
  } else {
    groups.push('省外');
    if (province) groups.push(province);
  }
  if (['江苏','浙江','上海'].includes(province)) groups.push('江浙沪');
  if (['湖北','湖南','河南'].includes(province)) groups.push('华中');
  if (['四川','重庆','云南','贵州'].includes(province)) groups.push('西南');
  if (['陕西','甘肃','青海','宁夏','新疆'].includes(province)) groups.push('西北');
  if (province === '广东') groups.push('广东', '珠三角');
  if (['北京','天津','河北'].includes(province)) groups.push('京津冀');
  if (['辽宁','吉林','黑龙江'].includes(province)) groups.push('东北');
  return unique(groups);
}

function applyOverride(item) {
  const patch = SCHOOL_GEO_CAMPUS_OVERRIDES[item.canonical];
  if (!patch) return item;
  return {
    ...item,
    ...patch,
    confidence: patch.confidence || item.confidence || 'high',
    groups: groupsFor(patch.province || item.province, patch.city || item.city, item.groups),
    locationWarning: patch.locationWarning || item.locationWarning || ''
  };
}

export const SCHOOL_GEO_DB = SCHOOL_GEO_REFERENCE.map(applyOverride);
export { SCHOOL_GEO_SOURCE_META };
