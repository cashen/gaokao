import { getExamYearConfig } from './exam-year-config.js';
import { lookupScoreRank, getRankTableRows } from './rank-table-provider.js';
import { getRankGap, rankGapText } from './selection-pool-rank-utils.js';
import { getPushRateReference, buildPushRateSummary } from './push-rate-matcher.js';
import { enrichBottomLineFields, summarizeBottomLine, bottomLineModeSummary } from './bottomline-policy.js';
import { resolveCanonicalPosition } from '../../shared/algorithms/position/canonical-position.v3963_0.js';
import { ALGORITHM_ORCHESTRATION_VERSION } from '../../shared/algorithms/algorithm-registry.js';
import { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';
import { getHistoryScoreRankEvidence } from '../../shared/resources/exam/historical-score-rank-contract.js';

function num(value, fallback = null) {
  if (value == null || value === '') return fallback;
  const n = Number(String(value).replace(/[,，\s名位分]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function clean(value, max = 200) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function fmt(value) {
  const n = num(value, null);
  return n == null ? '—' : Math.round(n).toLocaleString('zh-CN');
}

function majorFamily(major = '') {
  const s = String(major || '');
  if (/人工智能|智能科学|机器人工程|集成电路|微电子/.test(s)) return 'AI/微电子/智能类';
  if (/计算机|软件|数据|网络|信息安全|物联网/.test(s)) return '计算机/软件数据';
  if (/电气|自动化|电子|通信|光电|测控/.test(s)) return '电气电子信息';
  if (/机械|车辆|能源|智能制造|工业工程/.test(s)) return '机械自动化制造';
  if (/临床|口腔|医学|药学|护理|中医|麻醉|影像|康复/.test(s)) return '医药卫生';
  if (/会计|财务|金融|经济|工商|管理|审计|财政/.test(s)) return '经管财经';
  if (/法学|汉语|新闻|外语|英语|师范|教育|小学教育/.test(s)) return '法学文教师范';
  if (/土木|建筑|城乡规划|给排水|道路|桥梁/.test(s)) return '土木建筑';
  if (/化工|环境|材料|生物|食品|应用化学|制药/.test(s)) return '生化环材食品';
  if (/数学|物理|化学|生物科学|统计学/.test(s)) return '基础理科';
  return '其他专业';
}

function sumSameCount(rows, minScore, maxScore) {
  return rows.filter(r => Number(r.score) >= minScore && Number(r.score) <= maxScore).reduce((sum, r) => sum + (Number(r.sameCount) || 0), 0);
}

function densityOf({ score, year, region, subject }) {
  const s = num(score, null);
  const rows = getRankTableRows({ year, region, subject });
  if (s == null || !rows.length) return { sameCount: null, up5Count: null, down5Count: null, up10Count: null, down10Count: null };
  const current = lookupScoreRank({ year, region, subject, score: s });
  return {
    sameCount: current?.sameCount ?? null,
    up5Count: sumSameCount(rows, s + 1, s + 5),
    down5Count: sumSameCount(rows, s - 5, s - 1),
    up10Count: sumSameCount(rows, s + 1, s + 10),
    down10Count: sumSameCount(rows, s - 10, s - 1)
  };
}

function inc(map, key) {
  const k = key || '待核验';
  map[k] = (map[k] || 0) + 1;
}

function topEntry(map = {}) {
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0] || ['', 0];
}

function normalizeItems(items = [], candidateRank = null, candidateScore = null, rangePreset = 'standard') {
  return (Array.isArray(items) ? items : []).slice(0, 112).map((item, index) => {
    const current2026 = Number(item.dataYear || item.primaryYear || 2026) === 2026 || item.score2026 != null || item.rank2026 != null;
    const score2026 = current2026 ? num(item.score2026 ?? item.score, null) : null;
    const rank2026 = current2026 ? num(item.rank2026 ?? item.rank ?? item.minRank ?? item.lowestRank ?? item.referenceRank, null) : null;
    const scoreDelta2026 = candidateScore != null && score2026 != null ? Math.round(score2026 - candidateScore) : num(item.scoreDelta2026 ?? item.scoreDelta, null);
    const rankGap2026 = candidateRank != null && rank2026 != null ? getRankGap(candidateRank, rank2026) : num(item.rankGap2026 ?? item.rankGap, null);
    const canonicalPosition = item.canonicalPosition || resolveCanonicalPosition({
      candidateScore,
      candidateRank,
      recordScore: score2026,
      recordRank: rank2026,
      scoreDelta: scoreDelta2026,
      rankGap: rankGap2026,
      rangePreset: item.rangePreset || item.sourceContext?.rangePreset || rangePreset
    });
    const poolBand = item.poolBand || {
      key: canonicalPosition.bandKey,
      group: canonicalPosition.group,
      detail: canonicalPosition.bandLabel,
      position: canonicalPosition.position,
      canonicalPosition
    };
    const bottomLine = enrichBottomLineFields(item);
    return {
      ...item,
      id: clean(item.id || `${item.school}-${item.major}-${score2026}-${rank2026}`, 240),
      order: index + 1,
      userOrder: num(item.userOrder, index + 1),
      school: clean(item.school, 120),
      major: clean(item.major, 180),
      dataYear: current2026 ? 2026 : Number(item.dataYear || 2025),
      primaryYear: current2026 ? 2026 : Number(item.primaryYear || item.dataYear || 2025),
      historicalOnly: !current2026,
      score2026,
      rank2026,
      historyEvidence: getHistoryScoreRankEvidence(item),
      scoreDelta2026,
      scoreDelta: scoreDelta2026,
      rankGap2026,
      rankGap: rankGap2026,
      rankGapText: rankGapText(rankGap2026),
      statusKey: canonicalPosition.statusKey,
      statusLabel: clean(canonicalPosition.statusLabel, 40),
      position: canonicalPosition.position,
      canonicalPosition,
      displayLocation: clean(item.displayLocation || item.geoEntity || item.city || '', 80),
      natureLabel: clean(item.natureLabel || item.nature || '', 60),
      flags: Array.isArray(item.flags) ? item.flags.map(x => clean(x, 80)).filter(Boolean).slice(0, 8) : [],
      schoolTags: Array.isArray(item.schoolTags) ? item.schoolTags.map(x => clean(x, 50)).filter(Boolean).slice(0, 8) : [],
      poolBand,
      majorFamily: item.majorFamily || majorFamily(item.major),
      ...bottomLine,
      pushRateRef: getPushRateReference(item.school || item.schoolName || '')
    };
  }).filter(x => x.school || x.major);
}

function buildStats(items) {
  const stats = {
    total: items.length,
    rushCount: 0,
    stableCount: 0,
    safeCount: 0,
    highRushCount: 0,
    floorCount: 0,
    deepSafeCount: 0,
    missingRankCount: 0,
    withRankCount: 0,
    unresolvedCount: 0,
    rejectedCount: 0,
    maxForwardRankGap: null,
    maxBackwardRankGap: null,
    byCity: {},
    byMajorFamily: {},
    byDetail: {},
    byNature: {},
    tuitionOrCoopCount: 0,
    privateOrFeeCount: 0
  };
  for (const item of items) {
    const band = item.poolBand || {};
    if (band.group === 'rush') stats.rushCount += 1;
    if (band.group === 'stable') stats.stableCount += 1;
    if (band.group === 'safe') stats.safeCount += 1;
    if (item.canonicalPosition?.statusKey === 'bigRush' || item.canonicalPosition?.statusKey === 'superRush') stats.highRushCount += 1;
    if (band.group === 'safe') stats.floorCount += 1;
    if (band.group === 'safe' && Number(item.rankGap2026) < 0) stats.deepSafeCount += 1;
    if (item.bottomLineEligibility === 'unresolved' || item.schoolNature === 'unknown' || item.feeType === 'unknown' || item.historicalOnly) stats.unresolvedCount += 1;
    if (Object.values(item.acceptability || {}).includes('rejected')) stats.rejectedCount += 1;
    inc(stats.byDetail, band.detail);
    inc(stats.byCity, item.displayLocation || '未知地域');
    inc(stats.byMajorFamily, item.majorFamily || '其他专业');
    inc(stats.byNature, item.natureLabel || '属性待核验');
    const flagsText = [item.natureLabel, item.schoolNature, item.feeType, ...(item.bottomLineTags || []), ...(item.flags || []), ...(item.schoolTags || [])].join(' ');
    if (/中外|合作|高收费|国际|学费/.test(flagsText)) stats.tuitionOrCoopCount += 1;
    if (/民办|独立学院|高收费|中外|合作/.test(flagsText)) stats.privateOrFeeCount += 1;
    if (item.rankGap2026 == null) stats.missingRankCount += 1;
    else {
      stats.withRankCount += 1;
      if (item.rankGap2026 > 0 && (stats.maxForwardRankGap == null || item.rankGap2026 > stats.maxForwardRankGap)) stats.maxForwardRankGap = item.rankGap2026;
      if (item.rankGap2026 < 0 && (stats.maxBackwardRankGap == null || Math.abs(item.rankGap2026) > stats.maxBackwardRankGap)) stats.maxBackwardRankGap = Math.abs(item.rankGap2026);
    }
  }
  const [topCity, topCityCount] = topEntry(stats.byCity);
  const [topMajorFamily, topMajorFamilyCount] = topEntry(stats.byMajorFamily);
  stats.topCity = topCity;
  stats.topCityCount = topCityCount;
  stats.topCityPct = stats.total ? Math.round(topCityCount / stats.total * 100) : 0;
  stats.topMajorFamily = topMajorFamily;
  stats.topMajorFamilyCount = topMajorFamilyCount;
  stats.topMajorFamilyPct = stats.total ? Math.round(topMajorFamilyCount / stats.total * 100) : 0;
  return stats;
}

function controlLabel(row) {
  if (!row) return '位次待核验';
  if (row.rankStart === row.rankEnd) return `位次 ${fmt(row.rankEnd)}`;
  return `位次 ${fmt(row.rankStart)}–${fmt(row.rankEnd)}`;
}

function noteFromFacts({ config, candidateScore, scoreOffsetFromSpecial, rankOffsetFromSpecial }) {
  if (candidateScore == null) return '考生分数待填写，暂无法进行位次功能区判断。';
  const direction = scoreOffsetFromSpecial == null ? '与特控线距离待核验' : (scoreOffsetFromSpecial >= 0 ? `高出特控线 ${fmt(scoreOffsetFromSpecial)} 分` : `低于特控线 ${fmt(Math.abs(scoreOffsetFromSpecial))} 分`);
  const rankDirection = rankOffsetFromSpecial == null ? '位次差待核验' : (rankOffsetFromSpecial < 0 ? `位次优于特控线约 ${fmt(Math.abs(rankOffsetFromSpecial))} 名` : `位次落后特控线约 ${fmt(rankOffsetFromSpecial)} 名`);
  return `按${config.rankYear || config.year}辽宁物理类口径，考生${direction}，${rankDirection}；分数用于解释，诊断以位次、密度、证据完整度和已选结构为主。`;
}

export function buildAdvisorFacts(input = {}) {
  const config = getExamYearConfig(input);
  const candidateScore = num(input.candidateScore, null);
  const candidateRow = lookupScoreRank({ year: config.rankYear, region: config.region, subject: config.subject, score: candidateScore });
  const specialRow = lookupScoreRank({ year: config.rankYear, region: config.region, subject: config.subject, score: config.specialControlScore });
  const undergraduateScore = num(config.undergraduateControlScore, 367);
  const undergraduateRow = lookupScoreRank({ year: config.rankYear, region: config.region, subject: config.subject, score: undergraduateScore });
  const candidateRank = candidateRow ? Math.round(candidateRow.rankForGap) : null;
  const specialControlRank = specialRow ? Math.round(specialRow.rankForGap) : null;
  const undergraduateControlRank = undergraduateRow ? Math.round(undergraduateRow.rankForGap) : null;
  const scoreOffsetFromSpecial = candidateScore == null || config.specialControlScore == null ? null : Math.round(candidateScore - config.specialControlScore);
  const rankOffsetFromSpecial = candidateRank == null || specialControlRank == null ? null : Math.round(candidateRank - specialControlRank);
  const scoreOffsetFromUndergraduate = candidateScore == null || undergraduateScore == null ? null : Math.round(candidateScore - undergraduateScore);
  const rankOffsetFromUndergraduate = candidateRank == null || undergraduateControlRank == null ? null : Math.round(candidateRank - undergraduateControlRank);
  const density = densityOf({ score: candidateScore, year: config.rankYear, region: config.region, subject: config.subject });
  const rangePreset = input.rangePreset || input.context?.rangePreset || 'standard';
  const orderedItems = normalizeItems(input.items || input.orderedItems || [], candidateRank, candidateScore, rangePreset);
  const bottomLineMode = input.bottomLineMode || input.filterState?.bottomLineMode || input.context?.bottomLineMode || 'all';
  const bottomLineSummary = summarizeBottomLine(orderedItems, bottomLineMode);
  const stats = buildStats(orderedItems);
  const pushRateSummary = buildPushRateSummary(orderedItems);
  const note = noteFromFacts({ config, candidateScore, scoreOffsetFromSpecial, rankOffsetFromSpecial });
  return {
    version: 'v3.9.60.0',
    algorithmVersion: ALGORITHM_ORCHESTRATION_VERSION,
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    rankYear: FEISHU_REPORT_CONTRACT.rankYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
    yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion,
    config,
    candidate: {
      score: candidateScore,
      rank: candidateRank,
      rankStart: candidateRow?.rankStart ?? null,
      rankEnd: candidateRow?.rankEnd ?? null,
      sameCount: candidateRow?.sameCount ?? null,
      rankLabel: candidateRow ? controlLabel(candidateRow) : '位次待核验'
    },
    controls: {
      undergraduateControlScore: undergraduateScore,
      undergraduateControlRank,
      undergraduateControlRankLabel: undergraduateRow ? controlLabel(undergraduateRow) : '位次待核验',
      specialControlScore: config.specialControlScore,
      specialControlRank,
      specialControlRankLabel: specialRow ? controlLabel(specialRow) : '位次待核验'
    },
    offsets: {
      scoreOffsetFromUndergraduate,
      rankOffsetFromUndergraduate,
      scoreOffsetFromSpecial,
      rankOffsetFromSpecial
    },
    density,
    poolStructure: stats,
    bottomLine: bottomLineModeSummary(bottomLineMode),
    bottomLineSummary,
    pushRateSummary,
    orderedItems,
    note
  };
}

export function compactItemsForAi(items = [], max = 40) {
  return (items || []).slice(0, max).map(item => ({
    order: item.order,
    school: item.school,
    major: item.major,
    score2026: item.score2026,
    rank2026: item.rank2026,
    historyEvidence: getHistoryScoreRankEvidence(item),
    scoreDelta2026: item.scoreDelta2026,
    rankGap2026: item.rankGap2026,
    band: item.poolBand?.detail || item.statusLabel || '',
    evidenceStrength: item.canonicalPosition?.evidenceStrength || 'weak',
    majorFamily: item.majorFamily,
    location: item.displayLocation,
    nature: item.natureLabel,
    schoolNature: item.schoolNature,
    feeType: item.feeType,
    bottomLineEligibility: item.bottomLineEligibility || '',
    bottomLineTags: item.bottomLineTags || [],
    pushRate: item.pushRateRef ? {
      level: item.pushRateRef.pushOpportunityLevel,
      text: item.pushRateRef.schoolPushRateText,
      sourceLevel: item.pushRateRef.sourceLevel,
      majorStatus: item.pushRateRef.majorLevelStatus
    } : null
  }));
}
