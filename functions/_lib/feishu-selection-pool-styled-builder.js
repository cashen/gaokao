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
  return `相对考生 ${n > 0 ? '+' : ''}${n} 分`;
}

function scoreRankText(item) {
  const score = Number.isFinite(Number(item.score2025)) ? `${fmt(item.score2025)} 分` : '分数待核验';
  const rank = Number.isFinite(Number(item.rank2025)) ? `${fmt(item.rank2025)} 位` : '位次待核验';
  return `2025最低 ${score} / ${rank}`;
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
  if (Array.isArray(item.schoolTags)) tags.push(...item.schoolTags.slice(0, 3));
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
    { content: '匹配/主要承接拆分：', style: STYLE.stable },
    { content: `向前 ${formatNumber(stable.forwardCount || 0)} 个`, style: STYLE.rankForward },
    { content: `｜接近 ${formatNumber(stable.nearCount || 0)} 个`, style: STYLE.rankNear },
    { content: `｜向后 ${formatNumber(stable.backwardCount || 0)} 个`, style: STYLE.rankBackward }
  ];
}

function itemRuns(item) {
  const band = item.poolBand || {};
  const bandLabel = band.detail || item.statusLabel || '待判断';
  const bandStyle = styleForBand(band);
  const deltaStyle = styleForDelta(item.scoreDelta);
  const rankStyle = styleForRankGap(item.rankGap);
  const tags = shortTags(item);
  return [
    { content: `第 ${item.order} 位｜`, style: STYLE.muted },
    { content: `${item.school || '学校待核验'} · ${item.major || '专业待核验'}`, style: STYLE.strong },
    { content: `｜${standardMajorText(item)}`, style: STYLE.muted },
    { content: '｜' },
    { content: bandLabel, style: bandStyle },
    { content: '｜' },
    { content: deltaText(item.scoreDelta), style: deltaStyle },
    { content: '｜' },
    { content: rankGapText(item.rankGap), style: rankStyle },
    { content: `｜${scoreRankText(item)}` },
    tags ? { content: `｜${tags}`, style: STYLE.muted } : null
  ].filter(Boolean);
}

function analysisBlocks(analysis = {}) {
  const blocks = [];
  if (!analysis || typeof analysis !== 'object') return blocks;
  blocks.push(heading2('二、检查当前排序', STYLE.action));
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
    if (ai.structureDiagnosis) blocks.push(bulletRunsBlock([{ content: '自选专业结构：', style: STYLE.strong }, { content: clean(ai.structureDiagnosis, 700) }]));
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
    blocks.push(heading3('主要风险', STYLE.risk));
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
    { content: '｜自选专业 ' },
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
  blocks.push(bulletRunsBlock(groupSummaryRuns('前段尝试', summary.rush || {}, STYLE.rush)));
  blocks.push(bulletRunsBlock(groupSummaryRuns('匹配/主要承接', summary.stable || {}, STYLE.stable)));
  blocks.push(bulletRunsBlock(matchDetailRuns(summary)));
  blocks.push(bulletRunsBlock(groupSummaryRuns('后段补充', summary.safe || {}, STYLE.safe)));
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
  blocks.push(styledTextBlock(summary.maintenanceNote || '前中后段标签沿用自选专业现有判断，报告概要只做统计，不重新判定。', STYLE.muted));
  return blocks;
}

