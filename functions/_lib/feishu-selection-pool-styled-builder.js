import {
  bulletBlock,
  bulletRunsBlock,
  dividerBlock,
  heading1,
  heading2,
  heading3,
  orderedRunsBlock,
  styledTextBlock,
  textRunsBlock
} from './feishu-block-builder.js';
import { groupMeta, STYLE, styleForBand, styleForDelta, styleForRankGap } from './feishu-selection-style-map.js';
import { formatNumber, itemShortName, rankGapText } from './selection-pool-rank-utils.js';
import { YEAR_CALIBER_KB } from './kb/year-caliber-kb.generated.js';
import { formatLiaoningOrdinaryUndergraduatePolicyLine } from './kb/liaoning-policy-accessor.js';
import { buildCareerAndExamReviewHints } from './kb/report-review-hints.js';
import { ADMISSION_CHARTER_CHECK_KB } from './kb/admission-charter-check-kb.generated.js';
import { buildReviewPointsForItems } from './kb/review-point-builder.js';
import { getCampusForItem, getCampusReviewSummaryForItems, formatCampusReviewLine } from './kb/campus-accessor.js';
import { buildSelectionReviewChecklist } from './kb/review-checklist-builder.js';
import { formatHistoricalEvidenceText } from '../../shared/resources/exam/historical-score-rank-contract.js';

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function clean(value, max = 800) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function pct(part, total) {
  return total ? Math.round(part / total * 100) : 0;
}

function deltaText(delta) {
  const n = Number(delta);
  if (!Number.isFinite(n)) return '分差待核验';
  return `相对参考分数 ${n > 0 ? '+' : ''}${n} 分`;
}

function scoreRankText(item) {
  const score = Number.isFinite(Number(item.score2026 ?? item.score)) ? `${fmt(item.score2026 ?? item.score)} 分` : '分数待核验';
  const rank = Number.isFinite(Number(item.rank2026 ?? item.rank)) ? `${fmt(item.rank2026 ?? item.rank)} 位` : '位次待核验';
  return `2026投档最低 ${score} / 对应累计位次约 ${rank}`;
}

function standardMajorText(item = {}) {
  const sm = item.standardMajor || {};
  if (sm.code && sm.name && ['exact', 'alias'].includes(sm.mappingStatus || 'exact')) return `专业代码：${sm.code}｜${sm.name}`;
  if (sm.categoryCode && sm.categoryName && sm.mappingStatus === 'category') return `专业类：${sm.categoryCode}｜${sm.categoryName}`;
  return '专业代码：—';
}

function shortTags(item) {
  const tags = [];
  if (item.displayLocation) tags.push(item.displayLocation);
  if (item.natureLabel) tags.push(item.natureLabel);
  if (item.localStrongChain?.matched) tags.push(item.localStrongChain.chainName);
  if (Array.isArray(item.schoolTags)) tags.push(...item.schoolTags.slice(0, 3));
  const campusReview = getCampusForItem(item);
  if (campusReview?.displayTag) tags.push(campusReview.displayTag);
  return [...new Set(tags.filter(Boolean))].join(' / ');
}

function groupCounts(items = []) {
  const groups = { rush: [], stable: [], safe: [] };
  items.forEach(item => {
    const group = item.poolBand?.group || 'safe';
    if (group === 'rush') groups.rush.push(item);
    else if (group === 'stable') groups.stable.push(item);
    else groups.safe.push(item);
  });
  return groups;
}

function statsBullet(label, count, total, style) {
  return bulletRunsBlock([
    { content: `${label}：`, style },
    { content: `${fmt(count)} 个（${pct(count, total)}%）`, style: STYLE.strong }
  ]);
}

function groupSummaryRuns(label, group, style) {
  const runs = [
    { content: `${label}：`, style },
    { content: `${formatNumber(group.count)} 个`, style: STYLE.strong }
  ];
  if (group.maxForwardRankGap != null) {
    runs.push({ content: '｜最高向前跨越 ' });
    runs.push({ content: `约 ${formatNumber(group.maxForwardRankGap)} 名`, style: STYLE.rankForward });
  }
  if (group.maxBackwardRankGap != null) {
    runs.push({ content: '｜最大向后回落 ' });
    runs.push({ content: `约 ${formatNumber(group.maxBackwardRankGap)} 名`, style: STYLE.rankBackward });
  }
  if (group.missingRankCount) {
    runs.push({ content: `｜${formatNumber(group.missingRankCount)} 个位次待核验`, style: STYLE.rankMissing });
  }
  return runs;
}

