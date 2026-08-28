import { applyHumanCopyGate } from './diagnosis-human-copy-gate.js';
function text(value, max = 800) {
  const s = String(value == null ? '' : value).replace(/```[\s\S]*?```/g, '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function pickJson(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) { try { return JSON.parse(fenced[1].trim()); } catch {} }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) { try { return JSON.parse(s.slice(start, end + 1)); } catch {} }
  return null;
}

function cleanList(value, max = 6, itemMax = 130) {
  const arr = Array.isArray(value) ? value : String(value || '').split(/[。；;\n]+/);
  const out = [];
  const seen = new Set();
  for (const item of arr) {
    const s = text(String(item || '').replace(/^\s*[-•]\s*/, '').replace(/^\s*\d+[\.、]\s*/, ''), itemMax);
    const key = s.replace(/[，。；、,.\s]/g, '').slice(0, 40);
    if (!s || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function containsForbidden(obj) {
  const s = JSON.stringify(obj || {}).toLowerCase();
  const words = ['必录', '稳进', '闭眼报', '一定上岸', '稳上岸', '百分百', '100%', '录取判断'];
  return words.find(w => s.includes(w.toLowerCase())) || '';
}

export function parseAdvisorAiText(modelText) {
  return pickJson(modelText);
}

export function normalizeAdvisorNarrative(obj = {}, fallback = {}) {
  const finalZone = obj.finalZone && typeof obj.finalZone === 'object' ? obj.finalZone : fallback.finalZone || {};
  return {
    overall: text(obj.overall || fallback.overall, 420),
    finalZone: {
      zoneKey: text(finalZone.zoneKey || fallback.finalZone?.zoneKey || '', 80),
      zoneName: text(finalZone.zoneName || fallback.finalZone?.zoneName || '', 120),
      secondaryZoneKey: text(finalZone.secondaryZoneKey || fallback.finalZone?.secondaryZoneKey || '', 80),
      confidenceText: text(finalZone.confidenceText || fallback.finalZone?.confidenceText || '', 120)
    },
    zoneJudgement: text(obj.zoneJudgement || obj.rankZoneExplain || fallback.zoneJudgement, 520),
    reasoning: text(obj.reasoning || fallback.reasoning, 560),
    structureDiagnosis: text(obj.structureDiagnosis || fallback.structureDiagnosis, 520),
    majorPathDiagnosis: text(obj.majorPathDiagnosis || fallback.majorPathDiagnosis, 560),
    pushRateDiagnosis: text(obj.pushRateDiagnosis || fallback.pushRateDiagnosis, 560),
    bottomLineDiagnosis: text(obj.bottomLineDiagnosis || obj.bottomLineRisk || fallback.bottomLineDiagnosis, 520),
    riskDiagnosis: cleanList(obj.riskDiagnosis || fallback.riskDiagnosis, 6, 150),
    actions: cleanList(obj.actions || fallback.actions, 6, 140),
    parentVersion: text(obj.parentVersion || fallback.parentVersion || obj.overall || fallback.overall, 420),
    reportMarkdown: text(obj.reportMarkdown || fallback.reportMarkdown, 1800),
    disclaimer: text(obj.disclaimer || fallback.disclaimer || '本说明只解释位次功能区和方案结构，不做录取判断；最终以当年一分一段、招生计划、专业备注、选科、体检、学费和校区核验为准。', 420)
  };
}

export function validateAdvisorAiNarrative(rawObj, { candidateZones = [], fallbackNarrative = {} } = {}) {
  const zoneKeys = new Set((candidateZones || []).map(z => z.zoneKey));
  if (!rawObj || typeof rawObj !== 'object') return { ok: false, reason: 'AI输出不是JSON对象', narrative: fallbackNarrative };
  const forbidden = containsForbidden(rawObj);
  if (forbidden) return { ok: false, reason: `AI输出包含禁用表达：${forbidden}`, narrative: fallbackNarrative };
  const normalized = normalizeAdvisorNarrative(rawObj, fallbackNarrative);
  if (!normalized.finalZone.zoneKey || !zoneKeys.has(normalized.finalZone.zoneKey)) return { ok: false, reason: 'AI finalZone 不在候选功能区范围内', narrative: fallbackNarrative };
  if (normalized.finalZone.secondaryZoneKey && !zoneKeys.has(normalized.finalZone.secondaryZoneKey)) normalized.finalZone.secondaryZoneKey = '';
  if (!normalized.reportMarkdown) {
    normalized.reportMarkdown = [
      '## 方案解读',
      '',
      `**整体判断：** ${normalized.overall}`,
      '',
      `**位次功能区判断：** ${normalized.zoneJudgement}`,
      '',
      `**为什么这样判断：** ${normalized.reasoning}`,
      '',
      `**结构诊断：** ${normalized.structureDiagnosis}`,
      '',
      `**专业路径：** ${normalized.majorPathDiagnosis}`,
      '',
      normalized.pushRateDiagnosis ? `**升学与推免参考：** ${normalized.pushRateDiagnosis}` : '',
      normalized.pushRateDiagnosis ? '' : '',
      `**后段底线：** ${normalized.bottomLineDiagnosis}`,
      '',
      '**调整建议：**',
      ...normalized.actions.map((a, i) => `${i + 1}. ${a}`)
    ].join('\n');
  }
  return { ok: true, reason: '', narrative: applyHumanCopyGate(normalized) };
}
