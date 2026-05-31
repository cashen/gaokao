import { buildSelectionPoolStyledBlocks } from './feishu-selection-pool-styled-builder.js';
import { buildSelectionPoolSummary } from './selection-pool-summary.js';
import { formatNumber, rankGapText } from './selection-pool-rank-utils.js';

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
  if (['superRush', 'bigRush'].includes(key) || delta >= 16) return { group: 'rush', detail: '高冲', position: '前段少量梦想位' };
  if (['midRush', 'smallRush'].includes(key) || delta >= 4) return { group: 'rush', detail: '小冲', position: '前段冲刺区' };
  if (key === 'match' || (delta >= -5 && delta <= 3)) return { group: 'stable', detail: '边稳', position: '主体承接区' };
  if (key === 'steady' || (delta >= -15 && delta <= -6)) return { group: 'stable', detail: '稳妥', position: '主体偏稳区' };
  if (key === 'guard' || (delta >= -25 && delta <= -16)) return { group: 'safe', detail: '小保', position: '后段保底区' };
  if (key === 'low' || (delta >= -40 && delta <= -26)) return { group: 'safe', detail: '强保', position: '后段强保区' };
  return { group: 'safe', detail: '兜底', position: '兜底确认区' };
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
      poolBand
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
    if (band.detail === '高冲') stats.highRushCount += 1;
    if (band.detail === '兜底') stats.floorCount += 1;
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
  return [...new Set(arr.filter(Boolean))].join(' / ') || '标签待核验';
}

function itemLine(item) {
  const score = Number.isFinite(Number(item.score2025)) ? `${fmt(item.score2025)} 分` : '分数待核验';
  const rank = Number.isFinite(Number(item.rank2025)) ? `${fmt(item.rank2025)} 位` : '位次待核验';
  const band = item.poolBand?.detail || '待判断';
  return `${item.order}. ${item.school}｜${item.major}｜${band}｜2025最低分 ${score}｜2025最低位次 ${rank}`;
}

function itemName(item) {
  if (!item) return '暂无';
  return `${item.school || '学校待核验'}｜${item.major || '专业待核验'}`;
}

