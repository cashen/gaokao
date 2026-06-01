function toNum(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function classifyByDelta(delta) {
  const d = Number(delta);
  if (!Number.isFinite(d)) return { group: 'safe', detail: '待核验', className: 'unknown', position: '需补齐分数/位次后再判断' };
  if (d >= 16) return { group: 'rush', detail: '高冲', className: 'high-rush', position: '前段少量梦想位' };
  if (d >= 4) return { group: 'rush', detail: '小冲', className: 'light-rush', position: '前段冲刺区' };
  if (d >= -5 && d <= 3) return { group: 'stable', detail: '边稳', className: 'edge-stable', position: '主体承接区' };
  if (d >= -15 && d <= -6) return { group: 'stable', detail: '稳妥', className: 'stable', position: '主体偏稳区' };
  if (d >= -25 && d <= -16) return { group: 'safe', detail: '小保', className: 'light-safe', position: '后段保底区' };
  if (d >= -40 && d <= -26) return { group: 'safe', detail: '强保', className: 'safe', position: '后段强保区' };
  return { group: 'safe', detail: '兜底', className: 'floor', position: '兜底确认区' };
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
    if (band.detail === '高冲') stats.highRushCount += 1;
    if (band.detail === '兜底') stats.floorCount += 1;
    stats.byDetail[band.detail] = (stats.byDetail[band.detail] || 0) + 1;
    const city = item.displayLocation || item.geoEntity || '未知地域';
    stats.byCity[city] = (stats.byCity[city] || 0) + 1;
    const family = item.majorFamily || '其他专业';
    stats.byMajorFamily[family] = (stats.byMajorFamily[family] || 0) + 1;
  }
  return stats;
}

const BAND_ORDER = {
  '高冲': 10,
  '小冲': 20,
  '边稳': 30,
  '稳妥': 40,
  '小保': 50,
  '强保': 60,
  '兜底': 70,
  '待核验': 80
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
