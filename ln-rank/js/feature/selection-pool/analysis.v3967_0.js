import { classifyPoolItem, getPoolStats, majorFamily } from './store.v3967_0.js?v=3967_0';
import { FEISHU_REPORT_CONTRACT, FEISHU_YEAR_CALIBER } from '../../../../shared/resources/reports/feishu-report-contract.v3964_0.js?v=3964_0';

function topEntry(map = {}) {
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0] || ['', 0];
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function isExplicitlyRejected(item = {}) {
  const values = [item.acceptability?.major, item.acceptability?.city, item.acceptability?.cost, item.acceptability?.campus, item.acceptability?.project];
  return values.includes('rejected');
}

function isUnresolved(item = {}) {
  if (item.bottomLineEligibility === 'unresolved' || item.eligibilityStatus === 'unresolved') return true;
  if (item.schoolNature === 'unknown' || item.feeType === 'unknown') return true;
  return Boolean(item.historicalOnly || item.canonicalPosition?.evidenceStrength === 'weak');
}

export function buildPathAnalysis({ items = [], candidateScore = null, explicitPreferences = {} } = {}) {
  const ordered = (Array.isArray(items) ? items : []).map((item, index) => ({
    ...item,
    order: index + 1,
    poolBand: item.poolBand || classifyPoolItem(item),
    majorFamily: item.majorFamily || majorFamily(item.major)
  }));
  const stats = getPoolStats(ordered);
  const total = stats.total;
  const risks = [];
  const actions = [];
  const sections = [];

  if (!total) {
    return {
      ok: true,
      level: 'empty',
      summary: '还没有选择专业，暂时无法检查这套方案。',
      stats,
      risks: ['当前清单为空。'],
      actions: ['先加入几项孩子愿意继续了解的专业，再检查位置、费用、校区和资格。'],
      sections: [],
      reportText: '还没有选择专业。'
    };
  }

  const rejectedItems = ordered.filter(isExplicitlyRejected);
  const unresolvedItems = ordered.filter(isUnresolved);
  const effectiveItems = ordered.filter(item => !isExplicitlyRejected(item));
  const effectiveStats = getPoolStats(effectiveItems);

  if (rejectedItems.length) {
    risks.push(`有 ${rejectedItems.length} 项已经被家庭明确判定为不能接受，不能继续算作有效承接。`);
    actions.push('先移除或重新确认这些项目，再检查前中后段结构。');
  }
  if (unresolvedItems.length) {
    risks.push(`有 ${unresolvedItems.length} 项的办学性质、费用、历史对应或位置证据仍待确认。`);
    actions.push('优先核对待确认项目；未知不等于公办普通，也不等于可以承担后段承接。');
  }
  if (effectiveStats.stableCount === 0) {
    risks.push('当前没有可识别的主要参考项，中段讨论出现断层。');
    actions.push('补充几项位置更接近、孩子也愿意读的专业作为主体讨论对象。');
  }
  if (effectiveStats.safeCount === 0) {
    risks.push('当前没有可识别且未被拒绝的低分侧补充项。');
    actions.push('补充真正能接受的低分侧项目，并同时核验专业、城市、学费和校区。');
  }
  if (effectiveStats.rushCount > effectiveStats.stableCount + effectiveStats.safeCount) {
    risks.push('稍高目标数量多于主要参考和低分侧补充之和，方案重心偏高。');
    actions.push('保留少量高价值上探，其余用更接近位次且可接受的项目替换。');
  }

  const [topCity, topCityCount] = topEntry(effectiveStats.byCity);
  const cityPreferenceExplicit = Boolean(explicitPreferences.city || explicitPreferences.location || explicitPreferences.localFirst);
  if (!cityPreferenceExplicit && topCity && effectiveItems.length >= 6 && topCityCount >= Math.ceil(effectiveItems.length * 0.55)) {
    risks.push(`城市集中在“${topCity}”，但当前没有记录到明确的地域单选偏好。`);
    actions.push('确认这是家庭真实偏好，还是浏览过程中无意识形成的集中。');
  }

  const [topFamily, topFamilyCount] = topEntry(effectiveStats.byMajorFamily);
  const majorPreferenceExplicit = Boolean(explicitPreferences.major || explicitPreferences.majorFamily || explicitPreferences.mustMajor);
  if (!majorPreferenceExplicit && topFamily && effectiveItems.length >= 6 && topFamilyCount >= Math.ceil(effectiveItems.length * 0.65)) {
    risks.push(`专业方向主要集中在“${topFamily}”，但当前没有记录到明确的单方向偏好。`);
    actions.push('先让孩子确认是否愿意长期学习该方向；明确强偏好时集中可以保留。');
  }

  const rushItems = effectiveItems.filter(x => x.poolBand.group === 'rush');
  const stableItems = effectiveItems.filter(x => x.poolBand.group === 'stable');
  const safeItems = effectiveItems.filter(x => x.poolBand.group === 'safe');

  sections.push({
    title: '前段稍高目标',
    content: rushItems.length
      ? `当前有 ${rushItems.length} 项。它们可以放在前段讨论，但不能替代主要参考和后段承接。`
      : '当前没有明显稍高目标项；是否增加应由孩子和家庭的真实取舍决定，不是必填比例。'
  });
  sections.push({
    title: '中段主要参考',
    content: stableItems.length
      ? `当前有 ${stableItems.length} 项，是这套方案最需要逐条确认专业接受度的部分。`
      : '当前缺少主要参考项，需要先补齐真实可讨论的主体。'
  });
  sections.push({
    title: '后段低分侧补充',
    content: safeItems.length
      ? `当前有 ${safeItems.length} 项。只有学校、专业、城市、费用和项目条件都能接受时，才算有效承接。`
      : '当前没有有效低分侧补充项；不能用完全不想读的专业制造表面安全感。'
  });

  const level = rejectedItems.length || effectiveStats.safeCount === 0 || effectiveStats.stableCount === 0
    ? 'high'
    : unresolvedItems.length || risks.length >= 2
      ? 'medium'
      : 'low';
  const summary = level === 'high'
    ? '当前清单存在真实承接缺口或明确不可接受项目，建议先修正再生成报告。'
    : level === 'medium'
      ? '当前清单已有基本结构，但仍有关键事实或家庭接受度需要确认。'
      : '当前未发现明显结构断层，可以继续逐条人工复核并生成家庭报告。';

  if (!risks.length) risks.push('暂未发现明显结构性问题，但仍需核验2027招生计划、选科、体检、学费、校区和院校章程。');
  if (!actions.length) actions.push('保持当前顺序，逐条确认孩子是否愿意读、家庭是否能承担、关键条件是否已核实。');

  const reportText = makeReportText({ candidateScore, stats, effectiveStats, summary, risks, actions, sections, ordered });

  return {
    ok: true,
    level,
    summary,
    stats: { ...stats, effectiveTotal: effectiveItems.length, unresolvedCount: unresolvedItems.length, rejectedCount: rejectedItems.length },
    risks,
    actions,
    sections,
    orderedItems: ordered,
    reportText,
    generatedAt: new Date().toISOString(),
    dataYear: FEISHU_REPORT_CONTRACT.dataYear,
    rankYear: FEISHU_REPORT_CONTRACT.rankYear,
    audienceYear: FEISHU_REPORT_CONTRACT.audienceYear,
    yearCaliberVersion: FEISHU_REPORT_CONTRACT.yearCaliberVersion,
    algorithmVersion: 'algorithm-orchestration-v3963'
  };
}

