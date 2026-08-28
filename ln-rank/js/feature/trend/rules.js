import { MAJOR_TREND_DATA } from './data.js?v=3951_0';

const NORMALIZE_RE = /[\s\u3000（）()【】\[\]·・,，、/|；;:+＋-]/g;
const DIRECTION_LABELS = {
  electrical_energy: '电气/自动化/能源',
  mechanical_vehicle: '机械/装备/车辆',
  petro_material_safety: '石化/材料/资源安全',
  computer_ai_software: '计算机/AI/软件',
  electronics_ic: '电子信息/集成电路',
  medical_core: '医学核心',
  medical_applied: '医学应用',
  teacher_law_public: '师范/法学/考公',
  finance_management: '财经管理',
  civil_arch_transport: '土木建筑交通',
  agri_food_env: '农林食品环境',
  humanities_media_tourism: '文旅外语新闻',
  basic_science_math: '基础理科/数理',
  other: '其他'
};

function norm(value) { return String(value == null ? '' : value).toLowerCase().replace(NORMALIZE_RE, ''); }
function includesAny(text, words) { return words.some(word => text.includes(norm(word))); }

export function segmentForScore(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;
  return MAJOR_TREND_DATA.segments.find(segment => n >= segment.minScore && n <= segment.maxScore) || null;
}
export function directionLabel(directionId) { return DIRECTION_LABELS[directionId] || '其他'; }

export function classifyDirectionFromText(text = '', standardMajor = {}) {
  const t = norm([text, standardMajor?.name, standardMajor?.categoryName].filter(Boolean).join(' '));
  const code = String(standardMajor?.code || standardMajor?.categoryCode || '').trim();
  if (t.includes('机械设计制造及其自动化') || t.includes('农业机械化及其自动化') || includesAny(t, ['车辆工程','智能制造工程','过程装备与控制工程','机械工程','机器人工程','机械电子工程','汽车服务工程','智能车辆工程'])) return 'mechanical_vehicle';
  if (t.includes('电气工程及其自动化') || t === '自动化' || includesAny(t, ['电气','电网','电力','能源与动力工程','新能源科学与工程','储能科学与工程','智能电网信息工程'])) return 'electrical_energy';
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
export function classifyDirectionFromKeyword(keyword = '') { return classifyDirectionFromText(keyword); }
export function trendRecordFor() { return null; }

export function trendTone(direction = {}) {
  const value = Number(direction.medianRelativePctPoint26vs25 ?? direction.relativePctPoint26vs25);
  if (!Number.isFinite(value)) return 'neutral';
  const threshold = Number(direction.neutralThresholdPctPoint || MAJOR_TREND_DATA?.policy?.neutralThresholdPctPoint || 1.326);
  if (value < -threshold) return 'harder';
  if (value > threshold) return 'easier';
  return 'neutral';
}

export function trendLabel(direction = {}) {
  const tone = trendTone(direction);
  if (tone === 'harder') return '相比多数专业更难报';
  if (tone === 'easier') return '相比多数专业更容易报';
  return '和多数专业变化接近';
}

export function trendHintText(score, keyword = '') {
  const segment = segmentForScore(score);
  const directionId = classifyDirectionFromKeyword(keyword);
  if (!segment || !keyword) return '';
  return `${segment.label}这一层可以查看“${directionLabel(directionId)}”过去三年的报考难度变化。这里只看历史投档记录，不代表专业质量，也不预测2027年录取。`;
}

export function buildTrendSummaryForSelection(items = [], score) {
  const segment = segmentForScore(score);
  const list = (Array.isArray(items) ? items : []).filter(item => !item?.historicalOnly);
  if (!segment || !list.length) return { visible: false, segmentLabel: segment?.label || '', notes: [], risks: [], counts: [] };
  const map = new Map();
  for (const item of list) {
    const text = [item.major, item.standardMajor?.name, item.standardMajor?.categoryName].filter(Boolean).join(' ');
    const id = classifyDirectionFromText(text, item.standardMajor || {});
    map.set(id, (map.get(id) || 0) + 1);
  }
  const counts = [...map.entries()].map(([directionId, count]) => ({ directionId, directionLabel: directionLabel(directionId), count })).sort((a, b) => b.count - a.count).slice(0, 5);
  const notes = counts.slice(0, 3).map(row => `${row.directionLabel}：当前已选${row.count}个。先确认孩子是否真正接受这个方向，再查看过去三年的报考难度变化；历史变化不能自动决定增加或删除专业。`);
  return {
    visible: Boolean(notes.length),
    segmentLabel: segment.label,
    sourceNote: '只观察过去三年的投档记录，不代表报名人数、专业质量或2027年录取结果。',
    notes,
    risks: [],
    counts
  };
}