function matchDetailRuns(summary = {}) {
  const stable = summary.stable || {};
  return [
    { content: '匹配/主要参考拆分：', style: STYLE.stable },
    { content: `向前 ${formatNumber(stable.forwardCount || 0)} 个`, style: STYLE.rankForward },
    { content: `｜接近 ${formatNumber(stable.nearCount || 0)} 个`, style: STYLE.rankNear },
    { content: `｜向后 ${formatNumber(stable.backwardCount || 0)} 个`, style: STYLE.rankBackward }
  ];
}


function historyScoreText(item = {}) {
  return formatHistoricalEvidenceText(item, { years: [2025, 2024], prefix: false, empty: '历史同口径参考：暂无' });
}

function itemRuns(item) {
  const band = item.poolBand || {};
  const bandLabel = band.detail || item.statusLabel || '待判断';
  const bandStyle = styleForBand(band);
  const deltaStyle = styleForDelta(item.scoreDelta2026 ?? item.scoreDelta);
  const rankStyle = styleForRankGap(item.rankGap2026 ?? item.rankGap);
  const tags = shortTags(item);
  const special = item.specialProject?.hasSpecialProject ? `特殊项目：${item.specialProject.labelText || item.specialProject.primaryLabel || '需资格核验'}` : '';
  return [
    { content: `第 ${item.order} 位｜`, style: STYLE.muted },
    { content: `${item.school || '学校待核验'} · ${item.major || '专业待核验'}`, style: STYLE.strong },
    { content: `｜${standardMajorText(item)}`, style: STYLE.muted },
    { content: '｜' },
    { content: bandLabel, style: bandStyle },
    { content: '｜' },
    { content: deltaText(item.scoreDelta2026 ?? item.scoreDelta), style: deltaStyle },
    { content: '｜' },
    { content: rankGapText(item.rankGap2026 ?? item.rankGap), style: rankStyle },
    { content: `｜${scoreRankText(item)}` },
    tags ? { content: `｜${tags}`, style: STYLE.muted } : null,
    special ? { content: `｜${special}`, style: STYLE.risk } : null,
    item.localStrongChain?.matched ? { content: `｜院校背景：${clean(item.localStrongChain.depth === 'core' ? '本校方向' : '本校相关', 40)} · ${clean(item.localStrongChain.chainName, 40)}`, style: STYLE.action } : (item.trajectoryChain?.matched ? { content: `｜方向提醒：${clean(item.trajectoryChain.cardShort || item.trajectoryChain.trajectoryName, 40)}`, style: STYLE.action } : null),
    Array.isArray(item.reviewPoints) && item.reviewPoints.length ? { content: `｜建议再看：${clean(item.reviewPoints[0], 120)}`, style: STYLE.risk } : null
  ].filter(Boolean);
}

