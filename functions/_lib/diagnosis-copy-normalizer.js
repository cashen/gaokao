import { applyHumanCopyGate } from './diagnosis-human-copy-gate.js';
const REPLACEMENTS = [
  [/已选专业/g, '已选专业'],
  [/AI高报师/g, '方案解读'],
  [/主体参考/g, '主要参考'],
  [/重点匹配/g, '主要参考'],
  [/主要参考区/g, '主要参考区'],
  [/中段承接/g, '中段承接'],
  [/浅后段是否够稳/g, '低分侧补充偏浅'],
  [/后段是否够稳/g, '低分侧补充是否够厚'],
  [/城市过于集中/g, '城市过于集中'],
  [/专业方向是否过于集中/g, '专业方向是否过于集中'],
  [/稍高目标区/g, '稍高目标'],
  [/主要参考区/g, '主要参考'],
  [/低分侧补充区/g, '低分侧补充'],
  [/稍高目标/g, '稍高目标'],
  [/稍高目标/g, '稍高目标'],
  [/主要参考/g, '主要参考'],
  [/低分侧补充/g, '低分侧补充'],
  [/低分侧补充/g, '低分侧补充'],
  [/主要参考/g, '主要参考'],
  [/需要确认/g, '需以当年计划核验'],
  [/需要结合当年招生计划核验/g, '需要核验']
];

function normalizeText(value) {
  let s = String(value == null ? '' : value).trim();
  if (!s) return s;
  for (const [pattern, replacement] of REPLACEMENTS) s = s.replace(pattern, replacement);
  return applyHumanCopyGate(s.replace(/[ \t\r\f]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim());
}

function normalizeArray(list) {
  return Array.isArray(list) ? applyHumanCopyGate(list.map(normalizeText).filter(Boolean)) : [];
}

export function normalizeDiagnosisCopy(narrative = {}) {
  if (!narrative || typeof narrative !== 'object') return narrative;
  const next = { ...narrative };
  for (const key of [
    'overall', 'zoneJudgement', 'reasoning', 'structureDiagnosis', 'majorPathDiagnosis',
    'pushRateDiagnosis', 'bottomLineDiagnosis', 'parentVersion', 'reportMarkdown', 'disclaimer'
  ]) {
    if (next[key] != null) next[key] = normalizeText(next[key]);
  }
  next.riskDiagnosis = normalizeArray(next.riskDiagnosis);
  next.actions = normalizeArray(next.actions);
  return applyHumanCopyGate(next);
}

export function normalizeDiagnosisLines(lines = []) {
  return normalizeArray(lines);
}
