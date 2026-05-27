import { getSchoolTags } from './school-tags.js';
function text(v){ return String(v || '').trim(); }
export function mapNature(label) {
  const s = text(label);
  if (!s) return { natureLabel: '性质待核验', natureType: 'unknown' };
  if (s.includes('民办') || s.includes('独立')) return { natureLabel: '民办/独立', natureType: 'private' };
  if (s.includes('公办')) return { natureLabel: '公办', natureType: 'public' };
  return { natureLabel: '性质待核验', natureType: 'unknown' };
}
export function makeDisplayLocation(record) {
  const p = text(record.province);
  const c = text(record.city);
  const area = text(record.lnArea || record.region);
  if (p && c) return `${p} · ${c}`;
  if (p) return p;
  return area || '地域待核验';
}
export function buildDisplayTags(record) {
  const schoolTags = getSchoolTags(record.school);
  const nature = mapNature(record.natureRaw || record.nature);
  const displayLocation = makeDisplayLocation(record);
  let natureLabel = nature.natureLabel;
  if (nature.natureType === 'public' && schoolTags.length === 0) natureLabel = '双非公办';
  return {
    schoolTags,
    natureLabel,
    natureType: nature.natureType,
    displayLocation,
    province: record.province || '',
    city: record.city || ''
  };
}
