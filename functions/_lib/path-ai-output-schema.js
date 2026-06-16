function text(value, max = 800) {
  const s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function pickJson(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch {}
  }
  return null;
}

function list(value, max = 5, itemMax = 90) {
  const arr = Array.isArray(value) ? value : String(value || '').split(/[。；;\n]+/);
  const out = [];
  const seen = new Set();
  for (const item of arr) {
    const s = text(String(item || '').replace(/^\d+[\.、]\s*/, ''), itemMax);
    const key = s.replace(/[，。；、,\.\s]/g, '').slice(0, 36);
    if (!s || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

export function normalizePathAiOutput(value = {}, fallback = {}) {
  const obj = value && typeof value === 'object' ? value : {};
  const actions = list(obj.actions || fallback.actions, 6, 90);
  return {
    overall: text(obj.overall || fallback.summary || '已完成规则版诊断，建议继续按位次、密度和招生计划复核。', 360),
    rankZoneExplain: text(obj.rankZoneExplain || fallback.rankZoneExplain || fallback.rankZone?.note || '', 500),
    structureDiagnosis: text(obj.structureDiagnosis || fallback.structureDiagnosis || fallback.summary || '', 500),
    majorPathDiagnosis: text(obj.majorPathDiagnosis || fallback.majorPathDiagnosis || '', 500),
    bottomLineRisk: text(obj.bottomLineRisk || fallback.bottomLineRisk || '', 500),
    actions,
    parentVersion: text(obj.parentVersion || fallback.parentVersion || obj.overall || '', 360),
    reportMarkdown: text(obj.reportMarkdown || fallback.reportMarkdown || '', 1600),
    disclaimer: text(obj.disclaimer || 'AI解读只负责解释规则和结构，不预测录取判断；最终以2026一分一段、招生计划、专业备注、选科、体检、学费和校区核验为准。', 360)
  };
}

export function parsePathAiOutput(modelText, fallback = {}) {
  const parsed = pickJson(modelText);
  if (!parsed) return normalizePathAiOutput({ overall: modelText }, fallback);
  return normalizePathAiOutput(parsed, fallback);
}
