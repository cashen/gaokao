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
import { FEISHU_REPORT_CONTRACT } from '../../shared/resources/reports/feishu-report-contract.js';
import { formatHistoricalEvidenceText, getHistoryScoreRankEvidence } from '../../shared/resources/exam/historical-score-rank-contract.js';

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
  if (item.historicalOnly) return { key: 'unknown', group: 'unknown', detail: '历史自选', position: '尚未匹配到 2026 同口径记录' };
  const existing = item.poolBand || {};
  const key = existing.key || item.bandKey || item.band || '';
  if (['upper', 'near', 'steady'].includes(key)) return {
    ...existing,
    key,
    group: key === 'upper' ? 'rush' : key === 'near' ? 'stable' : 'safe',
    detail: key === 'upper' ? '稍高目标' : key === 'near' ? '主要参考' : '低分侧补充',
    position: existing.position || (key === 'upper' ? '稍高目标区' : key === 'near' ? '主要参考区' : '低分侧补充区')
  };
  const delta = num(item.scoreDelta2026 ?? item.scoreDelta, null);
  if (delta == null) return { key: 'unknown', group: 'unknown', detail: '待核验', position: '分差待核验' };
  if (delta >= 1 && delta <= 10) return { key: 'upper', group: 'rush', detail: '稍高目标', position: '稍高目标区' };
  if (delta >= -10 && delta <= 0) return { key: 'near', group: 'stable', detail: '主要参考', position: '主要参考区' };
  if (delta >= -25 && delta <= -11) return { key: 'steady', group: 'safe', detail: '低分侧补充', position: '低分侧补充区' };
  return { key: 'outside', group: 'unknown', detail: '当前范围外', position: '不在当前查看范围内' };
}

function normalizeItems(items = []) {
  return (Array.isArray(items) ? items : []).slice(0, 112).map((item, index) => {
    const poolBand = item.poolBand?.detail ? item.poolBand : classify(item);
    return {
      order: index + 1,
      userOrder: num(item.userOrder, index + 1),
      school: clean(item.school, 120),
      major: clean(item.major, 180),
      score2026: num(item.score2026 ?? item.score, null),
      rank2026: num(item.rank2026 ?? item.rank ?? item.minRank ?? item.lowestRank ?? item.referenceRank, null),
      historyEvidence: getHistoryScoreRankEvidence(item),
      scoreDelta2026: num(item.scoreDelta2026 ?? item.scoreDelta, null),
      scoreDelta: num(item.scoreDelta2026 ?? item.scoreDelta, null),
      rankGap2026: num(item.rankGap2026 ?? item.rankGap, null),
      rankGap: num(item.rankGap2026 ?? item.rankGap, null),
      historicalOnly: Boolean(item.historicalOnly),
      statusLabel: clean(item.statusLabel, 60),
      position: clean(item.position || poolBand.position, 80),
      displayLocation: clean(item.displayLocation || item.geoEntity || '', 90),
      natureLabel: clean(item.natureLabel || item.nature || '', 60),
      schoolTags: Array.isArray(item.schoolTags) ? item.schoolTags.map(x => clean(x, 40)).filter(Boolean).slice(0, 8) : [],
      flags: Array.isArray(item.flags) ? item.flags.map(x => clean(x, 100)).filter(Boolean).slice(0, 10) : [],
      reviewPoints: Array.isArray(item.reviewPoints) ? item.reviewPoints.map(x => clean(x, 160)).filter(Boolean).slice(0, 8) : [],
      localStrongChain: item.localStrongChain || null,
      trajectoryChain: item.trajectoryChain || null,
      localStrengthMark: item.localStrengthMark || null,
      majorUnderstanding: item.majorUnderstanding || null,
      specialProject: item.specialProject || null,
      codes: item.codes || {},
      standardMajor: item.standardMajor || {},
      poolBand,
      campusReview: getCampusForItem(item)
    };
  }).filter(x => (x.school || x.major) && !x.historicalOnly);
}

