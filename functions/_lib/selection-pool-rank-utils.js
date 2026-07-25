import { lookupScoreRank } from './rank-table-provider.js';

function cleanNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).replace(/[,，\s]/g, '').replace(/名|位|分/g, '');
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export function toNumber(value, fallback = null) {
  const n = cleanNumber(value);
  return n == null ? fallback : n;
}

export function formatNumber(value) {
  const n = toNumber(value, null);
  return n == null ? '—' : Math.round(n).toLocaleString('zh-CN');
}

function pickNumber(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let cur = obj;
      for (const part of parts) cur = cur && typeof cur === 'object' ? cur[part] : undefined;
      const n = toNumber(cur, null);
      if (n != null) return n;
      continue;
    }
    const n = toNumber(obj[key], null);
    if (n != null) return n;
  }
  return null;
}

export function getItemReferenceRank(item = {}) {
  if (item.historicalOnly || Number(item.dataYear || item.primaryYear || 2026) !== 2026) return null;
  return pickNumber(item, [
    'rank2026',
    'rank',
    'minRank',
    'lowestRank',
    'lowest_rank',
    'referenceRank',
    'reference_rank',
    'lastYearRank',
    'admissionRank'
  ]);
}

export function getItemReferenceScore(item = {}) {
  if (item.historicalOnly || Number(item.dataYear || item.primaryYear || 2026) !== 2026) return null;
  return pickNumber(item, [
    'score2026',
    'score',
    'minScore',
    'lowestScore',
    'lowest_score',
    'referenceScore'
  ]);
}

export function rankRangeText(rankInfo) {
  if (!rankInfo || rankInfo.rankStart == null || rankInfo.rankEnd == null) return '';
  if (rankInfo.rankStart === rankInfo.rankEnd) return `位次 ${formatNumber(rankInfo.rankEnd)}`;
  return `位次 ${formatNumber(rankInfo.rankStart)}–${formatNumber(rankInfo.rankEnd)}`;
}

export function getCandidateRankInfo(input = {}, items = []) {
  const candidateScore = toNumber(input.candidateScore, null);
  const year = toNumber(input.year ?? input.dataYear ?? input.rankYear, 2026) || 2026;
  const region = input.region || 'ln';
  const subject = input.subject || 'physics';
  const rankRow = lookupScoreRank({ year, region, subject, score: candidateScore });

  if (rankRow) {
    const label = rankRangeText(rankRow);
    return {
      rank: Math.round(rankRow.rankForGap),
      rankForGap: Math.round(rankRow.rankForGap),
      rankStart: Math.round(rankRow.rankStart),
      rankEnd: Math.round(rankRow.rankEnd),
      sameCount: Math.round(rankRow.sameCount),
      previousCumulative: Math.round(rankRow.previousCumulative),
      cumulative: Math.round(rankRow.cumulative),
      score: rankRow.score,
      scoreLabel: rankRow.scoreLabel,
      year: rankRow.year,
      region: rankRow.region,
      subject: rankRow.subject,
      source: 'scoreRankTable',
      label,
      note: `考生位次由辽宁${rankRow.year}物理类一分一段表按分数自动取数：${rankRow.scoreLabel}分同分人数 ${formatNumber(rankRow.sameCount)} 人，展示区间 ${label}；位次差计算采用同分末位累计口径 ${formatNumber(rankRow.rankEnd)}。`,
      sourceName: rankRow.sourceName,
      sourceNote: rankRow.sourceNote,
      rankingPolicy: rankRow.rankingPolicy
    };
  }

  if (candidateScore != null) {
    return {
      rank: null,
      rankForGap: null,
      rankStart: null,
      rankEnd: null,
      sameCount: null,
      previousCumulative: null,
      cumulative: null,
      score: candidateScore,
      year,
      region,
      subject,
      source: 'missingScoreRankTableRow',
      label: '位次待核验',
      note: `当前分数 ${formatNumber(candidateScore)} 未在辽宁${year}物理类一分一段表中匹配到有效同分行；报告不会用自选池专业位次反推考生位次。请核验分数是否在表内。`
    };
  }

  return {
    rank: null,
    rankForGap: null,
    rankStart: null,
    rankEnd: null,
    sameCount: null,
    previousCumulative: null,
    cumulative: null,
    year,
    region,
    subject,
    source: 'missingCandidateScore',
    label: '位次待核验',
    note: `未填写考生分数，无法按辽宁${year}物理类一分一段自动取位次；报告不会用自选池专业位次反推考生位次。`
  };
}

export function getRankGap(candidateRank, itemRank) {
  const c = toNumber(candidateRank, null);
  const r = toNumber(itemRank, null);
  if (c == null || r == null) return null;
  return Math.round(c - r);
}

export function rankGapText(gap) {
  const g = toNumber(gap, null);
  if (g == null) return '位次待核验';
  if (g > 0) return `向前跨越约 ${formatNumber(g)} 名`;
  if (g < 0) return `向后回落约 ${formatNumber(Math.abs(g))} 名`;
  return '基本同位次';
}

export function itemShortName(item = {}) {
  const school = String(item.school || '学校待核验').trim();
  const major = String(item.major || '专业待核验').trim();
  return `${school}｜${major}`;
}