function analysisBlocks(analysis = {}) {
  const blocks = [];
  if (!analysis || typeof analysis !== 'object') return blocks;
  blocks.push(heading3('检查当前排序', STYLE.action));
  if (analysis.summary) {
    blocks.push(bulletRunsBlock([
      { content: '整体判断：', style: STYLE.strong },
      { content: clean(analysis.summary, 800) }
    ]));
  }
  const ai = analysis.aiNarrative && typeof analysis.aiNarrative === 'object' ? analysis.aiNarrative : null;
  if (ai) {
    blocks.push(heading3('方案解读', STYLE.action));
    if (ai.overall) blocks.push(styledTextBlock(clean(ai.overall, 900), STYLE.strong));
    if (ai.zoneJudgement || ai.rankZoneExplain) blocks.push(bulletRunsBlock([{ content: '位次定位：', style: STYLE.strong }, { content: clean(ai.zoneJudgement || ai.rankZoneExplain, 700) }]));
    if (ai.structureDiagnosis) blocks.push(bulletRunsBlock([{ content: '已选专业结构：', style: STYLE.strong }, { content: clean(ai.structureDiagnosis, 700) }]));
    if (ai.majorPathDiagnosis) blocks.push(bulletRunsBlock([{ content: '专业路径：', style: STYLE.strong }, { content: clean(ai.majorPathDiagnosis, 700) }]));
    if (ai.pushRateDiagnosis) blocks.push(bulletRunsBlock([{ content: '升学与推免参考：', style: STYLE.strong }, { content: clean(ai.pushRateDiagnosis, 700) }]));
    if (ai.bottomLineDiagnosis || ai.bottomLineRisk) blocks.push(bulletRunsBlock([{ content: '后段底线：', style: STYLE.strong }, { content: clean(ai.bottomLineDiagnosis || ai.bottomLineRisk, 700) }]));
    if (Array.isArray(ai.actions) && ai.actions.length) {
      ai.actions.slice(0, 6).forEach(action => blocks.push(bulletRunsBlock([{ content: clean(action, 500), style: STYLE.action }])));
    }
  }
  if (Array.isArray(analysis.sections) && analysis.sections.length) {
    analysis.sections.slice(0, 6).forEach(section => {
      blocks.push(heading3(clean(section.title, 80), STYLE.strong));
      blocks.push(styledTextBlock(clean(section.content, 1200), STYLE.muted));
    });
  }
  if (Array.isArray(analysis.risks) && analysis.risks.length) {
    blocks.push(heading3('主要需要关注', STYLE.risk));
    analysis.risks.slice(0, 10).forEach(risk => blocks.push(bulletRunsBlock([
      { content: clean(risk, 500), style: STYLE.risk }
    ])));
  }
  if (Array.isArray(analysis.actions) && analysis.actions.length) {
    blocks.push(heading3('调整建议', STYLE.action));
    analysis.actions.slice(0, 10).forEach(action => blocks.push(bulletRunsBlock([
      { content: clean(action, 500), style: STYLE.action }
    ])));
  }
  return blocks;
}

function summaryBlocks(summary = {}, reportType = 'selectionPoolOnly') {
  const blocks = [];
  const scoreText = summary.candidateScore ? `${formatNumber(summary.candidateScore)} 分` : '分数未填写';
  const rankText = summary.candidateRankLabel || '位次待核验';
  blocks.push(heading2('一、概要判断', STYLE.title));
  blocks.push(textRunsBlock([
    { content: '考生：', style: STYLE.strong },
    { content: `${scoreText}｜${rankText}`, style: STYLE.strong },
    { content: '｜已选专业 ' },
    { content: `${formatNumber(summary.totalCount || 0)} 个`, style: STYLE.strong },
    { content: '｜报告类型：' },
    { content: reportType === 'selectionPoolWithAnalysis' ? '带解读的报告' : '当前排序清单', style: STYLE.action }
  ]));
  if (summary.candidateSameCount != null) {
    blocks.push(bulletRunsBlock([
      { content: '同分口径：', style: STYLE.strong },
      { content: `同分人数 ${formatNumber(summary.candidateSameCount)} 人｜内部计算采用同分末位累计 ${formatNumber(summary.candidateRankForGap)} 位。`, style: STYLE.muted }
    ]));
  }
  if (summary.rankZoneName) {
    blocks.push(bulletRunsBlock([
      { content: '特控线锚点：', style: STYLE.strong },
      { content: `${formatNumber(summary.specialControlScore)} 分｜${summary.specialControlRankLabel || '位次待核验'}｜${summary.rankZoneName}`, style: STYLE.action }
    ]));
  }
  if (summary.densitySummary) {
    blocks.push(bulletRunsBlock([
      { content: '附近人数：', style: STYLE.strong },
      { content: `同分 ${formatNumber(summary.densitySummary.sameCount)} 人｜上5分 ${formatNumber(summary.densitySummary.up5Count)} 人｜下5分 ${formatNumber(summary.densitySummary.down5Count)} 人`, style: STYLE.muted }
    ]));
  }
  blocks.push(bulletRunsBlock(groupSummaryRuns('稍高目标', summary.rush || {}, STYLE.rush)));
  blocks.push(bulletRunsBlock(groupSummaryRuns('匹配/主要参考', summary.stable || {}, STYLE.stable)));
  blocks.push(bulletRunsBlock(matchDetailRuns(summary)));
  blocks.push(bulletRunsBlock(groupSummaryRuns('低分侧补充', summary.safe || {}, STYLE.safe)));
  if (summary.topForwardItem) {
    blocks.push(bulletRunsBlock([
      { content: '全池最高向前跨越：', style: STYLE.rankForward },
      { content: `${itemShortName(summary.topForwardItem)}｜${rankGapText(summary.topForwardItem.rankGap)}` }
    ]));
  }
  if (summary.topBackwardItem) {
    blocks.push(bulletRunsBlock([
      { content: '全池最大向后回落：', style: STYLE.rankBackward },
      { content: `${itemShortName(summary.topBackwardItem)}｜${rankGapText(summary.topBackwardItem.rankGap)}` }
    ]));
  }
  if (summary.missingRankCount) {
    blocks.push(bulletRunsBlock([
      { content: '位次缺失提醒：', style: STYLE.rankMissing },
      { content: `${formatNumber(summary.missingRankCount)} 个专业暂缺可识别参考位次，位次跨度只基于其余 ${formatNumber(summary.withRankCount || 0)} 个专业统计。` }
    ]));
  }
  blocks.push(styledTextBlock(summary.candidateRankNote || '位次口径待核验。', summary.candidateRankSource === 'scoreRankTable' ? STYLE.muted : STYLE.warning));
  blocks.push(styledTextBlock(summary.maintenanceNote || '前中后段标签沿用已选专业现有判断，报告概要只做统计，不重新判定。', STYLE.muted));
  return blocks;
}

