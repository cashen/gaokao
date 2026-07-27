import { LIAONING_PHYSICS_EXAM_CONFIG } from '../exam/liaoning-physics.js';

export const LIAONING_MAJOR_TREND_RESOURCE_VERSION = 'liaoning-major-trend-execution-v3967_0';
export const LIAONING_MAJOR_TREND_RESOURCE = Object.freeze({
  version: LIAONING_MAJOR_TREND_RESOURCE_VERSION,
  dataUrl: '/ln-rank/data/major-trend-2026.json',
  primaryYear: LIAONING_PHYSICS_EXAM_CONFIG.dataYear,
  historyYears: Object.freeze([2025, 2024]),
  comparisonPopulationPolicy: LIAONING_PHYSICS_EXAM_CONFIG.comparisonPopulationPolicy,
  compareScope: '同校、同专业、同项目属性三年严格可比记录',
  excludedProjects: Object.freeze(['中外合作','高收费','预科','专项','定向','培养模式不同项目']),
  segments: Object.freeze([
    Object.freeze({ id:'625-plus', label:'625 分及以上', minScore:625, maxScore:750, order:5 }),
    Object.freeze({ id:'590-624', label:'590—624 分', minScore:590, maxScore:624, order:4 }),
    Object.freeze({ id:'550-589', label:'550—589 分', minScore:550, maxScore:589, order:3 }),
    Object.freeze({ id:'500-549', label:'500—549 分', minScore:500, maxScore:549, order:2 }),
    Object.freeze({ id:'450-499', label:'450—499 分', minScore:450, maxScore:499, order:1 }),
    Object.freeze({ id:'344-449', label:'344—449 分', minScore:344, maxScore:449, order:0 })
  ]),
  boundary: '趋势先扣除年度共同位移，只描述相对历史位置变化，不代表报名人数、专业质量、就业或下一年度录取结果。'
});

export function trendSegmentOrder(label) {
  const normalized = String(label || '').replace(/\s+/g, ' ').trim();
  return LIAONING_MAJOR_TREND_RESOURCE.segments.find(item => item.label === normalized)?.order ?? Number.MAX_SAFE_INTEGER;
}
