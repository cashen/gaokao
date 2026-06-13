import { MAJOR_TREND_DATA } from './data.js?v=3933_12';

const DIRECTION_LABELS = Object.fromEntries(MAJOR_TREND_DATA.directionCatalog.map(x => [x.id, x.label]));
const NORMALIZE_RE = /[\s\u3000（）()【】\[\]·・,，、/|；;:+＋-]/g;

function norm(value) {
  return String(value == null ? '' : value).toLowerCase().replace(NORMALIZE_RE, '');
}

function includesAny(text, words) {
  return words.some(word => text.includes(norm(word)));
}

export function segmentForScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  if (n >= 590 && n <= 624) return MAJOR_TREND_DATA.segments.find(s => s.id === '590-624') || null;
  if (n >= 550 && n <= 589) return MAJOR_TREND_DATA.segments.find(s => s.id === '550-589') || null;
  if (n >= 500 && n <= 549) return MAJOR_TREND_DATA.segments.find(s => s.id === '500-549') || null;
  if (n >= 450 && n <= 499) return MAJOR_TREND_DATA.segments.find(s => s.id === '450-499') || null;
  if (n >= 367 && n <= 449) return MAJOR_TREND_DATA.segments.find(s => s.id === '367-449') || null;
  return null;
}

export function directionLabel(directionId) {
  return DIRECTION_LABELS[directionId] || '其他';
}

export function classifyDirectionFromText(text = '', standardMajor = {}) {
  const t = norm([text, standardMajor?.name, standardMajor?.categoryName].filter(Boolean).join(' '));
  const code = String(standardMajor?.code || standardMajor?.categoryCode || '').trim();

  // 完整专业名优先：避免“机械设计制造及其自动化”被“自动化”误归为电气。
  if (t.includes('机械设计制造及其自动化') || t.includes('农业机械化及其自动化') || includesAny(t, ['车辆工程','智能制造工程','过程装备与控制工程','机械工程','机器人工程','机械电子工程','汽车服务工程','智能车辆工程'])) return 'mechanical_vehicle';
  if (t.includes('电气工程及其自动化') || t === '自动化' || includesAny(t, ['电气','电网','电力','能源与动力工程','新能源科学与工程','储能科学与工程','智能电网信息工程'])) return 'electrical_energy';

  // 园艺、园林、动物医学等长期规则。
  if (t.includes('动物医学') || t.includes('动物科学') || t.includes('食品科学与工程') || t.includes('食品质量与安全') || t.includes('园艺') || includesAny(t, ['农学','水产','生物技术','生物科学','生态学','环境科学','环境工程'])) return 'agri_food_env';
  if (t.includes('风景园林') || t.includes('园林') || includesAny(t, ['土木工程','建筑学','城乡规划','工程管理','工程造价','交通运输','交通工程','道路桥梁','建筑环境与能源应用工程'])) return 'civil_arch_transport';

  if (includesAny(t, ['石油工程','油气储运','资源勘查','采矿工程','矿物加工','安全工程','材料科学','材料成型','高分子','化学工程','化工','应用化学','冶金工程'])) return 'petro_material_safety';
  if (includesAny(t, ['计算机科学与技术','软件工程','人工智能','数据科学','网络工程','物联网工程','信息安全','智能科学与技术','数字媒体技术'])) return 'computer_ai_software';
  if (includesAny(t, ['电子信息','通信工程','电子科学','微电子','集成电路','光电信息','电波传播','信息工程'])) return 'electronics_ic';
  if (includesAny(t, ['临床医学','口腔医学','麻醉学','儿科学','医学影像学','眼视光医学','精神医学','中医学'])) return 'medical_core';
  if (includesAny(t, ['护理学','医学检验技术','医学影像技术','康复治疗','药学','临床药学','预防医学','卫生检验','医学信息工程'])) return 'medical_applied';
  if (includesAny(t, ['师范','法学','公安','思想政治','教育学','小学教育','汉语言文学'])) return 'teacher_law_public';
  if (includesAny(t, ['会计学','财务管理','审计学','金融学','经济学','财政学','工商管理','市场营销','人力资源','物流管理','管理科学','信息管理与信息系统'])) return 'finance_management';
  if (includesAny(t, ['英语','日语','俄语','西班牙语','翻译','新闻学','广播电视','传播学','旅游管理','酒店管理','编辑出版'])) return 'humanities_media_tourism';
  if (includesAny(t, ['数学','物理学','化学','统计学','应用统计','应用物理','信息与计算科学'])) return 'basic_science_math';

  if (code.startsWith('0802')) return 'mechanical_vehicle';
  if (code.startsWith('0806') || code.startsWith('0808') || code.startsWith('0805')) return 'electrical_energy';
  if (code.startsWith('0809')) return 'computer_ai_software';
  if (code.startsWith('0807')) return 'electronics_ic';
  if (code.startsWith('1002') || code.startsWith('1003') || code.startsWith('1005')) return 'medical_core';
  if (code.startsWith('1010') || code.startsWith('1007') || code.startsWith('1004')) return 'medical_applied';
  if (code.startsWith('1202') || code.startsWith('020')) return 'finance_management';
  if (code.startsWith('090') || code.startsWith('0827') || code.startsWith('0828') || code.startsWith('0830')) return 'agri_food_env';

  return 'other';
}