function majorTrendBlocks(summary = {}) {
  summary = summary && typeof summary === 'object' ? summary : {};
  const notes = Array.isArray(summary.notes) ? summary.notes : [];
  if (!notes.length) return [];
  const blocks = [heading3('近三年投档位置变化参考', STYLE.title)];
  notes.slice(0, 3).forEach(note => blocks.push(bulletBlock(clean(note, 240).replace(/录取所需位次/g, '历史投档位次').replace(/录取位置/g, '历史投档位置'))));
  blocks.push(styledTextBlock('以上只反映 2024—2026 同校、同专业、同项目属性的历史投档位置变化，不代表 2027 年录取结果。', STYLE.warning));
  return blocks;
}


function reviewChecklistBlocks(items = [], checklist = null) {
  const ck = checklist || buildSelectionReviewChecklist(items);
  const categories = Array.isArray(ck.categories) ? ck.categories : [];
  const blocks = [heading3('确认清单', STYLE.title)];
  if (!categories.length) {
    blocks.push(bulletBlock('暂未汇总出明显确认事项；正式填报仍需核验 2027 招生计划和招生章程。'));
    return blocks;
  }
  blocks.push(styledTextBlock(ck.summary?.headline || `本方案有 ${categories.length} 类事项建议人工确认。`, STYLE.warning));
  categories.slice(0, 7).forEach(cat => {
    blocks.push(heading3(`${cat.title}（${cat.count} 条）`, cat.level === 'high' ? STYLE.risk : STYLE.strong));
    cat.items.slice(0, 4).forEach(item => blocks.push(bulletRunsBlock([
      { content: `${item.school}｜${item.major}：`, style: STYLE.strong },
      { content: `${item.reason} 建议：${item.action}` }
    ])));
  });
  return blocks;
}


