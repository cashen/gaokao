import { classifyMajorReality, schoolLayerTags } from './ai-skills/major-risk-rules.js';

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function deltaText(delta) {
  const n = Number(delta);
  if (!Number.isFinite(n)) return '—';
  return n > 0 ? `高于考生 ${n} 分` : n < 0 ? `低于考生 ${Math.abs(n)} 分` : '与考生同分';
}

function historyLine(record = {}) {
  if (!(record.historyCompare?.has2024 || record.score2024 != null || record.rank2024 != null)) {
    return '2024暂无同口径数据';
  }
  const score = record.score2024 != null ? `${fmt(record.score2024)}分` : '分数待核验';
  const rank = record.rank2024 != null ? `${fmt(record.rank2024)}位` : '位次待核验';
  const trend = record.historyCompare?.rankTrendText ? `；${record.historyCompare.rankTrendText}` : '';
  return `2024参考：${score}/${rank}${trend}`;
}

export function buildCardRuleSnapshot(record = {}, candidateScore) {
  const realityTags = classifyMajorReality(record);
  const platformTags = schoolLayerTags(record);
  const delta = Number(record.scoreDelta ?? ((record.score2025 ?? record.score) - candidateScore));

  const basis = [
    `考生分数：${fmt(candidateScore)}`,
    `卡片状态：${record.statusLabel || '待核验'}`,
    `相对考生：${deltaText(delta)}`,
    `2025最低：${fmt(record.score2025 ?? record.score)}分 / ${fmt(record.rank2025 ?? record.rank)}位`,
    historyLine(record),
    ...platformTags
  ].filter(Boolean);

  const checks = [
    '核验2026招生计划是否增减。',
    '核验专业组、选科要求、体检/单科限制是否变化。',
    '核验办学地点/校区是否与卡片一致。',
    '用当年一分一段、等位分/同位分做最终判断。'
  ];

  if (realityTags.some(t => t.level === 'risk')) {
    checks.push('该专业方向存在现实风险，建议额外查看就业质量报告和中位数去向。');
  }
  if (realityTags.some(t => t.level === 'conditional')) {
    checks.push('该专业属于有条件推荐，需确认学生能力、读研意愿或证书路径。');
  }

  return {
    basis,
    realityTags,
    checks,
    suggestedTone: '温和、现实、短句、面向家长',
    disclaimer: '仅做专业卡片解释，不等同于录取预测。'
  };
}

export function buildRuleOnlyDiagnosis(record = {}, candidateScore) {
  const snap = buildCardRuleSnapshot(record, candidateScore);
  const risk = snap.realityTags.find(t => t.level === 'risk');
  const positive = snap.realityTags.find(t => t.level === 'positive');
  const conditional = snap.realityTags.find(t => t.level === 'conditional');

  let summary = `这条专业可作为${record.position || record.statusLabel || '当前区间'}参考，但不能直接等同于录取结论。`;
  if (risk) summary = `这条专业需要谨慎看，卡片位置之外还要重点看就业现实和行业风险。`;
  else if (conditional) summary = `这条专业可以关注，但属于有条件选择，关键看学生能力和后续路径。`;
  else if (positive) summary = `这条专业现实确定性相对更强，可以作为重点讨论对象之一。`;

  return {
    summary,
    basis: snap.basis.slice(0, 5),
    realityReminder: (risk || conditional || positive)?.text || '建议同时看学校层次、城市资源、专业出口和家庭容错率。',
    checks: snap.checks.slice(0, 4),
    riskTags: snap.realityTags.map(t => t.text).slice(0, 4),
    disclaimer: snap.disclaimer
  };
}
