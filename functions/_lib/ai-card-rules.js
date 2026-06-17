import { classifyMajorReality, schoolLayerTags } from './ai-skills/major-risk-rules.js';
import { detectSpecialProgram } from './special-program-rules.js';
import { applyHumanCopyGate } from './diagnosis-human-copy-gate.js';

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function deltaText(delta) {
  const n = Number(delta);
  if (!Number.isFinite(n)) return '—';
  return n > 0 ? `高于考生 ${n} 分` : n < 0 ? `低于考生 ${Math.abs(n)} 分` : '与考生同分';
}


function cardStatusRange(status) {
  const s = String(status || '').trim();
  if (!s) return '当前范围';
  if (s.includes('主要参考') || s.includes('匹配')) return '主要参考范围';
  if (s.includes('稳妥')) return '低分侧补充范围';
  if (s.includes('稍高')) return '稍高目标范围';
  return s.endsWith('参考') ? `${s}范围` : `${s}范围`;
}

function historyLine(record = {}) {
  if (!(record.historyCompare?.has2024 || record.score2024 != null || record.rank2024 != null)) {
    return '2024同口径参考：暂无';
  }
  const score = record.score2024 != null ? `${fmt(record.score2024)}分` : '分数待核验';
  const rank = record.rank2024 != null ? `${fmt(record.rank2024)}位` : '位次待核验';
  const trend = record.historyCompare?.rankTrendText ? `；${record.historyCompare.rankTrendText}` : '';
  return `2024同口径参考：${score}/${rank}${trend}`;
}

function shortRiskTag(value) {
  const s = String(value || '');
  if (s.includes('AI')) return 'AI冲击';
  if (s.includes('持续学习') || s.includes('持续自学')) return '持续学习';
  if (s.includes('项目')) return '项目能力';
  if (s.includes('读研')) return '读研路径';
  if (s.includes('证书')) return '证书路径';
  if (s.includes('课程')) return '课程强度';
  if (s.includes('就业')) return '就业核验';
  if (s.includes('资源')) return '资源依赖';
  return s.slice(0, 8);
}

export function buildCardRuleSnapshot(record = {}, candidateScore) {
  const realityTags = classifyMajorReality(record);
  const specialProgram = detectSpecialProgram(record);
  const platformTags = schoolLayerTags(record);
  const delta = Number(record.scoreDelta ?? ((record.score2025 ?? record.score) - candidateScore));

  const basis = [
    `卡片状态：${record.statusLabel || '待核验'}`,
    `相对考生：${deltaText(delta)}`,
    `2025最低：${fmt(record.score2025 ?? record.score)}分 / ${fmt(record.rank2025 ?? record.rank)}位`,
    historyLine(record),
    ...platformTags.slice(0, 2)
  ].filter(Boolean);

  const checks = [
    ...(specialProgram.hasSpecial ? specialProgram.checks : []),
    '核验2026招生计划是否变化',
    '核验专业组、选科、体检或单科要求',
    '核验办学地点、校区和收费口径',
    '用当年一分一段做最终换算'
  ];

  return {
    basis,
    realityTags,
    specialProgram,
    checks: [...new Set(checks)].slice(0, 6),
    suggestedTone: '温和、现实、短句、面向家长',
    disclaimer: '仅做专业卡片解释，不等同于录取预测。'
  };
}

export function buildRuleOnlyDiagnosis(record = {}, candidateScore) {
  const snap = buildCardRuleSnapshot(record, candidateScore);
  const specialProgram = snap.specialProgram || detectSpecialProgram(record);
  const risk = snap.realityTags.find(t => t.level === 'risk');
  const positive = snap.realityTags.find(t => t.level === 'positive');
  const conditional = snap.realityTags.find(t => t.level === 'conditional');

  let summary = `这条属于${cardStatusRange(record.statusLabel || record.position)}，可以放进家庭讨论。`;
  if (specialProgram.hasSpecial) summary = '这条可看，但特殊项目规则必须先核验。';
  else if (risk) summary = '这条可以看，但需要重点核验专业现实。';
  else if (conditional) summary = '这条可以关注，但需要先确认限制条件。';
  else if (positive) summary = '这条路径相对清晰，可以放进家庭讨论。';

  const tag = risk || conditional || positive;

  const diagnosis = applyHumanCopyGate({
    summary,
    basis: snap.basis.slice(0, 3),
    realityReminder: specialProgram.hasSpecial ? specialProgram.reminder : (tag?.text || '建议同时看学校层次、城市资源、专业出口和家庭容错率。'),
    checks: snap.checks.slice(0, 4),
    parentNote: specialProgram.hasSpecial ? specialProgram.parentNote : (risk ? '可以关注，但不能只按低风险理解。' : '可以放进家庭讨论，但要结合孩子能力和当年计划。'),
    riskTags: [...new Set([...(specialProgram.riskTags || []), ...snap.realityTags.map(t => shortRiskTag(t.text)).filter(Boolean)])].slice(0, 5),
    specialProgram: specialProgram.hasSpecial ? specialProgram : null,
    disclaimer: snap.disclaimer
  });
  return diagnosis;
}
