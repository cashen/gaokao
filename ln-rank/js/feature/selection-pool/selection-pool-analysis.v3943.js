import { classifyPoolItem, getPoolStats, majorFamily } from './selection-pool-store.v3942.js';

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
      summary: '自选池暂无专业志愿。请先从查询结果中加入若干“专业+学校”卡片，再进行排序诊断。',
      stats,
      risks: ['自选池为空，无法判断冲稳保结构。'],
      actions: ['先加入上探、主体、稳妥三个区间的专业，再回到自选池做排序。'],
      sections: [],
      reportText: '自选池暂无专业志愿。'
    };
  }

  if (total < 12) {
    risks.push('自选池数量偏少，暂时更像候选清单，不适合作为完整填报方案。');
    actions.push('继续补充主体承接区和后段保底区，先把数量扩展到至少 20 个以上再做正式排序。');
  }
  if (stats.safeCount < Math.max(3, Math.ceil(total * 0.22))) {
    risks.push('保底区数量偏少，后段承接能力不足。');
    actions.push('增加若干“小保 / 强保 / 兜底”专业，尤其补充低风险、可接受专业方向。');
  }
  if (stats.stableCount < Math.ceil(total * 0.34)) {
    risks.push('主体稳妥区偏薄，中段承接不够厚。');
    actions.push('优先补充“边稳 / 稳妥”专业，作为真实录取承接区。');
  }
  if (stats.rushCount > Math.ceil(total * 0.38)) {
    risks.push('冲刺区占比偏高，容易形成“前段好看、后段发虚”的排序。');
    actions.push('保留少量高价值冲刺，其余用更接近位次的专业替换。');
  }
  if (stats.highRushCount > 2) {
    risks.push('高冲专业数量偏多，高冲只能承担梦想位，不应作为主要录取依赖。');
    actions.push('高冲建议控制在 1-2 个左右，并放在排序最前部。');
  }

  const [topCity, topCityCount] = topEntry(stats.byCity);
  if (topCity && total >= 8 && topCityCount >= Math.ceil(total * 0.45)) {
    risks.push(`地域集中度偏高：${topCity} 相关志愿占比较大。`);
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
    title: '前段冲刺区',
    content: rushItems.length
      ? `当前有 ${rushItems.length} 个冲刺志愿，其中高冲 ${stats.highRushCount} 个。冲刺位适合放在前段，但不能替代中后段承接。`
      : '当前几乎没有冲刺志愿，方案偏保守；如果孩子和家长愿意尝试，可以少量加入可接受的上探专业。'
  });
  sections.push({
    title: '中段稳妥区',
    content: stableItems.length
      ? `当前有 ${stableItems.length} 个边稳/稳妥志愿，这是方案的主要录取承接区。建议继续检查这些专业是否都是孩子能接受的方向。`
      : '当前缺少边稳/稳妥志愿，中段承接断层明显，需要优先补充。'
  });
  sections.push({
    title: '后段保底区',
    content: safeItems.length
      ? `当前有 ${safeItems.length} 个保底/兜底志愿。后段不是随便填低分专业，而是要保证学校、城市、专业方向都能接受。`
      : '当前没有明显保底志愿，滑档或被迫接受低接受度专业的风险较高。'
  });

  const level = risks.length >= 4 ? 'high' : risks.length >= 2 ? 'medium' : 'low';
  const summary = level === 'high'
    ? '当前自选池整体风险偏高，需要先补齐中段承接和后段保底，再做最终排序。'
    : level === 'medium'
      ? '当前自选池已有基本框架，但仍需调整冲稳保比例和集中度风险。'
      : '当前自选池结构相对均衡，可以进入人工复核、排序微调和报告整理。';

  if (!risks.length) risks.push('暂未发现明显结构性风险，但仍需人工核验招生计划、选科、体检、学费和校区。');
  if (!actions.length) actions.push('保持当前冲稳保结构，逐条核验专业接受度、计划变化和特殊项目标签。');

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
  lines.push('辽宁物理类志愿自选池排序诊断报告');
  lines.push('');
  lines.push(`考生分数：${candidateScore || '未填写'}`);
  lines.push('数据口径：辽宁 2025 物理类专业数据，数据来源为 /fenxi 已接入专业池；本报告用于志愿讨论，不等同于录取预测。');
  lines.push('');
  lines.push(`自选池总数：${stats.total} 个`);
  lines.push(`冲刺：${stats.rushCount} 个（${pct(stats.rushCount, stats.total)}%）`);
  lines.push(`稳妥：${stats.stableCount} 个（${pct(stats.stableCount, stats.total)}%）`);
  lines.push(`保底：${stats.safeCount} 个（${pct(stats.safeCount, stats.total)}%）`);
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
