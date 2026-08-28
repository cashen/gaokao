import { matchRegionRule } from '../../shared/resources/geo/china-region-catalog.v3990_1.js';
function norm(value) { return String(value || '').replace(/\s+/g, '').toLowerCase(); }
export function matchRegion(record, region) { return matchRegionRule(record, region); }
export function matchKeyword(record, schoolKeyword, majorKeyword) {
  const s = norm(schoolKeyword);
  const m = norm(majorKeyword);
  if (s && !norm(record.school).includes(s)) return false;
  if (m && !norm(record.major).includes(m)) return false;
  return true;
}