function makeReportText({ candidateScore, stats, effectiveStats, summary, risks, actions, sections, ordered }) {
  const lines = [];
  lines.push('辽宁物理类专业初选报告生成前提醒');
  lines.push('');
  lines.push(`参考分数：${candidateScore || '未填写'}`);
  lines.push(`数据口径：${FEISHU_YEAR_CALIBER.primaryFact}；${FEISHU_YEAR_CALIBER.historicalBoundary}`);
  lines.push('');
  lines.push(`已选专业总数：${stats.total} 个`);
  lines.push(`当前可继续讨论：${effectiveStats.total} 个`);
  lines.push(`稍高目标：${effectiveStats.rushCount} 个（${pct(effectiveStats.rushCount, effectiveStats.total)}%）`);
  lines.push(`主要参考：${effectiveStats.stableCount} 个（${pct(effectiveStats.stableCount, effectiveStats.total)}%）`);
  lines.push(`低分侧补充：${effectiveStats.safeCount} 个（${pct(effectiveStats.safeCount, effectiveStats.total)}%）`);
  lines.push('');
  lines.push(`整体判断：${summary}`);
  lines.push('');
  for (const section of sections) lines.push(`${section.title}：${section.content}`);
  lines.push('');
  lines.push('主要提醒：');
  risks.forEach((risk, index) => lines.push(`${index + 1}. ${risk}`));
  lines.push('');
  lines.push('下一步：');
  actions.forEach((action, index) => lines.push(`${index + 1}. ${action}`));
  lines.push('');
  lines.push('当前排序：');
  ordered.slice(0, 112).forEach((item) => {
    const score = Number.isFinite(Number(item.score2026)) ? `${item.score2026}分` : '2026分数待核验';
    const rank = Number.isFinite(Number(item.rank2026)) ? `最低投档位置约${Number(item.rank2026).toLocaleString('zh-CN')}` : '2026位次待核验';
    lines.push(`${item.order}. ${item.school} · ${item.major}｜${item.poolBand.detail}｜${score}｜${rank}`);
  });
  lines.push('');
  lines.push(`正式填报前复核：${FEISHU_YEAR_CALIBER.unpublishedBoundary}`);
  return lines.join('\n');
}
