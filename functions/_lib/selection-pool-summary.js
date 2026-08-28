import { buildRankZoneContext } from './rank-zone-engine.js';
import {
  formatNumber,
  getCandidateRankInfo,
  getItemReferenceRank,
  getRankGap,
  itemShortName,
  rankGapText,
  toNumber
} from './selection-pool-rank-utils.js';

const NEAR_RANK_GAP = 800;

function groupKey(item = {}) {
  const group = item.poolBand?.group || item.group || '';
  if (group === 'rush') return 'rush';
  if (group === 'stable' || group === 'match') return 'stable';
  return 'safe';
}

function detailOf(item = {}) {
  return String(item.poolBand?.detail || item.statusLabel || item.detail || '').trim();
}

function initGroup() {
  return {
    count: 0,
    withRankCount: 0,
    missingRankCount: 0,
    forwardCount: 0,
    nearCount: 0,
    backwardCount: 0,
    maxForwardRankGap: null,
    maxForwardItem: null,
    maxBackwardRankGap: null,
    maxBackwardItem: null,
    byDetail: {}
  };
}

function updateMax(group, item, gap) {
  if (gap > 0 && (group.maxForwardRankGap == null || gap > group.maxForwardRankGap)) {
    group.maxForwardRankGap = gap;
    group.maxForwardItem = item;
  }
  if (gap < 0) {
    const abs = Math.abs(gap);
    if (group.maxBackwardRankGap == null || abs > group.maxBackwardRankGap) {
      group.maxBackwardRankGap = abs;
      group.maxBackwardItem = item;
    }
  }
}

function applyRankSide(group, item, gap) {
  if (gap == null) {
    group.missingRankCount += 1;
    return;
  }
  group.withRankCount += 1;
  if (Math.abs(gap) <= NEAR_RANK_GAP) group.nearCount += 1;
  else if (gap > 0) group.forwardCount += 1;
  else group.backwardCount += 1;
  updateMax(group, item, gap);
}

function enrichItem(item, candidateRank) {
  const referenceRank = getItemReferenceRank(item);
  const rankGap = getRankGap(candidateRank, referenceRank);
  return {
    ...item,
    referenceRank,
    rankGap,
    rankGapText: rankGapText(rankGap)
  };
}

function groupSummaryLine(label, group) {
  const parts = [`${label} ${formatNumber(group.count)} 个`];
  if (group.maxForwardRankGap != null) parts.push(`最高向前跨越约 ${formatNumber(group.maxForwardRankGap)} 名`);
  if (group.maxBackwardRankGap != null) parts.push(`最大向后回落约 ${formatNumber(group.maxBackwardRankGap)} 名`);
  if (group.missingRankCount) parts.push(`${formatNumber(group.missingRankCount)} 个位次待核验`);
  return parts.join('｜');
}

export function buildSelectionPoolSummary(input = {}, items = []) {
  const orderedItems = Array.isArray(items) ? items : [];
  const rankInfo = getCandidateRankInfo(input, orderedItems);
  const rankZone = buildRankZoneContext({
    candidateScore: input.candidateScore,
    year: input.year || input.dataYear || input.rankYear || 2026,
    region: input.region || 'ln',
    subject: input.subject || 'physics'
  });
  const summary = {
    version: 'v3.9.5.5',
    candidateScore: toNumber(input.candidateScore, null),
    candidateRank: rankInfo.rank,
    candidateRankSource: rankInfo.source,
    candidateRankLabel: rankInfo.label,
    candidateRankNote: rankInfo.note,
    candidateRankForGap: rankInfo.rankForGap ?? rankInfo.rank,
    candidateRankStart: rankInfo.rankStart ?? null,
    candidateRankEnd: rankInfo.rankEnd ?? null,
    candidateSameCount: rankInfo.sameCount ?? null,
    candidatePreviousCumulative: rankInfo.previousCumulative ?? null,
    candidateCumulative: rankInfo.cumulative ?? null,
    candidateRankScoreLabel: rankInfo.scoreLabel || '',
    candidateRankYear: rankInfo.year || 2026,
    candidateRankSourceName: rankInfo.sourceName || '',
    candidateRankSourceNote: rankInfo.sourceNote || '',
    candidateRankPolicy: rankInfo.rankingPolicy || '',
    rankZone,
    rankZoneKey: rankZone.zoneKey,
    rankZoneName: rankZone.zoneName,
    specialControlScore: rankZone.specialControlScore,
    specialControlRank: rankZone.specialControlRank,
    specialControlRankLabel: rankZone.specialControlRankLabel,
    scoreOffsetFromSpecial: rankZone.scoreOffsetFromSpecial,
    rankOffsetFromSpecial: rankZone.rankOffsetFromSpecial,
    densitySummary: rankZone.density,
    rankZoneNote: rankZone.note,
    totalCount: orderedItems.length,
    rush: initGroup(),
    stable: initGroup(),
    safe: initGroup(),
    missingRankCount: 0,
    withRankCount: 0,
    enrichedItems: [],
    overallLine: '',
    maintenanceNote: '前中后段标签沿用已选专业现有判断，报告概要只做统计，不重新判定；考生位次只按一分一段表自动取数，不再由已选专业里的专业位次反推。'
  };

  summary.enrichedItems = orderedItems.map(item => enrichItem(item, rankInfo.rankForGap ?? rankInfo.rank));

  for (const item of summary.enrichedItems) {
    const group = summary[groupKey(item)];
    group.count += 1;
    const detail = detailOf(item) || '待判断';
    group.byDetail[detail] = (group.byDetail[detail] || 0) + 1;
    applyRankSide(group, item, item.rankGap);
  }

  for (const key of ['rush', 'stable', 'safe']) {
    summary.withRankCount += summary[key].withRankCount;
    summary.missingRankCount += summary[key].missingRankCount;
  }

  summary.rush.superRushCount = (summary.rush.byDetail['稍高目标'] || 0) + (summary.rush.byDetail['稍高目标'] || 0);
  summary.rush.smallRushCount = summary.rush.byDetail['稍高目标'] || 0;
  summary.safe.deepSafeCount = (summary.safe.byDetail['更稳补充'] || 0) + (summary.safe.byDetail['低分侧补充'] || 0);

  const lines = [
    groupSummaryLine('稍高目标', summary.rush),
    groupSummaryLine('匹配/主要参考', summary.stable),
    groupSummaryLine('低分侧补充', summary.safe)
  ];
  summary.overallLine = lines.join('；');

  summary.topForwardItem = [...summary.enrichedItems]
    .filter(item => item.rankGap != null && item.rankGap > 0)
    .sort((a, b) => b.rankGap - a.rankGap)[0] || null;
  summary.topBackwardItem = [...summary.enrichedItems]
    .filter(item => item.rankGap != null && item.rankGap < 0)
    .sort((a, b) => Math.abs(b.rankGap) - Math.abs(a.rankGap))[0] || null;

  summary.topForwardText = summary.topForwardItem
    ? `${itemShortName(summary.topForwardItem)}：${rankGapText(summary.topForwardItem.rankGap)}`
    : '暂无可识别的向前跨越项目';
  summary.topBackwardText = summary.topBackwardItem
    ? `${itemShortName(summary.topBackwardItem)}：${rankGapText(summary.topBackwardItem.rankGap)}`
    : '暂无可识别的向后回落项目';

  return summary;
}
