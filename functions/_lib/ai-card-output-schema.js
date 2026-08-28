import { buildRuleOnlyDiagnosis } from './ai-card-rules.js';
import { detectSpecialProgram } from './special-program-rules.js';
import { applyHumanCopyGate } from './diagnosis-human-copy-gate.js';

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
    .replace(/2027|2026|2025|2024|是否|变化|增减/g, '')
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
  return hasAny(value, ['核验', '确认', '查看', '对照', '以招生章程为准', '一分一段', '专业组', '选科', '体检', '单科', '计划', '校区', '学费', '收费', '办学地点', '培养模式', '毕业证', '学位证', '外方', '出国', '英语授课', '转专业', '奖助', '总成本', '家庭预算']);
}

function isAdviceOrRiskLine(value) {
  return hasAny(value, ['持续自学', '持续学习', '项目能力', '就业', 'AI工具', '低质量培养', '有条件推荐', '读研意愿', '证书路径', '性价比', '行业风险', '现实风险']);
}

function checkCategory(value) {
  const s = text(value);
  if (hasAny(s, ['外方', '出国', '英语授课'])) return 'coop';
  if (hasAny(s, ['毕业证', '学位证', '培养模式'])) return 'credential';
  if (hasAny(s, ['收费', '学费', '总成本', '家庭预算', '奖助'])) return 'fee';
  if (hasAny(s, ['转专业', '保研', '升学'])) return 'path';
  if (hasAny(s, ['计划', '招生'])) return 'plan';
  if (hasAny(s, ['专业组', '选科', '体检', '单科', '语种'])) return 'requirement';
  if (hasAny(s, ['校区', '办学地点'])) return 'campus';
  if (hasAny(s, ['一分一段', '等位分', '同位分', '志愿系统'])) return 'rank';
  return signature(s).slice(0, 12);
}

function normalizeCheckYear(value) {
  return text(value)
    .replace(/核验2026年?招生计划/g, '核验2027招生计划')
    .replace(/2026年?招生计划、专业组、选科、体检或单科要求/g, '2027招生计划、选科、体检、语种或单科要求')
    .replace(/用当年一分一段做最终换算/g, '用2027一分一段和正式志愿系统做最终换算');
}