function majorTrendBlocks(summary = {}) {
  const notes = Array.isArray(summary.notes) ? summary.notes : [];
  if (!notes.length) return [];
  const blocks = [heading2('专业热度变化参考', STYLE.title)];
  notes.slice(0, 3).forEach(note => blocks.push(bulletBlock(clean(note, 240))));
  blocks.push(styledTextBlock('以上只反映 2024/2025 两年同校同专业录取位次变化，不代表 2026 年录取结果。', STYLE.warning));
  return blocks;
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
    majorTrendSummary = null
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
  blocks.push(styledTextBlock('颜色只用于辅助阅读，不代表录取承诺。正式填报仍需结合 2026 年当年位次、招生计划、选科、体检、学费、校区和专业备注逐条复核。', STYLE.warning));

  blocks.push(...summaryBlocks(summary || {}, reportType));
  blocks.push(dividerBlock());

  blocks.push(heading2(hasAnalysis ? '三、自选专业总览' : '二、自选专业总览', STYLE.title));
  blocks.push(bulletRunsBlock([
    { content: '排序口径：', style: STYLE.strong },
    { content: '按整理页当前显示的最终顺序写入报告；每次排序后会重新编号并保存。' }
  ]));
  blocks.push(bulletRunsBlock([
    { content: '数据口径：', style: STYLE.strong },
    { content: '辽宁 2025 物理类专业数据；正式填报以当年一分一段、招生计划和志愿系统为准。' }
  ]));
  blocks.push(statsBullet('前段尝试', groups.rush.length || stats.rushCount || 0, total, STYLE.rush));
  blocks.push(statsBullet('匹配 / 主要承接', groups.stable.length || stats.stableCount || 0, total, STYLE.stable));
  blocks.push(statsBullet('后段补充', groups.safe.length || stats.safeCount || 0, total, STYLE.safe));
  if (stats.highRushCount) blocks.push(bulletRunsBlock([{ content: `高一点：${fmt(stats.highRushCount)} 个，建议控制数量。`, style: STYLE.risk }]));
  if (stats.floorCount) blocks.push(bulletRunsBlock([{ content: `最后兜底：${fmt(stats.floorCount)} 个，请确认专业和城市是否真的接受。`, style: STYLE.floor }]));

  blocks.push(dividerBlock());

  if (hasAnalysis) {
    blocks.push(...analysisBlocks(analysis));
    blocks.push(dividerBlock());
  }
  const trendBlocks = majorTrendBlocks(majorTrendSummary || analysis?.majorTrendSummary || {});
  if (trendBlocks.length) {
    blocks.push(...trendBlocks);
    blocks.push(dividerBlock());
  }

  blocks.push(heading2(hasAnalysis ? '四、前中后段快速复核' : '三、前中后段快速复核', STYLE.title));
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
  blocks.push(heading2(hasAnalysis ? '五、最终排序清单' : '四、最终排序清单', STYLE.title));
  blocks.push(styledTextBlock('以下按当前页面最终顺序排列，标签、相对分差和位次跨越会使用不同颜色提醒。', STYLE.muted));
  if (!displayItems.length) {
    blocks.push(bulletBlock('当前自选专业为空。'));
  } else {
    displayItems.forEach(item => blocks.push(orderedRunsBlock(itemRuns(item))));
  }

  blocks.push(dividerBlock());
  blocks.push(heading2(hasAnalysis ? '六、人工复核清单' : '五、人工复核清单', STYLE.title));
  [
    '2026 年一分一段发布后，按当年位次换算 2025 等位分/同位分。',
    '2026 年招生计划、专业备注、选科要求、体检限制。',
    '学费、校区、联合培养、中外合作、专项计划、高收费项目。',
    '家庭预算、城市接受度、专业接受度和未来转专业规则。'
  ].forEach(line => blocks.push(bulletBlock(line)));
  blocks.push(heading2(hasAnalysis ? '七、口径说明' : '六、口径说明', STYLE.title));
  blocks.push(styledTextBlock('本报告基于辽宁 2025 物理类历史录取数据和已接入专业数据生成，用于形成可讨论专业范围与自选专业排序建议，不等同于录取预测。考生位次由辽宁2025物理类一分一段表按考生分数自动取数；展示同分位次区间，位次跨度计算默认采用同分末位累计口径。同分段内部排序未展开。2026一分一段发布后，应按2026考生位次换算到2025等位分/同位分，再与2025专业数据对照。', STYLE.muted));

  return blocks.slice(0, 190);
}
