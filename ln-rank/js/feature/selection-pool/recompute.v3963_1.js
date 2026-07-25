import { classifySelectionPosition, selectionBandOrder } from '../../domain/selection-band-policy.v3963_1.js?v=3963_1';

function toNum(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toRank(value, fallback = null) {
  const n = toNum(value, fallback);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

export function recomputeSelectionPool(candidateContext, rawItems = []) {
  const candidateScore = toNum(candidateContext?.score, null);
  const candidateRank = toRank(candidateContext?.rankEnd ?? candidateContext?.rank, null);
  const preset = candidateContext?.rangePreset || 'standard';

  return (Array.isArray(rawItems) ? rawItems : []).map((item, index) => {
    const score2026 = toNum(item.score2026 ?? (Number(item.dataYear) === 2026 ? item.score : null), null);
    const rank2026 = toRank(item.rank2026 ?? (Number(item.dataYear) === 2026 ? item.rank : null), null);
    const historicalOnly = Boolean(item.historicalOnly || (score2026 == null && Number(item.dataYear || 2025) < 2026));
    const scoreDelta2026 = candidateScore != null && score2026 != null
      ? Math.round(score2026 - candidateScore)
      : null;
    const rankGap2026 = candidateRank != null && rank2026 != null
      ? Math.round(candidateRank - rank2026)
      : null;
    const poolBand = historicalOnly
      ? {
          key: 'unknown',
          group: 'unknown',
          detail: '历史自选',
          className: 'unknown',
          position: '尚未匹配到 2026 同口径记录',
          canonicalPosition: null
        }
      : classifySelectionPosition({
          candidateScore,
          candidateRank,
          recordScore: score2026,
          recordRank: rank2026,
          scoreDelta: scoreDelta2026,
          rankGap: rankGap2026,
          rangePreset: preset
        });

    return {
      ...item,
      userOrder: index + 1,
      dataYear: historicalOnly ? Number(item.dataYear || 2025) : 2026,
      primaryYear: historicalOnly ? Number(item.primaryYear || item.dataYear || 2025) : 2026,
      historicalOnly,
      score2026,
      rank2026,
      score: score2026,
      rank: rank2026,
      scoreDelta2026,
      scoreDelta: scoreDelta2026,
      rankGap2026,
      rankGap: rankGap2026,
      computedScoreDelta: scoreDelta2026,
      canonicalPosition: poolBand.canonicalPosition || item.canonicalPosition || null,
      statusKey: poolBand.canonicalPosition?.statusKey || poolBand.key,
      statusLabel: poolBand.canonicalPosition?.statusLabel || poolBand.detail,
      position: poolBand.canonicalPosition?.position || poolBand.position,
      bandKey: poolBand.key,
      band: poolBand.key,
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
    currentCount: 0,
    historicalOnlyCount: 0,
    rushCount: 0,
    stableCount: 0,
    safeCount: 0,
    outsideCount: 0,
    byDetail: {},
    byCity: {},
    byMajorFamily: {}
  };

  for (const item of items) {
    const band = item.poolBand || classifySelectionPosition({
      candidateScore: item.sourceContext?.candidateScore,
      candidateRank: item.sourceContext?.candidateReferenceRank2026,
      recordScore: item.score2026,
      recordRank: item.rank2026,
      scoreDelta: item.scoreDelta2026 ?? item.scoreDelta,
      rankGap: item.rankGap2026 ?? item.rankGap,
      rangePreset: item.rangePreset || 'standard'
    });
    if (item.historicalOnly) stats.historicalOnlyCount += 1;
    else stats.currentCount += 1;
    if (band.group === 'rush') stats.rushCount += 1;
    if (band.group === 'stable') stats.stableCount += 1;
    if (band.group === 'safe') stats.safeCount += 1;
    if (band.group === 'outside' || band.group === 'unknown') stats.outsideCount += 1;
    stats.byDetail[band.detail] = (stats.byDetail[band.detail] || 0) + 1;
    const city = item.displayLocation || item.geoEntity || '未知地域';
    stats.byCity[city] = (stats.byCity[city] || 0) + 1;
    const family = item.majorFamily || '其他专业';
    stats.byMajorFamily[family] = (stats.byMajorFamily[family] || 0) + 1;
  }
  return stats;
}

export function sortComputedByBand(items = []) {
  return [...items].sort((a, b) => {
    const bandOrder = selectionBandOrder(a) - selectionBandOrder(b);
    if (bandOrder) return bandOrder;
    const distanceA = Number(a.canonicalPosition?.positionDistance);
    const distanceB = Number(b.canonicalPosition?.positionDistance);
    if (Number.isFinite(distanceA) && Number.isFinite(distanceB) && distanceA !== distanceB) return distanceA - distanceB;
    const rankA = Number(a.rank2026 ?? a.rank);
    const rankB = Number(b.rank2026 ?? b.rank);
    if (Number.isFinite(rankA) && Number.isFinite(rankB) && rankA !== rankB) return rankA - rankB;
    return (Number(a.userOrder) || 0) - (Number(b.userOrder) || 0);
  }).map((item, index) => ({ ...item, userOrder: index + 1 }));
}
