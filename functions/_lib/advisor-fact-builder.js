import { getExamYearConfig } from './exam-year-config.js';
import { lookupScoreRank, getRankTableRows } from './rank-table-provider.js';
import { getRankGap, rankGapText } from './selection-pool-rank-utils.js';
import { getPushRateReference, buildPushRateSummary } from './push-rate-matcher.js';

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

function classify(item = {}) {
  const key = item.statusKey || '';
  const delta = num(item.scoreDelta, 0);
  if (['superRush', 'bigRush'].includes(key) || delta >= 16) return { group: 'rush', detail: '高冲', className: 'high-rush', position: '前段少量梦想位' };
  if (['midRush', 'smallRush'].includes(key) || delta >= 4) return { group: 'rush', detail: '小冲', className: 'light-rush', position: '前段冲刺区' };
  if (key === 'match' || (delta >= -5 && delta <= 3)) return { group: 'stable', detail: '边稳', className: 'edge-stable', position: '主体承接区' };
  if (key === 'steady' || (delta >= -15 && delta <= -6)) return { group: 'stable', detail: '稳妥', className: 'stable', position: '主体偏稳区' };
  if (key === 'guard' || (delta >= -25 && delta <= -16)) return { group: 'safe', detail: '小保', className: 'light-safe', position: '后段保底区' };
  if (key === 'low' || (delta >= -40 && delta <= -26)) return { group: 'safe', detail: '强保', className: 'safe', position: '后段强保区' };
  return { group: 'safe', detail: '兜底', className: 'floor', position: '兜底确认区' };
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

function normalizeItems(items = [], candidateRank = null, candidateScore = null) {
  return (Array.isArray(items) ? items : []).slice(0, 112).map((item, index) => {
    const score2025 = num(item.score2025 ?? item.score, null);
    const scoreDelta = candidateScore != null && score2025 != null ? Math.round(score2025 - candidateScore) : null;
    const dynamicItem = { ...item, statusKey: '', scoreDelta };
    const poolBand = classify(dynamicItem);
    const rank2025 = num(item.rank2025 ?? item.rank ?? item.minRank ?? item.lowestRank ?? item.referenceRank, null);
    const rankGap = getRankGap(candidateRank, rank2025);
    return {
      id: clean(item.id || `${item.school}-${item.major}-${item.score2025}-${item.rank2025}`, 240),
      order: index + 1,
      userOrder: num(item.userOrder, index + 1),
      school: clean(item.school, 120),
      major: clean(item.major, 180),
      score2025,
      rank2025,
      scoreDelta,
      rankGap,
      rankGapText: rankGapText(rankGap),
      statusKey: '',
      statusLabel: clean(poolBand.detail, 40),
      displayLocation: clean(item.displayLocation || item.geoEntity || item.city || '', 80),
      natureLabel: clean(item.natureLabel || item.nature || '', 60),
      flags: Array.isArray(item.flags) ? item.flags.map(x => clean(x, 80)).filter(Boolean).slice(0, 8) : [],
      schoolTags: Array.isArray(item.schoolTags) ? item.schoolTags.map(x => clean(x, 50)).filter(Boolean).slice(0, 8) : [],
      poolBand,
      majorFamily: majorFamily(item.major),
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
    const band = item.poolBand || classify(item);
    if (band.group === 'rush') stats.rushCount += 1;
    if (band.group === 'stable') stats.stableCount += 1;
    if (band.group === 'safe') stats.safeCount += 1;
    if (band.detail === '高冲') stats.highRushCount += 1;
    if (band.detail === '兜底') stats.floorCount += 1;
    if (band.detail === '强保' || band.detail === '兜底') stats.deepSafeCount += 1;
    inc(stats.byDetail, band.detail);
    inc(stats.byCity, item.displayLocation || '未知地域');
    inc(stats.byMajorFamily, item.majorFamily || '其他专业');
    inc(stats.byNature, item.natureLabel || '属性待核验');
    const flagsText = [item.natureLabel, ...(item.flags || []), ...(item.schoolTags || [])].join(' ');
    if (/中外|合作|高收费|国际|学费/.test(flagsText)) stats.tuitionOrCoopCount += 1;
    if (/民办|独立学院|高收费|中外|合作/.test(flagsText)) stats.privateOrFeeCount += 1;
    if (item.rankGap == null) stats.missingRankCount += 1;
    else {
      stats.withRankCount += 1;
      if (item.rankGap > 0 && (stats.maxForwardRankGap == null || item.rankGap > stats.maxForwardRankGap)) stats.maxForwardRankGap = item.rankGap;
      if (item.rankGap < 0 && (stats.maxBackwardRankGap == null || Math.abs(item.rankGap) > stats.maxBackwardRankGap)) stats.maxBackwardRankGap = Math.abs(item.rankGap);
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

function noteFromFacts({ config, candidateScore, specialControlScore, scoreOffsetFromSpecial, rankOffsetFromSpecial }) {
  if (candidateScore == null) return '考生分数待填写，暂无法进行位次功能区判断。';
  const direction = scoreOffsetFromSpecial == null ? '与特控线距离待核验' : (scoreOffsetFromSpecial >= 0 ? `高出特控线 ${fmt(scoreOffsetFromSpecial)} 分` : `低于特控线 ${fmt(Math.abs(scoreOffsetFromSpecial))} 分`);
  const rankDirection = rankOffsetFromSpecial == null ? '位次差待核验' : (rankOffsetFromSpecial < 0 ? `位次优于特控线约 ${fmt(Math.abs(rankOffsetFromSpecial))} 名` : `位次落后特控线约 ${fmt(rankOffsetFromSpecial)} 名`);
  return `按${config.year}辽宁物理类口径，考生${direction}，${rankDirection}；分数只作展示，诊断以位次、密度和自选池结构为主。`;
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
  const orderedItems = normalizeItems(input.items || input.orderedItems || [], candidateRank, candidateScore);
  const stats = buildStats(orderedItems);
  const pushRateSummary = buildPushRateSummary(orderedItems);
  const note = noteFromFacts({ config, candidateScore, specialControlScore: config.specialControlScore, scoreOffsetFromSpecial, rankOffsetFromSpecial });
  return {
    version: 'v3.9.5.8',
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
    score2025: item.score2025,
    rank2025: item.rank2025,
    scoreDelta: item.scoreDelta,
    rankGap: item.rankGap,
    band: item.poolBand?.detail || item.statusLabel || '',
    majorFamily: item.majorFamily,
    location: item.displayLocation,
    nature: item.natureLabel,
    pushRate: item.pushRateRef ? {
      level: item.pushRateRef.pushOpportunityLevel,
      text: item.pushRateRef.schoolPushRateText,
      sourceLevel: item.pushRateRef.sourceLevel,
      majorStatus: item.pushRateRef.majorLevelStatus
    } : null
  }));
}
