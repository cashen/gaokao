import { buildRuleOnlyDiagnosis } from './ai-card-rules.js';

function pickJson(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch {}
  }
  return null;
}

function text(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function clip(value, max) {
  const s = text(value);
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)).replace(/[，。；、,.\s]+$/g, '') + '…';
}

function signature(value) {
  return text(value)
    .replace(/[。；，、,.!！?？\s]/g, '')
    .replace(/2026|2025|是否|变化|增减/g, '')
    .slice(0, 42);
}

function splitSentences(value) {
  const s = text(value);
  if (!s) return [];
  return s.split(/[。；;\n]+/).map(x => x.trim()).filter(Boolean);
}

function uniqueList(items, max = 5, maxLen = 80) {
  const arr = Array.isArray(items) ? items : [];
  const seen = new Set();
  const out = [];
  for (const item of arr.flatMap(x => splitSentences(x))) {
    const s = clip(item.replace(/^\d+[\.、]\s*/, ''), maxLen);
    const sig = signature(s);
    if (!s || !sig || seen.has(sig)) continue;
    seen.add(sig);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function hasAny(value, words) {
  const s = text(value);
  return words.some(w => s.includes(w));
}

function isCheckLine(value) {
  return hasAny(value, ['核验', '确认', '查看', '对照', '以招生章程为准', '一分一段', '专业组', '选科', '体检', '单科', '计划', '校区', '学费', '收费', '办学地点']);
}

function isAdviceOrRiskLine(value) {
  return hasAny(value, ['持续自学', '持续学习', '项目能力', '就业', 'AI工具', '低质量培养', '有条件推荐', '读研意愿', '证书路径', '性价比', '行业风险', '现实风险']);
}

function checkCategory(value) {
  const s = text(value);
  if (hasAny(s, ['计划', '招生'])) return 'plan';
  if (hasAny(s, ['专业组', '选科', '体检', '单科'])) return 'requirement';
  if (hasAny(s, ['校区', '办学地点', '学费', '收费'])) return 'campus';
  if (hasAny(s, ['一分一段', '等位分', '同位分'])) return 'rank';
  return signature(s).slice(0, 12);
}

function cleanBasis(items, fallback) {
  const merged = uniqueList([...(Array.isArray(items) ? items : []), ...(fallback || [])], 8, 68);
  const factual = merged.filter(x => !isAdviceOrRiskLine(x) && !hasAny(x, ['核验', '需要确认', '建议额外']));
  const preferred = [];

  for (const key of ['卡片状态', '相对考生', '2025最低', '2024参考', '211', '985', '双一流', '地域']) {
    const found = factual.find(x => x.includes(key) && !preferred.some(y => signature(y) === signature(x)));
    if (found) preferred.push(found);
    if (preferred.length >= 3) break;
  }

  for (const item of factual) {
    if (preferred.length >= 3) break;
    if (!preferred.some(x => signature(x) === signature(item))) preferred.push(item);
  }

  return preferred.slice(0, 3);
}

function cleanChecks(items, fallback) {
  const merged = uniqueList([...(Array.isArray(items) ? items : []), ...(fallback || [])], 12, 52);
  const defaults = [
    '核验2026招生计划是否变化',
    '核验专业组、选科、体检或单科要求',
    '核验办学地点、校区和收费口径',
    '用当年一分一段做最终换算'
  ];

  const out = [];
  const categories = new Set();

  for (const item of [...merged, ...defaults]) {
    if (!isCheckLine(item)) continue;
    if (isAdviceOrRiskLine(item) && !hasAny(item, ['招生计划', '专业组', '校区', '选科', '体检', '单科', '收费'])) continue;
    const cat = checkCategory(item);
    if (categories.has(cat)) continue;
    const cleaned = clip(item.replace(/[。；;]+$/g, ''), 48);
    categories.add(cat);
    out.push(cleaned);
    if (out.length >= 4) break;
  }

  return out.slice(0, 4);
}

function tagify(value) {
  const s = text(value);
  if (!s) return '';
  if (s.includes('AI')) return 'AI冲击';
  if (s.includes('持续') || s.includes('自学')) return '持续学习';
  if (s.includes('项目')) return '项目能力';
  if (s.includes('读研')) return '读研路径';
  if (s.includes('证书')) return '证书路径';
  if (s.includes('就业')) return '就业核验';
  if (s.includes('招生计划') || s.includes('计划')) return '计划变化';
  if (s.includes('校区') || s.includes('办学地点')) return '校区核验';
  if (s.includes('专业组') || s.includes('选科')) return '专业组变化';
  if (s.includes('课程') || s.includes('工科')) return '课程强度';
  if (s.includes('资源')) return '资源依赖';
  if (s.includes('行业')) return '行业周期';
  return clip(s.replace(/[。；;]+$/g, ''), 8);
}

function cleanTags(items, fallback) {
  const arr = [...(Array.isArray(items) ? items : []), ...(Array.isArray(fallback) ? fallback : [])];
  const out = [];
  for (const item of arr) {
    const tag = tagify(item);
    if (!tag || tag.length > 10) continue;
    if (!out.includes(tag)) out.push(tag);
    if (out.length >= 4) break;
  }
  return out;
}

function normalizeSummary(obj, fallback, record) {
  const raw = text(obj.summary || '');
  const status = record?.statusLabel || record?.position || '';
  let summary = raw;

  if (!summary || summary.length > 60 || splitSentences(summary).length > 1) {
    if (status) summary = `这条更适合作为${status}参考。`;
    else summary = fallback.summary || '这条可以保留讨论，但需结合当年数据核验。';
  }

  summary = summary
    .replace(/不等同于录取结论。?$/g, '')
    .replace(/仅做专业卡片解释.*$/g, '')
    .trim();

  return clip(summary, 45);
}

function cleanReminder(value, fallback, checks) {
  const source = text(value) || text(fallback);
  const sentences = splitSentences(source)
    .filter(x => !isCheckLine(x))
    .filter(x => !checks.some(c => signature(c) === signature(x)))
    .filter(Boolean);

  return clip(sentences[0] || source || '建议结合学校层次、城市资源、专业出口和家庭容错率判断。', 88);
}

function majorShort(record) {
  const m = String(record?.major || '');
  if (m.includes('计算机') || m.includes('软件') || m.includes('人工智能')) return '计算机';
  if (m.includes('电气')) return '电气';
  if (m.includes('临床') || m.includes('口腔') || m.includes('医学')) return '医学';
  if (m.includes('金融') || m.includes('会计') || m.includes('经济')) return '财经';
  if (m.includes('法学')) return '法学';
  if (m.includes('师范')) return '师范';
  if (m.includes('土木') || m.includes('建筑')) return '土木建筑';
  return '该专业';
}

function specificParentNote(record, fallbackSummary) {
  const delta = Number(record?.scoreDelta);
  const major = majorShort(record);
  const status = String(record?.statusLabel || record?.position || '');

  if (Number.isFinite(delta) && delta > 0) {
    return `可以关注，但不要当作稳妥项；先核验${major}方向实力和招生变化。`;
  }
  if (status.includes('稳妥') || status.includes('匹配') || (Number.isFinite(delta) && delta <= 0)) {
    return `分数位置较舒服，可以保留；但不要只因${major}热门就忽略实际培养。`;
  }
  if (fallbackSummary.includes('冲') || fallbackSummary.includes('上探')) {
    return `可以关注，但不要当作稳妥项；重点核验${major}方向实力。`;
  }
  return `可以保留讨论，但要结合${major}方向实力和孩子能力。`;
}

function isGenericParentNote(value) {
  return hasAny(value, [
    '选择合适的学校和专业',
    '关注专业的性价比和竞争情况',
    '综合考虑',
    '结合自身情况',
    '选择适合自己的',
    '家长应关注'
  ]);
}

function cleanParentNote(value, reminder, fallbackSummary, record) {
  let s = splitSentences(value)[0] || '';
  if (!s || signature(s) === signature(reminder) || reminder.includes(s) || s.includes(reminder) || isGenericParentNote(s)) {
    s = specificParentNote(record, fallbackSummary);
  }
  if (isCheckLine(s) || (isAdviceOrRiskLine(s) && s.length > 38)) {
    s = specificParentNote(record, fallbackSummary);
  }
  return clip(s, 66);
}

export function normalizeDiagnosis(data, record, candidateScore, modelText = '') {
  const fallback = buildRuleOnlyDiagnosis(record, candidateScore);
  const obj = data && typeof data === 'object' ? data : {};

  const checks = cleanChecks(obj.checks, fallback.checks);
  const summary = normalizeSummary(obj, fallback, record);
  const basis = cleanBasis(obj.basis, fallback.basis);
  const realityReminder = cleanReminder(obj.realityReminder, fallback.realityReminder, checks);
  const parentNote = cleanParentNote(obj.parentNote || obj.parent_note, realityReminder, summary, record);
  const riskTags = cleanTags(obj.riskTags || obj.risk_tags, fallback.riskTags);

  return {
    summary,
    basis,
    realityReminder,
    checks,
    parentNote,
    riskTags,
    disclaimer: '仅做专业卡片解释，不等同于录取预测。'
  };
}

export function parseDiagnosisFromModel(text, record, candidateScore) {
  const parsed = pickJson(text);
  return normalizeDiagnosis(parsed, record, candidateScore, '');
}
