import { normalizeRecord, rawScore, rawLnArea, rawSchool, rawMajor } from './fenxi-normalizer.js';
function clean(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }
function matchRegion(raw, region) {
  const area = rawLnArea(raw);
  if (!region || region === 'all') return true;
  if (region === 'ln') return area && area !== '省外';
  if (region === 'outside') return area === '省外';
  if (region === 'shenyang') return area === '沈阳';
  if (region === 'dalian') return area === '大连';
  if (region === 'ln-other') return area === '辽宁其他';
  return true;
}
function matchKeyword(raw, schoolKeyword, majorKeyword) {
  const sk = clean(schoolKeyword), mk = clean(majorKeyword);
  if (sk && !clean(rawSchool(raw)).includes(sk)) return false;
  if (mk && !clean(rawMajor(raw)).includes(mk)) return false;
  return true;
}
function sortGroup(records, group) {
  return records.sort((a, b) => {
    if (group === 'upper') return (a.scoreDeltaFromView - b.scoreDeltaFromView) || (a.rank || 0) - (b.rank || 0);
    return Math.abs(a.scoreDeltaFromView) - Math.abs(b.scoreDeltaFromView) || (a.rank || 0) - (b.rank || 0);
  });
}
export function buildMajorWindow(records, query) {
  const { candidateScore, viewScore, region, schoolKeyword, majorKeyword } = query;
  const lower = viewScore - 25;
  const upper = viewScore + 10;
  const groups = { upper: [], near: [], lower: [] };
  for (const raw of records) {
    const score = rawScore(raw);
    if (!Number.isFinite(score)) continue;
    if (score < lower || score > upper) continue;
    if (!matchRegion(raw, region)) continue;
    if (!matchKeyword(raw, schoolKeyword, majorKeyword)) continue;
    const record = normalizeRecord(raw, { candidateScore, viewScore });
    if (record.group !== 'outside') groups[record.group].push(record);
  }
  for (const key of Object.keys(groups)) sortGroup(groups[key], key);
  return {
    meta: { candidateScore, viewScore, window: { lower, upper } },
    groups: {
      upper: { title: '上探参考', range: `${viewScore + 1}-${viewScore + 10}`, records: groups.upper },
      near: { title: '主体参考', range: `${viewScore - 10}-${viewScore}`, records: groups.near },
      lower: { title: '稳妥参考', range: `${viewScore - 25}-${viewScore - 11}`, records: groups.lower }
    },
    counts: { upper: groups.upper.length, near: groups.near.length, lower: groups.lower.length, total: groups.upper.length + groups.near.length + groups.lower.length }
  };
}
