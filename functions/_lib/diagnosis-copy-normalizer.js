const REPLACEMENTS = [
  [/自选池/g, '自选专业'],
  [/AI高报师/g, '方案解读'],
  [/主体参考/g, '主要参考'],
  [/重点匹配/g, '主要参考'],
  [/主体承接区/g, '主要承接区'],
  [/中段承接/g, '中段承接'],
  [/保底深度/g, '后段是否够稳'],
  [/地域单点风险/g, '城市过于集中'],
  [/专业集中度/g, '专业方向是否过于集中'],
  [/冲刺区/g, '前段尝试'],
  [/稳妥区/g, '主要承接'],
  [/保底区/g, '后段补充'],
  [/高冲/g, '高一点，谨慎少量'],
  [/小冲/g, '冲一冲'],
  [/边稳/g, '接近匹配'],
  [/小保/g, '稳妥补充'],
  [/强保/g, '更稳补充'],
  [/兜底/g, '最后兜底'],
  [/稳进/g, '相对稳妥'],
  [/必录/g, '需以当年计划核验'],
  [/保证/g, '需要核验']
];

function normalizeText(value) {
  let s = String(value == null ? '' : value).trim();
  if (!s) return s;
  for (const [pattern, replacement] of REPLACEMENTS) s = s.replace(pattern, replacement);
  return s.replace(/\s+/g, ' ').trim();
}

function normalizeArray(list) {
  return Array.isArray(list) ? list.map(normalizeText).filter(Boolean) : [];
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
  return next;
}

export function normalizeDiagnosisLines(lines = []) {
  return normalizeArray(lines);
}
