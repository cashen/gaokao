function parseNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value).replace(/,/g, '').replace(/，/g, '').replace(/\s+/g, '');
  const matched = s.match(/-?\d+(?:\.\d+)?/);
  if (!matched) return null;
  const n = Number(matched[0]);
  return Number.isFinite(n) ? n : null;
}

function firstNumber(raw, keys) {
  for (const key of keys) {
    if (raw && Object.prototype.hasOwnProperty.call(raw, key)) {
      const n = parseNumber(raw[key]);
      if (n != null) return n;
    }
  }
  return null;
}

export function extractYearScore(raw, year) {
  const y = String(year);
  const yy = y.slice(-2);
  return firstNumber(raw, [
    `score${y}`,
    `minScore${y}`,
    `score_${y}`,
    `${y}Score`,
    `${y}_score`,
    `${y}最低分`,
    `${y}最低分数`,
    `${y}分`,
    `${y}年分`,
    `${y}年最低分`,
    `${y}最低录取分`,
    `${y}最低投档分`,
    `${y}专业最低分`,
    `${y}最低分数线`,
    `${y}投档最低分`,
    `${y}录取最低分`,
    `${y}分数`,
    `${yy}分`,
    `${yy}最低分`,
    `${yy}年最低分`,
    `最低分${y}`,
    `最低分_${y}`,
    `min_score_${y}`
  ]);
}

export function extractYearRank(raw, year) {
  const y = String(year);
  const yy = y.slice(-2);
  return firstNumber(raw, [
    `rank${y}`,
    `minRank${y}`,
    `rank_${y}`,
    `${y}Rank`,
    `${y}_rank`,
    `${y}最低位次`,
    `${y}排位`,
    `${y}年位次`,
    `${y}年最低位次`,
    `${y}最低录取位次`,
    `${y}最低投档位次`,
    `${y}专业最低位次`,
    `${y}位次`,
    `${y}最低排位`,
    `${y}录取位次`,
    `${yy}位次`,
    `${yy}最低位次`,
    `${yy}年最低位次`,
    `最低位次${y}`,
    `最低位次_${y}`,
    `min_rank_${y}`
  ]);
}

function scoreTrend(score2025, score2024) {
  if (score2025 == null || score2024 == null) return '';
  const delta = score2025 - score2024;
  if (Math.abs(delta) <= 2) return '两年分数接近';
  return delta > 0 ? '分数上升' : '分数下降';
}

function rankTrend(rank2025, rank2024) {
  if (rank2025 == null || rank2024 == null) return '';
  const delta = rank2025 - rank2024;
  if (Math.abs(delta) <= 1000) return '两年位次接近';
  return delta < 0 ? '2025位次更靠前' : '2025位次更靠后';
}

export function buildHistoryScore({ score2025, rank2025, score2024, rank2024 }) {
  const has2024 = score2024 != null || rank2024 != null;
  const scoreDelta25vs24 = score2025 != null && score2024 != null ? score2025 - score2024 : null;
  const rankDelta25vs24 = rank2025 != null && rank2024 != null ? rank2025 - rank2024 : null;

  let rankTrendText = '';
  if (rankDelta25vs24 != null) {
    const abs = Math.abs(rankDelta25vs24).toLocaleString('zh-CN');
    if (Math.abs(rankDelta25vs24) <= 1000) {
      rankTrendText = '两年位次接近';
    } else if (rankDelta25vs24 < 0) {
      rankTrendText = `2025位次更靠前约 ${abs} 位`;
    } else {
      rankTrendText = `2025位次更靠后约 ${abs} 位`;
    }
  }

  return {
    has2024,
    scoreDelta25vs24,
    rankDelta25vs24,
    scoreTrendLabel: scoreTrend(score2025, score2024),
    rankTrendLabel: rankTrend(rank2025, rank2024),
    rankTrendText
  };
}
