import { buildRuleOnlyDiagnosis } from './ai-card-rules.js';

function pickJson(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch {}
  }
  return null;
}

function cleanList(value, max = 5) {
  if (!Array.isArray(value)) return [];
  return value.map(x => String(x || '').trim()).filter(Boolean).slice(0, max);
}

export function normalizeDiagnosis(data, record, candidateScore, modelText = '') {
  const fallback = buildRuleOnlyDiagnosis(record, candidateScore);
  const obj = data && typeof data === 'object' ? data : {};

  return {
    summary: String(obj.summary || fallback.summary).trim().slice(0, 180),
    basis: cleanList(obj.basis, 5).length ? cleanList(obj.basis, 5) : fallback.basis,
    realityReminder: String(obj.realityReminder || fallback.realityReminder).trim().slice(0, 240),
    checks: cleanList(obj.checks, 5).length ? cleanList(obj.checks, 5) : fallback.checks,
    parentNote: String(obj.parentNote || obj.parent_note || '').trim().slice(0, 220),
    riskTags: cleanList(obj.riskTags || obj.risk_tags, 5).length ? cleanList(obj.riskTags || obj.risk_tags, 5) : fallback.riskTags,
    disclaimer: String(obj.disclaimer || fallback.disclaimer).trim().slice(0, 160),
    rawModelText: modelText ? String(modelText).slice(0, 800) : ''
  };
}

export function parseDiagnosisFromModel(text, record, candidateScore) {
  const parsed = pickJson(text);
  return normalizeDiagnosis(parsed, record, candidateScore, text);
}
