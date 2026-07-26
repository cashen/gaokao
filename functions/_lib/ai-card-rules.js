import { formatHistoricalEvidenceText, historyRankRangeText, historyYearEvidence } from '../../shared/resources/exam/historical-score-rank-contract.js';
import { classifyMajorReality, schoolLayerTags } from './ai-skills/major-risk-rules.js';
import { detectSpecialProgram } from './special-program-rules.js';
import { applyHumanCopyGate } from './diagnosis-human-copy-gate.js';

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('zh-CN') : '—';
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function deltaText(delta) {
  const n = Number(delta);
  if (!Number.isFinite(n)) return '与参考分数的差距待确认';
  return n > 0 ? `高于参考分数 ${n} 分` : n < 0 ? `低于参考分数 ${Math.abs(n)} 分` : '与参考分数相同';
}

function cardStatusRange(status) {
  const s = String(status || '').trim();
  if (!s) return '当前范围';
  if (s.includes('主要参考') || s.includes('匹配')) return '主要参考范围';
  if (s.includes('稳妥') || s.includes('低分侧')) return '低分侧补充范围';
  if (s.includes('稍高')) return '稍高目标范围';
  return s.endsWith('范围') ? s : `${s}范围`;
}

function historyLine(record = {}) {
  return formatHistoricalEvidenceText(record, { years: [2025, 2024], prefix: true, empty: '历史对照：暂无可严格对应的2025、2024记录' });
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
  const currentEvidence = historyYearEvidence(record, 2026);
  const score2026 = finite(currentEvidence?.score ?? record.score2026 ?? record.score);
  const delta = finite(record.scoreDelta) ?? (score2026 == null ? null : score2026 - Number(candidateScore));
  const scoreText = score2026 == null ? '分数待核验' : `${fmt(score2026)}分`;
  const rankText = currentEvidence ? historyRankRangeText(currentEvidence) : '位次待核验';

  const basis = [
    `当前位置：${cardStatusRange(record.statusLabel || record.position)}；${deltaText(delta)}`,
    `2026最低投档：${scoreText} / ${rankText}`,
    historyLine(record),
    ...platformTags.slice(0, 2)
  ].filter(Boolean);

  const checks = [
    ...(specialProgram.hasSpecial ? specialProgram.checks : []),
    '核验2027招生计划和专业是否继续投放',
    '核验2027选科、体检、语种或单科要求',
    '核验2027办学地点、校区、培养方式和收费口径',
    '用2027一分一段和正式志愿系统做最终换算'
  ];

  return {
    activeDataYear: 2026,
    audienceYear: 2027,
    basis,
    realityTags,
    specialProgram,
    checks: [...new Set(checks)].slice(0, 7),
    suggestedTone: '温和、现实、短句、面向家长和孩子',
    disclaimer: '以2026最低投档记录为历史参考，不等同于2027录取预测。'
  };
}

export function buildRuleOnlyDiagnosis(record = {}, candidateScore) {
  const snap = buildCardRuleSnapshot(record, candidateScore);
  const specialProgram = snap.specialProgram || detectSpecialProgram(record);
  const risk = snap.realityTags.find(t => t.level === 'risk');
  const positive = snap.realityTags.find(t => t.level === 'positive');
  const conditional = snap.realityTags.find(t => t.level === 'conditional');

  let summary = `这条属于${cardStatusRange(record.statusLabel || record.position)}，可以放进家庭讨论。`;
  if (specialProgram.hasSpecial) summary = '这条可看，但特殊项目规则必须先确认。';
  else if (risk) summary = '这条可以看，但需要重点了解专业现实。';
  else if (conditional) summary = '这条可以关注，但需要先确认限制条件。';
  else if (positive) summary = '这条路径相对清晰，可以放进家庭讨论。';

  const tag = risk || conditional || positive;

  const diagnosis = applyHumanCopyGate({
    summary,
    basis: snap.basis.slice(0, 3),
    realityReminder: specialProgram.hasSpecial ? specialProgram.reminder : (tag?.text || '建议同时看专业内容、学校资源、城市条件和孩子真实接受度。'),
    checks: snap.checks.slice(0, 4),
    parentNote: specialProgram.hasSpecial ? specialProgram.parentNote : (risk ? '可以关注，但不能只按分数位置理解。' : '可以放进家庭讨论，先听孩子想法，再核对2027正式资料。'),
    riskTags: [...new Set([...(specialProgram.riskTags || []), ...snap.realityTags.map(t => shortRiskTag(t.text)).filter(Boolean)])].slice(0, 5),
    specialProgram: specialProgram.hasSpecial ? specialProgram : null,
    disclaimer: snap.disclaimer
  });
  return diagnosis;
}
