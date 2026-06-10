import { classifyPoolItem, getPoolStats, majorFamily } from './store.js?v=3921_1';

function topEntry(map = {}) {
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0] || ['', 0];
}

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function buildPathAnalysis({ items = [], candidateScore = null } = {}) {
  const stats = getPoolStats(items);
  const total = stats.total;
  const risks = [];
  const actions = [];
  const sections = [];

  if (!total) {
    return {
      ok: true,
      level: 'empty',
      summary: '还没有选择专业。请先从查询结果中把几个“学校+专业”放进报告。',
      stats,
      risks: ['还没有选择专业，暂时无法判断分段搭配。'],
      actions: ['先放入稍高目标、主要参考、稳妥补充三个分段的专业，再生成报告。'],
      sections: [],
      reportText: '还没有选择专业。'
    };
  }

  if (total < 12) {
    risks.push('已选专业数量偏少，暂时更像候选内容，建议再补充几个可讨论专业。');
    actions.push('继续补充主要参考区和后段稳妥补充区，先把数量扩展到至少 20 个以上再做正式排序。');
  }
  if (stats.safeCount < Math.max(3, Math.ceil(total * 0.22))) {
    risks.push('稳妥补充区数量偏少，后段承接能力不足。');
    actions.push('增加若干“稳妥补充 / 稳妥补充 / 稳妥补充”专业，尤其补充低风险、可接受专业方向。');
  }
  if (stats.stableCount < Math.ceil(total * 0.34)) {
    risks.push('主体主要参考区偏薄，中段承接不够厚。');
    actions.push('优先补充“主要参考 / 稳妥”专业，作为真实录取承接区。');
  }
  if (stats.rushCount > Math.ceil(total * 0.38)) {
    risks.push('稍高目标区占比偏高，容易形成“前段好看、后段发虚”的排序。');
    actions.push('保留少量高价值稍高目标，其余用更接近位次的专业替换。');
  }
  if (stats.highRushCount > 2) {
    risks.push('稍高目标专业数量偏多，稍高目标只能承担梦想位，不应作为主要录取依赖。');
    actions.push('稍高目标建议控制在 1-2 个左右，并放在排序最前部。');
  }

  const [topCity, topCityCount] = topEntry(stats.byCity);
  if (topCity && total >= 8 && topCityCount >= Math.ceil(total * 0.45)) {
    risks.push(`城市过于集中偏高：${topCity} 相关志愿占比较大。`);
    actions.push('在同专业方向下补充其他城市/省份的可接受选择，避免地域单点风险。');
  }
  const [topFamily, topFamilyCount] = topEntry(stats.byMajorFamily);
  if (topFamily && total >= 8 && topFamilyCount >= Math.ceil(total * 0.55)) {
    risks.push(`专业方向集中度偏高：${topFamily} 占比较大。`);
    actions.push('如果孩子确实强偏好该方向，可以保留；否则建议加入 1-2 个相邻专业方向做风险分散。');
  }

  const ordered = items.map((item, index) => ({ ...item, order: index + 1, poolBand: item.poolBand || classifyPoolItem(item), majorFamily: majorFamily(item.major) }));
  const rushItems = ordered.filter(x => x.poolBand.group === 'rush');
  const stableItems = ordered.filter(x => x.poolBand.group === 'stable');
  const safeItems = ordered.filter(x => x.poolBand.group === 'safe');

  sections.push({
    title: '前段稍高目标区',
    content: rushItems.length
      ? `当前有 ${rushItems.length} 个稍高目标志愿，其中稍高目标 ${stats.highRushCount} 个。稍高目标位适合放在前段，但不能替代中后段承接。`
      : '当前几乎没有稍高目标志愿，方案偏保守；如果孩子和家长愿意尝试，可以少量加入可接受的上探专业。'
  });
  sections.push({
    title: '中段主要参考区',
    content: stableItems.length
      ? `当前有 ${stableItems.length} 个主要参考专业，这是方案的主要录取承接区。建议继续检查这些专业是否都是孩子能接受的方向。`
      : '当前缺少主要参考专业，中段承接断层明显，需要优先补充。'
  });
  sections.push({
    title: '后段稳妥补充区',
    content: safeItems.length
      ? `当前有 ${safeItems.length} 个稳妥补充/稳妥补充志愿。后段不是随便填低分专业，而是要保证学校、城市、专业方向都能接受。`
      : '当前没有明显稳妥补充志愿，滑档或被迫接受低接受度专业的风险较高。'
  });

  const level = risks.length >= 4 ? 'high' : risks.length >= 2 ? 'medium' : 'low';
  const summary = level === 'high'
    ? '当前已选专业整体偏高，建议先补齐主要参考和稳妥补充，再生成报告。'
    : level === 'medium'
      ? '当前已选专业已有基本搭配，但仍建议看看分段比例和方向是否过于集中。'
      : '当前已选专业搭配相对均衡，可以进入人工确认和报告生成。';

  if (!risks.length) risks.push('暂未发现明显结构性风险，但仍需人工核验招生计划、选科、体检、学费和校区。');
  if (!actions.length) actions.push('保持当前前中后段结构，逐条核验专业接受度、计划变化和特殊项目标签。');

  const reportText = makeReportText({ candidateScore, stats, summary, risks, actions, sections, ordered });

  return {
    ok: true,
    level,
    summary,
    stats,
    risks,
    actions,
    sections,
    orderedItems: ordered,
    reportText,
    generatedAt: new Date().toISOString()
  };
}

function makeReportText({ candidateScore, stats, summary, risks, actions, sections, ordered }) {
  const lines = [];
  lines.push('辽宁物理类专业初选报告生成前提醒');
  lines.push('');
  lines.push(`考生分数：${candidateScore || '未填写'}`);
  lines.push('数据口径：辽宁 2025 物理类专业数据，数据来源为 /fenxi 已接入专业池；本报告用于志愿讨论，不等同于录取预测。');
  lines.push('');
  lines.push(`已选专业总数：${stats.total} 个`);
  lines.push(`稍高目标：${stats.rushCount} 个（${pct(stats.rushCount, stats.total)}%）`);
  lines.push(`稳妥：${stats.stableCount} 个（${pct(stats.stableCount, stats.total)}%）`);
  lines.push(`稳妥补充：${stats.safeCount} 个（${pct(stats.safeCount, stats.total)}%）`);
  lines.push('');
  lines.push(`整体判断：${summary}`);
  lines.push('');
  for (const section of sections) {
    lines.push(`${section.title}：${section.content}`);
  }
  lines.push('');
  lines.push('主要风险：');
  risks.forEach((risk, index) => lines.push(`${index + 1}. ${risk}`));
  lines.push('');
  lines.push('调整建议：');
  actions.forEach((action, index) => lines.push(`${index + 1}. ${action}`));
  lines.push('');
  lines.push('当前排序：');
  ordered.slice(0, 112).forEach((item) => {
    const score = Number.isFinite(Number(item.score2025)) ? `${item.score2025}分` : '分数缺失';
    const rank = Number.isFinite(Number(item.rank2025)) ? `位次${item.rank2025}` : '位次缺失';
    lines.push(`${item.order}. ${item.school} · ${item.major}｜${item.poolBand.detail}｜${score}｜${rank}`);
  });
  lines.push('');
  lines.push('人工复核清单：2026 年一分一段、招生计划、选科要求、体检限制、学费、校区、中外合作/专项/高收费等特殊项目。');
  return lines.join('\n');
}