function directionExplorerBlocks(direction = null) {
  if (!direction || (!direction.focus?.length && !direction.explore?.length && !direction.confirm?.length)) return [];
  const blocks = [heading3('孩子方向参考', STYLE.title)];
  blocks.push(styledTextBlock('这部分不是给孩子定专业，只是帮助家里讨论哪些方向更值得看，哪些只是没接触过，哪些地方需要再确认。', STYLE.muted));
  if (Array.isArray(direction.focus) && direction.focus.length) blocks.push(bulletRunsBlock([{ content: '更值得重点讨论：', style: STYLE.strong }, { content: direction.focus.slice(0, 8).map(x => clean(x, 80)).join('、') }]));
  if (Array.isArray(direction.explore) && direction.explore.length) blocks.push(bulletRunsBlock([{ content: '可以先了解：', style: STYLE.strong }, { content: `${direction.explore.slice(0, 8).map(x => clean(x, 80)).join('、')}。孩子接触不多的方向，不建议因为“没感觉”就直接排除。` }]));
  if (Array.isArray(direction.confirm) && direction.confirm.length) direction.confirm.slice(0, 5).forEach(x => blocks.push(bulletBlock(`需要再确认：${clean(x, 180)}`)));
  return blocks;
}

function governanceReviewBlocks(items = []) {
  const blocks = [];
  const review = [];
  const campusReviews = getCampusReviewSummaryForItems(items, { limit: 4 });
  if (campusReviews.length) review.push(`校区确认：${campusReviews.map(formatCampusReviewLine).join('；')}`);
  const hasMedical = items.some(x => /临床|口腔|中医|中西医/.test(`${x.major || ''}`) && !/护理|药学|检验|影像技术|康复/.test(`${x.major || ''}`));
  const hasLaw = items.some(x => /法学/.test(`${x.major || ''}`));
  const hasTeacher = items.some(x => /师范|教育/.test(`${x.major || ''}`));
  const hasExamSensitive = items.some(x => /医学|药学|生物|食品|农学|园艺|动物医学|交通运输|油气储运/.test(`${x.major || ''}`));
  review.push(`招生章程：${(ADMISSION_CHARTER_CHECK_KB?.generalCheckItems || []).slice(0, 8).join('、')}。`);
  review.push(...buildCareerAndExamReviewHints(items, { limit: 4 }));
  review.push(...buildReviewPointsForItems(items, { limit: 5 }));
  blocks.push(heading3('人工核验事项', STYLE.title));
  [...new Set(review)].slice(0, 6).forEach(line => blocks.push(bulletBlock(clean(line, 260))));
  return blocks;
}

function historyAppendixBlocks(items = [], trendSummary = {}) {
  const blocks = [
    heading2('六、历史对照附录（不参与2026当前分组）', STYLE.title),
    styledTextBlock('2025、2024只作同校、同专业、同项目属性的历史对照，不改变前面按2026数据形成的位置分组。', STYLE.warning)
  ];
  if (!items.length) {
    blocks.push(bulletBlock('当前没有可列出的历史对照。'));
  } else {
    items.forEach(item => blocks.push(bulletBlock(`${item.order}. ${item.school || '学校待核验'} · ${item.major || '专业待核验'}｜${historyScoreText(item)}`)));
  }
  const trend = majorTrendBlocks(trendSummary);
  if (trend.length) blocks.push(...trend);
  return blocks;
}

function governanceBoundaryBlocks() {
  return [
    heading2('七、数据和使用边界', STYLE.title),
    bulletBlock('本报告按当前已选清单生成；修改查询筛选不会自动删除已选专业。若已选清单中包含中外/高收费或特殊项目，需按院校章程和 2027 招生计划人工核验。'),
    bulletBlock(YEAR_CALIBER_KB.reportCopy),
    bulletBlock(formatLiaoningOrdinaryUndergraduatePolicyLine()),
    bulletBlock('近三年投档位置变化只反映 2024—2026 同校、同专业、同项目属性的历史记录，不代表 2027 年录取结果。'),
    bulletBlock('招生章程中的学费、校区、培养模式、体检限制、转专业和毕业证/学位证口径必须人工确认。')
  ];
}