export function classifyDirectionFromKeyword(keyword = '') {
  const t = norm(keyword);
  if (!t) return '';
  if (includesAny(t, ['电力','电气','电网','自动化','能源','新能源','储能'])) return 'electrical_energy';
  if (includesAny(t, ['机械','车辆','装备','智能制造','机器人','汽车'])) return 'mechanical_vehicle';
  if (includesAny(t, ['石油','油气','采矿','资源','材料','化工','安全'])) return 'petro_material_safety';
  if (includesAny(t, ['计算机','软件','人工智能','数据','网络','物联网','信息安全'])) return 'computer_ai_software';
  if (includesAny(t, ['电子','通信','集成电路','芯片','微电子'])) return 'electronics_ic';
  if (includesAny(t, ['临床','口腔','中医','儿科','麻醉'])) return 'medical_core';
  if (includesAny(t, ['护理','药学','康复','影像','检验','预防'])) return 'medical_applied';
  if (includesAny(t, ['师范','法学','考公','教育','中文'])) return 'teacher_law_public';
  if (includesAny(t, ['会计','财务','审计','金融','经济','管理'])) return 'finance_management';
  if (includesAny(t, ['土木','建筑','交通','工程造价','风景园林','园林'])) return 'civil_arch_transport';
  if (includesAny(t, ['食品','动物医学','生物','水产','农学','园艺','环境'])) return 'agri_food_env';
  if (includesAny(t, ['外语','新闻','旅游','文旅','翻译'])) return 'humanities_media_tourism';
  if (includesAny(t, ['数学','物理','化学','统计'])) return 'basic_science_math';
  return '';
}

export function trendRecordFor(score, directionId) {
  const segment = segmentForScore(score);
  if (!segment || !directionId) return null;
  const direction = segment.directions.find(d => d.directionId === directionId) || null;
  return direction ? { segment, direction } : null;
}

export function trendTone(direction = {}) {
  const net = Number(direction.netChange);
  if (!Number.isFinite(net)) return 'neutral';
  if (net >= 20) return 'harder';
  if (net >= 5) return 'watch';
  if (net <= -20) return 'easier';
  if (net <= -5) return 'relaxed';
  return 'neutral';
}

export function trendLabel(direction = {}) {
  const tone = trendTone(direction);
  if (tone === 'harder') return '更挤一些';
  if (tone === 'watch') return '略偏拥挤';
  if (tone === 'easier') return '相对缓和';
  if (tone === 'relaxed') return '略有回落';
  return '变化不大';
}

export function trendHintText(score, keyword = '') {
  const directionId = classifyDirectionFromKeyword(keyword);
  const rec = trendRecordFor(score, directionId);
  if (!rec) return '';
  const { segment, direction } = rec;
  const label = trendLabel(direction);
  const sample = direction.sampleLevel === 'low' ? '该方向可比较样本不多，趋势只作辅助观察。' : direction.sampleLevel === 'caution' ? '该方向样本量中等，建议谨慎参考。' : '';
  const net = Math.abs(Number(direction.netChange || 0)).toFixed(1).replace('.0','');
  if (trendTone(direction) === 'harder' || trendTone(direction) === 'watch') {
    return `专业方向变化参考：${segment.label} 分段中，${direction.directionLabel}方向${label}，净变化约 ${net}% 。查看这类方向时，建议多留一点位次余量。${sample}`;
  }
  if (trendTone(direction) === 'easier' || trendTone(direction) === 'relaxed') {
    return `专业方向变化参考：${segment.label} 分段中，${direction.directionLabel}方向${label}，净变化约 ${net}% 。可以作为空间参考，但仍需看学校层次、招生计划和专业备注。${sample}`;
  }
  return `专业方向变化参考：${segment.label} 分段中，${direction.directionLabel}方向变化不大。建议继续按位次、招生计划和孩子接受度逐条核验。${sample}`;
}

export function buildTrendSummaryForSelection(items = [], score) {
  const segment = segmentForScore(score);
  const list = Array.isArray(items) ? items : [];
  if (!segment || !list.length) {
    return { visible: false, segmentLabel: segment?.label || '', notes: [], risks: [], counts: [] };
  }
  const map = new Map();
  for (const item of list) {
    const text = [item.major, item.school, item.matchReason, item.standardMajor?.name, item.standardMajor?.categoryName].filter(Boolean).join(' ');
    const id = classifyDirectionFromText(text, item.standardMajor || {});
    map.set(id, (map.get(id) || 0) + 1);
  }
  const counts = [...map.entries()].map(([directionId, count]) => {
    const rec = trendRecordFor(score, directionId);
    return { directionId, directionLabel: directionLabel(directionId), count, trend: rec?.direction || null, segment: rec?.segment || segment };
  }).sort((a,b)=>b.count-a.count).slice(0, 5);
  const notes = [];
  const risks = [];
  for (const row of counts.slice(0, 3)) {
    if (!row.trend) continue;
    const label = trendLabel(row.trend);
    const tone = trendTone(row.trend);
    const base = `${row.directionLabel}：当前已选专业中有 ${row.count} 个；${segment.label} 分段该方向 ${label}。`;
    if (tone === 'harder' || tone === 'watch') {
      notes.push(`${base}建议不要把同类专业过度集中在一个分数带，可以补充几个孩子也能接受的方向。`);
      risks.push(`专业方向变化参考：${row.directionLabel}在 ${segment.label} 分段 ${label}，当前已选专业中有 ${row.count} 个，建议人工复核位次余量。`);
    } else if (tone === 'easier' || tone === 'relaxed') {
      notes.push(`${base}这只能说明近两年相对缓和，仍需核验学校层次、专业实力、学费和当年计划。`);
    } else {
      notes.push(`${base}趋势不作为增减依据，继续按位次和家庭接受度核验。`);
    }
  }
  return {
    visible: Boolean(notes.length),
    segmentLabel: segment.label,
    sourceNote: MAJOR_TREND_DATA.disclaimer,
    notes: notes.slice(0, 3),
    risks: risks.slice(0, 2),
    counts
  };
}

