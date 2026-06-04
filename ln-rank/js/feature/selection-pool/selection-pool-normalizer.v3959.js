function toNum(value, fallback = null) {
  const n = Number(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}
function clean(value, max = 240) { return String(value == null ? '' : value).trim().slice(0, max); }
export function normalizeRawSelectionItem(item = {}, index = 0) {
  return {
    id: clean(item.id || `${item.school || item.schoolName || ''}-${item.major || item.majorName || ''}-${index}`, 240),
    school: clean(item.school || item.schoolName, 120),
    major: clean(item.major || item.majorName, 180),
    score2025: toNum(item.score2025 ?? item.admitScore ?? item.score, null),
    rank2025: toNum(item.rank2025 ?? item.admitRank ?? item.rank ?? item.lowestRank ?? item.minRank, null),
    displayLocation: clean(item.displayLocation || item.location || item.geoEntity || '', 90),
    natureLabel: clean(item.natureLabel || item.schoolNature || item.nature || '', 60),
    schoolTags: Array.isArray(item.schoolTags) ? item.schoolTags.slice(0, 8) : [],
    majorTags: Array.isArray(item.majorTags) ? item.majorTags.slice(0, 8) : [],
    flags: Array.isArray(item.flags) ? item.flags.slice(0, 8) : [],
    userOrder: toNum(item.userOrder ?? item.order, index + 1),
    addedAt: item.addedAt || new Date().toISOString(),
    sourceQuery: item.sourceQuery || {}
  };
}
export function normalizeRawSelectionPool(items = []) {
  return (Array.isArray(items) ? items : []).map(normalizeRawSelectionItem).filter(x => x.school || x.major);
}