export function buildSelectionPoolStyledBlocks(input = {}) {
  const {
    title,
    candidateScore,
    items = [],
    stats = {},
    hasAnalysis = false,
    analysis = null,
    reportType = 'selectionPoolOnly',
    summary = null,
    majorTrendSummary = null,
    reviewChecklist = null,
    directionExplorer = null
  } = input;
  const blocks = [];
  const total = Number(stats.total) || items.length || 0;
  const groups = groupCounts(items);
  const displayItems = summary?.enrichedItems?.length === items.length ? summary.enrichedItems : items;

  blocks.push(heading1(title, STYLE.title));
  blocks.push(textRunsBlock([
    { content: '考生分数：', style: STYLE.strong },
    { content: String(candidateScore || '未填写'), style: STYLE.strong },
    { content: summary?.candidateRankLabel ? `｜考生位次：${summary.candidateRankLabel}` : '｜考生位次：位次待核验', style: summary?.candidateRankSource === 'scoreRankTable' ? STYLE.strong : STYLE.rankMissing }
  ]));
  blocks.push(styledTextBlock('颜色只用于辅助阅读，不代表录取承诺。正式填报仍需结合 2027 年正式位次、招生计划、选科、体检、学费、校区和专业备注逐条确认。', STYLE.warning));

  // 固定七段合同：是否生成方案解读都不能改变二级标题顺序。
  blocks.push(...summaryBlocks(summary || {}, reportType));
  blocks.push(dividerBlock());

  blocks.push(heading2('二、当前方案怎么看', STYLE.title));
  blocks.push(bulletRunsBlock([
    { content: '排序口径：', style: STYLE.strong },
    { content: '按整理页当前显示的最终顺序写入报告；每次排序后会重新编号并保存。' }
  ]));
  blocks.push(bulletRunsBlock([
    { content: '数据口径：', style: STYLE.strong },
    { content: `${YEAR_CALIBER_KB.pageCopy}正式填报以当年一分一段、招生计划和志愿系统为准。` }
  ]));
  blocks.push(statsBullet('稍高目标', groups.rush.length || stats.rushCount || 0, total, STYLE.rush));
  blocks.push(statsBullet('匹配 / 主要参考', groups.stable.length || stats.stableCount || 0, total, STYLE.stable));
  blocks.push(statsBullet('低分侧补充', groups.safe.length || stats.safeCount || 0, total, STYLE.safe));
  if (stats.highRushCount) blocks.push(bulletRunsBlock([{ content: `稍高目标：${fmt(stats.highRushCount)} 个，建议控制数量。`, style: STYLE.risk }]));
  if (stats.floorCount) blocks.push(bulletRunsBlock([{ content: `低分侧补充：${fmt(stats.floorCount)} 个，请确认专业和城市是否真的接受。`, style: STYLE.floor }]));
  const directionBlocks = directionExplorerBlocks(directionExplorer);
  if (directionBlocks.length) blocks.push(...directionBlocks);
  if (hasAnalysis) blocks.push(...analysisBlocks(analysis));
  blocks.push(dividerBlock());
  blocks.push(heading2('三、前中后段快速确认', STYLE.title));
  ['rush', 'stable', 'safe'].forEach(group => {
    const meta = groupMeta(group);
    const list = groups[group] || [];
    blocks.push(heading3(meta.title, meta.style));
    blocks.push(styledTextBlock(meta.note, STYLE.muted));
    const sample = list.slice(0, 12).map(item => `第${item.order}位`).join('、') || '暂无';
    blocks.push(bulletRunsBlock([
      { content: `数量：${fmt(list.length)} 个｜涉及顺序：`, style: meta.style },
      { content: sample }
    ]));
  });

  blocks.push(dividerBlock());
  blocks.push(heading2('四、最终排序清单', STYLE.title));
  blocks.push(styledTextBlock('以下按当前页面最终顺序排列，标签、相对分差和位次跨越会使用不同颜色提醒。', STYLE.muted));
  if (!displayItems.length) {
    blocks.push(bulletBlock('当前已选专业为空。'));
  } else {
    displayItems.forEach(item => blocks.push(orderedRunsBlock(itemRuns(item))));
  }

  blocks.push(dividerBlock());
  blocks.push(heading2('五、本方案确认清单', STYLE.title));
  blocks.push(...reviewChecklistBlocks(displayItems, reviewChecklist));
  blocks.push(...governanceReviewBlocks(displayItems));

  blocks.push(dividerBlock());
  blocks.push(...historyAppendixBlocks(displayItems, majorTrendSummary || analysis?.majorTrendSummary || {}));

  blocks.push(dividerBlock());
  blocks.push(...governanceBoundaryBlocks());

  return blocks.slice(0, 190);
}