function getStats(items = []) {
  const stats = { total: items.length, rushCount: 0, stableCount: 0, safeCount: 0, highRushCount: 0, floorCount: 0, byDetail: {} };
  for (const item of items) {
    const band = item.poolBand || classify(item);
    if (band.group === 'rush') stats.rushCount += 1;
    if (band.group === 'stable') stats.stableCount += 1;
    if (band.group === 'safe') stats.safeCount += 1;
    if (band.detail === '稍高目标') stats.highRushCount += 1;
    if (band.detail === '低分侧补充') stats.floorCount += 1;
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


function historyText(item = {}, { empty = '历史同口径参考：暂无' } = {}) {
  return formatHistoricalEvidenceText(item, { years: [2025, 2024], prefix: false, empty });
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
  const score = Number.isFinite(Number(item.score2026)) ? `${fmt(item.score2026)} 分` : '分数待核验';
  const rank = Number.isFinite(Number(item.rank2026)) ? `${fmt(item.rank2026)} 位` : '位次待核验';
  const band = item.poolBand?.detail || '待判断';
  const special = item.specialProject?.hasSpecialProject ? `｜特殊项目：${item.specialProject.labelText || item.specialProject.primaryLabel || '需资格核验'}` : '';
  const sm = item.standardMajor || {};
  const campusText = item.campusReview?.displayTag ? `｜${item.campusReview.displayTag}` : '';
  const code = sm.code && sm.name ? `｜专业代码：${sm.code}｜${sm.name}` : (sm.categoryCode && sm.categoryName && sm.mappingStatus === 'category' ? `｜专业类：${sm.categoryCode}｜${sm.categoryName}` : '');
  return `${item.order}. ${item.school}｜${item.major}｜2026投档最低分 ${score}｜对应累计位次约 ${rank}｜${band}${campusText}${code}${special}`;
}

function itemName(item) {
  if (!item) return '暂无';
  return `${item.school || '学校待核验'}｜${item.major || '专业待核验'}`;
}

function localContextItems(item = {}) {
  const out = [];
  if (item.localStrongChain?.matched) {
    out.push({
      kind: 'background',
      title: `${item.localStrongChain.depth === 'core' ? '本校方向' : '本校相关'}：${item.localStrongChain.chainName || '院校背景'}`,
      reviewText: item.localStrongChain.reviewText || (item.localStrongChain.reviewPoints || []).join(' / '),
      reportTip: item.localStrongChain.reportTip || item.localStrongChain.cardTip || ''
    });
  }
  if (item.trajectoryChain?.matched) {
    const strongName = String(item.localStrongChain?.chainName || '');
    const trajectoryName = String(item.trajectoryChain.trajectoryName || item.trajectoryChain.chainName || '');
    if (!strongName || !trajectoryName || (!strongName.includes(trajectoryName.replace(/方向$/, '')) && !trajectoryName.includes(strongName.replace(/方向$/, '')))) {
      out.push({
        kind: 'trajectory',
        title: `方向提醒：${trajectoryName || '方向待核验'}`,
        reviewText: item.trajectoryChain.reviewText || (item.trajectoryChain.reviewPoints || []).join(' / '),
        reportTip: item.trajectoryChain.reportTip || ''
      });
    }
  }
  return out;
}

function localContextMarkdownLines(items = []) {
  const rows = [];
  (Array.isArray(items) ? items : []).forEach(item => {
    localContextItems(item).forEach(entry => rows.push({ item, entry }));
  });
  if (!rows.length) return [];
  const backgroundCount = rows.filter(x => x.entry.kind === 'background').length;
  const trajectoryCount = rows.filter(x => x.entry.kind === 'trajectory').length;
  const lines = ['## 院校专业背景复核', '', `- 院校专业背景：${fmt(backgroundCount)} 条`, `- 方向提醒：${fmt(trajectoryCount)} 条`, '- 说明：这些提示不代表录取判断依据，也不代表一定适合孩子；只提醒家长重点再看课程方向、就业场景、招生章程和 211/省内背景对应关系。', ''];
  rows.slice(0, 10).forEach(({ item, entry }) => {
    lines.push(`- ${item.school} · ${item.major}：${entry.title}${entry.reviewText ? `｜建议再看：${entry.reviewText}` : ''}`);
  });
  lines.push('');
  return lines;
}

function localStrengthMarkdownLines(items = []) {
  const rows = [];
  (Array.isArray(items) ? items : []).forEach(item => {
    const mark = item.localStrengthMark?.matched ? item.localStrengthMark : null;
    if (mark) {
      rows.push({ item, mark });
      return;
    }
    const entries = localContextItems(item);
    if (!entries.length) return;
    const primary = entries[0];
    rows.push({ item, mark: {
      direction: primary.title || '学校背景方向',
      sourceText: primary.kind === 'trajectory' ? '方向提醒' : '省内背景',
      evidenceLabel: primary.kind === 'trajectory' ? '方向提醒' : '本校相关',
      verifyItems: primary.reviewText ? String(primary.reviewText).split(/\s*\/\s*|、|；|;|，/).filter(Boolean) : [],
      why: primary.reportTip || ''
    }});
  });
  if (!rows.length) return [];
  const lines = ['## 已选专业中的院校背景提示', '', '- 说明：这些已选条目与院校背景、专业建设或方向线索有关，供家庭逐条复核；不代表录取判断，也不替家庭下结论。', ''];
  rows.slice(0, 10).forEach(({ item, mark }) => {
    const source = mark.sourceText || (Array.isArray(mark.sourceKinds) && mark.sourceKinds.length ? mark.sourceKinds.join(' / ') : '学校背景');
    const review = Array.isArray(mark.verifyItems) && mark.verifyItems.length ? mark.verifyItems.slice(0, 5).join(' / ') : '招生计划 / 校区 / 近年位次 / 培养方向';
    lines.push(`- ${item.school} · ${item.major}：${mark.direction || '学校背景方向'}｜提示层级：${mark.evidenceLabel || source}${review ? `｜建议再看：${review}` : ''}`);
    if (mark.why) lines.push(`  - 提示依据：${clean(mark.why, 220)}`);
  });
  lines.push('');
  return lines;
}


function parentCoachLines(analysis = {}) {
  const coach = analysis.parentCoach || analysis.reportSnapshot?.parentCoach || null;
  const lines = [];
  if (!coach) return lines;
  lines.push('## 家长下一步确认清单');
  lines.push('');
  if (coach.headline) lines.push(`- ${clean(coach.headline, 500)}`);
  if (Array.isArray(coach.nextActions) && coach.nextActions.length) {
    lines.push('');
    lines.push('### 优先动作');
    coach.nextActions.slice(0, 6).forEach((x, i) => lines.push(`${i + 1}. ${clean(x, 220)}`));
  }
  if (coach.bottomLineReview) {
    lines.push('');
    lines.push('### 底线确认');
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
  lines.push('## 需要人工确认');
  lines.push('');
  const review = [];
  const campusReviews = getCampusReviewSummaryForItems(items, { limit: 4 });
  if (campusReviews.length) review.push(`校区确认：${campusReviews.map(formatCampusReviewLine).join('；')}`);
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
    '- 三年位置变化：只反映 2024—2026 同校同专业同项目属性的历史投档位置变化，不代表 2027 年录取结果。',
    '- 招生章程：学费、校区、培养模式、体检限制、外语语种、转专业和毕业证/学位证口径必须以学校当年招生章程为准。',
    ''
  ];
}

function majorTrendLines(summary = {}) {
  summary = summary && typeof summary === 'object' ? summary : {};
  const lines = [];
  const notes = Array.isArray(summary.notes) ? summary.notes : [];
  if (!notes.length) return lines;
  lines.push('## 近三年投档位置变化参考');
  lines.push('');
  notes.slice(0, 3).forEach((note, index) => lines.push(`${index + 1}. ${clean(note, 240)}`));
  lines.push('');
  lines.push('以上只反映 2024—2026 同校同专业同项目属性的历史投档位置变化，不代表 2027 年录取结果。');
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
      lines.push('### 已选专业结构');
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
      lines.push('### 低分侧补充底线');
      lines.push('');
      lines.push(clean(narrative.bottomLineDiagnosis, 1000));
      lines.push('');
    }
    if (Array.isArray(narrative.riskDiagnosis) && narrative.riskDiagnosis.length) {
      lines.push('### 主要需要关注');
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

  lines.push('## 前中后段快速确认');
  lines.push('');
  if (analysis.stats?.total) {
    lines.push(`- 稍高目标：${fmt(analysis.stats.rushCount)} 个｜主要参考：${fmt(analysis.stats.stableCount)} 个｜低分侧补充：${fmt(analysis.stats.safeCount)} 个｜稍高目标：${fmt(analysis.stats.highRushCount || 0)} 个`);
  }
  if (Array.isArray(analysis.risks) && analysis.risks.length) {
    lines.push(`- 规则需要关注底稿：${analysis.risks.slice(0, 6).map(x => clean(x, 100)).join('；')}`);
  }
  lines.push('');
  return lines;
}


function directionExplorerLines(direction = null) {
  if (!direction || (!direction.focus?.length && !direction.explore?.length && !direction.confirm?.length)) return [];
  const lines = [];
  lines.push('## 孩子方向参考');
  lines.push('');
  lines.push('- 这部分不是给孩子定专业，只是帮助家里讨论：哪些方向更值得看，哪些方向只是没接触过，哪些地方需要再确认。');
  if (Array.isArray(direction.focus) && direction.focus.length) lines.push(`- 更值得重点讨论：${direction.focus.slice(0, 8).map(x => clean(x, 80)).join('、')}`);
  if (Array.isArray(direction.explore) && direction.explore.length) lines.push(`- 可以先了解：${direction.explore.slice(0, 8).map(x => clean(x, 80)).join('、')}。孩子接触不多的方向，不建议因为“没感觉”就直接排除。`);
  if (Array.isArray(direction.confirm) && direction.confirm.length) {
    lines.push('- 需要再确认：');
    direction.confirm.slice(0, 5).forEach((x, index) => lines.push(`  ${index + 1}. ${clean(x, 160)}`));
  }
  lines.push('');
  return lines;
}

function summaryLines(summary) {
  const lines = [];
  lines.push('## 概要判断');
  lines.push('');
  lines.push(`- 参考分数：${summary.candidateScore ? fmt(summary.candidateScore) + ' 分' : '分数未填写'}｜${summary.candidateRankLabel || '位次待核验'}｜已选专业 ${fmt(summary.totalCount)} 个`);
  if (summary.candidateSameCount != null) lines.push(`- 同分人数：${fmt(summary.candidateSameCount)} 人｜内部计算采用同分末位累计：${fmt(summary.candidateRankForGap)} 位`);
  if (summary.rankZoneName) lines.push(`- 特控线锚点：${fmt(summary.specialControlScore)} 分｜${summary.specialControlRankLabel || '位次待核验'}｜功能区：${summary.rankZoneName}`);
  if (summary.scoreOffsetFromSpecial != null) lines.push(`- 相对特控线：${summary.scoreOffsetFromSpecial >= 0 ? '高出' : '低于'} ${fmt(Math.abs(summary.scoreOffsetFromSpecial))} 分｜位次差 ${summary.rankOffsetFromSpecial == null ? '待核验' : (summary.rankOffsetFromSpecial < 0 ? '优于约 ' + fmt(Math.abs(summary.rankOffsetFromSpecial)) + ' 名' : '落后约 ' + fmt(summary.rankOffsetFromSpecial) + ' 名')}`);
  if (summary.densitySummary) lines.push(`- 附近人数：同分 ${fmt(summary.densitySummary.sameCount)} 人｜上5分 ${fmt(summary.densitySummary.up5Count)} 人｜下5分 ${fmt(summary.densitySummary.down5Count)} 人`);
  lines.push(`- 稍高目标：${fmt(summary.rush.count)} 个｜稍高目标 ${fmt(summary.rush.superRushCount || 0)} 个｜稍高目标 ${fmt(summary.rush.smallRushCount || 0)} 个${summary.rush.maxForwardRankGap != null ? `｜最高向前跨越约 ${fmt(summary.rush.maxForwardRankGap)} 名` : ''}${summary.rush.missingRankCount ? `｜${fmt(summary.rush.missingRankCount)} 个位次待核验` : ''}`);
  lines.push(`- 主要参考：${fmt(summary.stable.count)} 个｜向前 ${fmt(summary.stable.forwardCount)} 个｜接近 ${fmt(summary.stable.nearCount)} 个｜向后 ${fmt(summary.stable.backwardCount)} 个${summary.stable.maxForwardRankGap != null ? `｜最高向前跨越约 ${fmt(summary.stable.maxForwardRankGap)} 名` : ''}${summary.stable.maxBackwardRankGap != null ? `｜最大向后回落约 ${fmt(summary.stable.maxBackwardRankGap)} 名` : ''}`);
  lines.push(`- 低分侧补充：${fmt(summary.safe.count)} 个｜较深低分侧补充 ${fmt(summary.safe.deepSafeCount || 0)} 个${summary.safe.maxBackwardRankGap != null ? `｜最大向后回落约 ${fmt(summary.safe.maxBackwardRankGap)} 名` : ''}${summary.safe.missingRankCount ? `｜${fmt(summary.safe.missingRankCount)} 个位次待核验` : ''}`);
  if (summary.topForwardItem) lines.push(`- 全池最高向前跨越：${itemName(summary.topForwardItem)}｜${rankGapText(summary.topForwardItem.rankGap)}`);
  if (summary.topBackwardItem) lines.push(`- 全池最大向后回落：${itemName(summary.topBackwardItem)}｜${rankGapText(summary.topBackwardItem.rankGap)}`);
  if (summary.missingRankCount) lines.push(`- 位次缺失提醒：${fmt(summary.missingRankCount)} 个专业暂缺可识别参考位次，概要位次统计基于其余 ${fmt(summary.withRankCount)} 个专业。`);
  lines.push(`- 位次口径：${summary.candidateRankNote}`);
  lines.push(`- 维护口径：${summary.maintenanceNote || '前中后段标签沿用已选专业现有判断，报告概要只做统计，不重新判定。'}`);
  lines.push('');
  return lines;
}


function nonHeadingLines(lines = []) {
  return (Array.isArray(lines) ? lines : []).filter(line => !/^#{2,3}\s+/.test(String(line || '').trim()));
}

function appendChecklistLines(lines, checklist = {}) {
  const categories = Array.isArray(checklist.categories) ? checklist.categories : [];
  if (!categories.length) {
    lines.push('- 暂未汇总出明显复核事项；正式填报仍需核验 2027 招生计划和招生章程。', '');
    return;
  }
  lines.push(`- ${checklist.summary?.headline || `本方案有 ${categories.length} 类事项建议人工复核`}。`);
  categories.slice(0, 7).forEach((cat, idx) => {
    lines.push(`- ${idx + 1}. ${cat.title}（${cat.count} 条）`);
    cat.items.slice(0, 5).forEach((it, i) => lines.push(`  ${i + 1}. ${it.school}｜${it.major}：${it.reason} 建议：${it.action}`));
  });
  lines.push('');
}

function appendLocalContextLines(lines, items = []) {
  const rows = [];
  (Array.isArray(items) ? items : []).forEach(item => {
    localContextItems(item).forEach(entry => rows.push({ item, entry }));
  });
  if (!rows.length) {
    lines.push('- 院校背景提示：暂无明显提示；仍需按招生章程、培养方案和当年计划人工核验。', '');
    return;
  }
  lines.push(`- 院校背景提示复核：${fmt(rows.length)} 条。说明：这些提示不代表录取判断依据，也不代表一定适合孩子；只提醒家长重点再看课程方向、就业场景和招生章程。`);
  rows.slice(0, 10).forEach(({ item, entry }) => {
    lines.push(`  - ${item.school}｜${item.major}：${entry.title}${entry.reviewText ? `｜建议再看：${entry.reviewText}` : ''}`);
  });
  lines.push('');
}

function appendManualReviewLines(lines, items = []) {
  const review = nonHeadingLines(governanceReviewLines(items)).filter(Boolean);
  if (review.length) lines.push(...review, '');
}

function appendCurrentPlanLines(lines, input, stats, summary, hasAnalysis) {
  lines.push(`- 已选专业总数：${fmt(stats.total)} 个。`);
  lines.push(`- 稍高目标：${fmt(stats.rushCount)} 个（${pct(stats.rushCount, stats.total)}%）｜主要参考：${fmt(stats.stableCount)} 个（${pct(stats.stableCount, stats.total)}%）｜低分侧补充：${fmt(stats.safeCount)} 个（${pct(stats.safeCount, stats.total)}%）。`);
  if (stats.highRushCount) lines.push(`- 稍高目标数量：${fmt(stats.highRushCount)} 个，请控制数量并逐条核验孩子是否接受。`);
  if (stats.floorCount) lines.push(`- 低分侧补充数量：${fmt(stats.floorCount)} 个，请确认专业、城市和费用是否真的接受。`);
  const direction = directionExplorerLines(input.reportContext?.directionExplorer || input.directionExplorer || null);
  const directionBody = nonHeadingLines(direction).filter(Boolean);
  if (directionBody.length) lines.push('', ...directionBody);
  if (hasAnalysis) {
    const analysisBody = nonHeadingLines(analysisLines(input.analysis)).filter(Boolean);
    if (analysisBody.length) lines.push('', ...analysisBody);
  }
  const majorTrendSummary = input.majorTrendSummary || input.analysis?.majorTrendSummary || null;
  const trendBody = nonHeadingLines(majorTrendLines(majorTrendSummary)).filter(Boolean);
  if (trendBody.length) lines.push('', ...trendBody);
  lines.push('', `- 排序口径：按整理页当前显示的最终顺序写入报告；每次排序后会重新编号并保存。`);
  lines.push(`- 维护口径：${summary.maintenanceNote || '前中后段标签沿用已选专业现有判断，报告概要只做统计，不重新判定。'}`);
  lines.push('');
}



function majorUnderstandingMarkdownLines(items = []) {
  const rows = [];
  (Array.isArray(items) ? items : []).forEach(item => {
    const info = item.majorUnderstanding?.matched ? item.majorUnderstanding : null;
    if (!info) return;
    const summary = clean(info.report?.shortSummary || info.card?.oneLine || '', 180);
    const review = Array.isArray(info.report?.reviewItems) && info.report.reviewItems.length ? info.report.reviewItems.slice(0, 3).join(' / ') : '';
    if (summary || review) rows.push({ item, summary, review });
  });
  if (!rows.length) return [];
  const lines = ['## 专业理解与家庭确认问题', '', '- 说明：这里不预测就业，也不替孩子决定；只帮助家庭先看懂专业、再查培养方案和招生章程。', ''];
  rows.slice(0, 10).forEach(({ item, summary, review }) => {
    lines.push(`- ${item.school || '学校待核验'} · ${item.major || '专业待核验'}：${summary || '专业理解待复核'}${review ? `｜家庭复核：${review}` : ''}`);
  });
  lines.push('');
  return lines;
}

function groupCountsForReport(items = []) {
  const groups = { rush: [], stable: [], safe: [] };
  (Array.isArray(items) ? items : []).forEach(item => {
    const group = (item.poolBand || classify(item)).group || 'safe';
    (groups[group] || groups.safe).push(item);
  });
  return groups;
}

function appendStructureLines(lines, groups = {}) {
  const defs = [
    ['rush', '稍高目标', '数量不要过多，逐条核验孩子是否能接受学校、专业、城市和费用。'],
    ['stable', '主要参考', '重点看专业方向、院校背景、校区和培养路径是否匹配家庭讨论目标。'],
    ['safe', '低分侧补充', '不是承诺结果，只是用于避免方案结构过于集中；仍要核验专业和城市是否接受。']
  ];
  defs.forEach(([key, title, note]) => {
    const list = groups[key] || [];
    const sample = list.slice(0, 12).map(item => `第${item.order}位`).join('、') || '暂无';
    lines.push(`- ${title}：${fmt(list.length)} 个｜涉及顺序：${sample}。${note}`);
  });
  lines.push('');
}

export function buildSelectionPoolFeishuReport(input = {}) {
  const reportType = input.reportType === 'selectionPoolWithAnalysis' ? 'selectionPoolWithAnalysis' : 'selectionPoolOnly';
  const candidateScore = input.candidateScore || '未填写';
  const items = normalizeItems(input.items || input.orderedItems || []);
  const stats = input.analysis?.stats?.total ? input.analysis.stats : getStats(items);
  const summary = buildSelectionPoolSummary({
    ...input,
    year: FEISHU_REPORT_CONTRACT.dataYear,
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    rankYear: FEISHU_REPORT_CONTRACT.rankYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
    yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion
  }, items);
  const displayRankForTitle = summary.candidateRankLabel || '位次待核验';
  const orderSignature = clean(input.orderSignature || input.analysis?.orderSignature || '', 600);
  const hasAnalysis = reportType === 'selectionPoolWithAnalysis' && input.analysis;
  const title = hasAnalysis
    ? `${candidateScore}分｜${displayRankForTitle}｜辽宁 ${FEISHU_REPORT_CONTRACT.dataYear} 物理类专业初选参考报告`
    : `${candidateScore}分｜${displayRankForTitle}｜辽宁 ${FEISHU_REPORT_CONTRACT.dataYear} 物理类家庭讨论报告`;
  const displayItems = summary.enrichedItems?.length === items.length ? summary.enrichedItems : items;
  const reviewChecklist = input.reviewChecklist || buildSelectionReviewChecklist(displayItems.length ? displayItems : items);
  const groups = groupCountsForReport(displayItems.length ? displayItems : items);
  const lines = [];

  lines.push(`# ${title}`, '');
  lines.push(`- 报告类型：${hasAnalysis ? '带解读的报告' : '当前排序清单'}`);
  lines.push(`- 模考 / 预估参考分数：${candidateScore}`);
  lines.push(`- ${FEISHU_REPORT_CONTRACT.dataYear} 历史参考位置：${displayRankForTitle}`);
  lines.push(`- 数据口径：${YEAR_CALIBER_KB.pageCopy}正式填报以当年一分一段、招生计划和志愿系统为准。`);
  lines.push('- 使用边界：本报告用于家庭讨论和人工确认，不等同于录取预测。', '');

  lines.push('## 一、概要判断', '');
  lines.push(...nonHeadingLines(summaryLines(summary)).filter(Boolean), '');

  lines.push('## 二、当前方案怎么看', '');
  appendCurrentPlanLines(lines, input, stats, summary, hasAnalysis);

  lines.push('## 三、前中后段快速确认', '');
  appendStructureLines(lines, groups);

  lines.push('## 四、最终排序清单', '');
  if (!displayItems.length) {
    lines.push('- 当前已选专业为空。', '');
  } else {
    displayItems.forEach((item) => {
      const sm = item.standardMajor || {};
      const codeText = sm.code && sm.name ? `专业代码：${sm.code}｜${sm.name}` : (sm.categoryCode && sm.categoryName && sm.mappingStatus === 'category' ? `专业类：${sm.categoryCode}｜${sm.categoryName}` : '专业代码：待人工确认');
      lines.push(`### ${item.order}. ${item.school} · ${item.major}`, '');
      lines.push(`- 顺序：${item.order}`);
      lines.push(`- 学校：${item.school || '学校待核验'}`);
      lines.push(`- 专业：${item.major || '专业待核验'}`);
      lines.push(`- 2026最低投档分：${Number.isFinite(Number(item.score2026)) ? fmt(item.score2026) : '分数待核验'}`);
      lines.push(`- 2026最低投档位次：${Number.isFinite(Number(item.rank2026)) ? fmt(item.rank2026) : '位次待核验'}`);
      lines.push(`- 相对孩子：${deltaText(item.scoreDelta)} 分`);
      lines.push(`- 参考位置：${item.poolBand?.detail || item.statusLabel || '待判断'}`);
      lines.push(`- 地域：${tagsText(item)}`);
      lines.push(`- ${codeText}`);
      if (item.majorUnderstanding?.matched) {
        const mu = item.majorUnderstanding;
        const summaryText = clean(mu.report?.shortSummary || mu.card?.oneLine || '', 180);
        const reviewItems = Array.isArray(mu.report?.reviewItems) ? mu.report.reviewItems.slice(0, 3).join(' / ') : '';
        if (summaryText) lines.push(`- 专业理解：${summaryText}`);
        if (reviewItems) lines.push(`- 家庭复核：${reviewItems}`);
      }
      const contextEntries = localContextItems(item);
      if (contextEntries.length) {
        contextEntries.slice(0, 2).forEach(entry => {
          lines.push(`- 院校背景提示：${entry.title}`);
          if (entry.reviewText) lines.push(`- 建议再看：${entry.reviewText}`);
          if (entry.reportTip) lines.push(`- 说明：${entry.reportTip}`);
        });
      } else {
        lines.push('- 院校背景提示：暂无明显提示');
      }
      const reviewText = item.reviewPoints?.length ? item.reviewPoints.slice(0, 4).join(' / ') : (item.flags.length ? item.flags.slice(0, 3).join(' / ') : '招生计划 / 校区 / 学费 / 体检 / 专业备注');
      lines.push(`- 建议再看：${reviewText}`, '');
    });
  }

  lines.push('## 五、本方案确认清单', '');
  appendChecklistLines(lines, reviewChecklist);
  {
    const understandingLines = nonHeadingLines(majorUnderstandingMarkdownLines(displayItems)).filter(Boolean);
    if (understandingLines.length) lines.push('- 专业理解与家庭确认问题：', ...understandingLines, '');
  }
  {
    const strengthLines = nonHeadingLines(localStrengthMarkdownLines(displayItems)).filter(Boolean);
    if (strengthLines.length) lines.push('- 已选专业中的院校背景提示：', ...strengthLines, '');
  }
  appendLocalContextLines(lines, displayItems);
  appendManualReviewLines(lines, displayItems);

  lines.push('## 六、历史对照附录（不参与2026当前分组）', '');
  lines.push('- 下面的2025、2024记录只作同校、同专业、同项目属性的历史对照，不改变前面按2026数据形成的位置分组。');
  if (!displayItems.length) {
    lines.push('- 当前没有可列出的历史对照。', '');
  } else {
    displayItems.forEach(item => {
      lines.push(`- ${item.order}. ${item.school || '学校待核验'} · ${item.major || '专业待核验'}｜${historyText(item)}`);
    });
    lines.push('');
  }

  lines.push('## 七、数据和使用边界', '');
  lines.push('本报告按当前已选清单生成；修改查询筛选不会自动删除已选专业。若已选清单中包含中外/高收费或特殊项目，需按院校章程和 2027 招生计划人工核验。');
  lines.push(...nonHeadingLines(governanceBoundaryLines()).filter(Boolean), '');

  return {
    title,
    markdown: lines.join('\n'),
    recordsCount: items.length,
    reportType,
    orderSignature,
    version: FEISHU_REPORT_CONTRACT.releaseVersion,
    assetVersion: FEISHU_REPORT_CONTRACT.assetVersion,
    release: FEISHU_REPORT_CONTRACT.releaseName,
    summary,
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    rankYear: FEISHU_REPORT_CONTRACT.rankYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
    yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion,
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
      reviewChecklist,
      directionExplorer: input.reportContext?.directionExplorer || input.directionExplorer || null,
      orderSignature
    })
  };
}


// v3.9.6.4 keyword note: 专业/项目/行业关键词包括中外、合作办学、高收费、石油、交通、航天等；AI/报告不得把中外绕过办学费用底线，须提示学费、培养模式、毕业证书、校区、是否必须出国、保研资格与转专业政策。
