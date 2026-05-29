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
      school: clean(item.school, 120),
      major: clean(item.major, 180),
      score2025: num(item.score2025 ?? item.score, null),
      rank2025: num(item.rank2025 ?? item.rank, null),
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

function analysisLines(analysis = {}) {
  const lines = [];
  if (analysis.summary) {
    lines.push('## AI路径分析结论');
    lines.push('');
    lines.push(`- 整体判断：${analysis.summary}`);
    lines.push('');
  }
  if (Array.isArray(analysis.sections) && analysis.sections.length) {
    analysis.sections.forEach(section => {
      lines.push(`### ${clean(section.title, 80)}`);
      lines.push('');
      lines.push(clean(section.content, 1200));
      lines.push('');
    });
  }
  if (Array.isArray(analysis.risks) && analysis.risks.length) {
    lines.push('## 主要风险');
    lines.push('');
    analysis.risks.slice(0, 12).forEach((risk, index) => lines.push(`${index + 1}. ${risk}`));
    lines.push('');
  }
  if (Array.isArray(analysis.actions) && analysis.actions.length) {
    lines.push('## 调整建议');
    lines.push('');
    analysis.actions.slice(0, 12).forEach((action, index) => lines.push(`${index + 1}. ${action}`));
    lines.push('');
  }
  return lines;
}

export function buildSelectionPoolFeishuReport(input = {}) {
  const reportType = input.reportType === 'selectionPoolWithAnalysis' ? 'selectionPoolWithAnalysis' : 'selectionPoolOnly';
  const candidateScore = input.candidateScore || '未填写';
  const items = normalizeItems(input.items || input.orderedItems || []);
  const stats = input.analysis?.stats?.total ? input.analysis.stats : getStats(items);
  const hasAnalysis = reportType === 'selectionPoolWithAnalysis' && input.analysis;
  const title = hasAnalysis
    ? `${candidateScore}分｜自选池路径分析报告｜辽宁物理类`
    : `${candidateScore}分｜自选池排序清单｜辽宁物理类`;
  const lines = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(hasAnalysis ? '## 辽宁物理类志愿自选池路径分析报告' : '## 辽宁物理类志愿自选池排序清单');
  lines.push('');
  lines.push(`- 考生分数：${candidateScore}`);
  lines.push('- 数据口径：辽宁 2025 物理类专业数据，数据来源为 /fenxi 已接入专业池。');
  lines.push('- 使用边界：本报告用于志愿讨论和人工复核，不等同于录取预测。');
  lines.push('');
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
  if (!items.length) {
    lines.push('- 当前自选池为空。');
  } else {
    items.forEach((item) => {
      lines.push(`### ${itemLine(item)}`);
      lines.push('');
      lines.push(`- 适合位置：${item.position || item.poolBand?.position || '待核验'}`);
      lines.push(`- 相对考生：${deltaText(item.scoreDelta)} 分`);
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
  lines.push('- 2026 年一分一段与考生实际位次。');
  lines.push('- 2026 年招生计划、专业备注、选科要求、体检限制。');
  lines.push('- 学费、校区、联合培养、中外合作、专项计划、高收费项目。');
  lines.push('- 家庭预算、城市接受度、专业接受度和未来转专业规则。');
  lines.push('');
  lines.push('## 口径说明');
  lines.push('');
  lines.push('本报告基于辽宁 2025 物理类历史录取数据和 /fenxi 已接入专业池生成，用于形成可讨论专业池与自选池路径，不等同于录取预测。正式填报仍需结合当年位次、等位分/同位分、招生计划、选科、体检、学费、校区和专业特殊要求综合判断。');

  return {
    title,
    markdown: lines.join('\n'),
    recordsCount: items.length,
    reportType,
    version: 'v3.9.41'
  };
}