function cleanBasis(items, fallback) {
  const canonical = uniqueList(fallback || [], 8, 82);
  const modelItems = uniqueList(Array.isArray(items) ? items : [], 8, 82);
  const merged = uniqueList([...canonical, ...modelItems], 12, 82);
  const factual = merged.filter(x => !isAdviceOrRiskLine(x) && !hasAny(x, ['核验', '需要确认', '建议额外']));
  const preferred = [];

  for (const key of ['当前位置', '相对参考分数', '2026最低投档', '历史对照', '2025同口径', '2024同口径', '211', '985', '双一流', '地域']) {
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
  const modelItems = (Array.isArray(items) ? items : []).map(normalizeCheckYear);
  const fallbackItems = (Array.isArray(fallback) ? fallback : []).map(normalizeCheckYear);
  const merged = uniqueList([...modelItems, ...fallbackItems], 12, 58);
  const defaults = [
    '核验2027招生计划和专业是否继续投放',
    '核验2027选科、体检、语种或单科要求',
    '核验2027办学地点、校区、培养方式和收费口径',
    '用2027一分一段和正式志愿系统做最终换算'
  ];

  const out = [];
  const categories = new Set();

  for (const raw of [...merged, ...defaults]) {
    const item = normalizeCheckYear(raw);
    if (!isCheckLine(item)) continue;
    if (isAdviceOrRiskLine(item) && !hasAny(item, ['招生计划', '专业组', '校区', '选科', '体检', '单科', '收费'])) continue;
    const cat = checkCategory(item);
    if (categories.has(cat)) continue;
    const cleaned = clip(item.replace(/[。；;]+$/g, ''), 54);
    categories.add(cat);
    out.push(cleaned);
    if (out.length >= 4) break;
  }

  return out.slice(0, 4);
}

function tagify(value) {
  const s = text(value);
  if (!s) return '';
  if (s.includes('中外合作')) return '中外合作';
  if (s.includes('高收费') || s.includes('收费')) return '高收费';
  if (s.includes('培养模式')) return '培养模式';
  if (s.includes('毕业证') || s.includes('学位证')) return '证书口径';
  if (s.includes('外方') || s.includes('出国')) return '外方资源';
  if (s.includes('AI')) return 'AI冲击';
  if (s.includes('持续') || s.includes('自学')) return '持续学习';
  if (s.includes('项目')) return '项目能力';
  if (s.includes('读研')) return '读研路径';
  if (s.includes('证书')) return '证书路径';
  if (s.includes('就业')) return '就业核验';
  if (s.includes('招生计划') || s.includes('计划')) return '计划变化';
  if (s.includes('校区') || s.includes('办学地点')) return '校区核验';
  if (s.includes('专业组') || s.includes('选科')) return '选科核验';
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

  if (!summary || summary.length > 60 || splitSentences(summary).length > 1 || hasAny(summary, ['录取概率', '稳上', '必录', '一定能上'])) {
    if (status) summary = status.includes('主要参考') ? '这条属于主要参考范围，可以放进家庭讨论。' : `这条属于${status}范围，需结合2027正式资料确认。`;
    else summary = fallback.summary || '这条可以放进家庭讨论，但需结合2027正式资料确认。';
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

  return clip(sentences[0] || source || '建议结合专业内容、学校资源、城市条件和孩子真实接受度判断。', 88);
}

function specialRealityReminder(record, specialProgram) {
  const m = String(record?.major || '');
  if (m.includes('电子') || m.includes('通信') || m.includes('信息工程') || m.includes('计算机') || m.includes('软件') || m.includes('人工智能')) {
    return '电子信息和计算机方向看重课程质量、项目训练和持续学习；特殊项目还要单独看培养资源。';
  }
  if (m.includes('医学') || m.includes('临床') || m.includes('口腔') || m.includes('药学')) {
    return '医学相关方向学习周期长、资格路径明确；特殊项目还要单独看培养资源、执业路径和家庭预算。';
  }
  if (m.includes('金融') || m.includes('会计') || m.includes('经济') || m.includes('法学')) {
    return '财经法学方向更依赖学校平台、城市资源和实习机会；特殊项目还要单独看培养资源。';
  }
  if (specialProgram?.primaryType) {
    return '专业本身仍要看培养质量、课程安排和毕业去向，特殊项目不能只按普通专业理解。';
  }
  return '建议同时看专业内容、学校资源、城市条件和孩子真实接受度。';
}

function specialCheckLines(specialProgram) {
  if (!specialProgram?.hasSpecial) return [];
  const types = specialProgram.types || [];
  if (types.includes('中外合作办学')) {
    return [
      '核验中外合作办学收费、培养模式和毕业证/学位证口径',
      '核验外方合作院校、是否出国、英语授课比例及转专业/升学政策',
      '核验2027招生计划、选科、体检、语种或单科要求',
      '用2027一分一段和正式志愿系统做最终换算'
    ];
  }
  if (types.includes('高收费专业')) {
    return [
      '核验学费、住宿费、奖助政策和四年总成本',
      '核验2027招生计划、选科、体检、语种或单科要求',
      '核验2027办学地点、校区、培养方式和收费口径',
      '用2027一分一段和正式志愿系统做最终换算'
    ];
  }
  if (types.includes('联合培养') || types.includes('校企合作/定向')) {
    return [
      '核验培养地点、培养单位和毕业证/学位证口径',
      '核验企业参与、实习安排、服务期或协议约束',
      '核验2027招生计划、选科、体检、语种或单科要求',
      '用2027一分一段和正式志愿系统做最终换算'
    ];
  }
  return [
    ...(specialProgram.checks || []),
    '核验2027招生计划、选科、体检、语种或单科要求',
    '用2027一分一段和正式志愿系统做最终换算'
  ];
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
    return `可以关注，但不要当作稳妥项；先确认孩子是否接受${major}方向，再核验2027正式资料。`;
  }
  if (status.includes('稳妥') || status.includes('匹配') || status.includes('主要参考') || (Number.isFinite(delta) && delta <= 0)) {
    return `从2026历史位置看不属于明显上探，但仍要看孩子对${major}方向的接受度和2027计划。`;
  }
  if (fallbackSummary.includes('冲') || fallbackSummary.includes('上探')) {
    return `可以关注，但不能只按低风险理解；先确认孩子是否接受${major}方向。`;
  }
  return `可以放进家庭讨论，先听孩子对${major}方向的想法，再核对2027正式资料。`;
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
  const specialProgram = detectSpecialProgram(record);

  const checks = specialProgram.hasSpecial
    ? cleanChecks(specialCheckLines(specialProgram), [])
    : cleanChecks(obj.checks, fallback.checks);

  const summary = specialProgram.hasSpecial
    ? clip(`这条可看，但${specialProgram.primaryType}规则必须先确认。`, 45)
    : normalizeSummary(obj, fallback, record);

  const basis = cleanBasis(obj.basis, fallback.basis);

  const realityReminder = specialProgram.hasSpecial
    ? clip(specialRealityReminder(record, specialProgram), 88)
    : cleanReminder(obj.realityReminder, fallback.realityReminder, checks);

  const parentNote = specialProgram.hasSpecial
    ? clip(specialProgram.parentNote, 66)
    : cleanParentNote(obj.parentNote || obj.parent_note, realityReminder, summary, record);

  const riskTags = cleanTags([
    ...(specialProgram.hasSpecial ? specialProgram.riskTags : []),
    ...(Array.isArray(obj.riskTags || obj.risk_tags) ? (obj.riskTags || obj.risk_tags) : [])
  ], fallback.riskTags);

  return applyHumanCopyGate({
    summary,
    basis,
    realityReminder,
    checks,
    parentNote,
    riskTags,
    specialProgram: specialProgram.hasSpecial ? specialProgram : null,
    disclaimer: '以2026最低投档记录为历史参考，不等同于2027录取预测。'
  });
}

export function parseDiagnosisFromModel(value, record, candidateScore) {
  const parsed = pickJson(value);
  return normalizeDiagnosis(parsed, record, candidateScore, '');
}