function analysisLines(analysis = {}) {
  const lines = [];
  const narrative = analysis.narrative || analysis.aiNarrative || null;
  if (!narrative) return lines;

  lines.push('## AI高报师判断');
  lines.push('');
  if (analysis.source) lines.push(`- 解读来源：${analysis.source === 'workers-ai' ? 'Cloudflare Workers AI' : '规则兜底'}`);
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
      lines.push('### 结构诊断');
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
      lines.push('### 保底底线');
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

  lines.push('## 冲稳保快速复核');
  lines.push('');
  if (analysis.stats?.total) {
    lines.push(`- 冲刺：${fmt(analysis.stats.rushCount)} 个｜稳妥：${fmt(analysis.stats.stableCount)} 个｜保底：${fmt(analysis.stats.safeCount)} 个｜高冲：${fmt(analysis.stats.highRushCount || 0)} 个`);
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
  lines.push(`- 考生：${summary.candidateScore ? fmt(summary.candidateScore) + ' 分' : '分数未填写'}｜${summary.candidateRankLabel || '位次待核验'}｜自选池 ${fmt(summary.totalCount)} 个`);
  if (summary.candidateSameCount != null) lines.push(`- 同分人数：${fmt(summary.candidateSameCount)} 人｜内部计算采用同分末位累计：${fmt(summary.candidateRankForGap)} 位`);
  if (summary.rankZoneName) lines.push(`- 特控线锚点：${fmt(summary.specialControlScore)} 分｜${summary.specialControlRankLabel || '位次待核验'}｜功能区：${summary.rankZoneName}`);
  if (summary.scoreOffsetFromSpecial != null) lines.push(`- 相对特控线：${summary.scoreOffsetFromSpecial >= 0 ? '高出' : '低于'} ${fmt(Math.abs(summary.scoreOffsetFromSpecial))} 分｜位次差 ${summary.rankOffsetFromSpecial == null ? '待核验' : (summary.rankOffsetFromSpecial < 0 ? '优于约 ' + fmt(Math.abs(summary.rankOffsetFromSpecial)) + ' 名' : '落后约 ' + fmt(summary.rankOffsetFromSpecial) + ' 名')}`);
  if (summary.densitySummary) lines.push(`- 附近人数：同分 ${fmt(summary.densitySummary.sameCount)} 人｜上5分 ${fmt(summary.densitySummary.up5Count)} 人｜下5分 ${fmt(summary.densitySummary.down5Count)} 人`);
  lines.push(`- 冲刺区：${fmt(summary.rush.count)} 个｜超冲/高冲 ${fmt(summary.rush.superRushCount || 0)} 个｜小冲 ${fmt(summary.rush.smallRushCount || 0)} 个${summary.rush.maxForwardRankGap != null ? `｜最高向前跨越约 ${fmt(summary.rush.maxForwardRankGap)} 名` : ''}${summary.rush.missingRankCount ? `｜${fmt(summary.rush.missingRankCount)} 个位次待核验` : ''}`);
  lines.push(`- 匹配/稳妥区：${fmt(summary.stable.count)} 个｜向前 ${fmt(summary.stable.forwardCount)} 个｜接近 ${fmt(summary.stable.nearCount)} 个｜向后 ${fmt(summary.stable.backwardCount)} 个${summary.stable.maxForwardRankGap != null ? `｜最高向前跨越约 ${fmt(summary.stable.maxForwardRankGap)} 名` : ''}${summary.stable.maxBackwardRankGap != null ? `｜最大向后回落约 ${fmt(summary.stable.maxBackwardRankGap)} 名` : ''}`);
  lines.push(`- 保底区：${fmt(summary.safe.count)} 个｜较深保底 ${fmt(summary.safe.deepSafeCount || 0)} 个${summary.safe.maxBackwardRankGap != null ? `｜最大向后回落约 ${fmt(summary.safe.maxBackwardRankGap)} 名` : ''}${summary.safe.missingRankCount ? `｜${fmt(summary.safe.missingRankCount)} 个位次待核验` : ''}`);
  if (summary.topForwardItem) lines.push(`- 全池最高向前跨越：${itemName(summary.topForwardItem)}｜${rankGapText(summary.topForwardItem.rankGap)}`);
  if (summary.topBackwardItem) lines.push(`- 全池最大向后回落：${itemName(summary.topBackwardItem)}｜${rankGapText(summary.topBackwardItem.rankGap)}`);
  if (summary.missingRankCount) lines.push(`- 位次缺失提醒：${fmt(summary.missingRankCount)} 个专业暂缺可识别参考位次，概要位次统计基于其余 ${fmt(summary.withRankCount)} 个专业。`);
  lines.push(`- 位次口径：${summary.candidateRankNote}`);
  lines.push(`- 维护口径：${summary.maintenanceNote || '冲稳保标签沿用自选池现有判断，飞书概要只做统计，不重新判定。'}`);
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
    ? `${candidateScore}分｜${displayRankForTitle}｜自选池诊断报告｜辽宁物理类`
    : `${candidateScore}分｜${displayRankForTitle}｜自选池排序清单｜辽宁物理类`;
  const lines = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(hasAnalysis ? '## 辽宁物理类志愿自选池诊断报告' : '## 辽宁物理类志愿自选池排序清单');
  lines.push('');
  lines.push(`- 考生分数：${candidateScore}`);
  lines.push(`- 考生位次：${displayRankForTitle}`);
  lines.push('- 数据口径：辽宁 2025 物理类专业数据，数据来源为 /fenxi 已接入专业池。');
  lines.push('- 使用边界：本报告用于志愿讨论和人工复核，不等同于录取预测。');
  lines.push('- 排序口径：按整理页当前显示的最终顺序写入飞书；每次排序后会重新编号并保存。');
  lines.push('');
  lines.push(...summaryLines(summary));
  lines.push('## 自选池总览');
  lines.push('');
  lines.push(`- 自选池总数：${fmt(stats.total)} 个`);
  lines.push(`- 冲刺：${fmt(stats.rushCount)} 个（${pct(stats.rushCount, stats.total)}%）`);
  lines.push(`- 稳妥：${fmt(stats.stableCount)} 个（${pct(stats.stableCount, stats.total)}%）`);
  lines.push(`- 保底：${fmt(stats.safeCount)} 个（${pct(stats.safeCount, stats.total)}%）`);
  if (stats.highRushCount) lines.push(`- 高冲：${fmt(stats.highRushCount)} 个`);
  if (stats.floorCount) lines.push(`- 兜底：${fmt(stats.floorCount)} 个`);
  lines.push('');

  if (hasAnalysis) lines.push(...analysisLines(input.analysis));

  lines.push('## 当前自选池排序');
  lines.push('');
  const displayItems = summary.enrichedItems?.length === items.length ? summary.enrichedItems : items;
  if (!displayItems.length) {
    lines.push('- 当前自选池为空。');
  } else {
    displayItems.forEach((item) => {
      lines.push(`### ${itemLine(item)}`);
      lines.push('');
      lines.push(`- 适合位置：${item.position || item.poolBand?.position || '待核验'}`);
      lines.push(`- 相对考生：${deltaText(item.scoreDelta)} 分`);
      lines.push(`- 位次跨度：${rankGapText(item.rankGap)}`);
      lines.push(`- 地域/标签：${tagsText(item)}`);
      if (Number.isFinite(Number(item.score2024)) || Number.isFinite(Number(item.rank2024))) {
        lines.push(`- 2024参考：${Number.isFinite(Number(item.score2024)) ? fmt(item.score2024) + ' 分' : '分数待核验'} / ${Number.isFinite(Number(item.rank2024)) ? fmt(item.rank2024) + ' 位' : '位次待核验'}`);
      }
      if (item.flags.length) lines.push(`- 需核验：${item.flags.slice(0, 3).join(' / ')}`);
      lines.push('');
    });
  }

  lines.push('---');
  lines.push('');
  lines.push('## 人工复核清单');
  lines.push('');
  lines.push('- 2026 年一分一段发布后，按当年位次换算 2025 等位分/同位分。');
  lines.push('- 2026 年招生计划、专业备注、选科要求、体检限制。');
  lines.push('- 学费、校区、联合培养、中外合作、专项计划、高收费项目。');
  lines.push('- 家庭预算、城市接受度、专业接受度和未来转专业规则。');
  lines.push('');
  lines.push('## 口径说明');
  lines.push('');
  lines.push('本报告基于辽宁 2025 物理类历史录取数据和 /fenxi 已接入专业池生成，用于形成可讨论专业池与自选池排序诊断，不等同于录取预测。考生位次由辽宁2025物理类一分一段表按考生分数自动取数；展示同分位次区间，位次跨度计算默认采用同分末位累计口径。同分段内部排序未展开。2026一分一段发布后，应按2026考生位次换算到2025等位分/同位分，再与2025专业数据对照。');

  return {
    title,
    markdown: lines.join('\n'),
    recordsCount: items.length,
    reportType,
    orderSignature,
    version: 'v3.9.5.5',
    summary,
    styledBlocks: buildSelectionPoolStyledBlocks({
      title,
      reportType,
      candidateScore,
            items,
      stats,
      summary,
      hasAnalysis,
      analysis: input.analysis || null,
      orderSignature
    })
  };
}
