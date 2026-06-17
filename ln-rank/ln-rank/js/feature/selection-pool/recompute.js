function toNum(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function classifyByDelta(delta) {
  const d = Number(delta);
  if (!Number.isFinite(d)) return { group: 'safe', detail: '待核验', className: 'unknown', position: '需补齐分数/位次后再判断' };
  if (d >= 4) return { group: 'rush', detail: '稍高目标', className: d >= 16 ? 'high-rush' : 'light-rush', position: '稍高目标区' };
  if (d >= -15 && d <= 3) return { group: 'stable', detail: '主要参考', className: d >= -5 ? 'edge-stable' : 'stable', position: '主要参考区' };
  return { group: 'safe', detail: '低分侧补充', className: d <= -26 ? 'safe' : 'light-safe', position: '低分侧补充区' };
}

export function recomputeSelectionPool(candidateContext, rawItems = []) {
  const score = toNum(candidateContext?.score, null);
  return (Array.isArray(rawItems) ? rawItems : []).map((item, index) => {
    const score2025 = toNum(item.score2025 ?? item.score, null);
    const scoreDelta = score != null && score2025 != null ? Math.round(score2025 - score) : null;
    const poolBand = classifyByDelta(scoreDelta);
    return {
      ...item,
      userOrder: index + 1,
      score2025,
      score: score2025,
      scoreDelta,
      computedScoreDelta: scoreDelta,
      statusKey: '',
      statusLabel: poolBand.detail,
      position: poolBand.position,
      poolBand,
      contextSignature: candidateContext?.signature || '',
      computedAt: new Date().toISOString()
    };
  });
}

export function stripComputedForStorage(item = {}) {
  const { computedScoreDelta, contextSignature, computedAt, ...rest } = item;
  return rest;
}

export function getComputedStats(items = []) {
  const stats = {
    total: items.length,
    rushCount: 0,
    stableCount: 0,
    safeCount: 0,
    highRushCount: 0,
    floorCount: 0,
    byDetail: {},
    byCity: {},
    byMajorFamily: {}
  };
  for (const item of items) {
    const band = item.poolBand || classifyByDelta(item.scoreDelta);
    if (band.group === 'rush') stats.rushCount += 1;
    if (band.group === 'stable') stats.stableCount += 1;
    if (band.group === 'safe') stats.safeCount += 1;
    if (band.group === 'rush' && Number(item.scoreDelta) >= 16) stats.highRushCount += 1;
    if (band.group === 'safe' && Number(item.scoreDelta) <= -26) stats.floorCount += 1;
    stats.byDetail[band.detail] = (stats.byDetail[band.detail] || 0) + 1;
    const city = item.displayLocation || item.geoEntity || '未知地域';
    stats.byCity[city] = (stats.byCity[city] || 0) + 1;
    const family = item.majorFamily || '其他专业';
    stats.byMajorFamily[family] = (stats.byMajorFamily[family] || 0) + 1;
  }
  return stats;
}

const BAND_ORDER = {
  '稍高目标': 10,
  '主要参考': 20,
  '低分侧补充': 30,
  '待核验': 40
};

export function sortComputedByBand(items = []) {
  return [...items].sort((a, b) => {
    const bandA = BAND_ORDER[a.poolBand?.detail] || 999;
    const bandB = BAND_ORDER[b.poolBand?.detail] || 999;
    if (bandA !== bandB) return bandA - bandB;
    const deltaA = Number.isFinite(Number(a.scoreDelta)) ? Number(a.scoreDelta) : -999;
    const deltaB = Number.isFinite(Number(b.scoreDelta)) ? Number(b.scoreDelta) : -999;
    if (deltaA !== deltaB) return deltaB - deltaA;
    return (Number(a.userOrder) || 0) - (Number(b.userOrder) || 0);
  }).map((item, index) => ({ ...item, userOrder: index + 1 }));
}
