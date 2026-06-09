import { buildSelectionPoolStyledBlocks } from './feishu-selection-pool-styled-builder.js';
import { buildSelectionPoolSummary } from './selection-pool-summary.js';
import { formatNumber, rankGapText } from './selection-pool-rank-utils.js';
import { YEAR_CALIBER_KB } from './kb/year-caliber-kb.generated.js';
import { formatLiaoningOrdinaryUndergraduatePolicyLine } from './kb/liaoning-policy-accessor.js';
import { buildCareerAndExamReviewHints } from './kb/report-review-hints.js';
import { ADMISSION_CHARTER_CHECK_KB } from './kb/admission-charter-check-kb.generated.js';
import { MAJOR_CATALOG_CALIBER_KB } from './kb/major-catalog-caliber-kb.generated.js';
import { sanitizeParentCopy } from './kb/copy-policy-kb.generated.js';
import { buildReviewPointsForItems } from './kb/review-point-builder.js';
import { getCampusForItem, getCampusReviewSummaryForItems, formatCampusReviewLine } from './kb/campus-accessor.js';
import { buildSelectionReviewChecklist, reviewChecklistMarkdownLines } from './kb/review-checklist-builder.js';

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function num(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clean(value, max = 200) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function classify(item = {}) {
  const key = item.statusKey || '';
  const delta = num(item.scoreDelta, 0);
  if (['superRush', 'bigRush'].includes(key) || delta >= 16) return { group: 'rush', detail: '稍高目标', position: '稍高目标区' };
  if (['midRush', 'smallRush'].includes(key) || delta >= 4) return { group: 'rush', detail: '稍高目标', position: '稍高目标' };
  if (key === 'match' || (delta >= -5 && delta <= 3)) return { group: 'stable', detail: '主要参考', position: '主要参考' };
  if (key === 'steady' || (delta >= -15 && delta <= -6)) return { group: 'stable', detail: '主要参考', position: '主要参考偏稳' };
  if (key === 'guard' || (delta >= -25 && delta <= -16)) return { group: 'safe', detail: '稳妥补充', position: '稳妥补充' };
  if (key === 'low' || (delta >= -40 && delta <= -26)) return { group: 'safe', detail: '更稳补充', position: '后段更稳补充' };
  return { group: 'safe', detail: '稳妥补充', position: '稳妥补充确认' };
}

function normalizeItems(items = []) {
  return (Array.isArray(items) ? items : []).slice(0, 112).map((item, index) => {
    const poolBand = item.poolBand?.detail ? item.poolBand : classify(item);
    return {
      order: index + 1,
      userOrder: num(item.userOrder, index + 1),
      school: clean(item.school, 120),
      major: clean(item.major, 180),
      score2025: num(item.score2025 ?? item.score, null),
      rank2025: num(item.rank2025 ?? item.rank ?? item.minRank ?? item.lowestRank ?? item.referenceRank, null),
      score2024: num(item.score2024, null),
      rank2024: num(item.rank2024, null),
      scoreDelta: num(item.scoreDelta, null),
      statusLabel: clean(item.statusLabel, 60),
      position: clean(item.position || poolBand.position, 80),
      displayLocation: clean(item.displayLocation || item.geoEntity || '', 90),
      natureLabel: clean(item.natureLabel || item.nature || '', 60),
      schoolTags: Array.isArray(item.schoolTags) ? item.schoolTags.map(x => clean(x, 40)).filter(Boolean).slice(0, 8) : [],
      flags: Array.isArray(item.flags) ? item.flags.map(x => clean(x, 80)).filter(Boolean).slice(0, 8) : [],
      codes: item.codes || {},
      standardMajor: item.standardMajor || {},
      poolBand,
      campusReview: getCampusForItem(item)
    };
  }).filter(x => x.school || x.major);
}

function getStats(items = []) {
  const stats = { total: items.length, rushCount: 0, stableCount: 0, safeCount: 0, highRushCount: 0, floorCount: 0, byDetail: {} };
  for (const item of items) {
    const band = item.poolBand || classify(item);
    if (band.group === 'rush') stats.rushCount += 1;
    if (band.group === 'stable') stats.stableCount += 1;
    if (band.group === 'safe') stats.safeCount += 1;
    if (band.detail === '稍高目标') stats.highRushCount += 1;
    if (band.detail === '稳妥补充') stats.floorCount += 1;
    stats.byDetail[band.detail] = (stats.byDetail[band.detail] || 0) + 1;
  }
  return stats;
}

function pct(part, total) {
  return total ? Math.round(part / total * 100) : 0;
}

function deltaText(delta) {
  const n = Number(delta);
  if (!Number.isFinite(n)) return '—';
  return n > 0 ? `+${n}` : String(n);
}

function tagsText(item) {
  const arr = [];
  if (Array.isArray(item.schoolTags)) arr.push(...item.schoolTags);
  if (item.natureLabel) arr.push(item.natureLabel);
  if (item.displayLocation) arr.push(item.displayLocation);
  if (item.campusReview?.displayTag) arr.push(item.campusReview.displayTag);
  return [...new Set(arr.filter(Boolean))].join(' / ') || '标签待核验';
}

function itemLine(item) {
  const score = Number.isFinite(Number(item.score2025)) ? `${fmt(item.score2025)} 分` : '分数待核验';
  const rank = Number.isFinite(Number(item.rank2025)) ? `${fmt(item.rank2025)} 位` : '位次待核验';
  const band = item.poolBand?.detail || '待判断';
  const sm = item.standardMajor || {};
  const campusText = item.campusReview?.displayTag ? `｜${item.campusReview.displayTag}` : '';
  const code = sm.code && sm.name ? `｜专业代码：${sm.code}｜${sm.name}` : (sm.categoryCode && sm.categoryName && sm.mappingStatus === 'category' ? `｜专业类：${sm.categoryCode}｜${sm.categoryName}` : '');
  return `${item.order}. ${item.school}｜${item.major}${code}｜${band}${campusText}｜2025最低分 ${score}｜2025最低位次 ${rank}`;
}

function itemName(item) {
  if (!item) return '暂无';
  return `${item.school || '学校待核验'}｜${item.major || '专业待核验'}`;
}


function parentCoachLines(analysis = {}) {
  const coach = analysis.parentCoach || analysis.reportSnapshot?.parentCoach || null;
  const lines = [];
  if (!coach) return lines;
  lines.push('## 家长下一步复核清单');
  lines.push('');
  if (coach.headline) lines.push(`- ${clean(coach.headline, 500)}`);
  if (Array.isArray(coach.nextActions) && coach.nextActions.length) {
    lines.push('');
    lines.push('### 优先动作');
    coach.nextActions.slice(0, 6).forEach((x, i) => lines.push(`${i + 1}. ${clean(x, 220)}`));
  }
  if (coach.bottomLineReview) {
    lines.push('');
    lines.push('### 底线复核');
    lines.push(clean(coach.bottomLineReview, 900));
  }
  if (Array.isArray(coach.familyQuestions) && coach.familyQuestions.length) {
    lines.push('');
    lines.push('### 家庭要确认的问题');
    coach.familyQuestions.slice(0, 6).forEach((x, i) => lines.push(`${i + 1}. ${clean(x, 220)}`));
  }
  if (Array.isArray(coach.manualCheckList) && coach.manualCheckList.length) {
    lines.push('');
    lines.push('### 人工核验清单');
    coach.manualCheckList.slice(0, 8).forEach((x, i) => lines.push(`${i + 1}. ${clean(x, 220)}`));
  }
  lines.push('');
  return lines;
}


function governanceReviewLines(items = []) {
  const lines = [];
  lines.push('## 需要人工复核');
  lines.push('');
  const review = [];
  const campusReviews = getCampusReviewSummaryForItems(items, { limit: 4 });
  if (campusReviews.length) review.push(`校区复核：${campusReviews.map(formatCampusReviewLine).join('；')}`);
  const hasMedical = items.some(x => /临床|口腔|中医|中西医/.test(`${x.major || ''}`) && !/护理|药学|检验|影像技术|康复/.test(`${x.major || ''}`));
  const hasLaw = items.some(x => /法学/.test(`${x.major || ''}`));
  const hasTeacher = items.some(x => /师范|教育/.test(`${x.major || ''}`));
  const hasPhysicalExamSensitive = items.some(x => /医学|药学|生物|食品|农学|园艺|动物医学|交通运输|油气储运/.test(`${x.major || ''}`));
  review.push(`招生章程：${(ADMISSION_CHARTER_CHECK_KB?.generalCheckItems || []).slice(0, 8).join('、')}。`);
  review.push(...buildCareerAndExamReviewHints(items, { limit: 4 }));
  if (MAJOR_CATALOG_CALIBER_KB?.catalogs?.[2026]?.aiBoundary?.[0]) review.push(`专业目录：${MAJOR_CATALOG_CALIBER_KB.catalogs[2026].aiBoundary[0]}`);
  review.push(...buildReviewPointsForItems(items, { limit: 5 }));
  review.slice(0, 5).forEach((x, i) => lines.push(`${i + 1}. ${sanitizeParentCopy(clean(x, 260))}`));
  lines.push('');
  return lines;
}

function governanceBoundaryLines() {
  return [
    '## 数据和使用边界',
    '',
    `- 年度口径：${YEAR_CALIBER_KB.reportCopy}`,
    `- 辽宁志愿模式：${formatLiaoningOrdinaryUndergraduatePolicyLine()}`, 
    '- 专业热度：只反映 2024/2025 两年同校同专业普通项目位次变化，不代表 2026 年录取结果。',
    '- 招生章程：学费、校区、培养模式、体检限制、外语语种、转专业和毕业证/学位证口径必须以学校当年招生章程为准。',
    ''
  ];
}

function majorTrendLines(summary = {}) {
  summary = summary && typeof summary === 'object' ? summary : {};
  const lines = [];
  const notes = Array.isArray(summary.notes) ? summary.notes : [];
  if (!notes.length) return lines;
  lines.push('## 专业热度变化参考');
  lines.push('');
  notes.slice(0, 3).forEach((note, index) => lines.push(`${index + 1}. ${clean(note, 240)}`));
  lines.push('');
  lines.push('以上只反映 2024/2025 两年同校同专业录取位次变化，不代表 2026 年录取结果。');
  lines.push('');
  return lines;
}

function analysisLines(analysis = {}) {
  const lines = [];
  const narrative = analysis.narrative || analysis.aiNarrative || null;
  const coachLines = parentCoachLines(analysis);
  if (!narrative && !coachLines.length) return lines;
  if (coachLines.length) lines.push(...coachLines);
  if (!narrative) return lines;

  lines.push('## 方案解读');
  lines.push('');
  if (analysis.rankZone?.zoneName) lines.push(`- 位次功能区：${analysis.rankZone.zoneName}`);
  if (!narrative.reportMarkdown && narrative.overall) lines.push(`- 整体判断：${clean(narrative.overall, 800)}`);
  lines.push('');

  if (narrative.reportMarkdown) {
    lines.push(clean(narrative.reportMarkdown, 2600));
    lines.push('');
  } else {
    if (narrative.zoneJudgement) {
      lines.push('### 位次功能区判断');
      lines.push('');
      lines.push(clean(narrative.zoneJudgement, 1000));
      lines.push('');
    }
    if (narrative.reasoning) {
      lines.push('### 为什么这样判断');
      lines.push('');
      lines.push(clean(narrative.reasoning, 1000));
      lines.push('');
    }
    if (narrative.structureDiagnosis) {
      lines.push('### 自选专业结构');
      lines.push('');
      lines.push(clean(narrative.structureDiagnosis, 1000));
      lines.push('');
    }
    if (narrative.majorPathDiagnosis) {
      lines.push('### 专业与地域路径');
      lines.push('');
      lines.push(clean(narrative.majorPathDiagnosis, 1000));
      lines.push('');
    }
    if (narrative.pushRateDiagnosis) {
      lines.push('### 升学与推免参考');
      lines.push('');
      lines.push(clean(narrative.pushRateDiagnosis, 1000));
      lines.push('');
    }
    if (narrative.bottomLineDiagnosis) {
      lines.push('### 稳妥补充底线');
      lines.push('');
      lines.push(clean(narrative.bottomLineDiagnosis, 1000));
      lines.push('');
    }
    if (Array.isArray(narrative.riskDiagnosis) && narrative.riskDiagnosis.length) {
      lines.push('### 主要风险');
      lines.push('');
      narrative.riskDiagnosis.slice(0, 8).forEach((risk, index) => lines.push(`${index + 1}. ${clean(risk, 180)}`));
      lines.push('');
    }
    if (Array.isArray(narrative.actions) && narrative.actions.length) {
      lines.push('### 调整建议');
      lines.push('');
      narrative.actions.slice(0, 8).forEach((action, index) => lines.push(`${index + 1}. ${clean(action, 180)}`));
      lines.push('');
    }
  }

  lines.push('## 前中后段快速复核');
  lines.push('');
  if (analysis.stats?.total) {
    lines.push(`- 稍高目标：${fmt(analysis.stats.rushCount)} 个｜主要参考：${fmt(analysis.stats.stableCount)} 个｜稳妥补充：${fmt(analysis.stats.safeCount)} 个｜稍高目标：${fmt(analysis.stats.highRushCount || 0)} 个`);
  }
  if (Array.isArray(analysis.risks) && analysis.risks.length) {
    lines.push(`- 规则风险底稿：${analysis.risks.slice(0, 6).map(x => clean(x, 100)).join('；')}`);
  }
  lines.push('');
  return lines;
}

function summaryLines(summary) {
  const lines = [];
  lines.push('## 概要判断');
  lines.push('');
  lines.push(`- 考生：${summary.candidateScore ? fmt(summary.candidateScore) + ' 分' : '分数未填写'}｜${summary.candidateRankLabel || '位次待核验'}｜自选专业 ${fmt(summary.totalCount)} 个`);
  if (summary.candidateSameCount != null) lines.push(`- 同分人数：${fmt(summary.candidateSameCount)} 人｜内部计算采用同分末位累计：${fmt(summary.candidateRankForGap)} 位`);
  if (summary.rankZoneName) lines.push(`- 特控线锚点：${fmt(summary.specialControlScore)} 分｜${summary.specialControlRankLabel || '位次待核验'}｜功能区：${summary.rankZoneName}`);
  if (summary.scoreOffsetFromSpecial != null) lines.push(`- 相对特控线：${summary.scoreOffsetFromSpecial >= 0 ? '高出' : '低于'} ${fmt(Math.abs(summary.scoreOffsetFromSpecial))} 分｜位次差 ${summary.rankOffsetFromSpecial == null ? '待核验' : (summary.rankOffsetFromSpecial < 0 ? '优于约 ' + fmt(Math.abs(summary.rankOffsetFromSpecial)) + ' 名' : '落后约 ' + fmt(summary.rankOffsetFromSpecial) + ' 名')}`);
  if (summary.densitySummary) lines.push(`- 附近人数：同分 ${fmt(summary.densitySummary.sameCount)} 人｜上5分 ${fmt(summary.densitySummary.up5Count)} 人｜下5分 ${fmt(summary.densitySummary.down5Count)} 人`);
  lines.push(`- 稍高目标：${fmt(summary.rush.count)} 个｜稍高目标 ${fmt(summary.rush.superRushCount || 0)} 个｜稍高目标 ${fmt(summary.rush.smallRushCount || 0)} 个${summary.rush.maxForwardRankGap != null ? `｜最高向前跨越约 ${fmt(summary.rush.maxForwardRankGap)} 名` : ''}${summary.rush.missingRankCount ? `｜${fmt(summary.rush.missingRankCount)} 个位次待核验` : ''}`);
  lines.push(`- 主要参考：${fmt(summary.stable.count)} 个｜向前 ${fmt(summary.stable.forwardCount)} 个｜接近 ${fmt(summary.stable.nearCount)} 个｜向后 ${fmt(summary.stable.backwardCount)} 个${summary.stable.maxForwardRankGap != null ? `｜最高向前跨越约 ${fmt(summary.stable.maxForwardRankGap)} 名` : ''}${summary.stable.maxBackwardRankGap != null ? `｜最大向后回落约 ${fmt(summary.stable.maxBackwardRankGap)} 名` : ''}`);
  lines.push(`- 稳妥补充：${fmt(summary.safe.count)} 个｜较深稳妥补充 ${fmt(summary.safe.deepSafeCount || 0)} 个${summary.safe.maxBackwardRankGap != null ? `｜最大向后回落约 ${fmt(summary.safe.maxBackwardRankGap)} 名` : ''}${summary.safe.missingRankCount ? `｜${fmt(summary.safe.missingRankCount)} 个位次待核验` : ''}`);
  if (summary.topForwardItem) lines.push(`- 全池最高向前跨越：${itemName(summary.topForwardItem)}｜${rankGapText(summary.topForwardItem.rankGap)}`);
  if (summary.topBackwardItem) lines.push(`- 全池最大向后回落：${itemName(summary.topBackwardItem)}｜${rankGapText(summary.topBackwardItem.rankGap)}`);
  if (summary.missingRankCount) lines.push(`- 位次缺失提醒：${fmt(summary.missingRankCount)} 个专业暂缺可识别参考位次，概要位次统计基于其余 ${fmt(summary.withRankCount)} 个专业。`);
  lines.push(`- 位次口径：${summary.candidateRankNote}`);
  lines.push(`- 维护口径：${summary.maintenanceNote || '前中后段标签沿用自选专业现有判断，报告概要只做统计，不重新判定。'}`);
  lines.push('');
  return lines;
}

export function buildSelectionPoolFeishuReport(input = {}) {
  const reportType = input.reportType === 'selectionPoolWithAnalysis' ? 'selectionPoolWithAnalysis' : 'selectionPoolOnly';
  const candidateScore = input.candidateScore || '未填写';
  const items = normalizeItems(input.items || input.orderedItems || []);
  const stats = input.analysis?.stats?.total ? input.analysis.stats : getStats(items);
  const summary = buildSelectionPoolSummary(input, items);
  const displayRankForTitle = summary.candidateRankLabel || '位次待核验';
  const orderSignature = clean(input.orderSignature || input.analysis?.orderSignature || '', 600);
  const hasAnalysis = reportType === 'selectionPoolWithAnalysis' && input.analysis;
  const title = hasAnalysis
    ? `${candidateScore}分｜${displayRankForTitle}｜辽宁 2026 物理类专业初选参考报告`
    : `${candidateScore}分｜${displayRankForTitle}｜辽宁 2026 物理类自选专业清单`;
  const lines = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(hasAnalysis ? '## 辽宁 2026 物理类专业初选参考报告' : '## 辽宁 2026 物理类自选专业清单');
  if (hasAnalysis) lines.push(YEAR_CALIBER_KB.reportCopy);
  lines.push('');
  lines.push(`- 考生分数：${candidateScore}`);
  lines.push(`- 考生位次：${displayRankForTitle}`);
  lines.push(`- 数据口径：${YEAR_CALIBER_KB.pageCopy}正式填报以当年一分一段、招生计划和志愿系统为准。`);
  lines.push('- 使用边界：本报告用于家庭讨论和人工复核，不等同于录取预测。');
  lines.push('- 排序口径：按整理页当前显示的最终顺序写入报告；每次排序后会重新编号并保存。');
  lines.push('');
  lines.push(...summaryLines(summary));
  lines.push('## 自选专业总览');
  lines.push('');
  lines.push(`- 自选专业总数：${fmt(stats.total)} 个`);
  lines.push(`- 稍高目标：${fmt(stats.rushCount)} 个（${pct(stats.rushCount, stats.total)}%）`);
  lines.push(`- 主要参考：${fmt(stats.stableCount)} 个（${pct(stats.stableCount, stats.total)}%）`);
  lines.push(`- 稳妥补充：${fmt(stats.safeCount)} 个（${pct(stats.safeCount, stats.total)}%）`);
  if (stats.highRushCount) lines.push(`- 稍高目标：${fmt(stats.highRushCount)} 个`);
  if (stats.floorCount) lines.push(`- 稳妥补充：${fmt(stats.floorCount)} 个`);
  lines.push('');

  if (hasAnalysis) lines.push(...analysisLines(input.analysis));
  const majorTrendSummary = input.majorTrendSummary || input.analysis?.majorTrendSummary || null;
  lines.push(...majorTrendLines(majorTrendSummary));
  const displayItems = summary.enrichedItems?.length === items.length ? summary.enrichedItems : items;
  const reviewChecklist = input.reviewChecklist || buildSelectionReviewChecklist(displayItems.length ? displayItems : items);
  lines.push(...reviewChecklistMarkdownLines(reviewChecklist));

  lines.push('## 当前自选专业排序');
  lines.push('');
  if (!displayItems.length) {
    lines.push('- 当前自选专业为空。');
  } else {
    displayItems.forEach((item) => {
      const sm = item.standardMajor || {};
      const codeText = sm.code && sm.name ? `专业代码：${sm.code}｜${sm.name}` : (sm.categoryCode && sm.categoryName && sm.mappingStatus === 'category' ? `专业类：${sm.categoryCode}｜${sm.categoryName}` : '专业代码：待人工复核');
      lines.push(`### ${item.order}. ${item.school} · ${item.major}`);
      lines.push('');
      lines.push(`- 顺序：${item.order}`);
      lines.push(`- 学校：${item.school || '学校待核验'}`);
      lines.push(`- 专业：${item.major || '专业待核验'}`);
      lines.push(`- ${codeText}`);
      lines.push(`- 2025最低分：${Number.isFinite(Number(item.score2025)) ? fmt(item.score2025) : '分数待核验'}`);
      lines.push(`- 2025最低位次：${Number.isFinite(Number(item.rank2025)) ? fmt(item.rank2025) : '位次待核验'}`);
      lines.push(`- 相对孩子：${deltaText(item.scoreDelta)} 分`);
      lines.push(`- 匹配关系：${item.poolBand?.detail || item.statusLabel || '待判断'}`);
      lines.push(`- 需要复核：${item.flags.length ? item.flags.slice(0, 3).join(' / ') : tagsText(item)}`);
      lines.push('');
    });
  }

  lines.push('---');
  lines.push('');
  lines.push(...governanceReviewLines(displayItems));
  lines.push(...governanceBoundaryLines());

  return {
    title,
    markdown: lines.join('\n'),
    recordsCount: items.length,
    reportType,
    orderSignature,
    version: 'v3.9.18.2',
    summary,
    styledBlocks: buildSelectionPoolStyledBlocks({
      title,
      reportType,
      candidateScore,
      items: displayItems,
      stats,
      summary,
      hasAnalysis,
      analysis: input.analysis || null,
      majorTrendSummary: input.majorTrendSummary || input.analysis?.majorTrendSummary || null,
      reviewChecklist: input.reviewChecklist || buildSelectionReviewChecklist(displayItems.length ? displayItems : items),
      orderSignature
    })
  };
}


// v3.9.6.4 keyword note: 专业/项目/行业关键词包括中外、合作办学、高收费、石油、交通、航天等；AI/报告不得把中外绕过办学费用底线，须提示学费、培养模式、毕业证书、校区、是否必须出国、保研资格与转专业政策。
